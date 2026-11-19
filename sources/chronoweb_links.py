import re
from datetime import datetime
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup, Tag

url = "https://chronoweb.com/resultats.php?annee=2008"
base_url = "https://chronoweb.com"


def cell_text(row: Tag, cell_class: str) -> str | None:
    """Texte d'une cellule de la ligne (date, location, name), ou None si absente."""
    cell = row.find("div", class_=cell_class)
    return cell.get_text(strip=True) if cell else None


def iso_date(date_text: str | None) -> str | None:
    """Date chronoweb « JJ/MM/AAAA » convertie en « AAAA-MM-JJ » (format des autres sources)."""
    try:
        return datetime.strptime(date_text, "%d/%m/%Y").strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        return None


def name_without_year(name: str | None) -> str | None:
    """« Triathlon d'Oléron 2023 » -> « Triathlon d'Oléron » : l'année reste dans year_epreuve."""
    return re.sub(r"\s+\d{4}$", "", name) if name else None


resp = requests.get(url)
resp.raise_for_status()
soup = BeautifulSoup(resp.text, "html.parser")

# Chaque épreuve est une ligne <div class="table-row"> contenant les cellules date, location,
# name, pdf et xls. On lit la ligne entière pour garder la date, le lieu et le vrai nom
# (accents compris) avec le lien du fichier de résultats.
xls_links = []
for row in soup.find_all("div", class_="table-row"):
    # On cherche le fichier Excel dans toute la ligne, pas seulement la cellule xls : le site
    # inverse parfois les liens (XTERRA Nouvelle Aquitaine 2025 : .xlsx sous le bouton PDF).
    link = next(
        (a for a in row.find_all("a", href=True)
         if a["href"].lower().endswith((".xls", ".xlsx"))),
        None,
    )
    if link is None:
        continue
    name = cell_text(row, "name")
    xls_links.append({
        "text": link.get_text(strip=True),
        "url": urljoin(base_url, link["href"]),
        "date_epreuve": iso_date(cell_text(row, "date")),
        "lieu_epreuve": cell_text(row, "location"),
        "name_epreuve": name_without_year(name),
        "name_epreuve_initial": name,
    })

chronoweb = pd.DataFrame(xls_links).drop_duplicates(subset="url")
chronoweb.to_csv("./sources/chronoweb/url/urls.csv", index=False)
