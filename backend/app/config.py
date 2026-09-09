"""
app/config.py – Centralised settings via Pydantic-Settings.
"""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Gemini ─────────────────────────────────────────────────────────────────
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    # Preferred model (tried first). When it hits 429 quota, the agent walks
    # GEMINI_MODELS. Keep this on a model that still has free-tier budget.
    gemini_model: str = Field("gemini-3.8-flash", alias="GEMINI_MODEL")
    # Comma-separated fallbacks for generateContent text models with function
    # calling. Skip image/TTS/Live/embedding/Veo IDs — they cannot run this agent.
    gemini_models: str = Field(
        default=(
            "gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite,"
            "gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash,"
            "gemini-3-flash,gemini-3.5-flash,gemini-3.6-flash"
        ),
        alias="GEMINI_MODELS",
    )

    def gemini_model_chain(self) -> List[str]:
        """Unique generateContent models: GEMINI_MODEL first, then GEMINI_MODELS."""
        seen: set[str] = set()
        chain: List[str] = []
        for raw in (self.gemini_model, *self.gemini_models.split(",")):
            name = raw.strip()
            if not name:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            chain.append(name)
        return chain or [self.gemini_model]

    # ── ClickHouse Cloud ───────────────────────────────────────────────────────
    clickhouse_host: str = Field("your-instance.clickhouse.cloud", alias="CLICKHOUSE_HOST")
    clickhouse_port: int = Field(8443, alias="CLICKHOUSE_PORT")
    clickhouse_user: str = Field("default", alias="CLICKHOUSE_USER")
    clickhouse_password: str = Field("", alias="CLICKHOUSE_PASSWORD")
    clickhouse_secure: bool = Field(True, alias="CLICKHOUSE_SECURE")
    clickhouse_verify: bool = Field(True, alias="CLICKHOUSE_VERIFY")
    clickhouse_database: str = Field("abota", alias="CLICKHOUSE_DATABASE")
    clickhouse_query_timeout: int = Field(15, alias="CLICKHOUSE_QUERY_TIMEOUT")

    # ── App ────────────────────────────────────────────────────────────────────
    app_env: str = Field("development", alias="APP_ENV")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        alias="CORS_ORIGINS",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of Settings."""
    return Settings()
