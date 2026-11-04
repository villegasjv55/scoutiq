import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { players } from "../data/store";

export const PAGES = [
  { to: "/", label: "Command Center" },
  { to: "/players", label: "Players" },
  { to: "/compare", label: "Compare Lab" },
  { to: "/lab3d", label: "3D Performance Lab" },
  { to: "/styles", label: "Playing Styles (clusters)" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/matches", label: "Match Lab (maps, heatmaps, 3D)" },
  { to: "/xi", label: "Build Your XI" },
  { to: "/forecast", label: "Forecast (next season)" },
  { to: "/awards", label: "Season Awards" },
  { to: "/race", label: "Scorers Race" },
  { to: "/guess", label: "Guess the Player (game)" },
  { to: "/lab", label: "Scatter Lab" },
  { to: "/team-of-the-season", label: "Team of the Season" },
  { to: "/breakouts", label: "Breakout Finder" },
  { to: "/replace", label: "Replacement Finder" },
  { to: "/assistant", label: "Scout IQ Assistant" },
  { to: "/teams", label: "Teams" },
  { to: "/data-health", label: "Data Health" },
  { to: "/methods", label: "Methods" },
];

// newest season row for each player id
const LATEST = (() => {
  const map = new Map();
  players.forEach((p) => {
    const current = map.get(p.pid);
    if (!current || p.season > current.season) map.set(p.pid, p);
  });
  return [...map.values()];
})();

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = PAGES.filter((p) => !q || p.label.toLowerCase().includes(q)).map((p) => ({ kind: "Page", label: p.label, to: p.to }));
    const people = q.length >= 2
      ? LATEST.filter((p) => p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q))
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 8)
          .map((p) => ({ kind: "Player", label: p.name, detail: `${p.club}, ${p.seasonLabel}`, to: `/player/${p.pid}?season=${p.season}` }))
      : [];
    return [...people, ...pages].slice(0, 12);
  }, [query]);

  function choose(item) {
    if (!item) return;
    navigate(item.to);
    onClose();
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[active]); }
    else if (e.key === "Escape") onClose();
  }

  if (!open) return null;
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="palette-input" placeholder="Search players, clubs or pages" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} />
        <ul className="palette-list">
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.to}`}>
              <button className={i === active ? "palette-item active" : "palette-item"} onMouseEnter={() => setActive(i)} onClick={() => choose(r)}>
                <span className="palette-kind">{r.kind}</span>
                <span className="palette-label">{r.label}</span>
                {r.detail && <span className="palette-detail">{r.detail}</span>}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="palette-empty">Nothing found</li>}
        </ul>
        <div className="palette-foot">Up and down to move, Enter to open, Esc to close</div>
      </div>
    </div>
  );
}
