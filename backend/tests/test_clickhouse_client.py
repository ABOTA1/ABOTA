"""tests/test_clickhouse_client.py – Timeouts, invalid SQL, empty rows."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.db.errors import ClickHouseQueryError, ClickHouseTimeoutError, InvalidSQLError
from app.db.clickhouse_client import execute_query, get_clickhouse_client


@pytest.fixture
def mock_client(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr("app.db.clickhouse_client.get_clickhouse_client", lambda: client)
    return client


def test_execute_query_returns_empty_list(mock_client):
    mock_client.query.return_value = SimpleNamespace(column_names=["movie_title"], result_rows=[])
    assert execute_query("SELECT content_title FROM box_office_metrics") == []
    settings = mock_client.query.call_args.kwargs["settings"]
    assert settings["max_execution_time"] == 15


def test_execute_query_maps_rows(mock_client):
    mock_client.query.return_value = SimpleNamespace(
        column_names=["movie_title", "total_revenue"],
        result_rows=[("Neon Dragons", 1000.0)],
    )
    rows = execute_query("SELECT content_title AS movie_title, 1 AS total_revenue")
    assert rows == [{"movie_title": "Neon Dragons", "total_revenue": 1000.0}]


def test_execute_query_maps_timeout(mock_client):
    mock_client.query.side_effect = TimeoutError("read timed out")
    with pytest.raises(ClickHouseTimeoutError, match="timed out after 15s"):
        execute_query("SELECT 1")


def test_execute_query_maps_timeout_from_operational_message(mock_client):
    mock_client.query.side_effect = RuntimeError("HTTPSConnectionPool timeout")
    with pytest.raises(ClickHouseTimeoutError, match="timed out"):
        execute_query("SELECT 1")


def test_execute_query_maps_generic_clickhouse_failure(mock_client):
    mock_client.query.side_effect = RuntimeError("connection refused")
    with pytest.raises(ClickHouseQueryError, match="connection refused"):
        execute_query("SELECT 1")


def test_execute_query_rejects_invalid_sql_before_roundtrip(mock_client):
    with pytest.raises(InvalidSQLError):
        execute_query("DROP TABLE box_office_metrics")
    mock_client.query.assert_not_called()


def test_get_clickhouse_client_uses_15s_timeouts(monkeypatch):
    captured: dict = {}

    def fake_get_client(**kwargs):
        captured.update(kwargs)
        return MagicMock()

    monkeypatch.setattr("app.db.clickhouse_client.clickhouse_connect.get_client", fake_get_client)
    get_clickhouse_client.cache_clear()
    try:
        get_clickhouse_client()
    finally:
        get_clickhouse_client.cache_clear()

    assert captured["connect_timeout"] == 15
    assert captured["send_receive_timeout"] == 15
