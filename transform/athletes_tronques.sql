-- Noms d'athlètes tronqués par la source.
--
-- Dans quelques épreuves, souvent anciennes, la source coupe tous les noms à une longueur fixe :
-- à Gérardmer 2002, « BASSETTO JEAN MA » (16 caractères) pour « BASSETTO Jean-Marc ». Le nom
-- tronqué forme alors un athlète à part. On le rattache à l'athlète complet quand c'est sans
-- ambiguïté :
--   - l'épreuve a au moins 100 participants et ses noms sont coupés à une longueur fixe d'au
--     plus 20 caractères (voir epreuves_tronquees) ;
--   - le nom atteint pile cette longueur ;
--   - la coupure tombe au milieu d'un mot (« jean ma|rc ») : un nom coupé entre deux mots ne se
--     distingue pas d'un nom complet ;
--   - un seul athlète a un nom qui commence par ce nom tronqué (même ordre des mots, sans
--     tenir compte des majuscules, accents et tirets) ;
--   - les sexes connus des deux ne se contredisent pas.
--
-- Exécuté après athletes.sql et avant results.sql (qui relie chaque résultat à unified_id).

CREATE TEMPORARY TABLE noms_normalises AS
SELECT
    unified_id,
    btrim(regexp_replace(lower(unaccent(nom)), '[^a-z0-9]+', ' ', 'g')) AS nom_norm,
    sexe
FROM athletes;

CREATE INDEX ON noms_normalises (nom_norm text_pattern_ops);

-- Épreuves aux noms coupés à une longueur fixe : au moins 10 % des noms ont exactement cette
-- longueur et moins de 1 % sont plus longs (Gérardmer 2002 : 220 noms sur 722 à 16 caractères,
-- 2 plus longs). Dans une épreuve normale, bien plus de 1 % des noms dépassent la longueur la
-- plus fréquente.
CREATE TEMPORARY TABLE longueurs AS
SELECT name_epreuve, year_epreuve, format_epreuve, length(nom) AS longueur, COUNT(*) AS noms
FROM raw_data
WHERE nom IS NOT NULL
GROUP BY name_epreuve, year_epreuve, format_epreuve, length(nom);

CREATE TEMPORARY TABLE epreuves_tronquees AS
SELECT l.name_epreuve, l.year_epreuve, l.format_epreuve, MAX(l.longueur) AS longueur
FROM longueurs l
JOIN (
    SELECT name_epreuve, year_epreuve, format_epreuve, SUM(noms) AS total
    FROM longueurs
    GROUP BY name_epreuve, year_epreuve, format_epreuve
    HAVING SUM(noms) >= 100
) t USING (name_epreuve, year_epreuve, format_epreuve)
WHERE l.longueur <= 20
  AND l.noms >= 0.10 * t.total
  AND (
    SELECT COALESCE(SUM(plus.noms), 0)
    FROM longueurs plus
    WHERE plus.name_epreuve = l.name_epreuve
      AND plus.year_epreuve = l.year_epreuve
      AND plus.format_epreuve = l.format_epreuve
      AND plus.longueur > l.longueur
  ) <= 0.01 * t.total
GROUP BY l.name_epreuve, l.year_epreuve, l.format_epreuve;

-- Athlètes dont le nom atteint cette longueur.
CREATE TEMPORARY TABLE tronques AS
SELECT DISTINCT n.unified_id, n.nom_norm, n.sexe
FROM raw_data d
JOIN epreuves_tronquees e USING (name_epreuve, year_epreuve, format_epreuve)
JOIN athletes a ON a.nom = d.nom
JOIN noms_normalises n ON n.unified_id = a.unified_id
 AND n.nom_norm = btrim(regexp_replace(lower(unaccent(d.nom)), '[^a-z0-9]+', ' ', 'g'))
WHERE length(d.nom) = e.longueur;

-- Athlète complet : seul candidat dont le nom prolonge le nom tronqué au milieu d'un mot.
CREATE TEMPORARY TABLE rattachements AS
SELECT t.unified_id AS tronque_id, MIN(c.unified_id) AS complet_id
FROM tronques t
JOIN noms_normalises c
  ON c.nom_norm LIKE replace(replace(t.nom_norm, '%', '\%'), '_', '\_') || '%'
 AND length(c.nom_norm) > length(t.nom_norm)
 AND substring(c.nom_norm FROM length(t.nom_norm) + 1 FOR 1) <> ' '
 AND c.unified_id <> t.unified_id
WHERE t.sexe IS NULL OR c.sexe IS NULL OR c.sexe = t.sexe
GROUP BY t.unified_id
HAVING COUNT(DISTINCT c.unified_id) = 1;

UPDATE athletes a
SET unified_id = r.complet_id
FROM rattachements r
WHERE a.unified_id = r.tronque_id;

DROP TABLE rattachements;
DROP TABLE tronques;
DROP TABLE epreuves_tronquees;
DROP TABLE longueurs;
DROP TABLE noms_normalises;
