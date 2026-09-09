"""tests/test_health.py – Basic health endpoint smoke test."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_is_api_index_not_404():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ABOTA API"
    assert data["health"] == "/api/health"


def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["mcp_clickhouse"] in {"installed", "missing"}
