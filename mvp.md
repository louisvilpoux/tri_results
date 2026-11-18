# MVP
## Back-end + API

- API REST en Python (FastAPI)
- endpoints : 
    - /races : voir toutes les courses.
    - /races/{id}/results : voir les résultats d'une course donnée.
    - /athletes : voir tous les athlètes.
    - /athletes/{id} : voir les informations d'un athlète donné.
    - /athletes/{id}/results : voir les résultats d'un athlète donné.
    - /athletes/{id}/races : voir toutes les courses auxquelles un athlète à participé.

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
    - Protiming (à corriger)