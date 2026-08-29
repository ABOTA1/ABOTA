"""
app/services/analytics_service.py – Business logic layer.
Sits between the API routes and the agent/DB layers.
"""
import logging
from typing import Any, Dict

from app.agent.gemini_client import run_agent
from app.db.queries import get_top_movies_by_revenue, get_platform_breakdown
from app.models.schemas import AnalyticsResult, ChatResponse, ChartSeries, SeriesPoint

logger = logging.getLogger(__name__)


def handle_chat(question: str) -> ChatResponse:
    """
    Orchestrate agent call and return a structured ChatResponse.
    This is the main entry point called by the /api/chat route.
    """
    logger.info("Handling question: %s", question)
    result = run_agent(question)
    return ChatResponse(
        answer=result["answer"],
        analytics=result.get("analytics"),
        error=result.get("error"),
    )


def get_kpi_snapshot() -> Dict[str, Any]:
    """
    Return a pre-computed KPI snapshot for the dashboard without going through
    the agent. Useful for initial page load performance.
    TODO: Add caching (Redis/in-memory) if this becomes a hot path.
    """
    try:
        top_movies = get_top_movies_by_revenue(limit=5)
        platforms = get_platform_breakdown()
        return {
            "top_movies": top_movies,
            "platform_breakdown": platforms,
        }
    except Exception as exc:
        logger.error("KPI snapshot error: %s", exc)
        return {"error": str(exc)}
