UPDATE athletes a
SET nb_races = r.nb_races
FROM (
    SELECT athlete_id, COUNT(DISTINCT id) AS nb_races
    FROM results
    GROUP BY athlete_id
) r
WHERE a.unified_id = r.athlete_id;