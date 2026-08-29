"""
app/api/routes/health.py – Liveness & readiness probes.
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Basic liveness probe – returns 200 if the process is alive."""
    return HealthResponse(status="ok", version="0.1.0")
