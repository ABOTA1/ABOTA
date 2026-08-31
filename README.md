# ABOTA – Agentic Box-Office & Trend Analytics

> **Hackathon project** – AI agent powered by **Gemini** (Function Calling) + **ClickHouse Cloud** via **mcp-clickhouse** for real-time media analytics.

---

## Architecture

```
User ─▶ Next.js Dashboard ─▶ FastAPI /api/chat
                                  │
                             Gemini Agent
                          (Function Calling)
                                  │
                         [Model Context Protocol]
                         stdio_client (subprocess)
                                  │
                       mcp-clickhouse (MCP Server)
                                  │
                         ClickHouse Cloud (DB)
```

---

## How the team runs this project

**Use Docker.** That way every machine installs the same Python and Node dependencies (from `backend/requirements.txt` and `frontend/package-lock.json`) and we avoid "it worked on my computer".

You do **not** need a local venv or a global `npm install` for day-to-day work.

### Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- A [Gemini API key](https://aistudio.google.com/app/apikey)
- A **ClickHouse Cloud** instance

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/ABOTA1/ABOTA.git
   cd ABOTA
   ```

2. **Configure secrets** (this file is gitignored)
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set:
   - `GEMINI_API_KEY=your_key_here`
   - `CLICKHOUSE_HOST=your-instance.clickhouse.cloud`
   - `CLICKHOUSE_PASSWORD=your_cloud_password_here`

3. **Launch backend + frontend**
   ```bash
   docker compose up --build
   ```
   The backend image installs `backend/requirements.txt`. The frontend image runs `npm ci` from `frontend/package-lock.json`.

4. **Seed ClickHouse once**
   ```bash
   docker compose run --rm seed
   ```
   Safe to re-run: it skips if data already exists. Use `docker compose run --rm seed python -m scripts.seed_clickhouse --force` only if you want another batch.

5. **Open the dashboard**
   [http://localhost:3000](http://localhost:3000)  
   API health: [http://localhost:8000/api/health](http://localhost:8000/api/health)

Stop with `Ctrl+C`, or `docker compose down`.

`mcp-clickhouse` runs inside the backend container as an MCP stdio subprocess. It does not need its own service.

---

## Optional: local venv (only if you cannot use Docker)

Same packages as Docker, pinned in `backend/requirements.txt`:

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in secrets
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (Node 20):

```bash
cd frontend
npm ci
cp .env.local.example .env.local
npm run dev
```

---

## Technical Highlights
*   **100% compliant with Hackathon tracks:** Uses `google-genai` for the AI layer and the official `mcp-clickhouse` server over the Model Context Protocol to query the database.
*   **Fully Asynchronous Backend:** Gemini calls the MCP server completely async to ensure performance on the API layer.
*   **ClickHouse Cloud Ready:** Uses native secure connectivity on port 8443 for modern deployments.

## License

MIT
