import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { players, seasonOptions, styles } from "../data/store";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { AXIS_TICK, GRID_STROKE } from "../utils/metrics";
import { STYLE_COLORS } from "../utils/rating";

const POSITIONS = ["All positions", "Forward", "Midfielder", "Defender"];
const FEATURE_NAMES = {
  goals90: "goals", assists90: "assists", xG90: "xG", xA90: "xA", npxG90: "non-penalty xG",
  shots90: "shots", keyPasses90: "key passes", xGChain90: "xG chain", xGBuildup90: "build-up",
};
const KIND_LABEL = { finishing: "Finishing", creating: "Creating", building: "Building", low: "Low output" };

function axisText(loadings, index, share) {
  const entries = Object.entries(loadings).map(([k, v]) => [FEATURE_NAMES[k], v[index]]).sort((a, b) => b[1] - a[1]);
  const up = entries.slice(0, 2).map((e) => e[0]).join(" and ");
  const down = entries.slice(-2).map((e) => e[0]).join(" and ");
  const pct = `${(share * 100).toFixed(0)}% of variance`;
  return index === 0 ? `PC1 (${pct}): overall attacking output, led by ${up}` : `PC2 (${pct}): more ${up}, less ${down}`;
}

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <strong>{p.name}</strong>
      <span>{p.club}, {p.seasonLabel}</span>
      <span>{p.playStyle}</span>
    </div>
  );
}

export default function Styles() {
  const navigate = useNavigate();
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [position, setPosition] = useState("All positions");

  const kindOf = useMemo(() => {
    const map = {};
    if (styles.ready) Object.values(styles.positions).forEach((pos) => pos.styles.forEach((s) => { map[s.name] = s.kind; }));
    return map;
  }, []);

  const series = useMemo(() => {
    const groups = { finishing: [], creating: [], building: [], low: [] };
    players
      .filter((p) => p.playStyle && (season === "all" || p.season === Number(season)) && (position === "All positions" || p.position === position))
      .forEach((p) => groups[kindOf[p.playStyle]]?.push({ ...p, x: p.pcaX, y: p.pcaY }));
    return groups;
  }, [season, position, kindOf]);

  if (!styles.ready) {
    return (
      <>
        <PageHeader title="Playing Styles" description="Machine learning groups players into styles from their statistics." />
        <section className="panel">
          <h2>The style model has not been run yet</h2>
          <p className="hint">In the terminal, from the project folder, run <code>python scripts/build_clusters.py</code>. It adds a style to every player and writes the results this page shows.</p>
        </section>
      </>
    );
  }

  const shown = position === "All positions" ? Object.keys(styles.positions) : [position];
  const total = Object.values(series).reduce((n, list) => n + list.length, 0);

  return (
    <>
      <PageHeader title="Playing Styles" description="K-means clustering groups players of the same position by how they play, using nine per 90 statistics. PCA squeezes those nine dimensions into a flat map where nearby points are similar players." />
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>The map of players</h2>
            <p className="hint">{total.toLocaleString()} player-seasons. Hover for details, click a point to open the player.</p>
          </div>
        </div>
        <div className="controls">
          <SelectField label="Season" value={season} onChange={setSeason} options={[{ value: "all", label: "All seasons" }, ...seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))]} />
          <SelectField label="Position" value={position} onChange={setPosition} options={POSITIONS} />
        </div>
        <div className="chart" style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 36, left: 4 }}>
              <CartesianGrid stroke={GRID_STROKE} />
              <XAxis type="number" dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} label={{ value: axisText(styles.loadings, 0, styles.explainedVariance[0]), position: "insideBottom", offset: -18, fill: "#98a1c0", fontSize: 12 }} />
              <YAxis type="number" dataKey="y" tick={AXIS_TICK} axisLine={false} tickLine={false} label={{ value: "PC2", angle: -90, position: "insideLeft", fill: "#98a1c0", fontSize: 12 }} />
              <Tooltip content={<Tip />} cursor={{ strokeDasharray: "4 4", stroke: "#3b4468" }} />
              {Object.entries(series).map(([kind, data]) => (
                <Scatter key={kind} name={KIND_LABEL[kind]} data={data} fill={STYLE_COLORS[kind]} fillOpacity={0.75} isAnimationActive={false} onClick={(d) => { const p = d?.payload ?? d; navigate(`/player/${p.pid}?season=${p.season}`); }} style={{ cursor: "pointer" }} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="hint">{axisText(styles.loadings, 1, styles.explainedVariance[1])}</p>
        <ul className="legend">
          {Object.entries(KIND_LABEL).map(([kind, label]) => (
            <li key={kind}><span className="legend-dot" style={{ background: STYLE_COLORS[kind] }} />{label}</li>
          ))}
        </ul>
      </section>

      {shown.map((pos) => (
        <section className="panel" key={pos}>
          <div className="panel-head">
            <div>
              <h2>{pos} styles</h2>
              <p className="hint">Fitted on {styles.positions[pos].poolSize.toLocaleString()} player-seasons with {styles.poolMinutes}+ minutes. Silhouette score {styles.positions[pos].silhouette} (0 is no separation, 1 is perfect).</p>
            </div>
          </div>
          <div className="style-grid">
            {styles.positions[pos].styles.map((s) => (
              <article className="style-card" key={s.name} style={{ "--tone": STYLE_COLORS[s.kind] }}>
                <h3><i />{s.name}</h3>
                <p className="hint">{s.description} {s.size.toLocaleString()} players in the fitted group.</p>
                <div className="mini-bars">
                  {Object.entries(s.composites).map(([name, z]) => (
                    <div key={name}>
                      <span>{name}</span>
                      <div className="pct-track"><div className="pct-fill" style={{ width: `${Math.max(4, Math.min(100, ((z + 1.5) / 4) * 100))}%`, background: "var(--tone)", color: "var(--tone)" }} /></div>
                    </div>
                  ))}
                </div>
                <ul className="example-list">
                  {s.examples.map((e) => (
                    <li key={`${e.pid}-${e.seasonValue}`}><Link to={`/player/${e.pid}?season=${e.seasonValue}`}>{e.name}</Link> <small>{e.club}, {e.season}</small></li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section className="panel">
        <h2>How this was built</h2>
        <p className="hint">Nine per 90 statistics are standardised within each position. K-means (k-means++ start, 10 restarts, K = {styles.k}) finds the groups; each group is named by which of three composites it leads: finishing (goals, xG, shots), creating (assists, xA, key passes) or building (xG chain, build-up). PCA on the same standardised data gives the map. Both algorithms are implemented with NumPy in scripts/build_clusters.py, and silhouette scores report cluster quality. Scores near 0.2 to 0.3 mean the styles overlap, which is realistic for football: players blend roles.</p>
      </section>
    </>
  );
}
