"""CORS_ORIGINS must parse JSON lists and Railway comma-separated hosts."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

import pytest

from app.config import Settings, parse_cors_origins


def test_parse_cors_json_list():
    assert parse_cors_origins('["http://localhost:3000","https://abota.up.railway.app"]') == [
        "http://localhost:3000",
        "https://abota.up.railway.app",
    ]


def test_parse_cors_comma_separated():
    assert parse_cors_origins("https://abota.up.railway.app, http://localhost:3000") == [
        "https://abota.up.railway.app",
        "http://localhost:3000",
    ]


def test_parse_cors_empty_falls_back_to_local():
    assert parse_cors_origins("") == ["http://localhost:3000", "http://127.0.0.1:3000"]


def test_settings_accepts_comma_separated_cors(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("CLICKHOUSE_PASSWORD", "test")
    monkeypatch.setenv("CORS_ORIGINS", "https://demo.up.railway.app")
    settings = Settings(_env_file=None)
    assert settings.cors_origin_list() == ["https://demo.up.railway.app"]
