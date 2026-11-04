# ScoutIQ: portfolio notes (Information Systems)

## One-sentence pitch
ScoutIQ is a football analytics web app built on a normalised SQL database and a Python data
pipeline: five seasons of Premier League, La Liga and Serie A data, explored through search,
percentile profiles, player comparison and expected-goals analysis.

## Information Systems concepts this project covers
| Concept from the degree | Where it appears in ScoutIQ |
|---|---|
| Relational database design, normalisation | `scripts/build_database.py`: leagues, clubs, players, player_seasons, team_seasons with primary keys, foreign keys and CHECK constraints |
| SQL (joins, aggregation, window functions) | `sql/queries.sql` |
| Data modelling and a data dictionary | Methods page in the app, `data/DATA_NOTES.md` |
| ETL and data quality | `scripts/fetch_understat.py`, `scripts/build_dataset.py` |
| Systems analysis: requirements, users, limits | Project guide, known limitations on the Methods page |
| Web application architecture | React front end now; FastAPI service and hosted database in the next phases |
| Documentation and version control | README, Git history |

## Resume bullets (use the ones that are true when you apply)
- Designed a normalised SQLite database (5 tables, foreign keys, constraints) holding 4,000+ player-season records across 3 leagues and 5 seasons, and wrote analytical SQL using joins and window functions.
- Built a Python/Pandas pipeline that collects, cleans and validates data from a public source, calculates per-90 rates and position-based percentile ranks, and loads the results into the database.
- Developed a React dashboard with search, filtering, player profiles, two-player comparison, radar charts and an interactive scatter plot, using Recharts.
- Documented the data dictionary, cleaning rules and limitations so the numbers can be audited.
- (After Phase 4) Exposed the data through a FastAPI REST API with automatic documentation and automated tests.
- (After deployment) Deployed the application publicly with a live demo link.

## Interview talking points
1. Why a normalised schema: players, clubs and leagues are stored once and referenced by key, so a club rename is one update, and a foreign key check catches bad rows.
2. Why per-90 and percentiles: raw totals favour players who play more minutes; ranking within position and season makes comparisons fair.
3. A data-quality decision: players under 450 minutes are excluded and percentiles use a 900-minute reference pool, because small samples produce extreme values.
4. A limitation you found: the source has no tackles or goalkeeper data, so defenders are described by attacking involvement and goalkeepers are left out. Say what you would add next.
5. What you would do with more time: FastAPI service, PostgreSQL, tests, scheduled data refresh.

## README outline
1. What it is (pitch above) and a screenshot
2. Features
3. Architecture diagram: Understat, Python scripts, SQLite and JSON, React
4. How to run it (fetch, build dataset, build database, npm run dev)
5. Data source, season range, limitations (link to data/DATA_NOTES.md)
6. Credit to Understat
