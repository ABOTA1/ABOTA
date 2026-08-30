"""
app/api/routes/chat.py – Conversational agent endpoint.
POST /api/chat  →  ChatResponse
GET  /api/kpis  →  KPI snapshot
"""
import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import ChatRequest, ChatResponse
from app.services.analytics_service import handle_chat, get_kpi_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Send a natural-language question to the Gemini agent."""
    try:
        return await handle_chat(request.question)
    except Exception as exc:
        logger.exception("Unhandled error in /api/chat: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/kpis")
async def kpis():
    """Return a pre-computed KPI snapshot."""
    return get_kpi_snapshot()
