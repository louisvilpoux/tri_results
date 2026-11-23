# MVP
## Back-end + API

- API REST en Python (FastAPI)
- endpoints : 
    - /races : voir toutes les épreuves (une ligne par format, filtres year/type/format/name).
    - /events : liste des courses (nom + année, comme /races/{id}/event), les plus récentes d'abord ;
      filtres `year`, `type_epreuve` et `format_epreuve` (égalité exacte sur la colonne de `races`), pagination ;
      renvoie aussi `filters.years`, `filters.types` et `filters.formats` disponibles ; les formats sont
      triés XS, S, M, L, XL, XXL puis les autres par ordre alphabétique (JEUNES, RELAIS).
    - /courses : liste des courses, une ligne par course (même nom) et non par édition ; mêmes filtres et
      pagination que /events, appliqués aux épreuves. `edition` : l'édition la plus récente qui répond aux
      filtres (id, année, période) ; `editions` : toutes les éditions de la course (id, année), de la plus
      récente à la plus ancienne ; `types` : toutes ses disciplines. Triées par la date de `edition`.
    - /races/{id} : voir les informations d'une épreuve (un format) donnée ; `lieu_epreuve` nettoyé des "nan".
    - /races/{id}/event : la course à laquelle appartient l'épreuve (même nom + même année) : période, lieu,
      participants distincts, formats (participants, vainqueur, première femme) et autres éditions (une épreuve par année).
      Les épreuves sans résultat sont ignorées.
    - /races/{id}/results : voir les résultats d'une course donnée. `equipe` vaut true pour une ligne d'équipe
      (bike&run, relais) : `nom_athlete` contient alors les équipiers ou le nom d'équipe, sans profil d'athlète.
        - tri `sort_by` : `clt` (défaut), `nom_athlete`, `swim_time`, `t1_time`, `bike_time`, `t2_time`, `run_time`, `total_time` ; toute autre valeur renvoie 422.
        - les valeurs vides, les non-classés (`clt` à 0 ou ≥ 99990) et les temps invalides (`—`, négatifs,
          `00:00:00`) sont toujours placés en fin de liste.
        - filtres : `s` (sexe), `categorie` (valeur exacte), `q` (nom de l'athlète, 2 caractères min.).
    - /races/{id}/categories : liste triée des catégories présentes dans les résultats d'une course.
    - /athletes : liste des athlètes, un par `unified_id` (sans ceux qui n'ont aucun résultat), les plus actifs
      d'abord ; filtres `q` (nom, mêmes règles que /search) et `s` (sexe), pagination `limit` / `offset`.
    - /athletes/{id} : profil consolidé d'un athlète (id = `unified_id`) : nom, club, sexe, nb_races,
      nb_podiums, nb_top10, best_rank, seasons, disciplines, best_times.
    - /athletes/{id}/results : historique d'un athlète, avec `participants` (taille du classement).
      Les résultats d'équipe ne font partie d'aucun profil : une « équipe » renvoie 404 sur /athletes/{id}.
        - tri `sort_by` : `date_epreuve` (défaut, `order=desc`), `clt`, `total_time`.
        - filtres : `year_epreuve`, `type_epreuve`, `format_epreuve`.
    - /athletes/{id}/races : voir toutes les courses auxquelles un athlète à participé.

    - /suggest : suggestions du champ de recherche (`q`, 2 caractères min. ; `limit`, défaut 5, max 10) :
      `athletes` (comme /search) et `courses` (comme /courses), sans nombre total. `type` : `all` (défaut),
      `athletes` ou `courses` (l'autre liste est vide) ; filtres des listes repris : `s` (sexe des athlètes),
      `year`, `type_epreuve`, `format_epreuve` (courses).

    - /search : recherche d'athlètes et de courses par nom (`q`, 2 caractères min.). Tous les mots doivent apparaître,
      dans n'importe quel ordre, sans tenir compte des majuscules ni des accents.
        - `type` : `all` (défaut), `athletes` ou `races` ; pagination `limit` (défaut 6, max 50) et `offset`.
        - athlètes : recherche sur `athletes.athlete_key`, un résultat par `unified_id`, ceux sans résultat exclus.
        - courses : regroupées par nom + année (comme /races/{id}/event), épreuves sans résultat exclues.

Tri possible avec `sort_by` et ordre possible avec `order` (`asc` ou `desc`).

## Base de donnée

- PostgreSQL
- tables : 
    - results : table des résultats détaillés.
    - athletes : tables avec les informations des athlètes.
    - races : tables avec les informations des courses.

## Interface WEB

- NextJS

## Pipeline ingestion

Scripts Python + SQL
    
    - Python : scrapping des données + formattage en fichier CSV + load des fichiers dans une table raw_data sur PostgreSQL.
    - SQL : extraction d'information, cast, normalisation des noms d'athletes et unification des ids, préparation des 3 tables finales results, athletes et races.

# Sources de données

    - Chronoweb
    - FFtri_t2_area
    - Prolivesport
    - Protiming (nouveau site depuis novembre 2026, voir backend.md)