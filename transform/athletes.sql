--CREATE EXTENSION unaccent;

WITH tokens AS (
  SELECT
    id,
    nom,
    club,
    cat_initial,
    sexe,
    regexp_split_to_array(lower(nom), '\s+') AS parts
  FROM athletes_tmp
),
normalized AS (
  SELECT
    id,
    nom,
    club,
    cat_initial,
    sexe,
    array_to_string(
      (SELECT array_agg(unaccent(p) ORDER BY p) FROM unnest(parts) AS p),
      ' '
    ) AS athlete_key
  FROM tokens
)
INSERT INTO athletes (id, unified_id, nom, club, cat_initial, sexe, athlete_key)
SELECT 
  id,
  FIRST_VALUE(id) OVER (PARTITION BY athlete_key ORDER BY id DESC) AS unified_id,
  nom,
  club,
  cat_initial,
  sexe,
  athlete_key
FROM normalized