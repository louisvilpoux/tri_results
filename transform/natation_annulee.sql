-- Natation probablement annulée : triathlon couru en duathlon (D14 du retour utilisateur du
-- 25/11/2026).
--
-- Quand la natation est annulée (eau trop froide, pollution), l'organisateur fait courir le
-- triathlon en duathlon et la source publie une épreuve « duathlon m ». Elle est rangée en
-- duathlon, sans explication : un athlète trouvait « Triathlon de Ardres » 2022 dans le filtre
-- Duathlon et en record « Duathlon · M ». À Ardres, 2021 avait un triathlon M (171 classés) et
-- un duathlon M (76) ; 2022 n'a qu'un duathlon M (328) ; 2023 de nouveau les deux.
--
-- La source ne dit pas que la natation a été annulée : c'est une déduction, affichée comme
-- probable. Règle : un duathlon d'un format (XS à XXL) sans triathlon de ce format la même année,
-- quand l'édition précédente et l'édition suivante de ce format, dans la même course, ont un
-- triathlon. Le 25/11/2026 : 15 épreuves (Deauville 2020 L et M, Sardines Titus 2021 M, Baie de
-- Somme 2018 M, Nevers 2022 M, Orléans Ile Charlemagne 2024 M, Val de Gray 2021 L et M…). Un
-- duathlon proposé chaque année à côté du triathlon (Pontivy L) n'est pas concerné : il a son
-- triathlon la même année. Une course devenue duathlon (Bray-Dunes XS depuis 2023) non plus :
-- l'édition suivante est aussi un duathlon.
--
-- Exécuté après doublons_sources.sql (épreuves définitives).

CREATE TEMPORARY TABLE editions AS
SELECT DISTINCT r.name_epreuve, r.format_epreuve, r.year_epreuve::int AS annee, r.type_epreuve
FROM races r
WHERE r.format_epreuve IN ('XS', 'S', 'M', 'L', 'XL', 'XXL')
  AND r.type_epreuve IN ('triathlon', 'duathlon')
  AND r.year_epreuve ~ '^\d{4}$'
  AND EXISTS (SELECT 1 FROM results x WHERE x.epreuve_id = r.id);

UPDATE races r
SET natation_annulee = true
FROM (
    SELECT d.name_epreuve, d.format_epreuve, d.annee
    FROM editions d
    WHERE d.type_epreuve = 'duathlon'
      AND NOT EXISTS (
          SELECT 1 FROM editions t
          WHERE t.name_epreuve = d.name_epreuve AND t.format_epreuve = d.format_epreuve
            AND t.annee = d.annee AND t.type_epreuve = 'triathlon'
      )
      -- édition précédente et édition suivante de ce format : un triathlon
      AND EXISTS (
          SELECT 1 FROM editions t
          WHERE t.name_epreuve = d.name_epreuve AND t.format_epreuve = d.format_epreuve
            AND t.type_epreuve = 'triathlon'
            AND t.annee = (
                SELECT max(p.annee) FROM editions p
                WHERE p.name_epreuve = d.name_epreuve AND p.format_epreuve = d.format_epreuve
                  AND p.annee < d.annee
            )
      )
      AND EXISTS (
          SELECT 1 FROM editions t
          WHERE t.name_epreuve = d.name_epreuve AND t.format_epreuve = d.format_epreuve
            AND t.type_epreuve = 'triathlon'
            AND t.annee = (
                SELECT min(s.annee) FROM editions s
                WHERE s.name_epreuve = d.name_epreuve AND s.format_epreuve = d.format_epreuve
                  AND s.annee > d.annee
            )
      )
) annulees
WHERE r.name_epreuve = annulees.name_epreuve
  AND r.format_epreuve = annulees.format_epreuve
  AND r.year_epreuve = annulees.annee::text
  AND r.type_epreuve = 'duathlon';

DROP TABLE editions;
