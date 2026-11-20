import re
from collections import Counter
from typing import Any, Literal

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    and_,
    asc,
    case,
    create_engine,
    desc,
    func,
    or_,
)
from sqlalchemy.sql import Select
from sqlalchemy.sql.elements import ColumnElement
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session, aliased
import os
from sqlalchemy import select
from fastapi.responses import RedirectResponse

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tri_user:tri_password@localhost:5432/tri_results")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ----------------------
# Database Models
# ----------------------
class Race(Base):
    __tablename__ = "races"
    id = Column(Integer,  primary_key=True, index=True)
    name_epreuve = Column(String(255))
    # nom d'origine de l'épreuve dans la source (« Half Relais », « triathlon m clm »…)
    format_initial = Column(String(255))
    type_epreuve = Column(String(25))
    format_epreuve = Column(String(25))
    year_epreuve = Column(String(25))
    date_epreuve = Column(String(25))
    lieu_epreuve = Column(String(25))
    results = relationship("Result", back_populates="race")


class Athlete(Base):
    __tablename__ = "athletes"
    id = Column(Integer,  primary_key=True, index=True)
    unified_id = Column(Integer)
    nom = Column(String(100))
    club = Column(String(100))
    sexe = Column(String(10))
    nb_races = Column(Integer)
    # Nom en minuscules, sans accents, mots triés (transform/athletes.sql) : sert à la recherche.
    athlete_key = Column(String)
    results = relationship("Result", back_populates="athlete")


class Result(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    clt = Column(Integer)
    clt_f = Column(String(50))
    epreuve_id = Column(Integer, ForeignKey("races.id"))
    name_epreuve = Column(String(50))
    sexe = Column(String(50))
    # Résultat d'une équipe (bike&run, relais) : nom_athlete contient les équipiers et
    # athlete_id ne correspond pas à une personne (voir transform/results.sql).
    equipe = Column(Boolean)
    # Résultat d'un sous-classement (championnat publié à côté de sa course hôte, classement
    # « Open » dans le « Full »…) déjà compté dans une autre épreuve du même jour : visible sur
    # la page de l'épreuve, pas compté dans le profil (voir transform/sous_classements.sql).
    sous_classement = Column(Boolean)
    # Temps total classé anormalement court (moins de la moitié du temps médian de l'épreuve) :
    # probable erreur de la source, signalée et exclue des meilleurs temps (voir
    # transform/temps_totaux.sql).
    temps_suspect = Column(Boolean)
    type_epreuve = Column(String(50))
    format_epreuve = Column(String(50))
    year_epreuve = Column(String(50))
    date_epreuve = Column(String(50))
    athlete_id = Column(Integer, ForeignKey("athletes.id"))
    nom_athlete = Column(String(50))
    cat = Column(String(50))
    clt_cat = Column(String(50))
    id_league = Column(String(50))
    league = Column(String(50))
    url = Column(String(50))
    rang_global = Column(String(50))
    rang_sexe = Column(String(50))
    rang_categorie = Column(String(50))
    categorie = Column(String(50))
    indice_performance = Column(String(50))
    indice_performance_reference = Column(String(50))
    total_time = Column(String(50))
    swim_time = Column(String(50))
    rang_swim = Column(String(50))
    rang_course_swim = Column(String(50))
    indice_performance_swim = Column(String(50))
    t1_time = Column(String(50))
    rang_t1 = Column(String(50))
    rang_course_t1 = Column(String(50))
    indice_performance_t1 = Column(String(50))
    bike_time = Column(String(50))
    rang_bike = Column(String(50))
    rang_course_bike = Column(String(50))
    indice_performance_bike = Column(String(50))
    t2_time = Column(String(50))
    rang_t2 = Column(String(50))
    rang_course_t2 = Column(String(50))
    indice_performance_t2 = Column(String(50))
    run_time = Column(String(50))
    rang_run = Column(String(50))
    rang_course_run = Column(String(50))
    indice_performance_run = Column(String(50))
    source = Column(String(50))

    race = relationship("Race", back_populates="results")
    athlete = relationship("Athlete", back_populates="results")


# ----------------------
# FastAPI App
# ----------------------
app = FastAPI(
    title="Tri Results API",
    description="API publique pour les résultats de triathlon et duathlon",
    version="0.1.0",
)


# ----------------------
# Dependencies
# ----------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------
# Endpoints
# ----------------------
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/", include_in_schema=False)
async def root():
    # Redirection vers /health (code 303 See Other ou 307 Temporary Redirect)
    return RedirectResponse(url="/health", status_code=303)

@app.get("/races")
def list_races(
    year_epreuve: str | None = Query(None),
    type_epreuve: str | None = Query(None),
    format_epreuve: str | None = Query(None),
    name_epreuve: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Race)
    if year_epreuve:
        query = query.filter(Race.date_epreuve.between(f"{year_epreuve}-01-01", f"{year_epreuve}-12-31"))
    if type_epreuve:
        query = query.filter(Race.type_epreuve == type_epreuve.lower())
    if format_epreuve:
        query = query.filter(Race.format_epreuve == format_epreuve.upper())
    if name_epreuve:
        query = query.filter(Race.name_epreuve.ilike(f"%{name_epreuve}%"))

    total = query.count()
    items = query.order_by(Race.date_epreuve.desc()).offset(offset).limit(limit).all()
    has_next = (offset + limit) < total

    return {
        "items": items,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": has_next
        }
    }

def clean_lieu(lieu: str | None) -> str | None:
    """Retire les "nan" (valeurs vides converties en texte au scraping) d'un lieu d'épreuve,
    ex. "nan Cabourg nan nan" → "Cabourg", "nan nan nan nan" → None."""
    if not lieu:
        return None
    return " ".join(part for part in lieu.split() if part.lower() != "nan") or None


@app.get("/races/{race_id}")
def get_race(race_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    return {
        column.name: getattr(race, column.name) for column in Race.__table__.columns
    } | {
        "lieu_epreuve": clean_lieu(race.lieu_epreuve),
        "sans_temps": race.id in races_without_time(db, [race.id]),
        "avec_segments": race_has_splits(db, race.id),
        # nombre de temps signalés comme probablement faux (bandeau sur la page de l'épreuve)
        "temps_suspects": db.scalar(
            select(func.count(Result.id)).where(
                Result.epreuve_id == race.id, Result.temps_suspect.is_(True)
            )
        )
        or 0,
    }

RaceResultSortBy = Literal[
    "clt",
    "nom_athlete",
    "swim_time",
    "t1_time",
    "bike_time",
    "t2_time",
    "run_time",
    "total_time",
]

# Les temps sont stockés en texte "HH:MM:SS", mais certaines sources contiennent
# aussi "—", des valeurs négatives ou "00:00:00" (non classés) : seuls les temps au bon
# format et non nuls sont triés ou pris en compte dans les statistiques.
VALID_TIME_PATTERN = r"^[0-9]{2}:[0-9]{2}:[0-9]{2}$"
ZERO_TIME = "00:00:00"


def valid_time_or_null(column: ColumnElement) -> ColumnElement:
    """Expression SQL qui vaut le temps s'il est valide, NULL sinon."""
    return case((and_(column.op("~")(VALID_TIME_PATTERN), column != ZERO_TIME), column))


# prolivesport stocke les non-classés avec clt = 0 ou un code de statut entre 99991 et
# 99999 (signification non documentée : DNF, DNS, DSQ…). Ce ne sont pas des classements.
STATUS_RANK_MIN = 99990


def is_valid_rank(rank: int | None) -> bool:
    return rank is not None and 0 < rank < STATUS_RANK_MIN


def valid_rank_or_null(column: ColumnElement) -> ColumnElement:
    """Expression SQL qui vaut le classement s'il est valide (voir is_valid_rank), NULL sinon."""
    return case((and_(column > 0, column < STATUS_RANK_MIN), column))


# Ordre d'affichage des formats (du plus court au plus long) ;
# les autres suivent par ordre alphabétique.
FORMAT_DISPLAY_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

# Ordre d'affichage des disciplines : celui des cartes de la page d'accueil
# (triathlon-results/app/page.tsx). Les autres suivent par ordre alphabétique.
DISCIPLINE_DISPLAY_ORDER = [
    "triathlon",
    "cross triathlon",
    "duathlon",
    "cross duathlon",
    "aquathlon",
    "swimrun",
    "bike&run",
]


def races_without_time(db: Session, race_ids: list[int]) -> set[int]:
    """Épreuves dont aucun résultat n'a ni temps total ni classement valides : la source n'a
    publié ni temps ni classement (ex. Cross-Duathlon du Haricot 2018, chez prolivesport).
    Leurs segments ne sont pas assez fiables pour recalculer un temps (voir frontend.md,
    points connus) : l'épreuve est affichée « sans temps » plutôt qu'avec un classement
    inventé. Une épreuve classée sans temps total (Bayman 2024) garde son classement."""
    if not race_ids:
        return set()
    with_time_or_rank = db.scalars(
        select(Result.epreuve_id)
        .where(
            Result.epreuve_id.in_(race_ids),
            or_(
                valid_time_or_null(Result.total_time).isnot(None),
                valid_rank_or_null(Result.clt).isnot(None),
            ),
        )
        .distinct()
    )
    return set(race_ids) - set(with_time_or_rank)


SPLIT_TIME_COLUMNS = ["swim_time", "t1_time", "bike_time", "t2_time", "run_time"]


def race_has_splits(db: Session, race_id: int) -> bool:
    """Vrai si au moins un résultat de l'épreuve a un temps intermédiaire (natation, T1, vélo,
    T2 ou course) : sinon la page de classement n'affiche que le temps total (Chantilly 2025
    XXL, environ 80 triathlons dont la source ne publie que le total)."""
    any_split = or_(
        *(valid_time_or_null(getattr(Result, column)).isnot(None) for column in SPLIT_TIME_COLUMNS)
    )
    return bool(
        db.scalar(select(select(Result.id).where(Result.epreuve_id == race_id, any_split).exists()))
    )


def get_result_sort_expression(sort_by: RaceResultSortBy) -> ColumnElement:
    """Retourne l'expression SQL de tri ; les valeurs invalides deviennent NULL."""
    column = getattr(Result, sort_by)
    if sort_by == "clt":
        return valid_rank_or_null(column)
    if sort_by.endswith("_time"):
        return valid_time_or_null(column)
    return column


# response_model=None : les items sont des objets ORM sérialisés tels quels par FastAPI.
@app.get("/races/{race_id}/results", response_model=None)
def get_race_results(
    race_id: int,
    s: str | None = Query(None, description="Sexe : M ou F"),
    categorie: str | None = Query(None, description="Catégorie exacte (ex: MS3)"),
    q: str | None = Query(None, min_length=2, description="Recherche dans le nom de l'athlète"),
    sort_by: RaceResultSortBy = Query("clt", description="Colonne à trier"),
    order: str = Query("asc", pattern="^(asc|desc)$", description="Ordre de tri : asc ou desc"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    query = db.query(Result).filter(Result.epreuve_id == race_id)
    if s:
        query = query.filter(Result.sexe == s.upper())
    if categorie:
        query = query.filter(Result.categorie == categorie)
    if q:
        query = query.filter(Result.nom_athlete.ilike(f"%{q}%"))
    total = query.count()

    # Les valeurs vides (DNF, temps manquants) restent en fin de liste quel que soit
    # l'ordre ; l'id garantit une pagination stable en cas d'égalité.
    sort_expression = get_result_sort_expression(sort_by)
    if sort_by == "clt" and race_id in races_without_time(db, [race_id]):
        # Épreuve sans temps ni classement : participants par ordre alphabétique.
        sort_expression = Result.nom_athlete
    direction = desc if order == "desc" else asc
    query = query.order_by(direction(sort_expression).nulls_last(), Result.id.asc())

    items = query.offset(offset).limit(limit).all()
    has_next = (offset + limit) < total

    return {
        "items": items,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": has_next
        }
    }

@app.get("/races/{race_id}/categories")
def get_race_categories(race_id: int, db: Session = Depends(get_db)) -> list[str]:
    """Liste triée des catégories présentes dans les résultats d'une épreuve."""
    rows = (
        db.query(Result.categorie)
        .filter(Result.epreuve_id == race_id, Result.categorie.isnot(None))
        .distinct()
        .order_by(Result.categorie)
        .all()
    )
    return [row.categorie for row in rows]


# ----------------------
# Course (événement)
# ----------------------
# La base n'a pas de table « événement » : chaque ligne de `races` est un format. Les formats
# d'une même course sont ceux qui partagent le nom et l'année (ex. Deauville 2022 : XXL, L et M
# sur trois jours). Les épreuves sans résultat (anciennes sources, souvent sans date) sont
# ignorées.
def get_podium_leaders(
    db: Session, race_ids: list[int], women_only: bool = False
) -> dict[int, dict[str, Any]]:
    """Premier classé (ou première femme) de chaque épreuve : {race_id: {athlete_id, ...}}."""
    rank = valid_rank_or_null(Result.clt)
    query = (
        select(
            Result.epreuve_id,
            Result.athlete_id,
            Result.nom_athlete,
            Result.equipe,
            Result.total_time,
            Result.temps_suspect,
        )
        .where(Result.epreuve_id.in_(race_ids), rank.isnot(None))
        .distinct(Result.epreuve_id)
        .order_by(Result.epreuve_id, rank, Result.id)
    )
    if women_only:
        query = query.where(Result.sexe == "F")

    return {
        row.epreuve_id: {
            "athlete_id": row.athlete_id,
            "nom_athlete": " ".join((row.nom_athlete or "").split()) or None,
            "equipe": row.equipe,
            "total_time": row.total_time if is_valid_time(row.total_time) else None,
            "temps_suspect": row.temps_suspect,
        }
        for row in db.execute(query)
    }


@app.get("/races/{race_id}/event")
def get_race_event(race_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Course à laquelle appartient l'épreuve `race_id` : ses formats et ses autres éditions."""
    race = db.get(Race, race_id)
    if race is None:
        raise HTTPException(status_code=404, detail="Race not found")

    same_name = Race.name_epreuve == race.name_epreuve
    # Sans année connue, impossible de retrouver les autres formats : l'épreuve reste seule.
    same_edition = (
        Race.year_epreuve == race.year_epreuve if race.year_epreuve else Race.id == race.id
    )
    has_results = select(Result.id).where(Result.epreuve_id == Race.id).exists()
    siblings = db.scalars(
        select(Race)
        .where(same_name, same_edition, has_results)
        .order_by(Race.date_epreuve, Race.id)
    ).all()
    sibling_ids = [sibling.id for sibling in siblings]

    # Nombre de participants et source de chaque épreuve.
    stats = {
        row.epreuve_id: row
        for row in db.execute(
            select(
                Result.epreuve_id,
                func.count(Result.id).label("participants"),
                func.min(Result.source).label("source"),
            )
            .where(Result.epreuve_id.in_(sibling_ids))
            .group_by(Result.epreuve_id)
        )
    }

    formats = sorted(siblings, key=race_format_sort_key)
    format_ids = [race_format.id for race_format in formats]
    without_time = races_without_time(db, format_ids)
    # Sous-classements (championnat, catégorie…) : résultats déjà comptés dans une autre épreuve.
    sub_rankings = set(
        db.scalars(
            select(Result.epreuve_id)
            .where(Result.epreuve_id.in_(format_ids), Result.sous_classement.is_(True))
            .distinct()
        )
    )
    winners = get_podium_leaders(db, format_ids)
    first_women = get_podium_leaders(db, format_ids, women_only=True)

    participants_total = (
        db.scalar(
            select(func.count(func.distinct(Result.athlete_id))).where(
                Result.epreuve_id.in_(format_ids)
            )
        )
        or 0
    )

    # Autres éditions : une épreuve par année (celle au plus petit id).
    editions = db.execute(
        select(Race.year_epreuve, func.min(Race.id).label("race_id"))
        .where(same_name, Race.year_epreuve.isnot(None), has_results)
        .group_by(Race.year_epreuve)
        .order_by(Race.year_epreuve.desc())
    ).all()

    dates = sorted(f.date_epreuve for f in formats if f.date_epreuve)

    return {
        "id": race.id,
        "name_epreuve": race.name_epreuve,
        "year_epreuve": race.year_epreuve,
        "lieu_epreuve": next(
            (clean_lieu(f.lieu_epreuve) for f in siblings if clean_lieu(f.lieu_epreuve)), None
        ),
        "date_start": dates[0] if dates else race.date_epreuve,
        "date_end": dates[-1] if dates else race.date_epreuve,
        "participants": participants_total,
        "formats": [
            {
                "id": race_format.id,
                "type_epreuve": race_format.type_epreuve,
                "format_epreuve": race_format.format_epreuve,
                "date_epreuve": race_format.date_epreuve,
                "participants": stats[race_format.id].participants,
                "winner": winners.get(race_format.id),
                "first_woman": first_women.get(race_format.id),
                "sans_temps": race_format.id in without_time,
                "sous_classement": race_format.id in sub_rankings,
            }
            for race_format in formats
        ],
        "editions": [
            {"year_epreuve": edition.year_epreuve, "race_id": edition.race_id}
            for edition in editions
        ],
    }


@app.get("/athletes")
def list_athletes(
    q: str | None = Query(None, min_length=2, max_length=100, description="Filtre sur le nom"),
    s: str | None = Query(None, description="Sexe : M ou F"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Athlètes (un par unified_id), les plus actifs d'abord, filtrables par nom (mêmes règles
    que /search) et par sexe. Les fonctions utilisées sont définies plus bas (Recherche)."""
    words = search_words(q) if q else []
    page = search_athletes_page(db, words, limit, offset, sexe=s.upper() if s else None)
    return {"items": page["items"], "pagination": pagination(page["total"], limit, offset)}

# ----------------------
# Athlètes
# ----------------------
def athlete_results(athlete_id: int) -> Select:
    """Résultats individuels d'un athlète (athlete_id = unified_id) ; les résultats d'équipe
    (bike&run, relais) ne sont rattachés à aucune personne, et ceux d'un sous-classement sont
    déjà comptés dans une autre épreuve du même jour."""
    return select(Result).where(
        Result.athlete_id == athlete_id,
        Result.equipe.is_(False),
        Result.sous_classement.is_(False),
    )


def result_to_dict(result: Result) -> dict[str, Any]:
    return {column.name: getattr(result, column.name) for column in Result.__table__.columns}


def most_common(values: list[str | None]) -> str | None:
    """Valeur non vide la plus fréquente (la première rencontrée en cas d'égalité)."""
    counter = Counter(value for value in values if value)
    return counter.most_common(1)[0][0] if counter else None


def is_valid_time(value: str | None) -> bool:
    """Équivalent Python de valid_time_or_null."""
    return (
        value is not None
        and re.fullmatch(VALID_TIME_PATTERN, value) is not None
        and value != ZERO_TIME
    )


def get_best_times(results: list[Result]) -> list[dict[str, Any]]:
    """Meilleur temps total par discipline et format, parmi les résultats classés : le temps d'un
    non-classé est souvent celui de son abandon (00:32:50 sur un M à Bordeaux 2018). Un temps
    suspect (probable erreur de la source) n'est pas pris non plus."""
    best: dict[tuple[str, str], Result] = {}
    for result in results:
        if not is_valid_time(result.total_time) or not is_valid_rank(result.clt):
            continue
        if result.temps_suspect:
            continue
        key = (result.type_epreuve or "", result.format_epreuve or "")
        if key not in best or result.total_time < best[key].total_time:
            best[key] = result

    return [
        {
            "type_epreuve": result.type_epreuve,
            "format_epreuve": result.format_epreuve,
            "total_time": result.total_time,
            "epreuve_id": result.epreuve_id,
            "name_epreuve": result.name_epreuve,
            "date_epreuve": result.date_epreuve,
        }
        for _, result in sorted(best.items())
    ]


@app.get("/athletes/{athlete_id}")
def get_athlete(athlete_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Profil consolidé d'un athlète (athlete_id = unified_id), calculé sur ses résultats."""
    results = list(db.scalars(athlete_results(athlete_id)).all())
    athlete_rows = (
        db.query(Athlete.nom, Athlete.club).filter(Athlete.unified_id == athlete_id).all()
    )
    if not results:  # aucun résultat individuel (ex. équipe de bike&run)
        raise HTTPException(status_code=404, detail="Athlete not found")

    names = [result.nom_athlete for result in results] or [row.nom for row in athlete_rows]
    name = most_common(names)
    ranks = [result.clt for result in results if is_valid_rank(result.clt)]
    years = sorted({result.year_epreuve for result in results if result.year_epreuve})
    disciplines = Counter(result.type_epreuve for result in results if result.type_epreuve)

    return {
        "id": athlete_id,
        # Certaines sources contiennent des espaces doubles dans les noms.
        "nom": " ".join(name.split()) if name else None,
        "club": most_common([row.club for row in athlete_rows]),
        # La colonne sexe n'est fiable que pour M/F (voir frontend.md, points connus).
        "sexe": most_common([r.sexe for r in results if r.sexe in ("M", "F")]),
        "nb_races": len(results),
        "nb_podiums": sum(1 for rank in ranks if rank <= 3),
        "nb_top10": sum(1 for rank in ranks if rank <= 10),
        "best_rank": min(ranks, default=None),
        "seasons": list(reversed(years)),
        "disciplines": [
            {"type_epreuve": type_epreuve, "count": count}
            for type_epreuve, count in disciplines.most_common()
        ],
        "best_times": get_best_times(results),
    }


AthleteResultSortBy = Literal["date_epreuve", "clt", "total_time"]


@app.get("/athletes/{athlete_id}/results")
def get_athlete_results(
    athlete_id: int,
    year_epreuve: str | None = Query(None),
    type_epreuve: str | None = Query(None),
    format_epreuve: str | None = Query(None),
    sort_by: AthleteResultSortBy = Query("date_epreuve", description="Colonne à trier"),
    order: str = Query("desc", pattern="^(asc|desc)$", description="Ordre de tri : asc ou desc"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Historique d'un athlète, avec le nombre de participants de chaque épreuve."""
    athlete_result = aliased(Result, athlete_results(athlete_id).subquery())

    filters = []
    if year_epreuve:
        filters.append(athlete_result.year_epreuve == year_epreuve)
    if type_epreuve:
        filters.append(athlete_result.type_epreuve == type_epreuve.lower())
    if format_epreuve:
        filters.append(athlete_result.format_epreuve == format_epreuve.upper())

    total = db.scalar(select(func.count()).select_from(athlete_result).where(*filters)) or 0

    field = aliased(Result)
    participants = (
        select(func.count(field.id))
        .where(field.epreuve_id == athlete_result.epreuve_id)
        .correlate_except(field)
        .scalar_subquery()
    )

    sort_column = getattr(athlete_result, sort_by)
    if sort_by == "clt":
        sort_column = valid_rank_or_null(sort_column)
    elif sort_by == "total_time":
        sort_column = valid_time_or_null(sort_column)
    direction = desc if order == "desc" else asc

    rows = db.execute(
        select(athlete_result, participants)
        .where(*filters)
        .order_by(direction(sort_column).nulls_last(), athlete_result.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return {
        "items": [
            {**result_to_dict(result), "participants": count} for result, count in rows
        ],
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": (offset + limit) < total,
        },
    }

@app.get("/athletes/{athlete_id}/races")
def get_athlete_races(
    athlete_id: int,
    year_epreuve: str | None = Query(None),
    type_epreuve: str | None = Query(None),
    format_epreuve: str | None = Query(None),
    sort_by: str | None = Query(None, description="Colonne à trier (ex: date_epreuve)"),
    order: str = Query("desc", regex="^(asc|desc)$", description="Ordre de tri : asc ou desc"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    filters = [Result.athlete_id == athlete_id]
    
    if year_epreuve:
        filters.append(Result.year_epreuve == year_epreuve)
    if type_epreuve:
        filters.append(Result.type_epreuve == type_epreuve.lower())
    if format_epreuve:
        filters.append(Result.format_epreuve == format_epreuve.upper())

    count_stmt = select(func.count()).select_from(Result).where(*filters)
    total = db.scalar(count_stmt) or 0

    order_func = desc if order.lower() == "desc" else asc

    # Application du tri selon sort_by
    if sort_by == "date_epreuve":
        order_criteria = order_func(Result.date_epreuve)
    else:
        # Tri par défaut si aucun sort_by reconnu n'est spécifié
        order_criteria = order_func(Result.id)

    stmt = (
        select(Result.name_epreuve)
        .where(*filters)
        .order_by(order_criteria, order_func(Result.year_epreuve))
        .offset(offset)
        .limit(limit)
    )
    items = db.scalars(stmt).all()
    has_next = (offset + limit) < total

    return {
        "items": items,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": has_next
        }
    }

# ----------------------
# Recherche globale
# ----------------------
SearchType = Literal["all", "athletes", "races"]
MAX_SEARCH_WORDS = 6


def search_words(q: str) -> list[str]:
    """Mots de la recherche, en minuscules (les accents sont retirés côté SQL). Tirets,
    apostrophes et virgules séparent les mots, comme dans la clé des athlètes
    (transform/athletes.sql) : « jean-marc » cherche « jean » et « marc »."""
    words = re.split(r"[-‐‑‒–—−'‘’_,\s]+", q.lower())
    return [word for word in words if word][:MAX_SEARCH_WORDS]


def contains_word(column: ColumnElement, word: str) -> ColumnElement:
    """`column` contient `word` (sans tenir compte des accents ; % et _ pris littéralement)."""
    escaped = word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return column.like("%" + func.unaccent(escaped) + "%", escape="\\")


def search_athletes_page(
    db: Session, words: list[str], limit: int, offset: int, sexe: str | None = None
) -> dict[str, Any]:
    """Athlètes (un par unified_id) dont le nom contient tous les mots — tous les athlètes si
    `words` est vide —, les plus actifs d'abord. Utilisé par /search et /athletes."""
    # nb_races n'est renseigné que pour les athlètes ayant des résultats
    # (transform/nb_races.sql) : on écarte les autres (souvent des équipes de relais).
    sexe_filter = [Athlete.sexe == sexe] if sexe else []
    if words:
        # Un même athlète a plusieurs lignes (variantes du nom) : on cherche dans toutes.
        matching = (
            select(Athlete.unified_id, func.max(Athlete.nb_races).label("nb_races"))
            .where(*sexe_filter, *(contains_word(Athlete.athlete_key, word) for word in words))
            .group_by(Athlete.unified_id)
            .having(func.max(Athlete.nb_races).isnot(None))
            .subquery()
        )
    else:
        # Sans recherche, la ligne de référence (id = unified_id) suffit : beaucoup plus rapide.
        matching = (
            select(Athlete.unified_id, Athlete.nb_races)
            .where(Athlete.id == Athlete.unified_id, Athlete.nb_races.isnot(None), *sexe_filter)
            .subquery()
        )
    total = db.scalar(select(func.count()).select_from(matching)) or 0
    ids = db.scalars(
        select(matching.c.unified_id)
        .order_by(matching.c.nb_races.desc().nulls_last(), matching.c.unified_id)
        .offset(offset)
        .limit(limit)
    ).all()

    # Nom et club : lignes `athletes` du même athlète ; nombre de courses et dernière saison :
    # résultats, comme sur le profil.
    identities: dict[int, list[Any]] = {athlete_id: [] for athlete_id in ids}
    for row in db.execute(
        select(Athlete.unified_id, Athlete.nom, Athlete.club).where(Athlete.unified_id.in_(ids))
    ):
        identities[row.unified_id].append(row)

    activity = {
        row.athlete_id: row
        for row in db.execute(
            select(
                Result.athlete_id,
                func.count(Result.id).label("nb_races"),
                func.max(Result.year_epreuve).label("last_season"),
            )
            .where(
                Result.athlete_id.in_(ids),
                Result.equipe.is_(False),
                Result.sous_classement.is_(False),
            )
            .group_by(Result.athlete_id)
        )
    }

    items = []
    for athlete_id in ids:
        name = most_common([row.nom for row in identities[athlete_id]])
        stats = activity.get(athlete_id)
        items.append(
            {
                "id": athlete_id,
                "nom": " ".join(name.split()) if name else None,
                "club": most_common([row.club for row in identities[athlete_id]]),
                "nb_races": stats.nb_races if stats else 0,
                "last_season": stats.last_season if stats else None,
            }
        )
    return {"items": items, "total": total}


def format_sort_key(format_epreuve: str | None) -> tuple[int, str]:
    """Clé de tri des formats : XS, S, M, L, XL, XXL, puis les autres par ordre alphabétique
    (JEUNES, RELAIS), puis les formats inconnus."""
    if format_epreuve in FORMAT_DISPLAY_ORDER:
        return FORMAT_DISPLAY_ORDER.index(format_epreuve), ""
    if format_epreuve is None:
        return len(FORMAT_DISPLAY_ORDER) + 1, ""
    return len(FORMAT_DISPLAY_ORDER), format_epreuve


def discipline_sort_key(type_epreuve: str | None) -> tuple[int, str]:
    """Clé de tri des disciplines : ordre de la page d'accueil, puis les autres par ordre
    alphabétique, puis les disciplines inconnues."""
    if type_epreuve in DISCIPLINE_DISPLAY_ORDER:
        return DISCIPLINE_DISPLAY_ORDER.index(type_epreuve), ""
    if type_epreuve is None:
        return len(DISCIPLINE_DISPLAY_ORDER) + 1, ""
    return len(DISCIPLINE_DISPLAY_ORDER), type_epreuve


def race_format_sort_key(race: "Race") -> tuple[Any, ...]:
    """Ordre des formats sur la page d'une course, identique d'une édition à l'autre :
    discipline (ordre de la page d'accueil), format (XS → XXL, JEUNES, RELAIS), puis date et
    nom d'origine de l'épreuve pour départager deux épreuves de même discipline et format
    (l'id change à chaque reconstruction de la base : il ne sert qu'en dernier recours)."""
    return (
        discipline_sort_key(race.type_epreuve),
        format_sort_key(race.format_epreuve),
        race.date_epreuve or "",
        race.format_initial or "",
        race.id,
    )


def search_races_page(
    db: Session,
    words: list[str],
    limit: int,
    offset: int,
    year: str | None = None,
    type_epreuve: str | None = None,
    format_epreuve: str | None = None,
) -> dict[str, Any]:
    """Courses (nom + année, comme /races/{id}/event) dont le nom contient tous les mots —
    toutes si `words` est vide —, les plus récentes d'abord. Les épreuves sans résultat sont
    ignorées. Utilisé par /search et /events."""
    has_results = select(Result.id).where(Result.epreuve_id == Race.id).exists()
    normalized_name = func.unaccent(func.lower(Race.name_epreuve))
    filters = [has_results, *(contains_word(normalized_name, word) for word in words)]
    if year:
        filters.append(Race.year_epreuve == year)
    if type_epreuve:
        filters.append(Race.type_epreuve == type_epreuve)
    if format_epreuve:
        filters.append(Race.format_epreuve == format_epreuve)
    events = (
        select(
            Race.name_epreuve,
            Race.year_epreuve,
            func.min(Race.date_epreuve).label("date_start"),
            func.max(Race.date_epreuve).label("date_end"),
            func.max(Race.lieu_epreuve).label("lieu_epreuve"),
            func.array_agg(func.distinct(Race.type_epreuve)).label("types"),
            # Même règle que les éditions de /races/{id}/event : l'épreuve au plus petit id.
            func.min(Race.id).label("race_id"),
        )
        .where(*filters)
        .group_by(Race.name_epreuve, Race.year_epreuve)
        .subquery()
    )
    total = db.scalar(select(func.count()).select_from(events)) or 0
    rows = db.execute(
        select(events)
        .order_by(events.c.date_end.desc().nulls_last(), events.c.race_id)
        .offset(offset)
        .limit(limit)
    ).all()

    items = [
        {
            "id": row.race_id,
            "name_epreuve": row.name_epreuve,
            "year_epreuve": row.year_epreuve,
            "date_start": row.date_start,
            "date_end": row.date_end,
            "lieu_epreuve": clean_lieu(row.lieu_epreuve),
            "types": sorted(t for t in row.types if t),
        }
        for row in rows
    ]
    return {"items": items, "total": total}


@app.get("/search")
def search(
    q: str = Query(..., min_length=2, max_length=100, description="Texte recherché"),
    type: SearchType = Query("all", description="all, athletes ou races"),
    limit: int = Query(6, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Recherche d'athlètes et de courses par nom : tous les mots doivent apparaître, dans
    n'importe quel ordre, sans tenir compte des majuscules ni des accents."""
    words = search_words(q)
    if not words:
        raise HTTPException(status_code=422, detail="Recherche vide")

    response: dict[str, Any] = {"q": q, "type": type, "limit": limit, "offset": offset}
    if type in ("all", "athletes"):
        response["athletes"] = search_athletes_page(db, words, limit, offset)
    if type in ("all", "races"):
        response["races"] = search_races_page(db, words, limit, offset)
    return response


# ----------------------
# Listes (pages Courses et Athlètes)
# ----------------------
def pagination(total: int, limit: int, offset: int) -> dict[str, Any]:
    return {"total": total, "limit": limit, "offset": offset, "has_next": (offset + limit) < total}


@app.get("/events")
def list_events(
    year: str | None = Query(None, pattern=r"^\d{4}$", description="Année (ex: 2024)"),
    type_epreuve: str | None = Query(None, description="Discipline (ex: triathlon)"),
    format_epreuve: str | None = Query(None, description="Format (ex: M), colonne format_epreuve"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Liste des courses (nom + année), les plus récentes d'abord, avec les années,
    disciplines et formats disponibles pour les filtres."""
    page = search_races_page(
        db,
        [],
        limit,
        offset,
        year=year,
        type_epreuve=type_epreuve,
        format_epreuve=format_epreuve,
    )

    has_results = select(Result.id).where(Result.epreuve_id == Race.id).exists()
    years = db.scalars(
        select(Race.year_epreuve)
        .where(has_results, Race.year_epreuve.isnot(None))
        .distinct()
        .order_by(Race.year_epreuve.desc())
    ).all()
    types = db.scalars(
        select(Race.type_epreuve)
        .where(has_results, Race.type_epreuve.isnot(None), Race.type_epreuve != "")
        .distinct()
        .order_by(Race.type_epreuve)
    ).all()
    formats = db.scalars(
        select(Race.format_epreuve)
        .where(has_results, Race.format_epreuve.isnot(None), Race.format_epreuve != "")
        .distinct()
    ).all()

    return {
        "items": page["items"],
        "pagination": pagination(page["total"], limit, offset),
        "filters": {
            "years": years,
            "types": types,
            "formats": sorted(formats, key=format_sort_key),
        },
    }


# ----------------------
# Redirections
# ----------------------
# Les id d'épreuve et d'athlète sont stables d'une reconstruction de la base à l'autre
# (transform/ids_stables.sql). Un id disparaît seulement quand deux athlètes ou deux épreuves
# sont réunis, ou qu'une épreuve en double est retirée : la table `redirections` donne alors
# l'id qui le remplace, pour que le site redirige les anciens liens.
class Redirection(Base):
    __tablename__ = "redirections"
    type = Column(String, primary_key=True)
    ancien_id = Column(Integer, primary_key=True)
    nouvel_id = Column(Integer)


REDIRECTION_TYPES = {"races": "epreuve", "athletes": "athlete"}


@app.get("/redirections/{kind}/{old_id}")
def get_redirection(
    kind: Literal["races", "athletes"], old_id: int, db: Session = Depends(get_db)
) -> dict[str, int]:
    """Id qui remplace un ancien id d'épreuve ou d'athlète ; 404 s'il n'y en a pas."""
    new_id = db.scalar(
        select(Redirection.nouvel_id).where(
            Redirection.type == REDIRECTION_TYPES[kind], Redirection.ancien_id == old_id
        )
    )
    if new_id is None:
        raise HTTPException(status_code=404, detail="No redirection")
    return {"id": new_id}
