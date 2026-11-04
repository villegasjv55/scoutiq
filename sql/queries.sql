-- ScoutIQ example queries. Run against data/scoutiq.db, for example:
--   sqlite3 data/scoutiq.db < sql/queries.sql
-- or open the file in the VS Code SQLite extension.

-- 1. Top 10 scorers in the latest season, with club and league (JOINs)
SELECT p.name, c.name AS club, l.name AS league, ps.goals, ps.xg
FROM player_seasons ps
JOIN players p ON p.player_id = ps.player_id
JOIN clubs   c ON c.club_id   = ps.club_id
JOIN leagues l ON l.league_id = ps.league_id
WHERE ps.season = (SELECT MAX(season) FROM player_seasons)
ORDER BY ps.goals DESC
LIMIT 10;

-- 2. Biggest finishing overperformers per season (1,800+ minutes), using a window function
SELECT season, name, goals, ROUND(xg, 1) AS xg, ROUND(goals - xg, 1) AS goals_above_xg
FROM (
    SELECT ps.season, p.name, ps.goals, ps.xg,
           RANK() OVER (PARTITION BY ps.season ORDER BY ps.goals - ps.xg DESC) AS rnk
    FROM player_seasons ps
    JOIN players p ON p.player_id = ps.player_id
    WHERE ps.minutes >= 1800
)
WHERE rnk <= 3
ORDER BY season DESC, rnk;

-- 3. League scoring environment: goals per match by league and season (aggregation)
SELECT l.name AS league, ts.season,
       ROUND(1.0 * SUM(ts.goals_for) / (SUM(ts.played) / 2.0), 2) AS goals_per_match
FROM team_seasons ts
JOIN leagues l ON l.league_id = ts.league_id
GROUP BY l.name, ts.season
ORDER BY ts.season DESC, l.name;

-- 4. Players who played in more than one league (HAVING)
SELECT p.name, COUNT(DISTINCT ps.league_id) AS leagues_played, COUNT(*) AS seasons
FROM player_seasons ps
JOIN players p ON p.player_id = ps.player_id
GROUP BY p.player_id
HAVING COUNT(DISTINCT ps.league_id) > 1
ORDER BY seasons DESC
LIMIT 20;

-- 5. Teams that beat their expected points the most, by season (derived column)
SELECT ts.season, c.name AS club, ts.points, ROUND(ts.xpts, 1) AS xpts,
       ROUND(ts.points - ts.xpts, 1) AS points_above_expected
FROM team_seasons ts
JOIN clubs c ON c.club_id = ts.club_id
ORDER BY points_above_expected DESC
LIMIT 10;
