"""
scripts/seed_clickhouse.py – Populate ClickHouse with realistic fake data.
Run once before the demo:  python -m scripts.seed_clickhouse
"""
import random
import sys
from datetime import date, timedelta
from pathlib import Path

# Allow running from the backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import clickhouse_connect
from app.config import get_settings

settings = get_settings()

MOVIES = [
    "Galactic Odyssey",
    "Shadow Protocol",
    "The Last Horizon",
    "Neon Dragons",
    "Crimson Tide Rising",
    "Quantum Paradox",
    "Lost in Ember",
    "Steel Colossus",
]

PLATFORMS = ["Theaters", "Netflix", "Disney+", "Prime Video", "HBO Max"]

START_DATE = date(2024, 1, 1)
DAYS = 180  # ~6 months of data


def main() -> None:
    print(f"Connecting to ClickHouse at {settings.clickhouse_host}:{settings.clickhouse_port}...")
    client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
    )

    # ── Create database & table ────────────────────────────────────────────────
    client.command(f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}")
    client.command(f"USE {settings.clickhouse_database}")
    client.command("""
        CREATE TABLE IF NOT EXISTS box_office_metrics (
            movie_title     String,
            daily_revenue   Float64,
            social_mentions UInt32,
            platform        String,
            event_date      Date
        )
        ENGINE = MergeTree()
        ORDER BY (event_date, movie_title)
    """)
    print("Table box_office_metrics ready.")

    # ── Generate rows ──────────────────────────────────────────────────────────
    rows = []
    for day_offset in range(DAYS):
        current_date = START_DATE + timedelta(days=day_offset)
        for movie in MOVIES:
            platform = random.choice(PLATFORMS)
            # Revenue decays over time with some randomness (opening-weekend effect)
            base_revenue = random.uniform(500_000, 5_000_000)
            decay = max(0.1, 1 - (day_offset / DAYS) * 0.8)
            revenue = round(base_revenue * decay * random.uniform(0.7, 1.3), 2)
            mentions = random.randint(100, 50_000)
            rows.append((movie, revenue, mentions, platform, current_date))

    client.insert(
        "box_office_metrics",
        rows,
        column_names=["movie_title", "daily_revenue", "social_mentions", "platform", "event_date"],
    )
    print(f"✅ Inserted {len(rows):,} rows into box_office_metrics.")


if __name__ == "__main__":
    main()
