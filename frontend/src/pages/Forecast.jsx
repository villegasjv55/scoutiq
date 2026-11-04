import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { forecast } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import Tilt from "../components/Tilt";
import { LEAGUE_COLORS, fmt, signed } from "../utils/metrics";

const SORTS = [
  { value: "goals", label: "Projected goals" },
  { value: "assists", label: "Projected assists" },
  { value: "rise", label: "Biggest projected rise" },
  { value: "fall", label: "Biggest projected fall" },
];

export default function Forecast() {
  const [position, setPosition] = useState("All positions");
  const [league, setLeague] = useState("All leagues");
  const [sort, setSort] = useState("goals");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!forecast.ready) return [];
    const q = query.trim().toLowerCase();
    const list = forecast.players.filter((r) => (position === "All positions" || r.position === position) && (league === "All leagues" || r.league === league) && (!q || r.name.toLowerCase().includes(q) || r.club.toLowerCase().includes(q)));
    const by = { goals: (r) => -r.proj.goals90, assists: (r) => -r.proj.assists90, rise: (r) => -r.goalsChange, fall: (r) => r.goalsChange };
    return list.sort((a, b) => by[sort](a) - by[sort](b));
  }, [position, league, sort, query]);

  if (!forecast.ready) {
    return (
      <>
        <PageHeader title="Forecast" description="Next-season projections from a regression model." />
        <section className="panel empty-panel">
          <h2>Forecast data is not built yet</h2>
          <p className="hint">In the terminal, from the project folder, run <code>python scripts/build_forecast.py</code>, then refresh this page.</p>
        </section>
      </>
    );
  }

  const g = forecast.metrics.goals90, a = forecast.metrics.assists90;
  const regulars = forecast.players.filter((r) => r.last.minutes >= 1800);
  const risers = regulars.slice().sort((x, y) => y.goalsChange - x.goalsChange).slice(0, 3);
  const fallers = regulars.slice().sort((x, y) => x.goalsChange - y.goalsChange).slice(0, 3);
  const maxG = Math.max(...rows.slice(0, 25).map((r) => Math.max(r.proj.goals90, r.last.goals90)), 0.1);

  const Card = ({ r, tone }) => (
    <Tilt>
      <Link to={`/player/${r.pid}?season=${forecast.fromSeason}`} className={`fc-card ${tone}`}>
        <Avatar name={r.name} club={r.club} size={52} color={LEAGUE_COLORS[r.league]} />
        <span><strong>{r.name}</strong><small>{r.club}</small></span>
        <b>{signed(r.goalsChange, 2)}<small>goals per 90</small></b>
      </Link>
    </Tilt>
  );

  return (
    <>
      <PageHeader title={`Forecast for ${forecast.forSeason}`} description={`A ridge regression trained on ${forecast.trainPairs} season-to-season player pairs predicts goals and assists per 90 from each player's ${forecast.fromLabel} numbers.`} />
      <section className="fc-model">
        <div className="panel">
          <h2>How good is the model?</h2>
          <p className="hint">Tested on players it never saw ({forecast.testPairs} players, {forecast.testSeason}). Lower error is better. The naive guess is "same as last season".</p>
          {[["Goals per 90", g], ["Assists per 90", a]].map(([label, m]) => (
            <div className="fc-test" key={label}>
              <span>{label}</span>
              <div className="fc-bars">
                <div><i style={{ width: `${(m.naiveMae / Math.max(m.naiveMae, m.mae)) * 100}%` }} className="naive" /><em>Naive guess {m.naiveMae}</em></div>
                <div><i style={{ width: `${(m.mae / Math.max(m.naiveMae, m.mae)) * 100}%` }} className="model" /><em>Model {m.mae}</em></div>
              </div>
              <b>{m.improvement}% closer</b>
            </div>
          ))}
          <p className="hint">The model sees underlying chance quality (xG, xA, shots, chain) and not just goals, so lucky finishers are pulled back toward normal. It cannot see injuries, transfers or age, so treat it as a starting point for scouting.</p>
        </div>
        <div className="panel">
          <h2>Projected to rise</h2>
          <div className="fc-cards">{risers.map((r) => <Card key={r.key} r={r} tone="up" />)}</div>
          <h2 className="fc-gap">Projected to fall</h2>
          <div className="fc-cards">{fallers.map((r) => <Card key={r.key} r={r} tone="down" />)}</div>
        </div>
      </section>
      <section className="panel">
        <div className="controls">
          <label className="field"><span>Search</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Player or club" /></label>
          <SelectField label="Position" value={position} onChange={setPosition} options={["All positions", "Forward", "Midfielder", "Defender"]} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", "Premier League", "La Liga", "Serie A"]} />
          <SelectField label="Sort by" value={sort} onChange={setSort} options={SORTS} />
        </div>
        <p className="result-count">{rows.length} players with {forecast.minMinutes}+ minutes in {forecast.fromLabel}. Totals assume 30 full matches.</p>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Player</th><th>Goals per 90: last season vs projected</th><th className="num">Change</th><th className="num">Proj. goals</th><th className="num">Proj. assists</th></tr></thead>
            <tbody>
              {rows.slice(0, 40).map((r) => (
                <tr key={r.key}>
                  <td><Link to={`/player/${r.pid}?season=${forecast.fromSeason}`} className="player-cell"><Avatar name={r.name} club={r.club} color={LEAGUE_COLORS[r.league]} /><span><strong>{r.name}</strong><small>{r.club}, {r.position}</small></span></Link></td>
                  <td><div className="fc-duo"><i className="last" style={{ width: `${(r.last.goals90 / maxG) * 100}%` }} /><i className="proj" style={{ width: `${(r.proj.goals90 / maxG) * 100}%` }} /></div><small className="sub">{fmt(r.last.goals90, 2)} then {fmt(r.proj.goals90, 2)}</small></td>
                  <td className={`num strong ${r.goalsChange >= 0 ? "up" : "down"}`}>{signed(r.goalsChange, 2)}</td>
                  <td className="num">{fmt(r.proj.goals, 1)}</td>
                  <td className="num">{fmt(r.proj.assists, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
