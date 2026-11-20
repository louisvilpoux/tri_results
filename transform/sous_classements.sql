-- Sous-classements : épreuves du même jour dont presque tous les athlètes ont aussi un
-- résultat dans une autre épreuve, plus grande.
--
-- Une source publie parfois la même course deux fois : le « Championnat de France Fftri »
-- et la course qui l'accueille (Triathlon de Dijon 2017, Triathlon de Vichy 2024…), un
-- classement « Open » à l'intérieur du classement « Full » (Triathlon des Moines 2020), les
-- catégories de paratriathlon à côté du classement « PT » (Cabourg 2025). Le 20/11/2026 :
-- 40 paires, toutes avec au moins 96 % des athlètes de la plus petite épreuve dans la plus
-- grande ; les autres paires du même jour en partagent moins de 20 %.
--
-- L'épreuve incluse reste visible sur sa page (c'est un vrai classement : championnat,
-- catégorie), mais les résultats de ses athlètes déjà présents dans la grande épreuve sont
-- marqués `sous_classement` : ils ne comptent ni comme une course de plus, ni dans
-- l'historique, ni dans les meilleurs temps du profil. Les doublons strictement identiques
-- d'une même course (même nom, mêmes athlètes : Altriman 2021 « Aquathlon 6-9 » / « Aquathlon
-- 8-11 », Triathlon du Pilon 2022 « Poursuite » / « XS Poursuite ») sont supprimés : on garde
-- l'épreuve qui a un format, puis la première par ordre alphabétique.
--
-- Exécuté après doublons_sources.sql et avant athletes_sexe.sql et nb_races.sql.

CREATE TEMPORARY TABLE epreuves_jour AS
SELECT r.id, r.name_epreuve, r.format_epreuve, r.format_initial, COUNT(*) AS participants
FROM races r
JOIN results x ON x.epreuve_id = r.id
WHERE NOT x.equipe
GROUP BY r.id;

CREATE TEMPORARY TABLE paires AS
SELECT xa.epreuve_id AS a_id, xb.epreuve_id AS b_id, COUNT(*) AS athletes_communs
FROM results xa
JOIN results xb
  ON xb.athlete_id = xa.athlete_id
 AND xb.date_epreuve = xa.date_epreuve
 AND xb.epreuve_id <> xa.epreuve_id
WHERE NOT xa.equipe AND NOT xb.equipe
GROUP BY xa.epreuve_id, xb.epreuve_id;

-- 1. Doublons strictement identiques d'une même course : suppression.
CREATE TEMPORARY TABLE doublons_identiques AS
SELECT b.id
FROM paires p
JOIN epreuves_jour a ON a.id = p.a_id
JOIN epreuves_jour b ON b.id = p.b_id
WHERE a.name_epreuve = b.name_epreuve
  AND p.athletes_communs = a.participants
  AND p.athletes_communs = b.participants
  AND a.participants >= 5
  -- b est la moins bonne des deux : sans format, ou après a par ordre alphabétique
  AND (a.format_epreuve IS NOT NULL, b.format_initial) > (b.format_epreuve IS NOT NULL, a.format_initial);

DELETE FROM results WHERE epreuve_id IN (SELECT id FROM doublons_identiques);
DELETE FROM races WHERE id IN (SELECT id FROM doublons_identiques);
DELETE FROM paires
WHERE a_id IN (SELECT id FROM doublons_identiques) OR b_id IN (SELECT id FROM doublons_identiques);

-- 2. Sous-classements : b est inclus dans a (au moins 95 % de ses athlètes, au moins 5) et
-- plus petit ; à taille égale, le « Championnat… » est le sous-classement de la course qui
-- l'accueille (Vichy 2024, Pontivy 2024).
CREATE TABLE sous_classements AS
SELECT
    b.id AS epreuve_id,
    a.id AS incluse_dans_id,
    b.name_epreuve AS nom_epreuve,
    b.format_initial,
    a.name_epreuve AS nom_incluse_dans,
    a.format_initial AS format_initial_incluse_dans,
    p.athletes_communs,
    b.participants
FROM paires p
JOIN epreuves_jour a ON a.id = p.a_id
JOIN epreuves_jour b ON b.id = p.b_id
WHERE b.participants >= 5
  AND p.athletes_communs >= 0.95 * b.participants
  AND (
    b.participants < a.participants
    OR (b.participants = a.participants
        AND b.name_epreuve LIKE 'Championnat%' AND a.name_epreuve NOT LIKE 'Championnat%')
  );

-- Seuls les résultats des athlètes présents dans la grande épreuve sont marqués : les autres
-- (au plus 5 %) restent comptés dans leur profil.
UPDATE results x
SET sous_classement = true
FROM sous_classements s
WHERE x.epreuve_id = s.epreuve_id
  AND EXISTS (
    SELECT 1 FROM results y
    WHERE y.epreuve_id = s.incluse_dans_id AND y.athlete_id = x.athlete_id
  );

DROP TABLE paires;
DROP TABLE doublons_identiques;
DROP TABLE epreuves_jour;
