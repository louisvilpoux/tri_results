-- Discipline et format d'une épreuve, à partir de format_epreuve :
--   - prolivesport : déjà calculés dans raw_data (voir prolivesport.sql) ;
--   - autres sources : « <discipline> <distance> [variante] », ex. « triathlon m »,
--     « cross triathlon m clm » (contre-la-montre), « triathlon m eq » (équipe),
--     « triathlon s open ». La discipline est ce qui précède la lettre de distance
--     (XS, S, M, L, XL, XXL) et le format est cette lettre ; la variante n'est pas gardée
--     dans le format (elle reste dans format_initial). Sans lettre de distance, on garde
--     l'ancienne règle : le dernier mot est le format, ce qui précède la discipline.
INSERT INTO races (name_epreuve, format_initial, type_epreuve, format_epreuve, year_epreuve, date_epreuve, lieu_epreuve)
SELECT DISTINCT
    name_epreuve,
    format_epreuve AS format_initial,
    CASE
        WHEN type_epreuve IS NOT NULL THEN type_epreuve
        WHEN distance.parts IS NOT NULL THEN distance.parts[1]
        ELSE array_to_string((string_to_array(format_epreuve, ' '))[1 : cardinality(string_to_array(format_epreuve, ' ')) - 1], ' ')
    END AS type_epreuve,
    CASE
        WHEN type_epreuve IS NOT NULL THEN format_normalise
        WHEN distance.parts IS NOT NULL THEN UPPER(distance.parts[2])
        ELSE UPPER((string_to_array(format_epreuve, ' '))[cardinality(string_to_array(format_epreuve, ' '))])
    END AS format_epreuve,
    year_epreuve,
    date_epreuve,
    lieu_epreuve
FROM raw_data
CROSS JOIN LATERAL (
    SELECT regexp_match(format_epreuve, '^(.+?)\s+(xxl|xl|xs|s|m|l)(\s.*)?$', 'i') AS parts
) distance;

UPDATE races
SET type_epreuve = CASE
    WHEN name_epreuve ILIKE '%aquathlon%' THEN 'aquathlon'
    WHEN name_epreuve ILIKE '%swimrun%' THEN 'swimrun'
    WHEN name_epreuve ILIKE '%triathlon%' 
      OR name_epreuve ILIKE '%altriman%' 
      OR name_epreuve ILIKE '%extrememan%' 
      OR name_epreuve ILIKE '%xterra%' THEN 'triathlon'
    WHEN name_epreuve ILIKE '%bike and run%' THEN 'bike&run'
    ELSE type_epreuve
END
WHERE (type_epreuve IS NULL OR TRIM(type_epreuve) = '')
  AND (
    name_epreuve ILIKE '%aquathlon%' OR
    name_epreuve ILIKE '%swimrun%' OR
    name_epreuve ILIKE '%triathlon%' OR
    name_epreuve ILIKE '%altriman%' OR
    name_epreuve ILIKE '%extrememan%' OR
    name_epreuve ILIKE '%xterra%' OR
    name_epreuve ILIKE '%bike and run%'
  );