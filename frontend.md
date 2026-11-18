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
- page de résultats d'une course : `/races/[id]/results` (et non `/formats/[id]/results` comme prévu plus haut).
    - En-tête alimenté par `GET /races/{id}` (nom, date, format, lieu) ; 404 si l'épreuve n'existe pas.
    - Tri en cliquant sur les en-têtes : classement, athlète, natation, T1, vélo, T2, course, total.
    - Filtres (formulaire GET `next/form`) : nom de l'athlète, sexe, catégorie, nombre de lignes par page (20, 50, 100).
    - Tout l'état est dans l'URL : `?sexe=F&categorie=MS3&q=dupont&sort_by=total_time&order=desc&limit=50&offset=50`.
    - Code : `lib/results-query.ts` (lecture et construction de l'URL), `lib/api.ts` (appels API),
      `components/results/` (tableau, en-tête triable, filtres, pagination), `loading.tsx` (squelette).

En cours :
- rien. Prochaine étape prévue : page profil athlète.

Points connus :
- La colonne `sexe` des résultats prolivesport contient des lettres de catégorie (S, J, P…) : le filtre sexe n'est fiable que pour fftri_t2_area.
- Les liens du header (`/races`, `/athletes`, `/results`, `/search`) et `/athletes/[id]` mènent encore à des pages inexistantes.