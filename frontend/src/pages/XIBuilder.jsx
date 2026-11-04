import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { players, playerByKey, seasonOptions } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { LEAGUE_COLORS, fmt } from "../utils/metrics";
import { cardTier, vsiqRating } from "../utils/rating";

const FORMATIONS = { "4-3-3": [4, 3, 3], "4-4-2": [4, 4, 2], "3-5-2": [3, 5, 2], "4-5-1": [4, 5, 1], "3-4-3": [3, 4, 3], "5-3-2": [5, 3, 2] };
const ROW_Y = { Forward: 16, Midfielder: 46, Defender: 73 };

function slotsFor(formation) {
  const [d, m, f] = FORMATIONS[formation];
  const out = [];
  [["Defender", d], ["Midfielder", m], ["Forward", f]].forEach(([pos, n]) => {
    for (let i = 0; i < n; i += 1) out.push({ pos, x: ((i + 1) / (n + 1)) * 100, y: ROW_Y[pos] });
  });
  return out;
}

function autoPick(slots, season) {
  const pool = players.filter((p) => p.season === season && p.minutes >= 1500).sort((a, b) => vsiqRating(b) - vsiqRating(a) || b.goals + b.assists - (a.goals + a.assists));
  const used = new Set();
  return slots.map((slot) => {
    const pick = pool.find((p) => p.position === slot.pos && !used.has(p.pid));
    if (pick) used.add(pick.pid);
    return pick ? pick.key : "_";
  });
}

export default function XIBuilder() {
  const [params, setParams] = useSearchParams();
  const season = Number(params.get("s")) || seasonOptions[0].value;
  const formation = FORMATIONS[params.get("f")] ? params.get("f") : "4-3-3";
  const slots = useMemo(() => slotsFor(formation), [formation]);
  const xi = useMemo(() => {
    const raw = (params.get("xi") || "").split(",");
    return raw.length === slots.length ? raw : autoPick(slots, season);
  }, [params, slots, season]);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const write = (next) => setParams({ s: String(next.s ?? season), f: next.f ?? formation, xi: (next.xi ?? xi).join(",") }, { replace: true });
  const setSeason = (v) => write({ s: v, xi: autoPick(slots, Number(v)) });
  const setFormation = (v) => write({ f: v, xi: autoPick(slotsFor(v), season) });
  const assign = (index, key) => { write({ xi: xi.map((k, i) => (i === index ? key : k)) }); setActive(null); setQuery(""); };

  const chosen = xi.map((k) => playerByKey.get(k)).filter(Boolean);
  const avg = chosen.length ? Math.round(chosen.reduce((s, p) => s + vsiqRating(p), 0) / chosen.length) : 0;
  const ga = chosen.reduce((s, p) => s + p.goals + p.assists, 0);
  const xga = chosen.reduce((s, p) => s + p.xG + p.xA, 0);
  const clubs = new Set(chosen.map((p) => p.club)).size;
  const best = chosen.slice().sort((a, b) => vsiqRating(b) - vsiqRating(a))[0];

  const candidates = useMemo(() => {
    if (active === null) return [];
    const q = query.trim().toLowerCase();
    const taken = new Set(xi.map((k) => playerByKey.get(k)?.pid));
    return players
      .filter((p) => p.season === season && p.position === slots[active].pos && p.minutes >= 450 && !taken.has(p.pid) && (!q || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)))
      .sort((a, b) => vsiqRating(b) - vsiqRating(a))
      .slice(0, 12);
  }, [active, query, season, xi, slots]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { window.prompt("Copy this link", window.location.href); }
  }

  return (
    <>
      <PageHeader title="Build your XI" description="Pick a season and a formation, then click any spot on the pitch to swap the player. Your lineup lives in the link, so you can send it to anyone.">
        <button className="btn" onClick={copyLink}>{copied ? "Link copied" : "Copy lineup link"}</button>
      </PageHeader>
      <section className="panel xi-panel">
        <div className="controls">
          <SelectField label="Season" value={String(season)} onChange={setSeason} options={seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="Formation" value={formation} onChange={setFormation} options={Object.keys(FORMATIONS)} />
          <button className="chip-btn" onClick={() => write({ xi: autoPick(slots, season) })}>Auto-pick best XI</button>
          <button className="chip-btn" onClick={() => write({ xi: slots.map(() => "_") })}>Clear</button>
        </div>
        <div className="xi-layout">
          <div className="xi-pitch">
            <svg viewBox="0 0 680 860" preserveAspectRatio="none" aria-hidden="true">
              <g fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="2.5">
                <rect x="28" y="28" width="624" height="804" rx="6" />
                <line x1="28" y1="430" x2="652" y2="430" />
                <circle cx="340" cy="430" r="78" />
                <rect x="150" y="28" width="380" height="130" />
                <rect x="150" y="702" width="380" height="130" />
                <rect x="250" y="28" width="180" height="52" />
                <rect x="250" y="780" width="180" height="52" />
              </g>
            </svg>
            <div className="xi-gk"><span>GK</span><small>no keeper data</small></div>
            {slots.map((slot, i) => {
              const p = playerByKey.get(xi[i]);
              const r = p ? vsiqRating(p) : 0;
              return (
                <button key={i} className={`xi-slot ${p ? `tier-${cardTier(r)}` : "empty"} ${active === i ? "open" : ""}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onClick={() => { setActive(i); setQuery(""); }} aria-label={p ? `${p.name}, change player` : `Empty ${slot.pos} spot, choose a player`}>
                  {p ? <Avatar name={p.name} club={p.club} size={58} color={LEAGUE_COLORS[p.league]} /> : <span className="xi-plus">+</span>}
                  <span className="xi-name">{p ? p.name.split(" ").slice(-1)[0] : slot.pos}</span>
                  {p && <span className="xi-rate">{r}</span>}
                </button>
              );
            })}
          </div>
          <aside className="xi-side">
            <div className="xi-stats">
              <div className={`xi-big tier-${cardTier(avg)}`}><strong>{avg}</strong><span>team rating</span></div>
              <div><strong>{ga}</strong><span>goals + assists</span></div>
              <div><strong>{fmt(xga, 1)}</strong><span>xG + xA</span></div>
              <div><strong>{clubs}</strong><span>clubs</span></div>
            </div>
            {best && <p className="hint">Star of the side: <Link className="text-link" to={`/player/${best.pid}?season=${best.season}`}>{best.name}</Link> ({vsiqRating(best)}).</p>}
            {active === null ? (
              <p className="hint">Click a spot on the pitch to choose a {" "}player. Ratings are the VSIQ average of eight percentiles.</p>
            ) : (
              <div className="xi-picker">
                <div className="xi-picker-head">
                  <strong>{slots[active].pos}</strong>
                  <button className="chip-btn" onClick={() => assign(active, "_")}>Remove</button>
                  <button className="chip-btn" onClick={() => setActive(null)}>Close</button>
                </div>
                <input type="search" autoFocus placeholder="Search name or club" value={query} onChange={(e) => setQuery(e.target.value)} />
                <ul>
                  {candidates.map((p) => (
                    <li key={p.key}><button onClick={() => assign(active, p.key)}>
                      <Avatar name={p.name} club={p.club} size={34} color={LEAGUE_COLORS[p.league]} />
                      <span><strong>{p.name}</strong><small>{p.club}, {p.goals} G, {p.assists} A</small></span>
                      <b>{vsiqRating(p)}</b>
                    </button></li>
                  ))}
                  {candidates.length === 0 && <li className="hint">No players match. Try a different search.</li>}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
