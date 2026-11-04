"""Backup data source while understat.com is offline.

Downloads a public GitHub copy of Understat player-season stats and converts it
into the same data/raw/players_{league}_{season}.json files that
build_dataset.py reads. Covers the three leagues for 2021-22 to 2024-25.
Team histories are NOT in this copy; the Teams page stays empty until
scripts/fetch_understat_direct.py works again.
"""
import io
import json
from pathlib import Path

import pandas as pd
import requests

BASE = "https://raw.githubusercontent.com/vibedatascience/understat_players_aggregated/main/"
FILES = ["understat_players_aggregated_2014_2024.csv"]
LEAGUES = {"EPL": "epl", "La_Liga": "la_liga", "Serie_A": "serie_a"}
SEASONS = [2021, 2022, 2023, 2024]  # 2025 in this copy stops in September 2025, so it is skipped
RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

frames = []
for name in FILES:
    r = requests.get(BASE + name, timeout=120)
    r.raise_for_status()
    frames.append(pd.read_csv(io.StringIO(r.text)))
    print(f"downloaded {name}: {len(frames[-1])} rows")
df = pd.concat(frames, ignore_index=True)

for code, short in LEAGUES.items():
    for season in SEASONS:
        part = df[(df["league"] == code) & (df["year"] == season)].drop_duplicates(subset=["id", "team_title"])
        part = part.drop(columns=["league", "year", "season", "primary_position", "scrape_timestamp"], errors="ignore")
        records = [{k: str(v) for k, v in row.items()} for row in part.to_dict("records")]
        (RAW / f"players_{short}_{season}.json").write_text(json.dumps(records), encoding="utf-8")
        print(f"wrote players_{short}_{season}.json: {len(records)} players")
print("\nDone. Now run: python scripts/build_dataset.py")
