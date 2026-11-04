import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { players, seasonOptions } from "../data/store";
import PageHeader from "../components/PageHeader";
import { EXAMPLES, parseQuery, runQuery } from "../utils/assistant";
import { decimalsFor, fmt } from "../utils/metrics";
import { vsiqRating } from "../utils/rating";

export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState(initial);

  useEffect(() => {
    const q = params.get("q") ?? "";
    setText(q);
    setQuery(q);
  }, [params]);

  const parsed = useMemo(() => (query.trim() ? parseQuery(query, seasonOptions) : null), [query]);
  const results = useMemo(() => (parsed ? runQuery(players, parsed) : []), [parsed]);
  const dec = parsed?.sort ? decimalsFor(parsed.sort.key) : 0;

  function submit(e, value = text) {
    e?.preventDefault();
    setParams(value.trim() ? { q: value.trim() } : {});
  }

  return (
    <>
      <PageHeader title="Scout IQ Assistant" description="Ask for players in plain English. The assistant reads the position, league, season, minutes and what you want to rank by, then searches the database. It runs on transparent rules, with no paid AI service." />
      <section className="panel">
        <form className="ask" onSubmit={submit}>
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Try: creative midfielders in La Liga 2023-24" aria-label="Ask Scout IQ" />
          <button className="btn" type="submit">Ask</button>
        </form>
        <div className="preset-row">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="chip-btn" onClick={() => { setText(ex); submit(null, ex); }}>{ex}</button>
          ))}
        </div>

        {parsed && (
          <>
            <div className="understood">
              <span className="eyebrow">I understood</span>
              <ul className="legend left">
                {parsed.understood.map((u) => <li key={u} className="chip-static">{u}</li>)}
              </ul>
              {parsed.ignored.length > 0 && <p className="hint">Ignored: {parsed.ignored.join("; ")}.</p>}
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Player</th><th>League</th><th className="num">Minutes</th>
                    <th className="num">{parsed.sort?.label ?? "VSIQ rating"}</th>
                    <th className="num">Goals</th><th className="num">Assists</th><th className="num">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ player: p, value }, i) => (
                    <tr key={p.key}>
                      <td className="num">{i + 1}</td>
                      <td><Link className="player-cell" to={`/player/${p.pid}?season=${p.season}`}><span><strong>{p.name}</strong><small>{p.club}, {p.seasonLabel}</small></span></Link></td>
                      <td>{p.league}</td>
                      <td className="num">{p.minutes}</td>
                      <td className="num strong">{parsed.sort ? fmt(value, dec) : value}</td>
                      <td className="num">{p.goals}</td><td className="num">{p.assists}</td><td className="num">{vsiqRating(p)}</td>
                    </tr>
                  ))}
                  {results.length === 0 && <tr><td colSpan="8" className="empty-state">No players match. Try fewer filters or a lower minutes number.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
