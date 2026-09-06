"""tests/test_seed_schema.py – Catalog + DDL for ClickHouse Cloud seed (no live DB)."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from scripts.seed_clickhouse import (
    CATALOG_COLUMNS,
    DDL_BOX_OFFICE,
    DDL_CONTENT_CATALOG,
    DDL_SOCIAL,
    DDL_STREAMING,
    MOVIES,
    catalog_rows,
    generate_fact_rows,
    _is_placeholder_host,
)


def test_catalog_covers_all_titles_with_genre_budget_country():
    rows = catalog_rows()
    assert len(rows) == 12
    assert len(MOVIES) == 12
    ids = {row[0] for row in rows}
    assert ids == {movie["id"] for movie in MOVIES}
    for row in rows:
        content_id, title, genre, budget, country, year = row
        assert content_id.startswith("MOV-")
        assert title
        assert genre
        assert budget > 0
        assert country
        assert 2020 <= year <= 2030


def test_catalog_column_order_matches_insert():
    assert CATALOG_COLUMNS == [
        "content_id",
        "content_title",
        "genre",
        "budget_usd",
        "country",
        "release_year",
    ]


def test_ddl_declares_cloud_fact_and_dimension_tables():
    assert "content_catalog" in DDL_CONTENT_CATALOG
    assert "genre" in DDL_CONTENT_CATALOG
    assert "budget_usd" in DDL_CONTENT_CATALOG
    assert "country" in DDL_CONTENT_CATALOG
    assert "box_office_metrics" in DDL_BOX_OFFICE
    assert "streaming_activity" in DDL_STREAMING
    assert "social_mentions" in DDL_SOCIAL
    assert "MergeTree()" in DDL_CONTENT_CATALOG


def test_fact_generator_emits_rows_for_each_title():
    movies = MOVIES[:2]
    box_office, streaming, social = generate_fact_rows(movies=movies, days=2)
    assert len(box_office) == 4  # 2 days × 2 titles
    assert {row[0] for row in box_office} == {"MOV-001", "MOV-002"}
    assert streaming
    assert social
    assert all(row[3] in {"play", "pause", "complete", "drop-off"} for row in streaming)


def test_placeholder_host_detection():
    assert _is_placeholder_host("your-instance.clickhouse.cloud")
    assert _is_placeholder_host("https://your-instance.clickhouse.cloud")
    assert not _is_placeholder_host("abc123.us-east-1.aws.clickhouse.cloud")
