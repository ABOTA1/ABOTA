"""Map dashboard ClickHouse errors to HTTP responses."""

from fastapi import HTTPException

from app.db.errors import InvalidSQLError


def dashboard_http_exception(exc: Exception) -> HTTPException:
    """400 for invalid SQL; 503 when ClickHouse times out or is unavailable."""
    if isinstance(exc, InvalidSQLError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=503, detail=str(exc))
