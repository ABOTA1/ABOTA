# AGENTS.md – Architecture, Protocols, and Developer Guidelines

## 1. Project Overview & Purpose
**ABOTA (Agentic Box-Office & Trend Analytics)** is an AI-powered conversational analytics engine designed for media and entertainment domain data. It combines **Google Gemini** (via function calling and reasoning loops) with **ClickHouse Cloud** via the **Model Context Protocol (MCP)** to allow users to ask natural-language business questions and receive structured data, charts, and actionable insights.

---

## 2. Real Stack & System Architecture

Unlike generic abstractions, the repository implementation follows this concrete stack:

```
[ Next.js Frontend (:3000) ]
             │  HTTP POST /api/chat
             ▼
[ FastAPI Backend (:8000) ]
             │
   ┌─────────┴────────────────────────┐
   │ app/services/analytics_service.py │
   └─────────┬────────────────────────┘
             │
   ┌─────────┴────────────────────────┐
   │ app/agent/gemini_client.py       │
   │  - google-genai (gemini-2.0-flash)│
   │  - mcp ClientSession (stdio)     │
   └─────────┬────────────────────────┘
             │ stdio transport (Subprocess)
             ▼
   [ mcp-clickhouse CLI (stdio) ]
             │ Native ClickHouse TCP/HTTP (Port 8443 TLS)
             ▼
   [ ClickHouse Cloud Database ]
```

### Core Components:
- **Backend Framework**: FastAPI (`backend/app/main.py`), running under Uvicorn with Pydantic v2 settings.
- **AI Engine**: `google-genai` SDK (`gemini-2.0-flash` by default, configured in `app/config.py`).
- **MCP Bridge**: `app/agent/mcp_bridge.py` dynamically maps MCP tool definitions (JSON Schema) to `google.genai.types.FunctionDeclaration` objects.
- **MCP Transport**: Local `stdio` subprocess spawned per request via `mcp.client.stdio.stdio_client` executing the `mcp-clickhouse` executable with ClickHouse environment variables passed at runtime.
- **Direct Database Client**: `clickhouse-connect` is used exclusively for out-of-band tasks (seeding scripts in `scripts/seed_clickhouse.py` and pre-computed dashboard snapshot endpoints in `app/db/clickhouse_client.py`).

---

## 3. Non-Negotiable MCP Integration Rule

> **RULE:** All conversational agent interactions with ClickHouse **MUST** go through the Model Context Protocol (`mcp-clickhouse` stdio subprocess).

- **Dynamic Discovery**: The agent fetches available tools via `session.list_tools()`, registers them dynamically with Gemini, and executes tool calls using `session.call_tool()`.
- **No Direct DB Calls in Agent Path**: The agent reasoning loop (`app/agent/gemini_client.py`) MUST NOT import or call `clickhouse-connect` directly. Direct client queries (`app/db/clickhouse_client.py`) are strictly reserved for static dashboard KPI widgets (e.g., `/api/kpis`) and seed scripts.

---

## 4. API Data Contract

All API schemas live in [`backend/app/models/schemas.py`](file:///c:/Users/JUAN%20MANUEL%20PRETEL/Desktop/jacatooon/ABOTA/backend/app/models/schemas.py).

### Inbound Request (`ChatRequest`):
```json
{
  "question": "What were the top 5 highest grossing movies on Netflix in May?",
  "session_id": "optional-session-id"
}
```

### Outbound Response (`ChatResponse`):
```json
{
  "answer": "The top grossing movie was Galactic Odyssey with $4.2M...",
  "analytics": {
    "chart_type": "bar",
    "title": "Result for query_clickhouse",
    "series": [
      {
        "name": "total_revenue",
        "data": [
          { "label": "Galactic Odyssey", "value": 4200000.0 }
        ]
      }
    ],
    "raw_rows": [
      { "movie_title": "Galactic Odyssey", "total_revenue": 4200000.0 }
    ],
    "sql_executed": "SELECT movie_title, SUM(daily_revenue) AS total_revenue FROM box_office_metrics ...",
    "insights": [
      "**total_revenue** – Peak: Galactic Odyssey ($4,200,000), Low: Neon Dragons ($1,100,000)"
    ]
  },
  "error": null
}
```

---

## 5. Security Posture & Identified Gaps (Action Items)

### Current State
- **Prompt-Level Restriction**: `SYSTEM_PROMPT` in `app/agent/prompts.py` instructs the model to generate `SELECT` queries only.
- **Direct Client Validation**: `app/db/clickhouse_client.py` has `_validate_query()` to block `DROP`, `DELETE`, `ALTER`, `TRUNCATE`, `INSERT`, `UPDATE`, `CREATE`, `GRANT`, `REVOKE`.

### ⚠️ Security Gaps & TODOs:
1. **[TODO - Security] Missing Interception on MCP Agent Path**:
   - `gemini_client.py` forwards tool arguments directly from Gemini to `mcp-clickhouse` without executing Python-level SQL validation. If Gemini hallucinates or is prompt-injected with a DDL/DML query, `mcp-clickhouse` receives it unchecked.
   - *Fix Needed*: Add SQL inspection/validation middleware in `gemini_client.py` before `session.call_tool()`.
2. **[TODO - Security] Superuser Connection Credentials**:
   - The `.env.example` and `config.py` default to `CLICKHOUSE_USER=default` (full read-write/admin permissions).
   - *Fix Needed*: Create a dedicated read-only ClickHouse role/user (e.g. `abota_ro` with `GRANT SELECT ON abota.* TO abota_ro`) and configure the backend service to use those credentials.

---

## 6. Current Database Schema Status

Database Name: `abota`

### Active Tables (in `backend/scripts/seed_clickhouse.py`):
- **`box_office_metrics`**:
  - `content_id` (`String`)
  - `content_title` (`String`)
  - `daily_revenue` (`Float64`)
  - `platform` (`LowCardinality(String)`)
  - `event_date` (`Date`)
  - Engine: `MergeTree()` ORDER BY `(content_id, event_date)`

- **`streaming_activity`**:
  - `platform` (`LowCardinality(String)`)
  - `content_id` (`String`)
  - `content_title` (`String`)
  - `event_type` (`LowCardinality(String)`) – `play`, `pause`, `complete`, `drop-off`
  - `watch_duration_seconds` (`UInt32`)
  - `event_time` (`DateTime`)
  - Engine: `MergeTree()` ORDER BY `(content_id, event_time)`

- **`social_mentions`**:
  - `platform` (`LowCardinality(String)`) – `Twitter/X`, `Reddit`, `TikTok`, `Instagram`, `YouTube`
  - `content_id` (`String`)
  - `content_title` (`String`)
  - `mention_type` (`LowCardinality(String)`) – `post`, `comment`, `share`
  - `sentiment_score` (`Float32`) – Range -1.0 to 1.0
  - `raw_text` (`String`)
  - `event_time` (`DateTime`)
  - Engine: `MergeTree()` ORDER BY `(content_id, event_time)`

---

## 7. Naming & ClickHouse DDL Conventions

When adding or updating schemas and queries:
1. **Naming**:
   - Tables and columns must use `snake_case` (e.g., `box_office_metrics`, `stream_count`).
   - Dates should follow `event_date` (`Date`) or `event_timestamp` (`DateTime64(3, 'UTC')`).
2. **Data Types**:
   - Financial metrics / revenues: `Float64` or `Decimal64(2)`.
   - Counts and identifiers: `UInt32`, `UInt64`, or `UUID`.
   - Categories and strings: `LowCardinality(String)` for repeated platform/genre names; `String` for high cardinality (titles).
3. **Engines & Keys**:
   - Use `MergeTree()` or `ReplacingMergeTree()`.
   - Define primary sorting key in `ORDER BY (primary_date_col, lookup_key_col)`.
