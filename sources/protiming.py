"""Résultats protiming : un CSV par épreuve dans ./sources/protiming/raw/.

Lit ./sources/protiming/url/urls.csv (écrit par protiming_links.py). Pour chaque événement, la page
de résultats donne la liste de ses épreuves (`races` : « Format M - Individuel », « Tri XS »…) ;
le classement d'une épreuve est lu page par page (50 lignes par page) avec `?race=<id>&page=<n>`.

Les colonnes reprennent celles de l'ancien site (« Pos. », « Temps », « Nom - Prénom »,
« Catégorie »… puis les temps intermédiaires sous le nom publié : « Natation », « T1 », « Velo »,
« CaP »…), pour rester lisibles par protiming_organize.py. S'y ajoutent « Sexe » (M ou F) et
« Temps réel » quand la source le donne.

Une épreuve dont le CSV existe déjà n'est pas retéléchargée ; une épreuve sans aucun résultat
n'est pas écrite, ni une épreuve que protiming n'a pas chronométrée (classement publié en PDF
seulement).

Lancement depuis la racine du projet : `python sources/protiming.py`.
"""
import os
from typing import Any

import pandas as pd
import requests

from protiming_api import get_route_data

URLS_CSV = "./sources/protiming/url/urls.csv"
OUTPUT_DIR = "./sources/protiming/raw/"


def nom_fichier(slug: str, race_id: int) -> str:
    """Nom du CSV d'une épreuve : « 8271-triathlon-de-bordeaux_23424.csv »."""
    return f"{slug}_{race_id}.csv"


def ligne_resultat(entry: dict[str, Any]) -> dict[str, Any]:
    """Une ligne du CSV à partir d'un résultat de la source.

    Le nom est écrit « NOM Prénom » comme sur l'ancien site ; pour une équipe, la source met le nom
    de l'équipe dans `lastName` et laisse `firstName` vide.
    """
    nom = " ".join(p for p in [entry.get("lastName"), entry.get("firstName")] if p)
    sexe = (entry.get("sex") or "").upper() or None
    ligne: dict[str, Any] = {
        "Pos.": entry.get("rank"),
        "Temps": entry.get("officialTime"),
        "Temps réel": entry.get("realTime"),
        "Nom - Prénom": nom,
        "Club": entry.get("club"),
        "Dossard": entry.get("bib"),
        "Catégorie": entry.get("category"),
        "Sexe": sexe,
        "km/h": entry.get("speed"),
    }
    for colonne in entry.get("extraColumns") or []:
        label = colonne["label"].strip()
        # Deux colonnes du même nom dans une épreuve : la seconde est numérotée.
        nom_colonne, n = label, 2
        while nom_colonne in ligne:
            nom_colonne, n = f"{label} {n}", n + 1
        ligne[nom_colonne] = colonne.get("value")
    return ligne


def resultats_epreuve(slug: str, race_id: int) -> list[dict[str, Any]]:
    """Toutes les lignes du classement d'une épreuve, toutes pages confondues.

    Une épreuve que protiming n'a pas chronométrée (`timedByProtiming` faux) n'a pas de classement
    sur le site, seulement un PDF (`generalPdfUrl`) : liste vide.
    """
    lignes = []
    page = 1
    while True:
        data = get_route_data(f"/results/{slug}", {"race": race_id, "page": page})
        results = data["routes/results.$slug"]["results"]
        if "entries" not in results:
            print(f"    pas de classement en ligne (PDF : {results.get('generalPdfUrl')})")
            return []
        lignes.extend(ligne_resultat(entry) for entry in results["entries"])
        if page >= results["pagination"]["pages"]:
            return lignes
        page += 1


def scrape_evenement(evenement: pd.Series, deja_faits: set[str]) -> None:
    """Écrit un CSV par épreuve de l'événement qui n'a pas encore le sien."""
    slug = evenement["slug"]
    data = get_route_data(f"/results/{slug}")["routes/results.$slug"]
    results = data.get("results")
    if not results or not results.get("races"):
        print(f"{slug} : aucune épreuve")
        return
    date = pd.Timestamp(evenement["date"])

    for race in results["races"]:
        fichier = nom_fichier(slug, race["id"])
        if fichier in deja_faits:
            continue
        print(f"{slug} : {race['label'].strip()} ({race['id']})")
        lignes = resultats_epreuve(slug, race["id"])
        if not lignes:
            print("    aucun résultat, fichier non écrit")
            continue
        df = pd.DataFrame(lignes)
        if df["Temps réel"].isna().all():
            df = df.drop(columns="Temps réel")
        df["name_epreuve"] = evenement["event_name"]
        df["format_epreuve"] = race["label"].strip()
        df["date_epreuve"] = date.strftime("%d/%m/%Y")
        df["lieu_epreuve"] = evenement["lieu"]
        df["url_epreuve"] = f"{evenement['url']}?race={race['id']}"
        df["year_epreuve"] = date.year
        df["type_evenement"] = evenement["type"]
        df.to_csv(os.path.join(OUTPUT_DIR, fichier), index=False)
        deja_faits.add(fichier)


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    evenements = pd.read_csv(URLS_CSV, dtype={"event_id": str})
    deja_faits = set(os.listdir(OUTPUT_DIR))
    erreurs = []
    for _, evenement in evenements.iterrows():
        try:
            scrape_evenement(evenement, deja_faits)
        except (requests.RequestException, KeyError, ValueError) as e:
            # Un événement en erreur n'arrête pas les autres ; relancer le script le reprend.
            print(f"{evenement['slug']} : erreur {e!r}")
            erreurs.append(evenement["slug"])
    print(f"{len(deja_faits)} CSV dans {OUTPUT_DIR} ; {len(erreurs)} événement(s) en erreur")
    for slug in erreurs:
        print(f"    {slug}")


if __name__ == "__main__":
    main()
