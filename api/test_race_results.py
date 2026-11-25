"""Tests de l'endpoint /races/{race_id}/results et /races/{race_id}/categories.

Ils s'exécutent contre la base PostgreSQL locale (DATABASE_URL) et vérifient des
propriétés (ordre, filtres) plutôt que des valeurs précises, pour ne pas dépendre
du contenu exact des données. Lancement : `cd api && pytest`.
"""

import re
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from main import CATEGORY_ORDER, app, category_sort_key, engine

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
                    WHERE categorie_fftri IS NOT NULL AND swim_time ~ :pattern
                    GROUP BY epreuve_id
                    HAVING COUNT(DISTINCT categorie_fftri) > 1 AND COUNT(*) BETWEEN 20 AND 100
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
    assert categories == sorted(categories, key=category_sort_key)
    assert len(categories) > 1
    assert set(categories) <= set(CATEGORY_ORDER)

    data = get_results(race_id, categorie=categories[0])
    assert data["pagination"]["total"] > 0
    assert all(item["categorie_fftri"] == categories[0] for item in data["items"])


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
    # Ordre alphabétique de la collation PostgreSQL (casse et accents ignorés au premier
    # niveau) : on le compare à un tri fait par la base, pas par Python.
    with engine.connect() as connection:
        expected = connection.execute(
            text(
                "SELECT nom_athlete FROM results WHERE epreuve_id = :id "
                "ORDER BY nom_athlete, id LIMIT 50"
            ),
            {"id": race_without_time_id},
        ).scalars().all()
    assert names == expected


def test_race_with_times_is_not_flagged(race_id: int) -> None:
    assert client.get(f"/races/{race_id}").json()["sans_temps"] is False


def test_wrong_totals_are_recalculated_from_segments() -> None:
    """Tribreizh 2022 L : la source donnait au vainqueur 00:01:03 alors que ses segments font
    04:18:04. Le total est recalculé depuis les segments (transform/temps_totaux.sql)."""
    try:
        with engine.connect() as connection:
            winner = connection.execute(
                text(
                    """
                    SELECT total_time,
                           swim_time::interval + t1_time::interval + bike_time::interval
                           + t2_time::interval + run_time::interval AS somme
                    FROM results
                    WHERE name_epreuve = 'Tribreizh' AND year_epreuve = '2022'
                      AND format_epreuve = 'L' AND clt = 1
                    """
                )
            ).first()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if winner is None:
        pytest.skip("Tribreizh 2022 absent de la base")
    assert winner.total_time == "04:18:04"
    assert str(winner.somme) == "4:18:04"


def test_race_without_splits_is_flagged() -> None:
    """Une épreuve dont la source ne publie que le temps total (aucun temps intermédiaire) est
    marquée avec_segments = false : la page n'affiche que la colonne du total."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        (SELECT epreuve_id FROM results GROUP BY epreuve_id
                         HAVING bool_and(coalesce(swim_time, '') || coalesce(t1_time, '')
                                         || coalesce(bike_time, '') || coalesce(t2_time, '')
                                         || coalesce(run_time, '') !~ '\\d{2}:\\d{2}:\\d{2}')
                            AND bool_or(total_time ~ '^\\d{2}:\\d{2}:\\d{2}$')
                         ORDER BY epreuve_id LIMIT 1) AS sans_segments,
                        (SELECT epreuve_id FROM results WHERE bike_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                         ORDER BY epreuve_id LIMIT 1) AS avec_segments
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row.sans_segments is None or row.avec_segments is None:
        pytest.skip("Pas d'épreuve des deux sortes dans la base")
    assert client.get(f"/races/{row.sans_segments}").json()["avec_segments"] is False
    assert client.get(f"/races/{row.avec_segments}").json()["avec_segments"] is True


def test_prolivesport_splits_match_the_total() -> None:
    """Segments prolivesport décalés (T1 de 00:31:45 pour un total de 00:58:36, Moines 2021 S) :
    vidés quand leur somme s'écarte de plus de 5 % du total
    (transform/segments_prolivesport.sql)."""
    try:
        with engine.connect() as connection:
            incoherents = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM results
                    WHERE source = 'prolivesport'
                      AND total_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                      AND swim_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                      AND t1_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                      AND bike_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                      AND t2_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                      AND run_time ~ '^\\d{2}:\\d{2}:\\d{2}$'
                      AND abs(extract(epoch FROM total_time::interval
                          - (swim_time::interval + t1_time::interval + bike_time::interval
                             + t2_time::interval + run_time::interval)))
                          > 0.05 * extract(epoch FROM total_time::interval)
                    """
                )
            ).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert incoherents == 0


def test_sex_is_m_f_or_empty() -> None:
    """Le sexe est lu dans la catégorie, après le rang que chronoweb colle devant (« 14/MV3 » →
    M) : jamais un chiffre ni une autre lettre (sexe_categorie, transform/raw_data.sql)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE sexe NOT IN ('M', 'F')) AS autres,
                        COUNT(*) FILTER (WHERE source = 'chronoweb' AND sexe IN ('M', 'F'))
                            AS chronoweb_m_f,
                        COUNT(*) FILTER (WHERE source = 'chronoweb') AS chronoweb
                    FROM results
                    WHERE NOT equipe
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert row.autres == 0
    if row.chronoweb:
        assert row.chronoweb_m_f >= 0.9 * row.chronoweb


def test_fftri_races_have_a_place() -> None:
    """Le lieu des épreuves fftri_t2_area est lu dans l'en-tête de leur page (« Sizun
    (29450) », sources/fftri_t2_area_lieux.py) : avant, aucune n'avait de lieu."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT COUNT(*) FILTER (WHERE r.lieu_epreuve IS NOT NULL) AS avec_lieu,
                           COUNT(*) AS total
                    FROM races r
                    WHERE EXISTS (
                        SELECT 1 FROM results x
                        WHERE x.epreuve_id = r.id AND x.source = 'fftri_t2_area'
                    )
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if row.total == 0:
        pytest.skip("Aucune épreuve fftri_t2_area dans la base")
    assert row.avec_lieu >= 0.9 * row.total


def test_places_have_one_format() -> None:
    """Lieux au format « Ville (code postal) » ou « Ville », quelle que soit la source
    (lieu_lisible, transform/raw_data.sql) : plus de « nan » ni de « 62610 ARDRES 62 -
    Pas-de-Calais France » (prolivesport)."""
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE lieu_epreuve ~* '(^|\\s)nan(\\s|$)') AS nan,
                        COUNT(*) FILTER (WHERE lieu_epreuve ~ '^\\d{5} | - ') AS prolivesport
                    FROM races
                    """
                )
            ).one()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    assert row.nan == 0
    assert row.prolivesport == 0


def race_with(sql: str) -> int:
    try:
        with engine.connect() as connection:
            race_id = connection.execute(text(sql)).scalar()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    if race_id is None:
        pytest.skip("Aucune épreuve adaptée dans la base")
    return int(race_id)


def test_race_stats_are_ordered_and_consistent() -> None:
    """Repères d'une épreuve (GET /races/{id}/stats) : vainqueur ≤ podium ≤ top 10 % ≤ top 25 %
    ≤ médiane ≤ dernier, pour le total et chaque segment, tous les classés et par sexe ; le
    total compte les classés avec un temps valide et non suspect, hommes et femmes compris ;
    l'histogramme répartit tous ces classés."""
    race_id = race_with(
        """
        SELECT epreuve_id FROM results
        WHERE swim_time ~ '^\\d{2}:' AND bike_time ~ '^\\d{2}:' AND run_time ~ '^\\d{2}:'
          AND type_epreuve = 'triathlon'
        GROUP BY epreuve_id HAVING COUNT(*) BETWEEN 100 AND 400
        ORDER BY epreuve_id LIMIT 1
        """
    )
    stats = client.get(f"/races/{race_id}/stats").json()
    keys = [segment["key"] for segment in stats["segments"]]
    assert keys == ["total", "swim", "bike", "run"]

    variants = [stats["segments"], stats["par_sexe"]["M"], stats["par_sexe"]["F"]]
    for segment in (segment for variant in variants for segment in variant):
        # un top 10 % ou 25 % qui tomberait dans le podium n'est pas donné (None)
        names = ("vainqueur", "podium", "top10", "top25", "mediane", "dernier")
        ordered = [segment[name] for name in names if segment[name] is not None]
        assert all(is_valid_time(value) for value in ordered)
        assert ordered == sorted(ordered)
        if segment["classes"] > 30:
            assert segment["top10"] is not None
        if segment["classes"] >= 20:
            bars = segment["histogramme"]["barres"]
            assert sum(bar["count"] for bar in bars) == segment["classes"]
        else:
            assert segment["histogramme"] is None
        for category in segment["categories"]:
            assert (category["troisieme"] is None) == (category["classes"] < 3)
            assert category["categorie"] in CATEGORY_ORDER
            assert category["sexe"] in ("M", "F", None)

    with engine.connect() as connection:
        expected = connection.execute(
            text(
                """
                SELECT COUNT(*) FROM results
                WHERE epreuve_id = :id AND clt > 0 AND clt < 99990 AND NOT temps_suspect
                  AND total_time ~ '^\\d{2}:\\d{2}:\\d{2}$' AND total_time <> '00:00:00'
                """
            ),
            {"id": race_id},
        ).scalar()
    assert stats["segments"][0]["classes"] == expected
    by_sex = sum(stats["par_sexe"][sexe][0]["classes"] for sexe in "MF" if stats["par_sexe"][sexe])
    assert by_sex <= expected


def test_race_stats_small_and_timeless_races() -> None:
    """Sous 13 classés : ni top 10 % ni top 25 % (ils tomberaient dans le podium) ; sous 20 :
    pas d'histogramme ; épreuve sans temps (liste de participants) : aucun repère."""
    small_id = race_with(
        """
        SELECT epreuve_id FROM results
        WHERE clt > 0 AND clt < 99990 AND total_time ~ '^\\d{2}:' AND NOT temps_suspect
        GROUP BY epreuve_id HAVING COUNT(*) BETWEEN 3 AND 9
        ORDER BY epreuve_id LIMIT 1
        """
    )
    total = client.get(f"/races/{small_id}/stats").json()["segments"][0]
    assert total["top10"] is None and total["top25"] is None and total["histogramme"] is None
    assert total["podium"] is not None

    timeless_id = race_with(
        """
        SELECT epreuve_id FROM results GROUP BY epreuve_id
        HAVING NOT coalesce(bool_or(total_time IS NOT NULL), false)
           AND NOT coalesce(bool_or(clt > 0 AND clt < 99990), false)
        ORDER BY epreuve_id LIMIT 1
        """
    )
    assert client.get(f"/races/{timeless_id}/stats").json()["segments"] == []
    assert client.get("/races/0/stats").status_code == 404


def test_race_trends() -> None:
    """Tendances d'une course (GET /races/{id}/trends) : une série par discipline et format avec
    au moins deux éditions, une épreuve par année (années croissantes), ni Jeunes ni Relais ;
    médiane et top 10 % égaux aux repères de l'épreuve retenue."""
    race_id = race_with(
        """
        SELECT MIN(id) FROM races
        WHERE name_epreuve = (
            SELECT name_epreuve FROM races
            WHERE format_epreuve = 'L' AND type_epreuve = 'triathlon'
            GROUP BY name_epreuve HAVING COUNT(DISTINCT year_epreuve) >= 5
            ORDER BY name_epreuve LIMIT 1
        )
        """
    )
    trends = client.get(f"/races/{race_id}/trends").json()
    assert trends["series"]
    for series in trends["series"]:
        assert series["format_epreuve"] not in ("JEUNES", "RELAIS")
        years = [edition["year"] for edition in series["editions"]]
        assert len(years) >= 2 and years == sorted(set(years))
        edition = series["editions"][-1]
        total = client.get(f"/races/{edition['race_id']}/stats").json()["segments"][0]
        assert edition["tous"]["mediane"] == total["mediane"]
        assert edition["tous"]["top10"] == total["top10"]
        assert edition["tous"]["classes"] <= edition["tous"]["participants"]
        assert set(edition["tous"]["segments"]) <= {s["key"] for s in series["segments"]}
    assert client.get("/races/0/trends").status_code == 404


def test_race_times_for_simulator() -> None:
    """Temps des classés pour le simulateur « Et moi ? » (GET /races/{id}/times) : mêmes classés
    que les repères, temps en secondes cohérents avec le classement ; une place calculée comme
    le simulateur (1 + classés plus rapides) correspond au classement."""
    race_id = race_with(
        """
        SELECT epreuve_id FROM results
        WHERE swim_time ~ '^\\d{2}:' AND bike_time ~ '^\\d{2}:' AND run_time ~ '^\\d{2}:'
          AND t1_time ~ '^\\d{2}:' AND t2_time ~ '^\\d{2}:'
          AND type_epreuve = 'triathlon'
        GROUP BY epreuve_id HAVING COUNT(*) BETWEEN 100 AND 400
        ORDER BY epreuve_id LIMIT 1
        """
    )
    times = client.get(f"/races/{race_id}/times").json()
    assert [segment["key"] for segment in times["segments"]] == ["swim", "bike", "run"]
    assert [transition["key"] for transition in times["transitions"]] == ["t1", "t2"]

    stats = client.get(f"/races/{race_id}/stats").json()["segments"]
    totals = sorted(a["total"] for a in times["athletes"] if a["total"] is not None)
    assert len(totals) == stats[0]["classes"]
    assert totals[0] == timedelta_seconds(stats[0]["vainqueur"])

    for athlete in times["athletes"]:
        assert athlete["sexe"] in ("M", "F", None)
        assert athlete["categorie"] is None or athlete["categorie"] in CATEGORY_ORDER
        if athlete["total"] is not None:
            place = 1 + sum(1 for total in totals if total < athlete["total"])
            assert place <= athlete["clt"] + 5  # ex aequo et classement de la source
    assert client.get("/races/0/times").status_code == 404


def timedelta_seconds(value: str) -> int:
    hours, minutes, seconds = (int(part) for part in value.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def test_temps_non_fiables() -> None:
    """Une épreuve dont tous les totaux sont suspects (temps de tour prolivesport) est signalée
    par temps_non_fiables ; une épreuve avec quelques temps suspects ne l'est pas."""
    try:
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    """
                    SELECT epreuve_id, bool_and(temps_suspect) AS tous
                    FROM results
                    WHERE total_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' AND total_time <> '00:00:00'
                    GROUP BY epreuve_id
                    HAVING bool_or(temps_suspect)
                    """
                )
            ).all()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")
    toutes = next((row.epreuve_id for row in rows if row.tous), None)
    quelques = next((row.epreuve_id for row in rows if not row.tous), None)
    if toutes is None or quelques is None:
        pytest.skip("Pas d'épreuve des deux cas dans la base")

    assert client.get(f"/races/{toutes}").json()["temps_non_fiables"] is True
    race = client.get(f"/races/{quelques}").json()
    assert race["temps_suspects"] >= 1
    assert race["temps_non_fiables"] is False


def query_rows(sql: str, params: dict[str, Any] | None = None) -> list[Any]:
    try:
        with engine.connect() as connection:
            return connection.execute(text(sql), params or {}).all()
    except OperationalError:
        pytest.skip("Base PostgreSQL indisponible")


def test_classes_plus_rapides_que_le_vainqueur_sont_suspects() -> None:
    """Q18 (audit du 25/11/2026) : un classé non suspect n'a jamais un total plus court de plus
    d'une minute que celui de l'unique 1er, sauf dans une épreuve classée sur un autre temps
    (classement_hors_ordre)."""
    rows = query_rows(
        """
        WITH classes AS (
            SELECT epreuve_id, clt, total_time::interval AS total
            FROM results
            WHERE total_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' AND clt > 0 AND clt < 99990
              AND NOT temps_suspect
        ),
        vainqueurs AS (
            SELECT epreuve_id, min(total) AS total FROM classes WHERE clt = 1
            GROUP BY epreuve_id HAVING COUNT(*) = 1
        )
        SELECT DISTINCT c.epreuve_id
        FROM classes c JOIN vainqueurs v USING (epreuve_id)
        WHERE c.total < v.total - interval '1 minute'
        """
    )
    for row in rows:
        assert client.get(f"/races/{row.epreuve_id}").json()["classement_hors_ordre"] is True


def test_classement_hors_ordre() -> None:
    """Une épreuve dont plus de 5 % des classés ont un total plus court que le classé précédent
    est signalée ; une épreuve dont le classement suit les temps ne l'est pas."""
    rows = query_rows(
        """
        SELECT epreuve_id,
               avg((total < precedent - interval '30 seconds')::int) AS part
        FROM (
            SELECT epreuve_id, total_time::interval AS total,
                   lag(total_time::interval) OVER (PARTITION BY epreuve_id ORDER BY clt, id)
                       AS precedent
            FROM results
            WHERE total_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' AND clt > 0 AND clt < 99990
              AND NOT temps_suspect
        ) t
        WHERE precedent IS NOT NULL
        GROUP BY epreuve_id
        HAVING COUNT(*) >= 50
        ORDER BY part DESC
        """
    )
    if not rows or rows[0].part <= 0.05:
        pytest.skip("Pas d'épreuve classée sur un autre temps dans la base")
    assert client.get(f"/races/{rows[0].epreuve_id}").json()["classement_hors_ordre"] is True
    assert client.get(f"/races/{rows[-1].epreuve_id}").json()["classement_hors_ordre"] is False


@pytest.mark.parametrize("format_epreuve", ["L", "XXL"])
def test_classes_plus_rapides_que_des_mieux_classes_sont_suspects(format_epreuve: str) -> None:
    """Openlakes Champagne 2026 L et XXL : un classé dont le total est plus court que celui de mieux
    classés (arrêté avant l'arrivée, classé avec le temps de son dernier passage) est suspect,
    donc absent des Repères et des meilleurs temps : les classés restants suivent les temps."""
    rows = query_rows(
        """
        SELECT x.id, x.epreuve_id, x.clt, x.total_time::interval AS total, x.temps_suspect
        FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.name_epreuve = 'Openlakes Champagne' AND r.year_epreuve = '2026'
          AND r.format_epreuve = :format_epreuve AND x.clt > 0 AND x.clt < 99990
          AND x.total_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$'
        ORDER BY x.clt, x.id
        """,
        {"format_epreuve": format_epreuve},
    )
    if not rows:
        pytest.skip(f"Openlakes Champagne 2026 {format_epreuve} absent de la base")
    valides = [row for row in rows if not row.temps_suspect]
    # après la rupture, aucun classé restant n'est plus court qu'un mieux classé : le classement
    # restant suit les temps (à une minute près)
    for index, row in enumerate(valides):
        plus_long_avant = max((better.total for better in valides[:index]), default=row.total)
        assert row.total >= plus_long_avant - timedelta(minutes=1), row
    stats = client.get(f"/races/{rows[0].epreuve_id}/stats").json()["segments"][0]
    assert stats["classes"] == len(valides)


def test_totaux_trop_longs_entre_deux_classes_sont_suspects() -> None:
    """Q18 : un classé (ni premier ni dernier) dont le total est plus long de plus de 50 % que
    celui de ses deux voisins est suspect (Carnac 2016 M : 11:23:46 entre deux 02:50), sauf dans
    les épreuves classées sur un autre temps ou à plusieurs 1er."""
    rows = query_rows(
        """
        WITH v AS (
            SELECT
                epreuve_id, clt, total_time::interval AS total,
                lag(total_time::interval) OVER w AS precedent,
                lead(total_time::interval) OVER w AS suivant
            FROM results
            WHERE total_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' AND clt > 0 AND clt < 99990
              AND NOT temps_suspect
            WINDOW w AS (PARTITION BY epreuve_id ORDER BY clt, id)
        ),
        exclues AS (
            SELECT epreuve_id
            FROM v
            GROUP BY epreuve_id
            HAVING COUNT(*) FILTER (WHERE total < precedent - interval '30 seconds')
                       > 0.05 * COUNT(*)
                OR COUNT(*) FILTER (WHERE clt = 1) > 1
        )
        SELECT epreuve_id, clt, total, precedent, suivant
        FROM v
        WHERE precedent IS NOT NULL AND suivant IS NOT NULL
          AND total > 1.5 * greatest(precedent, suivant)
          AND epreuve_id NOT IN (SELECT epreuve_id FROM exclues)
        """
    )
    assert rows == []
    carnac = query_rows(
        """
        SELECT x.temps_suspect
        FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.name_epreuve = 'Triathlon de Carnac' AND r.year_epreuve = '2016'
          AND r.format_epreuve = 'M' AND x.total_time = '11:23:46'
        """
    )
    if not carnac:
        pytest.skip("Triathlon de Carnac 2016 M absent de la base")
    assert all(row.temps_suspect for row in carnac)


def test_equipes_de_relais_hors_des_classements_individuels() -> None:
    """Q18 : protiming recopiait les équipes des relais de Cepoy 2026 dans le classement du
    triathlon M (trois « 1er ») ; l'épreuve « Entreprises » de Bordeaux 2026, faite d'équipes,
    était rangée en triathlon S. Cepoy M n'a plus qu'un 1er et aucune équipe ; l'épreuve
    Entreprises est un relais d'équipes."""
    cepoy = query_rows(
        """
        SELECT COUNT(*) FILTER (WHERE x.clt = 1) AS premiers,
               COUNT(*) FILTER (WHERE x.cat ~ '^(RE|DU)') AS relais
        FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.name_epreuve = 'Triathlon de Cepoy' AND r.year_epreuve = '2026'
          AND r.format_epreuve = 'M'
        """
    )
    if not cepoy or cepoy[0].premiers == 0:
        pytest.skip("Triathlon de Cepoy 2026 M absent de la base")
    assert cepoy[0].premiers == 1
    assert cepoy[0].relais == 0

    entreprises = query_rows(
        """
        SELECT r.format_epreuve, bool_and(x.equipe) AS equipes
        FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.name_epreuve = 'Triathlon de Bordeaux' AND r.year_epreuve = '2026'
          AND r.format_initial = 'Format S - Entreprises'
        GROUP BY r.format_epreuve
        """
    )
    if not entreprises:
        pytest.skip("Triathlon de Bordeaux 2026 absent de la base")
    assert [(row.format_epreuve, row.equipes) for row in entreprises] == [("RELAIS", True)]


def test_categorie_filter_keeps_old_source_links(race_id: int) -> None:
    """Un ancien lien filtré sur la catégorie de la source (« MS3 ») donne toujours ses lignes."""
    item = next(
        (i for i in get_results(race_id, limit=100)["items"] if i["categorie"]), None
    )
    if item is None or item["categorie"] in CATEGORY_ORDER:
        pytest.skip("Pas de catégorie de source distincte du code FFTRI")
    data = get_results(race_id, categorie=item["categorie"])
    assert data["pagination"]["total"] > 0
    assert all(row["categorie"] == item["categorie"] for row in data["items"])


def test_segments_with_transitions_longer_than_bike_are_removed() -> None:
    """D12 (retour utilisateur du 25/11/2026) : au Duathlon Lomme 2026 S, les colonnes de la
    source rangent des tours de vélo en T1 et T2 (« T1 00:14:19 », « Vélo 00:09:28 »). Aucune
    épreuve ne garde des segments où la majorité des classés a une transition plus longue que le
    vélo ; ses segments sont retirés, signalés par GET /races/{id}, et la progression le dit."""
    rows = query_rows(
        """
        SELECT epreuve_id
        FROM results
        WHERE clt > 0 AND clt < 99990 AND NOT temps_suspect
          AND bike_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' AND bike_time <> '00:00:00'
          AND t1_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$'
          AND t2_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$'
        GROUP BY epreuve_id
        HAVING AVG((greatest(t1_time::interval, t2_time::interval)
                    > bike_time::interval)::int) > 0.5
        """
    )
    assert rows == []

    lomme = query_rows(
        """
        SELECT r.id, x.athlete_id, x.bike_time, x.t1_time, x.segments_retires
        FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.name_epreuve = 'Duathlon Lomme' AND r.year_epreuve = '2026'
          AND r.format_epreuve = 'S' AND x.clt = 1
        """
    )
    if not lomme:
        pytest.skip("Duathlon Lomme 2026 S absent de la base")
    winner = lomme[0]
    assert winner.bike_time is None and winner.t1_time is None and winner.segments_retires
    race = client.get(f"/races/{winner.id}").json()
    assert race["segments_retires"] is True
    assert race["avec_segments"] is False

    progression = client.get(f"/athletes/{winner.athlete_id}/progression").json()
    courses = [course for series in progression["series"] for course in series["courses"]]
    for course in courses:
        if course["race_id"] == winner.id:
            assert course["segments_retires"] is True
            assert course["segments"] == {}


def test_race_without_removed_segments_is_not_flagged(race_id: int) -> None:
    assert client.get(f"/races/{race_id}").json()["segments_retires"] is False


def test_cross_in_event_name_gives_cross_discipline() -> None:
    """D19 (retour du 25/11/2026) : « Cross-Duathlon Hinges 2019 », épreuves « M » et « XS »,
    était rangé en duathlon. Le nom de l'événement dit cross quand l'épreuve ne cite aucune
    discipline."""
    rows = query_rows(
        "SELECT type_epreuve FROM races WHERE name_epreuve = 'Cross-Duathlon Hinges'"
    )
    if not rows:
        pytest.skip("Cross-Duathlon Hinges absent de la base")
    assert {row.type_epreuve for row in rows} == {"cross duathlon"}


@pytest.mark.parametrize(
    ("nom", "prenom_puis_nom", "expected"),
    [
        ("BELLET Jean francois", False, "BELLET Jean Francois"),
        ("Jean-françois BELLET", False, "BELLET Jean-François"),
        ("Jean francois  BELLET", True, "BELLET Jean Francois"),
        ("JEAN FRANCOIS  BELLET", True, "BELLET Jean Francois"),
        ("WAGNER  Alexis", False, "WAGNER Alexis"),
        ("DE LA FONTAINE Jean-pierre", False, "DE LA FONTAINE Jean-Pierre"),
        ("Raphael Crouzier", False, "Raphael Crouzier"),
        ("CHAGOT DENIS", False, "CHAGOT DENIS"),
    ],
)
def test_nom_affiche(nom: str, prenom_puis_nom: bool, expected: str) -> None:
    """D18 : « NOM Prénom » quelle que soit la source (transform/noms_affiches.sql)."""
    rows = query_rows(
        f"SELECT nom_affiche('{nom.replace(chr(39), chr(39) * 2)}', {prenom_puis_nom}) AS nom"
    )
    assert rows[0].nom == expected


def test_athlete_names_have_no_double_spaces() -> None:
    """D18 : plus d'espace double dans les noms d'athlètes (« Felix  POUILLY » chez
    prolivesport)."""
    rows = query_rows(
        "SELECT COUNT(*) AS n FROM results WHERE NOT equipe AND nom_athlete LIKE '%  %'"
    )
    assert rows[0].n == 0


def test_simulator_skips_unpublished_transitions() -> None:
    """U20 : Sainte Aldegonde 2025 S ne publie pas T1 (« — » pour tous). « Et moi ? » ne le
    demande pas et dit pourquoi."""
    rows = query_rows(
        """
        SELECT id FROM races
        WHERE name_epreuve ILIKE '%aldegonde%' AND year_epreuve = '2025' AND format_epreuve = 'S'
        """
    )
    if not rows:
        pytest.skip("Duathlon de Sainte Aldegonde 2025 S absent de la base")
    times = client.get(f"/races/{rows[0].id}/times").json()
    assert [t["key"] for t in times["transitions"]] == ["t2"]
    assert times["transitions_non_publiees"] == ["T1"]


def test_swim_cancelled_duathlon_is_flagged() -> None:
    """D14 (retour du 25/11/2026) : « Triathlon de Ardres » 2022 M est un duathlon couru à la
    place du triathlon (natation probablement annulée) ; Pontivy, qui propose un duathlon L
    chaque année à côté du triathlon, ne l'est pas. L'API le signale sur l'épreuve, la course,
    l'historique et les meilleurs temps."""
    ardres = query_rows(
        """
        SELECT id FROM races
        WHERE name_epreuve = 'Triathlon de Ardres' AND year_epreuve = '2022'
          AND type_epreuve = 'duathlon' AND format_epreuve = 'M'
        """
    )
    if not ardres:
        pytest.skip("Triathlon de Ardres 2022 absent de la base")
    race_id = ardres[0].id
    assert client.get(f"/races/{race_id}").json()["natation_annulee"] is True
    formats = client.get(f"/races/{race_id}/event").json()["formats"]
    assert any(item["id"] == race_id and item["natation_annulee"] for item in formats)

    athlete = query_rows(
        f"SELECT athlete_id FROM results WHERE epreuve_id = {race_id} AND clt = 1"
    )[0].athlete_id
    history = client.get(f"/athletes/{athlete}/results", params={"limit": 100}).json()["items"]
    assert any(item["epreuve_id"] == race_id and item["natation_annulee"] for item in history)

    pontivy = query_rows(
        """
        SELECT bool_or(natation_annulee) AS flagged FROM races
        WHERE name_epreuve = 'Triathlon de Pontivy'
        """
    )
    assert pontivy[0].flagged is False

    # jamais sur un triathlon, ni sur un duathlon qui a son triathlon la même année
    wrong = query_rows(
        """
        SELECT d.id FROM races d
        WHERE d.natation_annulee
          AND (d.type_epreuve <> 'duathlon' OR EXISTS (
              SELECT 1 FROM races t
              WHERE t.name_epreuve = d.name_epreuve AND t.year_epreuve = d.year_epreuve
                AND t.format_epreuve = d.format_epreuve AND t.type_epreuve = 'triathlon'))
        """
    )
    assert wrong == []


def test_timingzone_individuals_named_after_the_person() -> None:
    """Q22 (audit du 25/11/2026) : épreuves individuelles timingzone publiées avec la mise en page
    des relais (Hyères 2026) : le nom est celui de la personne, le nom d'équipe est son club ;
    aucun athlète ne porte le nom d'un club."""
    rows = query_rows(
        """
        SELECT x.nom_athlete, x.club FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.name_epreuve = 'Triathlon de Hyeres' AND r.year_epreuve = '2026'
          AND r.format_initial = 'SPRINT INDIVIDUELS'
        """
    )
    if not rows:
        pytest.skip("Triathlon de Hyères 2026 absent de la base")
    assert not any(row.nom_athlete == row.club for row in rows)
    assert sum(row.club is not None for row in rows) >= 90
    by_name = {row.nom_athlete: row.club for row in rows}
    assert by_name.get("SAJAT David") == "SAINT RAPHAEL TRIATHLON"


def test_swimrun_duos_are_teams() -> None:
    """Q24 (audit du 25/11/2026) : swimruns chronoweb (courus en duo) et épreuves « Duo »
    prolivesport : chaque ligne est une équipe, aucune ne devient un athlète."""
    rows = query_rows(
        """
        SELECT x.source, count(*) FILTER (WHERE NOT x.equipe) AS individuels, count(*) AS lignes
        FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE (x.source = 'chronoweb' AND r.type_epreuve = 'swimrun')
           OR (x.source = 'prolivesport' AND r.format_initial ~* '\\mduo\\M')
        GROUP BY x.source
        """
    )
    if not rows:
        pytest.skip("Aucun swimrun chronoweb ni épreuve Duo prolivesport")
    assert all(row.individuels == 0 for row in rows)
    douai = query_rows(
        """
        SELECT x.nom_athlete FROM results x JOIN races r ON r.id = x.epreuve_id
        WHERE r.format_initial = 'Swimrun S (Duo)' AND x.nom_athlete = 'RETARDATAIRE'
        """
    )
    assert len(douai) == 1
