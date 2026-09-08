"""
scripts/seed_clickhouse.py – Populate ClickHouse Cloud with realistic fake data.

Targets ClickHouse Cloud (not a local server). Run:
  python -m scripts.seed_clickhouse
  python -m scripts.seed_clickhouse --force   # insert another fact batch; refresh catalog
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Sequence

# Allow running from the backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import certifi
import clickhouse_connect
from app.config import get_settings
from app.db.clickhouse_host import sanitize_clickhouse_host

# Deterministic demo data so re-seeds are comparable across machines.
random.seed(42)

# ── Dimension catalog (genres, budgets, countries) ────────────────────────────
MOVIES: list[dict[str, Any]] = [
    {
        "id": "MOV-001",
        "title": "Galactic Odyssey",
        "genre": "Sci-Fi",
        "budget_usd": 180_000_000.0,
        "country": "United States",
        "release_year": 2024,
    },
    {
        "id": "MOV-002",
        "title": "Shadow Protocol",
        "genre": "Thriller",
        "budget_usd": 95_000_000.0,
        "country": "United Kingdom",
        "release_year": 2024,
    },
    {
        "id": "MOV-003",
        "title": "The Last Horizon",
        "genre": "Drama",
        "budget_usd": 45_000_000.0,
        "country": "France",
        "release_year": 2023,
    },
    {
        "id": "MOV-004",
        "title": "Neon Dragons",
        "genre": "Action",
        "budget_usd": 120_000_000.0,
        "country": "Japan",
        "release_year": 2024,
    },
    {
        "id": "MOV-005",
        "title": "Crimson Tide Rising",
        "genre": "Action",
        "budget_usd": 150_000_000.0,
        "country": "United States",
        "release_year": 2024,
    },
    {
        "id": "MOV-006",
        "title": "Quantum Paradox",
        "genre": "Sci-Fi",
        "budget_usd": 200_000_000.0,
        "country": "United States",
        "release_year": 2023,
    },
    {
        "id": "MOV-007",
        "title": "Lost in Ember",
        "genre": "Romance",
        "budget_usd": 35_000_000.0,
        "country": "Spain",
        "release_year": 2024,
    },
    {
        "id": "MOV-008",
        "title": "Steel Colossus",
        "genre": "Superhero",
        "budget_usd": 220_000_000.0,
        "country": "United States",
        "release_year": 2024,
    },
    {
        "id": "MOV-009",
        "title": "Cyber City 2099",
        "genre": "Sci-Fi",
        "budget_usd": 110_000_000.0,
        "country": "South Korea",
        "release_year": 2024,
    },
    {
        "id": "MOV-010",
        "title": "Echoes of Eternity",
        "genre": "Fantasy",
        "budget_usd": 85_000_000.0,
        "country": "New Zealand",
        "release_year": 2023,
    },
    {
        "id": "MOV-011",
        "title": "Midnight Eclipse",
        "genre": "Horror",
        "budget_usd": 28_000_000.0,
        "country": "Canada",
        "release_year": 2024,
    },
    {
        "id": "MOV-012",
        "title": "Vortex Horizon",
        "genre": "Sci-Fi",
        "budget_usd": 160_000_000.0,
        "country": "United States",
        "release_year": 2024,
    },
]

PLATFORMS_BOX_OFFICE = ["Theaters", "Netflix", "Disney+", "Prime Video", "HBO Max"]
PLATFORMS_STREAMING = ["Netflix", "Disney+", "Prime Video", "HBO Max", "Apple TV+"]
PLATFORMS_SOCIAL = ["Twitter/X", "Reddit", "TikTok", "Instagram", "YouTube"]
STREAMING_EVENT_TYPES = ["play", "pause", "complete", "drop-off"]
SOCIAL_MENTION_TYPES = ["post", "comment", "share"]

SAMPLE_POSTS_POS = [
    "Absolutely blown away by {title}! A cinematic masterpiece! 🔥",
    "Best movie I've seen all year. {title} delivers on every level.",
    "Can't stop thinking about the ending of {title}. 10/10 recommendation!",
    "Incredible acting and visual effects in {title}.",
]

SAMPLE_POSTS_NEU = [
    "Just finished watching {title}. Interesting concepts, pacing was okay.",
    "Watched {title} last night. Decent watch for a weekend movie.",
    "Thoughts on {title}? Not sure how I feel about the plot twist.",
]

SAMPLE_POSTS_NEG = [
    "Really disappointed with {title}. Expected way more based on the trailer.",
    "The storyline in {title} made no sense at all. Skip this one.",
    "Overhyped and boring. {title} didn't live up to expectations.",
]

START_DATETIME = datetime(2024, 1, 1, 0, 0, 0)
DAYS = 90

DDL_CONTENT_CATALOG = """
        CREATE TABLE IF NOT EXISTS content_catalog (
            content_id     String,
            content_title  String,
            genre          LowCardinality(String),
            budget_usd     Float64,
            country        LowCardinality(String),
            release_year   UInt16
        )
        ENGINE = MergeTree()
        ORDER BY (content_id)
    """

DDL_BOX_OFFICE = """
        CREATE TABLE IF NOT EXISTS box_office_metrics (
            content_id     String,
            content_title  String,
            daily_revenue  Float64,
            platform       LowCardinality(String),
            event_date     Date
        )
        ENGINE = MergeTree()
        ORDER BY (content_id, event_date)
    """

DDL_STREAMING = """
        CREATE TABLE IF NOT EXISTS streaming_activity (
            platform                LowCardinality(String),
            content_id              String,
            content_title           String,
            event_type              LowCardinality(String),
            watch_duration_seconds  UInt32,
            event_time              DateTime
        )
        ENGINE = MergeTree()
        ORDER BY (content_id, event_time)
    """

DDL_SOCIAL = """
        CREATE TABLE IF NOT EXISTS social_mentions (
            platform         LowCardinality(String),
            content_id       String,
            content_title    String,
            mention_type     LowCardinality(String),
            sentiment_score  Float32,
            raw_text         String,
            event_time       DateTime
        )
        ENGINE = MergeTree()
        ORDER BY (content_id, event_time)
    """

CATALOG_COLUMNS = [
    "content_id",
    "content_title",
    "genre",
    "budget_usd",
    "country",
    "release_year",
]


def catalog_rows() -> list[tuple[Any, ...]]:
    """One dimension row per title: genre, production budget, origin country."""
    return [
        (
            movie["id"],
            movie["title"],
            movie["genre"],
            float(movie["budget_usd"]),
            movie["country"],
            int(movie["release_year"]),
        )
        for movie in MOVIES
    ]


def generate_fact_rows(
    movies: Sequence[dict[str, Any]] | None = None,
    days: int = DAYS,
    start: datetime = START_DATETIME,
) -> tuple[list[tuple[Any, ...]], list[tuple[Any, ...]], list[tuple[Any, ...]]]:
    """Build box-office, streaming, and social fact rows for the catalog titles."""
    movies = list(movies or MOVIES)
    box_office_rows: list[tuple[Any, ...]] = []
    streaming_rows: list[tuple[Any, ...]] = []
    social_rows: list[tuple[Any, ...]] = []

    for day_offset in range(days):
        current_day = start + timedelta(days=day_offset)
        event_date = current_day.date()

        for movie in movies:
            m_id = movie["id"]
            m_title = movie["title"]
            decay = max(0.15, 1.0 - (day_offset / days) * 0.75)

            platform_bo = random.choice(PLATFORMS_BOX_OFFICE)
            base_revenue = random.uniform(400_000, 4_500_000)
            revenue = round(base_revenue * decay * random.uniform(0.8, 1.2), 2)
            box_office_rows.append((m_id, m_title, revenue, platform_bo, event_date))

            num_streams = random.randint(5, 20)
            for _ in range(num_streams):
                platform_st = random.choice(PLATFORMS_STREAMING)
                event_type = random.choice(STREAMING_EVENT_TYPES)

                if event_type == "complete":
                    duration = random.randint(5400, 7200)
                elif event_type == "drop-off":
                    duration = random.randint(300, 2400)
                elif event_type == "pause":
                    duration = random.randint(600, 3600)
                else:
                    duration = random.randint(60, 1800)

                event_second = random.randint(0, 86399)
                event_time = current_day + timedelta(seconds=event_second)
                streaming_rows.append(
                    (platform_st, m_id, m_title, event_type, duration, event_time)
                )

            num_mentions = random.randint(4, 15)
            for _ in range(num_mentions):
                platform_soc = random.choice(PLATFORMS_SOCIAL)
                mention_type = random.choice(SOCIAL_MENTION_TYPES)

                sentiment_roll = random.random()
                if sentiment_roll < 0.55:
                    sentiment = round(random.uniform(0.2, 0.98), 2)
                    text = random.choice(SAMPLE_POSTS_POS).format(title=m_title)
                elif sentiment_roll < 0.80:
                    sentiment = round(random.uniform(-0.19, 0.19), 2)
                    text = random.choice(SAMPLE_POSTS_NEU).format(title=m_title)
                else:
                    sentiment = round(random.uniform(-0.95, -0.2), 2)
                    text = random.choice(SAMPLE_POSTS_NEG).format(title=m_title)

                event_second = random.randint(0, 86399)
                event_time = current_day + timedelta(seconds=event_second)
                social_rows.append(
                    (platform_soc, m_id, m_title, mention_type, sentiment, text, event_time)
                )

    return box_office_rows, streaming_rows, social_rows


def _is_placeholder_host(host: str) -> bool:
    cleaned = sanitize_clickhouse_host(host).lower()
    return (not cleaned) or cleaned.startswith("your-instance")


def _preflight(settings) -> None:
    """Fail fast with a Cloud-console hint instead of a cryptic TCP error."""
    if _is_placeholder_host(settings.clickhouse_host) or not settings.clickhouse_password:
        print(
            "ClickHouse Cloud credentials are missing.\n"
            "Copy backend/.env.example to backend/.env and set:\n"
            "  CLICKHOUSE_HOST     = <your-service>.clickhouse.cloud\n"
            "  CLICKHOUSE_PASSWORD = password from ClickHouse Cloud → Connect\n"
            "There is no default Cloud password; it is created in the Cloud console."
        )
        sys.exit(1)


def _table_row_count(client, table: str) -> int:
    try:
        result = client.query(f"SELECT count() FROM {table}")
        if result.result_rows:
            return int(result.result_rows[0][0])
    except Exception:
        return 0
    return 0


def _ensure_schema(client, database: str) -> None:
    client.command(f"CREATE DATABASE IF NOT EXISTS {database}")
    client.command(f"USE {database}")
    print("Creating content_catalog table...")
    client.command(DDL_CONTENT_CATALOG)
    print("Creating box_office_metrics table...")
    client.command(DDL_BOX_OFFICE)
    print("Creating streaming_activity table...")
    client.command(DDL_STREAMING)
    print("Creating social_mentions table...")
    client.command(DDL_SOCIAL)


def _upsert_catalog(client, force: bool) -> None:
    existing = _table_row_count(client, "content_catalog")
    if existing > 0 and not force:
        print(f"content_catalog already has {existing} rows; leaving it in place.")
        return
    if force and existing > 0:
        print("Refreshing content_catalog (--force)...")
        client.command("TRUNCATE TABLE content_catalog")
    rows = catalog_rows()
    print(f"Inserting {len(rows)} rows into content_catalog...")
    client.insert("content_catalog", rows, column_names=CATALOG_COLUMNS)


def main() -> None:
    settings = get_settings()
    _preflight(settings)
    force = "--force" in sys.argv
    clean_host = sanitize_clickhouse_host(settings.clickhouse_host)

    print(
        f"Connecting to ClickHouse Cloud at {clean_host}:"
        f"{settings.clickhouse_port} (Secure={settings.clickhouse_secure}, "
        f"database={settings.clickhouse_database})..."
    )
    client = clickhouse_connect.get_client(
        host=clean_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        secure=settings.clickhouse_secure,
        verify=settings.clickhouse_verify if settings.clickhouse_secure else False,
        connect_timeout=30,
        send_receive_timeout=60,
        ca_cert=certifi.where() if settings.clickhouse_secure else None,
    )

    _ensure_schema(client, settings.clickhouse_database)
    _upsert_catalog(client, force=force)

    fact_count = _table_row_count(client, "box_office_metrics")
    if fact_count > 0 and not force:
        print(
            "Database already has fact data; skipping box_office / streaming / social inserts. "
            "Re-run with --force to insert another batch."
        )
        print("✅ Seed script complete (schema + catalog ensured).")
        print(
            "The agent queries this Cloud database through mcp-clickhouse stdio "
            f"(CLICKHOUSE_DATABASE={settings.clickhouse_database})."
        )
        return

    box_office_rows, streaming_rows, social_rows = generate_fact_rows()

    print(f"Inserting {len(box_office_rows):,} rows into box_office_metrics...")
    client.insert(
        "box_office_metrics",
        box_office_rows,
        column_names=["content_id", "content_title", "daily_revenue", "platform", "event_date"],
    )

    print(f"Inserting {len(streaming_rows):,} rows into streaming_activity...")
    client.insert(
        "streaming_activity",
        streaming_rows,
        column_names=[
            "platform",
            "content_id",
            "content_title",
            "event_type",
            "watch_duration_seconds",
            "event_time",
        ],
    )

    print(f"Inserting {len(social_rows):,} rows into social_mentions...")
    client.insert(
        "social_mentions",
        social_rows,
        column_names=[
            "platform",
            "content_id",
            "content_title",
            "mention_type",
            "sentiment_score",
            "raw_text",
            "event_time",
        ],
    )

    print("✅ Seed script completed successfully.")
    print(
        "The agent queries this Cloud database through mcp-clickhouse stdio "
        f"(CLICKHOUSE_DATABASE={settings.clickhouse_database})."
    )


if __name__ == "__main__":
    main()
