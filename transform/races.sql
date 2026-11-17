INSERT INTO races (name_epreuve, format_initial, type_epreuve, format_epreuve, year_epreuve, date_epreuve, lieu_epreuve)
SELECT DISTINCT 
    name_epreuve,
    format_epreuve as format_initial,
    --UPPER(SPLIT_PART(format_epreuve, ' ',1)) AS type_epreuve,
    array_to_string((string_to_array(format_epreuve, ' '))[1 : cardinality(string_to_array(format_epreuve, ' ')) - 1], ' ') AS type_epreuve,
    --UPPER(SPLIT_PART(format_epreuve, ' ',2)) AS format_epreuve,
    UPPER((string_to_array(format_epreuve, ' '))[cardinality(string_to_array(format_epreuve, ' '))]) AS format_epreuve,
    year_epreuve,
    date_epreuve,
    lieu_epreuve
FROM raw_data;