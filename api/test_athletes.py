"""Tests de /athletes/{athlete_id} (profil) et /athletes/{athlete_id}/results (historique).

Comme test_race_results.py, ils s'exécutent contre la base PostgreSQL locale et vérifient
des propriétés plutôt que des valeurs précises. Lancement : `cd api && pytest`.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import app, engine
from test_race_results import is_ranked, is_valid_time

client = TestClient(app)


def find_athlete(sql: str) -> int:
    try:
        with engine.connect() as connection:
            row = connection.execute(text(sql)).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucun athlète adapté dans la base")
    return int(row.athlete_id)


@pytest.fixture(scope="module")
def duplicated_athlete_id() -> int:
    """Athlète dont un résultat est rattaché à plusieurs épreuves (même date, nom, temps)."""
    return find_athlete(
        """
        SELECT athlete_id
        FROM results
        GROUP BY athlete_id, date_epreuve, name_epreuve, total_time
        HAVING COUNT(*) > 1
        ORDER BY athlete_id
        LIMIT 1
        """
    )


@pytest.fixture(scope="module")
def active_athlete_id() -> int:
    """Athlète avec plusieurs disciplines et plusieurs saisons."""
    return find_athlete(
        """
        SELECT athlete_id
        FROM results
        GROUP BY athlete_id
        HAVING COUNT(DISTINCT type_epreuve) > 1 AND COUNT(DISTINCT year_epreuve) > 2
           AND COUNT(*) BETWEEN 20 AND 60
        ORDER BY athlete_id
        LIMIT 1
        """
    )


def get_history(athlete_id: int, **params: Any) -> dict[str, Any]:
    response = client.get(f"/athletes/{athlete_id}/results", params={"limit": 100, **params})
    assert response.status_code == 200, response.text
    return response.json()


def get_profile(athlete_id: int) -> dict[str, Any]:
    response = client.get(f"/athletes/{athlete_id}")
    assert response.status_code == 200, response.text
    return response.json()


def test_unknown_athlete_returns_404() -> None:
    assert client.get("/athletes/0").status_code == 404


def test_history_is_deduplicated(duplicated_athlete_id: int) -> None:
    items = get_history(duplicated_athlete_id)["items"]
    keys = [(i["date_epreuve"], i["name_epreuve"], i["total_time"]) for i in items]
    assert len(keys) == len(set(keys))


def test_profile_counts_match_history(active_athlete_id: int) -> None:
    profile = get_profile(active_athlete_id)
    history = get_history(active_athlete_id)
    ranks = [item["clt"] for item in history["items"] if is_ranked(item["clt"])]

    assert profile["nb_races"] == history["pagination"]["total"]
    assert profile["nb_podiums"] == sum(1 for rank in ranks if rank <= 3)
    assert profile["nb_top10"] == sum(1 for rank in ranks if rank <= 10)
    assert profile["best_rank"] == min(ranks, default=None)
    assert sum(d["count"] for d in profile["disciplines"]) == profile["nb_races"]
    assert profile["seasons"] == sorted(profile["seasons"], reverse=True)
    assert profile["sexe"] in ("M", "F", None)
    assert "  " not in (profile["nom"] or "")


def test_best_times_are_the_minimum_per_format(active_athlete_id: int) -> None:
    history = get_history(active_athlete_id)["items"]
    for best in get_profile(active_athlete_id)["best_times"]:
        times = [
            item["total_time"]
            for item in history
            if item["type_epreuve"] == best["type_epreuve"]
            and item["format_epreuve"] == best["format_epreuve"]
            and item["source"] != "prolivesport"
            and is_valid_time(item["total_time"])
        ]
        assert best["total_time"] == min(times)


def test_history_default_sort_is_most_recent_first(active_athlete_id: int) -> None:
    dates = [item["date_epreuve"] for item in get_history(active_athlete_id)["items"]]
    assert dates == sorted(dates, reverse=True)


def test_history_filters(active_athlete_id: int) -> None:
    profile = get_profile(active_athlete_id)
    season = profile["seasons"][0]
    discipline = profile["disciplines"][0]["type_epreuve"]

    by_year = get_history(active_athlete_id, year_epreuve=season)["items"]
    assert by_year and all(item["year_epreuve"] == season for item in by_year)

    by_type = get_history(active_athlete_id, type_epreuve=discipline)
    assert by_type["pagination"]["total"] == profile["disciplines"][0]["count"]
    assert all(item["type_epreuve"] == discipline for item in by_type["items"])


def test_history_includes_participants(active_athlete_id: int) -> None:
    for item in get_history(active_athlete_id)["items"]:
        assert item["participants"] >= 1
        if is_ranked(item["clt"]):
            assert item["clt"] <= item["participants"]


def test_history_rank_sort_puts_unranked_last(active_athlete_id: int) -> None:
    items = get_history(active_athlete_id, sort_by="clt", order="asc")["items"]
    ranks = [item["clt"] for item in items]
    filled = [rank for rank in ranks if is_ranked(rank)]
    assert ranks[: len(filled)] == sorted(filled)
