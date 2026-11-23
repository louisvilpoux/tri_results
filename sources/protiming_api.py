"""Lecture des données du site protiming.fr (nouvelle version du site, novembre 2026).

Le site est une application React Router : chaque page a une version « données » à la même adresse
suivie de `.data` (`/results.data?type=triathlon&page=2`, `/results/8271-triathlon-de-bordeaux.data
?race=23424&page=1`). La réponse est au format turbo-stream : un tableau JSON à plat où les objets
et les listes renvoient aux autres valeurs par leur position. `decode_turbo_stream` reconstruit
l'objet d'origine.
"""
import json
import time
from datetime import datetime, timezone
from typing import Any

import requests

BASE_URL = "https://protiming.fr"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}
# Pause entre deux appels, pour ne pas surcharger le site.
PAUSE_SECONDES = 0.3

# Valeurs spéciales du format turbo-stream (positions négatives).
_SPECIAUX: dict[int, Any] = {
    -1: None,            # trou dans une liste
    -2: float("nan"),
    -3: float("-inf"),
    -4: -0.0,
    -5: None,            # null
    -6: float("inf"),
    -7: None,            # undefined
}


def decode_turbo_stream(text: str) -> Any:
    """Reconstruit l'objet encodé dans la première ligne d'une réponse turbo-stream.

    Un objet est écrit {"_<position de la clé>": <position de la valeur>}, une liste comme une liste
    de positions, une date comme ["D", millisecondes]. Les lignes suivantes (promesses différées)
    ne sont pas lues : les pages de résultats n'en utilisent pas.
    """
    valeurs = json.loads(text.splitlines()[0])
    deja_lus: dict[int, Any] = {}

    def lire(position: int) -> Any:
        if position < 0:
            return _SPECIAUX.get(position)
        if position in deja_lus:
            return deja_lus[position]
        valeur = valeurs[position]
        if isinstance(valeur, dict):
            objet: dict[str, Any] = {}
            deja_lus[position] = objet
            for cle, position_valeur in valeur.items():
                objet[valeurs[int(cle[1:])]] = lire(position_valeur)
            return objet
        if isinstance(valeur, list):
            if valeur and isinstance(valeur[0], str):
                # Valeur typée : ["D", ms] pour une date ; les autres types ne servent pas ici.
                if valeur[0] == "D":
                    return datetime.fromtimestamp(valeur[1] / 1000, tz=timezone.utc)
                return valeur
            liste: list[Any] = []
            deja_lus[position] = liste
            liste.extend(lire(p) for p in valeur)
            return liste
        return valeur

    return lire(0)


def get_route_data(path: str, params: dict[str, str | int] | None = None) -> dict[str, Any]:
    """Appelle la version « données » d'une page du site et renvoie ses données décodées.

    Renvoie un dictionnaire {nom de la route: données}, par exemple
    {"routes/results": {...}} pour la liste des résultats.
    """
    time.sleep(PAUSE_SECONDES)
    response = requests.get(f"{BASE_URL}{path}.data", params=params, headers=HEADERS, timeout=30)
    response.raise_for_status()
    decoded = decode_turbo_stream(response.text)
    return {route: contenu.get("data") for route, contenu in decoded.items()
            if isinstance(contenu, dict)}
