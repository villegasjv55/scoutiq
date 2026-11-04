// Helpers for the Match Lab. Coordinates follow StatsBomb: a pitch is 120 x 80, and every team attacks left to right.
export const PITCH_W = 120;
export const PITCH_H = 80;
export const TEAM_COLORS = ["#5ef2c9", "#4dd4ff"];

export function shortName(name = "") {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(-1)[0] : name;
}

// Smoothed density grid scaled 0..1 (each point spreads over its neighbours so the map reads as a heat blob).
export function heatGrid(points, cols = 24, rows = 16) {
  const grid = new Array(cols * rows).fill(0);
  const cw = PITCH_W / cols;
  const ch = PITCH_H / rows;
  points.forEach(([x, y]) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / cw)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / ch)));
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
        grid[gy * cols + gx] += Math.exp(-(dx * dx + dy * dy) / 2.2);
      }
    }
  });
  const max = Math.max(...grid, 0);
  return max > 0 ? grid.map((v) => v / max) : grid;
}

// Passing network: where each player passes from on average, and how often each pair connects.
export function passNetwork(match, team, minPasses = 8, minLink = 3) {
  const own = match.passes.filter((p) => p[0] === team && p[8] === 0);
  const nodes = new Map();
  own.forEach((p) => {
    const n = nodes.get(p[1]) ?? { id: p[1], sx: 0, sy: 0, count: 0 };
    n.sx += p[4]; n.sy += p[5]; n.count += 1;
    nodes.set(p[1], n);
  });
  const keep = new Set([...nodes.values()].filter((n) => n.count >= minPasses).map((n) => n.id));
  const links = new Map();
  own.forEach((p) => {
    if (p[2] < 0 || !keep.has(p[1]) || !keep.has(p[2])) return;
    const key = p[1] < p[2] ? `${p[1]}-${p[2]}` : `${p[2]}-${p[1]}`;
    links.set(key, (links.get(key) ?? 0) + 1);
  });
  return {
    nodes: [...nodes.values()].filter((n) => keep.has(n.id)).map((n) => ({ id: n.id, x: n.sx / n.count, y: n.sy / n.count, count: n.count })),
    links: [...links.entries()].filter(([, c]) => c >= minLink).map(([k, c]) => ({ a: Number(k.split("-")[0]), b: Number(k.split("-")[1]), count: c })),
  };
}

export function shotSummary(shots) {
  const goals = shots.filter((s) => s.o === "Goal").length;
  const onTarget = shots.filter((s) => ["Goal", "Saved", "Saved to Post"].includes(s.o)).length;
  const xg = shots.reduce((sum, s) => sum + s.xg, 0);
  return { shots: shots.length, goals, onTarget, xg, xgPerShot: shots.length ? xg / shots.length : 0 };
}
