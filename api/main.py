from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, func
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from typing import List, Optional
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
    clt = Column(String(50))
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
    year_epreuve: Optional[str] = Query(None),
    type_epreuve: Optional[str] = Query(None),
    format_epreuve: Optional[str] = Query(None),
    name_epreuve: Optional[str] = Query(None),
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

@app.get("/races/{race_id}/results")
def get_race_results(
    race_id: int,
    s: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Result).filter(Result.epreuve_id == race_id)
    if s:
        query = query.filter(Result.sexe == s.upper())
    total = query.count()
    items = query.order_by(Result.year_epreuve.desc()).offset(offset).limit(limit).all()
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

@app.get("/athletes")
def search_athletes(
    q: Optional[str] = Query(None, min_length=2),
    s: Optional[str] = Query(None),
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

@app.get("/athletes/{athlete_id}")
def get_athlete(athlete_id: int, db: Session = Depends(get_db)):
    athlete = db.query(Athlete)\
                .filter(Athlete.unified_id == athlete_id)\
                .all()#.first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return athlete

@app.get("/athletes/{athlete_id}/results")
def get_athlete_results(
    athlete_id: int,
    year_epreuve: Optional[str] = Query(None),
    type_epreuve: Optional[str] = Query(None),
    format_epreuve: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Result).filter(Result.athlete_id == athlete_id)
    if year_epreuve:
        query = query.filter(Result.year_epreuve == year_epreuve)
    if type_epreuve:
        query = query.filter(Result.type_epreuve == type_epreuve.lower())
    if format_epreuve:
        query = query.filter(Result.format_epreuve == format_epreuve.upper())
    total = query.count()
    items = query.order_by(Result.id.desc(), Result.year_epreuve).offset(offset).limit(limit).all()
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

@app.get("/athletes/{athlete_id}/races")
def get_athlete_races(
    athlete_id: int,
    year_epreuve: Optional[str] = Query(None),
    type_epreuve: Optional[str] = Query(None),
    format_epreuve: Optional[str] = Query(None),
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

    stmt = (
        select(Result.name_epreuve)
        .where(*filters)
        .order_by(Result.id.desc(), Result.year_epreuve)
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