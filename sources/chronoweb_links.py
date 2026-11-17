import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import pandas as pd
import os

url = "https://chronoweb.com/resultats.php?annee=2008"
resp = requests.get(url)
resp.raise_for_status()

soup = BeautifulSoup(resp.text, "html.parser")
base_url = "https://chronoweb.com"

xls_links = []
for a in soup.find_all("a", href=True):
    #print(a["href"])
    href = a["href"].lower()
    if href.endswith('.xls') or href.endswith('.xlsx'):
        full_url = urljoin(base_url, a["href"])
        xls_links.append({
            "text": a.get_text(strip=True),
            "url": full_url
        })

chronoweb = pd.DataFrame(xls_links).drop_duplicates()
chronoweb.to_csv("./sources/chronoweb/url/urls.csv", index=False)