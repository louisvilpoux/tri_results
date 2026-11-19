UPDATE athletes a
SET nb_races = r.nb_races
FROM (
    SELECT athlete_id, COUNT(DISTINCT id) AS nb_races
    FROM results
    WHERE NOT equipe  -- les résultats d'équipe ne comptent pas comme des courses de l'athlète
    GROUP BY athlete_id
) r
WHERE a.unified_id = r.athlete_id;