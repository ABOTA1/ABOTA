"""tests/test_chart_queries.py – SQL shape for dashboard chart queries."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from unittest.mock import patch

from app.db.queries import get_mentions_trend, get_top_movies_by_revenue


@patch("app.db.queries.execute_query")
def test_mentions_trend_queries_social_mentions_by_week(mock_exec):
    mock_exec.return_value = [{"label": "2024-01-01", "mentions": 42}]
    rows = get_mentions_trend()
    sql = mock_exec.call_args[0][0]
    assert "social_mentions" in sql
    assert "toStartOfWeek" in sql
    assert rows == [{"label": "2024-01-01", "mentions": 42}]


@patch("app.db.queries.execute_query")
def test_top_movies_include_cross_metric_mentions(mock_exec):
    mock_exec.return_value = [
        {"movie_title": "Neon Dragons", "total_revenue": 1_000_000, "total_mentions": 12}
    ]
    rows = get_top_movies_by_revenue(limit=5)
    sql = mock_exec.call_args[0][0]
    assert "total_mentions" in sql
    assert "social_mentions" in sql
    assert "LIMIT 5" in sql
    assert rows[0]["total_mentions"] == 12
