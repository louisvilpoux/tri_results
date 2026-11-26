#!/usr/bin/env bash
# Copie les tables lues par l'API de la base locale vers la base de production (VPS OVH, Coolify).
#
# La base locale fait foi : scraping (sources/), chargement (load/) et transformations (transform/)
# s'y font, puis ce script remplace en production les tables races, athletes, results et
# redirections par leur version locale. Les tables brutes (raw_*, ~1 Go) ne sont pas envoyées.
#
# La base de production n'est pas exposée sur Internet : la copie passe par SSH puis par
# `docker exec` dans le conteneur PostgreSQL de Coolify. La restauration se fait en une seule
# transaction : en cas d'erreur, rien ne change ; pendant la copie, les requêtes de l'API attendent.
#
# Variables :
#   PROD_SSH           (obligatoire) connexion SSH au VPS, ex. ubuntu@51.68.x.x
#   PROD_DB_CONTAINER  (obligatoire) nom du conteneur PostgreSQL (Coolify, page de la base)
#   PROD_DB_USER       utilisateur PostgreSQL de production (défaut : postgres)
#   PROD_DB_NAME       base de production (défaut : postgres)
#   LOCAL_DB_URL       base locale (défaut : celle de l'API en développement)
#
# Usage : PROD_SSH=ubuntu@51.68.x.x PROD_DB_CONTAINER=xxxx deploy/publier_donnees.sh

set -euo pipefail

: "${PROD_SSH:?PROD_SSH manquant (ex. ubuntu@51.68.x.x)}"
: "${PROD_DB_CONTAINER:?PROD_DB_CONTAINER manquant (nom du conteneur PostgreSQL dans Coolify)}"
PROD_DB_USER="${PROD_DB_USER:-postgres}"
PROD_DB_NAME="${PROD_DB_NAME:-postgres}"
LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://tri_user:tri_password@localhost:5432/tri_results}"

TABLES=(races athletes results redirections)

DUMP="$(mktemp -t tri_results_dump)"
trap 'rm -f "$DUMP"' EXIT

# Commande exécutée sur le VPS, dans le conteneur PostgreSQL. ssh transmet une seule ligne de
# commande au shell distant : chaque argument est protégé (printf %q) pour garder espaces et
# guillemets du SQL.
in_prod_db() {
    ssh "$PROD_SSH" "$(printf '%q ' docker exec -i "$PROD_DB_CONTAINER" "$@")"
}

echo "1/4 Export des tables locales : ${TABLES[*]}"
table_args=()
for table in "${TABLES[@]}"; do
    table_args+=(--table "public.$table")
done
pg_dump --format=custom --no-owner --no-privileges "${table_args[@]}" \
    --file "$DUMP" "$LOCAL_DB_URL"
echo "    $(du -h "$DUMP" | cut -f1) à envoyer"

echo "2/4 Comparaison avec la production"
count_sql="SELECT 'races', count(*) FROM races
           UNION ALL SELECT 'athletes', count(*) FROM athletes
           UNION ALL SELECT 'results', count(*) FROM results"
echo "    local :"
psql "$LOCAL_DB_URL" --no-align --tuples-only --field-separator=' ' -c "$count_sql" \
    | sed 's/^/      /'
echo "    production (vide au premier envoi) :"
in_prod_db psql -U "$PROD_DB_USER" -d "$PROD_DB_NAME" --no-align --tuples-only \
    --field-separator=' ' -c "$count_sql" 2>/dev/null | sed 's/^/      /' || true

read -r -p "Remplacer ces tables en production sur $PROD_SSH ? [o/N] " answer
if [[ "$answer" != "o" && "$answer" != "O" ]]; then
    echo "Annulé, rien n'a été modifié."
    exit 0
fi

echo "3/4 Restauration en production (une seule transaction)"
# unaccent sert à la recherche de l'API ; une extension n'est pas copiée avec les tables.
in_prod_db psql -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -v ON_ERROR_STOP=1 \
    -c "CREATE EXTENSION IF NOT EXISTS unaccent"
in_prod_db pg_restore -U "$PROD_DB_USER" -d "$PROD_DB_NAME" --clean --if-exists \
    --no-owner --no-privileges --single-transaction --exit-on-error < "$DUMP"

echo "4/4 Statistiques pour le planificateur de requêtes"
in_prod_db psql -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -v ON_ERROR_STOP=1 \
    -c "ANALYZE races, athletes, results, redirections"

echo "Terminé : la production a les données locales."
