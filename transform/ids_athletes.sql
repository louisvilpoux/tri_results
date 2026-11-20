-- Id stable des athlètes (voir ids_stables.sql).
--
-- Un athlète (unified_id) est l'ensemble des lignes `athletes` d'une même clé de nom
-- (athlete_key, ex. « bassetto jean marc ») ; un athlète dont un nom tronqué a été rattaché
-- (athletes_tronques.sql) a deux clés. Ces clés donnent son id stable : il ne dépend plus de la
-- position de ses lignes dans les données brutes. Quand une nouvelle règle réunit deux athlètes
-- (ex. la virgule dans « MEUNIER, Paul »), l'un des deux id redirige vers l'autre.
-- Les homonymes séparés dans une épreuve reçoivent leur id dans homonymes.sql.
--
-- Chaque athlète garde une ligne de référence (id = unified_id) : elle prend l'id stable. Les
-- autres lignes, que rien ne référence, sont numérotées en négatif pour ne jamais occuper un id
-- stable.
--
-- Exécuté après athletes_tronques.sql et avant results.sql (rien ne référence encore
-- athletes.id).

CREATE TEMPORARY TABLE cles_entites AS
SELECT DISTINCT
    unified_id AS entite,
    athlete_key AS cle,
    COUNT(*) OVER (PARTITION BY unified_id) AS poids
FROM athletes;

SELECT attribue_ids_stables('athlete');

CREATE TEMPORARY TABLE athletes_avant AS SELECT * FROM athletes;
DELETE FROM athletes;

INSERT INTO athletes (id, unified_id, nom, club, cat_initial, sexe, nb_races, athlete_key)
SELECT
    CASE
        WHEN a.id = a.unified_id THEN i.id
        ELSE -row_number() OVER (ORDER BY a.id)
    END,
    i.id,
    a.nom,
    a.club,
    a.cat_initial,
    a.sexe,
    a.nb_races,
    a.athlete_key
FROM athletes_avant a
JOIN ids_entites i ON i.entite = a.unified_id;

DROP TABLE cles_entites, ids_entites, athletes_avant;
