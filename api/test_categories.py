"""Tests de la catégorie d'âge FFTRI commune aux sources (Q5, D2 et D10 de l'audit du 25/11/2026).

La fonction SQL categorie_fftri (transform/disciplines.sql) est appelée directement : ses
réponses ne dépendent pas des données chargées. Lancement : `cd api && pytest`.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import CATEGORY_ORDER, engine


def categorie_fftri(source: str, cat: str | None) -> str | None:
    try:
        with engine.connect() as connection:
            return connection.execute(
                text("SELECT categorie_fftri(:source, :cat)"), {"source": source, "cat": cat}
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")


@pytest.mark.parametrize(
    ("source", "cat", "expected"),
    [
        # FFTRI, sexe devant
        ("fftri_t2_area", "MS3", "S3"),
        ("fftri_t2_area", "FV1", "V1"),
        ("fftri_t2_area", "MSE", "SE"),
        ("fftri_t2_area", "MJu", "JU"),
        # rang collé et espaces de chronoweb
        ("chronoweb", "1/MJU", "JU"),
        ("chronoweb", "M 40-44", "V1"),
        ("chronoweb", "MV5+", "VE"),
        # tranches d'âge Ironman
        ("fftri_t2_area", "M30-34", "S3"),
        ("fftri_t2_area", "F65-69", "V6"),
        ("fftri_t2_area", "M40", "V1"),
        ("fftri_t2_area", "M18-24", "SE"),
        # prolivesport : masters FFA, catégories larges, tranches sans tiret
        ("prolivesport", "M1", "V1"),
        ("prolivesport", "M0", "S4"),
        ("prolivesport", "MI", "MI"),
        ("prolivesport", "MA", "VE"),
        ("prolivesport", "SE", "SE"),
        ("prolivesport", "4044", "V1"),
        # protiming, sexe à la fin
        ("protiming", "S3M", "S3"),
        ("protiming", "V2F", "V2"),
        ("protiming", "M1M", "V1"),
        ("protiming", "MAH", "VE"),
        ("protiming", "PUH", "PU"),
    ],
)
def test_categories_des_sources(source: str, cat: str, expected: str) -> None:
    assert categorie_fftri(source, cat) == expected


@pytest.mark.parametrize(
    ("source", "cat"),
    [
        ("fftri_t2_area", "MPRO"),
        ("fftri_t2_area", "ELM"),
        ("fftri_t2_area", "MS3/S4"),
        ("fftri_t2_area", "H40"),
        ("chronoweb", "MIXT"),
        ("protiming", "HOM"),
        ("protiming", "FEM"),
        ("prolivesport", "R"),
        ("fftri_t2_area", None),
        ("fftri_t2_area", ""),
    ],
)
def test_categories_inconnues(source: str, cat: str | None) -> None:
    assert categorie_fftri(source, cat) is None


def test_codes_en_base() -> None:
    """Toutes les catégories en base sont des codes connus de l'API (ordre des âges)."""
    try:
        with engine.connect() as connection:
            codes = connection.execute(
                text(
                    "SELECT DISTINCT categorie_fftri FROM results "
                    "WHERE categorie_fftri IS NOT NULL"
                )
            ).scalars().all()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert set(codes) <= set(CATEGORY_ORDER)
