import { Link, useParams, useSearchParams } from "react-router-dom";
import { careerOf } from "../data/store";
import { similarTo } from "../components/SimilarPlayers";
import PercentileBars from "../components/PercentileBars";
import RadarCompare from "../components/RadarCompare";
import { RADAR_METRICS, fmt, ordinal, signed } from "../utils/metrics";

export default function Report({ watch }) {
  const { pid } = useParams();
  const [params] = useSearchParams();
  const career = careerOf(Number(pid));
  if (career.length === 0) {
    return (
      <section className="panel">
        <h2>Player not found</h2>
        <p className="hint"><Link className="text-link" to="/players">Back to players</Link></p>
      </section>
    );
  }

  const wanted = Number(params.get("season"));
  const p = career.find((c) => c.season === wanted) ?? career[career.length - 1];
  const ranked = RADAR_METRICS.map((m) => ({ label: m.label, pct: p.pct?.[m.key] ?? 0 })).sort((a, b) => b.pct - a.pct);
  const strengths = ranked.slice(0, 3);
  const gaps = ranked.slice(-3).reverse();
  const rating = Math.round(ranked.reduce((sum, r) => sum + r.pct, 0) / ranked.length);
  const similar = similarTo(p, 3);
  const note = watch[p.key];
  const diff = p.goalsMinusXG;
  const list = (items) => items.map((r) => `${r.label} (${ordinal(r.pct)})`).join(", ");
  const finishing = Math.abs(diff) < 1 ? "in line with" : diff > 0 ? "above" : "below";

  return (
    <article className="report">
      <div className="report-bar no-print">
        <Link className="chip-btn" to={`/player/${p.pid}?season=${p.season}`}>Back to profile</Link>
        <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
      </div>

      <header className="report-head">
        <div>
          <span className="eyebrow">Villegas Scout IQ · Scouting report</span>
          <h1>{p.name}</h1>
          <p>{p.club}, {p.league} · {p.position} · {p.seasonLabel}</p>
        </div>
        <div className="rating">
          <strong>{rating}</strong>
          <span>VSIQ rating</span>
        </div>
      </header>

      <section className="report-kpis">
        <div><strong>{p.games}</strong><span>appearances</span></div>
        <div><strong>{p.minutes.toLocaleString()}</strong><span>minutes</span></div>
        <div><strong>{p.goals}</strong><span>goals ({fmt(p.xG, 1)} xG)</span></div>
        <div><strong>{p.assists}</strong><span>assists ({fmt(p.xA, 1)} xA)</span></div>
      </section>

      <section className="report-block">
        <h2>Summary</h2>
        <p>
          {p.name} ranks highest among {p.position.toLowerCase()}s in {p.seasonLabel} for {list(strengths)}.
          The biggest gaps against the position are {list(gaps)}. Finishing was {finishing} expectation
          ({p.goals} goals from {fmt(p.xG, 1)} xG, {signed(diff)}).
        </p>
        {note && (note.note || note.tag) && <p className="report-note"><strong>Scout note ({note.tag}):</strong> {note.note || "No note written."}</p>}
      </section>

      <div className="report-cols">
        <section className="report-block">
          <h2>Percentile radar</h2>
          <RadarCompare players={[p]} height={300} />
        </section>
        <section className="report-block">
          <h2>Per 90 minutes</h2>
          <PercentileBars player={p} />
        </section>
      </div>

      <section className="report-block">
        <h2>Most similar profiles</h2>
        <ol className="report-sim">
          {similar.map(({ p: s, score }) => (
            <li key={s.key}><strong>{s.name}</strong> · {s.club}, {s.seasonLabel} · {score}% match</li>
          ))}
        </ol>
      </section>

      <section className="report-block">
        <h2>Career in the dataset</h2>
        <table className="report-table">
          <thead>
            <tr><th>Season</th><th>Club</th><th>Min</th><th>Goals</th><th>xG</th><th>Ast</th><th>xA</th></tr>
          </thead>
          <tbody>
            {career.map((c) => (
              <tr key={c.key}><td>{c.seasonLabel}</td><td>{c.club}</td><td>{c.minutes}</td><td>{c.goals}</td><td>{fmt(c.xG, 1)}</td><td>{c.assists}</td><td>{fmt(c.xA, 1)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="report-foot">
        VSIQ rating is the plain average of the eight percentile measures, with equal weights. Percentiles compare against {p.position.toLowerCase()}s with 900+ minutes
        in the same season across the Premier League, La Liga and Serie A. Source: Understat. Generated {new Date().toLocaleDateString()}.
      </footer>
    </article>
  );
}
