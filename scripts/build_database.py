"""Load the cleaned ScoutIQ data into a normalised SQLite database.

Run from the repo root after build_dataset.py:  python scripts/build_database.py
Creates data/scoutiq.db with five tables:
  leagues, clubs, players, player_seasons, team_seasons
"""
import json
import sqlite3
from pathlib import Path

DATA = Path("frontend/src/data")
DB_PATH = Path("data/scoutiq.db")

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE leagues (
    league_id   INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

CREATE TABLE clubs (
    club_id     INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

CREATE TABLE players (
    player_id   INTEGER PRIMARY KEY,          -- Understat player id
    name        TEXT NOT NULL
);

CREATE TABLE player_seasons (
    player_id    INTEGER NOT NULL REFERENCES players(player_id),
    season       INTEGER NOT NULL,             -- 2024 means 2024-25
    league_id    INTEGER NOT NULL REFERENCES leagues(league_id),
    club_id      INTEGER NOT NULL REFERENCES clubs(club_id),
    position     TEXT NOT NULL CHECK (position IN ('Forward', 'Midfielder', 'Defender')),
    games        INTEGER NOT NULL CHECK (games >= 0),
    minutes      INTEGER NOT NULL CHECK (minutes >= 0),
    goals        INTEGER NOT NULL,
    assists      INTEGER NOT NULL,
    xg           REAL NOT NULL,
    xa           REAL NOT NULL,
    npxg         REAL NOT NULL,
    shots        INTEGER NOT NULL,
    key_passes   INTEGER NOT NULL,
    xg_chain     REAL NOT NULL,
    xg_buildup   REAL NOT NULL,
    goals_90     REAL NOT NULL,
    xg_90        REAL NOT NULL,
    PRIMARY KEY (player_id, season, league_id)
);

CREATE TABLE team_seasons (
    club_id        INTEGER NOT NULL REFERENCES clubs(club_id),
    season         INTEGER NOT NULL,
    league_id      INTEGER NOT NULL REFERENCES leagues(league_id),
    played         INTEGER NOT NULL,
    wins           INTEGER NOT NULL,
    draws          INTEGER NOT NULL,
    losses         INTEGER NOT NULL,
    goals_for      INTEGER NOT NULL,
    goals_against  INTEGER NOT NULL,
    points         INTEGER NOT NULL,
    xg             REAL NOT NULL,
    xga            REAL NOT NULL,
    xpts           REAL NOT NULL,
    final_rank     INTEGER NOT NULL,
    PRIMARY KEY (club_id, season, league_id)
);

CREATE INDEX idx_player_seasons_season ON player_seasons(season, league_id);
CREATE INDEX idx_player_seasons_club ON player_seasons(club_id);
"""


def main():
    players = json.loads((DATA / "players.json").read_text(encoding="utf-8"))
    teams = json.loads((DATA / "teams.json").read_text(encoding="utf-8"))

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DB_PATH.unlink(missing_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)

    league_ids = {name: i + 1 for i, name in enumerate(sorted({r["league"] for r in players} | {r["league"] for r in teams}))}
    con.executemany("INSERT INTO leagues VALUES (?, ?)", [(i, n) for n, i in league_ids.items()])

    club_names = sorted({r["club"] for r in players} | {r["team"] for r in teams})
    club_ids = {name: i + 1 for i, name in enumerate(club_names)}
    con.executemany("INSERT INTO clubs VALUES (?, ?)", [(i, n) for n, i in club_ids.items()])

    unique_players = {}
    for r in players:
        unique_players[r["pid"]] = r["name"]
    con.executemany("INSERT INTO players VALUES (?, ?)", list(unique_players.items()))

    con.executemany(
        "INSERT INTO player_seasons VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [(r["pid"], r["season"], league_ids[r["league"]], club_ids[r["club"]], r["position"],
          r["games"], r["minutes"], r["goals"], r["assists"], r["xG"], r["xA"], r["npxG"],
          r["shots"], r["keyPasses"], r["xGChain"], r["xGBuildup"], r["goals90"], r["xG90"])
         for r in players],
    )
    con.executemany(
        "INSERT INTO team_seasons VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [(club_ids[r["team"]], r["season"], league_ids[r["league"]], r["played"], r["wins"],
          r["draws"], r["losses"], r["goals"], r["goalsAgainst"], r["points"], r["xG"],
          r["xGA"], r["xPts"], r["rank"]) for r in teams],
    )
    con.commit()

    for table in ["leagues", "clubs", "players", "player_seasons", "team_seasons"]:
        count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"{table:15} {count:>6} rows")
    problems = con.execute("PRAGMA foreign_key_check").fetchall()
    print("Foreign key problems:", len(problems))
    con.close()
    print(f"\nDatabase written to {DB_PATH}")


main()
