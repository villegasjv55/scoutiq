import { Link, useParams, useSearchParams } from "react-router-dom";
import { careerOf } from "../data/store";
import Avatar from "../components/Avatar";
import PercentileBars from "../components/PercentileBars";
import PlayerCard from "../components/PlayerCard";
import RadarCompare from "../components/RadarCompare";
import SelectField from "../components/SelectField";
import SimilarPlayers from "../components/SimilarPlayers";
import TrendChart from "../components/TrendChart";
import { LEAGUE_COLORS, POSITION_COLORS, fmt, signed } from "../utils/metrics";

export default function PlayerProfile({ selected, onToggle, watch, onWatch }) {
  const { pid } = useParams();
  const [params, setParams] = useSearchParams();
  const career = careerOf(Number(pid));

  if (career.length === 0) {
    return (
      <section className="panel">
        <h2>Player not found</h2>
        <p className="hint">This player is not in the dataset. <Link className="text-link" to="/players">Back to players</Link></p>
      </section>
    );
  }

  const wanted = Number(params.get("season"));
  const current = career.find((p) => p.season === wanted) ?? career[career.length - 1];
  const isSelected = selected.includes(current.key);
  const diff = current.goalsMinusXG;

  return (
    <>
      <section className="profile-head">
        <Avatar name={current.name} club={current.club} large color={LEAGUE_COLORS[current.league]} />
        <div className="profile-title">
          <h1>{current.name}</h1>
          <p>
            {current.club}, {current.league}
            <span className="pos-tag" style={{ "--tone": POSITION_COLORS[current.position] }}>{current.position}</span>
            {current.playStyle && <span className="style-tag">{current.playStyle}</span>}
          </p>
        </div>
        <div className="profile-actions">
          <SelectField label="Season" value={String(current.season)} onChange={(v) => setParams({ season: v })} options={career.map((p) => ({ value: String(p.season), label: p.seasonLabel }))} />
          <button className={isSelected ? "btn ghost" : "btn"} onClick={() => onToggle(current.key)} disabled={!isSelected && selected.length >= 4}>
            {isSelected ? "Remove from comparison" : "Add to comparison"}
          </button>
          <button className={watch[current.key] ? "btn ghost watching" : "btn ghost"} onClick={() => onWatch(current.key)}>
            {watch[current.key] ? "★ On watchlist" : "☆ Watch"}
          </button>
          <Link className="btn ghost" to={`/report/${current.pid}?season=${current.season}`}>Scouting report</Link>
        </div>
      </section>

      <section className="stat-strip" aria-label="Season totals">
        <div><strong>{current.games}</strong><span>appearances</span></div>
        <div><strong>{current.minutes.toLocaleString()}</strong><span>minutes</span></div>
        <div><strong>{current.goals}</strong><span>goals, {fmt(current.xG, 1)} expected ({signed(diff)})</span></div>
        <div><strong>{current.assists}</strong><span>assists, {fmt(current.xA, 1)} expected</span></div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Percentile profile</h2>
              <p className="hint">
                Rank among {current.position.toLowerCase()}s with 900+ minutes in {current.seasonLabel}, across the three leagues.
              </p>
            </div>
          </div>
          <RadarCompare players={[current]} height={340} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Per 90 minutes</h2>
              <p className="hint">Value per 90 minutes and its percentile. A higher percentile is better.</p>
            </div>
          </div>
          <PercentileBars player={current} />
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Goals against expected goals</h2>
              <p className="hint">Above the dashed line means finishing better than the chances suggest.</p>
            </div>
          </div>
          <TrendChart career={career} a="goals" b="xG" aLabel="Goals" bLabel="xG" />
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Assists against expected assists</h2>
              <p className="hint">Expected assists measure the quality of the chances a player creates.</p>
            </div>
          </div>
          <TrendChart career={career} a="assists" b="xA" aLabel="Assists" bLabel="xA" />
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Career in the dataset</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Season</th><th>Club</th><th>League</th>
                <th className="num">Minutes</th><th className="num">Goals</th><th className="num">xG</th>
                <th className="num">Assists</th><th className="num">xA</th><th className="num">Key passes</th>
              </tr>
            </thead>
            <tbody>
              {career.map((p) => (
                <tr key={p.key} className={p.season === current.season ? "current-row" : ""}>
                  <td><Link className="text-link" to={`/player/${p.pid}?season=${p.season}`}>{p.seasonLabel}</Link></td>
                  <td>{p.club}</td><td>{p.league}</td>
                  <td className="num">{p.minutes}</td><td className="num strong">{p.goals}</td><td className="num">{fmt(p.xG, 1)}</td>
                  <td className="num strong">{p.assists}</td><td className="num">{fmt(p.xA, 1)}</td><td className="num">{p.keyPasses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Player card</h2>
            <p className="hint">A shareable card for {current.seasonLabel}. The big number is the VSIQ rating, the average of eight percentiles. The six small numbers are percentiles for goals, assists, xG, xA, shots and build-up. Colour tier: lime 85+, gold 70+, silver 55+, bronze below.</p>
          </div>
        </div>
        <PlayerCard player={current} />
      </section>

      <SimilarPlayers player={current} selected={selected} onToggle={onToggle} />
    </>
  );
}
