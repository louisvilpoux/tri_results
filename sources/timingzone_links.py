"""Liste des résultats timingzone à scraper : écrit ./sources/timingzone/url/urls.csv.

La liste des événements vient de l'API WordPress du site (`/wp-json/wp/v2/tz_event`), filtrée sur
les sports retenus. Pour chaque événement, on lit la page des résultats
(`<fiche>?publication=results`), qui contient au choix :
- un widget RACE RESULT (`RRPublish(..., <id>, "<onglet>")`) : une ligne, résultats sur
  my.raceresult.com ;
- un ou plusieurs PDF (`<section class="result-document">`, titre de l'épreuve en <h3>) : une
  ligne par PDF ;
- « Cette publication n'est pas encore disponible. » : événement ignoré.

Lancement depuis la racine du projet : `python sources/timingzone_links.py`.
"""
import re
from datetime import date

import pandas as pd
import requests
from bs4 import BeautifulSoup, Tag

API_EVENEMENTS = "https://timingzone.com/wp-json/wp/v2/tz_event"
# Sports du site (taxonomie `tz_sport`) gardés : 268 = TRIATHLON / DUATHLON / AQUATHLON,
# 273 = SWIMRUN. Les autres sont course à pied, cyclisme, natation…
SPORTS = {268: "triathlon_duathlon_aquathlon", 273: "swimrun"}
URLS_CSV = "./sources/timingzone/url/urls.csv"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}
MOIS = {
    "janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, "juillet": 7,
    "août": 8, "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12,
}


def liste_evenements() -> list[dict]:
    """Tous les événements des sports retenus, toutes pages de l'API confondues."""
    evenements = []
    page = 1
    while True:
        resp = requests.get(
            API_EVENEMENTS,
            params={
                "tz_sport": ",".join(str(s) for s in SPORTS),
                "per_page": 100,
                "page": page,
                "_fields": "id,slug,link,title,tz_sport",
            },
            headers=HEADERS,
        )
        resp.raise_for_status()
        evenements.extend(resp.json())
        total_pages = int(resp.headers.get("X-WP-TotalPages", 1))
        print(f"API : page {page}/{total_pages}")
        if page >= total_pages:
            return evenements
        page += 1


def dates_francaises(texte: str | None) -> list[str]:
    """« Du 12 septembre 2026 au 13 septembre 2026 » -> ['2026-09-12', '2026-09-13']."""
    if not texte:
        return []
    return [
        date(int(annee), MOIS[mois.lower()], int(jour)).isoformat()
        for jour, mois, annee in re.findall(r"(\d{1,2})\s+([a-zéû]+)\s+(\d{4})", texte, re.I)
        if mois.lower() in MOIS
    ]


def fait(soup: BeautifulSoup, *libelles: str) -> Tag | None:
    """Valeur <dd> de la fiche pour un libellé <dt> (« Date » ou « Dates », « Lieu »)."""
    for dt in soup.select("dl.event-facts dt"):
        if dt.get_text(strip=True) in libelles:
            return dt.find_next_sibling("dd")
    return None


def infos_evenement(soup: BeautifulSoup) -> dict:
    """Date de début et de fin, lieu et adresse lus sur la fiche de l'événement."""
    dd_dates = fait(soup, "Date", "Dates")
    dates = dates_francaises(dd_dates.get_text(" ", strip=True) if dd_dates else None)
    dd_lieu = fait(soup, "Lieu")
    adresse = dd_lieu.small.extract().get_text(strip=True) if dd_lieu and dd_lieu.small else None
    return {
        "date": dates[0] if dates else None,
        "date_fin": dates[-1] if dates else None,
        "lieu": dd_lieu.get_text(strip=True) if dd_lieu else None,
        "adresse": adresse,
    }


def liens_resultats(publication: Tag) -> list[dict]:
    """Liens de résultats de la section « Résultats » : widget RACE RESULT et/ou PDF."""
    liens = []
    for source in publication.select("textarea.rr-source"):
        # new RRPublish(<div>, 422721, "live") : id de l'événement et onglet publié (« live » ou
        # « results »), utilisés par timingzone.py pour lire les classements.
        match = re.search(r"RRPublish\([^,]+,\s*(\d+)\s*,\s*[\"']([^\"']+)[\"']", source.get_text())
        if match:
            liens.append({
                "type_resultat": "raceresult",
                "nom_resultat": None,
                "raceresult_id": int(match.group(1)),
                "raceresult_onglet": match.group(2),
                "url_resultat": f"https://my.raceresult.com/{match.group(1)}/results",
            })
    pdfs: dict[str, str | None] = {}  # url -> nom de l'épreuve, dans l'ordre de la page
    for element in publication.find_all(
        lambda tag: re.search(r"\.pdf$", tag.get("href") or tag.get("data-emsrc") or "", re.I)
    ):
        url = element.get("href") or element["data-emsrc"]
        if url not in pdfs:
            pdfs[url] = nom_pdf(element, url)
    for url, nom in pdfs.items():
        liens.append({
            "type_resultat": "pdf",
            "nom_resultat": nom,
            "raceresult_id": None,
            "raceresult_onglet": None,
            "url_resultat": url,
        })
    return liens


def nom_pdf(element: Tag, url: str) -> str:
    """Nom de l'épreuve d'un PDF, selon les trois mises en page rencontrées sur le site.

    - fiches récentes : <section class="result-document"><h3>TOP</h3><a …>Ouvrir…</a> ;
    - anciennes fiches : lien texte direct, « CLASSEMENT INDIVIDUEL » ; si le texte est générique
      (« RESULTATS », « Ouvrir les résultats PDF ↗ »), le nom est devant le lien dans le même
      paragraphe (« TRIATHLON M RELAIS : RESULTATS ») ou dans le <h3> qui précède ;
    - blocs EmbedPress (<div data-emsrc="….pdf">) sans texte : nom du fichier.
    """
    document = element.find_parent("section", class_="result-document")
    if document and document.find("h3"):
        return document.find("h3").get_text(strip=True)
    if element.name == "a":
        texte = element.get_text(strip=True)
        if texte and not re.match(r"(ouvrir|r[ée]sultats?\b)", texte, re.I):
            return texte
        avant = "".join(
            s for s in element.find_previous_siblings(string=True)[::-1]
        ).strip(" :\xa0\n")
        if avant:
            return avant
        titre = element.find_previous("h3")
        if titre and titre.find_parent("section", id="publication"):
            return titre.get_text(strip=True)
    return url.rsplit("/", 1)[-1].removesuffix(".pdf").replace("-", " ")


def lignes_evenement(evenement: dict) -> list[dict]:
    """Une ligne par lien de résultats de l'événement (aucune si rien n'est publié)."""
    resp = requests.get(
        evenement["link"], params={"publication": "results"}, headers=HEADERS
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    publication = soup.find("section", id="publication")
    liens = liens_resultats(publication) if publication else []
    if not liens:
        return []
    sport = next((SPORTS[s] for s in evenement["tz_sport"] if s in SPORTS), None)
    base = {
        "event_id": evenement["id"],
        "slug": evenement["slug"],
        "event_name": BeautifulSoup(evenement["title"]["rendered"], "html.parser").get_text(),
        "sport": sport,
        **infos_evenement(soup),
        "url_evenement": evenement["link"],
    }
    return [{**base, **lien} for lien in liens]


def main() -> None:
    evenements = liste_evenements()
    lignes = []
    sans_resultats = []
    for i, evenement in enumerate(evenements, start=1):
        lignes_ev = lignes_evenement(evenement)
        print(f"{i}/{len(evenements)} {evenement['slug']} : {len(lignes_ev)} lien(s)")
        if not lignes_ev:
            sans_resultats.append(evenement["slug"])
        lignes.extend(lignes_ev)
    urls = pd.DataFrame(lignes).drop_duplicates(subset=["event_id", "url_resultat"])
    urls["raceresult_id"] = urls["raceresult_id"].astype("Int64")
    urls.to_csv(URLS_CSV, index=False)
    print(f"{len(urls)} liens écrits dans {URLS_CSV}")
    print(f"{len(sans_resultats)} événements sans résultats publiés : {', '.join(sans_resultats)}")


if __name__ == "__main__":
    main()
