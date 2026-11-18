import re
from collections import Counter
from typing import Any, Literal

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import (
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
    results = relationship("Result", back_populates="athlete")


class Result(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    clt = Column(Integer)
    clt_f = Column(String(50))
    epreuve_id = Column(Integer, ForeignKey("races.id"))
    name_epreuve = Column(String(50))
    sexe = Column(String(50))
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

@app.get("/races/{race_id}")
def get_race(race_id: int, db: Session = Depends(get_db)):
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    return race

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

@app.get("/athletes")
def search_athletes(
    q: str | None = Query(None, min_length=2),
    s: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Athlete)
    if q:
        query = query.filter(Athlete.nom.ilike(f"%{q}%"))
    if s:
        query = query.filter(Athlete.sexe == s.upper())
    
    total = query.count()
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

# ----------------------
# Athlètes
# ----------------------
# Une même participation peut être rattachée à plusieurs épreuves : chaque course
# prolivesport est dupliquée, avec les mêmes participants, sur les formats OPEN, PTWC,
# PTVI, PTS2-5-F, PTS2-5-M et PTS7-8. En attendant une correction dans transform/, on ne
# garde qu'un résultat par (date, nom d'épreuve, temps total) : celui du format OPEN s'il
# existe, sinon celui de l'épreuve au plus petit id.
def deduplicated_athlete_results(athlete_id: int) -> Select:
    return (
        select(Result)
        .where(Result.athlete_id == athlete_id)
        .distinct(Result.date_epreuve, Result.name_epreuve, Result.total_time)
        .order_by(
            Result.date_epreuve,
            Result.name_epreuve,
            Result.total_time,
            (Result.format_epreuve != "OPEN").asc(),
            Result.epreuve_id,
        )
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


# Sources dont le format d'épreuve n'est pas fiable : chez prolivesport, les courses d'un
# même événement (XS, M…) sont mélangées et étiquetées OPEN / PTWC / PTVI… au hasard.
SOURCES_WITHOUT_RELIABLE_FORMAT = {"prolivesport"}


def get_best_times(results: list[Result]) -> list[dict[str, Any]]:
    """Meilleur temps total par discipline et format (sources au format fiable uniquement)."""
    best: dict[tuple[str, str], Result] = {}
    for result in results:
        if result.source in SOURCES_WITHOUT_RELIABLE_FORMAT:
            continue
        if not is_valid_time(result.total_time):
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
    """Profil consolidé d'un athlète (athlete_id = unified_id), calculé sur ses résultats
    dédoublonnés."""
    results = list(db.scalars(deduplicated_athlete_results(athlete_id)).all())
    athlete_rows = (
        db.query(Athlete.nom, Athlete.club).filter(Athlete.unified_id == athlete_id).all()
    )
    if not results and not athlete_rows:
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
    """Historique dédoublonné d'un athlète, avec le nombre de participants de chaque épreuve."""
    deduplicated = deduplicated_athlete_results(athlete_id).subquery()
    athlete_result = aliased(Result, deduplicated)

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