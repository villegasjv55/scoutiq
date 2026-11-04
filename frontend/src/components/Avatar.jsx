import { useId } from "react";
import { initials } from "../utils/metrics";

// Generated portrait: no real photos, so it works for every player. The hue comes from the club,
// so teammates share a kit colour and the same player always gets the same face colour.
export function hueOf(text = "") {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export default function Avatar({ name, club, large = false, size, color = "#9b8cff" }) {
  const id = useId().replace(/:/g, "");
  const hue = hueOf(club || name);
  const skin = [24, 28, 22, 30, 20][hueOf(name) % 5];
  const px = size ?? (large ? 72 : 38);
  return (
    <span className={large ? "avatar large" : "avatar"} style={{ "--ring": color, width: px, height: px }} title={name}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 72% 54%)`} />
            <stop offset="1" stopColor={`hsl(${(hue + 40) % 360} 62% 20%)`} />
          </linearGradient>
          <radialGradient id={`gl${id}`} cx="0.3" cy="0.2" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#bg${id})`} />
        <path d="M-2 68 C2 48 14 43 32 43 C50 43 62 48 66 68 Z" fill={`hsl(${hue} 55% 16%)`} />
        <path d="M24 43.5 L32 54 L40 43.5" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="28.5" y="34" width="7" height="10" rx="3" fill={`hsl(${skin} 38% 36%)`} />
        <ellipse cx="32" cy="26" rx="10" ry="11.5" fill={`hsl(${skin} 40% 46%)`} />
        <path d="M21.5 24 C21 13 43 13 42.5 24 C39 18 25 18 21.5 24 Z" fill={`hsl(${skin} 30% 14%)`} />
        <rect width="64" height="64" fill={`url(#gl${id})`} />
      </svg>
      {large && <b className="avatar-initials">{initials(name)}</b>}
    </span>
  );
}
