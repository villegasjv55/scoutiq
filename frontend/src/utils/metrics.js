export const LEAGUE_COLORS = {
  "Premier League": "#9b8cff",
  "La Liga": "#ff6b9d",
  "Serie A": "#4dd4ff",
};
export const POSITION_COLORS = { Forward: "#ff6b9d", Midfielder: "#4dd4ff", Defender: "#9b8cff" };
export const COMPARE_COLORS = ["#5ef2c9", "#4dd4ff", "#ff6b9d", "#b69cff"];

export const AXIS_TICK = { fill: "#98a1c0", fontSize: 13 };
export const GRID_STROKE = "#1d2238";
export const TOOLTIP_STYLE = {
  background: "#0d1019",
  border: "1px solid #2b3150",
  borderRadius: 12,
  color: "#eef1fb",
  fontSize: 13,
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
};

// Percentile profile shown on radar charts and percentile bars (keys match players.json "pct")
export const RADAR_METRICS = [
  { key: "goals90", label: "Goals" },
  { key: "assists90", label: "Assists" },
  { key: "xG90", label: "xG" },
  { key: "xA90", label: "xA" },
  { key: "shots90", label: "Shots" },
  { key: "keyPasses90", label: "Key passes" },
  { key: "xGChain90", label: "xG chain" },
  { key: "xGBuildup90", label: "Build-up" },
];

export const STAT_ROWS = [
  { key: "goals", label: "Goals", dec: 0 },
  { key: "assists", label: "Assists", dec: 0 },
  { key: "xG", label: "Expected goals (xG)", dec: 1 },
  { key: "xA", label: "Expected assists (xA)", dec: 1 },
  { key: "goals90", label: "Goals per 90", dec: 2 },
  { key: "xG90", label: "xG per 90", dec: 2 },
  { key: "shots90", label: "Shots per 90", dec: 2 },
  { key: "keyPasses90", label: "Key passes per 90", dec: 2 },
  { key: "xGChain90", label: "xG chain per 90", dec: 2 },
  { key: "minutes", label: "Minutes played", dec: 0 },
];

export const AXIS_OPTIONS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "xG", label: "xG" },
  { value: "xA", label: "xA" },
  { value: "npxG", label: "Non-penalty xG" },
  { value: "shots", label: "Shots" },
  { value: "keyPasses", label: "Key passes" },
  { value: "goals90", label: "Goals per 90" },
  { value: "assists90", label: "Assists per 90" },
  { value: "xG90", label: "xG per 90" },
  { value: "xA90", label: "xA per 90" },
  { value: "npxG90", label: "Non-penalty xG per 90" },
  { value: "shots90", label: "Shots per 90" },
  { value: "keyPasses90", label: "Key passes per 90" },
  { value: "xGChain90", label: "xG chain per 90" },
  { value: "xGBuildup90", label: "xG build-up per 90" },
  { value: "goalsMinusXG", label: "Goals above xG" },
  { value: "minutes", label: "Minutes" },
];

export const SORT_OPTIONS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "xG", label: "xG" },
  { value: "xA", label: "xA" },
  { value: "goals90", label: "Goals per 90" },
  { value: "xG90", label: "xG per 90" },
  { value: "keyPasses90", label: "Key passes per 90" },
  { value: "goalsMinusXG", label: "Goals above xG" },
  { value: "minutes", label: "Minutes" },
];

export function decimalsFor(key) {
  if (key.endsWith("90")) return 2;
  if (["xG", "xA", "npxG", "goalsMinusXG", "xGChain", "xGBuildup"].includes(key)) return 1;
  return 0;
}

export function fmt(value, dec = 0) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(dec);
}

export function signed(value, dec = 1) {
  if (value == null) return "-";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(dec)}`;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

export function initials(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Percentile colour scale: blue (low) to cyan (middle) to lime (high)
const STOPS = [
  [0, [77, 124, 255]],
  [50, [77, 212, 255]],
  [100, [211, 255, 100]],
];

export function pctColor(p) {
  const v = Math.max(0, Math.min(100, p ?? 0));
  for (let i = 1; i < STOPS.length; i += 1) {
    const [end, to] = STOPS[i];
    const [start, from] = STOPS[i - 1];
    if (v <= end) {
      const t = (v - start) / (end - start);
      return `rgb(${from.map((c, k) => Math.round(c + (to[k] - c) * t)).join(",")})`;
    }
  }
  return "rgb(94,242,201)";
}
