import psycopg2
import pandas as pd
from pathlib import Path

def list_files_folder(folder, path_len=5):
    root = Path(f"./sources/{folder}/{folder}_0")
    output = {}
    for i in [f'./{p}' for p in root.rglob("*") if p.is_file()]:
        if i not in [f"./sources/{folder}/url/urls.csv", f"./sources/{folder}/{folder}_0/.DS_Store"] and len(i.split("/")) == path_len:
            if i.split("/")[-2] in output:
                output[i.split("/")[-2]].append(i)
            else:
                output[i.split("/")[-2]] = [i]
    return output

# path_len = 5 because path has form . / sources / prolivesport / prolivesport_0 / TriaCross_2025_Triacross20S.csv
input_files = list_files_folder("fftri_t2_area") | \
              list_files_folder("prolivesport") | \
              list_files_folder("chronoweb") |\
              list_files_folder("protiming") |\
              list_files_folder("timingzone")

conn = psycopg2.connect(
    dbname="tri_results",
    user="tri_user",
    password="tri_password",
    host="localhost"
)

cur = conn.cursor()

for target in input_files:
    print(f"Trying to load all data from {target} ...")
    for path_file in input_files[target]:
        df = pd.read_csv(path_file)
        if df.empty:
            # fichier sans résultat (épreuve sans classement) : rien à charger, et son en-tête
            # peut différer de celui de la table
            continue
        columns = [c.replace("/","_").replace(".", "_").replace("#", "_").replace(" ", "_").replace("-","_").replace("+","_") for c in df.columns]
        try:
            with open(path_file, "r", encoding="utf-8") as f:
                cmd = f"COPY raw_{target} ({', '.join(columns)}"
                cmd += ") FROM STDIN WITH CSV HEADER"
                cur.copy_expert(cmd, f)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(e, path_file)
    print("... done")

cur.close()
conn.close()
