"""GEMINI_MODEL chain uniqueness and 429 fallback to the next text model."""
import os
from types import SimpleNamespace

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

import pytest

from app.config import Settings


def test_gemini_model_chain_preferred_first_and_deduped(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash")
    monkeypatch.setenv(
        "GEMINI_MODELS",
        "gemini-3.8-flash, gemini-3.5-flash, gemini-3.7-flash",
    )
    settings = Settings()
    assert settings.gemini_model_chain() == [
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-3.7-flash",
    ]


def test_default_chain_starts_with_3_8_and_includes_exhausted_ids():
    settings = Settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3.8-flash",
        GEMINI_MODELS=(
            "gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite,"
            "gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash,"
            "gemini-3-flash,gemini-3.5-flash,gemini-3.6-flash"
        ),
    )
    chain = settings.gemini_model_chain()
    assert chain[0] == "gemini-3.8-flash"
    assert "gemini-3.5-flash" in chain
    assert "gemini-3.6-flash" in chain
    assert "gemini-3.5-flash-lite" in chain
    assert len(chain) == len(set(name.lower() for name in chain))


def test_generate_content_skips_quota_exhausted_model(monkeypatch):
    from app.agent import gemini_client as gc

    class ChainSettings:
        def gemini_model_chain(self):
            return ["gemini-3.5-flash", "gemini-3.8-flash"]

    monkeypatch.setattr(gc, "settings", ChainSettings())

    calls: list[str] = []

    class Models:
        def generate_content(self, model, contents, config):
            calls.append(model)
            if model == "gemini-3.5-flash":
                raise RuntimeError(
                    "429 RESOURCE_EXHAUSTED. You exceeded your current quota, "
                    "model: gemini-3.5-flash"
                )
            return SimpleNamespace(ok=True, model=model)

    client = SimpleNamespace(models=Models())
    result = gc._generate_content_with_fallback(
        client,
        contents=[],
        config=None,
    )
    assert calls == ["gemini-3.5-flash", "gemini-3.8-flash"]
    assert result.model == "gemini-3.8-flash"


def test_generate_content_reraises_non_quota_errors(monkeypatch):
    from app.agent import gemini_client as gc

    class ChainSettings:
        def gemini_model_chain(self):
            return ["gemini-3.8-flash", "gemini-3.7-flash"]

    monkeypatch.setattr(gc, "settings", ChainSettings())

    class Models:
        def generate_content(self, model, contents, config):
            raise RuntimeError("400 INVALID_ARGUMENT: malformed request")

    client = SimpleNamespace(models=Models())
    with pytest.raises(RuntimeError, match="INVALID_ARGUMENT"):
        gc._generate_content_with_fallback(client, contents=[], config=None)


def test_generate_content_raises_when_all_models_exhausted(monkeypatch):
    from app.agent import gemini_client as gc

    class ChainSettings:
        def gemini_model_chain(self):
            return ["gemini-3.5-flash", "gemini-3.6-flash"]

    monkeypatch.setattr(gc, "settings", ChainSettings())

    class Models:
        def generate_content(self, model, contents, config):
            raise RuntimeError(f"429 RESOURCE_EXHAUSTED model: {model}")

    client = SimpleNamespace(models=Models())
    with pytest.raises(RuntimeError, match="RESOURCE_EXHAUSTED"):
        gc._generate_content_with_fallback(client, contents=[], config=None)
