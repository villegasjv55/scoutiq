import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { leagueNames, players, seasonOptions } from "../data/store";
import PageHeader from "../components/PageHeader";
import PointCloud3D from "../components/PointCloud3D";
import SelectField from "../components/SelectField";
import { AXIS_OPTIONS, LEAGUE_COLORS, POSITION_COLORS, decimalsFor, fmt } from "../utils/metrics";

const PRESETS = [
  { label: "Finishers", x: "xG90", y: "goals90", z: "shots90", note: "Chance quality, goals and shot volume in one view." },
  { label: "Creators", x: "xA90", y: "keyPasses90", z: "xGBuildup90", note: "Who creates chances and who builds the play." },
  { label: "Involvement", x: "xGChain90", y: "xGBuildup90", z: "keyPasses90", note: "Players who touch the most dangerous moves." },
  { label: "Over and under", x: "xG", y: "goals", z: "minutes", note: "Goals against xG, with minutes on the depth axis." },
];
const POSITIONS = ["All positions", "Forward", "Midfielder", "Defender"];
const MINUTES = [
  { value: "450", label: "450+ minutes" },
  { value: "900", label: "900+ minutes" },
  { value: "1800", label: "1,800+ minutes" },
];
const COLOR_BY = ["League", "Position"];

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const label = (key) => AXIS_OPTIONS.find((o) => o.value === key)?.label ?? key;

export default function Lab3D() {
  const navigate = useNavigate();
  const [xKey, setXKey] = useState("xG90");
  const [yKey, setYKey] = useState("goals90");
  const [zKey, setZKey] = useState("shots90");
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState("All leagues");
  const [position, setPosition] = useState("All positions");
  const [minutes, setMinutes] = useState("900");
  const [colorBy, setColorBy] = useState("League");
  const [search, setSearch] = useState("");
  const [spin, setSpin] = useState(true);
  const webgl = useMemo(hasWebGL, []);

  const pool = useMemo(
    () => players.filter((p) =>
      (season === "all" || p.season === Number(season)) &&
      (league === "All leagues" || p.league === league) &&
      (position === "All positions" || p.position === position) &&
      p.minutes >= Number(minutes)),
    [season, league, position, minutes]
  );

  const scales = useMemo(
    () => [xKey, yKey, zKey].map((key) => {
      const vals = pool.map((p) => p[key]).sort((a, b) => a - b);
      const lo = vals[0] ?? 0;
      const hi = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.98))] ?? 1;
      return { key, lo, hi: hi > lo ? hi : lo + 1 };
    }),
    [pool, xKey, yKey, zKey]
  );

  const points = useMemo(() => {
    const place = (v, s) => Math.max(0, Math.min(1.04, (v - s.lo) / (s.hi - s.lo))) * 10;
    return pool.map((p) => ({
      p,
      pos: [place(p[xKey], scales[0]), place(p[yKey], scales[1]), place(p[zKey], scales[2])],
      size: 0.1 + Math.min(p.minutes, 3400) / 3400 * 0.12,
      color: colorBy === "League" ? LEAGUE_COLORS[p.league] : POSITION_COLORS[p.position],
      readout: [xKey, yKey, zKey].map((k) => ({ label: label(k), value: fmt(p[k], decimalsFor(k)) })),
    }));
  }, [pool, scales, xKey, yKey, zKey, colorBy]);

  const highlight = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return points.filter((pt) => pt.p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [points, search]);

  const axisText = scales.map((s) => `${label(s.key)} (${fmt(s.lo, decimalsFor(s.key))} to ${fmt(s.hi, decimalsFor(s.key))})`);
  const legend = colorBy === "League" ? LEAGUE_COLORS : POSITION_COLORS;

  function applyPreset(preset) {
    setXKey(preset.x);
    setYKey(preset.y);
    setZKey(preset.z);
  }

  return (
    <>
      <PageHeader title="3D Performance Lab" description="Every player becomes a point in 3D space, placed by three statistics you choose. Drag to rotate, scroll to zoom, hover for details and click a point to open the player." />
      <section className="panel">
        <div className="preset-row">
          {PRESETS.map((preset) => (
            <button key={preset.label} className="chip-btn" title={preset.note} onClick={() => applyPreset(preset)}>{preset.label}</button>
          ))}
        </div>
        <div className="controls">
          <SelectField label="X axis (mint)" value={xKey} onChange={setXKey} options={AXIS_OPTIONS} />
          <SelectField label="Y axis (cyan)" value={yKey} onChange={setYKey} options={AXIS_OPTIONS} />
          <SelectField label="Z axis (pink)" value={zKey} onChange={setZKey} options={AXIS_OPTIONS} />
        </div>
        <div className="controls">
          <SelectField label="Season" value={season} onChange={setSeason} options={[{ value: "all", label: "All seasons" }, ...seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))]} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", ...leagueNames]} />
          <SelectField label="Position" value={position} onChange={setPosition} options={POSITIONS} />
          <SelectField label="Minutes" value={minutes} onChange={setMinutes} options={MINUTES} />
          <SelectField label="Colour by" value={colorBy} onChange={setColorBy} options={COLOR_BY} />
          <label className="field grow">
            <span>Find a player</span>
            <input type="search" placeholder="Type a name to light them up" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <p className="result-count">
          {pool.length.toLocaleString()} players plotted. Axes run from the lowest value to the 98th percentile so a few outliers do not squash everyone else.
        </p>
        {webgl ? (
          <div className="stage3d">
            <PointCloud3D
              points={points}
              axes={axisText}
              highlight={highlight}
              autoRotate={spin}
              onPick={(pt) => navigate(`/player/${pt.p.pid}?season=${pt.p.season}`)}
            />
            <button className="chip-btn stage-btn" onClick={() => setSpin((s) => !s)}>{spin ? "Pause rotation" : "Auto-rotate"}</button>
          </div>
        ) : (
          <p className="hint">Your browser could not start 3D graphics (WebGL). Try Chrome or Safari, or use the Scatter Lab for the flat version.</p>
        )}
        <ul className="legend">
          {Object.entries(legend).map(([name, color]) => (
            <li key={name}><span className="legend-dot" style={{ background: color }} />{name}</li>
          ))}
          <li>Bigger point means more minutes</li>
        </ul>
      </section>
    </>
  );
}
