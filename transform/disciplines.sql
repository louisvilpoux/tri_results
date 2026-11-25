-- Discipline et format des épreuves dont la source ne les donne pas sous une forme normalisée.
--
-- Chez prolivesport, le nom d'une épreuve est libre (« Triathlon S », « XS Homme », « D3H »,
-- « 6-9 ans », « La bleue »…) ; chez chronoweb, c'est le nom de l'onglet du fichier Excel
-- (« Half Relais », « Benjamins », « Aquathlon 6-9 », « Détails CàP Half »…). Ces fonctions en
-- déduisent une discipline et un format comparables à ceux de fftri_t2_area. Elles sont
-- appelées par raw_data.sql. Les fonctions propres à prolivesport (nom d'événement, nom
-- d'équipe) sont en fin de fichier.

-- Disciplines citées dans un texte (nom d'épreuve ou d'événement).
-- « FF TRI » / « FFTRI » (la fédération) est ignoré ; « du » ne compte pour « duathlon » que
-- suivi d'un format (« Du M »), pour ne pas confondre avec l'article (« Tri du Roi »).
CREATE OR REPLACE FUNCTION epreuve_named_disciplines(texte text)
RETURNS text[] AS $$
DECLARE
    t text := regexp_replace(lower(unaccent(coalesce(texte, ''))), 'ff ?tri\M', ' ', 'g');
    found text[] := ARRAY[]::text[];
BEGIN
    IF t ~ 'swimrun' THEN found := array_append(found, 'swimrun'); END IF;
    IF t ~ 'aqua' THEN found := array_append(found, 'aquathlon'); END IF;
    IF t ~ 'bike ?(&|and)? ?run' THEN found := array_append(found, 'bike&run'); END IF;
    IF t ~ 'duathlon|duatlon|cross-du\M|\mdu (xs|s|m|l)\M' THEN found := array_append(found, 'duathlon'); END IF;
    IF t ~ 'tria|\mtri\M|triman|ironman' THEN found := array_append(found, 'triathlon'); END IF;
    RETURN found;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Discipline d'une épreuve, ou NULL si l'épreuve est exclue :
--   - ce n'est pas un enchaînement (course à pied, natation seule, randonnée, épreuves « SUPP »
--     ou de distance 998 / 999) ;
--   - c'est un enchaînement natation + vélo sans course à pied (« SWIMBIKE », « aquabike ») :
--     rangé en triathlon, il faussait les temps du format (Chtriman 2023 et 2024, Q20 de
--     l'audit du 25/11/2026) ; « Swim Bike Run » n'est pas concerné ;
--   - ce n'est pas un classement (chronoweb : onglets « Détails CàP / Vélo… », qui reprennent
--     les athlètes d'un autre onglet ; manches et séries intermédiaires « Manche 1 »,
--     « Speed Race Serie 2 », « Qualif Speed », dont le classement final est dans un autre
--     onglet : « Manche 1+2 », « Finale »).
-- La première règle qui répond l'emporte :
--   1. une seule discipline citée dans le nom de l'épreuve ;
--   2. la catégorie de l'événement quand elle est précise (Bike&Run, Aquathlon, Cross Duathlon) ;
--   3. une seule discipline citée dans le nom de l'événement ;
--   4. la catégorie par défaut (« Triathlon - Duathlon » → duathlon, sinon triathlon).
-- « cross » dans le nom de l'épreuve, un événement XTERRA ou la catégorie Cross Duathlon donnent
-- « cross triathlon » ou « cross duathlon ». categorie et distance sont NULL pour chronoweb.
CREATE OR REPLACE FUNCTION epreuve_discipline(
    race text, event_name text, categorie text, distance text
)
RETURNS text AS $$
DECLARE
    race_text text := lower(unaccent(coalesce(race, '')));
    race_words text[] := epreuve_named_disciplines(race);
    event_words text[] := epreuve_named_disciplines(event_name);
    km numeric := CASE WHEN pg_input_is_valid(distance, 'numeric') THEN distance::numeric END;
    is_cross boolean := race_text ~ 'cross'
        OR lower(coalesce(event_name, '')) ~ 'xterra'
        OR categorie = 'Triathlon - Cross Duathlon';
    result text;
BEGIN
    IF race_text ~ ('\mdetails?\M|\mma+nche \d\M(?! ?\+)|speed race serie|\mqualif') THEN
        RETURN NULL;
    END IF;

    IF race_text ~ '\m(swim|aqua) ?-?bike(?! ?[-&/+]? ?(and )?run)' THEN
        RETURN NULL;
    END IF;

    IF cardinality(race_words) = 0
       AND (race_text ~ 'marathon|semi|\m\d+([.,]\d+)? ?km?\M|run\M|rando|trail|marche|supp|swim\M'
            OR km >= 998) THEN
        RETURN NULL;
    END IF;

    IF cardinality(race_words) = 1 THEN
        result := race_words[1];
    ELSIF categorie = 'Triathlon - Bike&Run' THEN
        result := 'bike&run';
    ELSIF categorie = 'Triathlon - Aquathlon' THEN
        result := 'aquathlon';
    ELSIF categorie = 'Triathlon - Cross Duathlon' THEN
        result := 'duathlon';
    ELSIF cardinality(event_words) = 1 THEN
        result := event_words[1];
    ELSIF categorie = 'Triathlon - Duathlon' THEN
        result := 'duathlon';
    ELSE
        result := 'triathlon';
    END IF;

    IF is_cross AND result IN ('triathlon', 'duathlon') THEN
        result := 'cross ' || result;
    END IF;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Format d'une épreuve (XS, S, M, L, XL, XXL, JEUNES ou RELAIS), ou NULL si rien ne permet de
-- le savoir (chronoweb : « CD » d'Altriman, « Poursuite », « Super Tri », « Cross »…).
-- La première règle qui répond l'emporte :
--   1. relais : « relais », « relay », « RM » (relais mixte), « team », « équipes » ; « duo »
--      aussi (« Half Duo »), sauf en swimrun, qui se court toujours à deux ;
--   2. épreuves jeunes (« 6-9 ans », « 10-13 », Pupille, Poussin, Benjamin, Junior, ADO,
--      Altrikids, Tri Kid, Family, CAF / MIH, FBE / MCA, « J 12-15 »…) ;
--   3. une lettre de format dans le nom (les codes de paratriathlon PTS…, PTWC… et « S&M »,
--      seniors et masters, sont ignorés ; XXS et XXXS comptent pour XS) ;
--   4. un mot connu : Super Sprint / Découverte → XS, Sprint / Short → S,
--      Olympic / Standard / Medium → M, 70.3 / Half / 111 / 113 / Long → L,
--      226 / Ironman / Full / Altriman → XXL ;
--   5. pour le triathlon et le duathlon, la distance totale en km (seuils placés entre les
--      distances FFTri : XS 12,9, S 25,75, M 51,5, L ≈ 113, XL ≈ 153, XXL 226) ;
--   6. pour le bike & run, la distance écrite dans le nom (« 12km800 », « 4500m », « 6km »),
--      sinon celle donnée par prolivesport (Touquet 15 km, championnats de France 10 à 18,6 km ;
--      Q13 de l'audit du 25/11/2026). Seuils tirés des noms qui donnent lettre et distance :
--      « XS - 6000m », « XS - 8000m », « XS - 11km » ; « S - 12000m », « S - 14km »,
--      « S - 16km » ; « M - 22km500 ». Sous 6 km : épreuve jeunes (1 500, 3 000 et 4 500 m
--      sont des courses Mini-Poussins, Poussins, Pupilles, Benjamins dans les autres éditions
--      d'Orléans). Une épreuve dont tous les classés sont jeunes passe ensuite en JEUNES
--      (raw_data.sql).
-- Quand la lettre du nom et la distance ne concordent pas (8 % des cas), la lettre l'emporte.
-- Les catégories qui ouvrent une épreuve aux adultes ne la rendent pas « jeunes » (Q13) :
-- « Distance S - 12000m - A partir de Cadets », « Cadets-Juniors-Seniors 12000m » (Orléans).
-- « Famille » compte comme « family ».
CREATE OR REPLACE FUNCTION epreuve_format(race text, discipline text, distance text)
RETURNS text AS $$
DECLARE
    t text := regexp_replace(
        lower(unaccent(coalesce(race, ''))), '\mpts?\d[a-z0-9-]*|\mpt[a-z]*|\ms ?& ?m\M', ' ', 'g'
    );
    -- 0, 99.99, 998 et 999 : distances bouche-trou de prolivesport (Bike & Run de Marcq 2024
    -- « Defi », épreuves SUPP2, Val de Gâtine 2019 « Combine - General ») : inconnues
    km numeric := CASE
        WHEN pg_input_is_valid(distance, 'numeric')
             AND distance::numeric NOT IN (0, 99.99) AND distance::numeric < 998
        THEN distance::numeric
    END;
    letter text;
    jeunes text;
    km_nom text[];
BEGIN
    IF t ~ 'relais|relay|\mrm\M|\mteam\M|\mequipes?\M'
       OR (t ~ '\mduo\M' AND discipline IS DISTINCT FROM 'swimrun') THEN
        RETURN 'RELAIS';
    END IF;

    -- « à partir de Cadets » ouvre l'épreuve aux adultes ; une liste qui va jusqu'aux seniors
    -- ou vétérans aussi
    jeunes := regexp_replace(t, 'a partir d[eu]s? \S+', ' ', 'g');
    IF jeunes !~ '\mseniors?\M|\mveterans?\M'
       AND jeunes ~ ('\d+ ?-? ?\d* ?ans|pupille|poussin|benjamin|minime|cadet|junior|\mado\M|jeune'
            || '|kid|enfant|family|famille|\m(pu|po|be|mi|ca|ju)[fh]?\M|\m[fm](pu|po|be|mi|ca|ju)\M'
            || '|be-mi|\mj ?\d|\mj\M|^\D*\m([4-9]|1\d) ?[-_] ?([6-9]|1\d)\M\D*$') THEN
        RETURN 'JEUNES';
    END IF;

    IF t ~ '\mx{2,}s\M' THEN
        RETURN 'XS';
    END IF;
    letter := substring(t from '\m(xxl|xl|xs|s|m|l)\M');
    IF letter IS NOT NULL THEN
        RETURN upper(letter);
    END IF;

    IF t ~ 'super ?sprint|starter|decouverte' THEN RETURN 'XS'; END IF;
    IF t ~ 'sprint|\mshort\M' THEN RETURN 'S'; END IF;
    IF t ~ 'olymp|standard|court|medium' THEN RETURN 'M'; END IF;
    IF t ~ '70[.,]3|half|\m11[13]\M|long' THEN RETURN 'L'; END IF;
    IF t ~ '\m226\M|ironman|\mfull\M|altriman' THEN RETURN 'XXL'; END IF;

    IF discipline IN ('triathlon', 'duathlon') AND km IS NOT NULL THEN
        RETURN CASE
            WHEN km < 19 THEN 'XS'
            WHEN km < 38 THEN 'S'
            WHEN km < 80 THEN 'M'
            WHEN km < 135 THEN 'L'
            WHEN km < 190 THEN 'XL'
            ELSE 'XXL'
        END;
    END IF;

    IF discipline = 'bike&run' THEN
        -- « 12km800 » = 12,8 km, « 4km500 » = 4,5 km, « 6km », « 4500m »
        km_nom := regexp_match(t, '\m(\d+) ?km ?(\d{3})?');
        IF km_nom IS NOT NULL THEN
            km := km_nom[1]::numeric + coalesce(km_nom[2]::numeric / 1000, 0);
        ELSE
            km := coalesce((regexp_match(t, '\m(\d{3,5}) ?m\M'))[1]::numeric / 1000, km);
        END IF;
        IF km IS NOT NULL THEN
            RETURN CASE
                WHEN km < 6 THEN 'JEUNES'
                WHEN km < 12 THEN 'XS'
                WHEN km < 19 THEN 'S'
                ELSE 'M'
            END;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Nom d'un événement prolivesport sans son année ni son numéro d'édition.
-- prolivesport écrit l'année dans le nom (« Triathlon Bray-Dunes 2022 », « Triathlon Open
-- Quiberon 2026 - Samedi ») et parfois le numéro d'édition (« 38e Triathlon / Duathlon de
-- l'Audomarois », « 12e Triathlon et 6e Duathlon de Saint-Saulve »). Sans ce nettoyage, les
-- éditions d'une même course n'ont pas le même nom et ne sont pas reliées entre elles.
-- L'année reste dans year_epreuve (elle y est toujours égale, vérifié le 19/11/2026 sur les
-- 232 noms qui la contiennent) ; seule l'année de l'édition est retirée. Les numéros
-- d'édition (1er, 2e, 33ème…) sont retirés où qu'ils soient. Les espaces et tirets laissés en
-- trop sont nettoyés.
CREATE OR REPLACE FUNCTION prolivesport_event_name(event_name text, year text)
RETURNS text AS $$
DECLARE
    cleaned text := event_name;
BEGIN
    IF event_name IS NULL THEN
        RETURN NULL;
    END IF;
    IF year IS NOT NULL THEN
        cleaned := regexp_replace(cleaned, '(?<![0-9])' || year || '(?![0-9])', ' ', 'g');
    END IF;
    cleaned := regexp_replace(
        cleaned, '(?<![[:alnum:].])[0-9]+ ?(ère|ere|ème|eme|er|è|e)(?![[:alnum:]])', ' ', 'gi'
    );
    cleaned := regexp_replace(cleaned, '\s+-(\s+-)+\s+', ' - ', 'g');  -- « Douai  -  - Samedi »
    cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
    cleaned := btrim(cleaned, ' -');
    RETURN nullif(cleaned, '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Nom affiché d'une équipe prolivesport (bike&run, relais), ou NULL si la ligne est celle
-- d'une seule personne.
-- Le scraping écrit « prénom  nom » (deux espaces). Dans les bike&run et les relais,
-- prolivesport remplit ces champs de plusieurs façons (comptées le 19/11/2026) :
--   1. prénom vide ou « . », nom = nom d'équipe (« .  LES PELUCHOS ») → « LES PELUCHOS » ;
--   2. équipiers séparés par « / » ou « | » dans le prénom, nom d'équipe dans le nom
--      (« Cocquet Barnabe / Cochin Leo  GRAVELINES TRI ») → « Cocquet Barnabe & Cochin Leo
--      (GRAVELINES TRI) » ;
--   3. code court en majuscules dans le prénom, nom d'équipe dans le nom
--      (« MI  BRETAGNE 2 ») → « BRETAGNE 2 » ;
--   4. épreuves à deux (`is_pair` : bike&run, et épreuves « Duo » comme les Triath'Elles de
--      Gravelines 2017, Q21 de l'audit du 25/11/2026) : équipier 1 (« NOM Prénom ») dans le
--      prénom, équipier 2 dans le nom (« MEEUS Theo  MOREAU TEOPHANE ») → « MEEUS Theo &
--      MOREAU TEOPHANE » ;
--   sinon (prénom d'un seul mot, ou prénom composé dans un relais : « Laly  CHAOUCH »,
--   « Jean francois  DUHAMEL ») : une seule personne → NULL. La casse d'origine est gardée.
CREATE OR REPLACE FUNCTION prolivesport_team_name(nom text, is_pair boolean)
RETURNS text AS $$
DECLARE
    first_part text;
    second_part text;
BEGIN
    IF nom IS NULL OR position('  ' in nom) = 0 THEN
        RETURN NULL;
    END IF;
    first_part := btrim(split_part(nom, '  ', 1));
    second_part := btrim(regexp_replace(substring(nom from position('  ' in nom) + 2), '\s+', ' ', 'g'));

    IF first_part IN ('', '.') THEN
        RETURN second_part;
    END IF;
    IF first_part ~ '[/|]' THEN
        RETURN regexp_replace(first_part, '\s*[/|]\s*', ' & ', 'g')
            || CASE WHEN second_part <> '' THEN ' (' || second_part || ')' ELSE '' END;
    END IF;
    IF first_part ~ '^[A-Z]{1,3}[0-9]?$' THEN
        RETURN second_part;
    END IF;
    IF is_pair AND first_part ~ '\s' THEN
        RETURN first_part || ' & ' || second_part;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Nom affiché d'une équipe chronoweb (relais, bike&run).
-- Chez chronoweb, chaque ligne d'un relais ou d'un bike&run est une équipe (vérifié le
-- 20/11/2026 sur les 53 onglets concernés). Le fichier Excel donne, selon les épreuves :
--   1. les équipiers dans le nom, séparés par « / », et souvent le nom d'équipe dans le club
--      (« FLINOIS ANTHONY / PICHONNIER GUILLAUME », club « COT SENIOR ») →
--      « FLINOIS ANTHONY & PICHONNIER GUILLAUME (COT SENIOR) » ;
--   2. le nom d'équipe dans le nom et les équipiers dans le club (« Les Galope Chenaux »,
--      club « RIVET Adrien / HERBAUT Emrick / DALMON Baptiste ») → « Les Galope Chenaux ».
-- Les « / » en fin de liste (équipier absent : « BOURGEOIS Matthieu / BOURGEOIS Alexandre / »)
-- et les espaces en trop sont retirés. La casse d'origine est gardée.
CREATE OR REPLACE FUNCTION chronoweb_team_name(nom text, club text)
RETURNS text AS $$
DECLARE
    team text := btrim(regexp_replace(nom, '\s+', ' ', 'g'));
    label text := btrim(regexp_replace(club, '\s+', ' ', 'g'));
BEGIN
    IF team IS NULL OR team = '' THEN
        RETURN NULL;
    END IF;
    IF team !~ '/' THEN
        RETURN team;
    END IF;
    team := array_to_string(
        ARRAY(
            SELECT btrim(part)
            FROM unnest(string_to_array(team, '/')) AS part
            WHERE btrim(part) <> ''
        ),
        ' & '
    );
    IF label IS NOT NULL AND label <> '' AND label !~ '/' THEN
        team := team || ' (' || label || ')';
    END IF;
    RETURN team;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Discipline d'une épreuve protiming, ou NULL si l'épreuve est exclue.
-- protiming donne le type de l'événement (type_evenement : triathlon, duathlon, swim_run,
-- bike_and_run) et un nom d'épreuve libre (« Format M - Individuel », « Tri XS », « 3000m -
-- Pupilles », « Parcours SRBA Duo - 15km500 »). Règles, la première qui répond l'emporte :
--   1. épreuves d'un autre sport ou d'un seul sport proposées à côté de l'enchaînement :
--      exclues (« Marche Nordique 10km », « Urban Trail », « 5km course nature », « Nage en eaux
--      vives », « Distance Natation » du Triathlon Annette K., « Running 5-6ans », « VTT 7-9ans »,
--      challenges d'entreprises canoë / obstacles) ;
--   2. événement bike&run ou swimrun dont le nom d'épreuve ne cite aucune discipline : celle de
--      l'événement (« 3000m », « Run&Bike 12km », « Format S - Solo ») ; sans cette règle,
--      epreuve_discipline exclurait « 3000m » (une distance seule y est une course à pied) ;
--   3. sinon epreuve_discipline, avec le type duathlon comme catégorie par défaut (« Course
--      Enfants (6/9 ans) » d'un duathlon → duathlon ; « Cross Duathlon Pupilles » d'un bike&run
--      → cross duathlon).
CREATE OR REPLACE FUNCTION protiming_discipline(race text, event_name text, type_evenement text)
RETURNS text AS $$
DECLARE
    t text := lower(unaccent(coalesce(race, '')));
    race_words text[] := epreuve_named_disciplines(race);
BEGIN
    IF t ~ ('marche|trail|course nature|\mnage\M|eaux vives|^distance (natation|velo|course)'
            || '|^running|^vtt|inter-?entreprises|defi des entreprises') THEN
        RETURN NULL;
    END IF;
    IF cardinality(race_words) = 0 AND type_evenement = 'bike_and_run' THEN
        RETURN 'bike&run';
    END IF;
    IF cardinality(race_words) = 0 AND type_evenement = 'swim_run' THEN
        RETURN 'swimrun';
    END IF;
    RETURN epreuve_discipline(
        race, event_name,
        CASE WHEN type_evenement = 'duathlon' THEN 'Triathlon - Duathlon' END,
        NULL
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Nom affiché d'une équipe protiming, ou NULL si la ligne est celle d'une seule personne.
-- Chez protiming, chaque ligne d'un relais, d'un bike&run ou d'un swimrun en duo est une
-- équipe (vérifié le 23/11/2026) : la source met le nom d'équipe à la place du nom
-- (« Les Gloutons Secs », « VENDOME 6 », « Timeo/Lucas ») ; pour une équipe anonymisée,
-- sources/protiming_organize.py l'a remplacé par ses équipiers (« NOM1 & NOM2 »). Un swimrun
-- se court en duo sauf mention « Solo » ou « Individuel » dans le nom de l'épreuve.
-- Espaces en trop retirés ; la casse d'origine est gardée.
CREATE OR REPLACE FUNCTION protiming_team_name(
    nom text, discipline text, format text, race text
)
RETURNS text AS $$
    SELECT CASE
        WHEN discipline = 'bike&run'
             OR format = 'RELAIS'
             OR (discipline = 'swimrun' AND lower(unaccent(race)) !~ 'solo|individuel')
        THEN nullif(btrim(regexp_replace(nom, '\s+', ' ', 'g')), '')
    END
$$ LANGUAGE sql IMMUTABLE;
