-- Identifiants stables des épreuves et des athlètes.
--
-- La base est reconstruite de zéro à chaque passage de run_sql.py. Avant, les id d'épreuve
-- (SERIAL rempli par un SELECT DISTINCT) et d'athlète (position d'une ligne brute) changeaient à
-- chaque reconstruction : un lien partagé vers /athletes/375596 ou /races/2779 cassait, ou
-- pointait vers quelqu'un d'autre.
--
-- Ces deux tables ne sont jamais supprimées par drop_tables.sql : elles gardent, d'une
-- reconstruction à l'autre,
--   - ids_stables : l'id attribué à chaque clé naturelle (une épreuve : source, nom publié,
--     format et date ; un athlète : sa clé de nom, voir ids_epreuves.sql et ids_athletes.sql) ;
--   - redirections : les id qui n'existent plus parce que deux épreuves ou deux athlètes ont été
--     réunis, avec l'id qui les remplace (l'API et le site redirigent les anciens liens).
-- Pour tout renuméroter (les liens partagés cassent) : transform/reset_ids_stables.sql.

CREATE TABLE IF NOT EXISTS ids_stables (
    type TEXT NOT NULL,           -- 'epreuve' ou 'athlete'
    cle TEXT NOT NULL,
    id INTEGER NOT NULL,
    PRIMARY KEY (type, cle)
);

CREATE TABLE IF NOT EXISTS redirections (
    type TEXT NOT NULL,
    ancien_id INTEGER NOT NULL,
    nouvel_id INTEGER NOT NULL,
    PRIMARY KEY (type, ancien_id)
);


-- Aplatit les redirections en chaîne : une redirection vers un id qui redirige à son tour vise
-- directement le bout de la chaîne (806 → 804 → 1691 devient 806 → 1691 : épreuves du Duathlon
-- du Lac d'Ardres réunies par epreuves_sexe.sql, puis retirées comme doublon de source ; Q16 de
-- l'audit du 25/11/2026 au soir). Répété tant qu'une chaîne reste, pour les chaînes longues.
CREATE OR REPLACE FUNCTION aplatit_redirections(type_entite text)
RETURNS void AS $$
BEGIN
    LOOP
        UPDATE redirections r
        SET nouvel_id = suivante.nouvel_id
        FROM redirections suivante
        WHERE r.type = type_entite AND suivante.type = type_entite
          AND r.nouvel_id = suivante.ancien_id;
        EXIT WHEN NOT FOUND;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- Attribue un id stable à chaque entité (épreuve ou athlète) de la table temporaire
-- cles_entites (entite, cle, poids) et écrit le résultat dans la table temporaire
-- ids_entites (entite, id). Une entité peut avoir plusieurs clés (un athlète dont le nom
-- tronqué a été rattaché, une épreuve publiée sous deux noms réunis) ; poids départage deux
-- entités qui réclament le même ancien id (la plus grosse le garde).
--
--   - une entité dont une clé est connue reprend l'id de cette clé ; si ses clés mènent à
--     plusieurs anciens id (deux entités réunies), elle garde le plus petit et les autres
--     deviennent des redirections vers lui ;
--   - une entité sans clé connue reçoit un nouvel id, après tous ceux déjà donnés ;
--   - toutes ses clés pointent ensuite vers son id.
CREATE OR REPLACE FUNCTION attribue_ids_stables(type_entite text)
RETURNS void AS $$
BEGIN
    -- statistiques des tables temporaires (sinon le planificateur ignore leur taille)
    ANALYZE cles_entites;

    -- Anciens id réclamés par les clés de chaque entité ; un ancien id réclamé par plusieurs
    -- entités (une entité séparée en deux) va à la plus grosse.
    CREATE TEMPORARY TABLE anciens_ids AS
    SELECT DISTINCT ON (s.id) s.id AS ancien_id, c.entite
    FROM cles_entites c
    JOIN ids_stables s ON s.type = type_entite AND s.cle = c.cle
    ORDER BY s.id, c.poids DESC, c.entite;

    CREATE TEMPORARY TABLE ids_entites AS
    SELECT entite, MIN(ancien_id) AS id
    FROM anciens_ids
    GROUP BY entite;
    ANALYZE ids_entites;

    -- Nouvelles entités : numérotées après le plus grand id déjà donné (redirections comprises)
    INSERT INTO ids_entites (entite, id)
    SELECT
        e.entite,
        GREATEST(
            (SELECT MAX(id) FROM ids_stables WHERE type = type_entite),
            (SELECT MAX(ancien_id) FROM redirections WHERE type = type_entite),
            0
        ) + row_number() OVER (ORDER BY e.entite)
    FROM (SELECT DISTINCT entite FROM cles_entites) e
    -- NOT EXISTS et non NOT IN : NOT IN sur une grande table devient une boucle imbriquée
    WHERE NOT EXISTS (SELECT 1 FROM ids_entites i WHERE i.entite = e.entite);

    -- Entités réunies : leurs autres anciens id redirigent vers l'id gardé
    INSERT INTO redirections (type, ancien_id, nouvel_id)
    SELECT type_entite, a.ancien_id, i.id
    FROM anciens_ids a
    JOIN ids_entites i ON i.entite = a.entite
    WHERE a.ancien_id <> i.id
    ON CONFLICT (type, ancien_id) DO UPDATE SET nouvel_id = EXCLUDED.nouvel_id;

    -- Un id de nouveau utilisé n'est plus une redirection ; une redirection vers un id qui
    -- redirige à son tour suit la chaîne.
    DELETE FROM redirections
    WHERE type = type_entite AND ancien_id IN (SELECT id FROM ids_entites);

    PERFORM aplatit_redirections(type_entite);

    -- Toutes les clés pointent vers l'id de leur entité (une clé partagée par deux entités va à
    -- la plus grosse).
    INSERT INTO ids_stables (type, cle, id)
    SELECT DISTINCT ON (c.cle) type_entite, c.cle, i.id
    FROM cles_entites c
    JOIN ids_entites i ON i.entite = c.entite
    ORDER BY c.cle, c.poids DESC, c.entite
    ON CONFLICT (type, cle) DO UPDATE SET id = EXCLUDED.id;

    DROP TABLE anciens_ids;
END;
$$ LANGUAGE plpgsql;
