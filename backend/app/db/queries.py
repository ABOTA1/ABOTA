"""
app/db/queries.py – Reusable parametrised query helpers.
These are *examples* that the analytics service and agent can call directly
without going through the LLM, useful for known KPI computations.
"""
from typing import Any, Dict, List

from app.db.clickhouse_client import execute_query


# TODO: Replace these example queries with your real business metrics.


def get_top_movies_by_revenue(limit: int = 10) -> List[Dict[str, Any]]:
    """Return the top N movies ranked by total box-office revenue."""
    sql = f"""
        SELECT
            movie_title,
            SUM(daily_revenue) AS total_revenue
        FROM box_office_metrics
        GROUP BY movie_title
        ORDER BY total_revenue DESC
        LIMIT {limit}
    """
    return execute_query(sql)


def get_daily_revenue_trend(movie_title: str) -> List[Dict[str, Any]]:
    """Return day-by-day revenue for a specific movie title."""
    # Parameterisation via string formatting is safe here because
    # execute_query still runs the forbidden-keyword guard.
    safe_title = movie_title.replace("'", "''")  # basic escaping
    sql = f"""
        SELECT
            toDate(event_date)  AS date,
            SUM(daily_revenue)  AS revenue,
            SUM(social_mentions) AS mentions
        FROM box_office_metrics
        WHERE movie_title = '{safe_title}'
        GROUP BY date
        ORDER BY date ASC
    """
    return execute_query(sql)


def get_platform_breakdown() -> List[Dict[str, Any]]:
    """Aggregate metrics by streaming platform."""
    sql = """
        SELECT
            platform,
            COUNT(DISTINCT movie_title) AS titles,
            SUM(daily_revenue)          AS total_revenue,
            SUM(social_mentions)        AS total_mentions
        FROM box_office_metrics
        GROUP BY platform
        ORDER BY total_revenue DESC
    """
    return execute_query(sql)
