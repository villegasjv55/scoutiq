"""API tests. Run from the repo root:  pip install pytest httpx && pytest backend"""
import pytest
from fastapi.testclient import TestClient

from backend.main import DB_PATH, app

client = TestClient(app)
pytestmark = pytest.mark.skipif(not DB_PATH.exists(), reason="build the database first")


def test_health():
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["player_seasons"] > 0


def test_players_filter_and_sort():
    data = client.get("/players", params={"season": 2024, "position": "Forward", "sort": "goals", "limit": 5}).json()
    assert len(data) == 5
    assert all(r["position"] == "Forward" and r["season"] == 2024 for r in data)
    goals = [r["goals"] for r in data]
    assert goals == sorted(goals, reverse=True)


def test_rejects_bad_input():
    assert client.get("/players", params={"sort": "name; DROP TABLE players"}).status_code == 422
    assert client.get("/players", params={"limit": 5000}).status_code == 422
    assert client.get("/players/999999999").status_code == 404


def test_sql_injection_is_inert():
    r = client.get("/players", params={"search": "'; DROP TABLE players; --"})
    assert r.status_code == 200 and r.json() == []
    assert client.get("/health").json()["players"] > 0
