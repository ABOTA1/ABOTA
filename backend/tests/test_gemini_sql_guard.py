"""Agent MCP path must allow WITH CTEs (ROI / genre vs budget) and still block DML."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from app.agent.gemini_client import _validate_sql_query


def test_plain_select_is_allowed():
    assert _validate_sql_query("SELECT 1") is None


def test_with_cte_is_allowed():
    sql = """
    WITH genre_rev AS (
      SELECT c.genre AS genre, SUM(b.daily_revenue) AS revenue, AVG(c.budget_usd) AS budget
      FROM box_office_metrics AS b
      INNER JOIN content_catalog AS c ON c.content_id = b.content_id
      GROUP BY c.genre
    )
    SELECT genre, revenue / budget AS roi
    FROM genre_rev
    ORDER BY roi DESC
    LIMIT 10
    """
    assert _validate_sql_query(sql) is None


def test_drop_is_blocked():
    err = _validate_sql_query("DROP TABLE box_office_metrics")
    assert err is not None
    assert "Security check failed" in err


def test_file_table_function_is_blocked():
    err = _validate_sql_query("SELECT * FROM file('secrets.csv')")
    assert err is not None
    assert "file" in err.lower()
