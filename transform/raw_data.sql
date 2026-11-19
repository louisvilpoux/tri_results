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

INSERT INTO raw_data (clt, clt_f, temps, nom, club, cat, clt_cat, 
id_league, league, détails, rang_global, rang_sexe, 
rang_categorie, categorie, indice_performance, indice_performance_reference, 
total_time, swim_time, rang_swim, rang_course_swim, indice_performance_swim, 
t1_time, rang_t1, rang_course_t1, indice_performance_t1, 
bike_time, rang_bike, rang_course_bike, indice_performance_bike, 
t2_time, rang_t2, rang_course_t2, indice_performance_t2, 
run_time, rang_run, rang_course_run, indice_performance_run,
name_epreuve, format_epreuve, year_epreuve, date_epreuve, lieu_epreuve,
scraped_at, source, sexe)

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
name_epreuve, format_epreuve, year_epreuve, date_epreuve, null as lieu_epreuve,
scraped_at, 'fftri_t2_area' as source, SUBSTRING(cat FROM 1 FOR 1) as sexe
FROM raw_fftri_t2_area_0 
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
name_epreuve, format_epreuve, year_epreuve,
date_epreuve::date::text as date_epreuve, lieu_epreuve,
scraped_at, 'prolivesport' as source,
-- prolivesport fournit le sexe (M, F, X pour les équipes mixtes) ; sa colonne cat contient
-- des catégories (SE, MA, VE…) dont la première lettre n'est pas le sexe.
CASE WHEN sexe IN ('M', 'F') THEN sexe END as sexe
from raw_prolivesport_0
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
name_epreuve, format_epreuve, year_epreuve,
date_epreuve, lieu_epreuve,
scraped_at, 'chronoweb' as source, SUBSTRING(cat FROM 1 FOR 1) as sexe
FROM raw_chronoweb_0
WHERE name_epreuve is not null
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
name_epreuve, format_epreuve, EXTRACT(YEAR FROM to_date(date_epreuve, 'DD/MM/YYYY'))::text as year_epreuve, 
date_epreuve, lieu_epreuve,
scraped_at, 'protiming' as source, SUBSTRING(cat FROM 1 FOR 1) as sexe
from raw_protiming_0
;