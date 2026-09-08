"""Integration tests: dashboard routes map ClickHouse helper errors to HTTP."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from fastapi.testclient import TestClient

from app.db.errors import ClickHouseTimeoutError, InvalidSQLError
from app.main import app

client = TestClient(app)


def test_kpis_empty_results_return_200(monkeypatch):
    monkeypatch.setattr("app.db.queries.execute_query", lambda sql: [])
    response = client.get("/api/kpis")
    assert response.status_code == 200
    body = response.json()
    assert body["top_movies"] == []
    assert body["platform_breakdown"] == []
    assert body["mentions_trend"] == []
    assert body["genre_breakdown"] == []
    assert "error" not in body


def test_kpis_timeout_returns_503(monkeypatch):
    def boom(_sql):
        raise ClickHouseTimeoutError("ClickHouse query timed out after 15s")

    monkeypatch.setattr("app.db.queries.execute_query", boom)
    response = client.get("/api/kpis")
    assert response.status_code == 503
    assert "timed out" in response.json()["detail"]


def test_kpis_invalid_sql_returns_400(monkeypatch):
    def boom(_sql):
        raise InvalidSQLError("Empty SQL query is not allowed.")

    monkeypatch.setattr("app.db.queries.execute_query", boom)
    response = client.get("/api/kpis")
    assert response.status_code == 400
    assert "Empty" in response.json()["detail"]


def test_metrics_summary_empty_rows_return_zeros(monkeypatch):
    monkeypatch.setattr("app.db.queries.execute_query", lambda sql: [])
    response = client.get("/api/metrics/summary")
    assert response.status_code == 200
    assert response.json() == {
        "total_revenue": 0.0,
        "total_titles": 0,
        "total_mentions": 0,
        "average_sentiment": None,
    }


def test_metrics_summary_timeout_returns_503(monkeypatch):
    def boom(_sql):
        raise ClickHouseTimeoutError("ClickHouse query timed out after 15s")

    monkeypatch.setattr("app.db.queries.execute_query", boom)
    response = client.get("/api/metrics/summary")
    assert response.status_code == 503
    assert "timed out" in response.json()["detail"]
