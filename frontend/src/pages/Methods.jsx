import PageHeader from "../components/PageHeader";
import { leagueNames, meta, players, seasonOptions, teams } from "../data/store";

const PIPELINE = [
  { title: "Collect", text: "A Python script downloads player and team season data for three leagues and up to five seasons from Understat (or a public GitHub copy of Understat's player table when the site is offline), pausing between requests, and caches each response as JSON." },
  { title: "Clean", text: "Pandas converts text to numbers, removes duplicates and goalkeepers, standardises positions and joint club names, and drops players under 450 minutes." },
  { title: "Transform", text: "Per-90 rates, goals above expected goals, and percentile ranks against players in the same position and season are calculated." },
  { title: "Store", text: "The clean data is loaded into a normalised SQLite database and exported as JSON for the website." },
  { title: "Present", text: "A React app with Recharts turns the data into searchable tables, radar charts, scatter plots and league tables." },
];

const DICTIONARY = [
  ["pid", "integer", "Understat player identifier. Links a player's seasons together.", "Source"],
  ["season", "integer", "Year the season starts. 2024 means 2024-25.", "Source"],
  ["position", "text", "Main position: Forward, Midfielder or Defender.", "Cleaned from Understat position codes"],
  ["minutes", "integer", "League minutes played.", "Source"],
  ["goals, assists", "integer", "League goals and assists, penalties included.", "Source"],
  ["xG, xA", "decimal", "Expected goals and assists: model estimates of the quality of chances taken and created.", "Source (Understat model)"],
  ["npxG", "decimal", "Expected goals excluding penalties.", "Source"],
  ["shots, keyPasses", "integer", "Shots taken and passes that lead directly to a shot.", "Source"],
  ["xGChain, xGBuildup", "decimal", "xG of every possession the player was part of, and the same without shots and assists.", "Source"],
  ["goals90 and other 90 fields", "decimal", "A total divided by minutes, multiplied by 90, so players with different minutes can be compared.", "Calculated"],
  ["goalsMinusXG", "decimal", "Goals minus xG. Positive means scoring more than the chances suggest.", "Calculated"],
  ["pct", "object", "Percentile rank (0 to 100) for each per-90 measure against players with 900+ minutes in the same position and season, across all three leagues.", "Calculated"],
];

const LIMITS = [
  "Understat has no age, nationality, contract or market value data, so those filters are not available.",
  "Goalkeepers are excluded because Understat has no goalkeeping statistics.",
  "Defenders are described mainly by involvement in attacks. Tackles, interceptions and duels are not in the source.",
  "xG and xA come from a statistical model. They estimate chance quality and are not facts about what happened.",
  "A player who changed club during a season appears once, with both clubs listed.",
  "Percentiles compare players across leagues of different styles and strength, so treat them as a guide, not a ranking of ability.",
];

const SKILLS = [
  ["Relational database design", "Normalised SQLite schema with keys and constraints, plus analytical SQL queries using joins and window functions."],
  ["Data pipeline (ETL)", "Repeatable Python scripts that collect, validate, clean and load data."],
  ["Data quality", "Documented cleaning rules, a minimum-minutes filter and a data dictionary."],
  ["Analytics", "Per-90 normalisation, percentile ranking and expected-versus-actual analysis."],
  ["Web development", "React single-page app with routing, filtering, sorting and interactive charts."],
  ["Documentation and version control", "Data notes, README and a Git history of the project."],
];

export default function Methods() {
  return (
    <>
      <PageHeader title="Methods and data" description="Where the numbers come from, how they are processed, and what they can and cannot tell you." />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>The dataset</h2>
            <p className="hint">
              {players.length.toLocaleString()} player seasons and {teams.length} team seasons from {meta.source}. {leagueNames.join(", ")},
              {" "}{seasonOptions[seasonOptions.length - 1].label} to {seasonOptions[0].label}. Built on {meta.generated}.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>How the data flows</h2></div>
        <ol className="pipeline">
          {PIPELINE.map((step, i) => (
            <li key={step.title}>
              <span className="step-no">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Data dictionary</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Field</th><th>Type</th><th>Meaning</th><th>Origin</th></tr></thead>
            <tbody>
              {DICTIONARY.map(([field, type, meaning, origin]) => (
                <tr key={field}>
                  <td><code>{field}</code></td><td>{type}</td><td className="wrap">{meaning}</td><td className="wrap">{origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Known limitations</h2></div>
          <ul className="plain-list">
            {LIMITS.map((item) => (<li key={item}>{item}</li>))}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Skills this project shows</h2></div>
          <dl className="skill-list">
            {SKILLS.map(([name, text]) => (<div key={name}><dt>{name}</dt><dd>{text}</dd></div>))}
          </dl>
        </section>
      </div>
    </>
  );
}
