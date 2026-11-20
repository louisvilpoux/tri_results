--CREATE EXTENSION unaccent;

WITH tokens AS (
  SELECT
    id,
    nom,
    club,
    cat_initial,
    sexe,
    -- Tirets et apostrophes comptent comme des espaces : « BASSETTO Jean-Marc » et « BASSETTO
    -- Jean Marc » ont la même clé (« bassetto jean marc »). Les autres signes (« * », « . »,
    -- « • ») restent dans la clé : certaines sources les ajoutent pour distinguer deux
    -- homonymes d'une même épreuve (« PERRIER Nicolas » et « PERRIER Nicolas* », Gorges de
    -- l'Ardèche 2019, ne sont pas la même personne).
    regexp_split_to_array(
        btrim(regexp_replace(lower(nom), '[-‐‑‒–—−''‘’_[:space:]]+', ' ', 'g')), ' '
    )
        AS parts
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
      -- tri sur le mot sans accent : sinon « Émilie MARTIN » et « Emilie MARTIN » n'ont pas
      -- leurs mots dans le même ordre
      (SELECT array_agg(unaccent(p) ORDER BY unaccent(p)) FROM unnest(parts) AS p),
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