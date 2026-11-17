INSERT INTO athletes_tmp (nom, club, cat_initial, sexe)
SELECT 
    nom, 
    club, 
    cat as cat_initial,
    SUBSTRING(cat FROM 1 FOR 1) AS sexe
FROM raw_data
WHERE nom IS NOT NULL AND nom <> ''
;