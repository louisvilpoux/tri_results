CREATE TABLE raw_data (
    id SERIAL PRIMARY KEY,
    clt INTEGER, clt_f TEXT, temps TEXT, nom TEXT, club TEXT, cat TEXT, clt_cat TEXT, 
    id_league TEXT, league TEXT, "détails" TEXT, rang_global TEXT, rang_sexe TEXT, 
    rang_categorie TEXT, categorie TEXT, indice_performance TEXT, 
    indice_performance_reference TEXT, total_time TEXT, swim_time TEXT, 
    rang_swim TEXT, rang_course_swim TEXT, indice_performance_swim TEXT, 
    t1_time TEXT, rang_t1 TEXT, rang_course_t1 TEXT, indice_performance_t1 TEXT, 
    bike_time TEXT, rang_bike TEXT, rang_course_bike TEXT, 
    indice_performance_bike TEXT, t2_time TEXT, rang_t2 TEXT, rang_course_t2 TEXT, 
    indice_performance_t2 TEXT, run_time TEXT, rang_run TEXT, rang_course_run TEXT, 
    indice_performance_run TEXT, name_epreuve TEXT, format_epreuve TEXT, 
    year_epreuve TEXT, date_epreuve TEXT, lieu_epreuve TEXT, scraped_at TEXT,
    source TEXT, sexe TEXT,
    -- discipline et format déjà calculés (prolivesport et chronoweb, voir disciplines.sql) ; NULL ailleurs
    type_epreuve TEXT, format_normalise TEXT,
    -- nom de l'épreuve tel que publié, quand noms_epreuves.sql l'a changé (sert à la clé de
    -- l'id stable, voir ids_epreuves.sql) ; NULL quand il n'a pas changé
    nom_source TEXT
);

CREATE TABLE races (
    id SERIAL PRIMARY KEY,
    name_epreuve TEXT NOT NULL,
    format_initial TEXT,
    type_epreuve TEXT,
    format_epreuve TEXT,
    year_epreuve TEXT,
    date_epreuve TEXT,
    lieu_epreuve TEXT
);

CREATE TABLE athletes_tmp (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    club TEXT,
    cat_initial TEXT,
    sexe TEXT
);

CREATE TABLE athletes (
    id SERIAL PRIMARY KEY,
    unified_id INTEGER,
    nom TEXT NOT NULL,
    club TEXT,
    cat_initial TEXT,
    sexe TEXT,
    nb_races INT,
    athlete_key TEXT
);

CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    clt INTEGER,
    clt_f TEXT,
    epreuve_id INT NOT NULL REFERENCES races(id),
    name_epreuve TEXT,
    type_epreuve TEXT,
    format_epreuve TEXT,
    date_epreuve TEXT,
    year_epreuve TEXT,
    athlete_id INT NOT NULL REFERENCES athletes(id),
    nom_athlete TEXT,
    sexe TEXT,
    -- résultat d'une équipe (bike&run, relais) : nom_athlete contient les équipiers
    equipe BOOLEAN NOT NULL DEFAULT false,
    -- résultat d'un sous-classement déjà compté dans une autre épreuve du même jour
    -- (voir sous_classements.sql) : visible sur la page de l'épreuve, pas compté dans le profil
    sous_classement BOOLEAN NOT NULL DEFAULT false,
    -- temps total classé anormalement court (moins de la moitié du temps médian de l'épreuve) :
    -- probable erreur de la source, signalée à l'utilisateur (voir temps_totaux.sql)
    temps_suspect BOOLEAN NOT NULL DEFAULT false,
    -- club de l'athlète à cette épreuve (nettoyé dans raw_data.sql) ; sert au club actuel
    -- affiché sur le profil (voir athletes_club.sql)
    club TEXT,
    cat TEXT,
    clt_cat TEXT,
    id_league TEXT,
    league TEXT,
    url TEXT,
    rang_global TEXT,
    rang_sexe TEXT,
    rang_categorie TEXT,
    categorie TEXT,
    indice_performance TEXT,
    indice_performance_reference TEXT,
    total_time TEXT,
    swim_time TEXT,
    rang_swim TEXT,
    rang_course_swim TEXT,
    indice_performance_swim TEXT,
    t1_time TEXT,
    rang_t1 TEXT,
    rang_course_t1 TEXT,
    indice_performance_t1 TEXT,
    bike_time TEXT,
    rang_bike TEXT,
    rang_course_bike TEXT,
    indice_performance_bike TEXT,
    t2_time TEXT,
    rang_t2 TEXT,
    rang_course_t2 TEXT,
    indice_performance_t2 TEXT,
    run_time TEXT,
    rang_run TEXT,
    rang_course_run TEXT,
    indice_performance_run TEXT,
    source TEXT
);