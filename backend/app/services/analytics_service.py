"""
app/services/analytics_service.py – Business logic layer.
Sits between the API routes and the agent/DB layers.
"""
import logging
from typing import Any, Dict

from app.agent.gemini_client import run_agent
from app.db.queries import (
    get_genre_breakdown,
    get_mentions_trend,
    get_metrics_summary as query_metrics_summary,
    get_platform_breakdown,
    get_top_movies_by_revenue,
)
from app.models.schemas import AnalyticsResult, ChatResponse, ChartSeries, SeriesPoint

logger = logging.getLogger(__name__)


async def handle_chat(question: str) -> ChatResponse:
    """
    Orchestrate agent call and return a structured ChatResponse.
    This is the main entry point called by the /api/chat route.
    """
    logger.info("Handling question: %s", question)
    result = await run_agent(question)
    return ChatResponse(
        answer=result["answer"],
        analytics=result.get("analytics"),
        error=result.get("error"),
    )


def get_kpi_snapshot() -> Dict[str, Any]:
    """
    Return a pre-computed KPI snapshot for the dashboard without going through
    the agent. Useful for initial page load performance.

    Empty ClickHouse results become empty lists. Timeouts and query failures
    propagate so the route can return HTTP 503.
    """
    return {
        "top_movies": get_top_movies_by_revenue(limit=5),
        "platform_breakdown": get_platform_breakdown(),
        "mentions_trend": get_mentions_trend(),
        "genre_breakdown": get_genre_breakdown(),
    }


def get_metrics_summary() -> Dict[str, Any]:
    """Return aggregate dashboard metrics without going through the agent."""
    return query_metrics_summary()
