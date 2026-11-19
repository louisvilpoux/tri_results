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
    - Filtres (formulaire GET `next/form`) : nom de l'athlète, sexe, catégorie, nombre de lignes par page (20, 50, 100).
    - Tout l'état est dans l'URL : `?sexe=F&categorie=MS3&q=dupont&sort_by=total_time&order=desc&limit=50&offset=50`.
    - Code : `lib/results-query.ts` (lecture et construction de l'URL), `lib/api.ts` (appels API),
      `components/results/` (tableau, filtres), `loading.tsx` (squelette).
- page profil athlète : `/athletes/[id]` (id = `unified_id`, celui des liens du classement d'une course).
    - En-tête : nom, club, sexe, saisons, disciplines avec leur nombre de courses.
    - Chiffres clés : courses, podiums, top 10, meilleur classement, nombre de saisons.
    - Meilleurs temps par discipline et format, avec lien vers le classement de la course.
    - Historique : date, épreuve (lien vers son classement), format, catégorie, « clt / participants », temps.
      Tri par date (défaut, plus récente d'abord), classement ou temps ; filtres saison et discipline ; pagination.
    - URL : `/athletes/123?annee=2024&discipline=triathlon&sort_by=clt&order=asc&offset=20`.
    - Code : `lib/athlete-results-query.ts`, `components/athletes/`, `types/athlete.ts`.
- page course : `/races/[id]` (id = n'importe quelle épreuve de la course), alimentée par `GET /races/{id}/event`.
    - Une course = les épreuves de même nom et même année (ex. Deauville 2022 : XXL, L, M sur 3 jours).
    - En-tête : nom, édition, période (« 17–19 juin 2022 »), lieu, nombre de formats, participants distincts.
    - Une carte par format : discipline, format, date, participants, vainqueur et première femme
      (liens vers leur profil, avec leur temps), bouton vers le classement.
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
    - Code : `app/search/`, `components/search/`, `types/search.ts`, `searchSite` dans `lib/api.ts`.
- liste des courses : `/races` (lien « Courses » du header), alimentée par `GET /events`.
    - Courses (nom + année) les plus récentes d'abord, filtres saison, discipline (`races.type_epreuve`) et
      format (`races.format_epreuve`), 20 par page. Discipline et format s'appliquent à la même épreuve :
      « triathlon + M » = les courses qui ont une épreuve de triathlon au format M.
    - URL : `/races?annee=2022&discipline=triathlon&format=M&offset=20`.
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
    - `app/robots.ts` : tout est explorable sauf `/search`. Pas de sitemap pour l'instant (choix : les id
      d'athlètes ne sont pas stables).
    - `app/not-found.tsx` : page 404 en français (`noindex`), avec liens vers les courses et la recherche.

En cours :
- rien.

Points connus (données) :
- Sexe prolivesport : corrigé le 19/11/2026 dans `transform/` (il était déduit de la première lettre de la catégorie,
  SE/MA/VE → S/M/V, au lieu de la colonne `sexe` de la source). Le filtre sexe et la « première femme » fonctionnent
  maintenant pour prolivesport ; les équipes mixtes (X) ont un sexe vide. fftri_t2_area garde quelques valeurs hors
  M/F (E, 4, J…, première lettre de sa catégorie), ignorées par l'API.
- prolivesport code les non-classés avec `clt = 0` ou `99991` à `99999` (et un temps `00:00:00`) : affichés « NC », placés en fin de tri, exclus des statistiques.
- prolivesport (corrigé le 19/11/2026) : l'ancien scraping copiait chaque événement sur 6 faux formats (OPEN, PTWC…)
  avec toutes les distances mélangées. Le nouveau scraping a une épreuve par fichier, et `transform/prolivesport.sql`
  en déduit discipline et format (dont JEUNES et RELAIS ; format vide si rien ne permet de le savoir, ~3 % des
  résultats). Les contournements de l'API et du front (« Toutes distances », dédoublonnage OPEN, formats
  prolivesport exclus) ont été retirés. Limite : quand la lettre du nom et la distance ne concordent pas (8 %), la
  lettre l'emporte ; 18 épreuves jeunes d'événements « Triathlon / Duathlon » prennent la discipline de la catégorie.
- 589 épreuves n'ont aucun résultat (souvent sans date, anciennes sources) : elles sont ignorées dans les formats d'une course.
- Les noms prolivesport contenaient l'année (« Triathlon Bray-Dunes 2022 ») : elle est retirée dans `transform/`
  (`prolivesport_event_name`, l'année reste dans `year_epreuve`), ce qui relie les éditions de 34 courses. Restent
  séparés les noms qui changent d'une année à l'autre, surtout à cause du numéro d'édition (« 38e Triathlon… »,
  « 39e Triathlon… », 24 noms) ou d'une formulation différente (« Triathlon Bray-Dunes » / « Triathlon de Bray-Dunes »).
- Une même course peut venir de deux sources sous deux noms différents (ex. « Triathlon De Ardres » et
  « DUATHLON TRIATHLON DU LAC D'ARDRES 2026 ») : elle apparaît deux fois dans l'historique.
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