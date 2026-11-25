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
-- Les totaux isolés trop courts qui restent sont marqués temps_suspect (fin du fichier).
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


-- Temps suspects : après ce recalcul, quelques classés gardent un total isolé bien trop court
-- (Lacanau 2017 L : 609e en 00:00:07 ; Openlakes Champagne 2026 L : 750e à 762e entre 00:36 et
-- 02:44 pour une médiane de 05:41). Rien ne permet de retrouver le bon temps : le résultat est
-- marqué temps_suspect, l'interface le signale et il ne compte pas dans les meilleurs temps.
-- Règle : total d'un classé inférieur à la moitié du temps médian des classés de l'épreuve
-- (au moins 10 classés avec un temps). 19 résultats dans 7 épreuves le 20/11/2026.
CREATE TEMPORARY TABLE classes AS
SELECT id, epreuve_id, total_time::interval AS total
FROM results
WHERE total_time ~ '^\d{2}:\d{2}:\d{2}$' AND clt > 0 AND clt < 99990;

CREATE TEMPORARY TABLE temps_suspects AS
SELECT c.id
FROM classes c
JOIN (
    SELECT epreuve_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY total) AS mediane
    FROM classes
    GROUP BY epreuve_id
    HAVING COUNT(*) >= 10
) m ON m.epreuve_id = c.epreuve_id
WHERE c.total < 0.5 * m.mediane;
ANALYZE temps_suspects;

UPDATE results x
SET temps_suspect = true
FROM temps_suspects t
WHERE x.id = t.id;

DROP TABLE classes, temps_suspects;


-- Temps de tour prolivesport (Q1 de l'audit qualité, 25/11/2026) : sur certains événements,
-- l'API prolivesport ne donne pas de temps total. Son champ « time » est alors un temps de tour
-- (CHTRIMAN Gravelines 2017, 226 km : vainqueur en 01:10:23, égal à son 7e temps intermédiaire,
-- quand natation, T1, vélo, T2 et course totalisent 09:36:02), et le classement publié suit ce
-- temps de tour. Ni le total ni le classement ne sont fiables, et la somme des segments ne suit
-- le classement qu'une fois sur deux : tous les totaux de l'épreuve sont marqués temps_suspect
-- (exclus des Repères, de « Et moi ? » et des meilleurs temps), le classement de la source est
-- gardé. Deux règles, sur les seules épreuves prolivesport :
--   1. la somme des 5 segments vaut au moins 3 fois le total pour la moitié des classés qui ont
--      les 5 segments (au moins 3 : relais du CHTRIMAN 2017, 4 équipes, vainqueur en 01:10:23
--      sur 226 km) ;
--   2. sans segments utilisables, triathlon ou duathlon dont le temps médian des classés est
--      impossible pour le format (au moins 5 classés) : moins de 20 minutes en XS, 35 en S, 50
--      en M (Triathlon Dunkerque 2019 S : vainqueur en 00:09:28, aucun segment publié).
-- Exécuté avant segments_prolivesport.sql, qui vide ensuite les segments incohérents.
CREATE TEMPORARY TABLE classes_prolivesport AS
SELECT
    r.id,
    r.epreuve_id,
    r.type_epreuve,
    r.format_epreuve,
    extract(epoch FROM r.total_time::interval) AS total,
    CASE
        WHEN r.swim_time ~ '^\d{2}:\d{2}:\d{2}$' AND r.t1_time ~ '^\d{2}:\d{2}:\d{2}$'
             AND r.bike_time ~ '^\d{2}:\d{2}:\d{2}$' AND r.t2_time ~ '^\d{2}:\d{2}:\d{2}$'
             AND r.run_time ~ '^\d{2}:\d{2}:\d{2}$'
        THEN extract(epoch FROM r.swim_time::interval + r.t1_time::interval
                     + r.bike_time::interval + r.t2_time::interval + r.run_time::interval)
    END AS somme_segments
FROM results r
WHERE r.source = 'prolivesport'
  AND r.total_time ~ '^\d{2}:\d{2}:\d{2}$' AND r.total_time <> '00:00:00'
  AND r.clt > 0 AND r.clt < 99990;

CREATE TEMPORARY TABLE epreuves_temps_de_tour AS
SELECT epreuve_id
FROM classes_prolivesport
WHERE somme_segments IS NOT NULL
GROUP BY epreuve_id
HAVING COUNT(*) >= 3
   AND percentile_cont(0.5) WITHIN GROUP (ORDER BY somme_segments / total) >= 3
UNION
SELECT epreuve_id
FROM classes_prolivesport
WHERE type_epreuve IN ('triathlon', 'duathlon', 'cross triathlon', 'cross duathlon')
GROUP BY epreuve_id, format_epreuve
HAVING COUNT(*) >= 5
   AND percentile_cont(0.5) WITHIN GROUP (ORDER BY total) < CASE format_epreuve
           WHEN 'XS' THEN 20 * 60
           WHEN 'S' THEN 35 * 60
           WHEN 'M' THEN 50 * 60
       END;

UPDATE results x
SET temps_suspect = true
FROM epreuves_temps_de_tour e
WHERE x.epreuve_id = e.epreuve_id
  AND x.total_time IS NOT NULL;

DROP TABLE classes_prolivesport, epreuves_temps_de_tour;
