# ABOTA – Agentic Box-Office & Trend Analytics

> **Hackathon project** – AI agent powered by **Gemini** (Function Calling) + **ClickHouse** for real-time media analytics.

---

## Architecture

```
User ─▶ Next.js Dashboard ─▶ FastAPI /api/chat
                                  │
                             Gemini Agent
                          (Function Calling)
                                  │
                          query_clickhouse()
                                  │
                            ClickHouse DB
                                  │
                      Structured response (Pydantic)
                                  │
                       ◀─ Dashboard charts & insights
```

---

## ⚡ Quick Start (< 15 min from `git clone`)

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local dev without Docker)
- Node.js 20+ (for local frontend dev)
- A [Gemini API key](https://aistudio.google.com/app/apikey)

---

### Option A – Docker Compose (recommended for hackathon)

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd ABOTA

# 2. Configure secrets
cp backend/.env.example backend/.env
# Edit backend/.env and set GEMINI_API_KEY=your_key_here

# 3. Launch everything
docker compose up --build

# 4. Seed the database (run once in a new terminal)
docker exec abota_backend python -m scripts.seed_clickhouse

# 5. Open the dashboard
open http://localhost:3000
```

---

### Option B – Local development

#### Backend

```bash
cd backend

# Create & activate virtualenv
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and ClickHouse credentials

# Seed the database (requires ClickHouse running)
python -m scripts.seed_clickhouse

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

Dashboard available at: http://localhost:3000

#### ClickHouse (standalone)

```bash
docker run -d \
  --name abota_clickhouse \
  -p 8123:8123 -p 9000:9000 \
  -e CLICKHOUSE_DB=abota \
  clickhouse/clickhouse-server:24.6
```

---

## Project Structure

```
ABOTA/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Pydantic Settings
│   │   ├── api/routes/
│   │   │   ├── chat.py          # POST /api/chat  GET /api/kpis
│   │   │   └── health.py        # GET /api/health
│   │   ├── agent/
│   │   │   ├── gemini_client.py # Gemini reasoning loop
│   │   │   ├── tools.py         # Function declarations
│   │   │   └── prompts.py       # System prompts
│   │   ├── db/
│   │   │   ├── clickhouse_client.py
│   │   │   └── queries.py
│   │   ├── models/schemas.py    # Pydantic request/response models
│   │   └── services/analytics_service.py
│   ├── scripts/seed_clickhouse.py
│   └── tests/test_health.py
│
├── frontend/
│   ├── app/page.tsx             # Main dashboard
│   ├── components/
│   │   ├── charts/              # Recharts visualisations
│   │   ├── chat/AgentChatPanel.tsx
│   │   └── layout/
│   ├── lib/api.ts               # Typed backend client
│   └── types/analytics.ts      # TypeScript interfaces
│
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Endpoint     | Description                            |
|--------|-------------|----------------------------------------|
| GET    | /api/health  | Liveness probe                         |
| POST   | /api/chat    | Send a question to the Gemini agent    |
| GET    | /api/kpis    | Pre-computed KPI snapshot (fast)       |

### Example – Chat request

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the top 5 movies by box-office revenue?"}'
```

---

## Running Tests

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

---

## TODO for Hackathon

- [ ] Add real business queries to `db/queries.py`
- [ ] Refine the system prompt in `agent/prompts.py` with your real table schemas
- [ ] Add more tool declarations in `agent/tools.py`
- [ ] Build out additional dashboard pages (Trends, Platform comparison)
- [ ] Add streaming response support to the chat endpoint
- [ ] Wire `TrendChart` component to line-chart agent responses

---

## Team

<!-- TODO: Add your team members here -->

## License

MIT
