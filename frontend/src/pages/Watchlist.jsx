import { useNavigate, Link } from "react-router-dom";
import { playerByKey } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import { LEAGUE_COLORS, fmt } from "../utils/metrics";

const TAGS = ["Target", "Monitor", "Backup"];

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function Watchlist({ selected, onToggle, watch, onWatch, onUpdate }) {
  const navigate = useNavigate();
  const rows = Object.entries(watch)
    .map(([key, info]) => ({ player: playerByKey.get(key), info, key }))
    .filter((r) => r.player)
    .sort((a, b) => a.info.added.localeCompare(b.info.added));

  function exportCsv() {
    const header = ["Player", "Club", "League", "Season", "Position", "Minutes", "Goals", "Assists", "xG", "xA", "Tag", "Note", "Added"];
    const lines = rows.map(({ player: p, info }) => [p.name, p.club, p.league, p.seasonLabel, p.position, p.minutes, p.goals, p.assists, fmt(p.xG, 1), fmt(p.xA, 1), info.tag, info.note, info.added].map(csvCell).join(","));
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vsiq-watchlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function compareFirstFour() {
    rows.slice(0, 4).forEach(({ player }) => {
      if (!selected.includes(player.key)) onToggle(player.key);
    });
    navigate("/compare");
  }

  return (
    <>
      <PageHeader title="Watchlist" description="Your shortlist of targets. Tag each player, keep notes, export to a spreadsheet or send the first four to the Compare Lab. Saved in this browser." />
      {rows.length === 0 ? (
        <section className="panel empty-panel">
          <h2>Nothing on your watchlist yet</h2>
          <p className="hint">Press the star in the <Link className="text-link" to="/players">Players</Link> table, or use the Watch button on any profile.</p>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{rows.length} {rows.length === 1 ? "player" : "players"} watched</h2>
              <p className="hint">Notes save as you type.</p>
            </div>
            <div className="head-actions">
              <button className="chip-btn" onClick={compareFirstFour}>Compare first 4</button>
              <button className="chip-btn" onClick={exportCsv}>Export CSV</button>
            </div>
          </div>
          <ul className="watch-list">
            {rows.map(({ player: p, info, key }) => (
              <li key={key} className="watch-card">
                <Link className="player-cell" to={`/player/${p.pid}?season=${p.season}`}>
                  <Avatar name={p.name} club={p.club} color={LEAGUE_COLORS[p.league]} />
                  <span><strong>{p.name}</strong><small>{p.club}, {p.league}, {p.seasonLabel}</small></span>
                </Link>
                <div className="watch-stats">
                  <span><strong>{p.goals}</strong> goals</span>
                  <span><strong>{p.assists}</strong> assists</span>
                  <span><strong>{fmt(p.xG, 1)}</strong> xG</span>
                </div>
                <div className="tag-row" role="group" aria-label="Tag">
                  {TAGS.map((tag) => (
                    <button key={tag} className={info.tag === tag ? `chip-btn on tag-${tag.toLowerCase()}` : "chip-btn"} onClick={() => onUpdate(key, { tag })}>{tag}</button>
                  ))}
                </div>
                <input className="note-input" type="text" placeholder="Scouting note" value={info.note} onChange={(e) => onUpdate(key, { note: e.target.value })} />
                <div className="watch-actions">
                  <Link className="chip-btn" to={`/report/${p.pid}?season=${p.season}`}>Report</Link>
                  <button className="chip-btn" onClick={() => onWatch(key)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
