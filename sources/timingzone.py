"""Résultats timingzone : un CSV par épreuve dans ./sources/timingzone/raw/.

Lit ./sources/timingzone/url/urls.csv (écrit par timingzone_links.py). Deux sortes de liens :

- RACE RESULT (`type_resultat` = raceresult) : l'événement est publié sur my.raceresult.com.
  `/{id}/{onglet}/config` donne les épreuves (`contests` : « M INDIVIDUEL », « L RELAIS »…) et les
  listes publiées (inscrits, live, classements…). Pour chaque épreuve on lit son classement scratch
  (voir liste_classement) avec `/{id}/{onglet}/list`. Les colonnes sont celles de la liste
  (« Rank », « Name », « Ag », « Team », « Swim (h/f) »…, ou « Rang », « Nom », « Natation »…) plus
  « Dossard » ; « Groupe » garde le regroupement de la liste (« Hommes », « Femmes »…).
- PDF (`type_resultat` = pdf) : une épreuve par PDF, lu par timingzone_pdf.py. Les classements par
  équipe, de cyclisme et de course à pied (Lucky Luc 2023, Cap d'Ail 2021) ne sont pas lus.

S'y ajoutent name_epreuve, format_epreuve, date_epreuve (JJ/MM/AAAA), lieu_epreuve, url_epreuve,
year_epreuve et type_evenement, comme pour protiming.

Une épreuve dont le CSV existe déjà n'est pas retéléchargée, ni un événement RACE RESULT dont une
épreuve a déjà son CSV ; une épreuve sans aucun résultat n'est pas écrite. RACE RESULT renvoie
des 404 passagers (voir get_json) : un événement encore signalé « introuvable » ou en erreur en fin
de passage est repris en relançant le script.

Lancement depuis la racine du projet : `python sources/timingzone.py`.
"""
import io
import os
import re
import time
import unicodedata
from typing import Any

import pandas as pd
import requests

from timingzone_pdf import lire_classement

URLS_CSV = "./sources/timingzone/url/urls.csv"
OUTPUT_DIR = "./sources/timingzone/raw/"
RACERESULT = "https://my.raceresult.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}

# Classement d'une épreuve RACE RESULT : liste dont le nom (« 02-Classements Open|01-Scratch
# Individuel tri », « 01-Classement Cap|01 CL cap ») parle de scratch ou de classement, hors listes
# d'inscrits, live, points intermédiaires (« inter|05-SANA »), challenges et classements par équipe.
LISTE_CLASSEMENT = re.compile(r"scratch|classement|\bcl\b")
LISTE_EXCLUE = re.compile(r"inscrit|start|live|^inter\||challenge|equipe|par eq|trophee")
# PDF qui ne sont pas un classement individuel ou relais de triathlon / duathlon.
PDF_EXCLU = re.compile(r"equipe|cycliste|^cap \d")


def sans_accents(texte: str) -> str:
    """« Classement par équipe » → « classement par equipe »."""
    texte = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode("ascii")
    return texte.lower()


def get_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """GET JSON avec cinq essais espacés : RACE RESULT renvoie souvent des 404 passagers (une même
    adresse répond 404 puis 200 quelques secondes plus tard, le 25/11/2026). Un événement retiré
    répond 404 à chaque essai."""
    essais = 5
    for essai in range(essais):
        resp = requests.get(url, params=params, headers=HEADERS, timeout=60)
        if resp.ok:
            return resp.json()
        if essai < essais - 1:
            time.sleep(3 * (essai + 1))
    resp.raise_for_status()
    return resp.json()


def colonnes_evenement(evenement: pd.Series, format_epreuve: str, url: str) -> dict[str, Any]:
    """Colonnes ajoutées à chaque ligne d'une épreuve."""
    date = pd.Timestamp(evenement["date"])
    return {
        "name_epreuve": evenement["event_name"],
        "format_epreuve": format_epreuve,
        "date_epreuve": date.strftime("%d/%m/%Y"),
        "lieu_epreuve": evenement["lieu"],
        "url_epreuve": url,
        "year_epreuve": date.year,
        "type_evenement": evenement["sport"],
    }


def ecrire(lignes: list[dict[str, Any]], infos: dict[str, Any], fichier: str) -> None:
    df = pd.DataFrame(lignes)
    for colonne, valeur in infos.items():
        df[colonne] = valeur
    df.to_csv(os.path.join(OUTPUT_DIR, fichier), index=False)


# --- RACE RESULT ----------------------------------------------------------------------------------

def liste_classement(config: dict[str, Any], contest: str) -> dict[str, Any] | None:
    """Liste du classement scratch d'une épreuve : d'abord une liste propre à l'épreuve, sinon une
    liste commune à toutes (`Contest` = "0"). None si l'épreuve n'a pas de classement publié
    (épreuves jeunes, biathlon… : seulement les inscrits et le live)."""
    listes = [
        liste for liste in config["TabConfig"].get("Lists") or []
        if LISTE_CLASSEMENT.search(sans_accents(liste["Name"]))
        and not LISTE_EXCLUE.search(sans_accents(liste["Name"]))
    ]
    for contest_liste in (contest, "0"):
        for liste in listes:
            if liste["Contest"] == contest_liste:
                return liste
    return None


def lignes_groupes(data: Any, groupe: str | None = None) -> list[tuple[str | None, list]]:
    """Lignes de `data` avec leur groupe : `data` est une liste de lignes ou un dictionnaire de
    groupes (« #1_M INDIVIDUEL » → « #1_Hommes » → lignes), sur un ou plusieurs niveaux."""
    if isinstance(data, list):
        return [(groupe, ligne) for ligne in data]
    resultat = []
    for cle, valeur in data.items():
        nom = re.sub(r"^#\d+_", "", cle)
        resultat.extend(lignes_groupes(valeur, f"{groupe} / {nom}" if groupe else nom))
    return resultat


def resultats_contest(rr_id: int, onglet: str, config: dict[str, Any],
                      liste: dict[str, Any], contest: str) -> list[dict[str, Any]]:
    """Lignes du classement d'une épreuve RACE RESULT, colonnes sous leur libellé publié."""
    data = get_json(
        f"{RACERESULT}/{rr_id}/{onglet}/list",
        {"key": config["key"], "listname": liste["Name"], "page": onglet, "contest": contest,
         "r": "all", "l": 0},
    )
    # Chaque ligne suit DataFields : BIB, ID, puis une valeur par colonne affichée (Fields), puis
    # des expressions de mise en forme (couleurs) qui ne sont pas gardées.
    champs = data["DataFields"]
    colonnes = []
    for champ in data["list"]["Fields"]:
        libelle = (champ.get("Label") or "").strip() or champ["Expression"]
        nom, n = libelle, 2
        while nom in [c for c, _ in colonnes] or nom in ("Dossard", "Groupe"):
            nom, n = f"{libelle} {n}", n + 1
        colonnes.append((nom, champs.index(champ["Expression"])))
    lignes = []
    for groupe, valeurs in lignes_groupes(data["data"]):
        ligne: dict[str, Any] = {"Dossard": valeurs[champs.index("BIB")]}
        ligne.update({nom: valeurs[i] for nom, i in colonnes})
        ligne["Groupe"] = groupe
        lignes.append(ligne)
    return lignes


def scrape_raceresult(evenement: pd.Series, deja_faits: set[str], partage: bool) -> None:
    """Écrit un CSV par épreuve de l'événement RACE RESULT qui n'a pas encore le sien.

    `partage` : le même événement RACE RESULT est lié à plusieurs fiches timingzone (Natureman 2026
    et Triathlon de St Raphaël 2026 : 426027, erreur de saisie du site) ; il n'est lu que pour la
    fiche qui porte son nom.
    """
    rr_id = int(evenement["raceresult_id"])
    onglet = evenement["raceresult_onglet"]
    # Événement déjà téléchargé (au moins une épreuve écrite) : pas de nouvelle requête, RACE RESULT
    # refuse (404) une partie des requêtes quand on l'interroge trop.
    if any(f.startswith(f"{evenement['slug']}_rr{rr_id}_") for f in deja_faits):
        return
    try:
        config = get_json(f"{RACERESULT}/{rr_id}/{onglet}/config", {"lang": "fr"})
    except requests.HTTPError:
        print(f"{evenement['slug']} : RACE RESULT {rr_id} introuvable, "
              "relancer le script plus tard")
        return
    if partage and sans_accents(config["eventname"]) != sans_accents(evenement["event_name"]):
        print(f"{evenement['slug']} : RACE RESULT {rr_id} est « {config['eventname']} », ignoré")
        return
    for contest, nom in config["contests"].items():
        fichier = f"{evenement['slug']}_rr{rr_id}_{contest}.csv"
        if fichier in deja_faits:
            continue
        format_epreuve = re.sub(r"\s+", " ", nom).strip()
        liste = liste_classement(config, contest)
        if liste is None:
            print(f"{evenement['slug']} : {format_epreuve} sans classement publié")
            continue
        print(f"{evenement['slug']} : {format_epreuve} ({liste['Name']})")
        lignes = resultats_contest(rr_id, onglet, config, liste, contest)
        if not lignes:
            print("    aucun résultat, fichier non écrit")
            continue
        url = f"{RACERESULT}/{rr_id}/{onglet}#{contest}_{liste['ID']}"
        ecrire(lignes, colonnes_evenement(evenement, format_epreuve, url), fichier)
        deja_faits.add(fichier)


# --- PDF ------------------------------------------------------------------------------------------

def scrape_pdf(evenement: pd.Series, deja_faits: set[str]) -> None:
    """Écrit le CSV de l'épreuve publiée dans ce PDF s'il n'existe pas encore."""
    url = evenement["url_resultat"]
    nom_pdf = url.rsplit("/", 1)[-1].removesuffix(".pdf")
    fichier = f"{evenement['slug']}_{nom_pdf}.csv"
    if fichier in deja_faits:
        return
    format_epreuve = evenement["nom_resultat"]
    if PDF_EXCLU.search(sans_accents(format_epreuve)):
        print(f"{evenement['slug']} : {format_epreuve} pas un classement de triathlon, ignoré")
        return
    print(f"{evenement['slug']} : {format_epreuve} (PDF)")
    resp = requests.get(url, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    lignes = lire_classement(io.BytesIO(resp.content))
    if not lignes:
        print("    aucun classement lu, fichier non écrit")
        return
    ecrire(lignes, colonnes_evenement(evenement, format_epreuve, url), fichier)
    deja_faits.add(fichier)


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    liens = pd.read_csv(URLS_CSV, dtype={"raceresult_id": "Int64"})
    ids = liens["raceresult_id"].dropna()
    partages = set(ids[ids.duplicated()])

    deja_faits = set(os.listdir(OUTPUT_DIR))
    erreurs = []
    for _, lien in liens.iterrows():
        try:
            if lien["type_resultat"] == "raceresult":
                scrape_raceresult(lien, deja_faits, lien["raceresult_id"] in partages)
            else:
                scrape_pdf(lien, deja_faits)
        except (requests.RequestException, KeyError, ValueError) as e:
            # Un lien en erreur n'arrête pas les autres ; relancer le script le reprend.
            print(f"{lien['slug']} : erreur {e!r}")
            erreurs.append(f"{lien['slug']} ({lien['url_resultat']})")
    print(f"{len(deja_faits)} CSV dans {OUTPUT_DIR} ; {len(erreurs)} lien(s) en erreur")
    for erreur in erreurs:
        print(f"    {erreur}")


if __name__ == "__main__":
    main()
