"""Tests de /races/{race_id}/event (course : formats et autres éditions).

Comme les autres tests, ils s'exécutent contre la base PostgreSQL locale et vérifient des
propriétés plutôt que des valeurs précises. Lancement : `cd api && pytest`.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import app, engine
from test_race_results import is_ranked

client = TestClient(app)


def find_race(sql: str) -> int:
    try:
        with engine.connect() as connection:
            row = connection.execute(text(sql)).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucune épreuve adaptée dans la base")
    return int(row.id)


@pytest.fixture(scope="module")
def multi_format_race_id() -> int:
    """Épreuve fftri_t2_area dont la course a plusieurs formats la même année."""
    return find_race(
        """
        SELECT MIN(r.id) AS id
        FROM races r
        JOIN results x ON x.epreuve_id = r.id AND x.source = 'fftri_t2_area'
        GROUP BY r.name_epreuve, r.year_epreuve
        HAVING COUNT(DISTINCT r.id) > 1
        ORDER BY 1
        LIMIT 1
        """
    )


@pytest.fixture(scope="module")
def prolivesport_multi_format_id() -> int:
    """Épreuve prolivesport dont la course a plusieurs formats la même année."""
    return find_race(
        """
        SELECT MIN(r.id) AS id
        FROM races r
        JOIN results x ON x.epreuve_id = r.id AND x.source = 'prolivesport'
        GROUP BY r.name_epreuve, r.year_epreuve
        HAVING COUNT(DISTINCT r.id) > 1
        ORDER BY 1
        LIMIT 1
        """
    )


# Formats calculés pour prolivesport (transform/disciplines.sql).
PROLIVESPORT_FORMATS = {"XS", "S", "M", "L", "XL", "XXL", "JEUNES", "RELAIS", None}


def get_event(race_id: int) -> dict[str, Any]:
    response = client.get(f"/races/{race_id}/event")
    assert response.status_code == 200, response.text
    return response.json()


def test_unknown_race_returns_404() -> None:
    assert client.get("/races/0/event").status_code == 404


def test_formats_share_name_and_year(multi_format_race_id: int) -> None:
    event = get_event(multi_format_race_id)
    assert len(event["formats"]) > 1
    assert multi_format_race_id in [f["id"] for f in event["formats"]]

    for race_format in event["formats"]:
        race = client.get(f"/races/{race_format['id']}").json()
        assert race["name_epreuve"] == event["name_epreuve"]
        assert race["year_epreuve"] == event["year_epreuve"]
        assert race_format["participants"] >= 1

    dates = [f["date_epreuve"] for f in event["formats"]]
    assert event["date_start"] == min(dates) and event["date_end"] == max(dates)
    assert event["participants"] <= sum(f["participants"] for f in event["formats"])


def test_winner_is_best_ranked(multi_format_race_id: int) -> None:
    for race_format in get_event(multi_format_race_id)["formats"]:
        results = client.get(
            f"/races/{race_format['id']}/results", params={"sort_by": "clt", "limit": 1}
        ).json()["items"]
        winner = race_format["winner"]
        if results and is_ranked(results[0]["clt"]):
            assert winner["athlete_id"] == results[0]["athlete_id"]
        else:
            assert winner is None


def test_first_woman_is_a_woman(multi_format_race_id: int) -> None:
    for race_format in get_event(multi_format_race_id)["formats"]:
        first_woman = race_format["first_woman"]
        if first_woman is None:
            continue
        women = client.get(
            f"/races/{race_format['id']}/results", params={"s": "F", "sort_by": "clt", "limit": 1}
        ).json()["items"]
        assert first_woman["athlete_id"] == women[0]["athlete_id"]


def test_prolivesport_formats_are_separate_races(prolivesport_multi_format_id: int) -> None:
    """Chaque épreuve prolivesport a son propre classement et un format normalisé."""
    formats = get_event(prolivesport_multi_format_id)["formats"]
    assert len(formats) > 1
    assert {f["format_epreuve"] for f in formats} <= PROLIVESPORT_FORMATS

    participants = {}
    for race_format in formats:
        page = client.get(f"/races/{race_format['id']}/results", params={"limit": 100}).json()
        assert page["pagination"]["total"] == race_format["participants"]
        participants[race_format["id"]] = frozenset(item["athlete_id"] for item in page["items"])
    # Plus de copies identiques d'un format à l'autre.
    assert len(set(participants.values())) == len(participants)


def test_prolivesport_sexe_is_reliable(prolivesport_multi_format_id: int) -> None:
    """Le sexe prolivesport vient de sa colonne `sexe` (M, F) et non de la catégorie."""
    biggest = max(
        get_event(prolivesport_multi_format_id)["formats"], key=lambda f: f["participants"]
    )
    results = client.get(
        f"/races/{biggest['id']}/results", params={"limit": 100}
    ).json()["items"]
    assert {result["sexe"] for result in results} <= {"M", "F", None}

    women = client.get(
        f"/races/{biggest['id']}/results", params={"s": "F", "sort_by": "clt", "limit": 1}
    ).json()["items"]
    if women and women[0]["clt"]:
        assert biggest["first_woman"]["athlete_id"] == women[0]["athlete_id"]


def test_editions_are_one_per_year(multi_format_race_id: int) -> None:
    event = get_event(multi_format_race_id)
    years = [edition["year_epreuve"] for edition in event["editions"]]
    assert years == sorted(set(years), reverse=True)
    assert event["year_epreuve"] in years
    for edition in event["editions"]:
        assert get_event(edition["race_id"])["year_epreuve"] == edition["year_epreuve"]


def test_prolivesport_names_have_no_year() -> None:
    """L'année et le numéro d'édition sont retirés du nom prolivesport (l'année reste dans
    year_epreuve) : les éditions d'une même course partagent le même nom."""
    try:
        with engine.connect() as connection:
            with_year = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM races r
                    WHERE (r.name_epreuve LIKE '%' || r.year_epreuve || '%'
                           OR r.name_epreuve ~* '(^|\\s)\\d+ ?(e|er|ème|eme)(\\s|$)')
                      AND EXISTS (
                        SELECT 1 FROM results x
                        WHERE x.epreuve_id = r.id AND x.source = 'prolivesport'
                      )
                    """
                )
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert with_year == 0


@pytest.mark.parametrize("source", ["prolivesport", "chronoweb"])
def test_no_duplicate_of_fftri(source: str) -> None:
    """Une épreuve prolivesport ou chronoweb qui partage au moins la moitié de ses athlètes avec une épreuve
    fftri_t2_area datée à un jour près est un doublon : elle est retirée
    (transform/doublons_sources.sql)."""
    try:
        with engine.connect() as connection:
            max_overlap = connection.execute(
                text(
                    """
                    WITH epreuves AS (
                        SELECT epreuve_id, COUNT(*) AS participants FROM results GROUP BY epreuve_id
                    ),
                    communs AS (
                        SELECT p.epreuve_id AS pid, f.epreuve_id AS fid, COUNT(*) AS athletes
                        FROM results p
                        JOIN results f
                          ON f.athlete_id = p.athlete_id
                         AND abs(f.date_epreuve::date - p.date_epreuve::date) <= 1
                        WHERE p.source = :source AND f.source = 'fftri_t2_area'
                        GROUP BY 1, 2
                    )
                    SELECT MAX(c.athletes::float / LEAST(ep.participants, ef.participants))
                    FROM communs c
                    JOIN epreuves ep ON ep.epreuve_id = c.pid
                    JOIN epreuves ef ON ef.epreuve_id = c.fid
                    """
                ),
                {"source": source},
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert max_overlap is None or max_overlap < 0.5


def test_chronoweb_detail_sheets_are_excluded() -> None:
    """Les onglets chronoweb « Détails CàP / Vélo » et les manches intermédiaires ne sont pas
    des classements : ils ne deviennent pas des épreuves (transform/disciplines.sql)."""
    try:
        with engine.connect() as connection:
            count = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM races r
                    WHERE unaccent(r.format_initial) ~* '\\mdetails?\\M|\\mma+nche \\d\\M(?! ?\\+)'
                      AND EXISTS (
                        SELECT 1 FROM results x
                        WHERE x.epreuve_id = r.id AND x.source = 'chronoweb'
                      )
                    """
                )
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert count == 0
