from pathlib import Path
import pandas as pd
import numpy as np
import shutil
import os

def list_files_folder(folder):
    root = Path(f"./sources/{folder}/raw/")
    all_files = []
    for i in [f'./{p}' for p in root.rglob("*") if p.is_file()]:
        if i not in [f"./sources/{folder}/url/urls.csv", f"./sources/{folder}/.DS_Store"] and len(i.split("/")) == 5:
            all_files.append(i)
    return all_files

def clean_col_name(col_name):
    std_name = col_name.replace("/","_").replace(".", "_").replace("#", "_").replace(" ", "_").replace("-","_").replace("+","_").replace(" ","_").lower()
    for c in matching_columns:
        if std_name == c:
            std_name = matching_columns[c]
    return std_name

def simplify_df(df):
    final_columns = ["clt", "temps", "nom", "club", "cat", "détails", "sexe", 
                     "swim", "t1", "bike", "t2", "run", "date_epreuve", 
                     "name_epreuve", "format_epreuve", "lieu_epreuve", 
                     "distance_epreuve", "year_epreuve"]
    for c in final_columns:
        if c not in list(df.columns):
            df[c] = np.nan
    return df[final_columns]

target = "chronoweb"
list_files = list_files_folder(target)
matching_columns = {"url_epreuve": "détails", "temps_1": "swim", "temps__1": "swim", 
                    "tr1": "t1", "temps_2": "bike", "temps__2": "bike", 
                    "tr2": "t2", "temps_3": "run", "temps__3": "run",
                    "noms": "nom", "equipe": "club", "temps_": "temps"}

try:
    shutil.rmtree(f"./sources/{target}/{target}_0")
except Exception as e:
    print(f"./sources/{target}/{target}_0 do not exist : {e}")
# create new folder
os.mkdir(f"./sources/{target}/{target}_0")

# for each file : replace forbidden caracters in column name, rename columns and only keep some of them
# result is saved in a dedicated folder
schema_list = []
epreuve_possibles = ["triathlon", "aquathlon", "man", "swimrun", "xterra", "bike_and_run"]
for local_path in list_files:
    if any(element in local_path.lower() for element in epreuve_possibles):
        print(local_path)
        df = pd.read_csv(local_path)
        unnamed_cols = list(df.columns[df.columns.str.contains("Unnamed")])
        for index, u_c in enumerate(unnamed_cols):
            df = df.rename(columns={u_c:"Unnamed_"+str(index)})
        for c in list(df.columns):
            df = df.rename(columns={c: clean_col_name(c)})
        df = simplify_df(df)
        final_path = local_path.replace("raw", f"{target}_0")
        df.to_csv(final_path, index=False)