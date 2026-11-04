# Talking about this project

## The 30-second version
"I built a football scouting site. It takes four seasons of player data from the Premier League, La Liga and Serie A, cleans it with Python, stores it in a SQL database, and shows it in a React app where you can compare players, find similar ones and see play styles. I added a match section with shot maps, heatmaps and a 3D pitch from real World Cup data. I tested the forecast model against a simple baseline and it came out about 11 to 20 percent better."

## Where each Information Systems topic shows up
| Topic | Where |
|---|---|
| Database design and normalisation | `scripts/build_database.py`: five tables, primary and foreign keys, CHECK rules |
| SQL | `sql/queries.sql`: joins, a window function, GROUP BY, HAVING |
| Data cleaning and quality | `scripts/build_dataset.py`, `data/DATA_NOTES.md` |
| Data pipelines (ETL) | The scripts folder, run in order |
| Web architecture | React front end, FastAPI service, files-as-data hosting |
| Testing and automation | Vitest, pytest, GitHub Actions |
| Documenting limits honestly | The README and `data/DATA_NOTES.md` |

## Resume bullets (only use ones that are true when you apply)
- Built a football analytics web app (React, Python, SQLite) covering 4,600 player-seasons from three leagues.
- Designed a normalised database with foreign keys and constraints, and wrote SQL with joins and window functions.
- Wrote a Python pipeline that cleans the data, resolves each player's position and calculates per-90 stats and percentiles.
- Grouped players into play styles with k-means and PCA, written in NumPy, and reported silhouette scores.
- Trained and tested a ridge regression forecast that beat a "same as last season" baseline by 11% (goals) and 20% (assists) on unseen data.
- Built interactive shot maps, passing networks, heatmaps and a 3D pitch from open event data.
- Added a read-only REST API with input checks, tests and automatic documentation.
- Set up automated tests and a build check on every push with GitHub Actions.

## Questions you might get

**Why per 90 and percentiles?**
Totals reward playing time. Per 90 fixes that. Percentiles within a position stop a defender being compared to a striker.

**Why only players with 900+ minutes in the percentile pool?**
Someone who scored in his only 60 minutes has a huge per-90 number that means nothing. A bigger minimum gives steadier rankings. Players under 450 minutes are dropped from the site completely.

**What is xG and why use it?**
Expected goals gives each shot a probability of going in. Comparing goals with xG shows who finished better or worse than the chances they got. It helps separate luck from skill, though it's an estimate.

**How do you know the forecast works?**
I trained it on older seasons and tested it on the newest pair of seasons, which it never saw. Its average error was lower than the naive guess. I'd still call it a starting point, since it can't see injuries or transfers.

**Your clusters score only 0.22 to 0.27 on silhouette. Is that bad?**
It's modest. It means the styles overlap, which is true of real players. I show the score on the Styles page so nobody has to guess how strong the grouping is.

**Why not use a machine learning library?**
For k-means, PCA and ridge regression, NumPy is enough, and writing them made me understand each step. In a bigger project I'd use scikit-learn.

**Is the assistant AI?**
No. It reads keywords and turns them into filters. It says so when you ask something it can't answer.

**What went wrong along the way?**
- Understat's site was down, so I switched to a public copy of the data.
- Position data was alphabetical, so the first letter gave wrong positions. I fixed it by using each player's most common single position.
- Names came through with HTML codes in them. I decoded them.
- A style field name collided with a React/Recharts property and crashed a page. I renamed it.

**What are the limits?**
No goalkeepers, ages, values or team tables in the player data. Match Lab is separate and covers 16 games. Everything is listed in the README.

**What would you do next?**
Get team data, add ages and values from another source, connect the site to the API, and link match data to the players.

## Demo order (3 minutes)
1. Home page, then Players: search a name.
2. Open a player: percentile bars, card, similar players.
3. Compare Lab with four players, then copy the link.
4. Play Styles, then the 3D Lab (pick your own three axes).
5. Match Lab: shot map, click a shot for the replay, then the 3D heat towers.
6. Forecast: show the test results.
7. Data Health page: show the database diagram.
