CREATE OR REPLACE FUNCTION safe_extract_year(date_str text) 
RETURNS text AS $$
BEGIN
    -- Tente la conversion standard
    RETURN TO_CHAR(to_date(date_str, 'DD/MM/YYYY'), 'YYYY');
EXCEPTION WHEN others THEN
    -- En cas d'erreur de format, renvoie NULL (ou une valeur par défaut)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Lieu d'une épreuve, au même format pour toutes les sources : « Ville (code postal) », ou
-- « Ville » sans code postal. Les sources l'écrivent chacune à sa façon :
--   - fftri_t2_area : « SAINT PIERRE (97410) » ;
--   - prolivesport : « 62610 ARDRES 62 - Pas-de-Calais France », « nan Ardres nan France »
--     (« nan » : valeur vide au scraping), « nan nan nan nan » ;
--   - chronoweb : texte libre (« Les angles », « chateau-thierry », « Lac de St Pardoux »).
-- Une ville tout en majuscules ou tout en minuscules reçoit des majuscules initiales ; les petits
-- mots (de, la, sur, en…) restent en minuscules sauf en tête : « LA ROCHE SUR YON (85000) » →
-- « La Roche sur Yon (85000) ». Les lieux restés différents d'une source à l'autre se corrigent
-- dans transform/lieux_courses.csv (voir lieux.sql).
CREATE OR REPLACE FUNCTION lieu_lisible(lieu text)
RETURNS text AS $$
DECLARE
    texte text;
    ville text;
    code_postal text;
    morceaux text[];
    resultat text := '';
BEGIN
    -- « nan » et espaces en trop retirés
    texte := btrim(regexp_replace(
        regexp_replace(COALESCE(lieu, ''), '(^|\s)nan(?=\s|$)', ' ', 'gi'), '\s+', ' ', 'g'
    ));
    IF texte = '' THEN
        RETURN NULL;
    END IF;

    IF texte ~ '^.+ \(\d{5}\)$' THEN
        -- fftri_t2_area : « Ville (code postal) »
        ville := substring(texte FROM '^(.+) \(\d{5}\)$');
        code_postal := substring(texte FROM '\((\d{5})\)$');
    ELSIF texte ~ '^\d{5} .+ (\d{2,3}|2A|2B) - ' THEN
        -- prolivesport : « code postal Ville département - nom du département pays »
        code_postal := substring(texte FROM '^(\d{5}) ');
        ville := substring(texte FROM '^\d{5} (.+?) (?:\d{2,3}|2A|2B) - ');
    ELSIF texte ~ ' (\d{2,3}|2A|2B) - ' THEN
        -- prolivesport sans code postal : « Ville département - nom du département pays »
        ville := substring(texte FROM '^(.+?) (?:\d{2,3}|2A|2B) - ');
    ELSE
        -- prolivesport sans département (« Ardres France ») et texte libre (chronoweb)
        ville := regexp_replace(texte, ' France$', '');
    END IF;

    IF ville = upper(ville) OR ville = lower(ville) THEN
        ville := initcap(ville);
    END IF;
    -- petits mots en minuscules, sauf le premier (« La Roche-Sur-Yon » → « La Roche-sur-Yon »)
    morceaux := regexp_split_to_array(ville, '(?=[ -])|(?<=[ -])');
    FOR i IN 1 .. cardinality(morceaux) LOOP
        IF i > 1 AND lower(morceaux[i]) IN ('de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous',
                                            'en', 'et', 'aux', 'au', 'lès', 'lez') THEN
            resultat := resultat || lower(morceaux[i]);
        ELSE
            resultat := resultat || morceaux[i];
        END IF;
    END LOOP;

    -- élision après le premier mot : « Saint-Georges-D'Oléron » → « Saint-Georges-d'Oléron »
    resultat := regexp_replace(resultat, '([ -])D''', '\1d''', 'g');
    resultat := regexp_replace(resultat, '([ -])L''', '\1l''', 'g');
    RETURN resultat || COALESCE(' (' || code_postal || ')', '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sexe lu dans la catégorie (fftri_t2_area, chronoweb, protiming) : la lettre M ou F qui
-- l'ouvre, après le rang que chronoweb colle parfois devant (« 14/MV3 » → M, « 1/FSE » → F).
-- Avant, le sexe était le premier caractère de la catégorie : « 14/MV3 » donnait « 1 », et
-- 31 789 lignes chronoweb (62 %) n'avaient pas de sexe utilisable (Q15, audit du 22/11/2026).
-- Les catégories qui commencent par M sans désigner les hommes n'en donnent pas : mixte
-- (« MIXT », « MIX »), « MASTERS », « MA », minimes (« MI », « MINC »). Sans M ni F
-- (« ELM », « JU », « 40-44 »…), le sexe est vide.
CREATE OR REPLACE FUNCTION sexe_categorie(cat text)
RETURNS text AS $$
    SELECT CASE
        WHEN c ~ '^(MIX|MASTER|MA$|MI$|MIN)' THEN NULL
        ELSE substring(c FROM '^([MF])')
    END
    FROM (SELECT regexp_replace(upper(btrim(cat)), '^\d+/', '') AS c) categorie
$$ LANGUAGE sql IMMUTABLE;

-- Temps chronoweb au format hh:mm:ss, comme les autres sources.
-- chronoweb lit des cellules Excel : un temps y vaut « 01:29:09 », ou « 01:29:09.357000 » quand
-- la cellule garde les fractions de seconde (17 % des temps totaux, le 20/11/2026). Les
-- fractions sont tronquées : « 01:29:09.357000 » → « 01:29:09 », comme un chronomètre qui
-- affiche les secondes écoulées. Sont vidés : « ? » (temps inconnu) et les cellules qui
-- contiennent une date Excel (« 1899-12-30 23:51:32.910000 », 39 temps intermédiaires
-- d'Aquathlon de Limoges 2017 et du Triathlon de Toulouse : écarts négatifs, pas des durées).
CREATE OR REPLACE FUNCTION chronoweb_temps(temps text)
RETURNS text AS $$
    SELECT substring(btrim(temps) FROM '^(\d{2,3}:\d{2}:\d{2})(\.\d+)?$')
$$ LANGUAGE sql IMMUTABLE;

INSERT INTO raw_data (clt, clt_f, temps, nom, club, cat, clt_cat, 
id_league, league, détails, rang_global, rang_sexe, 
rang_categorie, categorie, indice_performance, indice_performance_reference, 
total_time, swim_time, rang_swim, rang_course_swim, indice_performance_swim, 
t1_time, rang_t1, rang_course_t1, indice_performance_t1, 
bike_time, rang_bike, rang_course_bike, indice_performance_bike, 
t2_time, rang_t2, rang_course_t2, indice_performance_t2, 
run_time, rang_run, rang_course_run, indice_performance_run,
name_epreuve, format_epreuve, year_epreuve, date_epreuve, lieu_epreuve,
scraped_at, source, sexe, type_epreuve, format_normalise)

SELECT 
CASE WHEN pg_input_is_valid(clt, 'integer') THEN clt::integer ELSE NULL END AS clt, 
null as clt_f, temps, nom, club, cat, null as clt_cat, 
null as id_league, null as league, détails, clt as rang_global, null as rang_sexe, 
null as rang_categorie, cat as categorie, null as indice_performance, null as indice_performance_reference, 
temps as total_time, swim as swim_time, null as rang_swim, null as rang_course_swim, null as indice_performance_swim, 
t1 as t1_time, null as rang_t1, null as rang_course_t1, null as indice_performance_t1, 
bike as bike_time, null as rang_bike, null as rang_course_bike, null as indice_performance_bike, 
t2 as t2_time, null as rang_t2, null as rang_course_t2, null as indice_performance_t2, 
run as run_time, null as rang_run, null as rang_course_run, null as indice_performance_run,
-- lieu lu dans l'en-tête de la page de l'épreuve (« SAINT PIERRE (97410) », voir
-- sources/fftri_t2_area_lieux.py)
name_epreuve, format_epreuve, year_epreuve, date_epreuve, lieu_lisible(lieu_epreuve) as lieu_epreuve,
scraped_at, 'fftri_t2_area' as source, sexe_categorie(cat) as sexe,
null as type_epreuve, null as format_normalise
FROM raw_fftri_t2_area_0
-- épreuves contre-la-montre exclues, comme pour toutes les sources (voir prolivesport)
WHERE format_epreuve !~* '\mclm\M'
UNION ALL
SELECT 
CASE WHEN pg_input_is_valid(clt, 'integer') THEN clt::integer ELSE NULL END AS clt,
null as clt_f, temps, nom, club, cat, clt_cat,
null as id_league, null as league, "détails", clt as rang_global, rang_sexe,
clt_cat as rang_categorie, cat as categorie, null as indice_performance, null as indice_performance_reference,
temps as total_time, swim as swim_time, ((regexp_match(swim, '\((\d+)e\)'))[1]) as rang_swim, null as rang_course_swim, null as indice_performance_swim,
t1 as t1_time, ((regexp_match(t1, '\((\d+)e\)'))[1]) as rang_t1, null as rang_course_t1, null as indice_performance_t1,
bike as bike_time, ((regexp_match(bike, '\((\d+)e\)'))[1]) as rang_bike, null as rang_course_bike, null as indice_performance_bike,
t2 as t2_time, ((regexp_match(t2, '\((\d+)e\)'))[1]) as rang_t2, null as rang_course_t2, null as indice_performance_t2,
run as run_time, ((regexp_match(run, '\((\d+)e\)'))[1]) as rang_run, null as rang_course_run, null as indice_performance_run,
-- l'année est retirée du nom pour relier les éditions (elle reste dans year_epreuve)
prolivesport_event_name(name_epreuve, year_epreuve) as name_epreuve, format_epreuve, year_epreuve,
date_epreuve::date::text as date_epreuve, lieu_lisible(lieu_epreuve) as lieu_epreuve,
scraped_at, 'prolivesport' as source,
-- prolivesport fournit le sexe (M, F, X pour les équipes mixtes) ; sa colonne cat contient
-- des catégories (SE, MA, VE…) dont la première lettre n'est pas le sexe.
CASE WHEN sexe IN ('M', 'F') THEN sexe END as sexe,
d.discipline as type_epreuve,
epreuve_format(format_epreuve, d.discipline, distance) as format_normalise
from raw_prolivesport_0
CROSS JOIN LATERAL (
    SELECT epreuve_discipline(format_epreuve, name_epreuve, categorieevent, distance) AS discipline
) d
-- discipline NULL : épreuve d'un autre sport (course à pied, natation seule…), exclue
WHERE d.discipline IS NOT NULL
-- épreuves contre-la-montre (« CLM », « CLM S ») exclues de toutes les sources : prolivesport y
-- renvoie des colonnes de temps décalées (ex. Villeneuve d'Ascq 2019 : temps total de 00:09:22)
AND format_epreuve !~* '\mclm\M'
UNION ALL
SELECT 
CASE WHEN pg_input_is_valid(clt, 'integer') THEN clt::integer ELSE NULL END AS clt, 
null as clt_f, chronoweb_temps(temps) as temps, nom, club, cat, null as clt_cat,
null as id_league, null as league, "détails", clt as rang_global, null as rang_sexe,
null as rang_categorie, cat as categorie, null as indice_performance, null as indice_performance_reference,
chronoweb_temps(temps) as total_time, chronoweb_temps(swim) as swim_time, null as rang_swim, null as rang_course_swim, null as indice_performance_swim,
chronoweb_temps(t1) as t1_time, null as rang_t1, null as rang_course_t1, null as indice_performance_t1,
chronoweb_temps(bike) as bike_time, null as rang_bike, null as rang_course_bike, null as indice_performance_bike,
chronoweb_temps(t2) as t2_time, null as rang_t2, null as rang_course_t2, null as indice_performance_t2,
chronoweb_temps(run) as run_time, null as rang_run, null as rang_course_run, null as indice_performance_run,
name_epreuve, format_epreuve, year_epreuve,
date_epreuve, lieu_lisible(lieu_epreuve) as lieu_epreuve,
scraped_at, 'chronoweb' as source, sexe_categorie(cat) as sexe,
-- format_epreuve est le nom de l'onglet Excel (« Half Relais », « Benjamins », « Aquathlon
-- 6-9 »…) : discipline et format en sont déduits comme pour prolivesport (voir disciplines.sql)
d.discipline as type_epreuve,
epreuve_format(format_epreuve, d.discipline, null) as format_normalise
FROM raw_chronoweb_0
CROSS JOIN LATERAL (
    SELECT epreuve_discipline(format_epreuve, name_epreuve, null, null) AS discipline
) d
WHERE name_epreuve is not null
-- discipline NULL : onglet qui n'est pas un classement (détails, manches) ou autre sport
AND d.discipline IS NOT NULL
-- lignes sans nom (un espace) : ni athlète ni équipe, elles créaient un profil vide
AND btrim(nom) <> ''
-- épreuves contre-la-montre exclues, comme pour toutes les sources (voir prolivesport)
AND format_epreuve !~* '\mclm\M'
UNION ALL
SELECT 
CASE WHEN pg_input_is_valid(clt, 'integer') THEN clt::integer ELSE NULL END AS clt, 
null as clt_f, temps, nom, club, cat, null as clt_cat,
null as id_league, null as league, "détails", clt as rang_global, null as rang_sexe,
null as rang_categorie, cat as categorie, null as indice_performance, null as indice_performance_reference,
temps as total_time, swim as swim_time, null as rang_swim, null as rang_course_swim, null as indice_performance_swim,
t1 as t1_time, null as rang_t1, null as rang_course_t1, null as indice_performance_t1,
bike as bike_time, null as rang_bike, null as rang_course_bike, null as indice_performance_bike,
t2 as t2_time, null as rang_t2, null as rang_course_t2, null as indice_performance_t2,
run as run_time, null as rang_run, null as rang_course_run, null as indice_performance_run,
-- protiming (sources/protiming.py, nouveau site, 23/11/2026). Le nom de l'événement garde
-- parfois l'année (« Triathlon du Brin d'Amour 2016 ») : retirée comme chez prolivesport.
prolivesport_event_name(name_epreuve, to_char(to_date(date_epreuve, 'DD/MM/YYYY'), 'YYYY')) as name_epreuve,
format_epreuve, to_char(to_date(date_epreuve, 'DD/MM/YYYY'), 'YYYY') as year_epreuve,
-- date écrite JJ/MM/AAAA par le scraping, AAAA-MM-JJ comme les autres sources
to_date(date_epreuve, 'DD/MM/YYYY')::text as date_epreuve,
-- « Bordeaux (33) » : le numéro entre parenthèses est le département, pas le code postal ; il
-- est retiré pour que la ville soit reconnue comme celle des autres sources (voir lieux.sql)
lieu_lisible(regexp_replace(lieu_epreuve, '\s*\((\d{2,3}|2A|2B)\)$', '')) as lieu_epreuve,
scraped_at, 'protiming' as source,
-- protiming donne le sexe (M ou F) ; dans ses catégories (« S2M », « V1F », « SEM »), la
-- lettre du sexe est à la fin et sexe_categorie ne la lirait pas.
CASE WHEN sexe IN ('M', 'F') THEN sexe END as sexe,
d.discipline as type_epreuve,
epreuve_format(format_epreuve, d.discipline, null) as format_normalise
from raw_protiming_0
CROSS JOIN LATERAL (
    SELECT protiming_discipline(format_epreuve, name_epreuve, type_evenement) AS discipline
) d
-- discipline NULL : épreuve d'un autre sport (marche, trail, natation seule…), exclue
WHERE d.discipline IS NOT NULL
-- athlètes anonymisés par la source (nom vide) : ils formeraient un seul profil sans nom
AND btrim(coalesce(nom, '')) <> ''
-- épreuves contre-la-montre exclues, comme pour toutes les sources (voir prolivesport)
AND format_epreuve !~* '\mclm\M'
;

-- Noms et clubs mal encodés (« ThÃ©o HANQUIEZ » pour « Théo HANQUIEZ ») : le texte UTF-8 a été
-- relu comme du Windows-1252 (ou du Latin-1) par la source ou le scraping. On refait
-- l'opération inverse : le texte est réécrit en octets Windows-1252 (à défaut Latin-1), puis
-- relu en UTF-8. Le texte n'est corrigé que si le résultat est de l'UTF-8 valide sans caractère
-- de contrôle : les noms où ces lettres sont légitimes (« JOÃO », « CHÂTEAU », « ÅKERMAN »)
-- ne forment pas de l'UTF-8 valide et restent intacts. Le 20/11/2026 : 218 noms et 29 clubs
-- corrigés, dans les trois sources.
CREATE OR REPLACE FUNCTION corrige_encodage(texte text)
RETURNS text AS $$
DECLARE
    corrige text;
BEGIN
    IF texte IS NULL OR texte !~ '[ÃÂÅâ]' THEN
        RETURN texte;
    END IF;
    BEGIN
        corrige := convert_from(convert_to(texte, 'WIN1252'), 'UTF8');
    EXCEPTION WHEN others THEN
        BEGIN
            corrige := convert_from(convert_to(texte, 'LATIN1'), 'UTF8');
        EXCEPTION WHEN others THEN
            RETURN texte;
        END;
    END;
    IF corrige ~ '[\u0080-\u009F]' THEN
        RETURN texte;
    END IF;
    RETURN corrige;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE raw_data
SET nom = corrige_encodage(nom),
    club = corrige_encodage(club)
WHERE nom ~ '[ÃÂÅâ]' OR club ~ '[ÃÂÅâ]';


-- Clubs : on ne garde que de vrais noms de club.
--   - « ` » est remplacé par une apostrophe (« TRIATHLON CLUB D`HAZEBROUCK », 5 694 lignes) ;
--     espaces insécables et espaces en trop retirés ;
--   - « À » abîmé par la source réécrit (« COURIR Ã FUVEAU », « COURIR ‡ FUVEAU », 3 lignes
--     fftri le 25/11/2026) ;
--   - les valeurs qui disent seulement « pas de club » sont vidées : « NON LICENCIE » et ses
--     variantes, « NL », « NONE », « N/A », « AUCUN », « SANS CLUB », « 0 », « - », « ? », « XXX »…
--     (1 519 lignes le 20/11/2026) ;
--   - les licences individuelles FFTRI, écrites d'une trentaine de façons (« INDIVIDUEL »,
--     « LICENCE INDIV. », « INDIV LIGUE PAYS DE LA LOIRE »…), sont vidées aussi : ce n'est
--     pas un club (environ 700 lignes).
CREATE OR REPLACE FUNCTION nettoie_club(club text)
RETURNS text AS $$
DECLARE
    -- « À » abîmé par la source : « Ã » seul entre deux espaces (le second octet de « À » perdu)
    -- ou « ‡ » (« COURIR Ã FUVEAU », « COURIR ‡ FUVEAU » → « COURIR À FUVEAU »)
    propre text := btrim(regexp_replace(
        replace(replace(replace(replace(club, '`', ''''), chr(160), ' '), ' Ã ', ' À '), '‡', 'À'),
        '\s+', ' ', 'g'
    ));
    cle text := upper(unaccent(propre));
BEGIN
    IF propre IS NULL OR propre = '' THEN
        RETURN NULL;
    END IF;
    IF cle ~ ('^(NON[ .-]?LICENCI(E|EE)?S?( FF ?\.?TRI)?|NL|NONE|NO|NAN|NULL|N/?A|NC|AUCUN'
              || '|SANS CLUB|PAS DE CLUB|LICENCIE|0|[-./?X]+)$')
       OR cle ~ '^(IND |FFTRI )?((LIC|LICENCE|LICENSE|LINCENCE)\.? )?(INDIVIDUE+L*E?|INDIV|INDIVIDUAL)\M' THEN
        RETURN NULL;
    END IF;
    RETURN propre;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE raw_data
SET club = nettoie_club(club)
WHERE club IS DISTINCT FROM nettoie_club(club);


-- Noms protiming : protiming écrit tout en majuscules (« GARNIER JEAN FRANCOIS »), sans
-- marquer où finit le nom de famille, et l'affichait ainsi dans les classements et parfois sur
-- le profil (le nom le plus fréquent de l'athlète). On le réécrit « NOM Prénom » comme
-- fftri_t2_area (« GARNIER Jean-François »).
--   - Dictionnaire des prénoms : dans les noms des autres sources écrits « NOM Prénom », le
--     prénom (« Jean-François », « Jean claude ») ; clé sans accent, tirets et apostrophes
--     comptés comme des espaces ; on garde l'écriture la plus fréquente (accents compris),
--     chaque partie avec une majuscule (« Jean claude » → « Jean Claude »).
--   - Le prénom d'un nom protiming est la plus longue fin du nom (en laissant au moins un mot
--     au nom de famille) qui est un prénom connu : « DE MEULDER XAVIER » → « DE MEULDER
--     Xavier », « GARNIER JEAN FRANCOIS » → « GARNIER Jean-François ». Sans prénom connu, le
--     dernier mot (« DUPONT ZYNEDINE » → « DUPONT Zynedine »).
--   - Les noms déjà écrits en minuscules (« Bugeaud Lola ») et les équipes (« BIBI & DUDU »)
--     ne changent pas.
-- La clé de l'athlète (athletes.sql) trie les mots sans accent : elle ne change pas.
CREATE OR REPLACE FUNCTION cle_prenom(prenom text)
RETURNS text AS $$
    SELECT btrim(regexp_replace(lower(unaccent(prenom)), '[-‐''’[:space:]]+', ' ', 'g'))
$$ LANGUAGE sql IMMUTABLE;

DROP TABLE IF EXISTS prenoms;
CREATE TABLE prenoms AS
SELECT cle, mode() WITHIN GROUP (ORDER BY initcap(prenom)) AS prenom
FROM (
    SELECT prenom, cle_prenom(prenom) AS cle
    FROM (
        SELECT substring(nom FROM '^[^[:lower:]]+ ([[:upper:]][[:lower:]].*)$') AS prenom
        FROM raw_data
        WHERE source <> 'protiming'
    ) noms
    WHERE prenom IS NOT NULL AND prenom !~ '[[:upper:]]{2}'
) prenoms_vus
GROUP BY cle
HAVING COUNT(*) >= 2;
CREATE UNIQUE INDEX ON prenoms (cle);

CREATE OR REPLACE FUNCTION protiming_nom(nom text)
RETURNS text AS $$
DECLARE
    mots text[] := regexp_split_to_array(btrim(regexp_replace(nom, '\s+', ' ', 'g')), ' ');
    n int := array_length(mots, 1);
    trouve text;
BEGIN
    IF nom ~ '[[:lower:]]' OR nom ~ '&' OR n IS NULL OR n < 2 THEN
        RETURN nom;
    END IF;
    FOR i IN 2..n LOOP
        SELECT p.prenom INTO trouve
        FROM prenoms p
        WHERE p.cle = cle_prenom(array_to_string(mots[i:n], ' '));
        IF trouve IS NOT NULL THEN
            RETURN array_to_string(mots[1:i - 1], ' ') || ' ' || trouve;
        END IF;
    END LOOP;
    RETURN array_to_string(mots[1:n - 1], ' ') || ' ' || initcap(mots[n]);
END;
$$ LANGUAGE plpgsql STABLE;

UPDATE raw_data
SET nom = protiming_nom(nom)
WHERE source = 'protiming'
  AND protiming_team_name(nom, type_epreuve, format_normalise, format_epreuve) IS NULL
  AND nom IS DISTINCT FROM protiming_nom(nom);

DROP TABLE prenoms;
