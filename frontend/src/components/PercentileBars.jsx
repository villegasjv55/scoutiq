import { RADAR_METRICS, fmt, ordinal, pctColor } from "../utils/metrics";

export default function PercentileBars({ player }) {
  return (
    <div className="pct-list">
      {RADAR_METRICS.map((metric) => {
        const pct = player.pct?.[metric.key] ?? 0;
        return (
          <div className="pct-row" key={metric.key}>
            <span className="pct-label">{metric.label}</span>
            <div className="pct-track">
              <div className="pct-fill" style={{ width: `${Math.max(pct, 3)}%`, background: pctColor(pct) }} />
            </div>
            <span className="pct-value">{fmt(player[metric.key], 2)}</span>
            <span className="pct-badge" style={{ color: pctColor(pct) }}>{ordinal(pct)}</span>
          </div>
        );
      })}
    </div>
  );
}
