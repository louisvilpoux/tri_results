-- Un seul nom par course quand ses noms ne diffèrent que par la casse, les accents ou la
-- ponctuation.
--
-- D'une édition à l'autre, ou d'une source à l'autre, une même course peut être écrite
-- « Triathlon de l'Omois » / « Triathlon de L'omois », « Swimrun du Levézou » / « Swimrun du
-- levezou », « triathlon de gravelines » (fftri_t2_area) / « Triathlon de Gravelines »,
-- « Bike & Run Halluin » / « Bike&Run Halluin », « Cross-Duathlon du Haricot » / « Cross
-- Duathlon du Haricot ». Les épreuves sont reliées par leur nom exact : sans ce nettoyage,
-- ces éditions forment des courses séparées (12 groupes de noms le 20/11/2026).
--
-- Deux noms sont considérés identiques quand, en minuscules et sans accents, ils ont les mêmes
-- lettres et chiffres (tout le reste compte pour un espace). Le nom gardé est le plus lisible :
-- d'abord un nom avec des majuscules (fftri_t2_area écrit tout en minuscules), puis avec des
-- accents, puis le plus fréquent.
--
-- Exécuté après raw_data.sql et avant races.sql.

CREATE TEMPORARY TABLE noms_canoniques AS
WITH noms AS (
    SELECT
        name_epreuve,
        btrim(regexp_replace(lower(unaccent(name_epreuve)), '[^a-z0-9]+', ' ', 'g')) AS cle,
        COUNT(*) AS lignes
    FROM raw_data
    WHERE name_epreuve IS NOT NULL
    GROUP BY name_epreuve
)
SELECT DISTINCT ON (cle) cle, name_epreuve AS nom_garde
FROM noms
WHERE cle IN (SELECT cle FROM noms GROUP BY cle HAVING COUNT(*) > 1)
ORDER BY
    cle,
    name_epreuve ~ '[[:upper:]]' DESC,
    name_epreuve <> unaccent(name_epreuve) DESC,
    lignes DESC,
    name_epreuve;

UPDATE raw_data r
SET name_epreuve = n.nom_garde
FROM noms_canoniques n
WHERE btrim(regexp_replace(lower(unaccent(r.name_epreuve)), '[^a-z0-9]+', ' ', 'g')) = n.cle
  AND r.name_epreuve <> n.nom_garde;

DROP TABLE noms_canoniques;
