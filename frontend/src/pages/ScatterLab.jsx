import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { leagueNames, players, seasonOptions } from "../data/store";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { AXIS_OPTIONS, AXIS_TICK, GRID_STROKE, LEAGUE_COLORS, TOOLTIP_STYLE, decimalsFor, fmt } from "../utils/metrics";

const PRESETS = [
  { label: "Finishing", x: "xG", y: "goals", note: "Above the line: scoring more than the chances suggest." },
  { label: "Chance creation", x: "xA", y: "assists", note: "Above the line: assists beat the quality of passes." },
  { label: "Shot quality", x: "shots90", y: "npxG90", note: "Right: shoots often. Up: shoots from good positions." },
  { label: "Involvement", x: "xGBuildup90", y: "xGChain90", note: "Right: builds play. Up: part of dangerous moves." },
];
const DIAGONALS = [["xG", "goals"], ["xA", "assists"], ["xG90", "goals90"], ["xA90", "assists90"]];
const POSITIONS = ["All positions", "Forward", "Midfielder", "Defender"];
const HIGHLIGHT = "#5ef2c9";

function PointTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <strong>{p.name}</strong>
      <span>{p.club}, {p.league}</span>
      <span>{p.xLabel}: {fmt(p.x, p.xDec)}</span>
      <span>{p.yLabel}: {fmt(p.y, p.yDec)}</span>
    </div>
  );
}

export default function ScatterLab() {
  const navigate = useNavigate();
  const [xKey, setXKey] = useState("xG");
  const [yKey, setYKey] = useState("goals");
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState("All leagues");
  const [position, setPosition] = useState("All positions");
  const [minutes, setMinutes] = useState("900");
  const [search, setSearch] = useState("");

  const xLabel = AXIS_OPTIONS.find((o) => o.value === xKey)?.label ?? xKey;
  const yLabel = AXIS_OPTIONS.find((o) => o.value === yKey)?.label ?? yKey;
  const diagonal = DIAGONALS.some(([a, b]) => (a === xKey && b === yKey) || (a === yKey && b === xKey));
  const preset = PRESETS.find((p) => p.x === xKey && p.y === yKey);

  const { series, highlighted, total, maxValue } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = players.filter(
      (p) =>
        p.season === Number(season) &&
        p.minutes >= Number(minutes) &&
        (league === "All leagues" || p.league === league) &&
        (position === "All positions" || p.position === position)
    );
    const toPoint = (p) => ({
      x: p[xKey], y: p[yKey], name: p.name, club: p.club, league: p.league, pid: p.pid, season: p.season,
      xLabel, yLabel, xDec: decimalsFor(xKey), yDec: decimalsFor(yKey),
    });
    const isHit = (p) => term.length > 1 && p.name.toLowerCase().includes(term);
    const byLeague = {};
    leagueNames.forEach((name) => { byLeague[name] = rows.filter((p) => p.league === name && !isHit(p)).map(toPoint); });
    const hits = rows.filter(isHit).map(toPoint);
    const max = rows.reduce((m, p) => Math.max(m, p[xKey], p[yKey]), 0);
    return { series: byLeague, highlighted: hits, total: rows.length, maxValue: max };
  }, [xKey, yKey, season, league, position, minutes, search, xLabel, yLabel]);

  function open(entry) {
    const d = entry?.payload ?? entry;
    if (d?.pid) navigate(`/player/${d.pid}?season=${d.season}`);
  }

  return (
    <>
      <PageHeader title="Scatter lab" description="Plot any two measures against each other to find players who stand out. Click a dot to open that player." />
      <section className="panel">
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button key={p.label} className={p.x === xKey && p.y === yKey ? "chip-btn on" : "chip-btn"} onClick={() => { setXKey(p.x); setYKey(p.y); }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="controls">
          <SelectField label="Horizontal axis" value={xKey} onChange={setXKey} options={AXIS_OPTIONS} />
          <SelectField label="Vertical axis" value={yKey} onChange={setYKey} options={AXIS_OPTIONS} />
          <SelectField label="Season" value={season} onChange={setSeason} options={seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", ...leagueNames]} />
          <SelectField label="Position" value={position} onChange={setPosition} options={POSITIONS} />
          <SelectField label="Minutes" value={minutes} onChange={setMinutes} options={[{ value: "450", label: "450+" }, { value: "900", label: "900+" }, { value: "1800", label: "1,800+" }]} />
          <label className="field grow">
            <span>Highlight a player</span>
            <input type="search" placeholder="Type a name" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <p className="result-count">
          {total} players plotted. {preset ? preset.note : diagonal ? "Above the dashed line means doing more than expected." : "Hover a dot for details."}
        </p>
        <div className="chart" style={{ height: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 4 }}>
              <CartesianGrid stroke={GRID_STROKE} />
              <XAxis type="number" dataKey="x" name={xLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} label={{ value: xLabel, position: "insideBottom", offset: -12, fill: "#98a1c0", fontSize: 13 }} />
              <YAxis type="number" dataKey="y" name={yLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#98a1c0", fontSize: 13 }} />
              <Tooltip content={<PointTip />} cursor={{ stroke: "#3b4468", strokeDasharray: "4 4" }} />
              {diagonal && <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxValue, y: maxValue }]} stroke="#6f7899" strokeDasharray="6 6" ifOverflow="extendDomain" />}
              {leagueNames.map((name) => (
                <Scatter key={name} name={name} data={series[name]} fill={LEAGUE_COLORS[name]} fillOpacity={0.72} isAnimationActive={false} onClick={open} style={{ cursor: "pointer" }} />
              ))}
              <Scatter name="Highlighted" data={highlighted} fill={HIGHLIGHT} stroke="#ffffff" strokeWidth={2} isAnimationActive={false} onClick={open} style={{ cursor: "pointer" }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <ul className="legend">
          {leagueNames.map((name) => (
            <li key={name}><span className="legend-dot" style={{ background: LEAGUE_COLORS[name] }} />{name}</li>
          ))}
          <li><span className="legend-dot" style={{ background: HIGHLIGHT }} />Highlighted player</li>
        </ul>
      </section>
    </>
  );
}
