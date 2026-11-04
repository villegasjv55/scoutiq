import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { leagueNames, players, seasonOptions } from "../data/store";
import PageHeader from "../components/PageHeader";
import Pitch from "../components/Pitch";
import SelectField from "../components/SelectField";
import { fmt } from "../utils/metrics";
import { vsiqRating } from "../utils/rating";

const FORMATIONS = { "4-3-3": [4, 3, 3], "4-4-2": [4, 4, 2], "3-5-2": [3, 5, 2], "4-5-1": [4, 5, 1], "3-4-3": [3, 4, 3], "5-3-2": [5, 3, 2] };
const RANKINGS = [
  { value: "rating", label: "VSIQ rating" },
  { value: "ga", label: "Goals plus assists" },
  { value: "xgxa", label: "xG plus xA" },
];
const MINUTES = [{ value: "900", label: "900+ minutes" }, { value: "1800", label: "1,800+ minutes" }, { value: "2400", label: "2,400+ minutes" }];

const score = (p, mode) => (mode === "rating" ? vsiqRating(p) : mode === "ga" ? p.goals + p.assists : p.xG + p.xA);
const show = (p, mode) => (mode === "rating" ? String(vsiqRating(p)) : mode === "ga" ? `${p.goals + p.assists} G+A` : `${fmt(p.xG + p.xA, 1)} xGA`);

export default function TeamOfSeason() {
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState("All leagues");
  const [formation, setFormation] = useState("4-3-3");
  const [mode, setMode] = useState("rating");
  const [minutes, setMinutes] = useState("1800");

  const team = useMemo(() => {
    const [d, m, f] = FORMATIONS[formation];
    const pool = players.filter((p) => p.season === Number(season) && p.minutes >= Number(minutes) && (league === "All leagues" || p.league === league));
    const pick = (position, count) => {
      const seen = new Set();
      return pool
        .filter((p) => p.position === position)
        .sort((a, b) => score(b, mode) - score(a, mode))
        .filter((p) => (seen.has(p.pid) ? false : seen.add(p.pid)))
        .slice(0, count)
        .map((p) => ({ player: p, label: show(p, mode) }));
    };
    return { Defender: pick("Defender", d), Midfielder: pick("Midfielder", m), Forward: pick("Forward", f) };
  }, [season, league, formation, mode, minutes]);

  const all = [...team.Forward, ...team.Midfielder, ...team.Defender];
  const avg = all.length ? Math.round(all.reduce((s, e) => s + vsiqRating(e.player), 0) / all.length) : 0;
  const clubs = new Set(all.map((e) => e.player.club)).size;

  return (
    <>
      <PageHeader title="Team of the Season" description="The best eleven the data can build for any season and league. Understat has no goalkeeper statistics, so the goalkeeper spot stays empty and you choose the outfield formation." />
      <section className="panel">
        <div className="controls">
          <SelectField label="Season" value={season} onChange={setSeason} options={seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", ...leagueNames]} />
          <SelectField label="Formation" value={formation} onChange={setFormation} options={Object.keys(FORMATIONS)} />
          <SelectField label="Rank players by" value={mode} onChange={setMode} options={RANKINGS} />
          <SelectField label="Minutes" value={minutes} onChange={setMinutes} options={MINUTES} />
        </div>
        <p className="result-count">Average VSIQ rating {avg}. {clubs} different {clubs === 1 ? "club" : "clubs"} represented. The data groups players as forwards, midfielders and defenders only, so players are placed along their line, not by left or right.</p>
        <div className="two-col wide-left">
          <div className="pitch-wrap"><Pitch rows={team} /></div>
          <div>
            <table className="data-table">
              <thead><tr><th>Player</th><th>Line</th><th className="num">Value</th></tr></thead>
              <tbody>
                {[["Forward", team.Forward], ["Midfielder", team.Midfielder], ["Defender", team.Defender]].flatMap(([pos, list]) =>
                  list.map(({ player: p, label }) => (
                    <tr key={p.key}>
                      <td><Link className="text-link" to={`/player/${p.pid}?season=${p.season}`}>{p.name}</Link><small className="sub">{p.club}</small></td>
                      <td>{pos}</td>
                      <td className="num strong">{label}</td>
                    </tr>
                  )))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
