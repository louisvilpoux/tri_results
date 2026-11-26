# Image de l'API FastAPI, construite par Coolify (contexte : dossier api/). Voir deploiement.md.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py monitoring.py ./

RUN useradd --create-home api
USER api

EXPOSE 8000

# /health renvoie 503 si PostgreSQL ne répond pas : le conteneur est alors « unhealthy ».
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"

# --proxy-headers : l'API est derrière le proxy de Coolify (Traefik), qui termine le HTTPS.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
