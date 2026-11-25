-- Épreuves publiées en deux classements, un par sexe (D9, retour utilisateur du 23/11/2026).
--
-- Certaines sources publient une même épreuve en deux classements : « S Homme » et « S Femme »
-- (Duathlon de Sainte Aldegonde), « D3H » et « D3F » (Grand Prix FFTRI), « BEH » et « BEF »
-- (jeunes), « SM » et « SW » (Chtriman), « HOMMES » et « FEMMES »… Chacun devenait une épreuve
-- à part, au même format : les repères et « Et moi ? » de l'épreuve des hommes ne comptaient
-- que les hommes, sans choix Hommes / Femmes, et la première femme n'apparaissait pas sur la
-- page de la course.
--
-- Ces épreuves sont réunies en une seule quand :
--   - elles ont la même source, le même nom de course, la même date (ou année), la même
--     discipline et le même format ;
--   - leurs noms publiés sont identiques une fois le sexe retiré (format_sans_sexe) ;
--   - chacune est à au moins 90 % d'un seul sexe, et il y a des deux sexes dans le groupe.
-- Des divisions ou catégories différentes (D1H et D2H, BEF et CAF, PTS2 et PTS4) restent
-- séparées. Le 23/11/2026 : 104 groupes, tous prolivesport et chronoweb.
--
-- Le nom de l'épreuve réunie est la liste des noms publiés (« S Femme / S Homme ») ; le nom
-- publié de chaque ligne est gardé dans format_source : la clé de l'id stable en dépend
-- (ids_epreuves.sql), l'épreuve réunie garde donc le plus petit des deux id et l'autre redirige
-- vers lui.
--
-- Classement : la source donnait un classement par sexe (deux « 1er »). Il est gardé dans
-- rang_sexe, et clt devient le classement de l'épreuve réunie, par temps total, parmi les
-- classés de la source (clt entre 1 et 99989) ; un classé sans temps vient après ceux qui en ont
-- un, dans l'ordre de son classement par sexe. Les non-classés ne changent pas.
--
-- Exécuté après noms_epreuves.sql (noms de course définitifs) et avant races.sql.

-- Nom d'épreuve sans ce qui désigne le sexe, en minuscules et sans accents :
--   - mots : homme(s), femme(s), masculin(e)(s), féminin(e)(s), men, women, dames, messieurs
--     (« S Homme » → « s », « CHTRI S Men » → « chtri s », « HOMMES » → « ») ;
--   - lettre seule en dernier mot, s'il reste un autre mot (« S M » → « s », « XS F » → « xs ») ;
--     une lettre seule n'est pas retirée (« M » est un format) ;
--   - lettre collée à la fin d'un code publié en majuscules sans espace (« D3H » → « d3 »,
--     « BEF » → « be », « SW » → « s », « OPENF » → « open », « PTS2-5-F » → « pts2-5 ») ;
--   - « finales » au singulier (Extrememan 2020 : « Finale Hommes » / « Finales Femmes »).
CREATE OR REPLACE FUNCTION format_sans_sexe(libelle text)
RETURNS text AS $$
DECLARE
    t text := btrim(regexp_replace(lower(unaccent(coalesce(libelle, ''))), '\s+', ' ', 'g'));
BEGIN
    t := regexp_replace(
        t, '\m(hommes?|femmes?|masculine?s?|feminine?s?|men|women|dames?|messieurs)\M', ' ', 'g'
    );
    t := regexp_replace(t, '\mfinales\M', 'finale', 'g');
    t := btrim(regexp_replace(t, '\s+', ' ', 'g'), ' -');
    IF t ~ '\s[hfmw]$' THEN
        t := btrim(regexp_replace(t, '\s[hfmw]$', ''), ' -');
    ELSIF libelle !~ '\s' AND libelle = upper(libelle) AND t ~ '^[a-z0-9-]{1,8}[hfmw]$' THEN
        t := rtrim(substring(t FROM 1 FOR length(t) - 1), '-_');
    END IF;
    RETURN t;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Épreuves (une par nom publié) et leur composition par sexe
CREATE TEMPORARY TABLE epreuves_publiees AS
SELECT
    source, name_epreuve, COALESCE(date_epreuve, year_epreuve) AS jour,
    type_epreuve, format_normalise, format_epreuve,
    format_sans_sexe(format_epreuve) AS cle,
    CASE
        WHEN COUNT(*) FILTER (WHERE sexe = 'M') >= 0.9 * COUNT(*) THEN 'M'
        WHEN COUNT(*) FILTER (WHERE sexe = 'F') >= 0.9 * COUNT(*) THEN 'F'
    END AS sexe_epreuve
FROM raw_data
GROUP BY source, name_epreuve, COALESCE(date_epreuve, year_epreuve), type_epreuve,
         format_normalise, format_epreuve;

-- Groupes à réunir, avec le nom de l'épreuve réunie
CREATE TEMPORARY TABLE epreuves_reunies AS
SELECT
    e.source, e.name_epreuve, e.jour, e.type_epreuve, e.format_normalise, e.format_epreuve,
    g.format_reuni
FROM epreuves_publiees e
JOIN (
    SELECT
        source, name_epreuve, jour, type_epreuve, format_normalise, cle,
        string_agg(format_epreuve, ' / ' ORDER BY format_epreuve) AS format_reuni
    FROM epreuves_publiees
    GROUP BY source, name_epreuve, jour, type_epreuve, format_normalise, cle
    HAVING COUNT(*) > 1
       AND bool_and(sexe_epreuve IS NOT NULL)
       AND bool_or(sexe_epreuve = 'M')
       AND bool_or(sexe_epreuve = 'F')
) g ON g.source = e.source
   AND g.name_epreuve = e.name_epreuve
   AND g.jour = e.jour
   AND g.type_epreuve IS NOT DISTINCT FROM e.type_epreuve
   AND g.format_normalise IS NOT DISTINCT FROM e.format_normalise
   AND g.cle = e.cle;

UPDATE raw_data b
SET format_source = b.format_epreuve,
    format_epreuve = r.format_reuni,
    -- classement publié (par sexe), sauf si la source donne déjà le rang par sexe
    rang_sexe = COALESCE(b.rang_sexe, b.clt::text)
FROM epreuves_reunies r
WHERE b.source = r.source
  AND b.name_epreuve = r.name_epreuve
  AND COALESCE(b.date_epreuve, b.year_epreuve) = r.jour
  AND b.type_epreuve IS NOT DISTINCT FROM r.type_epreuve
  AND b.format_normalise IS NOT DISTINCT FROM r.format_normalise
  AND b.format_epreuve = r.format_epreuve;

-- Classement de l'épreuve réunie : classés de la source, par temps total
UPDATE raw_data b
SET clt = n.clt,
    rang_global = n.clt::text
FROM (
    SELECT
        id,
        rank() OVER (
            PARTITION BY source, name_epreuve, COALESCE(date_epreuve, year_epreuve), format_epreuve
            ORDER BY temps IS NULL, temps, clt
        ) AS clt
    FROM (
        SELECT
            id, source, name_epreuve, date_epreuve, year_epreuve, format_epreuve, clt,
            CASE WHEN total_time ~ '^\d{1,3}:\d{2}:\d{2}$' AND total_time <> '00:00:00'
                 THEN total_time::interval END AS temps
        FROM raw_data
        WHERE format_source IS NOT NULL
          AND clt BETWEEN 1 AND 99989
    ) classes
) n
WHERE b.id = n.id;

DROP TABLE epreuves_publiees, epreuves_reunies;
