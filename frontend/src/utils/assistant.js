import { vsiqRating } from "./rating";

const POSITION_RULES = [
  [/\b(strikers?|forwards?|attackers?|wingers?|centre.?forwards?|center.?forwards?)\b/, "Forward"],
  [/\b(midfielders?|midfield|playmakers?)\b/, "Midfielder"],
  [/\b(defenders?|centre.?backs?|center.?backs?|full.?backs?|wing.?backs?)\b/, "Defender"],
];
const LEAGUE_RULES = [
  [/premier league|\bepl\b|english|england/, "Premier League"],
  [/la liga|spanish|spain/, "La Liga"],
  [/serie a|italian|italy/, "Serie A"],
];
// First matching rule wins. "per90" means a per 90 minute version exists.
const SORT_RULES = [
  [/clinical|finisher|overperform|above xg|beating xg|outscor/, { key: "goalsMinusXG", label: "goals above xG" }],
  [/underperform|below xg|wasteful/, { key: "goalsMinusXG", label: "goals below xG", asc: true }],
  [/key pass/, { key: "keyPasses90", label: "key passes per 90" }],
  [/creative|creator|creat|playmak|xa\b|chance/, { key: "xA90", label: "xA per 90" }],
  [/assist/, { key: "assists", per90: "assists90", label: "assists" }],
  [/shooter|shots|shoot/, { key: "shots90", label: "shots per 90" }],
  [/goals|scorer|scoring|score/, { key: "goals", per90: "goals90", label: "goals" }],
  [/build|builder|progress|involve|link/, { key: "xGBuildup90", label: "xG build-up per 90" }],
  [/\bxg\b|expected goals|dangerous/, { key: "xG90", label: "xG per 90" }],
];
const UNSUPPORTED = /\b(young|youngster|youth|age|aged|cheap|cheaper|value|price|wage|salary|contract|nationality|fast|pace|tall)\b/g;

export const EXAMPLES = [
  "Creative midfielders in La Liga",
  "Best clinical finishers in the Premier League last season",
  "Top scoring forwards in Serie A 2023-24",
  "Ball-playing defenders with 1800 minutes",
  "Most assists per 90 midfielders 2022",
];

export function parseQuery(text, seasons) {
  const q = text.toLowerCase();
  const latest = seasons[0].value;
  const out = { position: null, league: null, season: latest, minutes: 900, sort: null, understood: [], ignored: [] };

  for (const [re, value] of POSITION_RULES) if (re.test(q)) { out.position = value; break; }
  for (const [re, value] of LEAGUE_RULES) if (re.test(q)) { out.league = value; break; }

  const range = q.match(/(20\d\d)\s*[-\/]\s*(\d\d)\b/);
  const year = q.match(/\b(20\d\d)\b/);
  if (/all seasons|any season|career/.test(q)) out.season = "all";
  else if (range) out.season = Number(range[1]);
  else if (year) out.season = Number(year[1]);
  if (!seasons.some((s) => s.value === out.season) && out.season !== "all") {
    out.ignored.push(`season ${out.season} (not in the data)`);
    out.season = latest;
  }

  const mins = q.match(/(\d{3,4})\s*\+?\s*(minutes|mins|min)\b/);
  if (mins) out.minutes = Number(mins[1]);

  const per90 = /per 90|per game|per match|rate/.test(q);
  for (const [re, rule] of SORT_RULES) {
    if (re.test(q)) {
      out.sort = { ...rule, key: per90 && rule.per90 ? rule.per90 : rule.key };
      if (per90 && rule.per90) out.sort.label = `${rule.label} per 90`;
      break;
    }
  }

  const unsupported = q.match(UNSUPPORTED);
  if (unsupported) out.ignored.push(...[...new Set(unsupported)].map((w) => `"${w}" (age, price and physical data are not in the dataset)`));

  const seasonLabel = out.season === "all" ? "all seasons" : (seasons.find((s) => s.value === out.season)?.label ?? "");
  out.understood = [
    out.position ? `${out.position}s` : "All positions",
    out.league ?? "All leagues",
    seasonLabel,
    `${out.minutes}+ minutes`,
    out.sort ? `Ranked by ${out.sort.label}` : "Ranked by VSIQ rating",
  ];
  return out;
}

export function runQuery(players, parsed, limit = 15) {
  const key = parsed.sort?.key;
  const sign = parsed.sort?.asc ? 1 : -1;
  const value = (p) => (key ? p[key] : vsiqRating(p));
  return players
    .filter((p) =>
      (!parsed.position || p.position === parsed.position) &&
      (!parsed.league || p.league === parsed.league) &&
      (parsed.season === "all" || p.season === parsed.season) &&
      p.minutes >= parsed.minutes)
    .sort((a, b) => sign * (value(a) - value(b)))
    .slice(0, limit)
    .map((p) => ({ player: p, value: value(p) }));
}
