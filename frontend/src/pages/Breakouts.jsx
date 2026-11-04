import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { players, seasonOptions } from "../data/store";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { fmt, signed } from "../utils/metrics";
import { vsiqRating } from "../utils/rating";

const POSITIONS = ["All positions", "Forward", "Midfielder", "Defender"];
const DIRECTIONS = [{ value: "up", label: "Breakouts (biggest rise)" }, { value: "down", label: "Declines (biggest fall)" }];

const rows = (() => {
  const index = new Map(players.map((p) => [`${p.pid}-${p.season}`, p]));
  const out = [];
  players.forEach((p) => {
    const prev = index.get(`${p.pid}-${p.season - 1}`);
    if (prev && p.minutes >= 900 && prev.minutes >= 900) {
      out.push({ now: p, prev, before: vsiqRating(prev), after: vsiqRating(p), delta: vsiqRating(p) - vsiqRating(prev) });
    }
  });
  return out;
})();

export default function Breakouts() {
  const options = seasonOptions.slice(0, -1);
  const [season, setSeason] = useState(String(options[0].value));
  const [position, setPosition] = useState("All positions");
  const [direction, setDirection] = useState("up");

  const list = useMemo(() => {
    const sign = direction === "up" ? -1 : 1;
    return rows
      .filter((r) => r.now.season === Number(season) && (position === "All positions" || r.now.position === position))
      .sort((a, b) => sign * (a.delta - b.delta))
      .slice(0, 15);
  }, [season, position, direction]);

  return (
    <>
      <PageHeader title="Breakout Finder" description="Players whose VSIQ rating jumped (or fell) the most compared with the season before. Only player-seasons with 900+ minutes in both years count, so small samples do not distort the list." />
      <section className="panel">
        <div className="controls">
          <SelectField label="Compare to previous season, ending" value={season} onChange={setSeason} options={options.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="Position" value={position} onChange={setPosition} options={POSITIONS} />
          <SelectField label="Show" value={direction} onChange={setDirection} options={DIRECTIONS} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Player</th><th>Position</th><th className="num">Rating before</th><th className="num">Rating now</th><th className="num">Change</th><th className="num">Goals</th><th className="num">xG</th><th className="num">Assists</th></tr>
            </thead>
            <tbody>
              {list.map(({ now, before, after, delta }) => (
                <tr key={now.key}>
                  <td><Link className="player-cell" to={`/player/${now.pid}?season=${now.season}`}><span><strong>{now.name}</strong><small>{now.club}, {now.seasonLabel}</small></span></Link></td>
                  <td>{now.position}</td>
                  <td className="num">{before}</td>
                  <td className="num strong">{after}</td>
                  <td className={delta >= 0 ? "num up" : "num down"}>{signed(delta, 0)}</td>
                  <td className="num">{now.goals}</td><td className="num">{fmt(now.xG, 1)}</td><td className="num">{now.assists}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="8" className="empty-state">No players meet the minutes rule for this selection.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
