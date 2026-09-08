"""
app/db/clickhouse_client.py – ClickHouse connection manager.

Used ONLY for fast dashboard endpoints (get_kpi_snapshot, get_metrics_summary)
and seed scripts. The conversational agent uses the MCP Server instead.
"""
import logging
from functools import lru_cache
from typing import Any, Dict, List

import certifi
import clickhouse_connect
from clickhouse_connect.driver.client import Client

from app.config import get_settings
from app.db.errors import ClickHouseQueryError, ClickHouseTimeoutError
from app.db.sql_guard import validate_readonly_select

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache
def get_clickhouse_client() -> Client:
    """Return a cached ClickHouse client (thread-safe singleton)."""
    timeout = settings.clickhouse_query_timeout
    # Limpiamos el host por si trae prefijos
    clean_host = (
        settings.clickhouse_host.replace("https://", "")
        .replace("http://", "")
        .split(":")[0]
        .rstrip("/")
    )

    logger.info(
        "Connecting to ClickHouse Cloud at %s (Secure: %s, timeout: %ss)",
        clean_host,
        settings.clickhouse_secure,
        timeout,
    )

    client = clickhouse_connect.get_client(
        host=clean_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_database,
        secure=settings.clickhouse_secure,
        connect_timeout=timeout,
        send_receive_timeout=timeout,
        ca_cert=certifi.where(),
    )
    return client


def execute_query(sql: str) -> List[Dict[str, Any]]:
    """Execute a read-only SQL query and return rows as a list of dicts.

    Empty result sets are valid (no matching data) and return ``[]``.
    Timeouts and connection failures raise ``ClickHouseTimeoutError`` /
    ``ClickHouseQueryError``. Invalid SQL is rejected before the round-trip.
    """
    validate_readonly_select(sql)
    client = get_clickhouse_client()
    timeout = settings.clickhouse_query_timeout
    try:
        result = client.query(sql, settings={"max_execution_time": timeout})
        columns = result.column_names
        rows = [dict(zip(columns, row)) for row in result.result_rows]
        if not rows:
            logger.warning("ClickHouse query returned no rows")
            return []
        logger.info("Query returned %d rows", len(rows))
        return rows
    except ClickHouseQueryError:
        raise
    except Exception as exc:
        if _is_timeout(exc):
            logger.error("ClickHouse query timed out after %ss: %s", timeout, exc)
            raise ClickHouseTimeoutError(
                f"ClickHouse query timed out after {timeout}s"
            ) from exc
        logger.error("ClickHouse query error: %s", exc)
        raise ClickHouseQueryError(f"ClickHouse error: {exc}") from exc


def _is_timeout(exc: BaseException) -> bool:
    name = type(exc).__name__.lower()
    if isinstance(exc, TimeoutError) or "timeout" in name:
        return True
    return "timeout" in str(exc).lower()
