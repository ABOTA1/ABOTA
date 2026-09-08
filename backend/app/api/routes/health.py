"""
app/api/routes/health.py – Liveness & readiness probes.
"""
import shutil

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    mcp_clickhouse: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Basic liveness probe – returns 200 if the process is alive."""
    mcp = "installed" if shutil.which("mcp-clickhouse") else "missing"
    return HealthResponse(status="ok", version="0.1.0", mcp_clickhouse=mcp)
