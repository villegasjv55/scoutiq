# Data notes

## Where the numbers come from
- **Players:** Understat season totals for the Premier League, La Liga and Serie A, 2021-22 to 2024-25. I got them from a public GitHub copy (`vibedatascience/understat_players_aggregated`) because Understat's website was down when I built this. `scripts/import_github_players.py` downloads the file and `scripts/fetch_understat*.py` are older scripts for pulling straight from Understat if the site is up.
- **Matches:** StatsBomb Open Data, 2022 World Cup knockout games (16 matches). `scripts/build_matches.py` downloads them.

## What the cleaning does (`scripts/build_dataset.py`)
- Turns text numbers into numbers and removes duplicate player-season rows.
- Fixes names with HTML codes in them (for example `O&#039;Riley` becomes `O'Riley`).
- Drops goalkeepers, since the source has no keeper statistics.
- Drops player-seasons under 450 minutes.
- Works out one position per player. Understat lists positions alphabetically ("D M S"), so the first letter isn't reliable. I take the most common position among the seasons where the player had a single position. If that is a mix of defender and midfielder, I call the player a midfielder.
- Calculates per-90 values (total divided by minutes, times 90).
- Calculates percentiles. Each player's per-90 number is ranked against players with 900+ minutes in the same season and the same position, across all three leagues.

Final size: 4,620 player-seasons, 2,098 players, 227 clubs.

## The database (`scripts/build_database.py`)
Five tables: leagues, clubs, players, player_seasons, team_seasons. The script checks foreign keys when it finishes. Example queries are in `sql/queries.sql`.

## Known gaps
- No age, nationality, market value or on-pitch positions (left back, winger and so on).
- No tackles, interceptions or duels, so defenders are described by their attacking numbers only.
- No team tables. The `team_seasons` table is created but empty, so the Teams page and one example query show nothing.
- xG and xA are model estimates, not things that actually happened.
- Match Lab and the player data come from different sources and are not linked.
- Understat's terms haven't been checked by me. Read them before publishing numbers publicly.
