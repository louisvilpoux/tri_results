"""Tests de /athletes/{athlete_id} (profil) et /athletes/{athlete_id}/results (historique).

Comme test_race_results.py, ils s'exécutent contre la base PostgreSQL locale et vérifient
des propriétés plutôt que des valeurs précises. Lancement : `cd api && pytest`.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import app, engine, search_words
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
            and is_valid_time(item["total_time"])
            and is_ranked(item["clt"])
            and not item["temps_suspect"]
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


@pytest.fixture(scope="module")
def team_only_athlete_id() -> int:
    """« Athlète » qui n'a que des résultats d'équipe (bike&run, relais)."""
    return find_athlete(
        """
        SELECT x.athlete_id
        FROM results x
        WHERE x.equipe
          AND NOT EXISTS (
            SELECT 1 FROM results y WHERE y.athlete_id = x.athlete_id AND NOT y.equipe
          )
        ORDER BY x.athlete_id
        LIMIT 1
        """
    )


def test_team_has_no_athlete_profile(team_only_athlete_id: int) -> None:
    """Une équipe n'est pas un athlète : pas de profil ni d'historique."""
    assert client.get(f"/athletes/{team_only_athlete_id}").status_code == 404
    assert get_history(team_only_athlete_id)["pagination"]["total"] == 0


def test_team_results_are_flagged(team_only_athlete_id: int) -> None:
    with engine.connect() as connection:
        race_id = connection.execute(
            text("SELECT epreuve_id FROM results WHERE athlete_id = :id AND equipe LIMIT 1"),
            {"id": team_only_athlete_id},
        ).scalar()
    items = client.get(f"/races/{race_id}/results", params={"limit": 100}).json()["items"]
    teams = [item for item in items if item["equipe"]]
    assert teams
    # « prénom  nom » de prolivesport remis en forme (« A & B », nom d'équipe…).
    assert all("  " not in item["nom_athlete"] for item in teams)


def test_chronoweb_relay_rows_are_teams() -> None:
    """Chez chronoweb, chaque ligne d'un relais ou d'un bike&run est une équipe, affichée
    « A & B (club) » ou sous son nom d'équipe (transform/disciplines.sql)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE NOT equipe) AS individuels,
                        COUNT(*) FILTER (WHERE nom_athlete ~ '/|\\s{2}') AS mal_formes,
                        COUNT(*) AS total
                    FROM results
                    WHERE source = 'chronoweb'
                      AND (type_epreuve = 'bike&run' OR format_epreuve = 'RELAIS')
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row.total == 0:
        pytest.skip("Aucun relais chronoweb dans la base")
    assert row.individuels == 0
    assert row.mal_formes == 0


@pytest.fixture(scope="module")
def sub_ranking() -> tuple[int, int, int]:
    """(athlète, sous-classement, épreuve qui l'inclut) : ex. « Championnat de France Fftri »
    publié à côté de sa course hôte (transform/sous_classements.sql)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT x.athlete_id, s.epreuve_id, s.incluse_dans_id
                    FROM sous_classements s
                    JOIN results x ON x.epreuve_id = s.epreuve_id AND x.sous_classement
                    ORDER BY s.epreuve_id, x.athlete_id
                    LIMIT 1
                    """
                )
            ).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucun sous-classement dans la base")
    return int(row.athlete_id), int(row.epreuve_id), int(row.incluse_dans_id)


def test_sub_ranking_is_not_counted_twice(sub_ranking: tuple[int, int, int]) -> None:
    """Un athlète classé dans une épreuve et dans son sous-classement du même jour n'a qu'un
    résultat sur son profil : celui de la grande épreuve."""
    athlete_id, sub_id, parent_id = sub_ranking
    history = client.get(
        f"/athletes/{athlete_id}/results", params={"limit": 100}
    ).json()["items"]
    race_ids = {item["epreuve_id"] for item in history}
    assert parent_id in race_ids
    assert sub_id not in race_ids


def test_sub_ranking_stays_visible(sub_ranking: tuple[int, int, int]) -> None:
    """Le sous-classement reste consultable sur sa page, signalé comme tel."""
    _, sub_id, _ = sub_ranking
    event = client.get(f"/races/{sub_id}/event").json()
    race_format = next(f for f in event["formats"] if f["id"] == sub_id)
    assert race_format["sous_classement"] is True
    results = client.get(f"/races/{sub_id}/results").json()
    assert results["pagination"]["total"] > 0


def test_names_and_clubs_are_not_double_encoded() -> None:
    """Les noms et clubs relus en Windows-1252 (« ThÃ©o », « FranÃ§ois ») sont corrigés
    (corrige_encodage dans transform/raw_data.sql)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        (SELECT COUNT(*) FROM results
                         WHERE nom_athlete ~ 'Ã[\u0080-¿]|â€') AS noms,
                        (SELECT COUNT(*) FROM athletes
                         WHERE nom ~ 'Ã[\u0080-¿]|â€' OR club ~ 'Ã[\u0080-¿]|â€')
                            AS athletes
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert row.noms == 0
    assert row.athletes == 0


def test_clubs_are_cleaned() -> None:
    """Clubs nettoyés (nettoie_club dans transform/raw_data.sql) : pas de « ` », pas de valeur
    qui dit seulement « pas de club », pas de licence individuelle (ce n'est pas un club)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE club LIKE '%`%') AS backticks,
                        COUNT(*) FILTER (
                            WHERE upper(unaccent(club)) IN ('NON LICENCIE', 'NL', 'NONE', 'N/A',
                                                            'AUCUN', 'SANS CLUB', '0', '-', '.')
                        ) AS sans_club,
                        COUNT(*) FILTER (
                            WHERE upper(club) ~ '^(LICENCE )?INDIVIDUEL'
                        ) AS individuelles,
                        COUNT(*) FILTER (WHERE club = '') AS vides
                    FROM athletes
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert row.backticks == 0
    assert row.sans_club == 0
    assert row.individuelles == 0
    assert row.vides == 0


def test_athlete_key_ignores_hyphens_apostrophes_and_commas() -> None:
    """« BASSETTO Jean-Marc » et « BASSETTO Jean Marc » ont la même clé, donc un seul profil,
    comme « MEUNIER, Paul » et « MEUNIER Paul » (transform/athletes.sql)."""
    try:
        with engine.connect() as connection:
            keys = connection.execute(
                text("SELECT COUNT(*) FROM athletes WHERE athlete_key ~ '[-‐–—−''‘’,]'")
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert keys == 0


def test_search_splits_hyphenated_words() -> None:
    """Chercher « jean-marc » revient à chercher « jean » et « marc », comme la clé."""
    assert search_words("Jean-Marc d'Almeida") == ["jean", "marc", "d", "almeida"]
    assert search_words("MEUNIER, Paul") == ["meunier", "paul"]


def test_homonyms_in_the_same_race_are_kept() -> None:
    """Deux homonymes d'une même épreuve (temps différents) sont deux résultats et deux athlètes
    (transform/homonymes.sql) ; un athlète n'a jamais deux résultats dans une épreuve."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        (SELECT COUNT(*) FROM (
                            SELECT 1 FROM results WHERE NOT equipe
                            GROUP BY epreuve_id, athlete_id HAVING COUNT(*) > 1
                        ) t) AS doubles,
                        (SELECT COUNT(*) FROM (
                            SELECT 1 FROM results x JOIN athletes a ON a.id = x.athlete_id
                            WHERE NOT x.equipe AND x.total_time IS NOT NULL
                            GROUP BY x.epreuve_id, a.athlete_key HAVING COUNT(*) > 1
                        ) t) AS homonymes
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert row.doubles == 0
    assert row.homonymes > 0


def test_suspect_times_are_flagged_and_not_best_times() -> None:
    """Un total classé de moins de la moitié du temps médian de l'épreuve est marqué suspect
    (Lacanau 2017 L : 609e en 00:00:07) et ne compte pas dans les meilleurs temps du profil
    (transform/temps_totaux.sql)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT athlete_id, epreuve_id
                    FROM results
                    WHERE temps_suspect AND NOT equipe AND NOT sous_classement
                    ORDER BY id
                    LIMIT 1
                    """
                )
            ).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucun temps suspect dans la base")

    history = get_history(row.athlete_id)["items"]
    suspect = next(item for item in history if item["epreuve_id"] == row.epreuve_id)
    assert suspect["temps_suspect"] is True
    best_races = {best["epreuve_id"] for best in get_profile(row.athlete_id)["best_times"]}
    assert row.epreuve_id not in best_races

    race = client.get(f"/races/{row.epreuve_id}").json()
    assert race["temps_suspects"] >= 1


def test_ids_are_stable_ids() -> None:
    """Chaque épreuve et chaque athlète d'un résultat a l'id gardé dans ids_stables, qui ne change
    pas d'une reconstruction à l'autre (transform/ids_stables.sql)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        (SELECT COUNT(DISTINCT x.epreuve_id) FROM results x
                         WHERE NOT EXISTS (
                             SELECT 1 FROM ids_stables s
                             WHERE s.type = 'epreuve' AND s.id = x.epreuve_id
                         )) AS epreuves,
                        (SELECT COUNT(DISTINCT x.athlete_id) FROM results x
                         WHERE NOT EXISTS (
                             SELECT 1 FROM ids_stables s
                             WHERE s.type = 'athlete' AND s.id = x.athlete_id
                         )) AS athletes
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert row.epreuves == 0
    assert row.athletes == 0


def test_old_ids_redirect() -> None:
    """Un id remplacé (athlètes réunis, épreuve en double retirée) mène au nouvel id."""
    assert client.get("/redirections/athletes/0").status_code == 404
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT type, ancien_id, nouvel_id FROM redirections
                    ORDER BY type, ancien_id LIMIT 1
                    """
                )
            ).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row is None:
        pytest.skip("Aucune redirection dans la base")
    kind = "races" if row.type == "epreuve" else "athletes"
    response = client.get(f"/redirections/{kind}/{row.ancien_id}")
    assert response.status_code == 200
    assert response.json() == {"id": row.nouvel_id}
