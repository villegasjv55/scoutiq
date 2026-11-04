import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { LEAGUE_COLORS, POSITION_COLORS, fmt, signed } from "../utils/metrics";

export default function PlayerTable({ players, selected, onToggle, watch = {}, onWatch })  {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Season</th>
            <th>League</th>
            <th>Position</th>
            <th className="num">Minutes</th>
            <th className="num">Goals</th>
            <th className="num">Assists</th>
            <th className="num">xG</th>
            <th className="num">xA</th>
            <th className="num">Goals vs xG</th>
            <th aria-label="Compare" />
            <th aria-label="Watch" />
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const isSelected = selected.includes(p.key);
            return (
              <tr key={p.key}>
                <td>
                  <Link className="player-cell" to={`/player/${p.pid}?season=${p.season}`}>
                    <Avatar name={p.name} club={p.club} color={LEAGUE_COLORS[p.league]} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.club}</small>
                    </span>
                  </Link>
                </td>
                <td>{p.seasonLabel}</td>
                <td>
                  <span className="league-tag">
                    <i style={{ background: LEAGUE_COLORS[p.league] }} />
                    {p.league}
                  </span>
                </td>
                <td>
                  <span className="pos-tag" style={{ "--tone": POSITION_COLORS[p.position] }}>{p.position}</span>
                </td>
                <td className="num">{p.minutes}</td>
                <td className="num strong">{p.goals}</td>
                <td className="num strong">{p.assists}</td>
                <td className="num">{fmt(p.xG, 1)}</td>
                <td className="num">{fmt(p.xA, 1)}</td>
                <td className={p.goalsMinusXG >= 0 ? "num up" : "num down"}>{signed(p.goalsMinusXG)}</td>
                <td className="num">
                  <button
                    className={isSelected ? "chip-btn on" : "chip-btn"}
                    onClick={() => onToggle(p.key)}
                    disabled={!isSelected && selected.length >= 4}
                  >
                    {isSelected ? "Added" : "Compare"}
                  </button>
                </td>
                <td className="num">
                  {onWatch && (
                    <button
                      className={watch[p.key] ? "star on" : "star"}
                      onClick={() => onWatch(p.key)}
                      aria-label={watch[p.key] ? "Remove from watchlist" : "Add to watchlist"}
                      title={watch[p.key] ? "On your watchlist" : "Add to watchlist"}
                    >
                      {watch[p.key] ? "★" : "☆"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {players.length === 0 && (
            <tr>
              <td colSpan="12" className="empty-state">
                No players match these filters. Lower the minutes filter or clear the search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
