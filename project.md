# Objectif

Faire un site qui regroupe tous les résultats de courses en triathlon et duathlon.

## Business modèles possibles

1. Business modèle “Données & API”
    👉 Monétiser la donnée sportive (très recherché)
    - API payante pour clubs, fédérations, organisateurs, coachs et développeurs.
    - Formules :
    - Free : accès limité (résultats partiels, 1 course / jour).
    - Pro : accès illimité + filtres + export CSV/JSON.
    - Enterprise : intégration directe avec logiciels d'entraînement.

2. Business modèle “Freemium + Premium”
    - Gratuit : recherche de base, profils d’athlètes, résultats classiques.
    - Payant :
    - Statistiques avancées (progression, comparaisons, prédictions).
    - Notifications (dès qu’un résultat sort).
    - Profils athlètes enrichis (CV sportif, graphiques).
    - Rapports automatiques pour coachs.

3. Abonnements Clubs & Coachs
    - Dashboard coach : progression de leurs athlètes, historiques consolidés.
    - Outils d’analyse (TSS estimé, calculs chronos, transitions…)
    - Export automatiques pour TrainingPeaks, Strava, Garmin.

4. Monétisation via les Organisateurs
    - Page dédiée par course (avec SEO gratuit pour eux).
    - Options payantes :
    - Mise en avant de la course.
    - Branding / couleur / logo.
    - Export certifié de résultats.
    - Analyse de performance globale de l’événement.

5. Publicité ciblée
    Très efficace car ton audience est ultra-niche :
    - Matériel triathlon.
    - Nutrition sportive.
    - Voyages/Stages de triathlon.
    - Coaching & plans d’entraînement.

6. Affiliations
    - Matériel (probablement le plus rentable).
    - Formations (natation, vélo, course).
    - Plans d’entraînement.
    - Stages de triathlon.

7. Marketplace intégrée
    Ton site peut aussi vendre :
    - Dossards revendus.
    - Packs photos officielles.
    - Services de coaching.
    - Petites annonces matériel tri.

8. Outil pour athlètes : leur “LinkedIn du triathlète”
    - Profil public avec tous ses résultats.
    - Badges automatiques (Ironman Finisher, Podiums…)
    - Carte interactive des courses faites.
    Version Premium : personnalisation, CV sportif, partage sur réseaux sociaux.

9. Croissance : devenir un “Strava des compétitions”
    Une fois la base de résultats solide, tu peux étendre :
    - Tracking live.
    - Données de segments.
    - Analyse technique.
    - Historique multi-sports unifié.

## Stratégie
- Commence par scraper/importer les données : c’est ta barrière à l’entrée.
- Crée une API propre et normalisée → base de ton modèle.
- Pense SEO : énorme potentiel via requêtes “Résultats triathlon + course X”.
- Va voir les fédés : elles sont demandeuses de ce genre d’outil.

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

# Roadmap possible

v1.1

    - Splits : natation / vélo / course / transitions
    - Matching intelligent des athlètes (via fuzzywuzzy + rules)

v1.2

    - Profil public d’athlète
    - Comparaison de performances
    - Notifications

v2.0
    - API payante
    - tableaux dynamiques
    - ajout d’organisateurs partenaires

# Business plan
Plateforme de résultats Triathlon & Duathlon

1. Résumé exécutif
    
    Tu crées une plateforme web centralisant tous les résultats de triathlon et duathlon, provenant de différentes sources (organisateurs, chronométreurs, fédérations).
    Objectif : devenir la référence francophone puis européenne des résultats multisports.
    Ton expertise tech (Python, data engineering) permet de construire une solution scalable et automatisée.

    Le modèle économique est hybride (API, abonnements, partenariats organisateurs).

2. Problème
    
    Aujourd’hui :

        - les résultats sont éparpillés (Chronorace, Sport-Timing, Datasport, FFtri, Ironman…)
        - pas de vue unifiée pour suivre la progression d’un athlète
        - pas de moteur de recherche fiable sur toutes les courses
        - les coachs n’ont pas de dashboard pour suivre leurs athlètes
        - les organisateurs n’ont pas d’outil d’analyse ou de page de résultats moderne

    👉 Besoin réel et non adressé pour athlètes, coachs, clubs, organisateurs.

3. Solution (MVP puis vision)
    
    1. MVP (3 mois)

        - Base de données unique des résultats (Triathlon + Duathlon)
        - Recherche par course et par athlète
        - Pages résultats propres, rapides, SEO optimisé
        - Profil athlète : historique + stats simples
        - API publique (gratuité limitée)

    2. Phase 2

        - Stats avancées
        - Notifications résultats
        - Dashboard coach / club
        - Pages premium pour organisateurs
        - Matching intelligent des athlètes
        - Export CSV/Excel + intégration TrainingPeaks/Strava

    3. Phase 3

        - Live-tracking (via intégration)
        - Analyse prédictive (performances, transitions)
        - Marketplace partenaires (stages, matériel)

4. Étude de marché
    
    1. Marché visé

        - 2,5M de triathlètes enregistrés en Europe
        - 550 000 participants annuels en France, Belgique, Suisse
        - 10 000 courses/an en multisport et variantes

    2. Concurrence
        - Spoza, RaceResult, FFtri, Ironman → chacun syndique ses propres données
        - Aucun acteur n’agrège l’ensemble toutes sources, tout organisateur
        - Toi = Agrégateur + valeur ajoutée data

    3. Opportunité
        
        Le marché amateur explose :

            - matos haut de gamme
            - coaching
            - stages
            - analyse data
    
        Les athlètes sont prêts à payer pour se comparer, suivre leur progression.

5. Business Model (testé + scalable)
    
    1. API Data (B2B)
    
        - Coachs, clubs, développeurs, organisateurs
        - 29–149€/mois selon usage
        - Très scalable : aucun support humain nécessaire
    
    2. Abonnements Premium (B2C)
    
        - 3,99 à 7,99 €/mois
    
        Pour athlètes :
    
        - Stats avancées
        - Comparaisons automatiques
        - Prévisions de temps
        - Export résultats
    
    3. Offres organisateurs (B2B)
    
        - Page premium pour la course
        - Analyses globales (temps moyens, abandon, splits)
        - Export certifié
        - Mise en avant
    
        Tarifs : 50–250€ par événement
    
    4. Publicité ciblée
        
        Triathlon = niche premium → CPM élevé
        Sponsors potentiels :
        
            - Matériel vélo
            - Nutrition
            - Stages
            - Entraînement

    5. Affiliation

        - Vente d’équipement
        - Programmes d’entraînement
        - Stages, séjours sportifs

        👉 Diversification naturelle, peu de coûts.

6. Stratégie marketing et acquisition
    
    1. SEO (clé du projet)
    
        C’est ton levier principal :
        
        - pages “Résultats triathlon + NOM COURSE X”
        - résultats indexés automatiquement
        - pages athlètes générées (comme un "Strava public statique")
        
        C’est simple, puissant, durable.
    
    2. Partenariats clubs / coachs
    
        - 1 offre gratuite limitée
        - 1 dashboard premium → conversion facile
    
    3. Réseaux sociaux
    
        - Posts automatiques (nouveaux résultats publiés)
        - Comparaison d’athlètes
        - Stats visuelles
    
    4. Ambassadeurs
    
        - Triathlètes locaux
        - Coachs régionaux
    
    5. Newsletter hebdo
    
        - Résultats + analyses + classement national

7. Stratégie technique et production
    
    🔹 Phase 1 : MVP (1–2 mois)
    
    - Scraping → ETL simple (Python + PostgreSQL)
    - API FastAPI
    - UI Next.js
    - Déduplication simple athlètes & courses
    - 5–10 sources intégrées

    🔹 Phase 2 : Scalabilité data
    
    - Normalisation plus poussée
    - Matching fuzzy des athlètes
    - Index + optimisation PostgreSQL
    - Mise en place Airflow
    - Monitoring qualité
    
    🔹 Phase 3 : Produit & APIs
    
    - Tableau de bord coach
    - Stats avancées
    - API payante
    - Auth / gestion abonnements

8. Modèle financier (projection réaliste)
    
    Hypothèses 12 mois après lancement
    - 20 000 visiteurs/mois via SEO
    - 500 athlètes premium (5€/mois)
    - 30 coachs premium (29€/mois)
    - 40 organisateurs partenaires (100€/course)
    - API Pro : 10 clients (49–129€/mois)
    Revenus annuels estimés
    - Abonnements athlètes : 30 000€
    - API Pro : 10 000€
    - Coachs / clubs : 10 000€
    - Organisateurs : 4 000€
    - Publicité / affiliation : 6 000€
    👉 ≈ 60 000€ de revenu annuel (solopreneur → très rentable)

    Année 2 : SEO exponentiel → +150–300% potentiel.

9. Organisation & ressources

    Projet solo au début, possible :
    - 100% remote
    - code + infra + data par toi
    - assistance ponctuelle (UI/UX freelance)

    Compétences clés déjà maîtrisées par toi :
    ✔ scraping & pipelines
    ✔ PostgreSQL schema
    ✔ API design
    ✔ front minimal
    ✔ architecture scalable  

10. Plan d'action 90 jours

    Mois 1 – Foundation
    - Scraping 3 sources
    - Modèle PostgreSQL final
    - Déduplication basique
    - API “lecture” publique
    - 10 courses dans la base

    Mois 2 – Produit utilisable
    - Front-end (page course + athlète + recherche)
    - Ajout 3–5 nouvelles sources
    - Optimisation SEO
    - Landing + inscription

    Mois 3 – Acquisition
    - Newsletter
    - Lancement Coach Dashboard (alpha)
    - Page premium organisateurs
    - Démo à 10 coachs & 10 clubs locaux

🎯 Conclusion

    Ton projet est techniquement simple, mais avec un potentiel énorme grâce à :
    - la rareté de la donnée structurée en triathlon
    - le SEO sur des milliers d’événements
    - la forte valeur perçue pour les athlètes et coachs
    Avec ton profil, ce projet est idéalisé pour un solopreneur data.

# Plan d'action

Mois 1 – Foundation

    - Scraping 3 sources
    - Modèle PostgreSQL final
    - Déduplication basique
    - API “lecture” publique
    - 10 courses dans la base

Mois 2 – Produit utilisable

    - Front-end (page course + athlète + recherche)
    - Ajout 3–5 nouvelles sources
    - Optimisation SEO
    - Landing + inscription


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

frontend/
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

- Pour le frontend : je suis parti de zéro. 

- Direction graphique : sport/performance, inspirée de Strava et Garmin.

## identité visuelle

- Fond gris très clair, avec des surfaces blanches.
- Noir ou bleu nuit pour les textes.
- Orange vif comme couleur d'accent pour les performances et les actions.
- Typographie moderne, chiffres bien visibles.
- Tableaux de résultats denses mais lisibles.
- Interface responsive, pensée aussi bien pour ordinateur que mobile.

L'objectif est de donner l'impression d'une véritable plateforme de résultats sportifs, pas d'un tableau de bord administratif.

