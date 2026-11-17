import requests
from urllib.parse import urljoin, urlparse
import pandas as pd
import os

def extract_race_info(url):
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    slug = os.path.splitext(parts[2])
    infos = slug[0].split("_")[1:]
    name = " ".join(infos[:-1]) if infos else ""
    year = infos[-1] if infos else ""
    return name, year

def create_race_unicity(url, format):
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    slug = os.path.splitext(parts[2])
    return slug[0]+"_"+format

df = pd.read_csv("./sources/chronoweb/url/urls.csv")

for index, row in df.iterrows():
    url = row["url"]
    response = requests.get(url,verify=False)
    local_path = "./sources/chronoweb/tmp_file.xlsx"
    with open(local_path, "wb") as file:
        file.write(response.content)
    xl_file = pd.ExcelFile(local_path)
    format_list = xl_file.sheet_names
    for format in format_list:
        results_final = pd.read_excel(local_path, sheet_name=format, header=1)
        name, year = extract_race_info(url)
        results_final["name_epreuve"] = name
        results_final["year_epreuve"] = year
        results_final["format_epreuve"] = format
        results_final["url_epreuve"] = url
        results_final.to_csv(f"./sources/chronoweb/raw/{create_race_unicity(url, format)}.csv", index=False)
os.remove("./sources/chronoweb/tmp_file.xlsx")