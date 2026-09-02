"""
app/db/queries.py – Reusable parametrised query helpers.
These are *examples* that the analytics service and agent can call directly
without going through the LLM, useful for known KPI computations.
"""
from typing import Any, Dict, List

from app.db.clickhouse_client import execute_query


# TODO: Replace these example queries with your real business metrics.


def get_top_movies_by_revenue(limit: int = 10) -> List[Dict[str, Any]]:
    """Return the top N movies ranked by total box-office revenue, with social mentions."""
    sql = f"""
        SELECT
            b.content_title AS movie_title,
            b.total_revenue AS total_revenue,
            COALESCE(m.total_mentions, 0) AS total_mentions
        FROM (
            SELECT
                content_title,
                any(content_id) AS content_id,
                SUM(daily_revenue) AS total_revenue
            FROM box_office_metrics
            GROUP BY content_title
        ) AS b
        LEFT JOIN (
            SELECT
                content_id,
                count() AS total_mentions
            FROM social_mentions
            GROUP BY content_id
        ) AS m ON b.content_id = m.content_id
        ORDER BY total_revenue DESC
        LIMIT {int(limit)}
    """
    return execute_query(sql)


def get_daily_revenue_trend(title_or_id: str) -> List[Dict[str, Any]]:
    """Return day-by-day revenue for a specific movie title or content ID."""
    # Parameterisation via string formatting is safe here because
    # execute_query still runs the forbidden-keyword guard.
    safe_param = title_or_id.replace("'", "''")  # basic escaping
    sql = f"""
        SELECT
            toDate(event_date)  AS date,
            SUM(daily_revenue)  AS revenue
        FROM box_office_metrics
        WHERE content_id = '{safe_param}' OR content_title = '{safe_param}'
        GROUP BY date
        ORDER BY date ASC
    """
    return execute_query(sql)


def get_platform_breakdown() -> List[Dict[str, Any]]:
    """Aggregate metrics by distribution platform with cross-table social mentions via content_id."""
    sql = """
        SELECT
            b.platform AS platform,
            b.titles AS titles,
            b.total_revenue AS total_revenue,
            COALESCE(s.total_mentions, 0) AS total_mentions
        FROM (
            SELECT
                platform,
                COUNT(DISTINCT content_id) AS titles,
                SUM(daily_revenue)         AS total_revenue
            FROM box_office_metrics
            GROUP BY platform
        ) AS b
        LEFT JOIN (
            SELECT
                b_sub.platform,
                COUNT(sm.content_id) AS total_mentions
            FROM (
                SELECT DISTINCT platform, content_id FROM box_office_metrics
            ) AS b_sub
            INNER JOIN social_mentions AS sm ON b_sub.content_id = sm.content_id
            GROUP BY b_sub.platform
        ) AS s ON b.platform = s.platform
        ORDER BY total_revenue DESC
    """
    return execute_query(sql)


def get_mentions_trend() -> List[Dict[str, Any]]:
    """Weekly social-mention volume for the dashboard line chart."""
    sql = """
        SELECT
            toString(toStartOfWeek(event_time)) AS label,
            count() AS mentions
        FROM social_mentions
        GROUP BY toStartOfWeek(event_time)
        ORDER BY toStartOfWeek(event_time) ASC
    """
    return execute_query(sql)
