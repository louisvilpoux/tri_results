import psycopg2

conn = psycopg2.connect(
    dbname="tri_results",
    user="tri_user",
    password="tri_password",
    host="localhost"
)

action_list = ["drop_tables", "create_tables", "disciplines", "raw_data", "races", "athletes_tmp", "athletes", "results", "doublons_sources", "nb_races", "pg_index"]
#action_list = ["drop_tables"]

try:
    with conn:
        for action in action_list:
            with conn.cursor() as cur:
                with open(f"./transform/{action}.sql", "r", encoding="utf-8") as f:
                    sql = f.read()
                cur.execute(sql)
            print(f"Script SQL {action} exécuté avec succès")

except Exception as e:
    print("Erreur lors de l'exécution :", e)

finally:
    conn.close()
