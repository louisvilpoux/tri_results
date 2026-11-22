-- Lieux des épreuves : complétés, harmonisés au sein d'une course, puis corrigés à la main.
--
-- Le lieu vient de la source, mis en forme par lieu_lisible (raw_data.sql). Trois étapes :
--   1. au sein d'une course (même nom), les écritures d'une même ville sont ramenées à la plus
--      complète (« Ardres » → « Ardres (62610) », « Chateau thierry » → « Château-Thierry ») ;
--   2. une épreuve sans lieu prend le lieu le plus fréquent de sa course, avec code postal de
--      préférence (les autres éditions ou l'autre source de la même course) ;
--   3. les corrections de transform/lieux_courses.csv (nom_course;annee;lieu), chargé par
--      run_sql.py dans la table temporaire lieux_courses, remplacent le lieu de la source : une
--      ligne sans année vaut pour toutes les éditions de la course, une ligne avec année pour
--      cette édition seulement (elle l'emporte). nom_course est le nom affiché sur le site.
-- Pour trouver les courses à vérifier : python transform/export_lieux_a_verifier.py.
--
-- Exécuté après doublons_sources.sql (les noms de course sont définitifs). Le lieu n'entre pas
-- dans la clé des id stables : les id ne changent pas.

-- Ville sans accent ni ponctuation, pour comparer « Le Touquet Paris Plage » et
-- « Le Touquet-Paris-Plage (62520) »
CREATE OR REPLACE FUNCTION lieu_ville_cle(lieu text)
RETURNS text AS $$
    SELECT btrim(regexp_replace(
        lower(unaccent(regexp_replace(lieu, ' \(\d{5}\)$', ''))), '[^a-z0-9]+', ' ', 'g'
    ))
$$ LANGUAGE sql IMMUTABLE;


-- 1. Une seule écriture par ville dans une course : la plus complète (avec code postal, puis avec
-- accents, puis la plus fréquente). « Ardres » → « Ardres (62610) », « Chateau thierry » et
-- « Chateau-Thierry » → « Château-Thierry », « Narbonne plage » → « Narbonne Plage ».
UPDATE races r
SET lieu_epreuve = meilleure.lieu_epreuve
FROM (
    SELECT DISTINCT ON (name_epreuve, lieu_ville_cle(lieu_epreuve))
        name_epreuve, lieu_ville_cle(lieu_epreuve) AS ville, lieu_epreuve
    FROM races
    WHERE lieu_epreuve IS NOT NULL
    GROUP BY name_epreuve, lieu_epreuve
    ORDER BY
        name_epreuve,
        lieu_ville_cle(lieu_epreuve),
        lieu_epreuve ~ '\(\d{5}\)$' DESC,
        lieu_epreuve <> unaccent(lieu_epreuve) DESC,
        COUNT(*) DESC,
        lieu_epreuve
) meilleure
WHERE r.name_epreuve = meilleure.name_epreuve
  AND lieu_ville_cle(r.lieu_epreuve) = meilleure.ville
  AND r.lieu_epreuve <> meilleure.lieu_epreuve;


-- 2. Épreuve sans lieu : le lieu le plus fréquent de sa course
UPDATE races r
SET lieu_epreuve = frequent.lieu_epreuve
FROM (
    SELECT DISTINCT ON (name_epreuve) name_epreuve, lieu_epreuve
    FROM races
    WHERE lieu_epreuve IS NOT NULL
    GROUP BY name_epreuve, lieu_epreuve
    ORDER BY name_epreuve, lieu_epreuve ~ '\(\d{5}\)$' DESC, COUNT(*) DESC, lieu_epreuve
) frequent
WHERE r.name_epreuve = frequent.name_epreuve
  AND r.lieu_epreuve IS NULL;


-- 3. Corrections à la main : toute la course, puis l'édition (année) qui l'emporte
UPDATE races r
SET lieu_epreuve = c.lieu
FROM lieux_courses c
WHERE r.name_epreuve = btrim(c.nom_course)
  AND COALESCE(btrim(c.annee), '') = ''
  AND COALESCE(btrim(c.lieu), '') <> '';

UPDATE races r
SET lieu_epreuve = c.lieu
FROM lieux_courses c
WHERE r.name_epreuve = btrim(c.nom_course)
  AND r.year_epreuve = btrim(c.annee)
  AND COALESCE(btrim(c.lieu), '') <> '';
