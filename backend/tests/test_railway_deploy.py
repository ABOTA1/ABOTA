"""Railway deploy files must stay wired for the two-service monorepo."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_backend_railway_uses_production_dockerfile():
    text = (ROOT / "backend" / "railway.toml").read_text()
    assert 'builder = "DOCKERFILE"' in text
    assert 'dockerfilePath = "Dockerfile"' in text
    assert 'healthcheckPath = "/api/health"' in text


def test_frontend_railway_uses_prod_dockerfile():
    text = (ROOT / "frontend" / "railway.toml").read_text()
    assert 'dockerfilePath = "Dockerfile.prod"' in text
    assert 'healthcheckPath = "/"' in text
    assert (ROOT / "frontend" / "Dockerfile.prod").is_file()
    prod = (ROOT / "frontend" / "Dockerfile.prod").read_text()
    next_config = (ROOT / "frontend" / "next.config.mjs").read_text()
    assert 'output: "standalone"' in next_config
    cmd_lines = [line for line in prod.splitlines() if line.startswith("CMD")]
    assert cmd_lines, "Dockerfile.prod must define a CMD"
    assert "node server.js" in cmd_lines[-1]
    assert "dev" not in cmd_lines[-1]


def test_readme_points_at_railway_runbook():
    readme = (ROOT / "README.md").read_text()
    assert "RAILWAY.md" in readme
    assert (ROOT / "RAILWAY.md").is_file()
