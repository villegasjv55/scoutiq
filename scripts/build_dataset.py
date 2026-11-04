"""Turn the cached Understat files into clean JSON for the ScoutIQ frontend.

Run from the repo root:  python scripts/build_dataset.py
Reads  data/raw/players_*.json and data/raw/teams_*.json
Writes frontend/src/data/{players,teams,meta}.json and data/processed/players_clean.csv
"""
import html
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path("data/raw")
OUT = Path("frontend/src/data")
PROCESSED = Path("data/processed")
LEAGUES = {"epl": "Premier League", "la_liga": "La Liga", "serie_a": "Serie A"}
SEASONS = [2021, 2022, 2023, 2024, 2025]
KEEP_MINUTES = 450   # players below this are left out of the app
POOL_MINUTES = 900   # players at or above this form the percentile reference pool
POSITIONS = {"D": "Defender", "M": "Midfielder", "F": "Forward"}  # goalkeepers: no data
PER90 = {"goals": "goals90", "assists": "assists90", "xG": "xG90", "xA": "xA90",
         "npxG": "npxG90", "shots": "shots90", "keyPasses": "keyPasses90",
         "xGChain": "xGChain90", "xGBuildup": "xGBuildup90"}
PCT_METRICS = list(PER90.values())
NUMERIC = ["games", "time", "goals", "xG", "assists", "xA", "shots", "key_passes",
           "yellow_cards", "red_cards", "npg", "npxG", "xGChain", "xGBuildup"]


def season_label(season):
    return f"{season}-{str(season + 1)[2:]}"


def main_position(code):
    parts = [p for p in str(code).split() if p != "S"]
    return POSITIONS.get(parts[0]) if parts else None


def load_players():
    frames = []
    for league, league_name in LEAGUES.items():
        for season in SEASONS:
            path = RAW / f"players_{league}_{season}.json"
            if not path.exists():
                print(f"missing {path.name}, skipping")
                continue
            df = pd.DataFrame(json.loads(path.read_text(encoding="utf-8")))
            df["league"] = league_name
            df["season"] = season
            frames.append(df)
    if not frames:
        raise SystemExit("No player files found in data/raw. Run scripts/fetch_understat.py first.")
    df = pd.concat(frames, ignore_index=True)
    need = ["id", "player_name", "team_title", "position"] + NUMERIC
    missing = [c for c in need if c not in df.columns]
    if missing:
        raise SystemExit(f"Understat data is missing columns {missing}. Columns found: {list(df.columns)}")
    for col in NUMERIC:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    # Understat sends names with HTML codes, for example O&#039;Riley
    for col in ("player_name", "team_title"):
        df[col] = df[col].astype(str).map(html.unescape)
    return df


def build_players():
    df = load_players()
    # Understat lists every position a player featured in, in alphabetical order (for example "D M S"),
    # so the first letter is not reliable. Use the position the player held in seasons with a single
    # outfield position, then fall back to midfielder when a defender/midfielder mix is listed.
    codes = df["position"].astype(str).str.split().apply(lambda xs: [x for x in xs if x not in ("S", "GK")])
    single = df[codes.str.len() == 1].assign(code=codes[codes.str.len() == 1].str[0])
    home = single.groupby("id")["code"].agg(lambda s: s.value_counts().index[0]).to_dict()

    def resolve(row_id, code):
        if str(code).split()[:1] == ["GK"]:
            return None
        parts = [x for x in str(code).split() if x != "S"]
        if len(parts) == 1:
            return POSITIONS.get(parts[0])
        if row_id in home:
            return POSITIONS.get(home[row_id])
        if "M" in parts and "D" in parts:
            return POSITIONS["M"]
        return POSITIONS.get(parts[0]) if parts else None

    df["positionGroup"] = [resolve(i, c) for i, c in zip(df["id"], df["position"])]
    df = df.dropna(subset=["positionGroup"])
    df = df[df["time"] >= KEEP_MINUTES].copy()
    df = df.drop_duplicates(subset=["id", "season", "league"])

    df = df.rename(columns={"id": "pid", "player_name": "name", "team_title": "club",
                            "positionGroup": "pos", "games": "games", "time": "minutes",
                            "key_passes": "keyPasses", "yellow_cards": "yellows",
                            "red_cards": "reds"})
    df["club"] = df["club"].astype(str).str.replace(",", " / ")
    df["pid"] = df["pid"].astype(int)
    df["seasonLabel"] = df["season"].map(season_label)
    df["key"] = df["pid"].astype(str) + "-" + df["season"].astype(str)
    df["position"] = df["pos"]

    for src, dest in PER90.items():
        df[dest] = (df[src] / (df["minutes"] / 90)).round(3)
    df["goalsMinusXG"] = (df["goals"] - df["xG"]).round(2)
    for col in ["xG", "xA", "npxG", "xGChain", "xGBuildup"]:
        df[col] = df[col].round(2)

    # percentile rank against players with 900+ minutes in the same season and position
    pct = {metric: np.zeros(len(df), dtype=int) for metric in PCT_METRICS}
    df = df.reset_index(drop=True)
    for (season, position), group in df.groupby(["season", "position"]):
        pool_mask = group["minutes"] >= POOL_MINUTES
        for metric in PCT_METRICS:
            pool = np.sort(group.loc[pool_mask, metric].to_numpy())
            if len(pool) == 0:
                continue
            ranks = np.searchsorted(pool, group[metric].to_numpy(), side="right") / len(pool) * 100
            pct[metric][group.index] = np.clip(np.round(ranks), 0, 100).astype(int)
    df["pct"] = [{m: int(pct[m][i]) for m in PCT_METRICS} for i in range(len(df))]

    int_cols = ["games", "minutes", "goals", "assists", "shots", "keyPasses", "yellows", "reds", "npg"]
    df[int_cols] = df[int_cols].astype(int)
    out_cols = (["key", "pid", "name", "club", "league", "season", "seasonLabel", "position",
                 "games", "minutes", "goals", "assists", "npg", "xG", "xA", "npxG", "shots",
                 "keyPasses", "xGChain", "xGBuildup", "yellows", "reds", "goalsMinusXG"]
                + PCT_METRICS + ["pct"])
    return df[out_cols].sort_values(["season", "goals"], ascending=[False, False]).reset_index(drop=True)


def num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_teams():
    rows = []
    for league, league_name in LEAGUES.items():
        for season in SEASONS:
            path = RAW / f"teams_{league}_{season}.json"
            if not path.exists():
                print(f"missing {path.name}, skipping")
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            teams = list(data.values()) if isinstance(data, dict) else data
            for team in teams:
                history = team.get("history", [])
                results = [str(m.get("result", "")).lower() for m in history]
                ppda_att = sum(num((m.get("ppda") or {}).get("att")) for m in history)
                ppda_def = sum(num((m.get("ppda") or {}).get("def")) for m in history)
                rows.append({
                    "key": f"{html.unescape(str(team.get('title')))}-{season}", "team": html.unescape(str(team.get("title"))),
                    "league": league_name, "season": season, "seasonLabel": season_label(season),
                    "played": len(history), "wins": results.count("w"),
                    "draws": results.count("d"), "losses": results.count("l"),
                    "goals": int(sum(num(m.get("scored")) for m in history)),
                    "goalsAgainst": int(sum(num(m.get("missed")) for m in history)),
                    "points": int(sum(num(m.get("pts")) for m in history)),
                    "xG": round(sum(num(m.get("xG")) for m in history), 1),
                    "xGA": round(sum(num(m.get("xGA")) for m in history), 1),
                    "xPts": round(sum(num(m.get("xpts")) for m in history), 1),
                    "ppda": round(ppda_att / ppda_def, 1) if ppda_def else None,
                })
    if not rows:
        print("No team files found, so team tables will be empty until Understat is reachable.")
        return pd.DataFrame(columns=["key", "team", "league", "season", "seasonLabel", "played", "wins", "draws", "losses",
                                     "goals", "goalsAgainst", "points", "xG", "xGA", "xPts", "ppda", "goalDiff", "rank"])
    df = pd.DataFrame(rows)
    df["goalDiff"] = df["goals"] - df["goalsAgainst"]
    df = df.sort_values(["season", "league", "points", "goalDiff", "goals"],
                        ascending=[False, True, False, False, False])
    df["rank"] = df.groupby(["season", "league"]).cumcount() + 1
    return df.reset_index(drop=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    players = build_players()
    teams = build_teams()
    seasons = sorted(players["season"].unique(), reverse=True)
    meta = {
        "generated": date.today().isoformat(),
        "source": "Understat (understat.com)",
        "minutesKept": KEEP_MINUTES,
        "percentilePoolMinutes": POOL_MINUTES,
        "leagues": [name for name in LEAGUES.values() if name in set(players["league"])],
        "seasons": [{"value": int(s), "label": season_label(int(s))} for s in seasons],
    }
    (OUT / "players.json").write_text(players.to_json(orient="records", force_ascii=False), encoding="utf-8")
    (OUT / "teams.json").write_text(teams.to_json(orient="records", force_ascii=False), encoding="utf-8")
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    players.drop(columns=["pct"]).to_csv(PROCESSED / "players_clean.csv", index=False)

    size_mb = (OUT / "players.json").stat().st_size / 1e6
    print(f"Wrote {len(players)} player-seasons ({size_mb:.1f} MB) and {len(teams)} team-seasons")
    print("\nPlayer-seasons per league and season:")
    print(players.groupby(["league", "seasonLabel"]).size().unstack().to_string())
    print("\nPositions:", players["position"].value_counts().to_dict())
    latest = players[players["season"] == players["season"].max()]
    print(f"\nTop 5 scorers, {season_label(int(players['season'].max()))}:")
    print(latest[["name", "club", "league", "minutes", "goals", "xG"]].head(5).to_string(index=False))


main()
