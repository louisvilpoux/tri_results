UPDATE athletes a
SET nb_races = r.nb_races
FROM (
    SELECT athlete_id, COUNT(DISTINCT id) AS nb_races
    FROM results
    -- les résultats d'équipe et de sous-classement ne comptent pas comme des courses de l'athlète
    WHERE NOT equipe AND NOT sous_classement
    GROUP BY athlete_id
) r
WHERE a.unified_id = r.athlete_id;