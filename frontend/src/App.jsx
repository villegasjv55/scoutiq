import { useMemo, useState } from "react";
import "./App.css";

const players = [
  { id: 1, name: "Erling Haaland", club: "Manchester City", league: "Premier League", position: "Forward", age: 26, apps: 28, goals: 24, assists: 5, pass: 78, duels: 52 },
  { id: 2, name: "Kylian Mbappé", club: "Real Madrid", league: "La Liga", position: "Forward", age: 27, apps: 27, goals: 22, assists: 7, pass: 84, duels: 48 },
  { id: 3, name: "Jude Bellingham", club: "Real Madrid", league: "La Liga", position: "Midfielder", age: 23, apps: 25, goals: 12, assists: 8, pass: 90, duels: 61 },
  { id: 4, name: "Rodri", club: "Manchester City", league: "Premier League", position: "Midfielder", age: 30, apps: 22, goals: 4, assists: 6, pass: 93, duels: 64 },
  { id: 5, name: "Virgil van Dijk", club: "Liverpool", league: "Premier League", position: "Defender", age: 35, apps: 26, goals: 2, assists: 1, pass: 91, duels: 72 },
  { id: 6, name: "William Saliba", club: "Arsenal", league: "Premier League", position: "Defender", age: 25, apps: 25, goals: 1, assists: 1, pass: 94, duels: 69 },
  { id: 7, name: "Bukayo Saka", club: "Arsenal", league: "Premier League", position: "Forward", age: 25, apps: 24, goals: 10, assists: 9, pass: 86, duels: 55 },
  { id: 8, name: "Pedri", club: "Barcelona", league: "La Liga", position: "Midfielder", age: 23, apps: 23, goals: 5, assists: 7, pass: 92, duels: 58 },
];

function App() {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All positions");
  const [selected, setSelected] = useState([]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch =
        player.name.toLowerCase().includes(search.toLowerCase()) ||
        player.club.toLowerCase().includes(search.toLowerCase());

      const matchesPosition =
        position === "All positions" || player.position === position;

      return matchesSearch && matchesPosition;
    });
  }, [search, position]);

  const selectedPlayers = players.filter((player) =>
    selected.includes(player.id)
  );

  function togglePlayer(id) {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((playerId) => playerId !== id);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, id];
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <h2>SCOUT<span>IQ</span></h2>
            <p>FOOTBALL INTELLIGENCE</p>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          <a className="nav-item active" href="#dashboard">Dashboard</a>
          <a className="nav-item" href="#players">Player database</a>
          <a className="nav-item" href="#comparison">Player comparison</a>
          <a className="nav-item" href="#insights">Scouting insights</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot"></div>
          <div>
            <strong>SCOUTIQ MVP</strong>
            <p>Development environment</p>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">FOOTBALL ANALYTICS PLATFORM</p>
            <h1>Scouting Dashboard</h1>
          </div>
          <div className="topbar-right">
            <span className="live-indicator"></span>
            <span>System online</span>
            <div className="avatar">JV</div>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <p className="eyebrow green-text">YOUR SCOUTING WORKSPACE</p>
            <h2>Discover talent.<br />Understand performance.</h2>
            <p className="welcome-copy">
              Explore player performance, evaluate key metrics, and identify
              potential scouting opportunities.
            </p>
          </div>
          <div className="welcome-decoration">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="orbit-core">SIQ</div>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="PLAYERS TRACKED" value={players.length} detail="Sample database" />
          <StatCard label="GOALS RECORDED" value={players.reduce((sum, p) => sum + p.goals, 0)} detail="Across listed players" />
          <StatCard label="POSITIONS" value="3" detail="Forward · Midfield · Defense" />
          <StatCard label="LEAGUES" value="2" detail="Premier League · La Liga" />
        </section>

        <section className="panel" id="players">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLAYER INTELLIGENCE</p>
              <h2>Player database</h2>
              <p className="muted">Search and filter the current sample dataset.</p>
            </div>
            <span className="record-count">{filteredPlayers.length} PLAYERS</span>
          </div>

          <div className="filters">
            <input
              type="search"
              placeholder="Search player or club..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={position} onChange={(event) => setPosition(event.target.value)}>
              <option>All positions</option>
              <option>Forward</option>
              <option>Midfielder</option>
              <option>Defender</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PLAYER</th>
                  <th>CLUB</th>
                  <th>POSITION</th>
                  <th>AGE</th>
                  <th>GOALS</th>
                  <th>ASSISTS</th>
                  <th>COMPARE</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <div className="player-name">
                        <div className="player-avatar">{player.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                        <strong>{player.name}</strong>
                      </div>
                    </td>
                    <td>{player.club}</td>
                    <td><span className="position-tag">{player.position}</span></td>
                    <td>{player.age}</td>
                    <td className="number-cell">{player.goals}</td>
                    <td className="number-cell">{player.assists}</td>
                    <td>
                      <button
                        className={selected.includes(player.id) ? "select-button selected" : "select-button"}
                        onClick={() => togglePlayer(player.id)}
                        disabled={!selected.includes(player.id) && selected.length >= 2}
                      >
                        {selected.includes(player.id) ? "Selected" : "Add"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr><td colSpan="7" className="empty-state">No players match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="table-note">Sample data for interface development. Not live or verified season statistics.</p>
        </section>

        <section className="panel comparison-panel" id="comparison">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PERFORMANCE ANALYSIS</p>
              <h2>Player comparison</h2>
              <p className="muted">Select up to two players in the database above.</p>
            </div>
            <span className="record-count">{selected.length} / 2 SELECTED</span>
          </div>

          {selectedPlayers.length === 0 ? (
            <div className="comparison-empty">
              <div className="comparison-icon">VS</div>
              <div>
                <strong>Your comparison starts here</strong>
                <p>Choose a player from the database to begin evaluating performance.</p>
              </div>
            </div>
          ) : (
            <div className="comparison-grid">
              {selectedPlayers.map((player) => (
                <div className="comparison-card" key={player.id}>
                  <div className="comparison-player">
                    <div className="player-avatar large">{player.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                    <div>
                      <strong>{player.name}</strong>
                      <p>{player.club} · {player.position}</p>
                    </div>
                  </div>
                  <Metric label="Goals" value={player.goals} max={25} />
                  <Metric label="Assists" value={player.assists} max={12} />
                  <Metric label="Pass accuracy" value={player.pass} max={100} suffix="%" />
                  <Metric label="Duels won" value={player.duels} max={100} suffix="%" />
                  <button className="remove-button" onClick={() => togglePlayer(player.id)}>Remove</button>
                </div>
              ))}
              {selectedPlayers.length === 1 && (
                <div className="comparison-placeholder">
                  Select one more player to compare performance.
                </div>
              )}
            </div>
          )}
        </section>

        <footer>
          SCOUTIQ © 2026 <span>Built for better football decisions.</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Metric({ label, value, max, suffix = "" }) {
  return (
    <div className="metric">
      <div className="metric-label">
        <span>{label}</span>
        <strong>{value}{suffix}</strong>
      </div>
      <div className="metric-track">
        <div className="metric-fill" style={{ width: `${Math.min((value / max) * 100, 100)}%` }}></div>
      </div>
    </div>
  );
}

export default App;