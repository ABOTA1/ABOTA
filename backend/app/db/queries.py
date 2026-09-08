"""
app/db/queries.py – Reusable parametrised query helpers.
These are *examples* that the analytics service and agent can call directly
without going through the LLM, useful for known KPI computations.
"""
from typing import Any, Dict, List

from app.db.clickhouse_client import execute_query


def get_top_movies_by_revenue(limit: int = 10) -> List[Dict[str, Any]]:
    """Return the top N movies ranked by total box-office revenue, with social mentions and catalog attrs."""
    sql = f"""
        SELECT
            b.content_title AS movie_title,
            b.total_revenue AS total_revenue,
            COALESCE(m.total_mentions, 0) AS total_mentions,
            c.genre AS genre,
            c.country AS country,
            c.budget_usd AS budget_usd
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
        LEFT JOIN content_catalog AS c ON b.content_id = c.content_id
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


def get_genre_breakdown() -> List[Dict[str, Any]]:
    """Aggregate box-office revenue by genre via content_catalog."""
    sql = """
        SELECT
            c.genre AS genre,
            countDistinct(b.content_id) AS titles,
            SUM(b.daily_revenue) AS total_revenue
        FROM box_office_metrics AS b
        INNER JOIN content_catalog AS c ON b.content_id = c.content_id
        GROUP BY c.genre
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


def get_metrics_summary() -> Dict[str, Any]:
    """Return the aggregate metrics used by GET /api/metrics/summary."""
    sql = """
        SELECT
            (SELECT COALESCE(SUM(daily_revenue), 0) FROM box_office_metrics) AS total_revenue,
            (SELECT uniqExact(content_id) FROM box_office_metrics) AS total_titles,
            (SELECT COUNT(*) FROM social_mentions) AS total_mentions,
            (SELECT AVG(sentiment_score) FROM social_mentions) AS average_sentiment
    """
    rows = execute_query(sql)
    if not rows:
        return {
            "total_revenue": 0.0,
            "total_titles": 0,
            "total_mentions": 0,
            "average_sentiment": None,
        }

    summary = rows[0]
    return {
        "total_revenue": float(summary.get("total_revenue") or 0),
        "total_titles": int(summary.get("total_titles") or 0),
        "total_mentions": int(summary.get("total_mentions") or 0),
        "average_sentiment": (
            float(summary["average_sentiment"])
            if summary.get("average_sentiment") is not None
            else None
        ),
    }
