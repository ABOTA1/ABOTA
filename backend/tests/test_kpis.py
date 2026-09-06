"""tests/test_kpis.py – KPI endpoint error handling."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_kpis_returns_503_on_clickhouse_error(monkeypatch):
    def boom():
        raise RuntimeError("ClickHouse error: timeout")

    monkeypatch.setattr("app.api.routes.chat.get_kpi_snapshot", boom)
    response = client.get("/api/kpis")
    assert response.status_code == 503
    assert "timeout" in response.json()["detail"]
