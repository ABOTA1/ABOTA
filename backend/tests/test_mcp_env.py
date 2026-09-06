"""tests/test_mcp_env.py – MCP subprocess env must speak ClickHouse Cloud TLS."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from app.agent import gemini_client


def test_mcp_env_sends_true_false_for_secure_flag():
    original = gemini_client.settings.clickhouse_secure
    try:
        gemini_client.settings.clickhouse_secure = True
        env = gemini_client._build_mcp_env()
        assert env["CLICKHOUSE_SECURE"] == "true"

        gemini_client.settings.clickhouse_secure = False
        env = gemini_client._build_mcp_env()
        assert env["CLICKHOUSE_SECURE"] == "false"
        assert env["SSL_CERT_FILE"]
        assert env["REQUESTS_CA_BUNDLE"]
    finally:
        gemini_client.settings.clickhouse_secure = original
