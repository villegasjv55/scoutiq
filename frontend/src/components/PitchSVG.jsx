import { PITCH_H, PITCH_W } from "../utils/matchViz";

// Flat 2D pitch in StatsBomb coordinates (120 x 80). Children are drawn in pitch units.
export default function PitchSVG({ children, label = "Football pitch" }) {
  return (
    <svg className="pitch-h" viewBox={`-3 -3 ${PITCH_W + 6} ${PITCH_H + 6}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#12301a" /><stop offset="1" stopColor="#173a22" /></linearGradient>
        <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4" /></filter>
        <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="context-stroke" /></marker>
      </defs>
      <rect x="-3" y="-3" width={PITCH_W + 6} height={PITCH_H + 6} rx="3" fill="url(#pg)" />
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x={i * 10} y="0" width="10" height={PITCH_H} fill={i % 2 ? "rgba(255,255,255,0.025)" : "transparent"} />)}
      <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35">
        <rect x="0" y="0" width={PITCH_W} height={PITCH_H} />
        <line x1="60" y1="0" x2="60" y2={PITCH_H} />
        <circle cx="60" cy="40" r="10" />
        <rect x="0" y="18" width="18" height="44" />
        <rect x={PITCH_W - 18} y="18" width="18" height="44" />
        <rect x="0" y="30" width="6" height="20" />
        <rect x={PITCH_W - 6} y="30" width="6" height="20" />
        <path d="M18 32.5 A10 10 0 0 1 18 47.5" />
        <path d={`M${PITCH_W - 18} 32.5 A10 10 0 0 0 ${PITCH_W - 18} 47.5`} />
      </g>
      <circle cx="60" cy="40" r="0.7" fill="rgba(255,255,255,0.5)" />
      {children}
    </svg>
  );
}
