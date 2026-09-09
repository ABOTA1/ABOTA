"""tests/test_clickhouse_host.py – Cloud hostname sanitization."""
from app.db.clickhouse_host import sanitize_clickhouse_host


def test_strips_https_port_and_slash():
    assert (
        sanitize_clickhouse_host("https://abc.us-east-1.aws.clickhouse.cloud:8443/")
        == "abc.us-east-1.aws.clickhouse.cloud"
    )


def test_plain_cloud_host_unchanged():
    assert (
        sanitize_clickhouse_host("abc.us-east-1.aws.clickhouse.cloud")
        == "abc.us-east-1.aws.clickhouse.cloud"
    )
