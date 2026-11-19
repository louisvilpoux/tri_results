-- Épreuves présentes à la fois chez prolivesport et chez fftri_t2_area.
--
-- Une même épreuve peut être chronométrée par prolivesport et publiée par fftri_t2_area, sous
-- deux noms différents (« Triathlon Etaples » / « triathlon d etaples sur mer »). On la
-- reconnaît à ses participants : dates à un jour près (les deux sources ne datent pas toujours
-- l'épreuve le même jour, ex. Étaples 2024 : 31 août / 1er septembre) et au moins la moitié des
-- athlètes de la plus petite des deux épreuves en commun. Le 19/11/2026, les paires se
-- répartissaient nettement : 62 paires entre 80 et 100 % d'athlètes en commun (44 le même jour,
-- 18 à un jour d'écart), une à 30 %, toutes les autres sous 10 %.
--
-- On garde la version fftri_t2_area : sur ces doublons, 97 % de ses participants sont classés
-- (60 % chez prolivesport) et les temps prolivesport anciens sont parfois partiels (Étaples 2018 :
-- vainqueur à 00:30:23 chez prolivesport, 01:58:41 chez fftri_t2_area). Les épreuves prolivesport
-- en double sont retirées de results et races ; la table doublons_sources garde la trace des
-- paires retirées (avec les noms des deux versions).
--
-- Exécuté après results.sql et avant nb_races.sql (le nombre de courses ne compte plus les doublons).

CREATE TABLE doublons_sources AS
WITH epreuves AS (
    SELECT epreuve_id, COUNT(*) AS participants
    FROM results
    GROUP BY epreuve_id
),
communs AS (
    SELECT
        p.epreuve_id AS prolivesport_id,
        f.epreuve_id AS fftri_id,
        COUNT(*) AS athletes_communs
    FROM results p
    JOIN results f
      ON f.athlete_id = p.athlete_id
     AND abs(f.date_epreuve::date - p.date_epreuve::date) <= 1
    WHERE p.source = 'prolivesport' AND f.source = 'fftri_t2_area'
    GROUP BY p.epreuve_id, f.epreuve_id
)
SELECT
    c.prolivesport_id,
    c.fftri_id,
    rp.name_epreuve AS nom_prolivesport,
    rf.name_epreuve AS nom_fftri,
    rp.year_epreuve,
    c.athletes_communs,
    ep.participants AS participants_prolivesport,
    ef.participants AS participants_fftri
FROM communs c
JOIN epreuves ep ON ep.epreuve_id = c.prolivesport_id
JOIN epreuves ef ON ef.epreuve_id = c.fftri_id
JOIN races rp ON rp.id = c.prolivesport_id
JOIN races rf ON rf.id = c.fftri_id
WHERE c.athletes_communs >= 0.5 * LEAST(ep.participants, ef.participants);

-- Regroupement : les épreuves prolivesport qui restent (souvent XS, S, jeunes, relais, que
-- fftri_t2_area ne publie pas) prennent le nom fftri_t2_area de la course, pour être affichées
-- dans la même course que les épreuves fftri_t2_area. Le renommage vaut pour toutes les années
-- du nom prolivesport, afin de ne pas séparer ses éditions. Quand un nom prolivesport correspond
-- à plusieurs noms fftri_t2_area, on garde celui qui a le plus d'athlètes en commun.
CREATE TEMPORARY TABLE noms_regroupes AS
SELECT DISTINCT ON (nom_prolivesport) nom_prolivesport, nom_fftri
FROM doublons_sources
GROUP BY nom_prolivesport, nom_fftri
ORDER BY nom_prolivesport, SUM(athletes_communs) DESC, nom_fftri;

UPDATE races r
SET name_epreuve = n.nom_fftri
FROM noms_regroupes n
WHERE r.name_epreuve = n.nom_prolivesport
  AND EXISTS (
    SELECT 1 FROM results x WHERE x.epreuve_id = r.id AND x.source = 'prolivesport'
  );

UPDATE results x
SET name_epreuve = n.nom_fftri
FROM noms_regroupes n
WHERE x.source = 'prolivesport' AND x.name_epreuve = n.nom_prolivesport;

DROP TABLE noms_regroupes;

-- Retrait des épreuves prolivesport en double.
DELETE FROM results WHERE epreuve_id IN (SELECT prolivesport_id FROM doublons_sources);
DELETE FROM races WHERE id IN (SELECT prolivesport_id FROM doublons_sources);
