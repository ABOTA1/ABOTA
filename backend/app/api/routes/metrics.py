"""Dashboard metrics endpoints."""
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.services.analytics_service import get_metrics_summary

router = APIRouter()


@router.get("/metrics/summary")
async def metrics_summary() -> Dict[str, Any]:
    """Return aggregate metrics for the dashboard without invoking the agent."""
    try:
        return get_metrics_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc