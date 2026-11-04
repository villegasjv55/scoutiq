# How Villegas Scout IQ works

This is the long version. It goes from the raw numbers to what you see in the browser, and says why I made each choice. Read it top to bottom once and you can explain the whole project.

## 1. The idea

Scouts want to answer questions like "who plays like this player but costs less?" or "who is quietly having a great season?". Raw goals and assists are a poor way to answer that. A striker who plays every minute will beat a striker who plays half the games, and a lucky season looks the same as a skilled one.

So the project does three things to the data:

1. Puts everything on a per-90-minutes basis, so playing time doesn't decide the winner.
2. Ranks each player against others in the same position, so a midfielder isn't judged against strikers.
3. Uses expected goals (xG) next to real goals, so luck and skill can be told apart a little better.

## 2. The data

### Player data (Understat)
Each row is one player in one season. The columns I use:

| Column | What it means |
|---|---|
| goals, assists | What actually happened |
| xG | Expected goals. Every shot gets a probability of scoring based on where it was taken from and how. xG is the sum for the season |
| xA | Expected assists. The xG of the shots a player's passes created |
| npxG | xG without penalties |
| shots, key passes | Shots taken, and passes that led directly to a shot |
| xGChain | The xG of every possession the player touched, even if they didn't shoot or pass last |
| xGBuildup | Like xGChain, but ignoring the final shot and the final pass, so it shows who gets the team moving |

"Per 90" means the total divided by minutes played, times 90. A player with 10 goals in 1,350 minutes has 0.67 goals per 90.

### Match data (StatsBomb)
This is event data: every pass, shot, carry and defensive action in a game, with x and y positions on the pitch. Each shot also has its xG, where it ended up, and a "freeze frame" that lists where the other players were standing at that moment. I use 16 World Cup 2022 knockout games.

## 3. The Python scripts (in `scripts/`)

Run them in this order.

**`import_github_players.py`** downloads a CSV from a public GitHub copy of Understat's data and saves it as JSON files, one per league and season, in `data/raw/`.

**`build_dataset.py`** is the cleaning step. The details are in `data/DATA_NOTES.md`. The output is `frontend/src/data/players.json`, which is what the website reads. Every row has the totals, the per-90 values, and a `pct` object with eight percentiles.

Two things in here took some work:
- *Names.* The source gave `O&#039;Riley` instead of `O'Riley`. Python's `html.unescape` fixes it.
- *Positions.* Understat's position text is sorted alphabetically, not by importance. A winger who also played striker shows up as "F M S". Taking the first letter gives the wrong answer, so I use the most common position across the seasons where the player had only one listed.

**`build_clusters.py`** finds play styles.
1. Take players with 900+ minutes, and do each position separately.
2. Use nine per-90 numbers. Convert each to a z-score (how many standard deviations from the position average), so shots per 90 doesn't dominate just because the numbers are bigger.
3. Run k-means with four groups. K-means picks four starting points, assigns every player to the closest one, moves each point to the middle of its group, and repeats until nothing moves. I start it ten times with different starting points and keep the best run, because the answer depends on where it starts.
4. Name the groups. I score each group on three themes (finishing, creating, building) and match names to groups so each name is used once. Forwards get names like "Goal threat" and "Creative forward".
5. Run PCA to squash the nine numbers down to two, so players can be drawn on a flat map (the Styles page). PCA finds the directions along which players differ the most. The first two directions explain 58.8% and 21.2% of the variation.
6. Report the silhouette score for each position (0.22 to 0.27). Silhouette is a measure from -1 to 1 of how clearly separated the groups are. Mine are modest, which makes sense: players are a spectrum, not four neat boxes. The Styles page shows the scores instead of hiding them.

All of this is written with NumPy only. No machine learning library.

**`build_forecast.py`** predicts next season.
- For every player who had 900+ minutes in two seasons in a row, the inputs are last season's per-90 numbers and position, and the targets are next season's goals and assists per 90.
- The model is ridge regression. It's ordinary linear regression with a penalty that stops any one input from getting a huge weight. That matters because the inputs overlap (xG and shots move together).
- I train on the older season pairs and test on the newest pair, which the model never saw during training.
- The test compares it to a simple guess: "next season will be the same as last season". On goals per 90, the model's average error was 0.072 against 0.081 for the guess (11% better). On assists it was 0.058 against 0.073 (20% better).
- The main reason it works is that last season's goals include luck, while xG and shots are steadier. The model leans on those, so a lucky finisher gets pulled back toward normal.

**`build_database.py`** loads the data into SQLite. The schema:
- `leagues`, `clubs`, `players`: one row each, with an ID.
- `player_seasons`: one row per player per season per league, pointing at the other three tables with foreign keys. It has CHECK rules (minutes can't be negative, position must be one of three values).
- `team_seasons`: created but empty, because I don't have team data.

This is normalised. A club's name is stored once, so a rename is one update and a typo can't create two versions of the same club. The script runs a foreign key check at the end and prints how many problems it found (0).

`sql/queries.sql` has example queries with joins, a window function, GROUP BY and HAVING.

**`build_matches.py`** downloads each match, keeps only what the maps need (shots, passes, touches, defensive actions) and writes a small JSON file per match. It drops the penalty shoot-outs. In StatsBomb data every team attacks left to right, so no flipping is needed.

## 4. The API (`backend/main.py`)

A small FastAPI app over the SQLite database. Endpoints: `/health`, `/leagues`, `/players` (search, filters, sorting, paging), `/players/{id}`, `/leaderboard`, `/league-scoring`.

Choices I made on purpose:
- The database opens read-only, so the API can't change data.
- Every query uses bound parameters (`?`), and sort columns come from a fixed list. That blocks SQL injection. There's a test that tries it.
- Input is checked before any SQL runs (for example `limit` can't be over 100).
- FastAPI generates its own documentation page at `/docs`.

The website doesn't use this API. It reads the JSON files directly, which is why it can be hosted for free as plain files. The API exists to show the database side and could be wired to the site later.

## 5. The website (`frontend/src/`)

Built with React and Vite. Each page is a file in `pages/`, shared pieces are in `components/`, and numbers and helpers are in `utils/`.

**How data gets in.** `data/store.js` imports the JSON files once and exports them. Pages use that, so there's no loading state for the player data.

**State.** `App.jsx` keeps the list of players picked for comparison (maximum four). The watchlist lives in `hooks/useWatchlist.js`, which saves to the browser's localStorage so it survives a refresh.

**The VSIQ rating** (`utils/rating.js`) is the average of eight percentiles: goals, assists, xG, xA, shots, key passes, xGChain and xGBuildup, each per 90. It runs 0 to 100. I picked equal weights so there's nothing hidden. It's easy to explain, but it does favour attackers, because those are the only numbers I have.

**Similar players** (`components/SimilarPlayers.jsx`) measure the distance between two players' eight percentiles (straight-line distance, the same idea as measuring on a map, just in eight dimensions). Close means similar. The distance is turned into a 0 to 100 match score.

**Compare Lab** lets you pick four players. The radar uses percentiles so a defender and a striker are on the same scale. The table highlights who leads each row. The selection is copied into the page address (`?p=`), so a link opens the same comparison.

**Charts** are Recharts, plus a few drawn directly in SVG (the pitches in Team of the Season and the Match Lab maps).

**Scout IQ assistant** (`utils/assistant.js`) isn't AI. It looks for words in the question (positions, leagues, seasons, a few measures like "creative" or "finisher"), turns them into filters and sorts the player list. If you use a word it doesn't know (like "young" or "cheap"), it tells you that it can't answer that, since I have no age or price data.

**Player portraits** (`components/Avatar.jsx`) are drawn in SVG from the player's name and club. The club name gets turned into a number, and that number picks a colour, so teammates share a kit colour and a player always looks the same. They're not photos, because I don't have the rights to use photos.

**3D Lab** uses three.js through react-three-fiber. Each player is one instance of a small sphere (an "instanced mesh"), which lets it draw thousands of points smoothly. You choose three measures for the x, y and z axes, and the colour shows league or position.

**Match Lab** has five views:
- *Shot map:* circle size is xG, and goals are filled bright. Clicking a shot opens a 3D replay.
- *Pass map:* a line for each pass. Completed passes are solid, lost ones are red and dashed, and passes that led to a shot are brighter.
- *Passing network:* each circle sits at the player's average passing position. Lines between players are thicker when they passed to each other more.
- *Heatmap:* the pitch is split into a grid and every event adds weight to nearby cells, then it's blurred so it reads as a smooth patch.
- *3D view:* the pitch is 120 by 80 in the data and gets scaled to 24 by 16 in 3D. Heat towers are bars whose height follows the heatmap grid and slide smoothly when you change team or player. Pass arcs are curves drawn between each pass's start and end points. Shot replays draw the ball's path to the spot where it ended, using the height of the end point, and place the other players from the freeze frame.

**Look and motion.** Colours are CSS variables in `App.css`, so switching to light mode only changes the variables. There's a page transition, a staggered entrance for each page's blocks, and a scroll reveal for blocks below the fold. All of it turns off if the visitor's system asks for reduced motion.

## 6. Tests and checks

- `frontend/src/utils/*.test.js`: 13 tests for the rating, percentile helpers, heatmap grid, passing network and shot summary.
- `backend/test_api.py`: 4 tests, including one that tries SQL injection and one that checks input limits.
- `.github/workflows/ci.yml`: runs the frontend tests and a build on every push.
- The database script checks its own foreign keys.

## 7. What I'd do next

- Get team data so the Teams page and the scoring-by-league chart work.
- Add goalkeepers, ages and market values from another source.
- Connect the site to the API.
- Track a player's progress across seasons on one chart.
- Add more matches to Match Lab, or link a match to the players in the main data.
