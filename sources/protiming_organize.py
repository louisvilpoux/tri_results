"""Mise en forme des CSV protiming pour le chargement : ./sources/protiming/raw/ → protiming_0/.

Les CSV de raw/ (écrits par protiming.py) ont les colonnes du site : « Pos. », « Temps »,
« Nom - Prénom », « Catégorie », « Sexe »… puis les temps intermédiaires sous le nom choisi par
chaque organisateur (« Natation », « Tps Natation », « Swim », « Nat. » ; « CaP1 », « Tps CaP 2 »…).
Chaque fichier est ramené aux mêmes colonnes (COLONNES_FINALES), celles que lit
transform/raw_data.sql dans raw_protiming_0 :

- temps intermédiaires rangés dans swim, t1, bike, t2, run. En duathlon, la première course à pied
  va dans swim et la seconde dans run, comme pour les autres sources. Les colonnes qui ne sont pas
  un de ces segments (« Natation + T1 », « CaP Tour 1 », « VELO 3 », « Inter 2 », « Tps Canoe »…) ne
  sont pas gardées ;
- temps au format hh:mm:ss : la place collée par le site est retirée (« 00:13:21 (144.) »),
  « 15:25 » devient « 00:15:25 », les valeurs qui ne sont pas un temps (« NC », « ---- », « () »)
  sont vidées ;
- catégorie sans le classement dans la catégorie (« SEM (1 / 155) » → « SEM », « S4M (1.) » →
  « S4M ») ;
- nom d'une équipe anonyme (nom vide, équipiers dans « Equipier 1 », « Athlete 2 »…) : ses
  équipiers, « NOM1 & NOM2 ».

Lancement depuis la racine du projet : `python sources/protiming_organize.py`.
"""
import os
import re
import shutil
import unicodedata
from pathlib import Path

import pandas as pd

TARGET = "protiming"
RAW_DIR = Path(f"./sources/{TARGET}/raw")
OUTPUT_DIR = Path(f"./sources/{TARGET}/{TARGET}_0")

COLONNES_FINALES = ["clt", "temps", "nom", "club", "cat", "détails", "sexe",
                    "swim", "t1", "bike", "t2", "run", "date_epreuve",
                    "name_epreuve", "format_epreuve", "lieu_epreuve",
                    "distance_epreuve", "type_evenement"]

COLONNES_FIXES = {"Pos.": "clt", "Temps": "temps", "Nom - Prénom": "nom", "Club": "club",
                  "Catégorie": "cat", "Sexe": "sexe", "url_epreuve": "détails"}

# Nom de colonne simplifié (voir cle_colonne) → segment.
SEGMENTS = {
    "natation": "swim", "nat": "swim", "swim": "swim",
    "t1": "t1",
    "velo": "bike", "bike": "bike",
    "t2": "t2",
    "cap": "run", "run": "run",
    # duathlon : première course à pied dans swim, seconde dans run
    "cap1": "swim", "cap2": "run",
}

# Colonnes des équipiers d'une équipe (« Equipier 1 », « Athlete 2 », « Athlète 1 »).
EQUIPIER = re.compile(r"^(equipier|athlete)\d$")
# Temps éventuellement suivi d'une place : « 00:13:21 (144.) », « 15:25 (13.) », « 8:49 ».
TEMPS = re.compile(r"^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\s*\(.*\))?$")
# Classement dans la catégorie, à la fin de celle-ci : « SEM (1 / 155) », « S4M (1.) »,
# « DUO HOMMES (2) ».
RANG_CATEGORIE = re.compile(r"\s*\(\s*-?\d+\s*\.?\s*(?:/\s*-?\d+\s*)?\)\s*$")


def cle_colonne(nom: str) -> str:
    """Nom de colonne sans accents, majuscules, préfixe « Tps », ponctuation ni espaces.

    « Tps Vélo » → « velo », « Tps CaP 2 » → « cap2 », « Nat. » → « nat ».
    """
    texte = unicodedata.normalize("NFKD", nom).encode("ascii", "ignore").decode("ascii").lower()
    texte = re.sub(r"^tps\b", "", texte.strip())
    return re.sub(r"[^a-z0-9]", "", texte)


def temps_hhmmss(valeur: object) -> str | None:
    """Temps au format hh:mm:ss, ou None si la valeur n'est pas un temps."""
    if not isinstance(valeur, str):
        return None
    m = TEMPS.match(valeur.strip())
    if not m:
        return None
    heures, minutes, secondes = m.groups()
    return f"{int(heures or 0):02d}:{int(minutes):02d}:{secondes}"


def nom_equipe(ligne: pd.Series, colonnes_equipiers: list[str]) -> str | None:
    """« NOM1 & NOM2 » à partir des colonnes d'équipiers (« - » et vides ignorés)."""
    noms = [str(ligne[c]).strip() for c in colonnes_equipiers
            if pd.notna(ligne[c]) and str(ligne[c]).strip() not in ("", "-")]
    return " & ".join(noms) if noms else None


def organise(df: pd.DataFrame) -> pd.DataFrame:
    """Ramène un CSV de raw/ aux COLONNES_FINALES."""
    sortie = pd.DataFrame(index=df.index)
    for source, cible in COLONNES_FIXES.items():
        sortie[cible] = df[source] if source in df.columns else None
    for colonne in ["date_epreuve", "name_epreuve", "format_epreuve", "lieu_epreuve",
                    "type_evenement"]:
        sortie[colonne] = df[colonne] if colonne in df.columns else None

    # Temps intermédiaires : si deux colonnes donnent le même segment, la première remplie gagne.
    for colonne in df.columns:
        segment = SEGMENTS.get(cle_colonne(colonne))
        if segment is None:
            continue
        valeurs = df[colonne].map(temps_hhmmss)
        sortie[segment] = sortie[segment].fillna(valeurs) if segment in sortie else valeurs

    sortie["temps"] = sortie["temps"].map(temps_hhmmss)
    sortie["cat"] = sortie["cat"].map(
        lambda c: RANG_CATEGORIE.sub("", c).strip() or None if isinstance(c, str) else None)

    colonnes_equipiers = [c for c in df.columns if EQUIPIER.match(cle_colonne(c))]
    if colonnes_equipiers:
        sans_nom = sortie["nom"].isna()
        sortie.loc[sans_nom, "nom"] = df[sans_nom].apply(
            nom_equipe, axis=1, colonnes_equipiers=colonnes_equipiers)

    for colonne in COLONNES_FINALES:
        if colonne not in sortie.columns:
            sortie[colonne] = None
    return sortie[COLONNES_FINALES]


def main() -> None:
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    os.mkdir(OUTPUT_DIR)
    fichiers = sorted(RAW_DIR.glob("*.csv"))
    for chemin in fichiers:
        df = pd.read_csv(chemin, dtype=str)
        organise(df).to_csv(OUTPUT_DIR / chemin.name, index=False)
    print(f"{len(fichiers)} fichiers écrits dans {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
