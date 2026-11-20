-- Id stable des épreuves (voir ids_stables.sql).
--
-- Clé d'une épreuve : source | nom publié par la source | format publié | date (ou année quand
-- la source ne donne pas la date, chronoweb), ex. « fftri_t2_area|tribreizh|triathlon l|
-- 2022-06-26 ». C'est le nom publié, pas le nom regroupé par noms_epreuves.sql : changer les
-- règles de regroupement ne change pas l'id. Une épreuve qui réunit plusieurs noms publiés (ou
-- deux sources) a plusieurs clés.
--
-- Exécuté après races.sql et avant results.sql (rien ne référence encore races.id).

-- une ligne par clé et par épreuve ; poids : nombre de lignes brutes de l'épreuve
CREATE TEMPORARY TABLE cles_entites AS
SELECT DISTINCT entite, cle, poids
FROM (
    SELECT
        r.id AS entite,
        b.source || '|' || COALESCE(b.nom_source, b.name_epreuve) || '|' || b.format_epreuve
            || '|' || COALESCE(b.date_epreuve, b.year_epreuve, '') AS cle,
        COUNT(*) OVER (PARTITION BY r.id) AS poids
    FROM raw_data b
    JOIN races r ON r.name_epreuve = b.name_epreuve
                AND r.format_initial = b.format_epreuve
                AND (r.date_epreuve = b.date_epreuve
                     OR (r.date_epreuve IS NULL AND b.date_epreuve IS NULL
                         AND r.year_epreuve = b.year_epreuve))
) lignes;

SELECT attribue_ids_stables('epreuve');

-- Épreuves sans ligne brute rattachée (format ou date absents : aucune clé) : id après tous
-- ceux déjà donnés, non conservé. Elles n'ont pas de résultat et ne sont pas affichées.
INSERT INTO ids_entites (entite, id)
SELECT
    r.id,
    GREATEST(
        (SELECT MAX(id) FROM ids_stables WHERE type = 'epreuve'),
        (SELECT MAX(ancien_id) FROM redirections WHERE type = 'epreuve'),
        (SELECT MAX(id) FROM ids_entites),
        0
    ) + row_number() OVER (ORDER BY r.id)
FROM races r
WHERE NOT EXISTS (SELECT 1 FROM ids_entites i WHERE i.entite = r.id);

-- Renumérotation en deux temps (des id négatifs d'abord) pour ne jamais avoir deux épreuves
-- avec le même id pendant la mise à jour.
UPDATE races SET id = -id;
UPDATE races r SET id = i.id FROM ids_entites i WHERE r.id = -i.entite;
SELECT setval(pg_get_serial_sequence('races', 'id'), (SELECT MAX(id) FROM races));

DROP TABLE cles_entites, ids_entites;
