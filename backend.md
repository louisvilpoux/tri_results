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
       Le lieu (colonne lieu_epreuve) est lu dans l'en-tête de la page de l'épreuve (`div.t2-header__meta`,
       « SIZUN (29450) ») ; raw_data.sql le met en forme (« Sizun (29450) »).
    3. fftri_t2_area_lieux.py : ajoute le lieu aux CSV déjà téléchargés (le scraper ne retélécharge pas une épreuve
       dont le CSV existe). Lancé une fois le 22/11/2026 : 2 237 CSV sur 2 239 (deux fichiers sans année dans leur
       nom n'ont pas d'URL connue). Relancé, il ne traite que les CSV sans la colonne ; puis recharger les CSV et
       reconstruire la base.

- prolivesport : 
    1. prolivesport_links.py : liste des événements et, pour chacun, de ses épreuves (`raceList/{eventId}`),
       sans les épreuves « SUPP ».
    2. prolivesport.py : un CSV par épreuve, pour les événements de triathlon, duathlon et aquathlon.
       L'API `result/indiv/{eventId}/{épreuve}` renvoie tout l'événement quelle que soit l'épreuve demandée :
       on l'appelle une fois par événement et on garde les lignes dont le champ `race` correspond.
       Colonnes ajoutées : `distance` (km), `categorieevent` et `categorievar` (catégorie de l'événement).

- protiming : le site a été refait en novembre 2026 (application React Router). Les anciennes adresses
  (`/Results/running/16-Triathlon-de-Cepoy/63`) et le tableau HTML paginé (`/page:2`) n'existent plus :
  les scripts lisent maintenant la version « données » des pages (même adresse suivie de `.data`), au
  format turbo-stream, décodée par `protiming_api.py` (`decode_turbo_stream`, `get_route_data`).
    1. protiming_links.py : liste des événements de la page Résultats filtrée par type
       (`/results.data?type=triathlon&page=n` ; types triathlon, duathlon, swim_run, bike_and_run) →
       url/urls.csv (event_id, slug, event_name, type, date AAAA-MM-JJ, lieu « Ville (dép.) », url).
       143 événements le 23/11/2026 (2014 à 2026).
    2. protiming.py : pour chaque événement, la liste de ses épreuves (`results.races`), puis le
       classement de chaque épreuve page par page (`/results/{slug}.data?race={id}&page={n}`, 50 lignes
       par page). Un CSV par épreuve dans `raw/` (`{slug}_{race_id}.csv`), colonnes de l'ancien site
       (« Pos. », « Temps », « Nom - Prénom » écrit NOM Prénom, « Club », « Dossard », « Catégorie »,
       « km/h », temps intermédiaires sous leur nom publié : « Natation », « T1 », « Velo », « CaP »…) plus
       « Sexe » (M/F), « Temps réel » quand il existe et `type_evenement`. Une épreuve déjà téléchargée
       n'est pas refaite ; une épreuve sans résultat n'est pas écrite ; un événement en erreur n'arrête
       pas les autres (relancer le script le reprend). Les épreuves que protiming n'a pas chronométrées
       (`timedByProtiming` faux, classement en PDF seulement : 126 le 23/11/2026) n'ont pas de CSV.
       Le 23/11/2026 : 549 CSV, 50 508 lignes, 2015 à 2026.
       Les id d'événement sont ceux de l'ancien site, pas les id d'épreuve (Triathlon de l'étang des
       Bois 2015 : épreuves 62, 63, 65 avant, 632 à 635 maintenant) : les CSV de l'ancien site sont
       gardés à part dans `raw_old/` et ne doivent pas être mélangés avec ceux de `raw/`.
    3. protiming_organize.py : `raw/` → `protiming_0/`, mêmes colonnes pour tous les fichiers (clt, temps,
       nom, club, cat, détails, sexe, swim, t1, bike, t2, run, date_epreuve, name_epreuve, format_epreuve,
       lieu_epreuve, distance_epreuve, type_evenement).
       Temps intermédiaires reconnus à leur nom sans accents, majuscules, « Tps » ni ponctuation
       (« Natation », « Nat. », « Swim » → swim ; « Velo », « Tps Vélo », « Bike » → bike ; « CaP », « Run »
       → run ; T1, T2) ; en duathlon « CaP1 » / « Cap 1 » → swim et « CaP2 » → run, comme les autres
       sources. Les colonnes cumulées ou par tour (« Natation + T1 », « CaP Tour 1 », « VELO 3 »,
       « Inter 2 ») ne sont pas gardées. Temps mis au format hh:mm:ss : place collée retirée
       (« 00:13:21 (144.) »), « 15:25 » → « 00:15:25 », « NC », « ---- » vidés. Catégorie sans le
       classement dans la catégorie (« SEM (1 / 155) » → « SEM »). Équipe anonyme (nom vide) : nom formé
       de ses équipiers (« Equipier 1 », « Athlete 2 »…), « NOM1 & NOM2 ». 15 athlètes anonymisés par la
       source restent sans nom.

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
      XS…XXL, mots connus comme Sprint, Short, Medium, Half, Full ou Altriman, puis distance en km ; pour le bike &
      run, distance du nom ou de prolivesport : < 6 km JEUNES, < 12 XS, < 19 S, sinon M ; distances bouche-trou 0,
      99.99, 998, 999 ignorées ; « à partir de Cadets » ne fait pas une épreuve jeunes). raw_data.sql passe en JEUNES
      un bike & run dont tous les classés sont jeunes (Q13, 25/11/2026). Sont exclues les
      épreuves d'autres sports (course à pied, natation seule, SUPP, distance ≥ 998), les
      enchaînements natation + vélo sans course à pied (« SWIMBIKE », « aquabike » : Chtriman 2023 et 2024,
      329 résultats, rangés jusqu'au 25/11/2026 en triathlon L ; leurs anciennes pages répondent 404) et les onglets chronoweb qui ne
      sont pas des classements (« Détails CàP / Vélo », manches et séries intermédiaires). Détail des règles en
      commentaire dans le fichier. `prolivesport_event_name` retire l'année (elle reste dans year_epreuve) et le
      numéro d'édition (« 38e ») du nom de l'événement pour relier les éditions d'une même course ;
      `prolivesport_team_name` et `chronoweb_team_name` donnent le nom des équipes (bike&run, relais).
      protiming (23/11/2026) : `protiming_discipline` exclut les épreuves d'un autre sport ou d'un seul sport
      proposées à côté de l'enchaînement (marche nordique, trail, « course nature », nage en eaux vives,
      « Distance Natation », « Running 5-6ans », « VTT 7-9ans », challenges d'entreprises), donne la
      discipline de l'événement (`type_evenement`) à une épreuve de bike&run ou de swimrun dont le nom n'en cite
      aucune (« 3000m », « Format S - Solo »), sinon applique `epreuve_discipline` (type duathlon comme
      catégorie par défaut) ; le format vient de `epreuve_format`. `protiming_team_name` : chaque ligne d'un
      relais, d'un bike&run ou d'un swimrun en duo (sans « Solo » ni « Individuel » dans le nom de l'épreuve)
      est une équipe, affichée sous le nom publié.
    - raw_data.sql : insertion dans la table raw_data des données en union all des différentes tables raw_ .
      Le sexe y est calculé une fois par ligne : colonne `sexe` de la source pour prolivesport (M ou F, vide pour
      les équipes mixtes X) et protiming (dont les catégories « S2M », « V1F » finissent par le sexe), lettre M
      ou F qui ouvre `cat` pour les autres sources, après le rang que chronoweb
      colle parfois devant (`sexe_categorie` : « 14/MV3 » → M ; « MIXT », « MASTERS », « MI »… → vide). Avant le
      22/11/2026, c'était le premier caractère de `cat` : « 14/MV3 » donnait « 1 » (62 % des lignes chronoweb).
      athletes_tmp et results le reprennent.
      Les épreuves contre-la-montre (`format_epreuve` contenant le mot « CLM ») sont exclues de toutes les
      sources : chez prolivesport, leurs colonnes de temps sont décalées.
      protiming, équipes de relais (Q18, 25/11/2026) : une ligne de catégorie relais (RE…, DU…) d'une épreuve qui
      n'est pas un relais est retirée quand la même équipe, avec le même temps, figure dans un relais du même
      événement (Cepoy 2026 M, 5 lignes) ; une épreuve dont toutes les lignes ont une catégorie relais passe en
      RELAIS (Bordeaux 2026 « Format S - Entreprises », 28 équipes), hors bike & run et swimrun.
      protiming : date JJ/MM/AAAA mise en AAAA-MM-JJ, année retirée du nom de l'événement
      (`prolivesport_event_name`), numéro de département retiré du lieu (« Bordeaux (33) » → « Bordeaux », pour
      que lieux.sql reconnaisse la ville des autres sources de la course), athlètes anonymisés (nom vide)
      écartés. Le 23/11/2026 : 47 264 lignes sur 50 508 (1 148 dans des épreuves d'autres sports, 2 081 en
      contre-la-montre, 15 sans nom). Ses noms, tout en majuscules (« GARNIER JEAN FRANCOIS »), sont réécrits
      « NOM Prénom » par `protiming_nom` (« GARNIER Jean Francois ») : le prénom est la plus longue fin du nom
      trouvée dans un dictionnaire des prénoms des autres sources écrits « NOM Prénom » (table `prenoms`,
      supprimée ensuite), à défaut le dernier mot. Les équipes et les noms déjà en minuscules ne changent pas ;
      la clé de l'athlète non plus. Le 24/11/2026 : 32 résultats individuels restent en majuscules (équipes
      non reconnues comme telles, « CPTS BOOSTE 3 »).
      Les noms et clubs mal encodés (« ThÃ©o » pour « Théo ») sont corrigés par `corrige_encodage` : texte réécrit
      en Windows-1252 (à défaut Latin-1) puis relu en UTF-8, seulement si le résultat est valide (« JOÃO »,
      « CHÂTEAU » restent intacts).
      Les clubs sont nettoyés par `nettoie_club` : « ` » remplacé par une apostrophe, « À » abîmé par la source
      réécrit (« COURIR Ã FUVEAU », « COURIR ‡ FUVEAU »), valeurs « pas de club »
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
    - epreuves_sexe.sql (D9, 23/11/2026) : réunit une épreuve publiée en deux classements, un par sexe
      (« S Homme » / « S Femme », « D3H » / « D3F », « BEH » / « BEF », « SM » / « SW », « HOMMES » / « FEMMES »).
      Avant, chacun était une épreuve au même format : les repères et « Et moi ? » de l'épreuve des hommes ne
      comptaient que les hommes, et la première femme n'apparaissait pas. Conditions : même source, nom de
      course, date, discipline et format ; noms publiés identiques une fois le sexe retiré (`format_sans_sexe`) ;
      chaque épreuve à au moins 90 % d'un seul sexe et les deux sexes présents. Des divisions ou catégories
      différentes (D1H / D2H, BEF / CAF, PTS2 / PTS4) restent séparées. « Finales » compte pour « Finale »
      (Extrememan 2020 : « Finale Hommes » / « Finales Femmes », réunies le 25/11/2026). Nom de l'épreuve réunie : les noms
      publiés (« S Feminin / S Masculin ») ; le nom publié de chaque ligne est gardé dans `raw_data.format_source`
      (clé de l'id stable : l'épreuve réunie garde le plus petit id, l'autre redirige). Le classement publié
      par sexe passe dans `rang_sexe` ; `clt` devient le classement de l'épreuve réunie par temps total, parmi
      les classés de la source (un classé sans temps après ceux qui en ont un), non-classés inchangés. Le
      23/11/2026 : 109 épreuves réunies (18 231 résultats), prolivesport et chronoweb ; ex. Duathlon de Sainte
      Aldegonde 2025 S : 210 + 81 participants, première femme 123ᵉ au général. Exécuté avant races.sql.
3. génération des tables spécifiques :
    - races.sql : table pour décrire chaque épreuve. La discipline est ce qui précède la lettre de distance dans
      format_epreuve et le format est cette lettre (« cross triathlon m clm » → cross triathlon, M ; la variante
      CLM, EQ ou OPEN reste dans format_initial). prolivesport et chronoweb : voir disciplines.sql.
    - ids_epreuves.sql : donne à chaque épreuve son id stable. Clé : source | nom publié (raw_data.nom_source,
      gardé par noms_epreuves.sql) | format publié (raw_data.format_source, gardé par epreuves_sexe.sql) | date ou
      année. Exécuté après races.sql et avant results.sql.
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
      `categorie_fftri` (Q5, 25/11/2026) : catégorie d'âge FFTRI commune aux sources, calculée par `categorie_fftri`
      (disciplines.sql) depuis la catégorie publiée (`categorie`, gardée) : MP à JU, S1 à S4, V1 à V10 ; SE et VE
      pour un senior ou un master sans niveau publié ; NULL sinon (élite, open, handisport…).
      Un temps à 00:00:00 (total ou segment) est vidé : prolivesport l'écrit pour les non-classés et les segments
      non chronométrés.
      Un résultat est relié à son épreuve par le nom, le format et la date ; quand la date est
      absente des deux côtés, par l'année (NULL = NULL n'étant jamais vrai, ces résultats étaient
      écartés : c'était le cas de tout chronoweb avant que la date soit scrappée).
      La colonne `equipe` marque les lignes d'équipe (bike&run, relais) : prolivesport, repérées ligne par ligne par
      `prolivesport_team_name` (dans un bike&run ou une épreuve « Duo », « NOM Prénom  NOM PRÉNOM » est une paire
      d'équipiers : les 69 lignes des Duos des Triath'Elles de Gravelines 2017 étaient jusqu'au 25/11/2026 de
      faux athlètes, Q21) ; chronoweb, toutes les lignes de ces épreuves (`chronoweb_team_name`) ; protiming,
      toutes les lignes des relais, bike&run et swimruns en duo (`protiming_team_name`). Ces fonctions
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
      Classés plus rapides que le vainqueur (Q18, 25/11/2026) : un total plus court de plus d'une minute que celui
      de l'unique 1er est aussi marqué `temps_suspect`. Certaines épreuves classent des athlètes arrêtés avant
      l'arrivée avec le temps de leur dernier passage (Openlakes Champagne 2026 : 47 classés en L, 36 en XXL, plus
      3 derniers classés isolés ailleurs ; 86 résultats). Pas dans les épreuves classées sur un autre temps (plus
      de 5 % des classés au total plus court de plus de 30 s que le précédent : Bike & Run de Marcq 2024), ni dans
      celles qui ont plusieurs « 1er » (plusieurs classements dans une épreuve : Cepoy 2026 M, Ironman de Nice
      2023). L'API repère les épreuves classées sur un autre temps avec la même règle : `classement_hors_ordre` de
      GET /races/{id} (7 épreuves le 25/11/2026 : Tours N Man 2024, Bayman 2024, Ventouxman 2026…).
      Classés plus rapides que des mieux classés (Q18, 25/11/2026) : un classé dont au moins 3 mieux classés ont un
      total plus long de plus de 5 % est marqué `temps_suspect` ; à partir de ce premier cas (rupture : la source
      classe ensuite les non-finishers), tout classé suivant plus court de plus d'une minute qu'un mieux classé l'est
      aussi. Mêmes exceptions. Openlakes Champagne 2026 L : les 428 premiers (finishers) gardent leur temps, les
      334 suivants sont signalés ; XXL : 230 (tous arrêtés avant l'arrivée : leur course à pied
      implicite est plus courte que celle des finishers, souvent que celle du vainqueur). Les petites inversions (Val de Gray 2013 L, 1 à 2 %) et un ou deux
      totaux aberrants trop longs (Carnac 2016, Champ Man 2025) ne déclenchent pas la règle.
      Totaux trop longs (Q18) : un classé ni premier ni dernier dont le total dépasse de plus de 50 % celui de ses
      deux voisins est marqué `temps_suspect` (Carnac 2016 M : 11:23:46 entre deux 02:50). Mêmes exceptions.
    - segments_prolivesport.sql : vide les 5 segments d'une ligne prolivesport dont la somme s'écarte de plus de 5 %
      du total (colonnes décalées : T1 de 00:31:45 pour un total de 00:58:36, Moines 2021 S), et ceux de toutes les
      lignes d'une épreuve dont au moins la moitié des lignes vérifiables sont incohérentes (le décalage touche
      surtout une épreuve entière : 169 épreuves sous 10 % d'incohérentes, 98 au-dessus de 90 %). Total et
      classement gardés. Exécuté après temps_totaux.sql.
    - doublons_sources.sql : retire les épreuves prolivesport, chronoweb ou protiming publiées aussi par
      fftri_t2_area (dates à un jour près, au moins la moitié des athlètes en commun) ; la version fftri_t2_area
      est gardée et la table doublons_sources garde la trace des paires retirées (colonne `source`). Les autres
      épreuves de la source dans ces courses prennent le nom fftri_t2_area pour être regroupées avec elles.
      protiming (23/11/2026) : 64 paires retirées, toutes à 93 % d'athlètes en commun ou plus, les autres paires à
      10 % ou moins (Verdun, Vendôme, Cepoy, Enghien… : 18 316 lignes). Restent 28 962 résultats protiming
      (455 épreuves, 38 courses). Exécuté avant nb_races.sql.
    - lieux.sql : lieux des épreuves, déjà mis au format « Ville (code postal) » par `lieu_lisible` (raw_data.sql,
      toutes sources). Dans une course, les écritures d'une même ville sont ramenées à la plus complète ; une
      épreuve sans lieu prend le lieu le plus fréquent de sa course ; puis les corrections écrites à la main dans
      `transform/lieux_courses.csv` (nom_course;annee;lieu, séparateur « ; ») remplacent le lieu de la source : sans
      année pour toute la course, avec année pour une édition. run_sql.py charge ce CSV dans une table temporaire
      juste avant lieux.sql (`manual_csv`). Exécuté après doublons_sources.sql.
      Pour compléter ou corriger les lieux : `python transform/export_lieux_a_verifier.py` écrit
      `transform/lieux_a_verifier.csv` (non versionné), au même format, avec les courses dont une édition n'a pas de
      lieu ou dont les éditions ont des lieux différents, le lieu le plus fréquent pré-rempli et les lieux vus ;
      corriger, copier les lignes dans `transform/lieux_courses.csv`, reconstruire la base.
      Ce script ne voit pas une même ville écrite de deux façons dans deux courses différentes : le 25/11/2026,
      des lignes ont ramené « La Baule Escoublac (44055) », « Lissac sur Couze » et « Saint Georges d'Oléron »,
      « Saint Pierre » et « Saint Leu » à une seule écriture, et le Volcanik Tri (« Saint-Pierre (97500) » chez
      fftri, code de Saint-Pierre-et-Miquelon) à Saint-Pierre de La Réunion (97410).
4. génération des index :
    - pg_index.sql : création des index pour améliorer les performances des requêtes sur les tables.

Le fichier Python `run_sql.py` permet de lancer le pipeline de suppression des tables jusqu'à la création des index dans la database.
Il est lancé avec la commande `python ./transform/run_sql.py`.

API : `GET /redirections/{races|athletes}/{ancien_id}` renvoie l'id qui remplace un ancien id (404 s'il n'y en
a pas) ; le site s'en sert pour rediriger les anciens liens.
`GET /resolve/{races|athletes}/{id}` dit si la page existe (`redirect: false`), a été remplacée (nouvel id,
`redirect: true`) ou n'existe pas (404) : `triathlon-results/proxy.ts` répond ainsi par un vrai 308 ou une vraie
404. `GET /sitemap/races`, `GET /sitemap/athletes/count` et `GET /sitemap/athletes/{page}` (50 000 id par page)
alimentent les sitemaps du site.
`GET /races/{id}/stats` : repères de niveau d'une épreuve, calculés à la demande en Python sur les classés avec
un temps valide et non suspect. Pour le total et chaque segment affiché par le classement (natation, vélo,
course à pied ; course 1, vélo, course 2 en duathlon, dont la colonne natation contient la première course) :
vainqueur, podium (3ᵉ), top 10 % et 25 % (comme `percentile_disc`), médiane, dernier, histogramme et 3ᵉ de
chaque catégorie, pour tous les classés (`segments`) puis par sexe (`par_sexe`, M et F). Un top 10 % ou 25 %
dont le rang tombe dans le podium vaut null (top 10 % à partir de 31 classés, top 25 % de 13) ; histogramme
à partir de 20 classés.
`GET /races/{id}/trends` : tendances de la course (même nom) entre éditions, par discipline et format (séries
d'au moins 2 éditions, Jeunes et Relais exclus). Une épreuve par année : la plus grande, hors sous-classement.
Pour chaque édition, tous puis par sexe : participants, classés, part de classés, médiane et top 10 % du temps
total, médiane de chaque segment (calculs de `race_benchmarks`, partagés avec `/stats`).
`GET /races/{id}/times` : temps en secondes de chaque classé (total, segments, T1 et T2), avec nom, lien de
profil (sauf équipe), place, sexe et catégorie sans le rang chronoweb, pour le simulateur « Et moi ? » de la page
classement, qui calcule les places dans le navigateur. Mêmes classés que les repères.
`GET /athletes/{id}/progression` : courses classées de l'athlète par discipline et format (séries d'au moins 2,
la plus longue d'abord ; sans équipe, sous-classement, temps suspect, Jeunes ni Relais), dans l'ordre
chronologique : total et segments (si le classement de l'épreuve les affiche), place, nombre de classés,
pourcentage (place / classés), médiane de l'épreuve (comme les repères) et écart à cette médiane en secondes ;
`memes_courses` liste les courses faites au moins deux années. Trois requêtes, quel que soit le nombre de
courses.