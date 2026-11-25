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


-- Classés plus rapides que le vainqueur (Q18 de l'audit qualité, 25/11/2026) : certaines
-- épreuves classent des athlètes arrêtés avant l'arrivée, à la fin de la liste, avec le temps
-- de leur dernier passage (Openlakes Champagne 2026 L : vainqueur en 03:52:32, 47 classés entre
-- 02:52:57 et 03:51, natation et vélo seulement ; en XXL, 36 classés plus rapides que le
-- vainqueur). Seuls les plus courts étaient pris par la règle de la moitié du temps médian ; les
-- autres faussaient les Repères, « Et moi ? » et les meilleurs temps. Un total plus court de plus
-- d'une minute que celui du 1er est impossible : il est marqué temps_suspect.
-- Sauf dans les épreuves classées sur un autre temps que le total publié (départs par vagues,
-- temps officiel, pénalités : Bike & Run de l'Hippodrome de Marcq 2024), repérées comme dans
-- l'API (classement_hors_ordre de GET /races/{id}) : plus de 5 % des classés ont un total plus
-- court de plus de 30 secondes que celui du classé précédent. Là, le classement suit un autre
-- temps et un total plus court que celui du 1er n'est pas une erreur.
-- Sauf aussi dans les épreuves à plusieurs « 1er » (plusieurs classements publiés dans une même
-- épreuve : relais et individuels de Cepoy 2026 M chez protiming, Ironman de Nice 2023) : on ne
-- sait pas quel 1er est le vainqueur.
CREATE TEMPORARY TABLE classes_valides AS
SELECT
    id,
    epreuve_id,
    clt,
    total_time::interval AS total,
    lag(total_time::interval) OVER (PARTITION BY epreuve_id ORDER BY clt, id) AS total_precedent
FROM results
WHERE total_time ~ '^\d{2}:\d{2}:\d{2}$' AND clt > 0 AND clt < 99990
  AND NOT temps_suspect;

CREATE TEMPORARY TABLE epreuves_hors_ordre AS
SELECT epreuve_id
FROM classes_valides
GROUP BY epreuve_id
HAVING COUNT(*) FILTER (WHERE total < total_precedent - interval '30 seconds') > 0.05 * COUNT(*);

CREATE TEMPORARY TABLE vainqueurs AS
SELECT epreuve_id, min(total) AS total
FROM classes_valides
WHERE clt = 1
GROUP BY epreuve_id
HAVING COUNT(*) = 1;

CREATE TEMPORARY TABLE plus_rapides_que_le_vainqueur AS
SELECT c.id
FROM classes_valides c
JOIN vainqueurs v ON v.epreuve_id = c.epreuve_id
WHERE c.total < v.total - interval '1 minute'
  AND c.epreuve_id NOT IN (SELECT epreuve_id FROM epreuves_hors_ordre);

UPDATE results x
SET temps_suspect = true
FROM plus_rapides_que_le_vainqueur p
WHERE x.id = p.id;

DROP TABLE classes_valides, epreuves_hors_ordre, vainqueurs, plus_rapides_que_le_vainqueur;


-- Classés plus rapides que des mieux classés (Q18, 25/11/2026) : la règle précédente ne prend
-- que les totaux plus courts que celui du vainqueur. À Openlakes Champagne 2026 L, les athlètes
-- arrêtés avant l'arrivée sont classés après tous les finishers, avec le temps de leur dernier
-- passage, regroupés selon la distance parcourue : le dernier finisher est 428ᵉ en 07:17:34, le
-- 429ᵉ en 05:49:04 (natation, T1 et vélo, pas de course à pied). Leur total est plus court que
-- celui de nombreux mieux classés : il est marqué temps_suspect.
-- Règle : au moins 3 mieux classés ont un total plus long de plus de 5 % (un athlète en 05:00
-- derrière trois classés en 05:16 ou plus). Les petites inversions de fin de classement
-- (pénalités : Triathlon du Val de Gray 2013 L, 1 à 2 %) et un ou deux totaux aberrants trop
-- longs devant (Carnac 2016 M, Champ Man 2025 L) ne sont pas concernés.
-- Rupture : une fois ce premier cas trouvé, le classement ne suit plus les temps (la source
-- classe ensuite les non-finishers, puis les classés à qui il manque un temps intermédiaire). Tout
-- classé placé après lui dont le total est plus court de plus d'une minute que celui d'un mieux
-- classé est aussi marqué (Openlakes 2026 L : 666ᵉ à 669ᵉ, de 06:46:34 à 07:15:18, derrière le
-- dernier finisher en 07:17:34). Mêmes exceptions que la
-- règle du vainqueur : épreuves classées sur un autre temps, épreuves à plusieurs « 1er ».
CREATE TEMPORARY TABLE classes_valides AS
SELECT
    id,
    epreuve_id,
    clt,
    total_time::interval AS total,
    lag(total_time::interval) OVER (PARTITION BY epreuve_id ORDER BY clt, id) AS total_precedent,
    max(total_time::interval) OVER (
        PARTITION BY epreuve_id ORDER BY clt, id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS plus_long_des_mieux_classes
FROM results
WHERE total_time ~ '^\d{2}:\d{2}:\d{2}$' AND clt > 0 AND clt < 99990
  AND NOT temps_suspect;

CREATE TEMPORARY TABLE epreuves_exclues AS
SELECT epreuve_id
FROM classes_valides
GROUP BY epreuve_id
HAVING COUNT(*) FILTER (WHERE total < total_precedent - interval '30 seconds') > 0.05 * COUNT(*)
    OR COUNT(*) FILTER (WHERE clt = 1) > 1;

-- candidats : plus courts de plus de 5 % que le plus long des mieux classés
CREATE TEMPORARY TABLE candidats AS
SELECT id, epreuve_id, clt, total
FROM classes_valides
WHERE total < 0.95 * plus_long_des_mieux_classes
  AND epreuve_id NOT IN (SELECT epreuve_id FROM epreuves_exclues);

CREATE TEMPORARY TABLE plus_rapides_que_des_mieux_classes AS
SELECT c.id
FROM candidats c
WHERE (
    SELECT COUNT(*)
    FROM classes_valides m
    WHERE m.epreuve_id = c.epreuve_id
      AND (m.clt, m.id) < (c.clt, c.id)
      AND m.total * 0.95 > c.total
) >= 3;

-- rupture : premier cas de chaque épreuve, puis les classés suivants plus courts qu'un mieux classé
CREATE TEMPORARY TABLE ruptures AS
SELECT c.epreuve_id, min(c.clt) AS clt
FROM plus_rapides_que_des_mieux_classes p
JOIN classes_valides c ON c.id = p.id
GROUP BY c.epreuve_id;

INSERT INTO plus_rapides_que_des_mieux_classes (id)
SELECT c.id
FROM classes_valides c
JOIN ruptures r ON r.epreuve_id = c.epreuve_id
WHERE c.clt > r.clt
  AND c.total < c.plus_long_des_mieux_classes - interval '1 minute';

UPDATE results x
SET temps_suspect = true
FROM plus_rapides_que_des_mieux_classes p
WHERE x.id = p.id;

DROP TABLE classes_valides, epreuves_exclues, candidats, plus_rapides_que_des_mieux_classes,
    ruptures;
