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

settings = get_settings()

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agentic Box-Office & Trend Analytics",
    description="AI agent powered by Gemini + ClickHouse for media analytics.",
    version="0.1.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(chat_router, prefix="/api", tags=["agent"])


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("🚀 ABOTA backend starting – env=%s", settings.app_env)
