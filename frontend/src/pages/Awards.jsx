import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { leagueNames, players, seasonOptions } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import Tilt from "../components/Tilt";
import { LEAGUE_COLORS, fmt } from "../utils/metrics";
import { vsiqRating } from "../utils/rating";

const AWARDS = [
  { id: "boot", title: "Golden Boot", blurb: "Most goals", min: 450, score: (p) => p.goals, show: (p) => `${p.goals} goals` },
  { id: "playmaker", title: "Playmaker", blurb: "Most assists", min: 450, score: (p) => p.assists, show: (p) => `${p.assists} assists` },
  { id: "finisher", title: "Clinical finisher", blurb: "Most goals above expected (1,500+ min)", min: 1500, score: (p) => p.goalsMinusXG, show: (p) => `${p.goalsMinusXG > 0 ? "+" : ""}${fmt(p.goalsMinusXG, 1)} vs xG` },
  { id: "creator", title: "Chance creator", blurb: "Most key passes per 90 (1,800+ min)", min: 1800, score: (p) => p.keyPasses90, show: (p) => `${fmt(p.keyPasses90, 2)} per 90` },
  { id: "engine", title: "Engine room", blurb: "Most build-up involvement per 90 (1,800+ min)", min: 1800, score: (p) => p.xGBuildup90, show: (p) => `${fmt(p.xGBuildup90, 2)} xGBuildup/90` },
  { id: "poty", title: "Player of the season", blurb: "Highest VSIQ rating (1,800+ min)", min: 1800, score: (p) => vsiqRating(p) + (p.goals + p.assists) / 1000, show: (p) => `VSIQ ${vsiqRating(p)}` },
];

export default function Awards() {
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState("All leagues");

  const results = useMemo(() => {
    const pool = players.filter((p) => p.season === Number(season) && (league === "All leagues" || p.league === league));
    return AWARDS.map((a) => ({ ...a, top: pool.filter((p) => p.minutes >= a.min).sort((x, y) => a.score(y) - a.score(x)).slice(0, 4) }));
  }, [season, league]);

  return (
    <>
      <PageHeader title="Season awards" description="Six trophies decided entirely by the numbers. Change the season or league to see who would have won." />
      <section className="panel">
        <div className="controls">
          <SelectField label="Season" value={season} onChange={setSeason} options={seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="League" value={league} onChange={setLeague} options={["All leagues", ...leagueNames]} />
        </div>
        <div className="awards-grid">
          {results.map((a) => {
            const [win, ...rest] = a.top;
            if (!win) return null;
            return (
              <Tilt key={a.id}>
                <article className="award">
                  <header><span className="award-cup" aria-hidden="true">🏆</span><div><h2>{a.title}</h2><small>{a.blurb}</small></div></header>
                  <Link to={`/player/${win.pid}?season=${win.season}`} className="award-win">
                    <Avatar name={win.name} club={win.club} size={84} color={LEAGUE_COLORS[win.league]} />
                    <span><strong>{win.name}</strong><small>{win.club}</small><b>{a.show(win)}</b></span>
                  </Link>
                  <ol>{rest.map((p) => <li key={p.key}><Link to={`/player/${p.pid}?season=${p.season}`} className="text-link">{p.name}</Link><span>{a.show(p)}</span></li>)}</ol>
                </article>
              </Tilt>
            );
          })}
        </div>
      </section>
    </>
  );
}
