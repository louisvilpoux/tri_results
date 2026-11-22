"""Exporte les courses dont le lieu est à vérifier, au format de transform/lieux_courses.csv.

Courses retenues (après reconstruction de la base) : celles dont une édition n'a pas de lieu, et
celles dont les éditions ont des lieux différents (« Narbonne (11100) » et « Narbonne Plage »).
Pour chacune, une ligne sans année : la colonne lieu est pré-remplie avec le lieu le plus
fréquent (vide s'il n'y en a pas) ; lieux_vus et editions aident à choisir.

Utilisation :
    python transform/export_lieux_a_verifier.py
puis ouvrir transform/lieux_a_verifier.csv dans un tableur, corriger la colonne lieu (ou ajouter
une ligne par année quand le lieu change d'une édition à l'autre), copier les lignes voulues
dans transform/lieux_courses.csv (colonnes nom_course;annee;lieu) et reconstruire la base.
"""

import csv

import psycopg2

OUTPUT = "./transform/lieux_a_verifier.csv"

QUERY = """
    SELECT
        name_epreuve,
        (
            SELECT lieu_epreuve FROM races r2
            WHERE r2.name_epreuve = r.name_epreuve AND r2.lieu_epreuve IS NOT NULL
            GROUP BY lieu_epreuve
            ORDER BY lieu_epreuve ~ '\\(\\d{5}\\)$' DESC, COUNT(*) DESC, lieu_epreuve
            LIMIT 1
        ) AS lieu_propose,
        string_agg(DISTINCT lieu_epreuve, ' | ') AS lieux_vus,
        string_agg(DISTINCT year_epreuve || ' : ' || COALESCE(lieu_epreuve, 'sans lieu'), ' | ')
            AS editions,
        COUNT(*) FILTER (WHERE lieu_epreuve IS NULL) AS sans_lieu
    FROM races r
    GROUP BY name_epreuve
    HAVING COUNT(*) FILTER (WHERE lieu_epreuve IS NULL) > 0
        OR COUNT(DISTINCT lieu_epreuve) > 1
    ORDER BY COUNT(*) FILTER (WHERE lieu_epreuve IS NULL) > 0 DESC, name_epreuve
"""


def main() -> None:
    conn = psycopg2.connect(
        dbname="tri_results", user="tri_user", password="tri_password", host="localhost"
    )
    with conn, conn.cursor() as cur:
        cur.execute(QUERY)
        rows = cur.fetchall()
    conn.close()

    with open(OUTPUT, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(["nom_course", "annee", "lieu", "lieux_vus", "editions"])
        for name, proposed, seen, editions, _ in rows:
            writer.writerow([name, "", proposed or "", seen or "", editions])
    without_place = sum(1 for row in rows if row[4] > 0)
    print(f"{len(rows)} courses à vérifier ({without_place} avec une édition sans lieu) : {OUTPUT}")


if __name__ == "__main__":
    main()
