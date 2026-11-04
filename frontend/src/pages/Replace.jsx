import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { leagueNames, players, playerByKey, seasonOptions } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { similarTo } from "../components/SimilarPlayers";
import { LEAGUE_COLORS } from "../utils/metrics";
import { vsiqRating } from "../utils/rating";

export default function Replace() {
  const [query, setQuery] = useState("");
  const [chosenKey, setChosenKey] = useState(null);
  const [league, setLeague] = useState("All leagues");
  const [season, setSeason] = useState("all");
  const [otherClub, setOtherClub] = useState(true);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return players.filter((p) => p.name.toLowerCase().includes(q)).sort((a, b) => b.season - a.season || b.minutes - a.minutes).slice(0, 8);
  }, [query]);

  const target = chosenKey ? playerByKey.get(chosenKey) : null;
  const results = useMemo(() => {
    if (!target) return [];
    return similarTo(target, 10, (p) =>
      (league === "All leagues" || p.league === league) &&
      (season === "all" || p.season === Number(season)) &&
      (!otherClub || p.club !== target.club));
  }, [target, league, season, otherClub]);

  return (
    <>
      <PageHeader title="Replacement Finder" description="Pick a player to replace and find the closest statistical profiles in the same position, with filters for league, season and club. Think of it as the first shortlist a recruitment analyst would build." />
      <section className="panel">
        <label className="field grow picker">
          <span>Player to replace</span>
          <input type="search" placeholder="Search a name, for example Haaland" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {matches.length > 0 && (
          <ul className="rank-list picker-results">
            {matches.map((p) => (
              <li key={p.key}>
                <div className="sim-row">
                  <span className="player-cell"><Avatar name={p.name} club={p.club} color={LEAGUE_COLORS[p.league]} /><span><strong>{p.name}</strong><small>{p.club}, {p.seasonLabel}</small></span></span>
                  <span className="hint">{p.position}, {p.minutes} min</span>
                  <button className="chip-btn" onClick={() => { setChosenKey(p.key); setQuery(""); }}>Replace</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {target && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Replacing {target.name}</h2>
              <p className="hint">{target.club}, {target.seasonLabel}, {target.position}, VSIQ rating {vsiqRating(target)}</p>
            </div>
          </div>
          <div className="controls">
            <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", ...leagueNames]} />
            <SelectField label="Season" value={season} onChange={setSeason} options={[{ value: "all", label: "Any season" }, ...seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))]} />
            <label className="check"><input type="checkbox" checked={otherClub} onChange={(e) => setOtherClub(e.target.checked)} /> Only players from other clubs</label>
          </div>
          <ul className="rank-list">
            {results.map(({ p, score }) => (
              <li key={p.key}>
                <div className="sim-row">
                  <Link to={`/player/${p.pid}?season=${p.season}`} className="player-cell"><Avatar name={p.name} club={p.club} color={LEAGUE_COLORS[p.league]} /><span><strong>{p.name}</strong><small>{p.club}, {p.league}, {p.seasonLabel}</small></span></Link>
                  <div className="sim-score"><div className="pct-track"><div className="pct-fill" style={{ width: `${score}%`, background: "var(--amber)", color: "var(--amber)" }} /></div><strong>{score}%</strong></div>
                  <span className="hint">Rating {vsiqRating(p)}</span>
                </div>
              </li>
            ))}
            {results.length === 0 && <li className="empty-state">No matches with these filters.</li>}
          </ul>
        </section>
      )}
    </>
  );
}
