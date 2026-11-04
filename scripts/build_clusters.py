"""Playing-style analysis: K-means clustering and PCA, written with NumPy only.

Reads  frontend/src/data/players.json   (run build_dataset.py first)
Writes frontend/src/data/players.json   (adds playStyle, pcaX, pcaY to every player-season)
       frontend/src/data/styles.json    (style descriptions, sizes, examples and model quality)

Method
1. Pool: player-seasons with 900+ minutes, per position (Forward, Midfielder, Defender).
2. Features: nine per-90 statistics, standardised (z-scores) within each position.
3. K-means (k-means++ start, 10 restarts, fixed seed) with K = 4 clusters per position.
4. Each cluster is named from its centroid: the strongest of three composites
   (finishing, creating, building) it leads; the leftover cluster is the low-output style.
5. Every other player-season (450 to 899 minutes) is assigned to the nearest centroid.
6. PCA (via SVD) on the standardised features of all outfield players gives a 2D map.
7. Silhouette score per position reports how well separated the clusters are.
"""
import json
from pathlib import Path

import numpy as np

DATA = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data"
FEATURES = ["goals90", "assists90", "xG90", "xA90", "npxG90", "shots90", "keyPasses90", "xGChain90", "xGBuildup90"]
COMPOSITES = {
    "finishing": ["goals90", "xG90", "npxG90", "shots90"],
    "creating": ["assists90", "xA90", "keyPasses90"],
    "building": ["xGChain90", "xGBuildup90"],
}
NAMES = {
    "Forward": {"finishing": "Goal threat", "creating": "Creative forward", "building": "Link-up forward", "low": "Supporting forward"},
    "Midfielder": {"finishing": "Shooting midfielder", "creating": "Playmaker", "building": "Deep builder", "low": "Holding midfielder"},
    "Defender": {"finishing": "Attacking defender", "creating": "Creative defender", "building": "Ball-playing defender", "low": "Defensive defender"},
}
WHAT = {
    "finishing": "takes a lot of shots from good positions and scores often",
    "creating": "creates chances through key passes and expected assists",
    "building": "is involved in the build-up of dangerous moves",
    "low": "has a low attacking footprint compared with others in the position",
}
POOL_MINUTES = 900
K = 4


def kmeans(X, k, seed=7, restarts=10, iters=100):
    rng = np.random.default_rng(seed)
    best = None
    for _ in range(restarts):
        centers = [X[rng.integers(len(X))]]
        for _ in range(1, k):
            d2 = np.min([((X - c) ** 2).sum(1) for c in centers], axis=0)
            centers.append(X[rng.choice(len(X), p=d2 / d2.sum())])
        C = np.array(centers)
        for _ in range(iters):
            labels = ((X[:, None, :] - C[None]) ** 2).sum(2).argmin(1)
            new = np.array([X[labels == j].mean(0) if (labels == j).any() else C[j] for j in range(k)])
            if np.allclose(new, C):
                break
            C = new
        labels = ((X[:, None, :] - C[None]) ** 2).sum(2).argmin(1)
        inertia = ((X - C[labels]) ** 2).sum()
        if best is None or inertia < best[0]:
            best = (inertia, C, labels)
    return best[1], best[2]


def silhouette(X, labels):
    d = np.sqrt(((X[:, None, :] - X[None]) ** 2).sum(2))
    scores = []
    for i in range(len(X)):
        same = labels == labels[i]
        same[i] = False
        if not same.any():
            continue
        a = d[i, same].mean()
        b = min(d[i, labels == j].mean() for j in set(labels) if j != labels[i])
        scores.append((b - a) / max(a, b))
    return float(np.mean(scores))


def composite_scores(centroid):
    idx = {f: i for i, f in enumerate(FEATURES)}
    return {name: float(np.mean([centroid[idx[f]] for f in feats])) for name, feats in COMPOSITES.items()}


def name_clusters(centroids):
    """Greedy one-to-one matching of composites to clusters; the leftover cluster is 'low'."""
    scores = [composite_scores(c) for c in centroids]
    pairs = sorted(((s[name], i, name) for i, s in enumerate(scores) for name in COMPOSITES), reverse=True)
    label, used_cluster, used_name = {}, set(), set()
    for _, i, name in pairs:
        if i in used_cluster or name in used_name:
            continue
        label[i] = name
        used_cluster.add(i)
        used_name.add(name)
    for i in range(len(centroids)):
        label.setdefault(i, "low")
    return label, scores


def main():
    path = DATA / "players.json"
    if not path.exists():
        raise SystemExit("players.json not found. Run scripts/build_dataset.py first.")
    players = json.loads(path.read_text(encoding="utf-8"))
    n = len(players)
    X = np.array([[p[f] for f in FEATURES] for p in players], dtype=float)
    minutes = np.array([p["minutes"] for p in players])
    position = np.array([p["position"] for p in players])
    pool = minutes >= POOL_MINUTES

    style = np.empty(n, dtype=object)
    report = {}
    for pos in ["Forward", "Midfielder", "Defender"]:
        in_pos = position == pos
        fit = in_pos & pool
        mean, std = X[fit].mean(0), X[fit].std(0) + 1e-9
        Z = (X - mean) / std
        centroids, labels = kmeans(Z[fit], K)
        names, scores = name_clusters(centroids)
        everyone = np.where(in_pos)[0]
        assign = ((Z[everyone][:, None, :] - centroids[None]) ** 2).sum(2).argmin(1)
        for row, cl in zip(everyone, assign):
            style[row] = NAMES[pos][names[int(cl)]]
        sil = silhouette(Z[fit], labels)
        styles = []
        for cl in range(K):
            kind = names[cl]
            members = np.where(fit)[0][labels == cl]
            nearest = members[np.argsort(((Z[members] - centroids[cl]) ** 2).sum(1))]
            examples, seen = [], set()
            for row in nearest:
                if players[row]["pid"] in seen:
                    continue
                seen.add(players[row]["pid"])
                examples.append({"name": players[row]["name"], "club": players[row]["club"], "season": players[row]["seasonLabel"], "pid": players[row]["pid"], "seasonValue": players[row]["season"]})
                if len(examples) == 5:
                    break
            styles.append({
                "position": pos, "name": NAMES[pos][kind], "kind": kind, "size": int(len(members)),
                "description": f"A {pos.lower()} who {WHAT[kind]}.",
                "composites": {k: round(v, 2) for k, v in scores[cl].items()},
                "examples": examples,
            })
        report[pos] = {"styles": styles, "silhouette": round(sil, 3), "poolSize": int(fit.sum())}
        print(f"{pos}: pool {int(fit.sum())}, silhouette {sil:.3f}, " + ", ".join(f"{s['name']} ({s['size']})" for s in styles))

    # PCA over all outfield players, standardised on the pool
    mean, std = X[pool].mean(0), X[pool].std(0) + 1e-9
    Zall = (X - mean) / std
    _, svals, vt = np.linalg.svd(Zall[pool], full_matrices=False)
    comps = vt[:2]
    # fix the sign so the first axis points toward more attacking output
    for i in range(2):
        if comps[i].sum() < 0:
            comps[i] = -comps[i]
    coords = Zall @ comps.T
    explained = (svals ** 2 / (svals ** 2).sum())[:2]
    loadings = {FEATURES[j]: [round(float(comps[0][j]), 2), round(float(comps[1][j]), 2)] for j in range(len(FEATURES))}

    for i, p in enumerate(players):
        p["playStyle"] = style[i]
        p["pcaX"] = round(float(coords[i, 0]), 3)
        p["pcaY"] = round(float(coords[i, 1]), 3)
    path.write_text(json.dumps(players, ensure_ascii=False), encoding="utf-8")

    out = {
        "ready": True, "k": K, "poolMinutes": POOL_MINUTES, "features": FEATURES,
        "explainedVariance": [round(float(v), 3) for v in explained], "loadings": loadings, "positions": report,
    }
    (DATA / "styles.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"PCA explained variance: {explained[0]:.1%} and {explained[1]:.1%}")
    print(f"Updated {n} player-seasons and wrote styles.json")


main()
