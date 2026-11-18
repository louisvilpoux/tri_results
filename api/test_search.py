"""Tests de /search (recherche d'athlètes et de courses).

Comme les autres tests, ils s'exécutent contre la base PostgreSQL locale et vérifient des
propriétés plutôt que des valeurs précises. Lancement : `cd api && pytest`.
"""

import unicodedata
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import app, engine

client = TestClient(app)


def first_row(sql: str) -> Any:
    try:
        with engine.connect() as connection:
            row = connection.execute(text(sql)).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucune donnée adaptée dans la base")
    return row


def without_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn").lower()


@pytest.fixture(scope="module")
def athlete() -> Any:
    """Athlète au nom en deux mots, avec des résultats."""
    return first_row(
        """
        SELECT a.unified_id, a.athlete_key
        FROM athletes a
        WHERE a.id = a.unified_id AND a.nb_races BETWEEN 5 AND 20
          AND a.athlete_key ~ '^[a-z]{4,} [a-z]{4,}$'
        ORDER BY a.unified_id
        LIMIT 1
        """
    )


@pytest.fixture(scope="module")
def race_name() -> str:
    """Nom de course présent sur plusieurs années, avec des résultats."""
    row = first_row(
        """
        SELECT r.name_epreuve
        FROM races r
        WHERE EXISTS (SELECT 1 FROM results x WHERE x.epreuve_id = r.id)
        GROUP BY r.name_epreuve
        HAVING COUNT(DISTINCT r.year_epreuve) > 2
        ORDER BY r.name_epreuve
        LIMIT 1
        """
    )
    return row.name_epreuve


def search(**params: Any) -> dict[str, Any]:
    response = client.get("/search", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_query_too_short_or_empty_is_rejected() -> None:
    assert client.get("/search", params={"q": "a"}).status_code == 422
    assert client.get("/search", params={"q": "   "}).status_code == 422


def test_athlete_found_whatever_the_word_order(athlete: Any) -> None:
    first, second = athlete.athlete_key.split()
    for q in (f"{first} {second}", f"{second.upper()} {first.capitalize()}"):
        ids = [item["id"] for item in search(q=q, type="athletes", limit=50)["athletes"]["items"]]
        assert athlete.unified_id in ids


def test_athlete_hits_contain_every_word(athlete: Any) -> None:
    word = athlete.athlete_key.split()[0][:4]
    data = search(q=word, type="athletes", limit=20)["athletes"]
    assert data["total"] >= len(data["items"]) > 0
    for item in data["items"]:
        assert word in without_accents(item["nom"])
        assert item["nb_races"] >= 1


def test_athlete_count_matches_profile(athlete: Any) -> None:
    first, second = athlete.athlete_key.split()
    items = search(q=f"{first} {second}", type="athletes", limit=50)["athletes"]["items"]
    hit = next(item for item in items if item["id"] == athlete.unified_id)
    profile = client.get(f"/athletes/{athlete.unified_id}").json()
    assert hit["nb_races"] == profile["nb_races"]


def test_races_are_grouped_by_name_and_year(race_name: str) -> None:
    data = search(q=race_name, type="races", limit=50)["races"]
    same_name = [item for item in data["items"] if item["name_epreuve"] == race_name]
    years = [item["year_epreuve"] for item in same_name]
    assert len(years) > 2 and len(years) == len(set(years))

    for item in same_name[:3]:
        event = client.get(f"/races/{item['id']}/event").json()
        assert event["name_epreuve"] == race_name
        assert event["year_epreuve"] == item["year_epreuve"]


def test_races_most_recent_first(race_name: str) -> None:
    items = search(q=race_name.split()[-1], type="races", limit=50)["races"]["items"]
    dates = [item["date_end"] for item in items if item["date_end"]]
    assert dates == sorted(dates, reverse=True)


def test_like_wildcards_are_literal() -> None:
    data = search(q="%%", type="all")
    assert data["athletes"]["total"] == 0
    assert data["races"]["total"] == 0


def test_type_limits_the_groups(race_name: str) -> None:
    assert set(search(q=race_name, type="races")) >= {"races"}
    assert "athletes" not in search(q=race_name, type="races")
    assert "races" not in search(q=race_name, type="athletes")
