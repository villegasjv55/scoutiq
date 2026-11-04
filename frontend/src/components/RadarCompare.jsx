import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { COMPARE_COLORS, RADAR_METRICS, TOOLTIP_STYLE, ordinal } from "../utils/metrics";

export default function RadarCompare({ players, height = 380 }) {
  const data = RADAR_METRICS.map((metric) => {
    const row = { metric: metric.label };
    players.forEach((p, i) => {
      row[`p${i}`] = p.pct?.[metric.key] ?? 0;
    });
    return row;
  });

  return (
    <div>
      <div className="radar" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#2b3150" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#c9d0e6", fontSize: 13 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {players.map((p, i) => (
              <Radar
                key={p.key}
                name={p.name}
                dataKey={`p${i}`}
                stroke={COMPARE_COLORS[i]}
                fill={COMPARE_COLORS[i]}
                fillOpacity={0.2}
                strokeWidth={2.5}
              />
            ))}
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [`${ordinal(value)} percentile`, name]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ul className="legend">
        {players.map((p, i) => (
          <li key={p.key}>
            <span className="legend-dot" style={{ background: COMPARE_COLORS[i] }} />
            {p.name}, {p.seasonLabel}
          </li>
        ))}
      </ul>
    </div>
  );
}
