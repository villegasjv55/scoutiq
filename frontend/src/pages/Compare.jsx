import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { playerByKey, players } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import RadarCompare from "../components/RadarCompare";
import Tilt from "../components/Tilt";
import { AXIS_TICK, COMPARE_COLORS, GRID_STROKE, LEAGUE_COLORS, STAT_ROWS, TOOLTIP_STYLE, fmt } from "../utils/metrics";

const PER90_BARS = [
  { key: "goals90", label: "Goals" },
  { key: "assists90", label: "Assists" },
  { key: "xG90", label: "xG" },
  { key: "xA90", label: "xA" },
  { key: "shots90", label: "Shots" },
  { key: "keyPasses90", label: "Key passes" },
];

export default function Compare({ selected, onToggle }) {
  const chosen = selected.map((key) => playerByKey.get(key)).filter(Boolean);
  const [query, setQuery] = useState("");
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  // Open a shared link: ?p=key1,key2 fills the comparison once
  useEffect(() => {
    const shared = (params.get("p") || "").split(",").filter((k) => playerByKey.has(k));
    if (shared.length && selected.length === 0) shared.slice(0, 4).forEach((k) => onToggle(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setParams(selected.length ? { p: selected.join(",") } : {}, { replace: true });
  }, [selected, setParams]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { window.prompt("Copy this link", window.location.href); }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return players
      .filter((p) => !selected.includes(p.key) && (p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);
  }, [query, selected]);

  // For each statistic, which player leads (ties lead together)
  const leaders = STAT_ROWS.map((row) => {
    const best = Math.max(...chosen.map((p) => p[row.key]));
    return chosen.map((p) => p[row.key] === best && best > 0);
  });
  const wins = chosen.map((_, i) => leaders.filter((row) => row[i]).length);

  const barData = PER90_BARS.map((m) => {
    const row = { metric: m.label };
    chosen.forEach((p, i) => { row[`p${i}`] = Number(p[m.key].toFixed(2)); });
    return row;
  });

  return (
    <>
      <PageHeader title="Compare Lab" description="Put up to four players, or four seasons of the same player, side by side. The leader on each measure lights up, and the radar uses percentile ranks so different positions stay fair." >
        {chosen.length > 0 && <button className="btn ghost" onClick={copyLink}>{copied ? "Link copied" : "Copy share link"}</button>}
      </PageHeader>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Your lineup ({chosen.length}/4)</h2>
            <p className="hint">Search below to add players, or use the Compare buttons on the Players page.</p>
          </div>
          {chosen.length > 0 && (
            <button className="chip-btn" onClick={() => chosen.forEach((p) => onToggle(p.key))}>Clear all</button>
          )}
        </div>
        <label className="field grow picker">
          <span>Add a player or club</span>
          <input type="search" placeholder="Try Salah, Mbappe, Inter..." value={query} onChange={(e) => setQuery(e.target.value)} disabled={chosen.length >= 4} />
        </label>
        {results.length > 0 && (
          <ul className="rank-list picker-results">
            {results.map((p) => (
              <li key={p.key}>
                <div className="sim-row">
                  <span className="player-cell">
                    <Avatar name={p.name} club={p.club} color={LEAGUE_COLORS[p.league]} />
                    <span><strong>{p.name}</strong><small>{p.club}, {p.league}, {p.seasonLabel}</small></span>
                  </span>
                  <span className="hint">{p.goals} goals, {p.assists} assists</span>
                  <button className="chip-btn" onClick={() => { onToggle(p.key); setQuery(""); }}>Add</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {chosen.length > 0 && (
        <section className="vs-head">
          {chosen.map((p, i) => (
            <Tilt key={p.key} className="vs-player" style={{ "--tone": COMPARE_COLORS[i] }}>
              <Avatar name={p.name} club={p.club} large color={COMPARE_COLORS[i]} />
              <div>
                <h2><Link to={`/player/${p.pid}?season=${p.season}`}>{p.name}</Link></h2>
                <p>{p.club}, {p.seasonLabel}</p>
                <small style={{ color: LEAGUE_COLORS[p.league] }}>{p.league}</small>
                {chosen.length > 1 && <em className="wins">Leads {wins[i]} of {STAT_ROWS.length}</em>}
              </div>
              <button className="chip-btn" onClick={() => onToggle(p.key)}>Remove</button>
            </Tilt>
          ))}
        </section>
      )}

      {chosen.length < 2 ? (
        <section className="panel empty-panel">
          <h2>{chosen.length === 0 ? "Pick at least two players" : `${chosen[0].name} is selected`}</h2>
          <p className="hint">Add one more to unlock the head to head table, the radar and the per 90 chart. You can compare different seasons of the same player.</p>
        </section>
      ) : (
        <>
          <div className="two-col wide-left">
            <section className="panel">
              <div className="panel-head"><h2>Head to head</h2></div>
              <div className="hh" style={{ "--cols": chosen.length }}>
                {STAT_ROWS.map((row, r) => {
                  const max = Math.max(...chosen.map((p) => p[row.key]), 0.0001);
                  return (
                    <div className="hh-row" key={row.key}>
                      <span className="hh-label">{row.label}</span>
                      {chosen.map((p, i) => (
                        <div key={p.key} className={leaders[r][i] ? "hh-cell lead" : "hh-cell"}>
                          <strong>{fmt(p[row.key], row.dec)}</strong>
                          <div className="vs-bar"><i style={{ width: `${(p[row.key] / max) * 100}%`, background: COMPARE_COLORS[i] }} /></div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Percentile radar</h2>
                  <p className="hint">Each player against others in their position and season.</p>
                </div>
              </div>
              <RadarCompare players={chosen} height={360} />
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Per 90 minutes</h2>
                <p className="hint">The same lineup on the core rate statistics.</p>
              </div>
            </div>
            <div className="chart" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={4}>
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="metric" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP_STYLE} />
                  {chosen.map((p, i) => (
                    <Bar key={p.key} dataKey={`p${i}`} name={`${p.name}, ${p.seasonLabel}`} fill={COMPARE_COLORS[i]} radius={[8, 8, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="legend">
              {chosen.map((p, i) => (
                <li key={p.key}><span className="legend-dot" style={{ background: COMPARE_COLORS[i] }} />{p.name}, {p.seasonLabel}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
