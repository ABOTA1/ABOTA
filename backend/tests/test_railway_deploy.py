"""Railway deploy files must stay wired for the two-service monorepo."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_root_dockerfile_builds_backend_not_railpack():
    """The failed ABOTA service scanned repo root with Railpack; Docker must win."""
    root_df = (ROOT / "Dockerfile").read_text()
    root_toml = (ROOT / "railway.toml").read_text()
    assert "COPY backend/requirements.txt" in root_df
    assert "uvicorn app.main:app" in root_df
    assert 'builder = "DOCKERFILE"' in root_toml
    assert 'dockerfilePath = "Dockerfile"' in root_toml
    assert 'healthcheckPath = "/api/health"' in root_toml


def test_backend_railway_uses_production_dockerfile():
    text = (ROOT / "backend" / "railway.toml").read_text()
    assert 'builder = "DOCKERFILE"' in text
    assert 'dockerfilePath = "Dockerfile"' in text
    assert 'healthcheckPath = "/api/health"' in text
    procfile = (ROOT / "backend" / "Procfile").read_text()
    assert "uvicorn app.main:app" in procfile


def test_frontend_railway_uses_prod_dockerfile():
    text = (ROOT / "frontend" / "railway.toml").read_text()
    assert 'builder = "DOCKERFILE"' in text
    assert 'dockerfilePath = "frontend/Dockerfile"' in text
    assert 'healthcheckPath = "/"' in text
    prod = (ROOT / "frontend" / "Dockerfile").read_text()
    next_config = (ROOT / "frontend" / "next.config.mjs").read_text()
    assert 'output: "standalone"' in next_config
    cmd_lines = [line for line in prod.splitlines() if line.startswith("CMD")]
    assert cmd_lines, "frontend/Dockerfile must define a CMD"
    assert "node server.js" in cmd_lines[-1]
    assert "dev" not in cmd_lines[-1]
    compose = (ROOT / "docker-compose.yml").read_text()
    assert "Dockerfile.dev" in compose


def test_readme_points_at_railway_runbook():
    readme = (ROOT / "README.md").read_text()
    assert "RAILWAY.md" in readme
    assert "VERCEL.md" in readme
    assert (ROOT / "RAILWAY.md").is_file()
    assert (ROOT / "VERCEL.md").is_file()
    assert r"vercel\.app" in (ROOT / "backend" / "app" / "main.py").read_text()
