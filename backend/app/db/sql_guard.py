"""Read-only SELECT guard for dashboard ClickHouse helpers."""

import re

from app.db.errors import InvalidSQLError

_LEADING_COMMENT_RE = re.compile(r"^(\s*--[^\n]*(?:\n|$|\Z)|\s*/\*.*?\*/\s*)+", re.DOTALL)
_READONLY_PREFIX_RE = re.compile(r"^(SELECT|WITH)\b", re.IGNORECASE)

_FORBIDDEN_KEYWORDS = (
    "DROP",
    "DELETE",
    "TRUNCATE",
    "INSERT",
    "UPDATE",
    "ALTER",
    "CREATE",
    "GRANT",
    "REVOKE",
    "RENAME",
    "ATTACH",
    "DETACH",
    "OPTIMIZE",
    "KILL",
    "SYSTEM",
)


def validate_readonly_select(sql: str) -> None:
    """Raise InvalidSQLError unless `sql` is a single read-only SELECT (WITH CTEs allowed)."""
    if not isinstance(sql, str) or not sql.strip():
        raise InvalidSQLError("Empty SQL query is not allowed.")

    stripped = _LEADING_COMMENT_RE.sub("", sql.strip()).strip()
    if not stripped:
        raise InvalidSQLError("Empty SQL query is not allowed.")

    if not _READONLY_PREFIX_RE.match(stripped):
        raise InvalidSQLError(
            "Only SELECT statements are allowed (WITH ... SELECT CTEs are permitted)."
        )

    body = stripped[:-1] if stripped.endswith(";") else stripped
    if ";" in body:
        raise InvalidSQLError(
            "Multiple SQL statements are not permitted. Only a single SELECT is allowed."
        )

    for keyword in _FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", stripped, re.IGNORECASE):
            raise InvalidSQLError(
                f"Forbidden SQL keyword '{keyword}'. Only read-only SELECT queries are allowed."
            )
