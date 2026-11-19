-- Discipline et format des épreuves prolivesport.
--
-- Chez prolivesport, le nom d'une épreuve est libre (« Triathlon S », « XS Homme », « D3H »,
-- « 6-9 ans », « La bleue »…). Ces fonctions en déduisent une discipline et un format
-- comparables à ceux des autres sources. Elles sont appelées par raw_data.sql.

-- Disciplines citées dans un texte (nom d'épreuve ou d'événement).
-- « FF TRI » / « FFTRI » (la fédération) est ignoré ; « du » ne compte pour « duathlon » que
-- suivi d'un format (« Du M »), pour ne pas confondre avec l'article (« Tri du Roi »).
CREATE OR REPLACE FUNCTION prolivesport_named_disciplines(texte text)
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


-- Discipline d'une épreuve, ou NULL si l'épreuve n'est pas un enchaînement (course à pied,
-- natation seule, randonnée, épreuves « SUPP » ou de distance 998 / 999) : elle est exclue.
-- La première règle qui répond l'emporte :
--   1. une seule discipline citée dans le nom de l'épreuve ;
--   2. la catégorie de l'événement quand elle est précise (Bike&Run, Aquathlon, Cross Duathlon) ;
--   3. une seule discipline citée dans le nom de l'événement ;
--   4. la catégorie par défaut (« Triathlon - Duathlon » → duathlon, sinon triathlon).
-- « cross » dans le nom de l'épreuve (ou la catégorie Cross Duathlon) donne « cross triathlon »
-- ou « cross duathlon ».
CREATE OR REPLACE FUNCTION prolivesport_discipline(
    race text, event_name text, categorie text, distance text
)
RETURNS text AS $$
DECLARE
    race_words text[] := prolivesport_named_disciplines(race);
    event_words text[] := prolivesport_named_disciplines(event_name);
    km numeric := CASE WHEN pg_input_is_valid(distance, 'numeric') THEN distance::numeric END;
    is_cross boolean := lower(race) ~ 'cross' OR categorie = 'Triathlon - Cross Duathlon';
    result text;
BEGIN
    IF cardinality(race_words) = 0
       AND (lower(race) ~ 'marathon|semi|\m\d+([.,]\d+)? ?km?\M|run\M|rando|trail|marche|supp|swim\M'
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
-- le savoir. La première règle qui répond l'emporte :
--   1. relais (« relais », « relay », « RM » pour relais mixte) ;
--   2. épreuves jeunes (« 6-9 ans », Pupille, Poussin, Benjamin, ADO, CAF / MIH, « J 12-15 »…) ;
--   3. une lettre de format dans le nom (les codes de paratriathlon PTS…, PTWC… sont ignorés) ;
--   4. un mot connu : Super Sprint → XS, Sprint → S, Olympic / Standard → M,
--      70.3 / Half / 111 / 113 / Long → L, 226 / Ironman → XXL ;
--   5. pour le triathlon et le duathlon, la distance totale en km (seuils placés entre les
--      distances FFTri : XS 12,9, S 25,75, M 51,5, L ≈ 113, XL ≈ 153, XXL 226).
-- Quand la lettre du nom et la distance ne concordent pas (8 % des cas), la lettre l'emporte.
CREATE OR REPLACE FUNCTION prolivesport_format(race text, discipline text, distance text)
RETURNS text AS $$
DECLARE
    t text := regexp_replace(lower(unaccent(coalesce(race, ''))), '\mpts?\d[a-z0-9-]*|\mpt[a-z]*', ' ', 'g');
    km numeric := CASE WHEN pg_input_is_valid(distance, 'numeric') THEN distance::numeric END;
    letter text;
BEGIN
    IF t ~ 'relais|relay|\mrm\M' THEN
        RETURN 'RELAIS';
    END IF;

    IF t ~ ('\d+ ?-? ?\d* ?ans|pupille|poussin|benjamin|minime|cadet|\mado\M|jeune|kid|enfant'
            || '|\m(pu|po|be|mi|ca|ju)[fh]?\M|be-mi|\mj ?\d|\mj\M') THEN
        RETURN 'JEUNES';
    END IF;

    letter := substring(t from '\m(xxl|xl|xs|s|m|l)\M');
    IF letter IS NOT NULL THEN
        RETURN upper(letter);
    END IF;

    IF t ~ 'super ?sprint|starter' THEN RETURN 'XS'; END IF;
    IF t ~ 'sprint' THEN RETURN 'S'; END IF;
    IF t ~ 'olymp|standard|court' THEN RETURN 'M'; END IF;
    IF t ~ '70[.,]3|half|\m11[13]\M|long' THEN RETURN 'L'; END IF;
    IF t ~ '\m226\M|ironman' THEN RETURN 'XXL'; END IF;

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

    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Nom d'un événement prolivesport sans son année.
-- prolivesport écrit l'année dans le nom (« Triathlon Bray-Dunes 2022 », « Triathlon Open
-- Quiberon 2026 - Samedi ») : sans ce nettoyage, les éditions d'une même course n'ont pas le
-- même nom et ne sont pas reliées entre elles. L'année reste dans year_epreuve (elle y est
-- toujours égale, vérifié le 19/11/2026 sur les 232 noms qui la contiennent). Seule l'année de
-- l'édition est retirée ; les espaces et tirets laissés en trop sont nettoyés.
CREATE OR REPLACE FUNCTION prolivesport_event_name(event_name text, year text)
RETURNS text AS $$
DECLARE
    cleaned text := event_name;
BEGIN
    IF year IS NULL OR event_name IS NULL THEN
        RETURN event_name;
    END IF;
    cleaned := regexp_replace(cleaned, '(?<![0-9])' || year || '(?![0-9])', ' ', 'g');
    cleaned := regexp_replace(cleaned, '\s+-(\s+-)+\s+', ' - ', 'g');  -- « Douai  -  - Samedi »
    cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
    cleaned := btrim(cleaned, ' -');
    RETURN nullif(cleaned, '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
