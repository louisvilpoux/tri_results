from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import create_engine, Column, Integer, String, Date, ForeignKey, Text
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
    db: Session = Depends(get_db),
):
    query = db.query(Race)
    if year_epreuve:
        query = query.filter(Race.date_epreuve.between(f"{year_epreuve}-01-01", f"{year_epreuve}-12-31"))
    if type_epreuve:
        query = query.filter(Race.type_epreuve == type_epreuve.upper())
    if format_epreuve:
        query = query.filter(Race.format_epreuve == format_epreuve.upper())
    return query.order_by(Race.date_epreuve.desc()).limit(100).all()


@app.get("/races/{race_id}")
def get_race(race_id: int, db: Session = Depends(get_db)):
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    return race


@app.get("/races/{race_id}/results")
def get_race_results(race_id: int, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .filter(Result.epreuve_id == race_id)
        .order_by(Result.year_epreuve.desc())
        .all()
    )
    return results


@app.get("/athletes")
def search_athletes(
    q: Optional[str] = Query(None, min_length=2),
    db: Session = Depends(get_db),
):
    return (
        db.query(Athlete)
        .filter(
            Athlete.nom.ilike(f"%{q}%")
        )
        .limit(50)
        .all()
    )


@app.get("/athletes/{athlete_id}")
def get_athlete(athlete_id: int, db: Session = Depends(get_db)):
    athlete = db.query(Athlete)\
                .filter(Athlete.unified_id == athlete_id)\
                .all()#.first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return athlete


@app.get("/athletes/{athlete_id}/results")
def get_athlete_results(athlete_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Result)
        .filter(Result.athlete_id == athlete_id)
        .order_by(Result.id.desc(), Result.year_epreuve)
        .all()
    )

@app.get("/athletes/{athlete_id}/races", response_model=list[str])
def get_athlete_races(athlete_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(Result.name_epreuve)
        .where(Result.athlete_id == athlete_id)
        .order_by(Result.id.desc(), Result.year_epreuve)
    )
    return db.scalars(stmt).all()