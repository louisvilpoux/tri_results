"""Mise en forme des CSV timingzone pour le chargement : ./sources/timingzone/raw/ → timingzone_0/.

Les CSV de raw/ (écrits par timingzone.py) ont les colonnes publiées par chaque épreuve, très
variables : RACE RESULT (« Rank », « Name », « Ag », « Team », « Swim (h/f) »… ou « Rang »,
« Nom », « Cat. », « Natation »…) et PDF (« Rang », « Dos. », « Nom relais », « Nat. »…). Chaque
fichier est ramené aux mêmes colonnes que protiming (COLONNES_FINALES) :

- clt : premier nombre du rang (« 1 (1M) », « 2. », « 2) » → 1, 2, 2) ; un statut (« DNF »,
  « DSQ ») est gardé tel quel ;
- temps et segments au format hh:mm:ss : rang collé retiré (« 19:28 (1) »), dixièmes tronqués
  (« 0:15:38,8 »), « 19:28 » → « 00:19:28 » ; ce qui n'est pas un temps est vidé. Temps total :
  « Corrigé » (avec pénalités, Trigames 2020-2021) s'il existe, sinon « Temps », « Total »,
  « Time » ;
- segments reconnus à leur libellé (voir SEGMENTS) : « Swim (h/f) », « Nat. », « Natation »,
  « Trs1 », « Tras », « Vélo », « Course », « CAP »… En duathlon, la première course à pied
  (« Run 1 », « Cap 1 ») va dans swim et la seconde dans run, comme pour les autres sources.
  L'aquathlon en trois boucles (« Nat 1 », « Cap 1 »… « Cap 3 ») n'a pas de segments ;
- nom écrit « NOM Prénom » (« MERLAND, Mathieu (1187) », « Axel BAUMANS » → « MERLAND Mathieu »,
  « BAUMANS Axel »), dossard collé retiré. Équipe (relais, swimrun, duo) : son nom
  (« Nom relais », « Team name », « Équipe / Noms »…) ; sans nom d'équipe, ses équipiers
  « NOM1 Prénom1 & NOM2 Prénom2 » (« Noms » du Top de Porquerolles). Une épreuve individuelle
  publiée avec la mise en page des relais (au plus un équipier par ligne : Hyères 2026) prend
  le nom de l'équipier, et le nom d'équipe devient le club ;
- club sans le numéro de club (« 30770 (TEAM NISSA TRIATHLON) » → « TEAM NISSA TRIATHLON ») ;
- cat sans les rangs (« 1-S2M », « 1) 40-44 », « HOM (2) » → « S2M », « 40-44 », « HOM ») ;
- sexe (M ou F) : colonne H/F, M/F, Genre… (« 1F », « (2) M », « HOM » ; vide = homme quand la
  colonne ne donne que le rang des femmes, « 3F », « 19F »), sinon le rang par
  sexe (« 1 (1M) »), la catégorie (« HOMMES », sexe à la fin : « S2M », « PUF ») ou le groupe
  de la liste (« POUSSINS / FEMMES ») ; vide pour une équipe mixte ;
- détails : adresse du classement (url_epreuve) ;
- lieu_epreuve : ville lue dans l'adresse de l'événement (url/urls.csv), voir ville.

Lancement depuis la racine du projet : `python sources/timingzone_organize.py`.
"""
import os
import re
import shutil
import unicodedata
from pathlib import Path

import pandas as pd

TARGET = "timingzone"
RAW_DIR = Path(f"./sources/{TARGET}/raw")
OUTPUT_DIR = Path(f"./sources/{TARGET}/{TARGET}_0")
URLS_CSV = Path(f"./sources/{TARGET}/url/urls.csv")

COLONNES_FINALES = ["clt", "temps", "nom", "club", "cat", "détails", "sexe",
                    "swim", "t1", "bike", "t2", "run", "date_epreuve",
                    "name_epreuve", "format_epreuve", "lieu_epreuve",
                    "distance_epreuve", "type_evenement"]
COLONNES_EPREUVE = ["date_epreuve", "name_epreuve", "format_epreuve", "lieu_epreuve",
                    "type_evenement"]

# Rôle des colonnes, par clé de colonne (voir cle_colonne), dans l'ordre de préférence.
RANG = ["rang", "rank", "cl", "pos", "oustatutclassementgeneral"]
TEMPS = ["corrige", "temps", "total", "time"]
NOM_EQUIPE = ["nomrelais", "teamname", "nomdequipe", "equipenoms", "equipe"]
NOM_PERSONNE = ["name", "nom", "nomprenom", "nomdossard"]
CLUB = ["club"]
CATEGORIE = ["cat", "cate", "ag", "clcat",
             # équipes sans catégorie : « Genre » = « 1 HOM », « H/F/X » = « 2) MIX »
             "genre", "gender", "hfx", "sexehomfemmix", "clmfsexehomfemmix"]
SEXE = ["mf", "hf", "f", "fem", "gender", "genre", "hfx", "sexehomfemmix",
        "clmfsexehomfemmix"]
# Colonne « M/F | Cat » (« 1 M | 1 S1 ») de Cannes 2023 : sexe puis catégorie.
SEXE_ET_CATEGORIE = "mfcat"
SEGMENTS = {
    "swim": "swim", "nat": "swim", "natation": "swim",
    "t1": "t1", "trs1": "t1", "trs": "t1", "tras": "t1",
    "bike": "bike", "velo": "bike",
    "t2": "t2", "trs2": "t2",
    "run": "run", "course": "run", "cap": "run",
    # duathlon : première course à pied dans swim, seconde dans run
    "run1": "swim", "cap1": "swim", "run2": "run", "cap2": "run",
}
# Aquathlon en boucles (« Nat 1 », « Nat 2 »…) : pas de segments.
BOUCLES = re.compile(r"^nat\d$")

TEMPS_SOURCE = re.compile(r"(?<![\d:])(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[,.]\d+)?(?![\d:])")
DOSSARD_COLLE = re.compile(r"\s*\([^()]*\d[^()]*\)\s*$")
CLUB_NUMEROTE = re.compile(r"^\d+\s*\((.*)\)$")
RANG_DANS_CATEGORIE = re.compile(r"^\(?-?\d+[.)]*\)?-?$")
SEXE_F = {"F", "FEM", "FEMME", "FEMMES", "FEMININ", "DAMES"}
SEXE_M = {"M", "H", "HOM", "HOMME", "HOMMES", "MASCULIN"}
# Catégorie avec le sexe à la fin : « S2M », « V1F », « PUM », « M2M », « JUF ».
CATEGORIE_SEXE = re.compile(r"^[A-Z]{1,3}\d{0,2}([MF])$")


def cle_colonne(nom: str) -> str:
    """Libellé sans accents, majuscules, parenthèses ni ponctuation : « Swim (h/f) » → « swim »,
    « Cat. » → « cat », « Équipe / Noms » → « equipenoms », « M/F  | Cat » → « mfcat »."""
    texte = unicodedata.normalize("NFKD", nom).encode("ascii", "ignore").decode("ascii").lower()
    texte = re.sub(r"\(h/f\)", "", texte)
    return re.sub(r"[^a-z0-9]", "", texte)


def texte(valeur: object) -> str | None:
    """Valeur de cellule sans espaces en trop (insécables compris), None si vide."""
    if not isinstance(valeur, str):
        return None
    resultat = re.sub(r"\s+", " ", valeur.replace("\xa0", " ")).strip()
    return resultat or None


def temps_hhmmss(valeur: object) -> str | None:
    """Premier temps de la cellule au format hh:mm:ss, ou None.

    Sans heures, les minutes peuvent dépasser 59 (« 61:59 » pour 1 h 01 min 59 s, RACE RESULT) :
    elles sont reportées en heures. Un temps impossible (« 1:75:00 », secondes ≥ 60) est vidé.
    """
    valeur = texte(valeur)
    m = TEMPS_SOURCE.search(valeur) if valeur else None
    if not m:
        return None
    heures, minutes, secondes = (int(g) if g else None for g in m.groups())
    if secondes >= 60 or (heures is not None and minutes >= 60):
        return None
    heures = (heures or 0) + minutes // 60
    return f"{heures:02d}:{minutes % 60:02d}:{secondes:02d}"


def rang(valeur: object) -> str | None:
    """« 1 (1M) », « 2. », « 2) » → « 1 », « 2 », « 2 » ; statut sans le rang par sexe
    (« DNF (-1M) » → « DNF ») ; rang négatif de RACE RESULT pour un non-classé (« -1 (-1F) »)
    vidé."""
    valeur = texte(valeur)
    if valeur is None or valeur.startswith("-"):
        return None
    m = re.match(r"\d+", valeur)
    return m.group() if m else valeur.split(" ")[0].upper()


def nom_personne(valeur: object) -> str | None:
    """Nom « NOM Prénom », dossard collé retiré.

    « MERLAND, Mathieu (1187) » → « MERLAND Mathieu » ; « Rudy VON BERG (1) » → « VON BERG Rudy » :
    les derniers mots tout en majuscules sont le nom de famille. Un nom tout en majuscules sans
    virgule est gardé tel quel.
    """
    valeur = texte(valeur)
    if valeur is None:
        return None
    valeur = DOSSARD_COLLE.sub("", valeur).strip(" ,/")
    if "," in valeur:
        nom, _, prenom = valeur.partition(",")
        return texte(f"{nom} {prenom}")
    mots = valeur.split(" ")
    for i in range(1, len(mots)):
        # le mot avant le nom de famille est un prénom (pas tout en majuscules)
        if mots[i - 1] != mots[i - 1].upper() and all(
                m == m.upper() and re.search(r"[A-Z]", m) for m in mots[i:]):
            return " ".join(mots[i:] + mots[:i])
    return valeur or None


def nom_equipe(valeur: object) -> str | None:
    """Nom d'équipe sans le dossard collé : « TERRE DE RUNNING (326) » → « TERRE DE RUNNING »."""
    valeur = texte(valeur)
    return texte(re.sub(r"\s*\(\d+\)$", "", valeur)) if valeur else None


def equipiers(valeurs: list[object]) -> str | None:
    """Équipiers de plusieurs cellules (« NOM, Prénom / NOM, Prénom », « A | B », « A & B »)
    réunis en « NOM Prénom & NOM Prénom », sans doublon ni équipier vide (« , », « 0, 0 »)."""
    noms: list[str] = []
    for valeur in valeurs:
        for morceau in re.split(r"\s*[/|&]\s*", texte(valeur) or ""):
            nom = nom_personne(morceau)
            if nom and re.search(r"[A-Za-z]", nom) and nom not in noms:
                noms.append(nom)
    return " & ".join(noms) if noms else None


def club(valeur: object) -> str | None:
    """« 30770 (TEAM NISSA TRIATHLON) » → « TEAM NISSA TRIATHLON »."""
    valeur = texte(valeur)
    if valeur is None:
        return None
    m = CLUB_NUMEROTE.match(valeur)
    return m.group(1).strip() if m else valeur


def categorie(valeur: object) -> str | None:
    """Catégorie sans les rangs : « 1-S2M », « 1) 40-44 », « HOM (2) », « S1M (2.) »."""
    valeur = texte(valeur)
    if valeur is None:
        return None
    # « ) 25-29 », « -1) 25-29 » : rang vide ou négatif d'un non-classé
    valeur = re.sub(r"^-?\d*[-)]\s*", "", valeur)
    mots = [m for m in valeur.split(" ") if not RANG_DANS_CATEGORIE.match(m)]
    return " ".join(mots) or None


def mots_majuscules(valeur: object) -> set[str]:
    """Mots de la cellule en majuscules, sans chiffres ni ponctuation : « 1 (1M) » → {M}."""
    valeur = texte(valeur)
    return set(re.sub(r"[^A-Z]+", " ", valeur.upper()).split()) if valeur else set()


def sexe_mots(valeur: object, lettre_seule: bool = True) -> str | None:
    """M ou F si la cellule le dit en toutes lettres ou en abrégé (« 1F », « (2) M », « HOM »,
    « 1 (1M) », « POUSSINS / FEMMES ») ; None sinon (mixte, vide).

    `lettre_seule` faux : « M », « H » ou « F » seuls ne comptent pas. Dans une catégorie ou un
    intitulé de groupe, une lettre seule est souvent un format (« TRI M Relais »)."""
    mots = mots_majuscules(valeur)
    if not lettre_seule:
        mots = {m for m in mots if len(m) > 1}
    if mots & SEXE_F and not mots & SEXE_M:
        return "F"
    if mots & SEXE_M and not mots & SEXE_F:
        return "M"
    return None


def est_mixte(valeur: object) -> bool:
    """« MIX », « MIXTE », « MIX (1) SEN », « 2-MIX » : équipe mixte, sans sexe."""
    return any(m.startswith("MIX") for m in mots_majuscules(valeur))


def sexe_categorie(cat: object) -> str | None:
    """Sexe à la fin d'une catégorie FFTRI : « S2M » → M, « PUF » → F."""
    if not isinstance(cat, str):
        return None
    m = CATEGORIE_SEXE.match(cat.upper())
    return m.group(1) if m else None


def premiere_colonne(colonnes: dict[str, str], cles: list[str]) -> str | None:
    """Première colonne du fichier dont la clé est dans `cles`, dans l'ordre de `cles`."""
    for cle in cles:
        if cle in colonnes:
            return colonnes[cle]
    return None


def colonnes_equipiers(df: pd.DataFrame) -> list[str]:
    """Colonnes qui listent les équipiers (« Equipiers », « AfficherNoms », « Names », « Noms »,
    « Nom 1 », « afficher3nomsrelais », expressions RACE RESULT « [AfficherNom]… »)."""
    return [c for c in df.columns
            if re.match(r"^(equipiers|affichernom|afficher3noms|names$|noms$|nom1$)",
                        cle_colonne(c))]


def ville(lieu: object, adresse: object) -> str | None:
    """Ville de l'événement « Ville (code postal) », comme fftri_t2_area.

    Le lieu publié est souvent un site (« PLAGE BEAURIVAGE », « ESPLANADE DES GOELANDS ») ;
    l'adresse donne le code postal et la ville : « Plage des Vieux Salins, 83400, HYERES,
    France » → « HYERES (83400) », « boulevard …, 83700, 83700 Saint-Raphaël » → « Saint-Raphaël
    (83700) ». Sans ville après le code postal (« Esp. Jean Gioan, 06190, France ») ou sans
    adresse, le lieu publié, avec le code postal s'il est connu.
    """
    parties = [p.strip() for p in (texte(adresse) or "").split(",") if p.strip()]
    code_postal, nom = None, None
    for i, partie in enumerate(parties):
        if re.fullmatch(r"\d{5}", partie):
            code_postal = partie
            suite = [p for p in parties[i + 1:] if p.lower() not in ("france", "reunion")]
            if suite:
                nom = re.sub(r"^\d{5}\s*", "", suite[0]) or None
            break
    nom = nom or texte(lieu)
    if nom is None:
        return None
    return f"{nom} ({code_postal})" if code_postal else nom


def villes_evenements() -> dict[str, str | None]:
    """Ville de chaque événement (clé : nom publié de l'événement, name_epreuve de raw/)."""
    urls = pd.read_csv(URLS_CSV, dtype=str).drop_duplicates("event_name")
    return {e: ville(l, a) for e, l, a in urls[["event_name", "lieu", "adresse"]].values}


def organise(df: pd.DataFrame, villes: dict[str, str | None]) -> pd.DataFrame:
    """Ramène un CSV de raw/ aux COLONNES_FINALES."""
    colonnes: dict[str, str] = {}
    for c in df.columns:
        colonnes.setdefault(cle_colonne(c), c)
    membres = colonnes_equipiers(df)
    sortie = pd.DataFrame(index=df.index)

    col_rang = premiere_colonne(colonnes, RANG)
    sortie["clt"] = df[col_rang].map(rang) if col_rang else None
    col_temps = premiere_colonne(colonnes, TEMPS)
    sortie["temps"] = df[col_temps].map(temps_hhmmss) if col_temps else None

    # Nom : équipe (nom d'équipe, ou « Team » quand le fichier liste aussi des équipiers), sinon
    # personne, sinon équipiers. « Ucase([CLUB]) (BIB) » est le nom d'équipe de l'aquathlon en
    # relais de Provence Verte 2025.
    equipe = next((c for c in df.columns if cle_colonne(c).startswith("ucaseclub")), None)
    equipe = equipe or premiere_colonne(colonnes, NOM_EQUIPE)
    if equipe is None and membres and "team" in colonnes:
        equipe = colonnes["team"]
    # « Noms » sans aucun séparateur d'équipiers est un nom d'équipe (« RMA SWIMRUN IS BACK
    # (MIX) », Swimrun Côte Vermeille 2022).
    if equipe is None and "noms" in colonnes and not df[colonnes["noms"]].str.contains(
            r"[,/&|]", na=False).any():
        equipe = colonnes["noms"]
        membres = [c for c in membres if c != equipe]
    # Épreuve individuelle publiée avec la mise en page des relais (Q22 de l'audit du 25/11/2026,
    # Triathlon de Hyères 2026 « SPRINT INDIVIDUELS », « BENJAMINS ») : « Team name » est alors le
    # club (« SAINT RAPHAEL TRIATHLON (41) ») et « AfficherNoms » la personne (« SAJAT, David / »).
    # On le reconnaît à ce qu'aucune ligne ne liste plus d'un équipier, dans une épreuve dont le
    # nom ne dit pas relais, duo ou équipe (l'aquathlon en relais de Provence Verte 2025 donne
    # son second relayeur seul dans « AfficherNom2 », le premier étant dans « Team »).
    club_equipe = None
    libelle = " ".join(df["format_epreuve"].dropna().astype(str).unique()).lower()
    if equipe and membres and not re.search(r"relais|duo|[ée]quipe|team", libelle):
        nb_equipiers = df[membres].apply(
            lambda ligne: len((equipiers(list(ligne)) or "").split(" & ")), axis=1)
        if nb_equipiers.max() <= 1:
            club_equipe, equipe = equipe, None
    personne = premiere_colonne(colonnes, NOM_PERSONNE)
    noms = pd.Series(None, index=df.index, dtype=object)
    if equipe:
        noms = df[equipe].map(nom_equipe)
    if personne:
        noms = noms.fillna(df[personne].map(nom_personne))
    if membres:
        noms = noms.fillna(df[membres].apply(lambda ligne: equipiers(list(ligne)), axis=1))
    sortie["nom"] = noms

    col_club = premiere_colonne(colonnes, CLUB)
    if col_club is None and not membres and "team" in colonnes:
        col_club = colonnes["team"]          # RACE RESULT individuel : « Team » est le club
    sortie["club"] = df[col_club].map(club) if col_club else None
    if col_club is None and club_equipe:
        # individuel en mise en page relais (voir plus haut) : le nom d'équipe, sans le dossard
        sortie["club"] = df[club_equipe].map(lambda v: club(nom_equipe(v)))

    col_cat = premiere_colonne(colonnes, CATEGORIE)
    col_sexe = premiere_colonne(colonnes, SEXE)
    sexe_cat = colonnes.get(SEXE_ET_CATEGORIE)
    if sexe_cat:
        parties = df[sexe_cat].map(lambda v: (texte(v) or "").partition("|"))
        cats = parties.map(lambda p: categorie(p[2]))
        sexes = parties.map(lambda p: sexe_mots(p[0]))
    else:
        cats = df[col_cat].map(categorie) if col_cat else \
            pd.Series(None, index=df.index, dtype=object)
        sexes = df[col_sexe].map(sexe_mots) if col_sexe else \
            pd.Series(None, index=df.index, dtype=object)
    sortie["cat"] = cats
    if col_rang:
        sexes = sexes.fillna(df[col_rang].map(lambda v: sexe_mots(re.sub(r"^\d+", "", v))
                                              if isinstance(v, str) else None))
    sexes = sexes.fillna(cats.map(lambda c: sexe_mots(c, lettre_seule=False)))
    sexes = sexes.fillna(cats.map(sexe_categorie))
    for colonne in ["Groupe", col_temps]:   # PDF : « 2:56:59 Hommes » (Top de Porquerolles 2025)
        if colonne:
            sexes = sexes.fillna(df[colonne].map(lambda v: sexe_mots(v, lettre_seule=False)))
    mixtes = cats.map(est_mixte)
    if col_sexe:
        mixtes |= df[col_sexe].map(est_mixte)
        # Colonne qui ne donne que le rang des femmes (« 3F », « 19F », vide pour les hommes :
        # Hyères, Natureman, St Raphaël, Carqueiranne) : une case vide est un homme.
        sexes_publies = df[col_sexe].map(sexe_mots)
        if (sexes_publies == "F").any() and not (sexes_publies == "M").any():
            sexes = sexes.fillna(df[col_sexe].map(lambda v: "M" if texte(v) is None else None))
    sortie["sexe"] = sexes.where(~mixtes)

    sortie["détails"] = df["url_epreuve"]
    for colonne in COLONNES_EPREUVE:
        sortie[colonne] = df[colonne]
    sortie["lieu_epreuve"] = df["name_epreuve"].map(villes).fillna(df["lieu_epreuve"])
    sortie["distance_epreuve"] = None

    # Segments : si deux colonnes donnent le même segment, la première remplie gagne.
    if not any(BOUCLES.match(cle) for cle in colonnes):
        for colonne in df.columns:
            segment = SEGMENTS.get(cle_colonne(colonne))
            if segment is None:
                continue
            valeurs = df[colonne].map(temps_hhmmss)
            sortie[segment] = sortie[segment].fillna(valeurs) if segment in sortie else valeurs

    for colonne in COLONNES_FINALES:
        if colonne not in sortie.columns:
            sortie[colonne] = None
    return sortie[COLONNES_FINALES]


def main() -> None:
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    os.mkdir(OUTPUT_DIR)
    villes = villes_evenements()
    fichiers = sorted(RAW_DIR.glob("*.csv"))
    for chemin in fichiers:
        df = pd.read_csv(chemin, dtype=str)
        organise(df, villes).to_csv(OUTPUT_DIR / chemin.name, index=False)
    print(f"{len(fichiers)} fichiers écrits dans {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
