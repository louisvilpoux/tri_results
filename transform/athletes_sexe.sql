-- Sexe d'un athlète : le plus fréquent (M ou F) dans ses résultats individuels, comme sur son
-- profil (api/main.py). Il est écrit sur toutes les lignes `athletes` de l'athlète, dont la
-- ligne de référence (id = unified_id) qu'utilise le filtre sexe de la liste des athlètes.
--
-- Avant, chaque ligne gardait le sexe de la ligne brute dont elle venait. La ligne de référence
-- pouvait ainsi venir d'un seul résultat mal renseigné : « MARTIN Nicolas » (125 résultats M)
-- apparaissait parmi les femmes à cause d'un résultat fftri_t2_area de catégorie « FH ».
-- Les valeurs autres que M et F (E, J, 1…, première lettre d'une catégorie fftri_t2_area)
-- sont ignorées ; sans résultat M ou F, le sexe est vide.
--
-- Exécuté après doublons_sources.sql (les résultats en double sont déjà retirés).

UPDATE athletes a
SET sexe = s.sexe
FROM (
    SELECT a2.unified_id, mode() WITHIN GROUP (ORDER BY x.sexe) AS sexe
    FROM athletes a2
    LEFT JOIN results x
      ON x.athlete_id = a2.unified_id AND NOT x.equipe AND x.sexe IN ('M', 'F')
    WHERE a2.id = a2.unified_id
    GROUP BY a2.unified_id
) s
WHERE a.unified_id = s.unified_id
  AND a.sexe IS DISTINCT FROM s.sexe;
