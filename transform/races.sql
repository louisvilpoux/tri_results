INSERT INTO races (name_epreuve, format_initial, type_epreuve, format_epreuve, year_epreuve, date_epreuve, lieu_epreuve)
SELECT DISTINCT 
    name_epreuve,
    format_epreuve as format_initial,
    --UPPER(SPLIT_PART(format_epreuve, ' ',1)) AS type_epreuve,
    -- prolivesport : discipline et format calculés dans raw_data (voir prolivesport.sql).
    COALESCE(
        type_epreuve,
        array_to_string((string_to_array(format_epreuve, ' '))[1 : cardinality(string_to_array(format_epreuve, ' ')) - 1], ' ')
    ) AS type_epreuve,
    --UPPER(SPLIT_PART(format_epreuve, ' ',2)) AS format_epreuve,
    CASE
        WHEN type_epreuve IS NOT NULL THEN format_normalise
        ELSE UPPER((string_to_array(format_epreuve, ' '))[cardinality(string_to_array(format_epreuve, ' '))])
    END AS format_epreuve,
    year_epreuve,
    date_epreuve,
    lieu_epreuve
FROM raw_data;

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