-- Noms de course : un seul nom par course, et un nom lisible.
--
-- Les épreuves sont reliées en courses par leur nom exact. D'une édition à l'autre, ou d'une
-- source à l'autre, une même course peut pourtant être écrite différemment :
-- « Triathlon Bray-Dunes » / « Triathlon de Bray-Dunes », « Touquet Bike & Run » / « Bike & Run
-- Le Touquet », « Triathlon de l'Omois » / « Triathlon de L'omois », « Swimrun du Levézou » /
-- « Swimrun du levezou ». Sans ce nettoyage, ses éditions forment des courses séparées.
--
-- Trois étapes, sur les noms de raw_data :
--   1. les alias écrits à la main (table alias_courses ci-dessous), pour les cas que la règle
--      automatique ne peut pas voir ;
--   2. les noms tout en minuscules et sans accents (ceux de fftri_t2_area) sont mis en forme :
--      « triathlon d angouleme » → « Triathlon d'Angouleme » (les accents ne peuvent pas être
--      retrouvés) ;
--   3. les noms qui ont la même clé (nom_course_cle) sont ramenés à un seul : le plus lisible
--      (avec majuscules, puis avec accents, puis le plus fréquent).
--
-- Exécuté après raw_data.sql et avant races.sql.


-- Clé de regroupement d'un nom de course : ses mots en minuscules, sans accents ni ponctuation,
-- sans les petits mots (de, du, la, le, et, and…), ni « open », ni le jour quand un événement
-- est publié en deux parties (« Triathlon Open Quiberon - Samedi », « … - Epreuves du
-- Dimanche »), triés par ordre alphabétique. « St », « Ste » et « Sainte » comptent pour
-- « Saint » (« Duathlon de Saint Aldegonde » / « Duathlon de Sainte Aldegonde »).
-- « Touquet Bike and Run » et « Bike & Run Le Touquet » ont la même clé (« bike run touquet ») ;
-- « Triathlon Open de Cabourg » et « Triathlon Open Cabourg » aussi. La discipline reste dans
-- la clé : « Duathlon de Bray-Dunes » et « Triathlon de Bray-Dunes » restent deux courses.
-- Le 20/11/2026, cette règle formait une vingtaine de groupes, tous vérifiés comme une même course.
CREATE OR REPLACE FUNCTION nom_course_cle(nom text)
RETURNS text AS $$
    SELECT array_to_string(
        ARRAY(
            SELECT regexp_replace(
                regexp_replace(mot, '^(tri|du)athlons$', '\1athlon'),
                '^(st|ste|sainte)$', 'saint'
            )
            FROM regexp_split_to_table(lower(unaccent(nom)), '[^a-z0-9]+') AS mot
            WHERE mot <> ''
              AND mot NOT IN ('de', 'du', 'des', 'd', 'la', 'le', 'les', 'l', 'et', 'en', 'a',
                              'au', 'aux', 'sur', 'and', 'open',
                              'epreuves', 'vendredi', 'samedi', 'dimanche')
            ORDER BY 1
        ),
        ' '
    )
$$ LANGUAGE sql IMMUTABLE;


-- Nom en minuscules mis en forme : majuscule à chaque mot (« saint-pardoux » → « Saint-Pardoux »),
-- sauf aux petits mots après le premier (de, du, la…), et apostrophe remise après d et l
-- (« d angouleme » → « d'Angouleme »).
CREATE OR REPLACE FUNCTION nom_course_lisible(nom text)
RETURNS text AS $$
DECLARE
    mots text[] := string_to_array(btrim(regexp_replace(nom, '\s+', ' ', 'g')), ' ');
    resultat text := '';
    mot text;
    separateur text := '';
BEGIN
    IF nom IS NULL THEN
        RETURN NULL;
    END IF;
    FOR i IN 1 .. coalesce(cardinality(mots), 0) LOOP
        mot := mots[i];
        IF mot IN ('d', 'l') AND i < cardinality(mots) THEN
            resultat := resultat || separateur || CASE WHEN i = 1 THEN upper(mot) ELSE mot END;
            separateur := '''';
            CONTINUE;
        END IF;
        IF i > 1 AND mot IN ('de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'sur', 'au', 'aux') THEN
            resultat := resultat || separateur || mot;
        ELSE
            resultat := resultat || separateur || initcap(mot);
        END IF;
        separateur := ' ';
    END LOOP;
    RETURN resultat;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 1. Alias : noms d'une même course que la règle automatique ne relie pas (le lieu ou un
-- championnat accueilli est ajouté au nom certaines années). Un alias s'applique à tous les
-- noms qui ont la même clé que lui. Pour ajouter un cas : une ligne (alias, nom gardé).
CREATE TEMPORARY TABLE alias_courses (alias text, nom_garde text);
INSERT INTO alias_courses (alias, nom_garde) VALUES
    -- Arques ; 2017 : finale D3 des championnats de France des clubs
    ('Triathlon / Duathlon de l''Audomarois - Arques', 'Triathlon & Duathlon de l''Audomarois'),
    ('Triathlon de l''audomarois - Arques', 'Triathlon & Duathlon de l''Audomarois'),
    ('Triathlon et Duathlon de l''Audomarois - Finale Championnats de France des Clubs '
     || 'Triathlon Division 3', 'Triathlon & Duathlon de l''Audomarois'),
    -- Gravelines
    ('La Triath''Elles', 'Triath''Elles - Gravelines'),
    ('ch triman gravelines', 'Chtriman - Gravelines'),
    ('Chtriman - Courtes Distances - Samedi', 'Chtriman - Gravelines'),
    ('Chtriman Gravelines - Courtes Distances - Samedi', 'Chtriman - Gravelines'),
    -- Le Touquet
    ('Bike&Run Le Touquet Paris Plage', 'Touquet Bike & Run'),
    ('Touquet Bike&Run Pas de Calais', 'Touquet Bike & Run'),
    -- Quiberon
    ('Les triathlons Open de la presqu''ile de Quiberon', 'Triathlon de Quiberon'),
    ('Triath’elles', 'Triath''Elles - Gravelines'),
    -- le duathlon de Noyon accueille chaque année un championnat différent
    ('Duathlon Noyon - Support Championnats Hauts-de-France', 'Duathlon de Noyon'),
    ('Duathlon Noyon - Support 1-2 Finale Championnats de France des Clubs de D3 Zone Nord',
     'Duathlon de Noyon'),
    ('Grand Prix Duathlon FF TRI - Etape 5 - Noyon - Finale Championnats de France des Clubs '
     || 'de Duathlon Division 1 et Finale D2F/D3H, Duathlon Noyon Championnats de Picardie',
     'Duathlon de Noyon'),
    ('Championnats de France FF TRI Duathlon Individuel S et Jeunes - Noyon', 'Duathlon de Noyon'),
    ('Championnats de France FF TRI Duathlon Individuel S - Noyon', 'Duathlon de Noyon'),
    ('Championnats de France FF TRI Duathlon Jeunes - Noyon', 'Duathlon de Noyon'),
    -- Sainte Aldegonde (sainte patronne de Maubeuge) ; la source écrit « Pays de mormal »
    ('Duathlon de Sainte Aldegonde - Pays de mormal',
     'Duathlon de Sainte Aldegonde - Pays de Mormal');

-- Les étapes travaillent sur la liste des noms distincts (nom_initial → nom), appliquée à
-- raw_data à la fin.
CREATE TEMPORARY TABLE noms AS
SELECT name_epreuve AS nom_initial, name_epreuve AS nom, COUNT(*) AS lignes
FROM raw_data
WHERE name_epreuve IS NOT NULL
GROUP BY name_epreuve;

UPDATE noms n
SET nom = a.nom_garde
FROM alias_courses a
WHERE nom_course_cle(n.nom) = nom_course_cle(a.alias);

DROP TABLE alias_courses;


-- 2. Noms tout en minuscules (ceux de fftri_t2_area) mis en forme.
UPDATE noms
SET nom = nom_course_lisible(nom)
WHERE nom = lower(nom);


-- 3. Un seul nom par clé : celui avec des majuscules, puis avec des accents, puis le plus
-- fréquent.
CREATE TEMPORARY TABLE noms_canoniques AS
WITH par_nom AS (
    SELECT nom, nom_course_cle(nom) AS cle, SUM(lignes) AS lignes
    FROM noms
    GROUP BY nom
)
SELECT DISTINCT ON (cle) cle, nom AS nom_garde
FROM par_nom
ORDER BY
    cle,
    nom ~ '[[:upper:]]' DESC,
    nom <> unaccent(nom) DESC,
    lignes DESC,
    nom;

UPDATE noms n
SET nom = c.nom_garde
FROM noms_canoniques c
WHERE nom_course_cle(n.nom) = c.cle;

DROP TABLE noms_canoniques;


-- nom_source garde le nom publié : l'id stable d'une épreuve en dépend (ids_epreuves.sql), pas
-- des règles de regroupement, qui peuvent changer.
UPDATE raw_data r
SET name_epreuve = n.nom, nom_source = r.name_epreuve
FROM noms n
WHERE r.name_epreuve = n.nom_initial
  AND n.nom <> n.nom_initial;

DROP TABLE noms;
