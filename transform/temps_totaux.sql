-- Temps totaux faux, segments justes : le total est recalculé à partir des segments.
--
-- Certaines épreuves fftri_t2_area ont une colonne de temps total corrompue dans la source
-- elle-même (fftri.t2area.com l'affiche ainsi) : Tribreizh 2022 L, vainqueur en 00:01:03, 4e en
-- 00:00:18, alors que natation, transitions, vélo et course sont normaux (somme : 04:18:04).
--
-- On ne peut pas recalculer dès que le total et la somme des segments diffèrent : dans d'autres
-- épreuves, ce sont les segments qui sont faux (Ironman de Nice 2019 : segments qui totalisent
-- 27 h, total juste). Le classement départage les deux cas : un temps juste croît avec le
-- classement. Une épreuve est corrigée quand :
--   - ses totaux ne suivent pas le classement (moins de 90 % des classés consécutifs dans
--     l'ordre) ;
--   - la somme des 5 segments le suit (au moins 95 %), pour au moins 90 % des classés.
-- Le 20/11/2026, 4 épreuves répondaient à cette règle (Tribreizh 2022 L, Saint Remy sur
-- Durolle 2005 L, Roybon 2021 M, Paris 2022 M), toutes les autres ont plus de 89 % de totaux
-- dans l'ordre. Les lignes de ces épreuves sans les 5 segments perdent leur total (il est faux).
--
-- Exécuté après homonymes.sql.

-- Somme des 5 segments de chaque ligne (vide s'il en manque un)
CREATE TEMPORARY TABLE temps_epreuves AS
SELECT
    id,
    epreuve_id,
    clt,
    CASE WHEN total_time ~ '^\d{2}:\d{2}:\d{2}$' THEN total_time::interval END AS total,
    CASE
        WHEN swim_time ~ '^\d{2}:\d{2}:\d{2}$' AND t1_time ~ '^\d{2}:\d{2}:\d{2}$'
             AND bike_time ~ '^\d{2}:\d{2}:\d{2}$' AND t2_time ~ '^\d{2}:\d{2}:\d{2}$'
             AND run_time ~ '^\d{2}:\d{2}:\d{2}$'
        THEN swim_time::interval + t1_time::interval + bike_time::interval
             + t2_time::interval + run_time::interval
    END AS somme_segments
FROM results;

-- Part des classés consécutifs (avec un total) dont le temps est dans l'ordre du classement.
-- Classés seulement : prolivesport code ses statuts en 0 et 99991-99999.
CREATE TEMPORARY TABLE ordre_epreuves AS
SELECT
    epreuve_id,
    COUNT(*) AS classes,
    COUNT(somme_segments) AS classes_avec_segments,
    AVG((total >= total_precedent)::int) AS totaux_dans_l_ordre,
    AVG((somme_segments >= somme_precedente)::int) AS sommes_dans_l_ordre
FROM (
    SELECT
        *,
        lag(total) OVER par_classement AS total_precedent,
        lag(somme_segments) OVER par_classement AS somme_precedente
    FROM temps_epreuves
    WHERE total IS NOT NULL AND clt > 0 AND clt < 99990
    WINDOW par_classement AS (PARTITION BY epreuve_id ORDER BY clt, id)
) suites
GROUP BY epreuve_id;

CREATE TEMPORARY TABLE epreuves_a_recalculer AS
SELECT epreuve_id
FROM ordre_epreuves
WHERE classes >= 10
  AND totaux_dans_l_ordre < 0.9
  AND sommes_dans_l_ordre >= 0.95
  AND classes_avec_segments >= 0.9 * classes;

-- Dans ces épreuves, le total devient la somme des segments ; il est vidé quand un segment
-- manque (le total de la source est faux).
UPDATE results x
SET total_time = to_char(t.somme_segments, 'HH24:MI:SS')
FROM temps_epreuves t
JOIN epreuves_a_recalculer e ON e.epreuve_id = t.epreuve_id
WHERE t.id = x.id;

DROP TABLE temps_epreuves, ordre_epreuves, epreuves_a_recalculer;
