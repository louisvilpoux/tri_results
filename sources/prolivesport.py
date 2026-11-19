import pandas as pd
import requests
from bs4 import BeautifulSoup, NavigableString
import re
import unicodedata
from urllib.parse import urljoin, urlparse, parse_qs
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

df = pd.read_csv("./sources/prolivesport/url/urls.csv")
#triathlon_events = df[df["categorie"]=='FF Triathlon => Triathlon']
triathlon_events = df[df["categorieevent"].str.contains("Triathlon")\
                    | df["categorieevent"].str.contains("Duathlon")]

# obtenir la liste des épreuves sur une compétition
for index, row in triathlon_events.iterrows():
    target_name = create_race_unicity(row["name"])
    target_name = target_name + row['id'] + ".csv"
    target_name = target_name.replace("/","_")

    indivresult_url = f"https://api.prolivesport.fr/apiws/result/indiv/{row['id']}"

    # do not compute already computed races
    files = os.listdir("./sources/prolivesport/prolivesport_0/")
    if target_name in files:
        continue

    indivresult = call_api_prolivesport(indivresult_url)
    rows = []
    for d in indivresult["result"]:
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

    # format_epreuve = ""
    # if "triathlon" in row["name"].lower():
    #     format_epreuve = "triathlon " + row["format_epreuve"]
    # if "duathlon" in row["name"].lower():
    #     format_epreuve = "duathlon " + row["format_epreuve"]
    # if "bike" in row["name"].lower() and "run" in row["name"].lower():
    #     format_epreuve = "bike&run " + row["format_epreuve"]

    output_df = pd.DataFrame(rows)
    output_df["détails"] = indivresult_url
    output_df["name_epreuve"] = row["name"]
    output_df["format_epreuve"] = row["format_epreuve"]
    output_df["year_epreuve"] = dt.year
    output_df["date_epreuve"] = row["date"]
    output_df["lieu_epreuve"] = f"{row['zipcode']} {row['city']} {row['department']} {row['country']}"
    output_df.to_csv(f"./sources/prolivesport/prolivesport_0/{target_name}", index=False)
    print(f"{index}/{len(triathlon_events)} : {target_name}")