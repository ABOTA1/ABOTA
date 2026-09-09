"""tests/test_sql_guard.py – Invalid / empty SQL rejected before ClickHouse."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

import pytest

from app.db.errors import InvalidSQLError
from app.db.sql_guard import validate_readonly_select


def test_select_is_allowed():
    validate_readonly_select("SELECT 1")


def test_with_cte_is_allowed():
    validate_readonly_select("WITH x AS (SELECT 1 AS n) SELECT n FROM x")


def test_empty_sql_is_rejected():
    with pytest.raises(InvalidSQLError, match="Empty"):
        validate_readonly_select("   ")


def test_comment_only_sql_is_rejected():
    with pytest.raises(InvalidSQLError, match="Empty"):
        validate_readonly_select("-- nothing\n")
    with pytest.raises(InvalidSQLError, match="Empty"):
        validate_readonly_select("-- nothing")


def test_drop_is_rejected():
    with pytest.raises(InvalidSQLError):
        validate_readonly_select("DROP TABLE box_office_metrics")


def test_stacked_statements_are_rejected():
    with pytest.raises(InvalidSQLError, match="Multiple"):
        validate_readonly_select("SELECT 1; DROP TABLE box_office_metrics")


def test_insert_hidden_in_select_is_rejected():
    with pytest.raises(InvalidSQLError, match="INSERT"):
        validate_readonly_select("SELECT 1 FROM (SELECT 1) INSERT INTO t VALUES (1)")
