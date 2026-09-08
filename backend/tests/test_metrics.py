import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from fastapi.testclient import TestClient

from app.main import app
from app.api.routes import metrics


client = TestClient(app)


def test_metrics_summary_returns_aggregate_metrics(monkeypatch):
    monkeypatch.setattr(
        metrics,
        "get_metrics_summary",
        lambda: {
            "total_revenue": 1250.5,
            "total_titles": 3,
            "total_mentions": 8,
            "average_sentiment": 0.25,
        },
    )

    response = client.get("/api/metrics/summary")

    assert response.status_code == 200
    assert response.json() == {
        "total_revenue": 1250.5,
        "total_titles": 3,
        "total_mentions": 8,
        "average_sentiment": 0.25,
    }


def test_metrics_summary_is_available_without_api_prefix(monkeypatch):
    monkeypatch.setattr(metrics, "get_metrics_summary", lambda: {"total_titles": 0})

    response = client.get("/metrics/summary")

    assert response.status_code == 200
    assert response.json() == {"total_titles": 0}