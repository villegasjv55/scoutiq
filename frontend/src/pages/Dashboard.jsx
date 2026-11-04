import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXAMPLES } from "../utils/assistant";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { leagueNames, players, seasonOptions, teams } from "../data/store";
import Avatar from "../components/Avatar";
import { forecast } from "../data/store";
import CountUp from "../components/CountUp";
import RadarCompare from "../components/RadarCompare";
import SelectField from "../components/SelectField";
import Tilt from "../components/Tilt";
import {
  AXIS_TICK, GRID_STROKE, LEAGUE_COLORS, TOOLTIP_STYLE, decimalsFor, fmt, signed,
} from "../utils/metrics";

const BOARD_METRICS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "xG", label: "Expected goals" },
  { value: "xA", label: "Expected assists" },
  { value: "goals90", label: "Goals per 90" },
  { value: "xG90", label: "xG per 90" },
  { value: "keyPasses90", label: "Key passes per 90" },
  { value: "goalsMinusXG", label: "Goals above xG" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState("All leagues");
  const [metric, setMetric] = useState("goals");

  const spotlight = useMemo(
    () =>
      players
        .filter((p) => p.season === seasonOptions[0].value)
        .reduce((best, p) => (!best || p.goals > best.goals ? p : best), null),
    []
  );

  const pool = useMemo(
    () => players.filter((p) => p.season === Number(season) && (league === "All leagues" || p.league === league)),
    [season, league]
  );

  const board = useMemo(() => {
    const needsMinutes = metric.endsWith("90");
    return pool
      .filter((p) => !needsMinutes || p.minutes >= 900)
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10)
      .map((p) => ({ name: p.name, value: Number(p[metric].toFixed(3)), club: p.club, league: p.league, pid: p.pid, season: p.season }));
  }, [pool, metric]);

  const overperformers = useMemo(
    () => pool.filter((p) => p.minutes >= 900).sort((a, b) => b.goalsMinusXG - a.goalsMinusXG).slice(0, 6),
    [pool]
  );

  const leagueTrend = useMemo(() => {
    const rows = new Map();
    teams.forEach((t) => {
      const row = rows.get(t.season) ?? { season: t.seasonLabel, order: t.season };
      row[`${t.league}_g`] = (row[`${t.league}_g`] ?? 0) + t.goals;
      row[`${t.league}_p`] = (row[`${t.league}_p`] ?? 0) + t.played;
      rows.set(t.season, row);
    });
    return [...rows.values()]
      .sort((a, b) => a.order - b.order)
      .map((row) => {
        const out = { season: row.season };
        leagueNames.forEach((name) => {
          if (row[`${name}_p`]) out[name] = Number((row[`${name}_g`] / (row[`${name}_p`] / 2)).toFixed(2));
        });
        return out;
      });
  }, []);

  const dec = decimalsFor(metric);
  const needsMinutes = metric.endsWith("90");
  const uniquePlayers = new Set(players.map((p) => p.pid)).size;
  const uniqueClubs = new Set(players.map((p) => p.club)).size;

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Villegas Analytics presents Villegas Scout IQ</span>
          <h1>Football intelligence for the Premier League, La Liga and Serie A.</h1>
          <p>
            Scout players, compare up to four at once and find similar profiles using expected goals and
            percentile ranks. {seasonOptions.length} seasons of data, a SQL database and a Python pipeline.
          </p>
          <div className="hero-actions">
            <Link to="/players" className="btn">Browse players</Link>
            <Link to="/compare" className="btn ghost">Open the Compare Lab</Link>
          </div>
        </div>
        {spotlight && (
          <div className="hero-visual">
            <RadarCompare players={[spotlight]} height={330} />
            <Link to={`/player/${spotlight.pid}?season=${spotlight.season}`} className="spotlight">
              <Avatar name={spotlight.name} club={spotlight.club} size={56} color={LEAGUE_COLORS[spotlight.league]} />
              <strong>{spotlight.name}</strong>
              <span>
                {spotlight.club}, {spotlight.seasonLabel}: {spotlight.goals} goals from {fmt(spotlight.xG, 1)} xG
              </span>
            </Link>
          </div>
        )}
      </section>

      <section className="stat-strip" aria-label="Dataset size">
        <Tilt><strong><CountUp value={uniquePlayers} /></strong><span>players</span></Tilt>
        <Tilt><strong><CountUp value={players.length} /></strong><span>player seasons</span></Tilt>
        <Tilt><strong><CountUp value={seasonOptions.length} /></strong><span>seasons, {seasonOptions[seasonOptions.length - 1].label} to {seasonOptions[0].label}</span></Tilt>
        <Tilt><strong><CountUp value={uniqueClubs} /></strong><span>clubs in {leagueNames.length} leagues</span></Tilt>
      </section>

      <section className="explore" aria-label="Explore the platform">
        {[
          { to: "/matches", t: "Match Lab", d: "Shot maps, pass maps, heatmaps and a 3D pitch from real World Cup matches.", c: "#4dd4ff" },
          { to: "/xi", t: "Build your XI", d: "Pick a formation and a lineup, then share it as a link.", c: "#5ef2c9" },
          { to: "/forecast", t: "Forecast", d: forecast.ready ? `Next-season goals and assists for ${forecast.players.length} players.` : "Next-season projections from a regression model.", c: "#4dd4ff" },
          { to: "/awards", t: "Season awards", d: "Golden Boot, playmaker, clinical finisher and more.", c: "#ffcf5c" },
          { to: "/race", t: "Scorers race", d: "Watch the leaders change season by season.", c: "#ff6b9d" },
          { to: "/lab3d", t: "3D lab", d: "Fly through every player in 3D by play style.", c: "#b69cff" },
        ].map((x) => (
          <Tilt key={x.to}><Link to={x.to} className="explore-tile" style={{ "--c": x.c }}><i aria-hidden="true" /><strong>{x.t}</strong><span>{x.d}</span></Link></Tilt>
        ))}
      </section>

      <section className="panel ask-panel">
        <div className="panel-head">
          <div>
            <h2>Ask Scout IQ</h2>
            <p className="hint">Search the database in plain English.</p>
          </div>
        </div>
        <form className="ask" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q").toString().trim(); navigate(q ? `/assistant?q=${encodeURIComponent(q)}` : "/assistant"); }}>
          <input name="q" type="search" placeholder="Try: creative midfielders in La Liga" aria-label="Ask Scout IQ" />
          <button className="btn" type="submit">Ask</button>
        </form>
        <div className="preset-row">
          {EXAMPLES.slice(0, 3).map((ex) => (
            <Link key={ex} className="chip-btn" to={`/assistant?q=${encodeURIComponent(ex)}`}>{ex}</Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Leaderboard</h2>
            <p className="hint">
              Top 10 players{needsMinutes ? " with at least 900 minutes" : ""}. Click a bar to open the player.
            </p>
          </div>
        </div>
        <div className="controls">
          <SelectField label="Season" value={season} onChange={setSeason} options={seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", ...leagueNames]} />
          <SelectField label="Measure" value={metric} onChange={setMetric} options={BOARD_METRICS} />
        </div>
        <div className="chart" style={{ height: 430 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={board} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ ...AXIS_TICK, fill: "#dde3f6" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name, item) => [fmt(value, dec), `${item.payload.club}, ${item.payload.league}`]}
                labelStyle={{ color: "#eef1fb", fontWeight: 600 }}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} onClick={(entry) => { const d = entry?.payload ?? entry; navigate(`/player/${d.pid}?season=${d.season}`); }} style={{ cursor: "pointer" }}>
                {board.map((row) => (<Cell key={`${row.pid}-${row.season}`} fill={LEAGUE_COLORS[row.league]} />))}
                <LabelList dataKey="value" position="right" fill="#eef1fb" fontSize={13} formatter={(v) => fmt(v, dec)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="legend">
          {leagueNames.map((name) => (
            <li key={name}><span className="legend-dot" style={{ background: LEAGUE_COLORS[name] }} />{name}</li>
          ))}
        </ul>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Goals per match by league</h2>
              <p className="hint">Average goals per game across each league season.</p>
            </div>
          </div>
          {leagueTrend.length === 0 ? (
            <p className="hint">Team match data is not loaded yet, so this chart is empty. It fills in once the Understat team download succeeds.</p>
          ) : (
          <div className="chart" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leagueTrend} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="season" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 0.2", "dataMax + 0.2"]} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                {leagueNames.map((name) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={LEAGUE_COLORS[name]} strokeWidth={3} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          )}
          <ul className="legend">
            {leagueNames.map((name) => (
              <li key={name}><span className="legend-dot" style={{ background: LEAGUE_COLORS[name] }} />{name}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Scoring above expectation</h2>
              <p className="hint">Players with 900+ minutes who beat their xG by the most, in the season and league chosen above.</p>
            </div>
          </div>
          <ol className="rank-list">
            {overperformers.map((p) => (
              <li key={p.key}>
                <Link to={`/player/${p.pid}?season=${p.season}`}>
                  <span className="rank-name">
                    <strong>{p.name}</strong>
                    <small>{p.club}: {p.goals} goals from {fmt(p.xG, 1)} xG</small>
                  </span>
                  <span className="badge up">{signed(p.goalsMinusXG)}</span>
                </Link>
              </li>
            ))}
            {overperformers.length === 0 && <li className="empty-state">No players for this selection.</li>}
          </ol>
        </section>
      </div>
    </>
  );
}
