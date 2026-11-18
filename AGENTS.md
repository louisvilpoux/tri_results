
# Instructions de développement

## Stack technique

- Backend : Python, FastAPI
- Base de données : PostgreSQL
- Frontend : Next.js, TypeScript
- Styling : Tailwind CSS, shadcn/ui
- Architecture : API REST

## Règles générales

- Toujours analyser le code existant avant de modifier un fichier.
- Respecter l'architecture et les conventions existantes.
- Privilégier un code simple, modulaire et maintenable.
- Éviter les dépendances inutiles.
- Ne jamais inventer de colonnes ou de tables SQL.
- Vérifier les types et les contrats API.
- Ne pas modifier les fichiers de configuration sensibles.
- Ne jamais modifier l'architecture sans expliquer pourquoi.
- Ne pas supprimer ou modifier une fonctionnalité existante sans validation.
- Lire les fichiers concernés avant de modifier le code.
- Vérifier que les modifications restent compatibles avec le reste de l'application.
- Ajouter ou modifier les tests correspondants.
- Mettre à jour les fichiers Markdown concernés après chaque fonctionnalité terminée.
- Ne jamais inventer des données ou des comportements qui ne sont pas confirmés.

## Backend

- Utiliser les bonnes pratiques FastAPI.
- Séparer les routes, services et accès aux données.
- Éviter les requêtes SQL inutiles.
- Utiliser des requêtes paramétrées.
- Gérer explicitement les erreurs.

## Frontend

- Utiliser TypeScript strictement.
- Réutiliser les composants existants.
- Séparer les composants de présentation et la logique métier.
- Privilégier les composants réutilisables.

## Workflow

Avant chaque développement :
1. Comprendre le besoin.
2. Explorer les fichiers concernés.
3. Proposer un plan.
4. Attendre validation si le changement est important.

Après chaque développement :
1. Exécuter les tests pertinents.
2. Vérifier les erreurs de typage.
3. Présenter les fichiers modifiés.
4. Expliquer les choix techniques.