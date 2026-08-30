"""
scripts/seed_clickhouse.py – Populate ClickHouse Cloud with realistic fake data.
Run once before the demo:  python -m scripts.seed_clickhouse
"""
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Allow running from the backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import clickhouse_connect
from app.config import get_settings

settings = get_settings()

MOVIES = [
    {"id": "MOV-001", "title": "Galactic Odyssey"},
    {"id": "MOV-002", "title": "Shadow Protocol"},
    {"id": "MOV-003", "title": "The Last Horizon"},
    {"id": "MOV-004", "title": "Neon Dragons"},
    {"id": "MOV-005", "title": "Crimson Tide Rising"},
    {"id": "MOV-006", "title": "Quantum Paradox"},
    {"id": "MOV-007", "title": "Lost in Ember"},
    {"id": "MOV-008", "title": "Steel Colossus"},
    {"id": "MOV-009", "title": "Cyber City 2099"},
    {"id": "MOV-010", "title": "Echoes of Eternity"},
    {"id": "MOV-011", "title": "Midnight Eclipse"},
    {"id": "MOV-012", "title": "Vortex Horizon"},
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


def main() -> None:
    print(f"Connecting to ClickHouse Cloud at {settings.clickhouse_host}:{settings.clickhouse_port} (Secure={settings.clickhouse_secure})...")
    client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        secure=settings.clickhouse_secure,
    )

    client.command(f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}")
    client.command(f"USE {settings.clickhouse_database}")

    # ── 1. Table: box_office_metrics ──────────────────────────────────────────
    print("Creating box_office_metrics table...")
    client.command("""
        CREATE TABLE IF NOT EXISTS box_office_metrics (
            movie_title     String,
            daily_revenue   Float64,
            platform        LowCardinality(String),
            event_date      Date
        )
        ENGINE = MergeTree()
        ORDER BY (event_date, movie_title)
    """)

    # ── 2. Table: streaming_activity ──────────────────────────────────────────
    print("Creating streaming_activity table...")
    client.command("""
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
    """)

    # ── 3. Table: social_mentions ─────────────────────────────────────────────
    print("Creating social_mentions table...")
    client.command("""
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
    """)

    # ── Generate & Insert Data ────────────────────────────────────────────────
    box_office_rows = []
    streaming_rows = []
    social_rows = []

    for day_offset in range(DAYS):
        current_day = START_DATETIME + timedelta(days=day_offset)
        event_date = current_day.date()

        for movie in MOVIES:
            m_id = movie["id"]
            m_title = movie["title"]
            decay = max(0.15, 1.0 - (day_offset / DAYS) * 0.75)

            # Box Office Metrics
            platform_bo = random.choice(PLATFORMS_BOX_OFFICE)
            base_revenue = random.uniform(400_000, 4_500_000)
            revenue = round(base_revenue * decay * random.uniform(0.8, 1.2), 2)
            box_office_rows.append((m_title, revenue, platform_bo, event_date))

            # Streaming Activity events per day per movie
            num_streams = random.randint(5, 20)
            for _ in range(num_streams):
                platform_st = random.choice(PLATFORMS_STREAMING)
                event_type = random.choice(STREAMING_EVENT_TYPES)
                
                if event_type == "complete":
                    duration = random.randint(5400, 7200) # 90-120 mins
                elif event_type == "drop-off":
                    duration = random.randint(300, 2400)  # 5-40 mins
                elif event_type == "pause":
                    duration = random.randint(600, 3600)  # 10-60 mins
                else: # play
                    duration = random.randint(60, 1800)
                
                event_second = random.randint(0, 86399)
                event_time = current_day + timedelta(seconds=event_second)
                streaming_rows.append((platform_st, m_id, m_title, event_type, duration, event_time))

            # Social Mentions events per day per movie
            num_mentions = random.randint(4, 15)
            for _ in range(num_mentions):
                platform_soc = random.choice(PLATFORMS_SOCIAL)
                mention_type = random.choice(SOCIAL_MENTION_TYPES)
                
                # Sentiment distribution
                sentiment_roll = random.random()
                if sentiment_roll < 0.55: # positive
                    sentiment = round(random.uniform(0.2, 0.98), 2)
                    text = random.choice(SAMPLE_POSTS_POS).format(title=m_title)
                elif sentiment_roll < 0.80: # neutral
                    sentiment = round(random.uniform(-0.19, 0.19), 2)
                    text = random.choice(SAMPLE_POSTS_NEU).format(title=m_title)
                else: # negative
                    sentiment = round(random.uniform(-0.95, -0.2), 2)
                    text = random.choice(SAMPLE_POSTS_NEG).format(title=m_title)

                event_second = random.randint(0, 86399)
                event_time = current_day + timedelta(seconds=event_second)
                social_rows.append((platform_soc, m_id, m_title, mention_type, sentiment, text, event_time))

    print(f"Inserting {len(box_office_rows):,} rows into box_office_metrics...")
    client.insert(
        "box_office_metrics",
        box_office_rows,
        column_names=["movie_title", "daily_revenue", "platform", "event_date"],
    )

    print(f"Inserting {len(streaming_rows):,} rows into streaming_activity...")
    client.insert(
        "streaming_activity",
        streaming_rows,
        column_names=["platform", "content_id", "content_title", "event_type", "watch_duration_seconds", "event_time"],
    )

    print(f"Inserting {len(social_rows):,} rows into social_mentions...")
    client.insert(
        "social_mentions",
        social_rows,
        column_names=["platform", "content_id", "content_title", "mention_type", "sentiment_score", "raw_text", "event_time"],
    )

    print("✅ Seed script completed successfully.")


if __name__ == "__main__":
    main()

