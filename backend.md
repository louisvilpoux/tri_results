# Location du projet et activation de l'env dédié
```
cd /Users/maclv/Work/dev/tri_results
source chrono/bin/activate
```

# Notebook
Un Jupyter Notebook est utilisable pour différents tests. Il utilise le venv ci-dessus.

# Lancer l'API
```
cd api
uvicorn main:app --reload
```

# Tests de l'API
Les tests (pytest + `httpx` pour le `TestClient` FastAPI) s'exécutent contre la base PostgreSQL locale
et sont ignorés si elle est indisponible.
```
cd api
pytest
```

# Récupération de la donnée source
Dossier : `sources`
Pour chaque source, un ou plusieurs fichiers Python est utilisé. La donnée scrappée est chargée dans un dossier ayant le nom de la source.
Dans le dossier ayant le nom de la source, la structure des dossiers est la suivante :

nom_de_la_source :
    - raw : dossier contenant tous les fichiers brut résultant du scrapping. Optionnel si la donnée complète est directement récupérée sans post-traitement.
    - url : fichier avec toutes les urls à scrapper de la source.
    - nom_de_la_source_0 : dossier contenant la donnée préparée pour être chargée en database.

- chronoweb :
    1. chronoweb_links.py : récupérér la liste des liens à scrapper. Génère un fichier urls.csv
    2. chronoweb.py : pour chaque url du fichier urls.csv l'url est scrappée, convertie en dataframe, et des informations principales sont extraites et écrites dans un fichier unique csv par course.
    3. chronoweb_organize.py : pour chaque fichier unique de course on vient nettoyer la donnée pour venir en extraire toutes nos informations (temps swim, temps bike, temps run, ...) et on écrit un csv final.

- fftri_t2_area :
    1. fftri_t2_area_links.py : scrapping du site pour récupérer l'ensemble des liens vers les pages de résultats des épreuves.
    2. fftri_t2_area.py : pour chaque url, on vient scrapper la page et récupérer les informations voulues. La donnée est également nettoyée et mise au format csv avec les bonnes colonnes.

- prolivesport : 
    1. prolivesport_links.py : liste des événements et, pour chacun, de ses épreuves (`raceList/{eventId}`),
       sans les épreuves « SUPP ».
    2. prolivesport.py : un CSV par épreuve, pour les événements de triathlon, duathlon et aquathlon.
       L'API `result/indiv/{eventId}/{épreuve}` renvoie tout l'événement quelle que soit l'épreuve demandée :
       on l'appelle une fois par événement et on garde les lignes dont le champ `race` correspond.
       Colonnes ajoutées : `distance` (km), `categorieevent` et `categorievar` (catégorie de l'événement).

- protiming : 
    1. protiming_links.py : scrapping du site pour venir récupérer l'ensemble des liens vers les pages de résultats des épreuves.
    2. protiming.py : pour chaque url, on vient scrapper la page et générer un csv avec les informations.
    3. protiming_organize.py : pour chaque csv, on vient principalement appliquer les bons noms de colonnes.

# Chargement de la donnée source dans la base de données
Dossier : `load`
1. create_table_to_pg : on vient créer pour chaque source de données la table raw_ dans laquelle la donnée sera écrite. On créé un schéma propre avec le bon nom de colonne et les timestamp nécessaires. Pour ce faire, on prend un fichier d'exemple pour chaque source de données.
2. load_csv_to_pg : on vient récupérer la liste de tous les fichiers présents dans input_files, on lit le fichier csv et on l'insère dans la database avec une commande COPY. La table d'écriture est préfixée raw_ avant le nom de la source.

# Application de transformations pour obtenir une donnée unifiée et utilisable
Dossier : `transform`
0. suppression de toutes les tables existantes :
    - drop_tables.sql : on supprime les index, la table source et les tables spécifiques.
1. création des différentes tables :
    - create_tables.sql : on créé l'ensemble des tables source et spécifiques.
2. génération table globale :
    - prolivesport.sql : fonctions `prolivesport_discipline` et `prolivesport_format`, qui déduisent du nom libre
      d'une épreuve prolivesport sa discipline (nom de l'épreuve, puis catégorie, puis nom de l'événement) et son
      format (relais, jeunes, lettre XS…XXL, mots connus comme Sprint ou 70.3, puis distance en km). Les épreuves
      d'autres sports (course à pied, natation seule, SUPP, distance ≥ 998) sont exclues. Détail des règles en
      commentaire dans le fichier. `prolivesport_event_name` retire l'année (elle reste dans year_epreuve) et le numéro
      d'édition (« 38e ») du nom de l'événement pour relier les éditions d'une même course.
    - raw_data.sql : insertion dans la table raw_data des données en union all des différentes tables raw_ .
      Le sexe y est calculé une fois par ligne : colonne `sexe` de la source pour prolivesport (M ou F, vide pour
      les équipes mixtes X), première lettre de `cat` pour les autres sources. athletes_tmp et results le reprennent.
3. génération des tables spécifiques :
    - races.sql : table pour décrire chaque épreuve.
    - nb_races.sql : table pour obtenir le nombre de courses différentes auquel un athlète a participé.
    - athletes_tmp.sql : table pour isoler les informations sur l'athlète
    - athletes.sql : table pour gérer les différentes entrées possible pour un même athlète en utilisant un unified_id.
    - results.sql : table finale pour retrouver pour chaque athlète unified l'ensemble de ses résultats en compétition.
4. génération des index :
    - pg_index.sql : création des index pour améliorer les performances des requêtes sur les tables.

Le fichier Python `run_sql.py` permet de lancer le pipeline de suppression des tables jusqu'à la création des index dans la database.
Il est lancé avec la commande `python ./transform/run_sql.py`.