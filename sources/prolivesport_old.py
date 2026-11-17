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

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

context = ssl.create_default_context(cafile=certifi.where())
context = ssl._create_unverified_context()

def get_tables_results(url):
    results_final = pd.DataFrame()
    # loop over all available pages
    for i in range(1,1000):
        full_url = url+"&page="+str(i)
        html = requests.get(full_url, verify=False)
        try:
            tables = pd.read_html(StringIO(html.text))
        except Exception as e:
            print(f"error getting tables {full_url} : {e}")
            break
        if tables:
            if len(tables) >= 2:
                results_page = pd.DataFrame()
                # some pages have different tables
                for table in tables[1:]:
                    results_page = pd.concat([results_page, table], ignore_index=True)
                results_final = pd.concat([results_final, results_page], ignore_index=True)
            else:
                break
        else:
            break
    return results_final

def add_fixed_values_df(df, dict_element):
    df["name_epreuve"] = dict_element["epreuve"]
    df["format_epreuve"] = dict_element["format"]
    df["distance_epreuve"] = dict_element["distance"]
    df["date_epreuve"] = dict_element["date"]
    df["lieu_epreuve"] = dict_element["lieu"]
    df["url_epreuve"] = dict_element["url"]
    return df

def create_race_unicity(text):
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^A-Za-z0-9._-]", "", text)
    return text


base_url = "https://www.prolivesport.fr"

df = pd.read_csv("./sources/prolivesport/url/urls.csv")
#triathlon_events = df[df["categorie"]=='FF Triathlon => Triathlon']
triathlon_events = df[df["categorie"].str.contains("FF Triathlon")\
                    | df["categorie"].str.contains("FFTRI - Triathlon")\
                    | df["categorie"].str.contains("FFA Triathlon / Duathlon")\
                    | df["categorie"].str.contains("FFTRI => Duathlon / Triathlon")\
                    | df["categorie"].str.contains("FFTRI => Triathlon")\
                    | df["categorie"].str.contains("FFTRI - Triathlon / Duathlon")\
                    | df["categorie"].str.contains("FFTRI Triathlon")\
                            ]

# obtenir la liste des épreuves sur une compétition
for index, row in triathlon_events.iterrows():
    url = row["resultat_url"]

    try:
        resp = requests.get(url)
        resp.raise_for_status()
    except HTTPError:
        continue
    soup = BeautifulSoup(resp.text, "html.parser")

    # on cherche les <a> qui sont dans la zone "Sélection de la compétition"
    for a in soup.find_all("a"):
        name = a.get_text(strip=True)
        if not name:
            continue

        if not re.search(r"\d", name):
            continue

        # distance éventuelle dans le même texte: "10-13 ans (5.9 Km)"
        m = re.search(r"\(([^)]+)\)", name)
        if m:
            distance = m.group(1).strip()
        else:
            # sinon on regarde le texte juste après le lien "(5.9 Km)"
            sib_text = a.next_sibling
            if sib_text and isinstance(sib_text, NavigableString):
                raw = sib_text.strip()
                m2 = re.match(r"\(([^)]+)\)", raw)
                distance = m2.group(1).strip() if m2 else ""
            else:
                distance = ""
        
        href = a.get("href")
        if href:
            href = urljoin(base_url, href)

        element = {
            "epreuve": row["epreuve"],
            "date": row["date"],
            "lieu": row["lieu"],
            "format": name.split("(")[0],
            "distance": distance,
            "url": href.replace(" ","%20"),
        }

        parsed = urlparse(element["url"])

        params = parse_qs(parsed.query)
        if not params:
            continue

        race = params.get("race", [None])[0].replace(" ","%20")
        #target_name = f"{element["epreuve"].replace(" ", "").replace("/", "")}_{race}.csv"
        target_name = create_race_unicity(element["epreuve"]+"_"+race+".csv")

        # do not compute already computed races
        files = os.listdir("./sources/prolivesport/raw/")
        if target_name in files:
            continue

        results_final = get_tables_results(element["url"])
        results_final = add_fixed_values_df(results_final, element)
        print(f'{row["epreuve"]} {race} : {element["url"]} : {len(results_final.index)} {target_name}')
        results_final.to_csv(f"./sources/prolivesport/raw/{target_name}", index=False)