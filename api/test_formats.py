"""Tests du format normalisé des épreuves (Q13 de l'audit du 25/11/2026).

La fonction SQL epreuve_format (transform/disciplines.sql) est appelée directement : ses
réponses ne dépendent pas des données chargées. Lancement : `cd api && pytest`.
"""

from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import engine


def epreuve_format(race: str, discipline: str, distance: str | None = None) -> str | None:
    try:
        with engine.connect() as connection:
            return connection.execute(
                text("SELECT epreuve_format(:race, :discipline, :distance)"),
                {"race": race, "discipline": discipline, "distance": distance},
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")


@pytest.mark.parametrize(
    ("race", "expected"),
    [
        ("1km500", "JEUNES"),
        ("4500m", "JEUNES"),
        ("Parcours chronométré - 3km", "JEUNES"),
        ("Parcours chronométré - 6km", "XS"),
        ("9km", "XS"),
        ("12km", "S"),
        ("Course du Scapulaire - 12km800", "S"),
        ("Bike and Run 20km", "M"),
        ("Open", None),
    ],
)
def test_bike_and_run_format_from_distance_in_name(race: str, expected: str | None) -> None:
    assert epreuve_format(race, "bike&run") == expected


def test_bike_and_run_format_from_source_distance() -> None:
    # distance publiée par prolivesport : Touquet 15 km, championnats de France de Lille 10 km
    assert epreuve_format("OPEN", "bike&run", "15.0") == "S"
    assert epreuve_format("CHP FRA - MIXTES", "bike&run", "10.0") == "XS"
    # la distance écrite dans le nom l'emporte
    assert epreuve_format("Bike and Run 20km", "bike&run", "12.0") == "M"


@pytest.mark.parametrize("distance", ["0.0", "99.99", "998.0", "999.0"])
def test_placeholder_distances_are_ignored(distance: str) -> None:
    assert epreuve_format("Defi", "bike&run", distance) is None
    assert epreuve_format("Combine - General", "triathlon", distance) is None


@pytest.mark.parametrize(
    ("race", "expected"),
    [
        ("Distance S - 12000m - A partir de Cadets", "S"),
        ("Distance XS - 6000m - A partir de Minimes", "XS"),
        ("Bike & Run Cadets-Juniors-Seniors 12000m", "S"),
        ("Bike & Run Benjamin - Minime 6000m", "JEUNES"),
        ("3000m - Pupilles", "JEUNES"),
        ("Famille", "JEUNES"),
    ],
)
def test_youth_events(race: str, expected: str) -> None:
    assert epreuve_format(race, "bike&run") == expected


def test_bike_and_run_with_only_youth_categories_is_youth() -> None:
    """Un bike & run dont tous les classés sont jeunes (Orléans 2017, « 6km » et « 9km » courus
    par des minimes) est en JEUNES, même si sa distance en ferait un XS."""
    try:
        with engine.connect() as connection:
            rows: list[Any] = connection.execute(
                text(
                    """
                    SELECT r.id, r.format_epreuve
                    FROM races r JOIN results x ON x.epreuve_id = r.id
                    WHERE r.type_epreuve = 'bike&run'
                    GROUP BY r.id, r.format_epreuve
                    HAVING bool_and(coalesce(x.cat, '') ~ '^(MP|PO|PU|BE|MI)[FGMHX]?$')
                    """
                )
            ).all()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if not rows:
        pytest.skip("Aucun bike & run réservé aux jeunes dans la base")
    assert all(row.format_epreuve == "JEUNES" for row in rows)
