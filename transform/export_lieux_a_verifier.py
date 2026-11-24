"""Exporte les courses dont le lieu est à vérifier, au format de transform/lieux_courses.csv.

Courses retenues (après reconstruction de la base), colonne motif :
  - « sans lieu » : une édition n'a pas de lieu ;
  - « lieux différents » : les éditions ont des lieux différents (« Narbonne (11100) » et
    « Narbonne Plage ») ;
  - « sans code postal » : un lieu n'a pas de code postal (« Orléans », « Bordeaux » : surtout
    protiming, qui ne donne que le département ; D11 du second retour utilisateur du 23/11/2026) ;
  - « code postal partagé » : une autre course écrit autrement une commune du même code postal
    (« Berck (62600) » / « Berck-sur-Mer (62600) ») ; souvent deux communes voisines, à vérifier.
Pour chacune, une ligne sans année. La colonne lieu est pré-remplie :
  - par le lieu de la même ville, avec code postal, vu dans une autre course de la base quand il
    n'y en a qu'un (« Orléans » → « Orléans (45000) ») ;
  - sinon par le lieu le plus fréquent de la course (avec code postal de préférence).
lieux_vus, editions et lieux_meme_code_postal aident à choisir.

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
    WITH lieux AS (
        -- un lieu par épreuve, avec sa ville comparable (lieu_ville_cle, lieux.sql) et son code
        -- postal
        SELECT
            name_epreuve, year_epreuve, lieu_epreuve,
            lieu_ville_cle(lieu_epreuve) AS ville,
            substring(lieu_epreuve FROM '\\((\\d{5})\\)$') AS code_postal
        FROM races
    ),
    ville_avec_code AS (
        -- lieu avec code postal d'une ville, quand toute la base n'en connaît qu'un
        SELECT ville, MIN(lieu_epreuve) AS lieu
        FROM lieux
        WHERE code_postal IS NOT NULL
        GROUP BY ville
        HAVING COUNT(DISTINCT lieu_epreuve) = 1
    ),
    code_partage AS (
        -- codes postaux écrits avec plusieurs villes
        SELECT code_postal, string_agg(DISTINCT lieu_epreuve, ' | ') AS lieux
        FROM lieux
        WHERE code_postal IS NOT NULL
        GROUP BY code_postal
        HAVING COUNT(DISTINCT ville) > 1
    ),
    courses AS (
        SELECT
            l.name_epreuve,
            COUNT(*) FILTER (WHERE l.lieu_epreuve IS NULL) > 0 AS sans_lieu,
            COUNT(DISTINCT l.lieu_epreuve) > 1 AS lieux_differents,
            COUNT(*) FILTER (WHERE l.lieu_epreuve IS NOT NULL AND l.code_postal IS NULL) > 0
                AS sans_code_postal,
            COUNT(c.code_postal) > 0 AS code_postal_partage,
            string_agg(DISTINCT l.lieu_epreuve, ' | ') AS lieux_vus,
            string_agg(DISTINCT l.year_epreuve || ' : ' || COALESCE(l.lieu_epreuve, 'sans lieu'),
                       ' | ') AS editions,
            string_agg(DISTINCT c.lieux, ' | ') AS lieux_meme_code_postal,
            -- proposition : la ville avec code postal vue ailleurs, si la course n'a qu'une
            -- ville sans code postal
            CASE WHEN COUNT(DISTINCT l.ville) FILTER (WHERE l.code_postal IS NULL) = 1
                 THEN MIN(v.lieu) END AS lieu_ailleurs
        FROM lieux l
        LEFT JOIN ville_avec_code v ON v.ville = l.ville AND l.code_postal IS NULL
        LEFT JOIN code_partage c ON c.code_postal = l.code_postal
        GROUP BY l.name_epreuve
    )
    SELECT
        c.name_epreuve,
        COALESCE(
            c.lieu_ailleurs,
            (
                SELECT lieu_epreuve FROM races r2
                WHERE r2.name_epreuve = c.name_epreuve AND r2.lieu_epreuve IS NOT NULL
                GROUP BY lieu_epreuve
                ORDER BY lieu_epreuve ~ '\\(\\d{5}\\)$' DESC, COUNT(*) DESC, lieu_epreuve
                LIMIT 1
            )
        ) AS lieu_propose,
        concat_ws(', ',
            CASE WHEN c.sans_lieu THEN 'sans lieu' END,
            CASE WHEN c.lieux_differents THEN 'lieux différents' END,
            CASE WHEN c.sans_code_postal THEN 'sans code postal' END,
            CASE WHEN c.code_postal_partage THEN 'code postal partagé' END
        ) AS motif,
        c.lieux_vus,
        c.editions,
        c.lieux_meme_code_postal
    FROM courses c
    WHERE c.sans_lieu OR c.lieux_differents OR c.sans_code_postal OR c.code_postal_partage
    ORDER BY c.sans_lieu DESC, c.sans_code_postal DESC, c.lieux_differents DESC, c.name_epreuve
"""

COLUMNS = ["nom_course", "annee", "lieu", "motif", "lieux_vus", "editions",
           "lieux_meme_code_postal"]


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
        writer.writerow(COLUMNS)
        for name, proposed, motif, seen, editions, same_code in rows:
            writer.writerow([name, "", proposed or "", motif, seen or "", editions,
                             same_code or ""])

    print(f"{len(rows)} courses à vérifier : {OUTPUT}")
    for motif in ["sans lieu", "lieux différents", "sans code postal", "code postal partagé"]:
        print(f"    {motif} : {sum(1 for row in rows if motif in row[2])}")


if __name__ == "__main__":
    main()
