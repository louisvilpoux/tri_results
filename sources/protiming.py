import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import certifi
import ssl
from io import StringIO
from datetime import datetime
import os

context = ssl.create_default_context(cafile=certifi.where())
context = ssl._create_unverified_context()

def extract_last_id(url):
    match = re.search(r'/(\d+)$', url)
    return int(match.group(1)) if match else None

def extract_race_name(url):
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    slug = parts[2]
    name = slug.split("-", 1)[1]
    name = name.replace("-", " ")
    return name

def create_race_unicity(url):
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    return "_".join(parts[2:])

def extract_date_race(soup):
    pattern = re.compile(r"Édition du\s+([0-9]{2}/[0-9]{2}/[0-9]{4})", re.IGNORECASE)
    date_edition = None
    for elem in soup.find_all(string=pattern):
        m = pattern.search(elem)
        if m:
            date_edition = m.group(1)
            break
    return date_edition

def coalesce(*values):
    for v in values:
        if v is not None:
            return v
    return None

base_url = "https://protiming.fr/"

protiming = pd.read_csv("./sources/protiming/url/urls.csv")
triathlon_events = protiming[protiming['url'].str.contains('Triathlon|Duathlon', case=False, na=False)]
    
# Récupération des résultats de l'épreuve
for index, row in triathlon_events.iterrows():
    url = row["url"]
    race_name = row["name"]
    date_race = row["date"]
    html = requests.get(url, verify=False)
    soup = BeautifulSoup(html.text, 'html.parser')
    
    select_element = soup.find("select", {"id": "selectDistanceResult"})
    options = [(option['value'], option.text.strip()) for option in select_element.find_all("option")]
    
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    clean_url = urljoin(base_url, "/".join(parts[:-1]))
    
    for id, race_type in options:
        target_url = urljoin(clean_url, id)

        # do not compute already computed races
        files = os.listdir("./sources/protiming/")
        if create_race_unicity(target_url)+".csv" in files:
            continue

        # on boucle sur toutes les pages disponibles
        data = []
        headers = []
        for i in range(1,1000):
            print(f"querying {target_url+"/page:"+str(i)}")
            try:
                html = requests.get(target_url+"/page:"+str(i),verify=False)
                soup = BeautifulSoup(html.text, "lxml")

                table = soup.find("table")
                table_elements = table.find_all("tr")
                # skip header
                for table_element in table_elements[1:]:
                    cols = [c.get_text(strip=True) for c in table_element.find_all("td")]
                    if cols:
                        data.append(cols)

                # récupération du header
                thead = table.find("thead")
                header_rows = thead.find_all("tr")
                for tr in header_rows:
                    row_headers = []
                    for th in tr.find_all("th", class_=lambda c: c != "hidden-xs"):
                        text = th.get_text(strip=True)
                        colspan = int(th.get("colspan", 1))
                        row_headers.extend([text] * colspan)
                    headers.append(row_headers)
            except:
                break
        if headers:
            columns = max(headers, key=len)
            results_final = pd.DataFrame(data, columns=columns)
            results_final["name_epreuve"] = coalesce(row["event_name"], race_name)
            results_final["format_epreuve"] = race_type
            results_final["date_epreuve"] = date_race
            results_final["lieu_epreuve"] = row["lieu"]
            results_final["url_epreuve"] = url
            results_final["year_epreuve"] = datetime.strptime(date_race, "%d/%m/%Y").year
            results_final.to_csv(f"./sources/protiming/raw/{create_race_unicity(target_url)}.csv", index=False)
