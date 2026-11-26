"""Tests du monitoring (monitoring.py) : journal JSON des requêtes et activation de Sentry.

Ils n'ont pas besoin de la base PostgreSQL : « / » (redirection vers /health) n'y accède pas.
Lancement : `cd api && pytest`.
"""

import json
import logging

import pytest
from fastapi.testclient import TestClient

import monitoring
from main import app

client = TestClient(app)


def request_entries(caplog: pytest.LogCaptureFixture) -> list[dict[str, object]]:
    formatter = monitoring.JsonFormatter()
    return [
        json.loads(formatter.format(record))
        for record in caplog.records
        if record.name == "api.requests"
    ]


@pytest.fixture
def captured(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    # Le logger ne propage pas (sortie standard seulement) : on y branche la capture de pytest.
    monitoring.logger.addHandler(caplog.handler)
    caplog.set_level(logging.INFO, logger="api.requests")
    yield caplog
    monitoring.logger.removeHandler(caplog.handler)


def test_une_ligne_json_par_requete(captured: pytest.LogCaptureFixture) -> None:
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 303

    entries = request_entries(captured)
    assert len(entries) == 1
    entry = entries[0]
    assert entry["message"] == "request"
    assert entry["method"] == "GET"
    assert entry["path"] == "/"
    assert entry["route"] == "/"
    assert entry["status"] == 303
    assert isinstance(entry["duration_ms"], float)
    assert entry["level"] == "INFO"


def test_route_regroupe_les_ids_et_ignore_la_chaine_de_requete(
    captured: pytest.LogCaptureFixture,
) -> None:
    client.get("/races/abc/results?nom=dupont")  # id invalide : 422, sans accès à la base

    entry = request_entries(captured)[0]
    assert entry["route"] == "/races/{race_id}/results"
    assert entry["path"] == "/races/abc/results"
    assert "dupont" not in json.dumps(entry)
    assert entry["status"] == 422


def test_chemin_inconnu_sans_route(captured: pytest.LogCaptureFixture) -> None:
    client.get("/inconnu")

    entry = request_entries(captured)[0]
    assert entry["status"] == 404
    assert entry["route"] is None


def test_sentry_inactif_sans_dsn(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    assert monitoring.setup_sentry() is False
