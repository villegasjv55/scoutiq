"""Next-season forecast: ridge regression on last season's per-90 numbers (NumPy only).

Idea: a player's goals/assists per 90 next season are best predicted by their underlying
chance quality (xG, xA, shots, chain) rather than by last season's goals alone, because
finishing luck regresses toward the mean. We train on season pairs (s -> s+1), check the
model on a held-out pair, and compare it with the naive guess "same as last season".

Run after build_dataset.py:   python scripts/build_forecast.py
Writes frontend/src/data/forecast.json
"""
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "frontend" / "src" / "data"
FEATURES = ["goals90", "assists90", "xG90", "xA90", "npxG90", "shots90", "keyPasses90", "xGChain90", "xGBuildup90"]
POSITIONS = ["Forward", "Midfielder", "Defender"]
MIN_MINUTES = 900
LAMBDA = 8.0  # ridge strength


def design(rows):
    X = np.array([[r[f] for f in FEATURES] + [1.0 if r["position"] == p else 0.0 for p in POSITIONS[1:]] for r in rows], float)
    return X


def fit(X, y, mu=None, sd=None):
    if mu is None:
        mu, sd = X.mean(0), X.std(0)
        sd[sd == 0] = 1
    Z = (X - mu) / sd
    ym = y.mean()
    w = np.linalg.solve(Z.T @ Z + LAMBDA * np.eye(Z.shape[1]), Z.T @ (y - ym))
    return w, ym, mu, sd


def predict(model, X):
    w, ym, mu, sd = model
    return ((X - mu) / sd) @ w + ym


def pairs(by_key, season):
    out = []
    for (pid, s), r in by_key.items():
        if s == season and r["minutes"] >= MIN_MINUTES and (pid, s + 1) in by_key and by_key[(pid, s + 1)]["minutes"] >= MIN_MINUTES:
            out.append((r, by_key[(pid, s + 1)]))
    return out


def main():
    players = json.loads((DATA / "players.json").read_text())
    by_key = {}
    for r in players:
        k = (r["pid"], r["season"])
        if k not in by_key or r["minutes"] > by_key[k]["minutes"]:
            by_key[k] = r
    seasons = sorted({s for _, s in by_key})
    last = seasons[-1]
    train_seasons, test_season = seasons[:-2], seasons[-2] - 1  # hold out the newest pair
    targets = ["goals90", "assists90"]

    def collect(ss):
        P = [p for s in ss for p in pairs(by_key, s)]
        return [a for a, _ in P], [b for _, b in P]

    if len(seasons) < 3:
        (DATA / "forecast.json").write_text(json.dumps({"ready": False}))
        print("Need 3+ seasons for a forecast; skipped.")
        return

    tr_x, tr_y = collect([s for s in seasons[:-1] if s < test_season])
    te_x, te_y = collect([test_season])
    metrics = {}
    for t in targets:
        m = fit(design(tr_x), np.array([r[t] for r in tr_y]))
        pred = predict(m, design(te_x))
        actual = np.array([r[t] for r in te_y])
        naive = np.array([r[t] for r in te_x])
        mae, nmae = float(np.abs(pred - actual).mean()), float(np.abs(naive - actual).mean())
        ss_res, ss_tot = float(((actual - pred) ** 2).sum()), float(((actual - actual.mean()) ** 2).sum())
        metrics[t] = {"mae": round(mae, 3), "naiveMae": round(nmae, 3), "r2": round(1 - ss_res / ss_tot, 3),
                      "improvement": round((nmae - mae) / nmae * 100, 1)}

    all_x, all_y = collect(seasons[:-1])
    models = {t: fit(design(all_x), np.array([r[t] for r in all_y])) for t in targets}
    cur = [r for (pid, s), r in by_key.items() if s == last and r["minutes"] >= MIN_MINUTES]
    X = design(cur)
    pg, pa = predict(models["goals90"], X), predict(models["assists90"], X)
    rows = []
    for r, g, a in zip(cur, pg, pa):
        g, a = max(float(g), 0), max(float(a), 0)
        rows.append({
            "key": r["key"], "pid": r["pid"], "name": r["name"], "club": r["club"], "league": r["league"],
            "position": r["position"], "last": {"goals90": r["goals90"], "assists90": r["assists90"], "minutes": r["minutes"]},
            "proj": {"goals90": round(g, 2), "assists90": round(a, 2), "goals": round(g * 30, 1), "assists": round(a * 30, 1)},
            "goalsChange": round(g - r["goals90"], 2),
        })
    out = {"ready": True, "fromSeason": last, "fromLabel": f"{last}-{str(last + 1)[2:]}",
           "forSeason": f"{last + 1}-{str(last + 2)[2:]}", "minMinutes": MIN_MINUTES, "features": FEATURES,
           "trainPairs": len(all_x), "testPairs": len(te_x), "testSeason": f"{test_season}-{str(test_season + 1)[2:]} to {test_season + 1}-{str(test_season + 2)[2:]}",
           "metrics": metrics, "players": rows}
    (DATA / "forecast.json").write_text(json.dumps(out, separators=(",", ":")))
    print(f"Forecast for {len(rows)} players. Backtest {out['testSeason']}: {json.dumps(metrics)}")


if __name__ == "__main__":
    main()
