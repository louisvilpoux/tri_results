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
- temps total de moins d'une heure écrit « mm:ss:00 » par la source (« 31:18:00 » pour 31 min
  18 s ; Cepoy 2015-2016, Chartres 2016) remis en « 00:31:18 », voir temps_en_minutes ;
- catégorie sans le classement dans la catégorie (« SEM (1 / 155) » → « SEM », « S4M (1.) » →
  « S4M ») ;
- nom d'une équipe anonyme (nom vide, équipiers dans « Equipier 1 », « Athlete 2 »…) : ses
  équipiers, « NOM1 & NOM2 ».

Lancement depuis la racine du projet : `python sources/protiming_organize.py`.
"""
import math
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
# Temps total « 31:18:00 » : minutes et secondes suivies de 00, ou heures et minutes
# (« 00:45:00 » n'est pas ambigu : 45 secondes n'est pas un temps de course).
AMBIGU = re.compile(r"^(0[1-9]|[1-5]\d):([0-5]\d):00$")
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


def heures(temps: str) -> float:
    """« 01:30:00 » → 1.5."""
    h, m, s = (int(part) for part in temps.split(":"))
    return h + m / 60 + s / 3600


def temps_en_minutes(temps: pd.Series, vitesses: pd.Series) -> pd.Series:
    """Temps totaux d'une épreuve, ceux de moins d'une heure écrits « mm:ss:00 » remis en hh:mm:ss.

    Sur certaines épreuves, la source écrit « 31:18:00 » pour 31 min 18 s (vitesse publiée :
    16,2 km/h, soit 8,4 km et non 507 km). Un tel temps se lit aussi 31 h 18 min : la vitesse
    départage les deux lectures.
    - Si tous les temps non nuls de l'épreuve (au moins deux) ont cette forme, ce sont des
      minutes : sur de vrais temps à la seconde, la probabilité que tous finissent par 00 est
      négligeable.
    - Sinon, chaque temps ambigu est lu de la façon dont la distance (vitesse × temps) est la plus
      proche de la distance médiane des autres classés. Sans vitesse, il est gardé tel quel.
    """
    valides = temps.map(temps_hhmmss)
    ambigus = valides.map(lambda t: isinstance(t, str) and AMBIGU.match(t) is not None)
    if not ambigus.any():
        return valides
    en_minutes = valides.where(~ambigus, valides.str.replace(AMBIGU, r"00:\1:\2", regex=True))
    # 00:00:00 n'est pas un temps (vidé au chargement, voir results.sql) : il n'est pas compté.
    non_nuls = valides.map(lambda t: isinstance(t, str) and heures(t) > 0)
    if ambigus.sum() >= 2 and ambigus.sum() == non_nuls.sum():
        return en_minutes

    vitesse = pd.to_numeric(vitesses, errors="coerce")
    references = [v * heures(t) for t, v, a in zip(valides, vitesse, ambigus)
                  if isinstance(t, str) and not a and v > 0 and heures(t) > 0]
    if not references:
        return valides
    distance = float(pd.Series(references).median())

    def lecture(i: object) -> str | None:
        t, v = valides[i], vitesse[i]
        if not ambigus[i] or not v > 0:
            return t
        ecart_heures = abs(math.log(v * heures(t) / distance))
        ecart_minutes = abs(math.log(v * heures(en_minutes[i]) / distance))
        return en_minutes[i] if ecart_minutes < ecart_heures else t

    return pd.Series([lecture(i) for i in valides.index], index=valides.index)


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

    vitesses = df["km/h"] if "km/h" in df.columns else pd.Series(None, index=df.index)
    sortie["temps"] = temps_en_minutes(sortie["temps"], vitesses)
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
