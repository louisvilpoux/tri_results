-- Noms d'athlètes affichés « NOM Prénom » partout (D18 du retour utilisateur du 25/11/2026).
--
-- Chaque source écrit le nom à sa façon : FFTRI « BELLET Jean francois » ou « WAGNER  Alexis »,
-- chronoweb « Jean-françois BELLET », prolivesport « Jean francois  BELLET » ou « JEAN FRANCOIS
-- BELLET » (prénom, deux espaces, nom). Le même athlète apparaissait sous deux formes entre son
-- profil et les classements, avec des espaces doubles.
--
-- Le nom de famille est la suite de mots tout en majuscules au début ou à la fin du nom : il est
-- mis devant, en majuscules, suivi du prénom avec une majuscule à chaque mot (« Jean-François »).
-- Un nom tout en majuscules garde son ordre, sauf chez prolivesport où les deux espaces séparent
-- le prénom du nom. Un nom sans mot en majuscules (« Raphael Crouzier ») ne dit pas où est le nom
-- de famille : seuls ses espaces sont nettoyés. Les équipes ne sont pas touchées.
--
-- Mise en forme d'affichage seulement : exécuté en fin de chaîne, après les scripts qui
-- retrouvent une ligne brute par son nom (homonymes.sql). raw_data garde le nom de la source.

CREATE OR REPLACE FUNCTION nom_affiche(nom text, prenom_puis_nom boolean)
RETURNS text AS $$
DECLARE
    mots text[];
    est_majuscule boolean[];
    debut int := 0;   -- mots en majuscules au début
    fin int := 0;     -- mots en majuscules à la fin
    n int;
    i int;
BEGIN
    IF nom IS NULL OR btrim(nom) = '' THEN
        RETURN nom;
    END IF;

    -- prolivesport « JEAN FRANCOIS  BELLET » : prénom, deux espaces, nom
    IF prenom_puis_nom AND position('  ' in btrim(nom)) > 0 THEN
        RETURN upper(regexp_replace(
                btrim(substring(btrim(nom) from position('  ' in btrim(nom)) + 2)), '\s+', ' ', 'g'
            ))
            || ' '
            || initcap(regexp_replace(btrim(split_part(btrim(nom), '  ', 1)), '\s+', ' ', 'g'));
    END IF;

    mots := regexp_split_to_array(btrim(nom), '\s+');
    n := cardinality(mots);
    -- mot du nom de famille : au moins deux lettres, aucune minuscule (« BELLET », « D'ALMEIDA »)
    est_majuscule := ARRAY(
        SELECT m = upper(m) AND m ~ '[[:alpha:]].*[[:alpha:]]' FROM unnest(mots) AS m
    );
    WHILE debut < n AND est_majuscule[debut + 1] LOOP
        debut := debut + 1;
    END LOOP;
    WHILE fin < n AND est_majuscule[n - fin] LOOP
        fin := fin + 1;
    END LOOP;

    IF debut = n OR (debut = 0 AND fin = 0) THEN
        RETURN array_to_string(mots, ' ');          -- tout en majuscules, ou aucun nom repéré
    END IF;
    IF debut > 0 THEN                               -- « BELLET Jean francois »
        RETURN array_to_string(mots[1:debut], ' ')
            || ' ' || initcap(array_to_string(mots[debut + 1:n], ' '));
    END IF;
    i := n - fin;                                   -- « Jean-françois BELLET »
    RETURN array_to_string(mots[i + 1:n], ' ') || ' ' || initcap(array_to_string(mots[1:i], ' '));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE results
SET nom_athlete = nom_affiche(nom_athlete, source = 'prolivesport')
WHERE NOT equipe
  AND nom_athlete IS DISTINCT FROM nom_affiche(nom_athlete, source = 'prolivesport');

-- athletes.nom (liste des athlètes, recherche) : la table ne dit pas de quelle source vient le
-- nom ; un nom tout en majuscules à deux espaces y garde son ordre.
UPDATE athletes
SET nom = nom_affiche(nom, false)
WHERE nom IS DISTINCT FROM nom_affiche(nom, false);
