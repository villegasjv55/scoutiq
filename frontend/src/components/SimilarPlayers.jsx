import { useMemo } from "react";
import { Link } from "react-router-dom";
import { players } from "../data/store";
import Avatar from "./Avatar";
import { LEAGUE_COLORS, RADAR_METRICS } from "../utils/metrics";

const KEYS = RADAR_METRICS.map((m) => m.key);
const MAX_DISTANCE = 100 * Math.sqrt(KEYS.length);

const vector = (p) => KEYS.map((k) => p.pct?.[k] ?? 0);

// Euclidean distance between two percentile profiles, turned into a 0 to 100 "profile match".
function match(a, b) {
  const dist = Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
  return Math.round((1 - dist / MAX_DISTANCE) * 100);
}

export function similarTo(player, count = 6, accept = () => true) {
  const base = vector(player);
  return players
    .filter((p) => p.pid !== player.pid && p.position === player.position && p.minutes >= 900 && accept(p))
    .map((p) => ({ p, score: match(base, vector(p)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export default function SimilarPlayers({ player, selected, onToggle }) {
  const rows = useMemo(() => similarTo(player, 6), [player]);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Similar players</h2>
          <p className="hint">
            Closest {player.position.toLowerCase()}s in any season, measured on the eight percentile measures of the radar
            (Euclidean distance). 100% would be an identical profile.
          </p>
        </div>
      </div>
      <ul className="rank-list">
        {rows.map(({ p, score }) => {
          const on = selected.includes(p.key);
          return (
            <li key={p.key}>
              <div className="sim-row">
                <Link to={`/player/${p.pid}?season=${p.season}`} className="player-cell">
                  <Avatar name={p.name} club={p.club} color={LEAGUE_COLORS[p.league]} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.club}, {p.seasonLabel}</small>
                  </span>
                </Link>
                <div className="sim-score" aria-label={`${score} percent match`}>
                  <div className="pct-track"><div className="pct-fill" style={{ width: `${score}%`, background: "var(--amber)", color: "var(--amber)" }} /></div>
                  <strong>{score}%</strong>
                </div>
                <button className={on ? "chip-btn on" : "chip-btn"} onClick={() => onToggle(p.key)} disabled={!on && selected.length >= 4}>
                  {on ? "Added" : "Compare"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
