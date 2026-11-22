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
    1. chronoweb_links.py : lit chaque ligne d'épreuve de la page des résultats (`div.table-row`)
       et génère urls.csv avec l'URL du fichier Excel, la date (AAAA-MM-JJ), le lieu et le nom
       de l'épreuve (accents compris, année retirée ; le nom d'origine est gardé dans
       name_epreuve_initial). Le fichier Excel est cherché dans toute la ligne : le site inverse
       parfois les boutons PDF et XLS.
    2. chronoweb.py : pour chaque url du fichier urls.csv l'url est scrappée, convertie en dataframe, et des informations principales sont extraites et écrites dans un fichier unique csv par course.
       Le nom, la date et le lieu viennent de urls.csv ; l'année vient de la date (à défaut, de la
       fin du nom de fichier).
    3. chronoweb_organize.py : pour chaque fichier unique de course on vient nettoyer la donnée pour venir en extraire toutes nos informations (temps swim, temps bike, temps run, ...) et on écrit un csv final.
       Un fichier dont aucune ligne n'a de nom ni de temps n'est pas écrit, donc pas chargé : ses colonnes n'ont pas
       été reconnues (40 fichiers le 20/11/2026 : en-tête sur la 1re ligne de l'onglet ou plus bas que la 2e, comme
       le Swimrun du Levézou, le Triathlon du Pilon 2020, le Super Tri de Nevers, le championnat d'aquathlon 2019 ;
       colonnes nommées autrement, comme l'UTA 2021).

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
1. create_table_to_pg : on vient créer pour chaque source de données la table raw_ dans laquelle la donnée sera écrite. On créé un schéma propre avec le bon nom de colonne et les timestamp nécessaires. Pour ce faire, on prend un fichier d'exemple pour chaque source de données : le premier CSV non vide (les fichiers sans résultat peuvent avoir un autre en-tête).
2. load_csv_to_pg : on vient récupérer la liste de tous les fichiers présents dans input_files, on lit le fichier csv et on l'insère dans la database avec une commande COPY. La table d'écriture est préfixée raw_ avant le nom de la source. Les fichiers sans résultat (épreuves sans classement, créés par le scraping pour ne pas les retélécharger) sont ignorés.

# Application de transformations pour obtenir une donnée unifiée et utilisable
Dossier : `transform`
0. suppression de toutes les tables existantes :
    - drop_tables.sql : on supprime les index, la table source et les tables spécifiques. Les tables ids_stables
      et redirections ne sont jamais supprimées (identifiants stables, voir ids_stables.sql).
1. création des différentes tables :
    - create_tables.sql : on créé l'ensemble des tables source et spécifiques.
    - ids_stables.sql : crée si besoin les tables persistantes ids_stables (clé naturelle → id) et redirections
      (ancien id → nouvel id), et la fonction attribue_ids_stables. Les id d'épreuve et d'athlète sont ainsi les
      mêmes d'une reconstruction à l'autre : les liens partagés ne cassent plus. Une entité dont une clé est connue
      reprend son id ; deux entités réunies (nouvelle règle de nom, doublon de source) gardent le plus petit id et
      l'autre redirige vers lui. Remise à zéro (tous les liens changent) : `transform/reset_ids_stables.sql`.
2. génération table globale :
    - disciplines.sql : fonctions `epreuve_discipline` et `epreuve_format`, qui déduisent du nom libre d'une
      épreuve prolivesport, ou du nom de l'onglet Excel chronoweb, sa discipline (nom de l'épreuve, puis catégorie,
      puis nom de l'événement, sinon triathlon ; « cross » ou XTERRA → cross) et son format (relais, jeunes, lettre
      XS…XXL, mots connus comme Sprint, Short, Medium, Half, Full ou Altriman, puis distance en km). Sont exclues les
      épreuves d'autres sports (course à pied, natation seule, SUPP, distance ≥ 998) et les onglets chronoweb qui ne
      sont pas des classements (« Détails CàP / Vélo », manches et séries intermédiaires). Détail des règles en
      commentaire dans le fichier. `prolivesport_event_name` retire l'année (elle reste dans year_epreuve) et le
      numéro d'édition (« 38e ») du nom de l'événement pour relier les éditions d'une même course ;
      `prolivesport_team_name` et `chronoweb_team_name` donnent le nom des équipes (bike&run, relais).
    - raw_data.sql : insertion dans la table raw_data des données en union all des différentes tables raw_ .
      Le sexe y est calculé une fois par ligne : colonne `sexe` de la source pour prolivesport (M ou F, vide pour
      les équipes mixtes X), lettre M ou F qui ouvre `cat` pour les autres sources, après le rang que chronoweb
      colle parfois devant (`sexe_categorie` : « 14/MV3 » → M ; « MIXT », « MASTERS », « MI »… → vide). Avant le
      22/11/2026, c'était le premier caractère de `cat` : « 14/MV3 » donnait « 1 » (62 % des lignes chronoweb).
      athletes_tmp et results le reprennent.
      Les épreuves contre-la-montre (`format_epreuve` contenant le mot « CLM ») sont exclues de toutes les
      sources : chez prolivesport, leurs colonnes de temps sont décalées.
      Les noms et clubs mal encodés (« ThÃ©o » pour « Théo ») sont corrigés par `corrige_encodage` : texte réécrit
      en Windows-1252 (à défaut Latin-1) puis relu en UTF-8, seulement si le résultat est valide (« JOÃO »,
      « CHÂTEAU » restent intacts).
      Les clubs sont nettoyés par `nettoie_club` : « ` » remplacé par une apostrophe, valeurs « pas de club »
      (« NON LICENCIE », « NL », « NONE », « 0 », « - »…) et licences individuelles (« INDIVIDUEL », « LICENCE
      INDIV. »…) vidées : ce ne sont pas des clubs.
      Les temps chronoweb sont ramenés au format hh:mm:ss (`chronoweb_temps`) : fractions de seconde tronquées
      (« 01:29:09.357000 » → « 01:29:09 »), « ? » et dates Excel (« 1899-12-30 23:51:32 ») vidés.
    - noms_epreuves.sql : un seul nom, lisible, par course, en trois étapes sur les noms de raw_data :
      1. alias écrits à la main (table `alias_courses` dans le fichier) pour les cas que la règle ne voit pas
         (« Triathlon de l'audomarois - Arques » → « Triathlon & Duathlon de l'Audomarois », duathlon de Noyon…) ;
      2. les noms tout en minuscules (fftri_t2_area) sont mis en forme par `nom_course_lisible`
         (« triathlon d angouleme » → « Triathlon d'Angouleme » ; les accents ne peuvent pas être retrouvés) ;
      3. les noms qui ont la même clé `nom_course_cle` (mots sans accents ni ponctuation, sans petits mots, « open »
         ni jour, triés ; « St », « Ste » et « Sainte » comptent pour « Saint ») sont ramenés au plus lisible (majuscules, puis accents, puis le plus fréquent) :
         « Triathlon Bray-Dunes » / « Triathlon de Bray-Dunes », « Touquet Bike & Run » / « Bike & Run Le Touquet ».
      Exécuté avant races.sql.
3. génération des tables spécifiques :
    - races.sql : table pour décrire chaque épreuve. La discipline est ce qui précède la lettre de distance dans
      format_epreuve et le format est cette lettre (« cross triathlon m clm » → cross triathlon, M ; la variante
      CLM, EQ ou OPEN reste dans format_initial). prolivesport et chronoweb : voir disciplines.sql.
    - ids_epreuves.sql : donne à chaque épreuve son id stable. Clé : source | nom publié (raw_data.nom_source,
      gardé par noms_epreuves.sql) | format publié | date ou année. Exécuté après races.sql et avant results.sql.
    - ids_athletes.sql : donne à chaque athlète son id stable, à partir de ses clés de nom (athlete_key). La ligne
      de référence (id = unified_id) prend l'id stable, les autres lignes un id négatif. Exécuté après
      athletes_tronques.sql et avant results.sql. Les homonymes séparés (homonymes.sql) ont pour clé
      « homonyme | clé du nom | id de l'épreuve | temps ». Une épreuve retirée par doublons_sources.sql redirige
      vers la version fftri_t2_area gardée.
    - sous_classements.sql : épreuves du même jour dont au moins 95 % des athlètes sont aussi dans une épreuve plus
      grande (« Championnat de France Fftri » publié à côté de sa course hôte, « Open » dans « Full », catégories
      para dans « PT ») : la table sous_classements garde les paires, et les résultats des athlètes présents dans
      la grande épreuve sont marqués `sous_classement` (non comptés dans le profil ni dans nb_races). Les doublons
      strictement identiques d'une même course sont supprimés. Exécuté après doublons_sources.sql.
    - athletes_sexe.sql : le sexe d'un athlète est le plus fréquent (M ou F) dans ses résultats individuels, comme sur
      son profil ; il est écrit sur toutes ses lignes `athletes`, dont la ligne de référence utilisée par le filtre
      sexe de la liste des athlètes. Exécuté après doublons_sources.sql.
    - athletes_club.sql : le club d'un athlète est celui de son résultat individuel le plus récent qui donne un
      club (results.club, repris de raw_data) ; il est écrit sur toutes ses lignes `athletes`. Avant, la liste et
      le profil prenaient le club le plus fréquent sans ordre fixé en cas d'égalité (« VILPOUX Louis » : 3 lignes
      Courbevoie en 2022, 3 lignes Wasquehal en 2024-2025, un club différent sur chaque page). Exécuté après
      doublons_sources.sql.
    - nb_races.sql : table pour obtenir le nombre de courses différentes auquel un athlète a participé.
    - athletes_tmp.sql : table pour isoler les informations sur l'athlète
    - athletes.sql : table pour gérer les différentes entrées possible pour un même athlète en utilisant un unified_id.
      Clé d'un athlète : les mots du nom en minuscules, sans accents, triés ; tirets, apostrophes et virgules
      comptent comme des espaces (« BASSETTO Jean-Marc » = « BASSETTO Jean Marc », « MEUNIER, Paul » de chronoweb =
      « MEUNIER Paul »). Les autres signes (« * », « . ») restent :
      certaines sources s'en servent pour distinguer deux homonymes d'une même épreuve.
    - athletes_tronques.sql : rattache un nom coupé par la source (« BASSETTO JEAN MA », Gérardmer 2002) à l'athlète
      complet, quand l'épreuve coupe ses noms à une longueur fixe, que la coupure tombe au milieu d'un mot et qu'un
      seul athlète prolonge ce nom. Exécuté avant results.sql.
    - results.sql : table finale pour retrouver pour chaque athlète unified l'ensemble de ses résultats en compétition.
      Un temps à 00:00:00 (total ou segment) est vidé : prolivesport l'écrit pour les non-classés et les segments
      non chronométrés.
      Un résultat est relié à son épreuve par le nom, le format et la date ; quand la date est
      absente des deux côtés, par l'année (NULL = NULL n'étant jamais vrai, ces résultats étaient
      écartés : c'était le cas de tout chronoweb avant que la date soit scrappée).
      La colonne `equipe` marque les lignes d'équipe (bike&run, relais) : prolivesport, repérées ligne par ligne par
      `prolivesport_team_name` ; chronoweb, toutes les lignes de ces épreuves (`chronoweb_team_name`). Ces fonctions
      donnent aussi le nom affiché ; nb_races.sql ne compte pas ces lignes.
      Un athlète garde une ligne par temps total dans une épreuve : même temps = doublon de la source (Ironman de
      Nice 2023 publié deux fois), une ligne sans temps à côté d'une ligne avec temps aussi.
    - homonymes.sql : deux lignes du même athlète avec des temps différents dans une épreuve sont deux homonymes. Le
      mieux classé garde l'athlète ; chacun des autres reçoit un nouvel athlète (club repris de raw_data) dont le
      profil n'a que cette épreuve. Exécuté après results.sql et avant doublons_sources.sql.
    - temps_totaux.sql : recalcule le temps total depuis les 5 segments dans les épreuves dont le total de la source
      est corrompu (Tribreizh 2022 L : vainqueur à 00:01:03, segments à 04:18:04). Une épreuve est corrigée quand
      ses totaux ne suivent pas le classement (< 90 % des classés consécutifs dans l'ordre) et que la somme des
      segments le suit (≥ 95 %, pour ≥ 90 % des classés) : le classement dit lequel des deux est juste (à l'Ironman
      de Nice 2019, ce sont les segments qui sont faux). Une ligne sans ses 5 segments y perd son total. 4 épreuves
      le 20/11/2026. Marque ensuite `temps_suspect` (colonne de results) sur les totaux classés de moins de la moitié
      du temps médian des classés de l'épreuve (au moins 10 classés) : 19 résultats dans 7 épreuves, souvent un temps
      d'abandon publié avec un classement (Openlakes Champagne 2026 L : natation et T1 seulement). L'API les renvoie
      (`temps_suspect` sur chaque résultat et chaque leader du podium, `temps_suspects` sur GET /races/{id} ; `avec_segments` y indique si l'épreuve a au moins
      un temps intermédiaire, sinon seule la colonne du total est affichée) et les
      exclut des meilleurs temps du profil. Exécuté après homonymes.sql.
    - segments_prolivesport.sql : vide les 5 segments d'une ligne prolivesport dont la somme s'écarte de plus de 5 %
      du total (colonnes décalées : T1 de 00:31:45 pour un total de 00:58:36, Moines 2021 S), et ceux de toutes les
      lignes d'une épreuve dont au moins la moitié des lignes vérifiables sont incohérentes (le décalage touche
      surtout une épreuve entière : 169 épreuves sous 10 % d'incohérentes, 98 au-dessus de 90 %). Total et
      classement gardés. Exécuté après temps_totaux.sql.
    - doublons_sources.sql : retire les épreuves prolivesport ou chronoweb publiées aussi par fftri_t2_area (dates à
      un jour près, au moins la moitié des athlètes en commun) ; la version fftri_t2_area est gardée et la table
      doublons_sources garde la trace des paires retirées (colonne `source`). Les autres épreuves de la source dans
      ces courses prennent le nom fftri_t2_area pour être regroupées avec elles. Exécuté avant nb_races.sql.
4. génération des index :
    - pg_index.sql : création des index pour améliorer les performances des requêtes sur les tables.

Le fichier Python `run_sql.py` permet de lancer le pipeline de suppression des tables jusqu'à la création des index dans la database.
Il est lancé avec la commande `python ./transform/run_sql.py`.

API : `GET /redirections/{races|athletes}/{ancien_id}` renvoie l'id qui remplace un ancien id (404 s'il n'y en
a pas) ; le site s'en sert pour rediriger les anciens liens.