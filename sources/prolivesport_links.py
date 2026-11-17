import pandas as pd
import requests
from bs4 import BeautifulSoup
import certifi
import ssl
import json

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

global_page_result = "https://api.prolivesport.fr/apiws/event/result/"
races = call_api_prolivesport(global_page_result)

rows = []
for r in races["result"]:
    racelist_url = "https://api.prolivesport.fr/apiws/result/raceList/1262/"
    racelist = call_api_prolivesport(racelist_url)
    for rl in racelist["result"]:
        rows.append({"id":r["eventId"]+"/"+rl["race"],
                    "name":r["eventName"], 
                    "date":r["eventDateStart"], 
                    "distance":rl["distance"],
                    "format_epreuve":rl["race"],
                    "categorieevent":r["categoryName"], 
                    "categorievar":r["categoryVar"],
                    "zipcode":r["zipcode"],
                    "city":r["city"],
                    "department":r["department"],
                    "country":r["country"]})

df = pd.DataFrame(rows)
df.to_csv("./sources/prolivesport/url/urls.csv", index=False)