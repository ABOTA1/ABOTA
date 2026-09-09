"""
app/main.py – FastAPI entry point.
Starts the app, registers CORS, mounts routers.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes.health import router as health_router
from app.api.routes.chat import router as chat_router
from app.api.routes.metrics import router as metrics_router

settings = get_settings()

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agentic Box-Office & Trend Analytics",
    description="AI agent powered by Gemini + ClickHouse for media analytics.",
    version="0.1.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Browser traffic normally stays same-origin on the Next.js host (which proxies
# /api to FastAPI). CORS still matters if the FastAPI domain is opened directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_origin_regex=r"https://.*\.(up\.railway\.app|vercel\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(chat_router, prefix="/api", tags=["agent"])
app.include_router(metrics_router, prefix="/api", tags=["metrics"])
app.include_router(metrics_router, tags=["metrics"])


@app.get("/")
async def root() -> dict[str, str]:
    """Railway's edge probe hits `/`; this is the API, not the Next.js dashboard."""
    return {
        "service": "ABOTA API",
        "health": "/api/health",
        "docs": "/docs",
        "hint": "The dashboard is the frontend Railway service (Next.js), not this URL.",
    }


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("🚀 ABOTA backend starting – env=%s", settings.app_env)
