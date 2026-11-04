"""Direct Understat download (replaces the outdated library).
Saves the same files the build script already reads:
data/raw/players_{league}_{season}.json and teams_{league}_{season}.json
"""
import json
import sys
import time
from pathlib import Path

import requests

LEAGUES = {"epl": "EPL", "la_liga": "La_liga", "serie_a": "Serie_A"}
SEASONS = [2021, 2022, 2023, 2024, 2025]
RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
})


def fetch(code, season):
    page = f"https://understat.com/league/{code}/{season}"
    S.get(page, timeout=30)  # picks up cookies first
    return S.get(
        f"https://understat.com/getLeagueData/{code}/{season}",
        headers={
            "Referer": page,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
        },
        timeout=30,
    )


# ---- test one request first and show exactly what comes back ----
r = fetch("EPL", 2023)
print("TEST  status:", r.status_code, "| type:", r.headers.get("content-type"), "| bytes:", len(r.content))
print("TEST  first 300 characters:", r.text[:300].replace("\n", " "))
try:
    test = r.json()
    print("TEST  keys:", list(test.keys()))
except Exception as e:
    print("TEST  not JSON:", type(e).__name__, e)
    print("Stopping. Copy everything above and paste it to Claude.")
    sys.exit(1)

# ---- full download ----
ok = 0
for lg, code in LEAGUES.items():
    for season in SEASONS:
        pf = RAW / f"players_{lg}_{season}.json"
        tf = RAW / f"teams_{lg}_{season}.json"
        if pf.exists() and tf.exists():
            ok += 2
            continue
        try:
            data = r.json() if (code, season) == ("EPL", 2023) else fetch(code, season).json()
            pf.write_text(json.dumps(data["players"]))
            tf.write_text(json.dumps(data["teams"]))
            ok += 2
            print(f"OK      {lg} {season}: {len(data['players'])} players, {len(data['teams'])} teams")
        except Exception as e:
            print(f"FAILED  {lg} {season}: {type(e).__name__}: {e}")
        time.sleep(3)

print(f"\nDone. {ok} of 30 files in data/raw/")
sample = next(iter(json.loads((RAW / "players_epl_2023.json").read_text())), None) if (RAW / "players_epl_2023.json").exists() else None
print("Sample player record:", sample)
