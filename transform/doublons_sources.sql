-- Épreuves présentes à la fois chez fftri_t2_area et chez une autre source (prolivesport,
-- chronoweb).
--
-- Une même épreuve peut être chronométrée par prolivesport ou chronoweb et publiée par
-- fftri_t2_area, sous deux noms différents (« Triathlon Etaples » / « triathlon d etaples sur
-- mer », « Triathlon de Vouglans » / « triathlon jura vouglans »). On la reconnaît à ses
-- participants : dates à un jour près (les sources ne datent pas toujours l'épreuve le même
-- jour, ex. Étaples 2024 : 31 août / 1er septembre) et au moins la moitié des athlètes de la plus
-- petite des deux épreuves en commun. Les paires se répartissent nettement :
--   - prolivesport (19/11/2026) : 62 paires entre 80 et 100 % d'athlètes en commun, une à 30 %,
--     toutes les autres sous 10 % ;
--   - chronoweb (20/11/2026) : 48 paires entre 87 et 100 %, toutes les autres sous 14 %.
--
-- On garde la version fftri_t2_area : sur ces doublons, 97 % de ses participants sont classés
-- (60 % chez prolivesport, 84 % chez chronoweb) et les temps prolivesport anciens sont parfois
-- partiels (Étaples 2018 : vainqueur à 00:30:23 chez prolivesport, 01:58:41 chez
-- fftri_t2_area). Les épreuves en double sont retirées de results et races ; la table
-- doublons_sources garde la trace des paires retirées (avec la source et les noms des deux
-- versions).
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
        s.source,
        s.epreuve_id AS source_id,
        f.epreuve_id AS fftri_id,
        COUNT(*) AS athletes_communs
    FROM results s
    JOIN results f
      ON f.athlete_id = s.athlete_id
     AND abs(f.date_epreuve::date - s.date_epreuve::date) <= 1
    WHERE s.source IN ('prolivesport', 'chronoweb', 'protiming') AND f.source = 'fftri_t2_area'
    GROUP BY s.source, s.epreuve_id, f.epreuve_id
)
SELECT
    c.source,
    c.source_id,
    c.fftri_id,
    rs.name_epreuve AS nom_source,
    rf.name_epreuve AS nom_fftri,
    rs.year_epreuve,
    c.athletes_communs,
    es.participants AS participants_source,
    ef.participants AS participants_fftri
FROM communs c
JOIN epreuves es ON es.epreuve_id = c.source_id
JOIN epreuves ef ON ef.epreuve_id = c.fftri_id
JOIN races rs ON rs.id = c.source_id
JOIN races rf ON rf.id = c.fftri_id
WHERE c.athletes_communs >= 0.5 * LEAST(es.participants, ef.participants);

-- Regroupement : les épreuves de la source qui restent (souvent XS, S, jeunes, relais, que
-- fftri_t2_area ne publie pas) prennent le nom fftri_t2_area de la course, pour être affichées
-- dans la même course que les épreuves fftri_t2_area. Le renommage vaut pour toutes les années
-- du nom, afin de ne pas séparer ses éditions. Quand un nom correspond à plusieurs noms
-- fftri_t2_area, on garde celui qui a le plus d'athlètes en commun.
CREATE TEMPORARY TABLE noms_regroupes AS
SELECT DISTINCT ON (source, nom_source) source, nom_source, nom_fftri
FROM doublons_sources
GROUP BY source, nom_source, nom_fftri
ORDER BY source, nom_source, SUM(athletes_communs) DESC, nom_fftri;

UPDATE races r
SET name_epreuve = n.nom_fftri
FROM noms_regroupes n
WHERE r.name_epreuve = n.nom_source
  AND EXISTS (
    SELECT 1 FROM results x WHERE x.epreuve_id = r.id AND x.source = n.source
  );

UPDATE results x
SET name_epreuve = n.nom_fftri
FROM noms_regroupes n
WHERE x.source = n.source AND x.name_epreuve = n.nom_source;

DROP TABLE noms_regroupes;

-- Retrait des épreuves en double. Leur id stable (ids_epreuves.sql) redirige vers la version
-- fftri_t2_area gardée (celle qui a le plus d'athlètes en commun) : un lien vers l'épreuve
-- retirée mène à la bonne page.
INSERT INTO redirections (type, ancien_id, nouvel_id)
SELECT DISTINCT ON (source_id) 'epreuve', source_id, fftri_id
FROM doublons_sources
ORDER BY source_id, athletes_communs DESC, fftri_id
ON CONFLICT (type, ancien_id) DO UPDATE SET nouvel_id = EXCLUDED.nouvel_id;

DELETE FROM results WHERE epreuve_id IN (SELECT source_id FROM doublons_sources);
DELETE FROM races WHERE id IN (SELECT source_id FROM doublons_sources);
