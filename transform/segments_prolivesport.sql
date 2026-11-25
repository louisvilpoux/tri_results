-- Segments décalés : vidés quand leur somme ne correspond pas au temps total (prolivesport), ou
-- quand une transition est plus longue que le vélo pour la plupart des classés (toutes sources).
--
-- Chez prolivesport, les colonnes de temps intermédiaires sont parfois décalées : T1 de
-- 00:31:45 et vélo de 00:18:39 pour un total de 00:58:36 (Triathlon des Moines 2021 S, 1er),
-- natation égale au total (Moines 2024 XS), vélo de 00:00:32 (Sartrouville 2026 Jeunes). Le
-- 20/11/2026, sur 48 289 lignes prolivesport avec un total et les 5 segments, 9 630 (109
-- épreuves) avaient une somme des segments à plus de 5 % du total ; fftri_t2_area et chronoweb
-- sont cohérents dans environ 98 % des lignes.
--
-- Le décalage touche surtout une épreuve entière : sur les épreuves d'au moins 5 lignes
-- vérifiables, 169 en ont moins de 10 % d'incohérentes et 98 plus de 90 %, presque rien entre
-- les deux. Deux règles :
--   - une ligne avec un total et 5 segments dont la somme s'écarte de plus de 5 % du total perd
--     ses segments ;
--   - dans une épreuve dont au moins la moitié des lignes vérifiables sont incohérentes, toutes
--     les lignes perdent leurs segments, y compris celles qui ne peuvent pas être vérifiées
--     (Moines 2021 S, 7e : natation 00:00:01, T2 absent, vélo 01:02:42). La page de classement
--     n'affiche alors que le temps total.
-- Le total et le classement sont gardés ; raw_data garde les valeurs de la source.
--
-- Exécuté après temps_totaux.sql.

CREATE TEMPORARY TABLE segments_verifies AS
SELECT
    id,
    epreuve_id,
    abs(extract(epoch FROM
        total_time::interval
        - (swim_time::interval + t1_time::interval + bike_time::interval
           + t2_time::interval + run_time::interval)
    )) > 0.05 * extract(epoch FROM total_time::interval) AS incoherent
FROM results
WHERE source = 'prolivesport'
  AND total_time ~ '^\d{2}:\d{2}:\d{2}$'
  AND swim_time ~ '^\d{2}:\d{2}:\d{2}$' AND t1_time ~ '^\d{2}:\d{2}:\d{2}$'
  AND bike_time ~ '^\d{2}:\d{2}:\d{2}$' AND t2_time ~ '^\d{2}:\d{2}:\d{2}$'
  AND run_time ~ '^\d{2}:\d{2}:\d{2}$';

CREATE TEMPORARY TABLE epreuves_decalees AS
SELECT epreuve_id
FROM segments_verifies
GROUP BY epreuve_id
HAVING AVG(incoherent::int) >= 0.5;

UPDATE results
SET swim_time = NULL, t1_time = NULL, bike_time = NULL, t2_time = NULL, run_time = NULL,
    segments_retires = num_nonnulls(swim_time, t1_time, bike_time, t2_time, run_time) > 0
WHERE id IN (SELECT id FROM segments_verifies WHERE incoherent)
   OR epreuve_id IN (SELECT epreuve_id FROM epreuves_decalees);

DROP TABLE segments_verifies, epreuves_decalees;


-- Segments décalés dont la somme donne pourtant le total (D12 du retour utilisateur du
-- 25/11/2026), toutes sources. Au Duathlon Lomme 2025 et 2026 S (prolivesport), le 1er a
-- « T1 00:14:19 », « Vélo 00:09:28 », « T2 00:14:16 » : le vélo est découpé en tours rangés dans
-- les colonnes de transition. La somme des segments égale le total, la règle précédente ne le
-- voit pas. Une transition plus longue que le vélo n'arrive pas pour un finisher ; quand c'est
-- le cas de plus de la moitié des classés d'une épreuve, ses colonnes ne sont pas celles qu'elles
-- disent être, et tous ses segments sont retirés. Le 25/11/2026 : 18 épreuves, de 4 sources
-- (Lomme 2025 et 2026 S, Quiberon 2025 XS, Ironman de Nice 2019 avec des transitions de 8 h,
-- Jura Vouglans 2011 et 2013 L avec un vélo de 3 min, relais militaire de Brive 2023…). Les
-- épreuves où seuls quelques classés ont une longue transition (crevaison comptée en T2 ?) ne
-- sont pas touchées.
CREATE TEMPORARY TABLE epreuves_transitions_longues AS
SELECT epreuve_id
FROM results
WHERE clt > 0 AND clt < 99990 AND NOT temps_suspect
  AND bike_time ~ '^\d{2}:\d{2}:\d{2}$' AND bike_time <> '00:00:00'
  AND t1_time ~ '^\d{2}:\d{2}:\d{2}$' AND t2_time ~ '^\d{2}:\d{2}:\d{2}$'
GROUP BY epreuve_id
HAVING AVG((greatest(t1_time::interval, t2_time::interval) > bike_time::interval)::int) > 0.5;

UPDATE results
SET swim_time = NULL, t1_time = NULL, bike_time = NULL, t2_time = NULL, run_time = NULL,
    segments_retires = true
WHERE epreuve_id IN (SELECT epreuve_id FROM epreuves_transitions_longues)
  AND num_nonnulls(swim_time, t1_time, bike_time, t2_time, run_time) > 0;

DROP TABLE epreuves_transitions_longues;
