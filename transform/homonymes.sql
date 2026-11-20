-- Homonymes d'une même épreuve : deux personnes, deux athlètes.
--
-- Les athlètes sont reconnus par leur nom (clé de transform/athletes.sql). Deux personnes du
-- même nom dans une même épreuve ont donc le même athlète. results.sql garde une ligne par
-- temps total : deux lignes avec des temps différents sont deux personnes (« MEUNIER Paul »,
-- 801e en 05:37:21 et 1171e en 05:57:07 à l'Ironman de Vichy 2025). Avant, une seule était
-- gardée : environ 390 résultats disparaissaient.
--
-- Le mieux classé garde l'athlète commun (son profil et ses autres courses) ; chacun des autres
-- reçoit un nouvel athlète, dont le profil n'a que cette épreuve : rien ne permet de savoir à
-- quel homonyme appartiennent les autres courses.
--
-- Exécuté après results.sql et avant doublons_sources.sql.

CREATE TEMPORARY TABLE homonymes AS
SELECT id AS result_id, epreuve_id, athlete_id, nom_athlete, sexe, cat, clt, total_time, source,
       year_epreuve
FROM (
    SELECT
        x.*,
        row_number() OVER (
            PARTITION BY x.epreuve_id, x.athlete_id
            ORDER BY x.clt NULLS LAST, x.total_time NULLS LAST, x.id
        ) AS rang
    FROM results x
    WHERE NOT x.equipe
) classes
WHERE rang > 1;

-- Un nouvel athlète par homonyme, avec un id stable (ids_stables.sql) : sa clé est celle de son
-- nom, suivie de l'épreuve (id stable) et de son temps, ex. « homonyme|meunier paul|1234|05:57:07 ».
CREATE TEMPORARY TABLE cles_entites AS
SELECT
    h.result_id AS entite,
    'homonyme|' || a.athlete_key || '|' || h.epreuve_id || '|' || COALESCE(h.total_time, '')
        AS cle,
    1 AS poids
FROM homonymes h
JOIN athletes a ON a.id = h.athlete_id;

SELECT attribue_ids_stables('athlete');

ALTER TABLE homonymes ADD COLUMN nouvel_id INTEGER;
UPDATE homonymes h
SET nouvel_id = i.id
FROM ids_entites i
WHERE i.entite = h.result_id;

DROP TABLE cles_entites, ids_entites;

-- Le club n'est pas dans results : il est repris de la ligne brute, retrouvée par son nom, son
-- classement et son temps (différents d'un homonyme à l'autre).
CREATE TEMPORARY TABLE clubs_homonymes AS
SELECT DISTINCT ON (h.result_id) h.result_id, b.club
FROM homonymes h
JOIN raw_data b
  ON b.nom = h.nom_athlete
 AND b.source = h.source
 AND b.year_epreuve = h.year_epreuve
 AND b.clt IS NOT DISTINCT FROM h.clt
 AND NULLIF(b.total_time, '00:00:00') IS NOT DISTINCT FROM h.total_time
ORDER BY h.result_id, b.id;

INSERT INTO athletes (id, unified_id, nom, club, cat_initial, sexe, athlete_key)
SELECT h.nouvel_id, h.nouvel_id, h.nom_athlete, c.club, h.cat, h.sexe, a.athlete_key
FROM homonymes h
JOIN athletes a ON a.id = h.athlete_id
LEFT JOIN clubs_homonymes c ON c.result_id = h.result_id;

UPDATE results x
SET athlete_id = h.nouvel_id
FROM homonymes h
WHERE x.id = h.result_id;

DROP TABLE homonymes, clubs_homonymes;
