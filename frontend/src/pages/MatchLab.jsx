import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import PitchSVG from "../components/PitchSVG";
import SelectField from "../components/SelectField";
import { TEAM_COLORS, heatGrid, passNetwork, shortName, shotSummary } from "../utils/matchViz";

const Pitch3D = lazy(() => import("../components/Pitch3D"));
const BASE = `${import.meta.env.BASE_URL}statsbomb/`;
const VIEWS = [
  { id: "shots", label: "Shot map" },
  { id: "passes", label: "Pass map" },
  { id: "network", label: "Passing network" },
  { id: "heat", label: "Heatmap" },
  { id: "3d", label: "3D view" },
];
const COLS = 24;
const ROWS = 16;

function useMatch(id) {
  const cache = useRef(new Map());
  const [state, setState] = useState({ match: null, error: null });
  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    const hit = cache.current.get(id);
    if (hit) { setState({ match: hit, error: null }); return undefined; }
    fetch(`${BASE}${id}.json`).then((r) => { if (!r.ok) throw new Error("missing"); return r.json(); })
      .then((m) => { cache.current.set(id, m); if (live) setState({ match: m, error: null }); })
      .catch(() => live && setState({ match: null, error: "Could not load this match file." }));
    return () => { live = false; };
  }, [id]);
  return state;
}

export default function MatchLab() {
  const [index, setIndex] = useState(null);
  const [indexError, setIndexError] = useState(false);
  const [matchId, setMatchId] = useState(null);
  const [view, setView] = useState("shots");
  const [team, setTeam] = useState(0);
  const [player, setPlayer] = useState("all");
  const [heatKind, setHeatKind] = useState("ball");
  const [keyOnly, setKeyOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode3d, setMode3d] = useState("towers");
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    fetch(`${BASE}index.json`).then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setIndex(d); setMatchId(String(d.matches[d.matches.length - 1].id)); })
      .catch(() => setIndexError(true));
  }, []);

  const { match, error } = useMatch(matchId);
  useEffect(() => { setSelected(null); setPlayer("all"); }, [matchId, team]);

  const teamPlayers = useMemo(() => {
    if (!match) return [];
    const counts = new Map();
    match.ball.forEach((b) => { if (b[0] === team) counts.set(b[1], (counts.get(b[1]) || 0) + 1); });
    return match.players.map((p, i) => ({ i, ...p, n: counts.get(i) || 0 })).filter((p) => p.team === team && p.n >= 8).sort((a, b) => b.n - a.n);
  }, [match, team]);

  const pid = player === "all" ? null : Number(player);
  const shots = useMemo(() => (match ? match.shots.filter((s) => s.t === team) : []), [match, team]);
  const passes = useMemo(() => (match ? match.passes.filter((p) => p[0] === team && (pid == null || p[1] === pid) && (!keyOnly || p[9])) : []), [match, team, pid, keyOnly]);
  const points = useMemo(() => {
    if (!match) return [];
    const src = heatKind === "ball" ? match.ball : match.def;
    return src.filter((e) => e[0] === team && (pid == null || e[1] === pid)).map((e) => [e[2], e[3]]);
  }, [match, team, pid, heatKind]);
  const grid = useMemo(() => heatGrid(points, COLS, ROWS), [points]);
  const net = useMemo(() => (match ? passNetwork(match, team) : { nodes: [], links: [] }), [match, team]);
  const sum = useMemo(() => shotSummary(shots), [shots]);
  const color = TEAM_COLORS[team];
  const chosenShot = selected != null ? shots[selected] : null;

  if (indexError) {
    return (
      <>
        <PageHeader title="Match Lab" description="Shot maps, pass maps, heatmaps and 3D match views from free StatsBomb Open Data." />
        <section className="panel empty-panel">
          <h2>Match data is not built yet</h2>
          <p className="hint">In the terminal, from the project folder, run <code>python scripts/build_matches.py</code>, then refresh this page. It downloads the free match data (about 10 seconds).</p>
        </section>
      </>
    );
  }
  if (!index) return <PageHeader title="Match Lab" description="Loading match list." />;

  const showPlayer = ["passes", "heat", "3d"].includes(view);
  const cell = (i) => ({ x: (i % COLS) * (120 / COLS), y: Math.floor(i / COLS) * (80 / ROWS) });

  return (
    <>
      <PageHeader title="Match Lab" description="Pick a World Cup 2022 knockout match and explore it as shot maps, pass maps, passing networks, heatmaps and an interactive 3D pitch. Every team attacks from left to right." />
      <section className="panel ml-panel">
        <div className="controls">
          <SelectField label="Match" value={matchId ?? ""} onChange={setMatchId} options={index.matches.map((m) => ({ value: String(m.id), label: `${m.stage}: ${m.teams[0]} ${m.score[0]}-${m.score[1]} ${m.teams[1]}` }))} />
          <div className="field"><span>Team</span>
            <div className="ml-team">
              {match?.teams.map((t, i) => <button key={t} className={`chip-btn ${team === i ? "on" : ""}`} style={team === i ? { borderColor: TEAM_COLORS[i], color: TEAM_COLORS[i] } : undefined} onClick={() => setTeam(i)}>{t}</button>)}
            </div>
          </div>
          {showPlayer && (
            <SelectField label="Player" value={player} onChange={setPlayer} options={[{ value: "all", label: "Whole team" }, ...teamPlayers.map((p) => ({ value: String(p.i), label: p.name }))]} />
          )}
          {(view === "heat" || (view === "3d" && mode3d === "towers")) && (
            <SelectField label="Activity" value={heatKind} onChange={setHeatKind} options={[{ value: "ball", label: "On the ball" }, { value: "def", label: "Defending" }]} />
          )}
          {(view === "passes") && <button className={`chip-btn ${keyOnly ? "on" : ""}`} onClick={() => setKeyOnly((k) => !k)}>Chance-creating passes only</button>}
        </div>

        <div className="ml-tabs" role="tablist">
          {VIEWS.map((v) => <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? "on" : ""} onClick={() => setView(v.id)}>{v.label}</button>)}
        </div>

        {error && <p className="hint">{error}</p>}
        {match && (
          <div className="ml-body" key={`${matchId}-${view}-${team}`}>
            <div className="ml-score">
              <span style={{ color: TEAM_COLORS[0] }}>{match.teams[0]}</span><strong>{match.score[0]} - {match.score[1]}</strong><span style={{ color: TEAM_COLORS[1] }}>{match.teams[1]}</span>
              <small>{match.stage}, {match.date}</small>
            </div>

            {view === "shots" && (
              <>
                <div className="ml-stats">
                  <div><strong>{sum.shots}</strong><span>shots</span></div><div><strong>{sum.goals}</strong><span>goals</span></div>
                  <div><strong>{sum.onTarget}</strong><span>on target</span></div><div><strong>{sum.xg.toFixed(2)}</strong><span>expected goals</span></div>
                  <div><strong>{sum.xgPerShot.toFixed(2)}</strong><span>xG per shot</span></div>
                </div>
                <PitchSVG label={`${match.teams[team]} shot map`}>
                  {shots.map((s, i) => (
                    <g key={i} className="ml-shot" onClick={() => setSelected(i)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(i)}>
                      <line x1={s.x} y1={s.y} x2={s.ex} y2={s.ey} stroke={s.o === "Goal" ? "#5ef2c9" : color} strokeOpacity={selected === i ? 1 : 0.28} strokeWidth={selected === i ? 0.5 : 0.22} />
                      <circle cx={s.x} cy={s.y} r={1 + Math.sqrt(s.xg) * 5} fill={s.o === "Goal" ? "#5ef2c9" : color} fillOpacity={s.o === "Goal" ? 0.95 : 0.3} stroke={selected === i ? "#fff" : color} strokeWidth={selected === i ? 0.6 : 0.3} />
                    </g>
                  ))}
                </PitchSVG>
                <p className="hint">Bigger circles are better chances (higher xG). Bright filled circles are goals. Click a shot to replay it in 3D.</p>
                {chosenShot && (
                  <div className="ml-replay">
                    <div className="ml-shotinfo">
                      <h2>{match.players[chosenShot.p].name}, {chosenShot.m}'</h2>
                      <p>{chosenShot.o}. {chosenShot.k}, {chosenShot.b.toLowerCase()}. xG {chosenShot.xg.toFixed(2)}. {chosenShot.ff.length ? `${chosenShot.ff.length} other players were in the frame.` : "No freeze frame for this shot."}</p>
                    </div>
                    <div className="ml-canvas short"><Suspense fallback={<div className="ml-loading">Loading 3D</div>}>
                      <Pitch3D mode="shots" team={team} shots={shots} selected={selected} onPick={setSelected} grid={grid} cols={COLS} rows={ROWS} passes={[]} />
                    </Suspense></div>
                  </div>
                )}
              </>
            )}

            {view === "passes" && (
              <>
                <p className="result-count">{passes.length} passes shown{pid != null ? ` by ${shortName(match.players[pid].name)}` : ""}. Solid lines are completed, red dashed lines were lost. Amber lines are assists and white lines led to a shot.</p>
                <PitchSVG label={`${match.teams[team]} pass map`}>
                  {passes.map((p, i) => {
                    const lost = p[8] === 1;
                    const stroke = p[10] ? "#ffcf5c" : p[9] ? "#ffffff" : lost ? "#ff6b9d" : color;
                    return (
                      <g key={i}>
                        <line x1={p[4]} y1={p[5]} x2={p[6]} y2={p[7]} stroke={stroke} strokeOpacity={p[9] ? 0.95 : lost ? 0.5 : 0.4} strokeWidth={p[9] ? 0.45 : 0.22} strokeDasharray={lost ? "1 0.8" : undefined} />
                        <circle cx={p[6]} cy={p[7]} r={p[9] ? 0.8 : 0.45} fill={stroke} fillOpacity="0.9" />
                      </g>
                    );
                  })}
                </PitchSVG>
              </>
            )}

            {view === "network" && (
              <>
                <p className="hint">Each circle sits at the average spot a player passes from. Bigger circles made more completed passes. Thicker lines mean more passes between the two players (3 or more, either direction).</p>
                <PitchSVG label={`${match.teams[team]} passing network`}>
                  {net.links.map((l) => {
                    const a = net.nodes.find((n) => n.id === l.a); const b = net.nodes.find((n) => n.id === l.b);
                    return a && b ? <line key={`${l.a}-${l.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeOpacity={Math.min(0.85, 0.2 + l.count / 30)} strokeWidth={0.3 + l.count / 7} strokeLinecap="round" /> : null;
                  })}
                  {net.nodes.map((n) => (
                    <g key={n.id}>
                      <circle cx={n.x} cy={n.y} r={1.25 + n.count / 24} fill="#0b100c" stroke={color} strokeWidth="0.7" />
                      <text x={n.x} y={n.y + 0.9} textAnchor="middle" fontSize="1.9" fontWeight="700" fill="#fff">{shortName(match.players[n.id].name).slice(0, 3).toUpperCase()}</text>
                      <text x={n.x} y={n.y - 2.6 - n.count / 24} textAnchor="middle" fontSize="1.9" fill="#fff" fillOpacity="0.85">{shortName(match.players[n.id].name)}</text>
                    </g>
                  ))}
                </PitchSVG>
              </>
            )}

            {view === "heat" && (
              <>
                <p className="hint">{heatKind === "ball" ? "Where the ball was touched, passed, carried or shot from." : "Where pressure, duels, interceptions, recoveries, clearances and blocks happened."} {points.length} events.</p>
                <PitchSVG label={`${match.teams[team]} heatmap`}>
                  <g filter="url(#soft)">
                    {grid.map((v0, i) => { const v = Math.pow(v0, 1.3); return v > 0.05 && (
                      <rect key={i} {...cell(i)} width={120 / COLS + 0.05} height={80 / ROWS + 0.05} fill={`hsl(${(255 + v * 150) % 360} 90% ${46 + v * 20}%)`} fillOpacity={0.12 + v * 0.78} />
                    ); })}
                  </g>
                </PitchSVG>
              </>
            )}

            {view === "3d" && (
              <>
                <div className="ml-sub">
                  {[["towers", "Heat towers"], ["passes", "Pass arcs"], ["shots", "Shots"]].map(([id, label]) => <button key={id} className={`chip-btn ${mode3d === id ? "on" : ""}`} onClick={() => setMode3d(id)}>{label}</button>)}
                  <button className={`chip-btn ${spin ? "on" : ""}`} onClick={() => setSpin((s) => !s)}>{spin ? "Stop spinning" : "Auto-rotate"}</button>
                </div>
                <p className="hint">Drag to rotate, scroll to zoom. {mode3d === "towers" ? "Taller, brighter towers mean more activity." : mode3d === "passes" ? "Arcs are completed passes. White arcs led to a shot, amber arcs were assists." : "Click a ball to replay the shot with the players frozen where they stood."}</p>
                <div className="ml-canvas"><Suspense fallback={<div className="ml-loading">Loading 3D</div>}>
                  <Pitch3D mode={mode3d} team={team} grid={grid} cols={COLS} rows={ROWS} passes={passes} shots={shots} selected={selected} onPick={setSelected} autoRotate={spin} />
                </Suspense></div>
              </>
            )}
          </div>
        )}
      </section>
      <p className="hint ml-credit">Match data: StatsBomb Open Data (github.com/statsbomb/open-data), FIFA World Cup 2022. Used under StatsBomb's open data terms, with credit.</p>
    </>
  );
}
