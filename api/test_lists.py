"""Tests de /events (liste des courses) et /athletes (liste des athlètes).

Comme les autres tests, ils s'exécutent contre la base PostgreSQL locale et vérifient des
propriétés plutôt que des valeurs précises. Lancement : `cd api && pytest`.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from main import app, clean_lieu, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def database_available() -> None:
    try:
        with engine.connect():
            pass
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")


def get(path: str, **params: Any) -> dict[str, Any]:
    response = client.get(path, params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_clean_lieu() -> None:
    assert clean_lieu("nan nan nan nan") is None
    assert clean_lieu("nan Cabourg nan nan") == "Cabourg"
    assert clean_lieu("59123 Bray-Dunes 59 - Nord France") == "59123 Bray-Dunes 59 - Nord France"
    assert clean_lieu(None) is None


def test_events_most_recent_first_with_filters_lists() -> None:
    data = get("/events", limit=50)
    dates = [item["date_end"] for item in data["items"] if item["date_end"]]
    assert dates == sorted(dates, reverse=True)
    assert data["filters"]["years"] == sorted(data["filters"]["years"], reverse=True)
    assert data["pagination"]["total"] > len(data["items"])
    assert all("nan" not in (item["lieu_epreuve"] or "").split() for item in data["items"])


def test_events_filters() -> None:
    filters = get("/events", limit=1)["filters"]
    year, discipline = filters["years"][1], filters["types"][0]

    by_year = get("/events", year=year, limit=100)["items"]
    assert by_year and all(item["year_epreuve"] == year for item in by_year)

    by_type = get("/events", type_epreuve=discipline, limit=100)["items"]
    assert by_type and all(discipline in item["types"] for item in by_type)


def test_events_format_filter() -> None:
    formats = get("/events", limit=1)["filters"]["formats"]
    assert formats and "M" in formats
    # Formats prolivesport (copies PTWC, PTVI…) non fiables : ni proposés ni filtrables.
    assert not any(value.startswith("PT") for value in formats)
    assert get("/events", format_epreuve="PTWC", limit=1)["pagination"]["total"] == 0

    by_format = get("/events", format_epreuve="M", type_epreuve="triathlon", limit=30)["items"]
    assert by_format
    for item in by_format:
        race = client.get(f"/races/{item['id']}").json()
        assert race["format_epreuve"] == "M"
        assert race["type_epreuve"] == "triathlon"


def test_events_formats_short_to_long() -> None:
    formats = get("/events", limit=1)["filters"]["formats"]
    known = [value for value in ("XS", "S", "M", "L", "XL", "XXL") if value in formats]
    assert formats[: len(known)] == known


def test_events_reject_invalid_year() -> None:
    assert client.get("/events", params={"year": "abc"}).status_code == 422


def test_events_pagination_is_stable() -> None:
    full = get("/events", limit=40)["items"]
    first = get("/events", limit=20, offset=0)["items"]
    second = get("/events", limit=20, offset=20)["items"]
    assert [item["id"] for item in first + second] == [item["id"] for item in full]


def test_athletes_list_one_entry_per_athlete() -> None:
    data = get("/athletes", limit=50)
    ids = [item["id"] for item in data["items"]]
    assert len(ids) == len(set(ids))
    assert data["pagination"]["total"] > len(ids)
    assert all(item["nb_races"] >= 1 for item in data["items"])


def test_athletes_name_filter_matches_search() -> None:
    listed = get("/athletes", q="martin dupont", limit=20)
    searched = get("/search", q="martin dupont", type="athletes", limit=20)["athletes"]
    assert [item["id"] for item in listed["items"]] == [item["id"] for item in searched["items"]]
    assert listed["pagination"]["total"] == searched["total"]


def test_athletes_sexe_filter() -> None:
    women = get("/athletes", s="F", limit=5)["items"]
    for item in women:
        assert client.get(f"/athletes/{item['id']}").json()["sexe"] in ("F", None)
