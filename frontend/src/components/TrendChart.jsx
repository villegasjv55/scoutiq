import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, COMPARE_COLORS, GRID_STROKE, TOOLTIP_STYLE } from "../utils/metrics";

export default function TrendChart({ career, a, b, aLabel, bLabel, height = 250 }) {
  const data = career.map((p) => ({ season: p.seasonLabel, [a]: p[a], [b]: p[b] }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="season" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 13, color: "#c9d0e6" }} />
          <Line type="monotone" dataKey={a} name={aLabel} stroke={COMPARE_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey={b} name={bLabel} stroke={COMPARE_COLORS[1]} strokeWidth={3} strokeDasharray="6 5" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
