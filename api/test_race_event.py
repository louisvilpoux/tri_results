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
def prolivesport_duplicate_id() -> int:
    """Copie PT* d'une épreuve prolivesport."""
    return find_race(
        """
        SELECT r.id
        FROM races r
        WHERE r.format_epreuve = 'PTWC'
          AND EXISTS (
            SELECT 1 FROM results x WHERE x.epreuve_id = r.id AND x.source = 'prolivesport'
          )
        ORDER BY r.id
        LIMIT 1
        """
    )


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
        assert race_format["format_reliable"] is True

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


def test_prolivesport_keeps_a_single_open_format(prolivesport_duplicate_id: int) -> None:
    event = get_event(prolivesport_duplicate_id)
    assert [f["format_epreuve"] for f in event["formats"]] == ["OPEN"]
    assert event["formats"][0]["format_reliable"] is False


def test_prolivesport_sexe_is_reliable(prolivesport_duplicate_id: int) -> None:
    """Le sexe prolivesport vient de sa colonne `sexe` (M, F) et non de la catégorie."""
    open_format = get_event(prolivesport_duplicate_id)["formats"][0]
    results = client.get(
        f"/races/{open_format['id']}/results", params={"limit": 100}
    ).json()["items"]
    assert {result["sexe"] for result in results} <= {"M", "F", None}

    first_woman = open_format["first_woman"]
    assert first_woman is not None
    women = client.get(
        f"/races/{open_format['id']}/results", params={"s": "F", "sort_by": "clt", "limit": 1}
    ).json()["items"]
    assert first_woman["athlete_id"] == women[0]["athlete_id"]


def test_editions_are_one_per_year(multi_format_race_id: int) -> None:
    event = get_event(multi_format_race_id)
    years = [edition["year_epreuve"] for edition in event["editions"]]
    assert years == sorted(set(years), reverse=True)
    assert event["year_epreuve"] in years
    for edition in event["editions"]:
        assert get_event(edition["race_id"])["year_epreuve"] == edition["year_epreuve"]
