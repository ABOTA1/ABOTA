"""tests/test_mcp_result_format.py – Parse mcp-clickhouse 0.6 column/row envelopes."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from app.agent.gemini_client import _format_mcp_result_to_analytics


def test_columns_rows_envelope_becomes_bar_chart():
    payload = {
        "columns": ["c.content_title", "genre", "total_revenue"],
        "rows": [["Echoes of Eternity", "Fantasy", 149221731.41]],
    }
    import json

    result = _format_mcp_result_to_analytics(
        "run_query",
        {"query": "SELECT 1"},
        json.dumps(payload),
    )
    assert result.chart_type == "bar"
    assert result.raw_rows[0]["content_title"] == "Echoes of Eternity"
    assert result.raw_rows[0]["genre"] == "Fantasy"
    assert result.series[0].name == "total_revenue"
