"""Typed errors for dashboard ClickHouse helpers."""


class ClickHouseQueryError(RuntimeError):
    """ClickHouse rejected the query or the connection failed."""


class ClickHouseTimeoutError(ClickHouseQueryError):
    """The query or connection exceeded the configured timeout."""


class InvalidSQLError(ValueError):
    """SQL is empty, not read-only, or otherwise unsafe to run."""
