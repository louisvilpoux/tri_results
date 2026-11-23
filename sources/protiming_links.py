"""Liste des événements protiming à scraper : écrit ./sources/protiming/url/urls.csv.

Une ligne par événement (une édition d'une course, avec une ou plusieurs épreuves), pour les types
d'événement retenus. La liste vient de la page « Résultats » du site, filtrée par type
(`/results?type=triathlon`), lue page par page.

Lancement depuis la racine du projet : `python sources/protiming_links.py`.
"""
import pandas as pd

from protiming_api import get_route_data

# Types d'événement du site (`eventType.type`) gardés. Les autres sont d'autres sports (running,
# trail, raid, vtt…).
TYPES_EVENEMENT = ["triathlon", "duathlon", "swim_run", "bike_and_run"]
URLS_CSV = "./sources/protiming/url/urls.csv"


def lieu_evenement(location: dict | None) -> str | None:
    """« Ville (département) », comme sur l'ancien site : « Vieilles-Maisons (45) »."""
    if not location or not location.get("city"):
        return None
    departement = location.get("department") or location.get("zipCode")
    return f"{location['city']} ({departement})" if departement else location["city"]


def liste_evenements(type_evenement: str) -> list[dict]:
    """Tous les événements d'un type, toutes pages de la liste des résultats confondues."""
    lignes = []
    page = 1
    while True:
        data = get_route_data("/results", {"type": type_evenement, "page": page})["routes/results"]
        print(f"{type_evenement} : page {page}/{data['totalPages']}")
        for event in data["events"]:
            debut = event["date"]["start"]
            lignes.append({
                "event_id": event["id"],
                "slug": event["slug"],
                "event_name": event["title"],
                "type": event["eventType"]["type"],
                "date": debut.date().isoformat() if debut else None,
                "lieu": lieu_evenement(event.get("location")),
                "url": f"https://protiming.fr/results/{event['slug']}",
            })
        if page >= data["totalPages"]:
            return lignes
        page += 1


def main() -> None:
    lignes = []
    for type_evenement in TYPES_EVENEMENT:
        lignes.extend(liste_evenements(type_evenement))
    urls = pd.DataFrame(lignes).drop_duplicates(subset="event_id")
    urls.to_csv(URLS_CSV, index=False)
    print(f"{len(urls)} événements écrits dans {URLS_CSV}")


if __name__ == "__main__":
    main()
