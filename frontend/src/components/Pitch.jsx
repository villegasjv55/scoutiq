import { Link } from "react-router-dom";
import { LEAGUE_COLORS, initials } from "../utils/metrics";

const W = 680;
const H = 860;
const ROW_Y = { GK: 0.9, Defender: 0.72, Midfielder: 0.47, Forward: 0.2 };

// rows: { Defender: [{player, label}], Midfielder: [...], Forward: [...] }
export default function Pitch({ rows }) {
  const nodes = [];
  Object.entries(rows).forEach(([pos, list]) => {
    list.forEach((entry, i) => {
      nodes.push({ ...entry, x: ((i + 1) / (list.length + 1)) * W, y: ROW_Y[pos] * H });
    });
  });

  return (
    <svg className="pitch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Team of the season on a pitch">
      <defs>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14301a" />
          <stop offset="1" stopColor="#0c1f12" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="26" fill="url(#grass)" />
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x="0" y={(i * H) / 8} width={W} height={H / 8} fill={i % 2 ? "rgba(255,255,255,0.03)" : "transparent"} />
      ))}
      <g fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5">
        <rect x="28" y="28" width={W - 56} height={H - 56} rx="6" />
        <line x1="28" y1={H / 2} x2={W - 28} y2={H / 2} />
        <circle cx={W / 2} cy={H / 2} r="78" />
        <rect x="150" y="28" width={W - 300} height="130" />
        <rect x="150" y={H - 158} width={W - 300} height="130" />
        <rect x="250" y="28" width={W - 500} height="52" />
        <rect x="250" y={H - 80} width={W - 500} height="52" />
      </g>
      <g>
        <circle cx={W / 2} cy={ROW_Y.GK * H} r="30" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.3)" strokeDasharray="5 6" strokeWidth="2" />
        <text x={W / 2} y={ROW_Y.GK * H + 5} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="15" fontWeight="700">GK</text>
        <text x={W / 2} y={ROW_Y.GK * H + 58} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="13">no goalkeeper data</text>
      </g>
      {nodes.map((n) => (
        <Link key={n.player.key} to={`/player/${n.player.pid}?season=${n.player.season}`}>
          <g className="pitch-node" transform={`translate(${n.x} ${n.y})`}>
            <circle r="31" fill="rgba(0,0,0,0.45)" cy="5" />
            <circle r="30" fill="#0e1410" stroke={LEAGUE_COLORS[n.player.league]} strokeWidth="3.5" />
            <text textAnchor="middle" y="6" fill="#eef1fb" fontSize="17" fontWeight="700">{initials(n.player.name)}</text>
            <rect x="-62" y="38" width="124" height="44" rx="12" fill="rgba(8,10,18,0.82)" />
            <text textAnchor="middle" y="57" fill="#eef1fb" fontSize="14" fontWeight="650">{n.player.name.split(" ").slice(-1)[0].slice(0, 15)}</text>
            <text textAnchor="middle" y="74" fill="#5ef2c9" fontSize="13" fontWeight="700">{n.label}</text>
          </g>
        </Link>
      ))}
    </svg>
  );
}
