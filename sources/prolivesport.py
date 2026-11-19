import pandas as pd
import requests
from bs4 import BeautifulSoup, NavigableString
import re
import unicodedata
from urllib.parse import urljoin, urlparse, parse_qs, quote
import certifi
import ssl
from io import StringIO
from requests.packages.urllib3.exceptions import InsecureRequestWarning
import os
from requests.exceptions import HTTPError
import json
from datetime import datetime
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

def create_race_unicity(text):
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^A-Za-z0-9._-]", "", text)
    return text

def call_api_prolivesport(url_target):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "https://www.prolivesport.fr/",
        "access-token": "AUTH_PLSWS_V2",
    }
    
    try:
        response = requests.get(url_target, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"Erreur réseau : {e}")
        return None

# id et race sont du texte : sans dtype, pandas lit "1262" ou "111" comme des nombres.
df = pd.read_csv("./sources/prolivesport/url/urls.csv", dtype={"id": str, "race": str})
categorie = df["categorieevent"].str.lower()
triathlon_events = df[categorie.str.contains("tri|duathlon|aquathlon", na=False)]

# L'API renvoie les résultats de tout l'événement, quelle que soit l'épreuve demandée dans l'URL
# (vérifié le 19/11/2026 : 782 lignes pour chacune des 4 épreuves de l'événement 1137). Chaque
# ligne porte son épreuve dans le champ "race" : on appelle l'API une fois par événement, puis on
# garde, pour chaque épreuve, les lignes dont "race" correspond.
event_results = {}


def get_event_results(event_id, race):
    """Résultats de tout l'événement, mis en cache. `race` sert seulement à former une URL
    valide : sans elle, l'API répond « param1 don't eventId »."""
    if event_id not in event_results:
        url = f"https://api.prolivesport.fr/apiws/result/indiv/{event_id}/{quote(race, safe='')}"
        data = call_api_prolivesport(url)
        if data is None or not data.get("success"):
            return None  # erreur déjà affichée ou réponse d'erreur : on retentera au prochain lancement
        event_results[event_id] = data["result"]
    return event_results[event_id]


# obtenir la liste des épreuves sur une compétition
for index, row in triathlon_events.iterrows():
    # même forme que les fichiers du scraping annulé du 18/11 : <nom>_<eventId>_<épreuve>.csv
    target_name = f"{create_race_unicity(row['name'])}_{row['id']}_{create_race_unicity(row['race'])}.csv"

    indivresult_url = f"https://api.prolivesport.fr/apiws/result/indiv/{row['id']}/"

    # do not compute already computed races
    files = os.listdir("./sources/prolivesport/prolivesport_0/")
    if target_name in files:
        continue

    results = get_event_results(row["id"], row["race"])
    if results is None:
        continue
    race_results = [d for d in results if d["race"] == row["race"]]
    if not race_results:
        # pas de fichier vide : il servirait de modèle de colonnes incomplet à create_table_to_pg
        print(f"{index}/{len(triathlon_events)} : aucun résultat pour {row['race']} ({row['id']})")
        continue

    rows = []
    for d in race_results:
        rows.append({"nom":d["firstname"] + "  "+ d["lastname"],
                        "sexe":d["sex"],
                        "club":d["club"],
                        "categorie":d["category"],
                        "cat":d["categoryRef"],
                        "temps":d["time"],
                        "clt":d["rank"],
                        "rang_sexe":d["rankSex"],
                        "clt_cat":d["rankCat"],
                        #"nation":d["nation"],
                        "birthDate":d["birthDate"],
                        "swim":d["timeT1"],
                        "rang_swim":d["rankT1"],
                        "t1":d["timeT2"],
                        "rang_t1":d["rankT2"],
                        "bike":d["timeT3"],
                        "rang_bike":d["rankT3"],
                        "t2":d["timeT4"],
                        "rang_t2":d["rankT4"],
                        "run":d["timeT5"],
                        "rang_run":d["rankT5"],
                        })

    dt = datetime.strptime(row["date"], "%Y-%m-%d %H:%M:%S")

    output_df = pd.DataFrame(rows)
    output_df["détails"] = indivresult_url
    output_df["name_epreuve"] = row["name"]
    output_df["format_epreuve"] = row["format_epreuve"]
    output_df["year_epreuve"] = dt.year
    output_df["date_epreuve"] = row["date"]
    output_df["distance"] = row["distance"]
    output_df["categorieevent"] = row["categorieevent"]
    output_df["categorievar"] = row["categorievar"]
    output_df["lieu_epreuve"] = f"{row['zipcode']} {row['city']} {row['department']} {row['country']}"
    output_df.to_csv(f"./sources/prolivesport/prolivesport_0/{target_name}", index=False)
    print(f"{index}/{len(triathlon_events)} : {target_name}")