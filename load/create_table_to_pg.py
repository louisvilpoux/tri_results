import psycopg2
import pandas as pd
from pathlib import Path

def get_example_file(directory):
    """Premier CSV non vide du dossier : il sert de modèle pour les colonnes de la table raw_.
    Les fichiers sans résultat sont écartés, car leur en-tête peut différer (voir
    create_empty_file dans sources/fftri_t2_area.py)."""
    path = Path(directory)
    for p in sorted(path.glob("*.csv")):
        if not pd.read_csv(p, nrows=1).empty:
            return "./" + str(p)
    raise FileNotFoundError(f"Aucun fichier CSV avec des données dans {directory}")

def clean_col_name(col_name):
    return col_name.replace("/","_").replace(".", "_").replace("#", "_").replace(" ", "_").replace("-","_").replace("+","_")

def create_schema_from_file(table_name, example_file_path, drop=False):
    df = pd.read_csv(example_file_path)
    str_query = f"DROP TABLE IF EXISTS raw_{table_name};\n" if drop else ""
    str_query += f"CREATE TABLE IF NOT EXISTS raw_{table_name} (\n id SERIAL PRIMARY KEY,"
    for c in df.columns:
        str_query += clean_col_name(c)
        str_query += " TEXT,\n"
    str_query += "scraped_at TIMESTAMP DEFAULT NOW() );"
    return str_query

def get_sources(target_list):
    sources = []
    for t in target_list:
        path_ = Path(f"./sources/{t}")
        directories_ = [p.name for p in path_.iterdir() if p.is_dir() and p.name[-2:] == "_0"]
        for d in directories_:
            sources.append({"name": d, "example_file": get_example_file(f"./sources/{t}/{d}")})
    return sources

conn = psycopg2.connect(
    dbname="tri_results",
    user="tri_user",
    password="tri_password",
    host="localhost"
)

cur = conn.cursor()

# manual drop tables
# for i in range(0,61):
#     str_drop_query = f"DROP TABLE IF EXISTS raw_prolivesport_{i};\n"
#     cur.execute(str_drop_query)
#     conn.commit()

sources = get_sources(["prolivesport", "protiming", "chronoweb", "fftri_t2_area"])

drop = True
for s in sources:
    query = create_schema_from_file(s["name"], s["example_file"], drop)
    try:
        cur.execute(query)
        conn.commit()
        if drop:
            msg = f'Table {s["name"]} droped then created'
        else:
            msg = f'Table {s["name"]} created'
        print(msg)
    except Exception as e:
        print(f'error with {s["name"]} {s["example_file"]} : {e}')

cur.close()
conn.close()
