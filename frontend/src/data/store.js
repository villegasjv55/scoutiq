import players from "./players.json";
import teams from "./teams.json";
import meta from "./meta.json";
import styles from "./styles.json";
import forecast from "./forecast.json";

export { players, teams, meta, styles, forecast };

export const seasonOptions = meta.seasons; // newest first: [{ value, label }]
export const leagueNames = meta.leagues;

export function careerOf(pid) {
  return players.filter((p) => p.pid === pid).sort((a, b) => a.season - b.season);
}

export const playerByKey = new Map(players.map((p) => [p.key, p]));
