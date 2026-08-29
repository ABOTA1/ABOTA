"""
app/config.py – Centralised settings via Pydantic-Settings.
All values are read from environment variables or a .env file.
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
    gemini_model: str = Field("gemini-2.0-flash", alias="GEMINI_MODEL")

    # ── ClickHouse ─────────────────────────────────────────────────────────────
    clickhouse_host: str = Field("localhost", alias="CLICKHOUSE_HOST")
    clickhouse_port: int = Field(8123, alias="CLICKHOUSE_PORT")
    clickhouse_user: str = Field("default", alias="CLICKHOUSE_USER")
    clickhouse_password: str = Field("", alias="CLICKHOUSE_PASSWORD")
    clickhouse_database: str = Field("abota", alias="CLICKHOUSE_DATABASE")

    # ── App ────────────────────────────────────────────────────────────────────
    app_env: str = Field("development", alias="APP_ENV")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    cors_origins: List[str] = Field(
        default=["http://localhost:3000"], alias="CORS_ORIGINS"
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of Settings."""
    return Settings()
