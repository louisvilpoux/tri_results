WITH all_data AS (
SELECT
    rfta.clt,
    rfta.clt_f,
    r.id AS epreuve_id,
    r.name_epreuve,
    r.type_epreuve,
    r.format_epreuve,
    r.date_epreuve,
    r.year_epreuve,
    a.unified_id AS athlete_id,
    -- Bike&run et relais : une ligne peut être celle d'une équipe (pas d'un athlète), voir
    -- prolivesport_team_name et chronoweb_team_name. Les lignes d'une seule personne
    -- (prolivesport) restent des résultats d'athlète.
    t.team_name IS NOT NULL AS equipe,
    COALESCE(t.team_name, a.nom) AS nom_athlete,
    rfta.sexe,
    rfta.cat,
    rfta.clt_cat,
    rfta.id_league,
    rfta.league,
    rfta.détails as url,
    rfta.rang_global,
    rfta.rang_sexe,
    rfta.rang_categorie,
    rfta.categorie,
    rfta.indice_performance,
    rfta.indice_performance_reference,
    rfta.total_time,
    rfta.swim_time,
    rfta.rang_swim,
    rfta.rang_course_swim,
    rfta.indice_performance_swim,
    rfta.t1_time,
    rfta.rang_t1,
    rfta.rang_course_t1,
    rfta.indice_performance_t1,
    rfta.bike_time,
    rfta.rang_bike,
    rfta.rang_course_bike,
    rfta.indice_performance_bike,
    rfta.t2_time,
    rfta.rang_t2,
    rfta.rang_course_t2,
    rfta.indice_performance_t2,
    rfta.run_time,
    rfta.rang_run,
    rfta.rang_course_run,
    rfta.indice_performance_run,
    rfta.source,
    row_number() OVER (PARTITION BY r.id , a.unified_id) as rn
FROM raw_data AS rfta
JOIN races AS r ON r.name_epreuve = rfta.name_epreuve
                AND r.format_initial = rfta.format_epreuve
                -- chronoweb ne fournit pas la date : on relie alors l'édition par son année
                -- (NULL = NULL n'est jamais vrai, ces lignes étaient toutes écartées)
                AND (r.date_epreuve = rfta.date_epreuve
                     OR (r.date_epreuve IS NULL AND rfta.date_epreuve IS NULL
                         AND r.year_epreuve = rfta.year_epreuve))
JOIN athletes AS a ON a.nom = rfta.nom
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN rfta.source = 'prolivesport'
             AND (r.type_epreuve = 'bike&run' OR r.format_epreuve = 'RELAIS')
        THEN prolivesport_team_name(rfta.nom, r.type_epreuve = 'bike&run')
        WHEN rfta.source = 'chronoweb'
             AND (r.type_epreuve = 'bike&run' OR r.format_epreuve = 'RELAIS')
        THEN chronoweb_team_name(rfta.nom, rfta.club)
    END AS team_name
) t
)

INSERT INTO results (clt, clt_f, epreuve_id, name_epreuve, type_epreuve, 
format_epreuve, date_epreuve, year_epreuve, athlete_id, nom_athlete, sexe, equipe, cat, 
clt_cat, id_league, league, url, rang_global, rang_sexe, rang_categorie, 
categorie, indice_performance, indice_performance_reference, total_time, 
swim_time, rang_swim, rang_course_swim, indice_performance_swim, t1_time, 
rang_t1, rang_course_t1, indice_performance_t1, bike_time, rang_bike, 
rang_course_bike, indice_performance_bike, t2_time, rang_t2, rang_course_t2, 
indice_performance_t2, run_time, rang_run, rang_course_run, 
indice_performance_run, source)
SELECT 
clt, clt_f, epreuve_id, name_epreuve, type_epreuve, 
format_epreuve, date_epreuve, year_epreuve, athlete_id, nom_athlete, sexe, equipe, cat, 
clt_cat, id_league, league, url, rang_global, rang_sexe, rang_categorie, 
categorie, indice_performance, indice_performance_reference, total_time, 
swim_time, rang_swim, rang_course_swim, indice_performance_swim, t1_time, 
rang_t1, rang_course_t1, indice_performance_t1, bike_time, rang_bike, 
rang_course_bike, indice_performance_bike, t2_time, rang_t2, rang_course_t2, 
indice_performance_t2, run_time, rang_run, rang_course_run, 
indice_performance_run, source
FROM all_data
WHERE rn = 1
;