import { RADAR_METRICS } from "./metrics";

// VSIQ rating: the plain average of the eight percentile measures (equal weights), 0 to 100.
export function vsiqRating(player) {
  const values = RADAR_METRICS.map((m) => player.pct?.[m.key] ?? 0);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// The six attributes shown on a player card, each a percentile
export const CARD_ATTRS = [
  { code: "GOL", key: "goals90" },
  { code: "AST", key: "assists90" },
  { code: "XG", key: "xG90" },
  { code: "XA", key: "xA90" },
  { code: "SHT", key: "shots90" },
  { code: "BLD", key: "xGBuildup90" },
];

export function cardTier(rating) {
  if (rating >= 85) return "elite";
  if (rating >= 70) return "gold";
  if (rating >= 55) return "silver";
  return "bronze";
}

export const STYLE_COLORS = { finishing: "#5ef2c9", creating: "#4dd4ff", building: "#b69cff", low: "#6f7899" };
