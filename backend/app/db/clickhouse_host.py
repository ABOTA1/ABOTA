"""Normalize ClickHouse Cloud hostnames for HTTP/TLS clients."""


def sanitize_clickhouse_host(host: str) -> str:
    """Strip URL scheme, port, and trailing slash from a Cloud hostname."""
    cleaned = (
        (host or "")
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0]
        .split(":")[0]
        .strip()
        .rstrip(".")
    )
    return cleaned
