# Localisation
`cd /Users/maclv/Work/dev/tri_results/triathlon-results`

# Construire le frontend
Je partirais sur Next.js + TypeScript. C'est une bonne combinaison pour construire un site rapide, avec une bonne gestion du référencement naturel (SEO), ce qui sera important si tu veux attirer du trafic sur les pages des athlètes et des courses.

Quatre pages principales :

    Page 1 — Profil d'un athlète
    - Nom, prénom, éventuellement club.
    - Nombre de courses disputées.
    - Historique des résultats.
    - Meilleurs classements et performances.
    - Liens vers les courses correspondantes.

    Page 2 — Fiche d'une course
    - Nom, date, localisation.
    - Présentation des formats proposés.
    - Nombre de participants.
    - Liens vers les résultats de chaque format.

    Page 3 — Résultats d'une épreuve
    - Tableau des participants.
    - Classement général.
    - Temps et écarts.
    - Classements par catégorie et sexe.
    - Recherche et filtres.

    Page 4 — Recherche
    Une barre de recherche globale permettant de retrouver un athlète, une course ou une épreuve.

Les fonctionnalités complexes comme les comparaisons avancées ou les statistiques prédictives seront développées ensuite. Le premier objectif est qu'un utilisateur puisse trouver rapidement un athlète et consulter l'ensemble de ses résultats.

# Développement du front-end

Choix techniques : Next.js + TypeScript + Tailwind CSS, avec une architecture simple, évolutive et pensée pour le SEO.

L'objectif est de construire un premier site réellement utilisable, connecté à ton API FastAPI, et non une simple maquette.

## Stack technique recommandée
| Technologie | Rôle |
| --- | --- |
| Next.js (App Router) | Framework frontend et rendu SEO |
| TypeScript | Typage et fiabilité |
| Tailwind CSS | Styles et responsive design |
| shadcn/ui | Composants d'interface |
| TanStack Query | Gestion des appels API et du cache côté client |
| Zod | Validation des données |
| Recharts | Graphiques de performances, plus tard |

Je garderais FastAPI comme backend indépendant. Next.js consommera ton API via HTTP.

## Les pages à construire

1. Accueil — /

- Barre de recherche globale.
- Dernières courses ajoutées.
- Courses populaires.
- Accès rapide aux athlètes et aux résultats.

2. Profil athlète — /athletes/[id]

- Informations sur l'athlète.
- Nombre de participations.
- Historique des résultats.
- Meilleurs classements et performances.

3. Fiche course — /races/[id]

- Nom, date et localisation.
- Liste des formats proposés.
- Nombre de participants par format.
- Accès aux classements.

4. Résultats — /formats/[id]/results

- Classement général.
- Temps et écarts.
- Filtres par sexe et catégorie.
- Tri et pagination.

5. Recherche — /search

- Recherche d'athlètes.
- Recherche de courses.
- Résultats regroupés par type.

## Architecture du front-end

triathlon-results/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── athletes/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── races/
│   │   └── [id]/
│   │       └── page.tsx
│   └── formats/
│       └── [id]/
│           └── results/
│               └── page.tsx
├── components/
│   ├── layout/
│   ├── athletes/
│   ├── races/
│   ├── results/
│   └── ui/
├── lib/
│   ├── api.ts
│   ├── athletes.ts
│   ├── races.ts
│   └── results.ts
├── types/
│   ├── athlete.ts
│   ├── race.ts
│   └── result.ts
└── public/

## Quelques choix techniques importants

1. Utiliser les Server Components

Les pages athlètes et courses doivent être indexables par Google. Je privilégierais donc le rendu serveur de Next.js.

2. Garder les filtres dans l'URL

Exemple : `/formats/123/results?gender=M&category=senior&page=2&sort=rank`

C'est pratique pour partager une page de résultats et revenir à la même recherche.

3. Centraliser les appels API

Dans `lib/api.ts`, tu définiras une fonction commune qui gère les appels à FastAPI, les erreurs et les réponses HTTP.

Je conseille de faire les appels depuis les Server Components dans un premier temps. Cela évite notamment les problèmes de CORS côté navigateur. Les composants interactifs pourront modifier les paramètres d'URL et déclencher un nouveau rendu serveur.

## Order de développement

| Étape | Livrable |
| --- | --- |
| 1	| Layout général, navigation et identité visuelle |
| 2	| Page de résultats avec filtres, tri et pagination |
| 3	| Page profil athlète |
| 4	| Page course et liste des formats |
| 5	| Recherche globale |
| 6	| Responsive mobile et optimisation SEO |

Je commencerais par la page de résultats : elle permet de valider immédiatement la connexion avec ton API et les interactions les plus importantes.

## Informations importantes

- Direction graphique : sport/performance, inspirée de Strava et Garmin.

## identité visuelle

- Fond gris très clair, avec des surfaces blanches.
- Noir ou bleu nuit pour les textes.
- Orange vif comme couleur d'accent pour les performances et les actions.
- Typographie moderne, chiffres bien visibles.
- Tableaux de résultats denses mais lisibles.
- Interface responsive, pensée aussi bien pour ordinateur que mobile.

L'objectif est de donner l'impression d'une véritable plateforme de résultats sportifs, pas d'un tableau de bord administratif.

# Développement réalisés et en cours

Réalisés
- page d'accueil
    - Blocs Triathlon, Cross Triathlon, Duathlon et Bike & Run : liens vers `/races` filtré sur la discipline
      (`triathlon`, `cross triathlon`, `duathlon`, `bike&run`). Icône Bike & Run dessinée dans le style lucide
      (`components/home/person-with-bike-icon.tsx`, personne qui tient son vélo) ; Cross Triathlon : montagne.
    - Bloc Course à pied : non cliquable, bordure en pointillés et mention « En cours de développement,
      bientôt disponible » (aucune course à pied en base).
    - Dernières compétitions : les 6 courses les plus récentes ayant des résultats (`GET /events`, même ordre
      que `/races`), chargées en streaming avec un squelette, et lien « Toutes les courses ».
      Code : `components/home/latest-races.tsx`.
- page de résultats d'une course : `/races/[id]/results` (et non `/formats/[id]/results` comme prévu plus haut).
    - En-tête alimenté par `GET /races/{id}` (nom, date, format, lieu) ; 404 si l'épreuve n'existe pas.
    - Tri en cliquant sur les en-têtes : classement, athlète, natation, T1, vélo, T2, course, total.
    - Aquathlon, bike&run et swimrun : seul le temps total est affiché (pas de colonnes natation, T1, vélo, T2,
      course), via `DISCIPLINES_WITHOUT_SPLITS` dans `types/result.ts`. Il en va de même pour toute épreuve dont la
      source n'a publié aucun temps intermédiaire (`avec_segments` de `GET /races/{id}`, 20/11/2026) : environ 80
      triathlons (Chantilly 2025 XXL…) et 50 épreuves d'autres disciplines n'affichent plus des colonnes vides.
    - Filtres (formulaire GET `next/form`) : nom de l'athlète, sexe, catégorie, nombre de lignes par page (20, 50, 100).
    - Tout l'état est dans l'URL : `?sexe=F&categorie=MS3&q=dupont&sort_by=total_time&order=desc&limit=50&offset=50`.
    - Code : `lib/results-query.ts` (lecture et construction de l'URL), `lib/api.ts` (appels API),
      `components/results/` (tableau, filtres), `loading.tsx` (squelette).
- page profil athlète : `/athletes/[id]` (id = `unified_id`, celui des liens du classement d'une course).
    - En-tête : nom, club, sexe, saisons, disciplines avec leur nombre de courses.
    - Chiffres clés : courses, podiums, top 10, meilleur classement, nombre de saisons.
    - Meilleurs temps par discipline et format, avec lien vers le classement de la course. Seuls les résultats
      classés comptent : le temps d'un non-classé est souvent celui de son abandon (00:32:50 sur un M) ; un temps
      suspect (voir ci-dessous) non plus.
    - Historique : date, épreuve (lien vers son classement), format, catégorie, « clt / participants », temps.
      Tri par date (défaut, plus récente d'abord), classement ou temps ; filtres saison et discipline ; pagination.
    - URL : `/athletes/123?annee=2024&discipline=triathlon&sort_by=clt&order=asc&offset=20`.
    - Code : `lib/athlete-results-query.ts`, `components/athletes/`, `types/athlete.ts`.
- page course : `/races/[id]` (id = n'importe quelle épreuve de la course), alimentée par `GET /races/{id}/event`.
    - Une course = les épreuves de même nom et même année (ex. Deauville 2022 : XXL, L, M sur 3 jours).
    - En-tête : nom, édition, période (« 17–19 juin 2022 »), lieu, nombre de formats, participants distincts.
    - Une carte par format : discipline, format, date, participants, vainqueur et première femme
      (liens vers leur profil, avec leur temps), bouton vers le classement.
    - Ordre des cartes, identique d'une édition à l'autre (calculé par l'API, `race_format_sort_key`) : discipline
      dans l'ordre des cartes de la page d'accueil (triathlon, cross triathlon, duathlon, cross duathlon, aquathlon,
      swimrun, bike&run), puis format (XS, S, M, L, XL, XXL, JEUNES, RELAIS, format non précisé), puis date et nom
      d'origine de l'épreuve. Avant, les cartes suivaient la date puis l'id, qui change à chaque reconstruction.
    - Autres éditions : liens vers les autres années de la même course.
    - Le lien « Retour » du classement d'un format ramène maintenant à la page course.
    - Code : `components/races/`, types `RaceEvent` / `RaceFormat` dans `types/race.ts`.
- recherche globale : `/search?q=…` (alimentée par `GET /search`).
    - Champ de recherche (formulaire GET `next/form`, validé par Entrée) dans le header (icône vers `/search` sur mobile),
      dans le bandeau de l'accueil (à la place du bouton « Explorer les résultats ») et en haut de `/search`.
    - Tous les mots doivent apparaître, dans n'importe quel ordre, sans tenir compte des majuscules ni des accents.
    - Onglets « Tout » (6 athlètes + 6 courses, lien « Tout voir »), « Athlètes » et « Courses » (20 par page, pagination),
      avec le nombre de résultats de chaque type. URL : `/search?q=deauville&type=races&offset=20`.
    - Athlètes : nom, club, nombre de courses, dernière saison ; les plus actifs d'abord.
    - Courses : regroupées par nom + année comme la page course, avec période, lieu et disciplines ; les plus récentes d'abord.
      Chaque mot est cherché dans le nom de la course ou dans son lieu (22/11/2026) : « carcassonne », un code postal
      « 62610 », ou « saint pierre », qui trouve aussi « Trirun Man » (à Saint Pierre). Placeholder du champ :
      « Athlète, course ou ville… ».
    - Code : `app/search/`, `components/search/`, `types/search.ts`, `searchSite` dans `lib/api.ts`.
- liste des courses : `/races` (lien « Courses » du header), alimentée par `GET /events`.
    - Courses (nom + année) les plus récentes d'abord, filtres nom ou ville, saison, discipline (`races.type_epreuve`) et
      format (`races.format_epreuve`), 20 par page. Discipline et format s'appliquent à la même épreuve :
      « triathlon + M » = les courses qui ont une épreuve de triathlon au format M.
    - Nom ou ville (22/11/2026) : champ de recherche comme sur la liste des athlètes (2 caractères min., paramètre
      `q` de `GET /events`), même recherche que la recherche globale (`search_races_page`) : chaque mot dans le nom
      ou le lieu, sans accents ni casse (« etaples » trouve « Triathlon Étaples-sur-Mer », « carcassonne » les
      courses à Carcassonne).
    - URL : `/races?q=ardres&annee=2022&discipline=triathlon&format=M&offset=20`.
- liste des athlètes : `/athletes` (lien « Athlètes » du header), alimentée par `GET /athletes`.
    - Athlètes les plus actifs d'abord, filtres nom (mêmes règles que la recherche) et sexe, 20 par page.
    - URL : `/athletes?q=leroy&sexe=F&offset=20`.
- header : le lien « Résultats » (`/results`) a été supprimé (doublon de « Courses » : un classement s'ouvre depuis sa course).
- composants partagés : `components/shared/sortable-header.tsx`, `pagination-bar.tsx`, `filter-form.tsx`
  (barre de filtres GET) et `list-loading.tsx` (squelette des listes) ; fonctions d'affichage communes dans
  `lib/format.ts` (dates, période, classement, ordinal).

- responsive mobile (vérifié à 375 px, aucune page ne déborde horizontalement) :
    - header : liens « Courses » et « Athlètes » visibles sur mobile (ils étaient masqués sous `md`).
    - classement d'une course : sur mobile, seules les colonnes Clt., Athlète et Total sont affichées ;
      catégorie, sexe et temps intermédiaires à partir de `md`.
    - historique d'un athlète : sur mobile, Épreuve (date en dessous), Clt. et Temps ; date, format et
      catégorie en colonnes à partir de `md`.
    - cartes de format : un nom de vainqueur long ne fait plus déborder la page course.
- SEO :
    - `lib/seo.ts` : adresse du site (`SITE_URL`, `http://localhost:3000` par défaut, à renseigner au
      déploiement), métadonnées des pages course, classement et athlète (titre, description, Open Graph).
    - URL canoniques : `/races/[id]` pointe vers l'épreuve de référence de la course (la même que dans les
      listes), quel que soit le format par lequel on y arrive ; les paramètres de tri et filtre sont exclus.
    - Descriptions des listes `/races` et `/athletes` ; `/search` en `noindex, follow`.
    - `app/not-found.tsx` : page 404 en français (`noindex`), avec liens vers les courses et la recherche.
    - Passe SEO du 22/11/2026 :
        - Codes HTTP : `proxy.ts` (le middleware de Next 16) vérifie l'id de `/races/[id]`,
          `/races/[id]/results` et `/athletes/[id]` avant le rendu, via `GET /resolve/{races|athletes}/{id}` :
          vraie redirection 308 pour un id remplacé (suffixe et paramètres gardés), vraie 404 pour un id
          inconnu (réécriture vers un chemin inexistant, qui affiche `app/not-found.tsx`). Avant, ces pages
          répondaient 200 même pour Googlebot : leur `loading.tsx` fait envoyer la page avant que `notFound()`
          ou la redirection ne soient décidés (redirection en JavaScript seulement, « soft 404 »). En cas
          d'erreur de l'API, le proxy laisse passer et la page gère l'erreur. Coût : un appel d'API par page
          course, classement ou athlète.
        - Sitemaps (les id sont stables depuis `transform/ids_stables.sql`) : `app/sitemap.ts` → `/sitemap.xml`
          (accueil, listes, 2 097 pages course à leur URL canonique, 3 574 classements, avec date) ;
          `app/athletes/sitemap.ts` → `/athletes/sitemap/{0-9}.xml`, 50 000 profils par fichier (258 342
          athlètes, 6 fichiers remplis). Le nombre de fichiers est fixe (10) parce que `generateSitemaps`
          s'exécute au build, sans API ; `app/robots.ts` ne liste que les fichiers remplis
          (`GET /sitemap/athletes/count`). API : `GET /sitemap/races`, `GET /sitemap/athletes/{page}`.
        - Description du classement selon la page : « Participants … » pour une épreuve sans temps
          (`sans_temps`), temps de natation, vélo et course à pied (triathlon) ou de course à pied et de vélo
          (duathlon) seulement quand la page les affiche, sinon temps total.
        - URL canoniques : `/races` et `/athletes` pour leurs variantes filtrées (`?q=…`, `?annee=…`), `/` pour
          l'accueil (avec `og:url`). `pageMetadata` (`lib/seo.ts`) est partagé par ces pages.
        - Au déploiement : renseigner `SITE_URL` (sinon URL canoniques, Open Graph et sitemaps pointent vers
          `http://localhost:3000`).

En cours :
- rien.

Points connus (données) :
- Sexe prolivesport : corrigé le 19/11/2026 dans `transform/` (il était déduit de la première lettre de la catégorie,
  SE/MA/VE → S/M/V, au lieu de la colonne `sexe` de la source). Le filtre sexe et la « première femme » fonctionnent
  maintenant pour prolivesport ; les équipes mixtes (X) ont un sexe vide. fftri_t2_area garde quelques valeurs hors
  M/F (E, 4, J…, première lettre de sa catégorie), ignorées par l'API.
- prolivesport code les non-classés avec `clt = 0` ou `99991` à `99999` (et un temps `00:00:00`) : affichés « NC », placés en fin de tri, exclus des statistiques.
- prolivesport (corrigé le 19/11/2026) : l'ancien scraping copiait chaque événement sur 6 faux formats (OPEN, PTWC…)
  avec toutes les distances mélangées. Le nouveau scraping a une épreuve par fichier, et `transform/disciplines.sql`
  en déduit discipline et format (dont JEUNES et RELAIS ; format vide si rien ne permet de le savoir, ~3 % des
  résultats). Les contournements de l'API et du front (« Toutes distances », dédoublonnage OPEN, formats
  prolivesport exclus) ont été retirés. Limite : quand la lettre du nom et la distance ne concordent pas (8 %), la
  lettre l'emporte ; 18 épreuves jeunes d'événements « Triathlon / Duathlon » prennent la discipline de la catégorie.
- chronoweb (20/11/2026) : ses résultats arrivent dans la base depuis que la date est scrappée (68 491 résultats,
  504 épreuves). Le format chronoweb est le nom de l'onglet Excel (« Half Relais », « Benjamins », « 8-9 ans ») :
  `transform/disciplines.sql` en déduit discipline et format comme pour prolivesport, et le filtre Discipline
  revient à 7 valeurs. Les onglets « Détails » et les manches intermédiaires sont exclus. Format vide pour les
  onglets sans indication (« CD » d'Altriman, « Poursuite », « Super Tri », finales Speed…). Les doublons avec
  fftri_t2_area sont retirés (voir ci-dessous) : restent 55 907 résultats chronoweb sur 457 épreuves.
- 589 épreuves n'ont aucun résultat (souvent sans date, anciennes sources) : elles sont ignorées dans les formats d'une course.
- Les noms prolivesport contenaient l'année (« Triathlon Bray-Dunes 2022 ») et parfois le numéro d'édition
  (« 38e Triathlon… ») : les deux sont retirés dans `transform/` (`prolivesport_event_name`, l'année reste dans
  `year_epreuve`), ce qui relie les éditions de 41 courses. Restent séparés les noms dont la formulation change
  d'une année à l'autre (« Triathlon Bray-Dunes » / « Triathlon de Bray-Dunes »).
- Noms qui ne diffèrent que par la casse, les accents ou la ponctuation (corrigé le 20/11/2026) : 24 groupes
  (« Triathlon de l'Omois » / « Triathlon de L'omois », « Swimrun du Levézou » / « Swimrun du levezou »,
  « Cross-Duathlon du Haricot » / « Cross Duathlon du Haricot »…) sont ramenés à un seul nom par
  `transform/noms_epreuves.sql`, et leurs éditions à une seule course. Le nom gardé est le plus lisible : les
  courses fftri_t2_area qui ont aussi un nom écrit avec majuscules dans une autre source s'affichent maintenant
  ainsi (« Triathlon de Dijon », « Altriman », « Triathlon de Toulouse »).
- Noms d'athlètes (20/11/2026) : « BASSETTO Jean-Marc », « BASSETTO Jean Marc » et « BASSETTO JEAN MA » formaient
  trois profils. Tirets et apostrophes ne séparent plus deux athlètes, et 477 noms coupés par la source à une
  longueur fixe (Gérardmer 2001-2004, Embrunman 2005, Saint-Jean-de-Luz 2014-2015…) sont rattachés à l'athlète
  complet quand il n'y a qu'un candidat : 273 319 → 270 063 athlètes. La recherche coupe aussi les mots aux tirets
  (« jean-marc » cherche « jean » et « marc »).
- Homonymes d'une même épreuve (20/11/2026) : deux personnes du même nom dans une épreuve n'y gardaient qu'un
  résultat. Elles sont maintenant deux résultats et deux profils (« MEUNIER Paul », 801e et 1171e de l'Ironman de
  Vichy 2025) : 839 097 → 839 492 résultats, 392 nouveaux athlètes. Le mieux classé garde le profil commun ; l'autre
  a un profil avec cette seule épreuve (impossible de savoir à qui sont les autres courses). Les doublons de la
  source (même temps, ou ligne sans temps) restent fusionnés.
- Virgule dans les noms (20/11/2026) : chronoweb écrit souvent « NOM, Prénom » (3 462 lignes) ; « MEUNIER, Paul »
  et « MEUNIER Paul » formaient deux profils. La virgule compte maintenant comme un espace, dans la clé et dans la
  recherche : 2 268 profils rejoignent l'athlète existant (270 455 → 268 187 athlètes). Effet de bord voulu : le
  Triathlon de Dijon 2026 chronoweb, écrit en « NOM, Prénom », est reconnu comme doublon de la version fftri_t2_area
  (297 athlètes en commun sur 312) et retiré (839 492 → 839 180 résultats).
- Temps totaux faux (20/11/2026) : la source affichait au vainqueur de Tribreizh 2022 L un temps de 00:01:03 (le
  4e à 00:00:18) alors que ses segments font 04:18:04 ; « MACQ Guillaume » avait donc un meilleur temps L de
  00:01:03. Dans les 4 épreuves où les totaux ne suivent pas le classement mais où la somme des segments le suit
  (Tribreizh 2022, Saint Remy sur Durolle 2005, Roybon 2021, Paris 2022), le total est recalculé depuis les
  segments (`transform/temps_totaux.sql`). Les meilleurs temps du profil ne prennent plus que les résultats classés
  (603 temps de non-classés écartés, dont ceux de Douai 2017 S, où tous les temps sont inutilisables).
- Temps suspects (20/11/2026) : 19 temps classés restent anormalement courts (moins de la moitié du temps médian de
  l'épreuve) : Openlakes Champagne 2026 L (750e à 762e, temps d'abandon), Lacanau 2017 L (609e en 00:00:07), Ardres
  2019 Jeunes (vainqueur en 00:02:22)… Le bon temps ne peut pas être retrouvé : ils sont signalés. Le composant
  `components/shared/total-time.tsx` affiche le temps en gris précédé d'une alerte ⚠, expliquée au survol et aux
  lecteurs d'écran (« Temps anormalement court pour cette épreuve (moins de la moitié du temps médian) : probablement
  une erreur de la source. ») ; il sert dans le classement, l'historique du profil et le podium des cartes de
  format. La page de classement affiche un bandeau quand l'épreuve en contient : « Certains temps de cette épreuve
  semblent erronés dans la source. Ils sont signalés dans le classement. » Le classement reste celui de la source ;
  ces temps ne comptent pas dans les meilleurs temps du profil.
- Segments prolivesport décalés (20/11/2026) : dans une centaine d'épreuves prolivesport, les colonnes de temps
  intermédiaires étaient décalées (Moines 2021 S, vainqueur : T1 00:31:45 pour un total de 00:58:36 ; Sartrouville
  2026 Jeunes : vélo 00:00:32). Ces segments sont vidés (`transform/segments_prolivesport.sql`) : « — » pour une
  ligne isolée, et seulement la colonne du total quand toute l'épreuve est touchée (`avec_segments`). Le total et le
  classement ne changent pas.
- Liens stables (20/11/2026) : les id d'athlète et d'épreuve ne changent plus quand la base est reconstruite
  (`transform/ids_stables.sql`), les liens partagés vers `/athletes/[id]` ou `/races/[id]` restent valables. Quand
  un id a été remplacé (deux profils réunis, épreuve en double retirée), les pages `/races/[id]`,
  `/races/[id]/results` et `/athletes/[id]` redirigent (308) vers le nouvel id au lieu d'afficher la page 404
  (`lib/redirections.ts`, `GET /redirections/...`).
- Club affiché (22/11/2026) : la liste des athlètes et le profil affichaient parfois deux clubs différents pour un
  athlète qui a changé de club (VILPOUX Louis : Courbevoie dans la liste, Wasquehal sur le profil). Le club affiché
  est maintenant partout celui de sa course la plus récente (`transform/athletes_club.sql`) ; pour les rares
  athlètes sans résultat qui donne un club, la liste et le profil lisent leurs lignes dans le même ordre.
- Sexe chronoweb (22/11/2026) : 62 % des résultats chronoweb avaient un chiffre au lieu de M ou F (le premier
  caractère de leur catégorie « 14/MV3 ») et échappaient au filtre sexe du classement ; le sexe d'un athlète qui ne
  court que chez chronoweb était inconnu. Il est maintenant lu dans la catégorie (`sexe_categorie`,
  `transform/raw_data.sql`) : 47 462 résultats chronoweb sur 51 604 ont M ou F (Triathlon d'Oléron 2024 : 235
  hommes, 147 femmes, 88 sans catégorie ou en catégorie mixte).
- Lieu des épreuves fftri (22/11/2026) : les 2 219 épreuves fftri_t2_area n'avaient pas de lieu ; il est lu dans
  l'en-tête de leur page fftri (`sources/fftri_t2_area_lieux.py`) et affiché dans l'en-tête de la course
  (« Sizun (29450) » pour Tribreizh 2022).
- Lieux harmonisés et corrigeables (22/11/2026) : tous les lieux sont au format « Ville (code postal) » (prolivesport
  écrivait « 62610 ARDRES 62 - Pas-de-Calais France », « nan nan nan nan ») ; dans une course, une seule écriture par
  ville ; une épreuve sans lieu prend celui de sa course. Les lieux manquants ou faux se corrigent à la main dans
  `transform/lieux_courses.csv` (voir backend.md, lieux.sql). 171 épreuves (29 courses) restent sans lieu, 13 courses
  ont des lieux différents selon l'édition (« Chantiily » / « Chantilly », « Limoges » pour Chalain).
- Clubs (corrigé le 20/11/2026) : 5 694 clubs écrits avec « ` » au lieu d'une apostrophe (« TRIATHLON CLUB
  D`HAZEBROUCK ») sont corrigés ; 1 519 valeurs qui disaient seulement « pas de club » (« NON LICENCIE », « NL »,
  « NONE », « 0 », « - », « ??? »…) sont vidées, comme les licences individuelles (« INDIVIDUEL », « LICENCE
  INDIV. », « INDIV LIGUE PAYS DE LA LOIRE »…), qui ne sont pas des clubs. Restent environ 40 % de lignes sans club :
  la source ne le donne pas.
- Noms mal encodés (corrigé le 20/11/2026) : 218 noms et 29 clubs des trois sources étaient affichés « ThÃ©o
  HANQUIEZ », « FranÃ§ois », « STADE FRANÃ§AIS ». Ils sont corrigés dans `transform/raw_data.sql`, ce qui relie aussi
  ces résultats au bon athlète (« Théo HANQUIEZ » et « HANQUIEZ Theo » ne font plus qu'un). Limite : quand la source
  avait mis le nom mal encodé en majuscules, la lettre accentuée reste en minuscule (« CRéPIN »).
- Épreuves en double le même jour (20/11/2026) : 38 sous-classements repérés par `transform/sous_classements.sql`
  (au moins 95 % de leurs athlètes dans une épreuve plus grande du même jour) : 26 « Championnat de France Fftri »
  publiés à côté de leur course hôte (Dijon 2017, Vichy 2024…), les catégories para de Cabourg 2025, « Open » et
  « Jeunes » dans le « Full » des Moines 2020, les finales de l'Aquathlon de Limoges 2017… Ils restent visibles sur
  leur page, avec la mention « Sous-classement d'une autre épreuve du même jour : non compté dans les profils » ;
  leurs 7 680 résultats déjà présents dans la grande épreuve ne comptent plus deux fois dans les profils (course,
  historique, meilleurs temps). 2 doublons identiques sont supprimés (Altriman 2021 « Aquathlon 6-9 » / « 8-11 »,
  Pilon 2022 « Poursuite » / « XS Poursuite »).
- Épreuves sans temps (20/11/2026) : 270 épreuves prolivesport (17 584 résultats, ex. Cross-Duathlon du Haricot
  2016-2021, Chamouille 2017 et 2019) n'ont ni temps total ni classement dans la source. Les temps ne sont pas
  recalculés à partir des segments : chez prolivesport, même quand le total existe, la somme des segments ne lui
  correspond à 2 s près que dans 60 % des cas (colonnes parfois décalées). L'API marque ces épreuves `sans_temps`
  (`races_without_time` : ni temps total ni classement valides ; une épreuve classée sans total, comme Bayman 2024,
  garde son classement). La page de l'épreuve devient une liste de participants par ordre alphabétique, avec un
  message, sans colonne de classement ni de temps total et sans tri par temps ; la carte du format affiche « Temps
  et classement non publiés par la source » au lieu du podium. Partout ailleurs, un temps à 00:00:00 est vidé dans
  `transform/results.sql` et s'affiche « — ».
- Temps chronoweb (corrigé le 20/11/2026) : 17 % des temps gardaient les fractions de seconde de la cellule Excel
  (« 01:29:09.357000 »), ce qui faussait l'affichage et le tri par temps. Ils sont tronqués à la seconde ; les « ? »
  et 39 dates Excel prises pour des temps intermédiaires (Aquathlon de Limoges 2017) sont vidés.
- Filtre sexe de la liste des athlètes (corrigé le 20/11/2026) : il utilisait le sexe d'une seule ligne de
  l'athlète, qui pouvait venir d'un résultat mal renseigné (« MARTIN Nicolas », 125 résultats M, listé parmi les
  femmes à cause d'une catégorie fftri « FH »). Il suit désormais le sexe du profil, le plus fréquent dans ses
  résultats (`transform/athletes_sexe.sql`).
- Éditions d'une même course sous des noms différents (corrigé le 20/11/2026) : `transform/noms_epreuves.sql`
  regroupe aussi les noms qui ne diffèrent que par les petits mots, « open », le jour ou l'ordre des mots
  (« Triathlon Bray-Dunes » / « Triathlon de Bray-Dunes », « Triathlon Open Quiberon - Samedi », « Touquet Bike &
  Run » / « Bike & Run Le Touquet »), plus quelques alias écrits à la main (Audomarois, Noyon, Triath'Elles,
  Chtriman, Le Touquet, Quiberon) : 504 → 472 noms de course. Puis (Q11) « St », « Ste » et « Sainte » comptent pour
  « Saint » : « Duathlon de Saint Aldegonde » et « … de Sainte Aldegonde » forment une seule course, « Duathlon de
  Sainte Aldegonde - Pays de Mormal » (2023-2026) : 471 noms. Les noms fftri_t2_area en minuscules sont mis en forme
  (« Triathlon Jura Vouglans », « Triathlon d'Angouleme ») ; leurs accents manquent toujours.
- Équipes (19/11/2026) : en bike&run et en relais, une ligne prolivesport peut être une équipe (5 683 lignes)
  ou une seule personne (770 lignes). Les équipes sont affichées sans lien (« MEEUS Theo & MOREAU TEOPHANE »,
  « LES PELUCHOS »), avec « Équipe gagnante » sur la page course et une colonne « Équipe » dans le classement ;
  elles n'ont ni profil ni place dans la liste des athlètes ou la recherche. Les équipiers ne retrouvent pas encore
  ces résultats dans leur profil (il faudrait garder prénom et nom séparés au scraping et relier un résultat à
  plusieurs athlètes).
- Équipes chronoweb (20/11/2026) : chaque ligne d'un relais ou d'un bike&run chronoweb est une équipe (3 931
  lignes). Elle est affichée sans lien, sous son nom d'équipe (« Les Galope Chenaux ») ou avec ses équipiers
  (« FLINOIS ANTHONY & PICHONNIER GUILLAUME (COT SENIOR) ») ; environ 3 700 faux profils d'athlète disparaissent.
  Les 4 lignes chronoweb sans nom sont exclues.
- Doublons prolivesport / fftri_t2_area (corrigé le 19/11/2026) : une épreuve publiée par les deux sources est
  reconnue à ses participants (dates à un jour près, au moins la moitié des athlètes en commun) et seule la version
  fftri_t2_area est gardée (`transform/doublons_sources.sql`, 60 épreuves retirées, trace dans la table
  `doublons_sources`). Les épreuves que seul prolivesport publie (souvent XS, S, jeunes, relais) restent, sous le
  nom fftri_t2_area de la course, pour toutes les années de leur nom prolivesport : la course n'apparaît qu'une fois
  (ex. Étaples : 7 courses au lieu de 11). Le nom affiché est donc celui de fftri_t2_area (« triathlon d etaples
  sur mer »), et une course mixte peut prendre le nom de sa partie fftri (« Triathlon/Duathlon des Géants - Douai »
  → « duathlon de douai »).
- Doublons chronoweb / fftri_t2_area (corrigé le 20/11/2026) : même règle et même choix (fftri_t2_area gardé, 84 %
  de participants classés chez chronoweb sur ces doublons contre 97 %). 47 épreuves retirées (Half, M, Altriman…
  d'Altriman, Extrememan, Dijon, Vouglans, Toulouse…) ; les autres épreuves chronoweb de 14 courses prennent le nom
  fftri_t2_area (« Triathlon de Vouglans » → « triathlon jura vouglans »), ce qui relie aussi « Extrememan »,
  « Extrememan Narbonne » et « Extreme-man de Narbonne ».
- Des lieux d'épreuve contiennent "nan" (valeurs vides converties en texte au scraping, ex. « nan Cabourg nan nan ») :
  l'API les retire (`clean_lieu`).
- Le serveur de dev Turbopack ne voit parfois pas une nouvelle fonction exportée par `lib/api.ts` (« … is not a function »
  alors que `tsc` et `next build` passent) : redémarrer `npm run dev` règle le problème.
- Les identifiants d'athlètes (`unified_id`) changent à chaque relance du pipeline `transform/` : les liens vers
  `/athletes/[id]` ne sont pas stables dans le temps (ceux des courses le sont).
- Une course ou un athlète inexistant renvoie le statut HTTP 200 (et non 404) : avec le rendu en streaming
  (`cacheComponents`), l'en-tête est déjà envoyé quand l'API répond 404. La page affiche quand même la 404 et
  porte `noindex`, ce que les moteurs de recherche respectent. Les URL inconnues (`/inconnu`) renvoient bien 404.
- La recherche d'athlètes parcourt les 1,4 M lignes de `athletes` sans index (~200 ms) : un index trigramme
  (`pg_trgm`) sur `athlete_key` l'accélérerait si le volume augmente.