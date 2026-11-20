"""Tests de l'endpoint /races/{race_id}/results et /races/{race_id}/categories.

Ils s'exécutent contre la base PostgreSQL locale (DATABASE_URL) et vérifient des
propriétés (ordre, filtres) plutôt que des valeurs précises, pour ne pas dépendre
du contenu exact des données. Lancement : `cd api && pytest`.
"""

import re
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import app, engine

client = TestClient(app)

TIME_PATTERN = re.compile(r"^[0-9]{2}:[0-9]{2}:[0-9]{2}$")


@pytest.fixture(scope="module")
def race_id() -> int:
    """Épreuve avec plusieurs catégories et des temps de natation, pour tester tri et filtres."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT epreuve_id
                    FROM results
                    WHERE categorie IS NOT NULL AND swim_time ~ :pattern
                    GROUP BY epreuve_id
                    HAVING COUNT(DISTINCT categorie) > 1 AND COUNT(*) BETWEEN 20 AND 100
                    ORDER BY epreuve_id
                    LIMIT 1
                    """
                ),
                {"pattern": TIME_PATTERN.pattern},
            ).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucune épreuve adaptée dans la base")
    return int(row.epreuve_id)


def get_results(race_id: int, **params: Any) -> dict[str, Any]:
    response = client.get(f"/races/{race_id}/results", params={"limit": 100, **params})
    assert response.status_code == 200, response.text
    return response.json()


def is_ranked(rank: int | None) -> bool:
    """clt vide, à 0 ou code de statut ≥ 99990 (prolivesport) = pas de classement."""
    return rank is not None and 0 < rank < 99990


def is_valid_time(value: str | None) -> bool:
    return value is not None and TIME_PATTERN.match(value) is not None and value != "00:00:00"


def test_default_sort_is_rank_ascending_with_empty_ranks_last(race_id: int) -> None:
    items = get_results(race_id)["items"]
    ranks = [item["clt"] for item in items]
    filled = [rank for rank in ranks if is_ranked(rank)]
    assert filled == sorted(filled)
    assert ranks[: len(filled)] == filled


def test_rank_descending_keeps_empty_ranks_last(race_id: int) -> None:
    ranks = [item["clt"] for item in get_results(race_id, sort_by="clt", order="desc")["items"]]
    filled = [rank for rank in ranks if is_ranked(rank)]
    assert filled == sorted(filled, reverse=True)
    assert ranks[: len(filled)] == filled


@pytest.mark.parametrize("order", ["asc", "desc"])
def test_time_sort_ignores_invalid_times(race_id: int, order: str) -> None:
    items = get_results(race_id, sort_by="swim_time", order=order)["items"]
    times = [item["swim_time"] for item in items]
    valid = [t for t in times if is_valid_time(t)]
    assert valid == sorted(valid, reverse=order == "desc")
    assert times[: len(valid)] == valid


def test_unknown_sort_column_is_rejected(race_id: int) -> None:
    response = client.get(f"/races/{race_id}/results", params={"sort_by": "url"})
    assert response.status_code == 422


def test_categories_endpoint_and_filter(race_id: int) -> None:
    response = client.get(f"/races/{race_id}/categories")
    assert response.status_code == 200
    categories = response.json()
    assert categories == sorted(categories)
    assert len(categories) > 1

    data = get_results(race_id, categorie=categories[0])
    assert data["pagination"]["total"] > 0
    assert all(item["categorie"] == categories[0] for item in data["items"])


def test_name_search_is_case_insensitive(race_id: int) -> None:
    name = get_results(race_id)["items"][0]["nom_athlete"].strip()
    fragment = name[:3].lower()
    items = get_results(race_id, q=fragment)["items"]
    assert items
    assert all(fragment in item["nom_athlete"].lower() for item in items)


def test_pagination_is_stable(race_id: int) -> None:
    full = get_results(race_id, sort_by="total_time")["items"]
    first = get_results(race_id, sort_by="total_time", limit=10, offset=0)["items"]
    second = get_results(race_id, sort_by="total_time", limit=10, offset=10)["items"]
    assert [item["id"] for item in first + second] == [item["id"] for item in full[:20]]


def test_chronoweb_times_are_hh_mm_ss() -> None:
    """Les temps chronoweb sont au format hh:mm:ss, comme ceux des autres sources : fractions
    de seconde tronquées, « ? » et dates Excel vidés (transform/raw_data.sql)."""
    try:
        with engine.connect() as connection:
            bad = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM results
                    WHERE source = 'chronoweb'
                      AND (total_time !~ '^\\d{2,3}:\\d{2}:\\d{2}$'
                           OR swim_time !~ '^\\d{2,3}:\\d{2}:\\d{2}$'
                           OR t1_time !~ '^\\d{2,3}:\\d{2}:\\d{2}$'
                           OR bike_time !~ '^\\d{2,3}:\\d{2}:\\d{2}$'
                           OR t2_time !~ '^\\d{2,3}:\\d{2}:\\d{2}$'
                           OR run_time !~ '^\\d{2,3}:\\d{2}:\\d{2}$')
                    """
                )
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert bad == 0


def test_no_zero_times() -> None:
    """Un temps à 00:00:00 n'est pas un temps (non-classés, segments non chronométrés de
    prolivesport) : il est vidé dans transform/results.sql et affiché « — »."""
    try:
        with engine.connect() as connection:
            zero = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM results
                    WHERE '00:00:00' IN (total_time, swim_time, t1_time, bike_time, t2_time,
                                         run_time)
                    """
                )
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert zero == 0


@pytest.fixture(scope="module")
def race_without_time_id() -> int:
    """Épreuve dont la source n'a publié ni temps total ni classement."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT epreuve_id AS id
                    FROM results
                    GROUP BY epreuve_id
                    HAVING COUNT(total_time) = 0
                       AND COUNT(*) FILTER (WHERE clt > 0 AND clt < 99990) = 0
                       AND COUNT(*) > 20
                    ORDER BY epreuve_id
                    LIMIT 1
                    """
                )
            ).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucune épreuve sans temps dans la base")
    return int(row.id)


def test_race_without_time_lists_participants_alphabetically(race_without_time_id: int) -> None:
    """Sans temps ni classement publiés, l'épreuve est marquée sans_temps, n'a pas de podium,
    et ses participants sont listés par ordre alphabétique (pas de classement inventé)."""
    assert client.get(f"/races/{race_without_time_id}").json()["sans_temps"] is True
    event = client.get(f"/races/{race_without_time_id}/event").json()
    race_format = next(f for f in event["formats"] if f["id"] == race_without_time_id)
    assert race_format["sans_temps"] is True
    assert race_format["winner"] is None

    items = client.get(
        f"/races/{race_without_time_id}/results", params={"limit": 50}
    ).json()["items"]
    names = [item["nom_athlete"] for item in items]
    # ordre de la collation PostgreSQL : sans tenir compte de la casse
    assert names == sorted(names, key=str.casefold)


def test_race_with_times_is_not_flagged(race_id: int) -> None:
    assert client.get(f"/races/{race_id}").json()["sans_temps"] is False
