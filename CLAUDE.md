# Contexte du projet

Lorsque vous travaillez avec cette base de code, donnez la priorité à la lisibilité plutôt qu'à l'ingéniosité. Posez des questions de clarification avant d'apporter des modifications architecturales.

## À propos de ce projet

API REST FastAPI les routes. Utilise SQLAlchemy pour les opérations de base de données.
NextJS pour le front.

## Répertoires clés

- `api/` - gestionnaires de routes.
- `sources/` - scrapping des sources de données et génération de CSV.
- `load/` - chargement des CSV dans PosgreSQL.
- `transform/` - scripts SQL de transformations des données dans PosgreSQL.
- `triathlon-results/` - application front-end.

## Normes

- Type hints requis pour toutes les fonctions
- PEP 8 avec des lignes de 100 caractères

## Commandes courantes
```bash
cd api && uvicorn main:app --reload  # serveur de développement
cd triathlon-results && npm run dev # application web de développement
```

## Fichiers markdown

- `AGENTS.md` - instructions de développement.
- `backend.md` - informations relatives aux traitements backend Python et SQL.
- `business_model.md` - objectifs business de l'application.
- `frontend.md` - specifications et détails techniques du front-end.
- `mvp.md` - brève définition d'un MVP.
- `roadmap.md` - définition d'une roadmap.