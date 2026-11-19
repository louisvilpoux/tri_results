import requests
from urllib.parse import urlparse
import pandas as pd
import os


def year_from_url(url: str) -> str:
    """Année en fin de nom de fichier (« Resultats_Triathlon_Olron_2023.xlsx » -> « 2023 »)."""
    slug = os.path.splitext(urlparse(url).path.strip("/").split("/")[2])[0]
    return slug.split("_")[-1]


def create_race_unicity(url: str, format: str) -> str:
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    slug = os.path.splitext(parts[2])
    return slug[0]+"_"+format


def value_or_none(value: object) -> object:
    """Valeur d'une cellule de urls.csv, None si vide (NaN)."""
    return None if pd.isna(value) else value


# urls.csv est produit par chronoweb_links.py : en plus de l'URL du fichier de résultats, il
# contient le nom, la date (AAAA-MM-JJ) et le lieu de l'épreuve, lus sur la page chronoweb.
df = pd.read_csv("./sources/chronoweb/url/urls.csv")

for index, row in df.iterrows():
    url = row["url"]
    date = value_or_none(row["date_epreuve"])
    # l'année vient de la date ; à défaut (date absente), du nom du fichier
    year = date[:4] if date else year_from_url(url)
    response = requests.get(url, verify=False)
    local_path = "./sources/chronoweb/tmp_file.xlsx"
    with open(local_path, "wb") as file:
        file.write(response.content)
    xl_file = pd.ExcelFile(local_path)
    format_list = xl_file.sheet_names
    for format in format_list:
        results_final = pd.read_excel(local_path, sheet_name=format, header=1)
        results_final["name_epreuve"] = value_or_none(row["name_epreuve"])
        results_final["year_epreuve"] = year
        results_final["date_epreuve"] = date
        results_final["lieu_epreuve"] = value_or_none(row["lieu_epreuve"])
        results_final["format_epreuve"] = format
        results_final["url_epreuve"] = url
        results_final.to_csv(
            f"./sources/chronoweb/raw/{create_race_unicity(url, format)}.csv", index=False
        )
os.remove("./sources/chronoweb/tmp_file.xlsx")
