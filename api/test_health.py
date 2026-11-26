"""Tests de /health : disponibilité de l'API et de la base PostgreSQL.

Lancement : `cd api && pytest`.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

import main
from main import app, engine

client = TestClient(app)


def database_available() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError:
        return False
    return True


def test_health_ok_quand_la_base_repond() -> None:
    if not database_available():
        pytest.skip("Base PostgreSQL indisponible")
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_503_quand_la_base_ne_repond_pas(monkeypatch: pytest.MonkeyPatch) -> None:
    class UnreachableEngine:
        def connect(self) -> None:
            raise OperationalError("SELECT 1", {}, Exception("connexion refusée"))

    monkeypatch.setattr(main, "engine", UnreachableEngine())
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}
