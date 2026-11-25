"""Lecture des classements timingzone publiés en PDF (utilisé par timingzone.py).

Les PDF sont des exports de classement (RACE RESULT ou tableur) sans séparateur de colonnes :
noms et clubs contiennent des espaces. On lit la position de chaque mot (pdfplumber) et on le range
sous l'en-tête de colonne qui lui correspond :

- en-tête : la ligne qui contient une colonne de nom (« Nom », « Noms », « Name », « Nom/Dossard »,
  « Team ») et une colonne de temps (« Temps », « Total », « TOTAL ») ;
- texte (nom, club, catégorie…) aligné à gauche : sous la dernière colonne dont le début est à
  gauche du mot ;
- temps (« 19:28 », « 0:15:38,8 ») alignés à droite ou centrés, suivis de leur rang « (12) » : sous
  la colonne dont le centre est le plus proche ;
- une ligne de résultat commence par un rang (« 12 », « DNF », « DSQ »…) dans la première colonne ;
- relais : la ligne des équipiers sous l'équipe (« NOM, Prénom / NOM, Prénom ») va dans
  « Equipiers » ;
- autre ligne de texte (« TRIATHLON S INDIVIDUEL », « TRI M Relais ») : intitulé du groupe qui suit,
  gardé dans « Groupe ».
"""
import re
from typing import Any, BinaryIO

import pdfplumber

ENTETE_NOM = re.compile(r"^(nom|noms|name|nom/dossard|team)$", re.I)
ENTETE_TEMPS = re.compile(r"^(temps|total|time)$", re.I)
RANG = re.compile(r"^(\d+[.°)]*|DNF|DSQ|ABD|DNS|NC|AB|DQ)$", re.I)
TEMPS = re.compile(r"^-?\d{1,2}(:\d{2}){1,2}([,.]\d+)?$")
RANG_ENTRE_PARENTHESES = re.compile(r"^\(\d+\)$")
NUMERO_PAGE = re.compile(r"\s*\d+ / \d+$")

# Écart vertical (points) en dessous duquel deux mots sont sur la même ligne : les cellules d'une
# ligne ne sont pas toutes à la même hauteur (polices différentes).
TOLERANCE_LIGNE = 3
# Un mot de texte peut commencer un peu avant le début de son en-tête.
TOLERANCE_COLONNE = 12
# Deux mots d'en-tête à moins de cet écart forment une seule colonne (« Nom relais », « Cl Cat »)…
ECART_MOT_ENTETE = 6
# … si le second continue le premier (minuscule, chiffre ou l'un de ces mots) : « Rang Dos » reste
# deux colonnes.
SUITES_ENTETE = {"Dep", "Cat", "Scratch"}


Mot = dict[str, Any]


def lignes_page(page: pdfplumber.page.Page) -> list[list[Mot]]:
    """Mots de la page regroupés par ligne, de haut en bas puis de gauche à droite."""
    mots = sorted(page.extract_words(), key=lambda w: (w["top"], w["x0"]))
    lignes: list[list[Mot]] = []
    for mot in mots:
        if lignes and mot["top"] - lignes[-1][0]["top"] <= TOLERANCE_LIGNE:
            lignes[-1].append(mot)
        else:
            lignes.append([mot])
    return [sorted(ligne, key=lambda w: w["x0"]) for ligne in lignes]


def colonnes_entete(ligne: list[Mot]) -> list[Mot] | None:
    """Colonnes (texte, x0, x1) si la ligne est un en-tête de classement, sinon None."""
    textes = [w["text"] for w in ligne]
    if not any(ENTETE_NOM.match(t) for t in textes):
        return None
    if not any(ENTETE_TEMPS.match(t) for t in textes):
        return None
    colonnes: list[Mot] = []
    for mot in ligne:
        texte = mot["text"]
        suite = texte[0].islower() or texte[0].isdigit() or texte in SUITES_ENTETE
        if colonnes and suite and mot["x0"] - colonnes[-1]["x1"] < ECART_MOT_ENTETE:
            colonnes[-1]["text"] += " " + texte
            colonnes[-1]["x1"] = mot["x1"]
        else:
            colonnes.append({"text": texte, "x0": mot["x0"], "x1": mot["x1"]})
    return colonnes


def jetons(ligne: list[Mot]) -> list[Mot]:
    """Mots de la ligne, un temps et son rang « (12) » réunis en un seul jeton."""
    resultat: list[Mot] = []
    for mot in ligne:
        precedent = resultat[-1] if resultat else None
        if (precedent and TEMPS.match(precedent["text"])
                and RANG_ENTRE_PARENTHESES.match(mot["text"])
                and mot["x0"] - precedent["x1"] < ECART_MOT_ENTETE):
            resultat[-1] = {**precedent, "text": f"{precedent['text']} {mot['text']}",
                            "x1": mot["x1"]}
        else:
            resultat.append(dict(mot))
    return resultat


def colonne_du_jeton(jeton: Mot, colonnes: list[Mot]) -> str:
    """En-tête sous lequel ranger un jeton (voir la docstring du module)."""
    if TEMPS.match(jeton["text"].split(" ")[0]):
        centre = (jeton["x0"] + jeton["x1"]) / 2
        return min(colonnes, key=lambda c: abs((c["x0"] + c["x1"]) / 2 - centre))["text"]
    colonne = colonnes[0]
    for c in colonnes:
        if jeton["x0"] >= c["x0"] - TOLERANCE_COLONNE:
            colonne = c
    return colonne["text"]


def cellules(ligne: list[Mot], colonnes: list[Mot]) -> dict[str, str]:
    """Une ligne de résultat : texte de chaque colonne."""
    valeurs: dict[str, list[str]] = {c["text"]: [] for c in colonnes}
    for jeton in jetons(ligne):
        valeurs[colonne_du_jeton(jeton, colonnes)].append(jeton["text"])
    return {colonne: " ".join(mots) for colonne, mots in valeurs.items()}


def lire_classement(fichier: str | BinaryIO) -> list[dict[str, str]]:
    """Lignes du classement d'un PDF, colonnes sous leur en-tête publié, plus « Groupe » et
    « Equipiers ». Liste vide si aucun en-tête de classement n'est trouvé."""
    lignes_resultat: list[dict[str, str]] = []
    colonnes = None
    groupe = None
    with pdfplumber.open(fichier) as pdf:
        for page in pdf.pages:
            for ligne in lignes_page(page):
                entete = colonnes_entete(ligne)
                if entete:
                    colonnes = entete
                    continue
                if colonnes is None:
                    continue
                texte = " ".join(w["text"] for w in ligne)
                premier = ligne[0]
                commence_par_rang = (premier["x0"] < colonnes[1]["x0"] - TOLERANCE_COLONNE
                                     and RANG.match(premier["text"]))
                if commence_par_rang and len(ligne) > 2:
                    lignes_resultat.append({**cellules(ligne, colonnes), "Groupe": groupe})
                elif NUMERO_PAGE.fullmatch(texte):
                    continue
                elif lignes_resultat and (" / " in texte or " & " in texte
                                          or texte.endswith("/")):
                    equipiers = NUMERO_PAGE.sub("", texte)
                    precedents = lignes_resultat[-1].get("Equipiers")
                    lignes_resultat[-1]["Equipiers"] = (
                        f"{precedents} {equipiers}" if precedents else equipiers
                    )
                else:
                    groupe = texte
    return lignes_resultat
