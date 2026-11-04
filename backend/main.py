"""Villegas Scout IQ API: serves the SQLite database over HTTP.

Run from the repo root (after build_database.py):
    pip install -r backend/requirements.txt
    uvicorn backend.main:app --reload
Then open http://127.0.0.1:8000/docs for the interactive API documentation.

Design notes
- The database is opened read-only, so the API cannot change data.
- Every query uses bound parameters, and sort columns come from a fixed whitelist,
  which prevents SQL injection.
- Query parameters are validated (ranges, allowed values) before any SQL runs.
"""
import sqlite3
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "scoutiq.db"

app = FastAPI(
    title="Villegas Scout IQ API",
    version="1.0.0",
    description="Football scouting data for the Premier League, La Liga and Serie A, from Understat.",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

SELECT = """
SELECT p.player_id AS pid, p.name, c.name AS club, l.name AS league, ps.season, ps.position,
       ps.games, ps.minutes, ps.goals, ps.assists,
       ROUND(ps.xg, 2) AS xg, ROUND(ps.xa, 2) AS xa, ps.shots, ps.key_passes,
       ROUND(ps.goals_90, 2) AS goals_90, ROUND(ps.xg_90, 2) AS xg_90,
       ROUND(ps.goals - ps.xg, 2) AS goals_above_xg
FROM player_seasons ps
JOIN players p ON p.player_id = ps.player_id
JOIN clubs   c ON c.club_id   = ps.club_id
JOIN leagues l ON l.league_id = ps.league_id
"""
SORTS = {
    "goals": "ps.goals", "assists": "ps.assists", "xg": "ps.xg", "xa": "ps.xa", "minutes": "ps.minutes",
    "goals_90": "ps.goals_90", "xg_90": "ps.xg_90", "goals_above_xg": "(ps.goals - ps.xg)",
}
Sort = Literal["goals", "assists", "xg", "xa", "minutes", "goals_90", "xg_90", "goals_above_xg"]
Position = Literal["Forward", "Midfielder", "Defender"]


def rows(sql: str, params: tuple = ()) -> list[dict]:
    if not DB_PATH.exists():
        raise HTTPException(status_code=503, detail="Database not found. Run scripts/build_database.py first.")
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        return [dict(r) for r in con.execute(sql, params)]
    finally:
        con.close()


@app.get("/health", summary="Is the API and database available?")
def health():
    counts = rows("SELECT (SELECT COUNT(*) FROM players) AS players, (SELECT COUNT(*) FROM player_seasons) AS player_seasons")
    return {"status": "ok", **counts[0]}


@app.get("/leagues", summary="Leagues and the seasons they cover")
def leagues():
    return rows("""
        SELECT l.name AS league, MIN(ps.season) AS first_season, MAX(ps.season) AS last_season, COUNT(*) AS player_seasons
        FROM leagues l JOIN player_seasons ps ON ps.league_id = l.league_id
        GROUP BY l.league_id ORDER BY l.name""")


@app.get("/players", summary="Search and filter player-seasons")
def players(
    search: Optional[str] = Query(None, min_length=2, max_length=60, description="Part of a player or club name"),
    league: Optional[str] = None,
    season: Optional[int] = Query(None, ge=2000, le=2100, description="2024 means the 2024-25 season"),
    position: Optional[Position] = None,
    min_minutes: int = Query(450, ge=0, le=4000),
    sort: Sort = "goals",
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    where, params = ["ps.minutes >= ?"], [min_minutes]
    if search:
        where.append("(p.name LIKE ? OR c.name LIKE ?)")
        params += [f"%{search}%", f"%{search}%"]
    if league:
        where.append("l.name = ?")
        params.append(league)
    if season:
        where.append("ps.season = ?")
        params.append(season)
    if position:
        where.append("ps.position = ?")
        params.append(position)
    sql = f"{SELECT} WHERE {' AND '.join(where)} ORDER BY {SORTS[sort]} DESC, p.name LIMIT ? OFFSET ?"
    return rows(sql, tuple(params + [limit, offset]))


@app.get("/players/{pid}", summary="One player's seasons")
def player(pid: int):
    data = rows(f"{SELECT} WHERE p.player_id = ? ORDER BY ps.season", (pid,))
    if not data:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"pid": pid, "name": data[0]["name"], "seasons": data}


@app.get("/leaderboard", summary="Top players on one measure for a season")
def leaderboard(
    season: int = Query(..., ge=2000, le=2100),
    metric: Sort = "goals",
    league: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
):
    where, params = ["ps.season = ?", "ps.minutes >= 900"], [season]
    if league:
        where.append("l.name = ?")
        params.append(league)
    sql = f"{SELECT} WHERE {' AND '.join(where)} ORDER BY {SORTS[metric]} DESC LIMIT ?"
    return rows(sql, tuple(params + [limit]))


@app.get("/league-scoring", summary="Goals per player-season by league and season (aggregation)")
def league_scoring():
    return rows("""
        SELECT l.name AS league, ps.season, COUNT(*) AS players, SUM(ps.goals) AS goals,
               ROUND(SUM(ps.xg), 1) AS xg, ROUND(AVG(ps.goals_90), 3) AS avg_goals_90
        FROM player_seasons ps JOIN leagues l ON l.league_id = ps.league_id
        GROUP BY l.league_id, ps.season ORDER BY ps.season, l.name""")
