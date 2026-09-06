"""tests/test_cloud_compose.py – Compose must target ClickHouse Cloud, not a local server."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COMPOSE = (ROOT / "docker-compose.yml").read_text()
PROMPT = (ROOT / "backend" / "app" / "agent" / "prompts.py").read_text()


def test_compose_has_no_local_clickhouse_image():
    assert "clickhouse/clickhouse-server" not in COMPOSE
    assert "CLICKHOUSE_HOST" in COMPOSE or "backend/.env" in COMPOSE


def test_compose_runs_one_shot_seed_on_up():
    assert "container_name: abota_seed" in COMPOSE
    assert "python -m scripts.seed_clickhouse" in COMPOSE
    assert 'restart: "no"' in COMPOSE
    assert "profiles:" not in COMPOSE
    assert "unless-stopped" in COMPOSE


def test_system_prompt_documents_catalog_join():
    assert "content_catalog" in PROMPT
    assert "budget_usd" in PROMPT
    assert "genre" in PROMPT
    assert "country" in PROMPT
