import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { leagueNames, seasonOptions, teams } from "../data/store";
import PageHeader from "../components/PageHeader";
import SelectField from "../components/SelectField";
import { AXIS_TICK, COMPARE_COLORS, GRID_STROKE, TOOLTIP_STYLE, fmt, signed } from "../utils/metrics";

export default function Teams() {
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState(leagueNames[0]);

  const rows = useMemo(
    () => teams.filter((t) => t.season === Number(season) && t.league === league).sort((a, b) => a.rank - b.rank),
    [season, league]
  );

  if (teams.length === 0) {
    return (
      <>
        <PageHeader title="Teams" description="Final league tables with expected goals and expected points." />
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Team tables are not loaded yet</h2>
              <p className="hint">Team histories come from Understat, which was offline when this dataset was built. Run scripts/fetch_understat_direct.py again later, then scripts/build_dataset.py, and this page fills in.</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  const chartData = rows.map((t) => ({ team: t.team, Points: t.points, "Expected points": t.xPts }));

  return (
    <>
      <PageHeader title="Teams" description="Final league tables with expected goals and expected points. The gap between points and expected points shows which teams over- or under-performed their chances." />
      <section className="panel">
        <div className="controls">
          <SelectField label="Season" value={season} onChange={setSeason} options={seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))} />
          <SelectField label="League" value={league} onChange={setLeague} options={leagueNames} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="num">Pos</th><th>Team</th>
                <th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th>
                <th className="num">GF</th><th className="num">GA</th><th className="num">GD</th><th className="num">Pts</th>
                <th className="num">xG</th><th className="num">xGA</th><th className="num">xPts</th><th className="num">Pts vs xPts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const diff = t.points - t.xPts;
                return (
                  <tr key={t.key}>
                    <td className="num">{t.rank}</td>
                    <td><strong>{t.team}</strong></td>
                    <td className="num">{t.played}</td><td className="num">{t.wins}</td><td className="num">{t.draws}</td><td className="num">{t.losses}</td>
                    <td className="num">{t.goals}</td><td className="num">{t.goalsAgainst}</td><td className="num">{signed(t.goalDiff, 0)}</td>
                    <td className="num strong">{t.points}</td>
                    <td className="num">{fmt(t.xG, 1)}</td><td className="num">{fmt(t.xGA, 1)}</td><td className="num">{fmt(t.xPts, 1)}</td>
                    <td className={diff >= 0 ? "num up" : "num down"}>{signed(diff)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Points against expected points</h2>
            <p className="hint">{league}, {seasonOptions.find((s) => String(s.value) === season)?.label}</p>
          </div>
        </div>
        <div className="chart" style={{ height: Math.max(320, rows.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }} barGap={2}>
              <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="team" width={130} tick={{ ...AXIS_TICK, fill: "#dde3f6" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="Points" fill={COMPARE_COLORS[0]} radius={[0, 8, 8, 0]} barSize={11} />
              <Bar dataKey="Expected points" fill={COMPARE_COLORS[1]} radius={[0, 8, 8, 0]} barSize={11} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="legend">
          <li><span className="legend-dot" style={{ background: COMPARE_COLORS[0] }} />Points</li>
          <li><span className="legend-dot" style={{ background: COMPARE_COLORS[1] }} />Expected points</li>
        </ul>
      </section>
    </>
  );
}
