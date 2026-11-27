#!/usr/bin/env bash
# Sauvegarde complète de la base locale (pg_dump, format custom compressé).
#
# La base locale fait foi : la production n'en est qu'une copie partielle
# (deploy/publier_donnees.sh), et les tables brutes (raw_*) n'existent qu'ici. Lancer ce script
# après chaque scraping et transformation, avant ou après la publication.
#
# Les sauvegardes vont hors du dépôt, dans un dossier couvert par Time Machine. Seules les
# SAUVEGARDES_A_GARDER plus récentes sont conservées. Chaque fichier est relu (pg_restore --list)
# avant de remplacer les anciennes : une sauvegarde illisible n'en efface aucune.
#
# Variables :
#   LOCAL_DB_URL          base locale (défaut : celle de l'API en développement)
#   SAUVEGARDE_DIR        dossier des sauvegardes (défaut : ~/Sauvegardes/tri_results)
#   SAUVEGARDES_A_GARDER  nombre de sauvegardes conservées (défaut : 7)
#
# Usage : deploy/sauvegarder_base_locale.sh
#
# Restauration, dans une nouvelle base (la base actuelle n'est pas touchée) :
#   createdb tri_results_restauree
#   pg_restore --no-owner --dbname=tri_results_restauree ~/Sauvegardes/tri_results/<fichier>.dump

set -euo pipefail

LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://tri_user:tri_password@localhost:5432/tri_results}"
SAUVEGARDE_DIR="${SAUVEGARDE_DIR:-$HOME/Sauvegardes/tri_results}"
SAUVEGARDES_A_GARDER="${SAUVEGARDES_A_GARDER:-7}"

mkdir -p "$SAUVEGARDE_DIR"
FICHIER="$SAUVEGARDE_DIR/tri_results_$(date +%Y-%m-%d_%H%M%S).dump"
EN_COURS="$FICHIER.en_cours"
trap 'rm -f "$EN_COURS"' EXIT

echo "Sauvegarde de la base locale vers $FICHIER…"
debut=$SECONDS
pg_dump --format=custom --file="$EN_COURS" "$LOCAL_DB_URL"

# Fichier lisible et complet avant de le garder et de supprimer les anciens.
pg_restore --list "$EN_COURS" > /dev/null
mv "$EN_COURS" "$FICHIER"
echo "Terminé en $((SECONDS - debut)) s : $(du -h "$FICHIER" | cut -f1)."

# Rotation : les noms contiennent la date, l'ordre alphabétique est l'ordre chronologique.
anciennes=()
while IFS= read -r ancienne; do
    anciennes+=("$ancienne")
done < <(find "$SAUVEGARDE_DIR" -maxdepth 1 -name 'tri_results_*.dump' | sort -r \
    | tail -n +"$((SAUVEGARDES_A_GARDER + 1))")
if [ "${#anciennes[@]}" -gt 0 ]; then
    rm -f "${anciennes[@]}"
    echo "${#anciennes[@]} ancienne(s) sauvegarde(s) supprimée(s)."
fi

echo "Sauvegardes présentes :"
ls -lh "$SAUVEGARDE_DIR"/tri_results_*.dump | awk '{print "  " $5 "  " $NF}'
