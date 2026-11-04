import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { players, seasonOptions } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { LEAGUE_COLORS, fmt } from "../utils/metrics";

const METRICS = [{ value: "goals", label: "Goals" }, { value: "assists", label: "Assists" }, { value: "xG", label: "Expected goals" }, { value: "xA", label: "Expected assists" }];
const ROW = 60;
const TOP = 10;

export default function Race() {
  const seasons = useMemo(() => seasonOptions.slice().reverse(), []);
  const [metric, setMetric] = useState("goals");
  const [league, setLeague] = useState("All leagues");
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  const model = useMemo(() => {
    const pool = players.filter((p) => league === "All leagues" || p.league === league);
    const latest = new Map();
    pool.forEach((p) => { const cur = latest.get(p.pid); if (!cur || p.season > cur.season) latest.set(p.pid, p); });
    const frames = seasons.map((_, f) => {
      const totals = new Map();
      pool.forEach((p) => { if (p.season <= seasons[f].value) totals.set(p.pid, (totals.get(p.pid) || 0) + p[metric]); });
      const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
      return new Map(ranked.map(([pid, v], i) => [pid, { v, rank: i }]));
    });
    const ids = [...new Set(frames.flatMap((f) => [...f.keys()]))];
    return { frames, ids, latest };
  }, [metric, league, seasons]);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setFrame((f) => { if (f >= seasons.length - 1) { setPlaying(false); return f; } return f + 1; }), 2200);
    return () => clearInterval(t);
  }, [playing, seasons.length]);

  const current = model.frames[frame];
  const max = Math.max(...[...current.values()].map((x) => x.v), 1);
  const decimals = metric === "goals" || metric === "assists" ? 0 : 1;

  function toggle() {
    if (!playing && frame >= seasons.length - 1) setFrame(0);
    setPlaying((p) => !p);
  }

  return (
    <>
      <PageHeader title="Scorers race" description="Watch the leaders change season by season. Totals add up from the first season in the data to the season shown." />
      <section className="panel race-panel">
        <div className="controls">
          <SelectField label="Measure" value={metric} onChange={setMetric} options={METRICS} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", "Premier League", "La Liga", "Serie A"]} />
          <button className="btn" onClick={toggle}>{playing ? "Pause" : frame >= seasons.length - 1 ? "Replay" : "Play"}</button>
        </div>
        <div className="race-year" aria-live="polite">{seasons[frame].label}</div>
        <div className="race-board" style={{ height: ROW * TOP }}>
          {model.ids.map((pid) => {
            const entry = current.get(pid);
            const p = model.latest.get(pid);
            return (
              <div key={pid} className="race-row" style={{ transform: `translateY(${(entry ? entry.rank : TOP) * ROW}px)`, opacity: entry ? 1 : 0, pointerEvents: entry ? "auto" : "none" }}>
                <Link to={`/player/${pid}?season=${p.season}`} className="race-who"><Avatar name={p.name} club={p.club} size={40} color={LEAGUE_COLORS[p.league]} /><span><strong>{p.name}</strong><small>{p.club}</small></span></Link>
                <div className="race-track"><div className="race-bar" style={{ width: `${entry ? (entry.v / max) * 100 : 0}%`, background: LEAGUE_COLORS[p.league] }} /></div>
                <b className="race-val">{entry ? fmt(entry.v, decimals) : ""}</b>
              </div>
            );
          })}
        </div>
        <input className="race-slider" type="range" min="0" max={seasons.length - 1} value={frame} onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} aria-label="Season" />
        <ul className="legend">{Object.entries(LEAGUE_COLORS).map(([n, c]) => <li key={n}><i style={{ background: c, width: 12, height: 12, borderRadius: 4, display: "inline-block" }} />{n}</li>)}</ul>
      </section>
    </>
  );
}
