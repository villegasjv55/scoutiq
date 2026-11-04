import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { players } from "../data/store";
import Avatar from "../components/Avatar";
import PageHeader from "../components/PageHeader";
import { LEAGUE_COLORS } from "../utils/metrics";
import { vsiqRating } from "../utils/rating";

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const POOL = players.filter((p) => p.minutes >= 1800);
const NAMES = (() => { const m = new Map(); players.forEach((p) => m.set(p.pid, p)); return [...m.values()].map((p) => ({ pid: p.pid, name: p.name, search: norm(p.name) })); })();

function load() {
  try { return JSON.parse(localStorage.getItem("vsiq-guess") || "{}"); } catch { return {}; }
}
const pickRandom = () => POOL[Math.floor(Math.random() * POOL.length)];

function cluesFor(p) {
  const parts = p.name.split(" ");
  return [
    { title: "Role", text: `${p.position} in the ${p.league}.` },
    { title: "Season", text: `Played ${p.minutes.toLocaleString()} minutes in ${p.seasonLabel}.` },
    { title: "Output", text: `${p.goals} goals and ${p.assists} assists.` },
    { title: "Profile", text: `VSIQ rating ${vsiqRating(p)}${p.playStyle ? `, play style: ${p.playStyle}` : ""}.` },
    { title: "Name shape", text: parts.map((w) => "_".repeat(w.length)).join("   ") },
    { title: "Club", text: p.club },
  ];
}

export default function Guess() {
  const [target, setTarget] = useState(pickRandom);
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(null); // "won" | "lost"
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState(() => ({ streak: 0, best: 0, score: 0, ...load() }));

  const clues = useMemo(() => cluesFor(target), [target]);
  const shown = done ? clues.length : Math.min(wrong.length + 1, clues.length);
  const points = Math.max(clues.length - wrong.length, 1) * 10;

  const suggestions = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    return NAMES.filter((n) => n.search.includes(q) && !wrong.some((w) => w.pid === n.pid)).slice(0, 6);
  }, [query, wrong]);

  function save(next) { setStats(next); try { localStorage.setItem("vsiq-guess", JSON.stringify(next)); } catch { /* ignore */ } }

  function guess(n) {
    setQuery("");
    if (n.pid === target.pid) {
      const streak = stats.streak + 1;
      setDone("won");
      save({ streak, best: Math.max(stats.best, streak), score: stats.score + points });
    } else {
      const next = [...wrong, n];
      setWrong(next);
      if (next.length >= clues.length) { setDone("lost"); save({ ...stats, streak: 0 }); }
    }
  }
  function giveUp() { setDone("lost"); save({ ...stats, streak: 0 }); }
  function again() { setTarget(pickRandom()); setWrong([]); setDone(null); setQuery(""); }

  return (
    <>
      <PageHeader title="Guess the player" description="One mystery player from the last four seasons. Every wrong guess unlocks a new clue. Fewer clues used means more points." />
      <section className="panel guess-panel">
        <div className="guess-score">
          <div><strong>{stats.score}</strong><span>points</span></div>
          <div><strong>{stats.streak}</strong><span>streak</span></div>
          <div><strong>{stats.best}</strong><span>best streak</span></div>
        </div>
        <div className="guess-stage">
          <div className={`guess-face ${done ? "revealed" : ""}`}>
            <Avatar name={target.name} club={target.club} size={132} color={done === "won" ? "#5ef2c9" : done === "lost" ? "#ff6b9d" : "#6f7899"} />
            {!done && <b className="guess-q">?</b>}
          </div>
          <ol className="clues">
            {clues.slice(0, shown).map((c, i) => (
              <li key={c.title} className={i === shown - 1 && !done ? "new" : ""}><span>{c.title}</span><strong>{c.text}</strong></li>
            ))}
            {!done && Array.from({ length: clues.length - shown }).map((_, i) => <li key={i} className="locked"><span>Locked</span><strong>Wrong guesses unlock more clues</strong></li>)}
          </ol>
        </div>
        {done ? (
          <div className={`guess-result ${done}`}>
            <h2>{done === "won" ? `Correct! +${points} points` : "Not this time"}</h2>
            <p>It was <Link className="text-link" to={`/player/${target.pid}?season=${target.season}`}>{target.name}</Link> of {target.club} in {target.seasonLabel}.</p>
            <button className="btn" onClick={again} autoFocus>Next player</button>
          </div>
        ) : (
          <div className="guess-input">
            <input type="search" placeholder="Type a player name" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Your guess" />
            {suggestions.length > 0 && (
              <ul className="guess-suggest">{suggestions.map((n) => <li key={n.pid}><button onClick={() => guess(n)}>{n.name}</button></li>)}</ul>
            )}
            <div className="guess-foot">
              {wrong.length > 0 && <span>Wrong so far: {wrong.map((w) => w.name).join(", ")}</span>}
              <button className="chip-btn" onClick={giveUp}>Give up</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
