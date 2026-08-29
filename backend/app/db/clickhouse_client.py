"""
app/db/clickhouse_client.py – ClickHouse connection manager.
Uses clickhouse-connect with lazy initialisation; credentials from env vars.
"""
import logging
from functools import lru_cache
from typing import Any, Dict, List

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache
def get_clickhouse_client() -> Client:
    """Return a cached ClickHouse client (thread-safe singleton)."""
    logger.info(
        "Connecting to ClickHouse at %s:%s", settings.clickhouse_host, settings.clickhouse_port
    )
    client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_database,
        connect_timeout=10,
        send_receive_timeout=30,
    )
    return client


def execute_query(sql: str) -> List[Dict[str, Any]]:
    """
    Execute a read-only SQL query and return rows as a list of dicts.

    Raises:
        ValueError: if the query contains forbidden DDL/DML keywords.
        RuntimeError: on ClickHouse execution errors.
    """
    _validate_query(sql)
    client = get_clickhouse_client()
    try:
        result = client.query(sql)
        columns = result.column_names
        rows = [dict(zip(columns, row)) for row in result.result_rows]
        logger.info("Query returned %d rows", len(rows))
        return rows
    except Exception as exc:
        logger.error("ClickHouse query error: %s", exc)
        raise RuntimeError(f"ClickHouse error: {exc}") from exc


# ── FORBIDDEN KEYWORDS ─────────────────────────────────────────────────────────
_FORBIDDEN = {"drop", "delete", "alter", "truncate", "insert", "update", "create", "grant", "revoke"}


def _validate_query(sql: str) -> None:
    """Basic SQL guard: reject any statement with destructive keywords."""
    first_token = sql.strip().split()[0].lower() if sql.strip() else ""
    if first_token in _FORBIDDEN:
        raise ValueError(
            f"Forbidden SQL operation '{first_token}'. "
            "Only SELECT queries are allowed through the agent."
        )
    for keyword in _FORBIDDEN:
        # Loose check for embedded keywords (e.g., subqueries that DROP)
        if f" {keyword} " in sql.lower():
            raise ValueError(f"Forbidden keyword '{keyword}' detected in query.")
