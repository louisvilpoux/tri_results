"""Monitoring de l'API : suivi des erreurs (Sentry) et journal JSON des requêtes.

Tout est piloté par variables d'environnement, rien n'est envoyé à l'extérieur en local :
- SENTRY_DSN : active Sentry (absent : Sentry désactivé).
- SENTRY_ENVIRONMENT : nom de l'environnement dans Sentry (défaut « production »).
- SENTRY_TRACES_SAMPLE_RATE : part des requêtes mesurées en performance (défaut 0.1).
- LOG_LEVEL : niveau du journal (défaut INFO).

Le journal écrit une ligne JSON par requête sur la sortie standard, que tout hébergeur collecte :
méthode, chemin, route (« /races/{race_id} », pour regrouper les appels), statut et durée.
La chaîne de requête n'est pas journalisée : elle contient les recherches des visiteurs.
"""

import json
import logging
import os
import sys
import time
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

import sentry_sdk
from fastapi import FastAPI, Request, Response

logger = logging.getLogger("api.requests")


class JsonFormatter(logging.Formatter):
    """Formate chaque entrée du journal en une ligne JSON."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, object] = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        entry.update(getattr(record, "fields", {}))
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False)


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.handlers = [handler]
    logger.setLevel((os.getenv("LOG_LEVEL") or "INFO").upper())
    logger.propagate = False


def setup_sentry() -> bool:
    """Active Sentry si SENTRY_DSN est défini ; renvoie True s'il est actif."""
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return False
    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("SENTRY_ENVIRONMENT") or "production",
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE") or "0.1"),
        # Ni adresse IP, ni cookies, ni en-têtes, ni corps de requête des visiteurs dans Sentry.
        data_collection={
            "user_info": False,
            "cookies": False,
            "http_headers": False,
            "http_bodies": [],
        },
    )
    return True


def route_template(request: Request) -> str | None:
    route = request.scope.get("route")
    return getattr(route, "path", None)


async def log_request(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Middleware : journalise chaque requête, y compris celles qui lèvent une exception."""
    start = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        return response
    finally:
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        fields = {
            "method": request.method,
            "path": request.url.path,
            "route": route_template(request),
            "status": status,
            "duration_ms": duration_ms,
        }
        level = logging.ERROR if status >= 500 else logging.INFO
        logger.log(level, "request", extra={"fields": fields})


def setup_request_logging(app: FastAPI) -> None:
    """Journal JSON des requêtes. Sentry, lui, s'active avant la création de l'app (main.py)."""
    setup_logging()
    app.middleware("http")(log_request)
