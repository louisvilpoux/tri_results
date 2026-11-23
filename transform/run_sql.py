import psycopg2
from psycopg2.extensions import cursor

conn = psycopg2.connect(
    dbname="tri_results",
    user="tri_user",
    password="tri_password",
    host="localhost"
)

action_list = ["drop_tables", "create_tables", "ids_stables", "disciplines", "raw_data", "noms_epreuves", "epreuves_sexe", "races", "ids_epreuves", "athletes_tmp", "athletes", "athletes_tronques", "ids_athletes", "results", "homonymes", "temps_totaux", "segments_prolivesport", "doublons_sources", "lieux", "sous_classements", "athletes_sexe", "athletes_club", "nb_races", "pg_index"]
#action_list = ["drop_tables"]

# Fichiers CSV écrits à la main, chargés dans une table temporaire juste avant le script SQL
# qui les utilise : {script: (table, fichier)}. Séparateur « ; » (celui d'un tableur en
# français).
manual_csv = {
    "lieux": ("lieux_courses", "./transform/lieux_courses.csv"),
}


def load_manual_csv(cur: cursor, table: str, path: str) -> None:
    """Charge un CSV de corrections (première ligne : noms des colonnes, en texte)."""
    with open(path, "r", encoding="utf-8") as f:
        columns = f.readline().strip().split(";")
        f.seek(0)
        cur.execute(
            f"CREATE TEMPORARY TABLE {table} ({', '.join(f'{c} TEXT' for c in columns)})"
        )
        cur.copy_expert(
            f"COPY {table} FROM STDIN WITH (FORMAT csv, HEADER, DELIMITER ';')", f
        )


try:
    with conn:
        for action in action_list:
            with conn.cursor() as cur:
                if action in manual_csv:
                    load_manual_csv(cur, *manual_csv[action])
                with open(f"./transform/{action}.sql", "r", encoding="utf-8") as f:
                    sql = f.read()
                cur.execute(sql)
            print(f"Script SQL {action} exécuté avec succès")

except Exception as e:
    print("Erreur lors de l'exécution :", e)

finally:
    conn.close()
