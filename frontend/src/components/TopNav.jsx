import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const MAIN = [
  { to: "/", label: "Command Center", end: true },
  { to: "/players", label: "Players" },
  { to: "/compare", label: "Compare Lab" },
  { to: "/matches", label: "Match Lab" },
  { to: "/lab3d", label: "3D Lab" },
  { to: "/watchlist", label: "Watchlist" },
];
const MORE = [
  { to: "/styles", label: "Play Styles" },
  { to: "/xi", label: "Build Your XI" },
  { to: "/forecast", label: "Forecast" },
  { to: "/awards", label: "Season Awards" },
  { to: "/race", label: "Scorers Race" },
  { to: "/guess", label: "Guess the Player" },
  { to: "/lab", label: "Scatter Lab" },
  { to: "/team-of-the-season", label: "Team of the Season" },
  { to: "/breakouts", label: "Breakout Finder" },
  { to: "/replace", label: "Replacement Finder" },
  { to: "/assistant", label: "Scout IQ Assistant" },
  { to: "/teams", label: "Teams" },
  { to: "/data-health", label: "Data Health" },
  { to: "/methods", label: "Methods" },
];

export default function TopNav({ selectedCount, watchCount = 0, onSearch, theme, onTheme }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const moreActive = MORE.some((l) => pathname.startsWith(l.to));

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand" aria-label="Villegas Scout IQ home">
          <span className="brand-mark">V</span>
          <span className="brand-name"><span className="brand-title">Villegas <b>Scout IQ</b></span><small>by Villegas Analytics</small></span>
        </Link>
        <nav className="nav-pills" aria-label="Main">
          {MAIN.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "nav-pill active" : "nav-pill")}>
              {link.label}
              {link.to === "/watchlist" && watchCount > 0 && <span className="nav-count">{watchCount}</span>}
            </NavLink>
          ))}
          <div className="more" ref={menuRef}>
            <button className={moreActive || open ? "nav-pill active" : "nav-pill"} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
              More <span aria-hidden="true">▾</span>
            </button>
            {open && (
              <div className="more-menu" role="menu">
                {MORE.map((link) => (
                  <NavLink key={link.to} to={link.to} role="menuitem" className={({ isActive }) => (isActive ? "more-item active" : "more-item")}>{link.label}</NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>
        <button className="search-btn" onClick={onSearch} aria-label="Search">
          <span>Search</span><kbd>⌘K</kbd>
        </button>
        <button className="theme-btn" onClick={onTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title="Switch theme">{theme === "dark" ? "☀" : "☾"}</button>
        <Link to="/compare" className={selectedCount > 0 ? "tray has-items" : "tray"}>
          Comparing <strong>{selectedCount}/4</strong>
        </Link>
      </div>
    </header>
  );
}
