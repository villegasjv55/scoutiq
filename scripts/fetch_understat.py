"""Download 5 seasons of player and team data from Understat and cache it in data/raw/.

Run from the repo root:  python scripts/fetch_understat.py
Safe to re-run: files that already exist are skipped, so a failed run can be resumed.
"""
import asyncio
import json
from pathlib import Path

import aiohttp
from understat import Understat

LEAGUES = {"epl": "Premier League", "la_liga": "La Liga", "serie_a": "Serie A"}
SEASONS = [2021, 2022, 2023, 2024, 2025]  # 2021 means the 2021-22 season
RAW = Path("data/raw")
PAUSE_SECONDS = 3  # be polite to the site


async def fetch(kind, call, league, season):
    path = RAW / f"{kind}_{league}_{season}.json"
    if path.exists() and path.stat().st_size > 100:
        print(f"cached  {path.name}")
        return
    try:
        data = await call(league, season)
    except Exception as err:
        print(f"FAILED  {path.name}: {type(err).__name__}: {err}")
        return
    path.write_text(json.dumps(data), encoding="utf-8")
    print(f"saved   {path.name} ({len(data)} rows)")
    await asyncio.sleep(PAUSE_SECONDS)


async def main():
    RAW.mkdir(parents=True, exist_ok=True)
    async with aiohttp.ClientSession() as session:
        understat = Understat(session)
        for league in LEAGUES:
            for season in SEASONS:
                await fetch("players", understat.get_league_players, league, season)
                await fetch("teams", understat.get_teams, league, season)
    files = sorted(RAW.glob("*.json"))
    print(f"\nDone. {len(files)} of {len(LEAGUES) * len(SEASONS) * 2} files in {RAW}/")
    if files:
        sample = json.loads(files[0].read_text(encoding="utf-8"))
        first = sample[0] if isinstance(sample, list) else next(iter(sample.values()))
        print("Sample record from", files[0].name)
        print(json.dumps(first, indent=1)[:700])


asyncio.run(main())
