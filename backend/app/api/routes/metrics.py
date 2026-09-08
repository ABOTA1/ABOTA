"""Dashboard metrics endpoints."""
from typing import Any, Dict

from fastapi import APIRouter

from app.api.http_errors import dashboard_http_exception
from app.services.analytics_service import get_metrics_summary

router = APIRouter()


@router.get("/metrics/summary")
async def metrics_summary() -> Dict[str, Any]:
    """Return aggregate metrics for the dashboard without invoking the agent."""
    try:
        return get_metrics_summary()
    except Exception as exc:
        raise dashboard_http_exception(exc) from exc