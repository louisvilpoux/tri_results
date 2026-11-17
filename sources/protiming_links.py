import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
import certifi
import ssl

context = ssl.create_default_context(cafile=certifi.where())
context = ssl._create_unverified_context()

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.prolivesport.fr/",
    "access-token": "AUTH_PLSWS_V2",
}

def get_last_page(soup):
    nav_pagination = soup.find("nav", attrs={"aria-label": "pagination"})
    li_elements = nav_pagination.find_all("li") if nav_pagination else []

    # Récupérer les textes non vides (['1', '…', '196', '197'])
    textes = [li.get_text(strip=True) for li in li_elements if li.get_text(strip=True)]

    # Récupérer directement le numéro maximum de page (197)
    pages = [int(t) for t in textes if t.isdigit()]
    return max(pages) if pages else 1

base_url = "https://protiming.fr"

url = f"{base_url}/results?page=1"
resp = requests.get(url, headers=headers)
resp.raise_for_status()
soup_page_ref = BeautifulSoup(resp.text, "html.parser")

protiming = pd.DataFrame()
for page in range(1, get_last_page(soup_page_ref)+1):
    url = f"{base_url}/results?page={page}"
    print(url)
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    rows = []
    for a_element in soup.find_all("a", href=True):
        if '/results/' in a_element["href"].lower():
            nom_epreuve_element = a_element.find("h3")
            nom_epreuve = nom_epreuve_element.get_text(strip=True) if nom_epreuve_element else None
            spans = [span.get_text(strip=True) for span in a_element.find_all("span")]
            if nom_epreuve and len(spans) == 2:
                rows.append({"name": nom_epreuve, "date":spans[0], "lieu": spans[1], "url": base_url+a_element["href"]})

    
    df = pd.DataFrame(rows).drop_duplicates()
    protiming = pd.concat([protiming, df], ignore_index=True)

protiming.to_csv("./sources/protiming/url/urls.csv", index=False)