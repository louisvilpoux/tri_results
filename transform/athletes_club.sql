-- Club d'un athlète : celui de son résultat le plus récent qui donne un club (son club actuel).
--
-- Avant, la liste des athlètes et le profil prenaient chacun le club le plus fréquent parmi les
-- lignes `athletes`, sans ordre fixé en cas d'égalité. « VILPOUX Louis » a 3 lignes COURBEVOIE
-- TRIATHLON (2022) et 3 lignes WASQUEHAL TRIATHLON (2024-2025) : la liste affichait Courbevoie et
-- le profil Wasquehal. Le club de la course la plus récente est écrit sur toutes les lignes
-- `athletes` de l'athlète, comme le sexe (athletes_sexe.sql) : la liste et le profil affichent le
-- même, et c'est celui avec lequel l'athlète court aujourd'hui.
--
-- Le plus récent : date de l'épreuve, ou son année quand la source ne donne pas la date
-- (chronoweb) ; les résultats d'équipe ne comptent pas (leur club peut être un nom d'équipe).
-- Un athlète dont aucun résultat ne donne de club garde ses clubs d'origine (souvent vides).
--
-- Exécuté après doublons_sources.sql (les épreuves en double sont retirées).

UPDATE athletes a
SET club = recent.club
FROM (
    SELECT DISTINCT ON (athlete_id) athlete_id, club
    FROM results
    WHERE club IS NOT NULL AND NOT equipe
    ORDER BY athlete_id, COALESCE(date_epreuve, year_epreuve) DESC, club
) recent
WHERE a.unified_id = recent.athlete_id
  AND a.club IS DISTINCT FROM recent.club;
