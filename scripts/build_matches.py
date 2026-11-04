"""Match Lab data: download StatsBomb Open Data and shrink it for the website.

Free data: https://github.com/statsbomb/open-data  (credit StatsBomb wherever it is shown).
Default: the 2022 World Cup knockout matches (16 games). Pass --all for every match.

Run from the repo root:   python scripts/build_matches.py
Writes frontend/public/statsbomb/index.json and one small file per match.
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "public" / "statsbomb"
BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
COMP, SEASON = 43, 106  # FIFA World Cup 2022

BALL = {"Pass", "Carry", "Shot", "Dribble"}
DEFENSIVE = {"Pressure", "Duel", "Interception", "Ball Recovery", "Clearance", "Block"}
STAGES = {"Round of 16": "R16", "Quarter-finals": "QF", "Semi-finals": "SF", "3rd Place Final": "3rd", "Final": "Final", "Group Stage": "Group"}


def get(path):
    with urllib.request.urlopen(f"{BASE}/{path}", timeout=60) as r:
        return json.load(r)


def r1(v):
    return round(float(v), 1)


def build(match):
    events = get(f"events/{match['match_id']}.json")
    home, away = match["home_team"]["home_team_name"], match["away_team"]["away_team_name"]
    team_idx = {home: 0, away: 1}
    players, pidx = [], {}

    def pid(name, team):
        if name not in pidx:
            pidx[name] = len(players)
            players.append({"name": name, "team": team_idx[team]})
        return pidx[name]

    shots, passes, ball, defn = [], [], [], []
    for e in events:
        typ = e["type"]["name"]
        loc = e.get("location")
        team = e["team"]["name"]
        if team not in team_idx or not loc or "player" not in e:
            continue
        t, m = team_idx[team], e.get("minute", 0)
        p = pid(e["player"]["name"], team)
        if e.get("period", 1) > 4:
            continue  # skip the penalty shoot-out
        if typ == "Shot":
            s = e["shot"]
            end = s.get("end_location", [loc[0], loc[1]])
            shots.append({
                "t": t, "p": p, "m": m, "x": r1(loc[0]), "y": r1(loc[1]), "xg": round(s.get("statsbomb_xg", 0), 3),
                "o": s["outcome"]["name"], "k": s["type"]["name"], "b": s.get("body_part", {}).get("name", ""),
                "ex": r1(end[0]), "ey": r1(end[1]), "ez": r1(end[2]) if len(end) > 2 else 0,
                "ff": [[r1(f["location"][0]), r1(f["location"][1]), 1 if f["teammate"] else 0, 1 if f.get("keeper") else 0] for f in s.get("freeze_frame", [])],
            })
            ball.append([t, p, r1(loc[0]), r1(loc[1])])
        elif typ == "Pass":
            ps = e["pass"]
            end = ps["end_location"]
            rec = ps.get("recipient", {}).get("name")
            out = ps.get("outcome", {}).get("name")
            passes.append([t, p, pid(rec, team) if rec else -1, m, r1(loc[0]), r1(loc[1]), r1(end[0]), r1(end[1]),
                           0 if out is None else 1, 1 if ps.get("shot_assist") or ps.get("goal_assist") else 0, 1 if ps.get("goal_assist") else 0])
            ball.append([t, p, r1(loc[0]), r1(loc[1])])
        elif typ in BALL:
            ball.append([t, p, r1(loc[0]), r1(loc[1])])
        elif typ in DEFENSIVE:
            defn.append([t, p, r1(loc[0]), r1(loc[1])])

    stage = STAGES.get(match["competition_stage"]["name"], match["competition_stage"]["name"])
    return {
        "id": match["match_id"], "date": match["match_date"], "stage": stage, "teams": [home, away],
        "score": [match["home_score"], match["away_score"]], "players": players,
        "shots": shots, "passes": passes, "ball": ball, "def": defn,
    }


def main():
    everything = "--all" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    matches = get(f"matches/{COMP}/{SEASON}.json")
    if not everything:
        matches = [m for m in matches if m["competition_stage"]["name"] != "Group Stage"]
    matches.sort(key=lambda m: (m["match_date"], m["kick_off"]))
    index = []
    for m in matches:
        data = build(m)
        (OUT / f"{m['match_id']}.json").write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
        index.append({"id": data["id"], "date": data["date"], "stage": data["stage"], "teams": data["teams"], "score": data["score"],
                      "shots": len(data["shots"]), "passes": len(data["passes"])})
        print(f"{data['stage']:>5} {data['teams'][0]} {data['score'][0]}-{data['score'][1]} {data['teams'][1]}  shots={len(data['shots'])} passes={len(data['passes'])}")
    (OUT / "index.json").write_text(json.dumps({"competition": "FIFA World Cup 2022", "source": "StatsBomb Open Data", "matches": index}, ensure_ascii=False))


if __name__ == "__main__":
    main()
