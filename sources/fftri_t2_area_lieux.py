"""Ajoute le lieu (colonne lieu_epreuve) aux CSV fftri_t2_area déjà téléchargés.

Le scraper (fftri_t2_area.py) lit maintenant le lieu dans l'en-tête de la page d'une épreuve
(« SIZUN (29450) »), mais ne retélécharge pas une épreuve dont le CSV existe. Ce script, à
lancer une fois, télécharge la page de chaque épreuve dont le CSV n'a pas encore la colonne
lieu_epreuve et l'y ajoute (vide si la page ne donne pas de lieu). Relancé, il ne refait que
les épreuves qui manquent.

    python sources/fftri_t2_area_lieux.py          # toutes les épreuves
    python sources/fftri_t2_area_lieux.py 3        # les 3 premières (essai)

Ensuite : recharger les CSV (load/create_table_to_pg.py, load/load_csv_to_pg.py) puis
reconstruire la base (transform/run_sql.py).
"""

import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup
from tqdm import tqdm

import requests

from fftri_t2_area import create_race_unicity, extract_lieu

FOLDER = Path("./sources/fftri_t2_area/fftri_t2_area_0")
URLS = Path("./sources/fftri_t2_area/url/urls.csv")


def files_without_lieu() -> list[tuple[Path, str]]:
    """(fichier CSV, URL de son épreuve) des CSV qui n'ont pas encore la colonne lieu_epreuve."""
    url_by_file = {
        FOLDER / f"{create_race_unicity(url)}.csv": url for url in pd.read_csv(URLS)["url"]
    }
    todo = []
    for path in sorted(FOLDER.glob("*.csv")):
        if "lieu_epreuve" in pd.read_csv(path, nrows=0).columns:
            continue
        if path not in url_by_file:
            print(f"URL inconnue pour {path.name}")
            continue
        todo.append((path, url_by_file[path]))
    return todo


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,"
        " like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def add_lieu(path: Path, url: str) -> str | None:
    """Télécharge la page de l'épreuve, écrit son lieu dans le CSV ; renvoie le lieu. Délai de 60 s :
    sans lui, une page qui ne répond pas bloque le script (Embrunman 2009-2012)."""
    response = requests.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    lieu = extract_lieu(BeautifulSoup(response.text, "html.parser"))
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    df["lieu_epreuve"] = lieu if not df.empty else None
    df.to_csv(path, index=False)
    return lieu


def main(limit: int | None) -> None:
    todo = files_without_lieu()[:limit]
    found = 0
    errors = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(add_lieu, path, url): url for path, url in todo}
        for future in tqdm(as_completed(futures), total=len(futures), desc="Lieux FFTRI"):
            try:
                found += future.result() is not None
            except Exception as error:  # page indisponible : le CSV reste sans la colonne
                errors.append((futures[future], error))
    print(f"{len(todo)} épreuves traitées, {found} lieux trouvés, {len(errors)} erreurs")
    for url, error in errors:
        print(f"  {url} : {error}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None)
