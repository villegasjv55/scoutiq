import { useMemo } from "react";
import { leagueNames, meta, players, seasonOptions, teams } from "../data/store";
import PageHeader from "../components/PageHeader";

const TABLES = [
  { name: "leagues", cols: ["league_id PK", "name"] },
  { name: "clubs", cols: ["club_id PK", "name"] },
  { name: "players", cols: ["player_id PK", "name"] },
  { name: "player_seasons", cols: ["player_id FK", "season", "league_id FK", "club_id FK", "position", "games, minutes", "goals, assists", "xg, xa, npxg", "shots, key_passes", "xg_chain, xg_buildup", "goals_90, xg_90"] },
  { name: "team_seasons", cols: ["club_id FK", "season", "league_id FK", "played, wins, draws, losses", "goals_for, goals_against", "points, xg, xga, xpts", "final_rank"] },
];
const RELATIONS = [
  "players 1 to many player_seasons",
  "leagues 1 to many player_seasons",
  "clubs 1 to many player_seasons",
  "clubs 1 to many team_seasons",
  "leagues 1 to many team_seasons",
];
const LINEAGE = [
  ["Source", "Understat player and team season tables"],
  ["Raw", "data/raw/*.json, cached exactly as downloaded"],
  ["Clean", "scripts/build_dataset.py: positions, per 90 rates, percentiles"],
  ["Model", "scripts/build_clusters.py: K-means styles and PCA map"],
  ["Store", "scripts/build_database.py: normalised SQLite database"],
  ["Serve", "players.json, teams.json and styles.json feed this app; backend/main.py serves the database as an API"],
];

export default function DataHealth() {
  const checks = useMemo(() => {
    const keys = new Set(players.map((p) => p.key));
    const minutes = players.map((p) => p.minutes);
    const counts = {};
    players.forEach((p) => { const k = `${p.league}|${p.season}`; counts[k] = (counts[k] ?? 0) + 1; });
    const lowest = Math.min(...Object.values(counts));
    const rate = players.every((p) => Math.abs(p.goals90 - (p.goals / p.minutes) * 90) < 0.02);
    const pctOk = players.every((p) => Object.values(p.pct ?? {}).every((v) => v >= 0 && v <= 100));
    return [
      { name: "No duplicate player-season keys", ok: keys.size === players.length, detail: `${players.length.toLocaleString()} rows, ${keys.size.toLocaleString()} unique keys` },
      { name: "Every row has a known position", ok: players.every((p) => ["Forward", "Midfielder", "Defender"].includes(p.position)), detail: "Forward, Midfielder or Defender" },
      { name: "Minutes sit between the 450 filter and a full season", ok: Math.min(...minutes) >= 450 && Math.max(...minutes) <= 4000, detail: `lowest ${Math.min(...minutes)}, highest ${Math.max(...minutes)}` },
      { name: "Percentiles stay between 0 and 100", ok: pctOk, detail: "all eight percentile fields" },
      { name: "Goals are never below non-penalty goals", ok: players.every((p) => p.goals >= p.npg), detail: "goals >= npg for every row" },
      { name: "Expected values are never negative", ok: players.every((p) => p.xG >= 0 && p.xA >= 0), detail: "xG and xA >= 0" },
      { name: "Goals per 90 matches goals and minutes", ok: rate, detail: "recomputed and compared within 0.02" },
      { name: "Each league season has at least 300 players", ok: lowest >= 300, detail: `smallest group has ${lowest}` },
      { name: "Team histories loaded", ok: teams.length > 0, warn: true, detail: teams.length ? `${teams.length} team-seasons` : "not loaded yet: Understat was offline" },
      { name: "Playing styles assigned", ok: players.some((p) => p.playStyle), warn: true, detail: players.some((p) => p.playStyle) ? "playStyle field present" : "run scripts/build_clusters.py" },
    ];
  }, []);

  const grid = useMemo(() => {
    const map = {};
    players.forEach((p) => { map[`${p.league}|${p.season}`] = (map[`${p.league}|${p.season}`] ?? 0) + 1; });
    return map;
  }, []);

  const passed = checks.filter((c) => c.ok).length;

  return (
    <>
      <PageHeader title="Data Health" description="Automatic quality checks that run in your browser against the loaded dataset, plus the database design and the path data takes from source to screen. This is the data engineering side of the project." />
      <section className="panel">
        <div className="panel-head">
          <div><h2>Quality checks</h2><p className="hint">{passed} of {checks.length} passed. Source: {meta.source}, generated {meta.generated}.</p></div>
        </div>
        <ul className="check-list">
          {checks.map((c) => (
            <li key={c.name} className={c.ok ? "ok" : c.warn ? "warn" : "bad"}>
              <span className="mark">{c.ok ? "✓" : c.warn ? "!" : "✗"}</span>
              <strong>{c.name}</strong>
              <span className="hint">{c.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>Coverage</h2><p className="hint">Player-seasons kept (450+ minutes) per league and season.</p></div></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>League</th>{seasonOptions.slice().reverse().map((s) => <th key={s.value} className="num">{s.label}</th>)}</tr></thead>
            <tbody>
              {leagueNames.map((l) => (
                <tr key={l}><td><strong>{l}</strong></td>{seasonOptions.slice().reverse().map((s) => <td key={s.value} className="num">{grid[`${l}|${s.value}`] ?? 0}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>Database design</h2><p className="hint">Normalised SQLite schema with primary keys, foreign keys and CHECK constraints (see scripts/build_database.py).</p></div></div>
        <div className="er">
          {TABLES.map((t) => (
            <div className="er-table" key={t.name}>
              <h3>{t.name}</h3>
              <ul>{t.cols.map((c) => <li key={c} className={/PK|FK/.test(c) ? "key" : ""}>{c}</li>)}</ul>
            </div>
          ))}
        </div>
        <ul className="plain-list er-rel">{RELATIONS.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>Data lineage</h2><p className="hint">Every number on screen traces back to a source through these stages.</p></div></div>
        <ol className="lineage">
          {LINEAGE.map(([name, text]) => (
            <li key={name}><strong>{name}</strong><span>{text}</span></li>
          ))}
        </ol>
      </section>
    </>
  );
}
