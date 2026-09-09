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

2. **Configure secrets** (`backend/.env` is gitignored and will not be pushed)
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set:
   - `GEMINI_API_KEY=your_key_here`
   - `CLICKHOUSE_HOST=your-instance.clickhouse.cloud`
   - `CLICKHOUSE_PASSWORD=your_cloud_password_here`

3. **Launch backend + frontend + one-shot Cloud seed**
   ```bash
   docker compose up --build
   ```
   The backend image installs `backend/requirements.txt`. The frontend image runs `npm ci` from `frontend/package-lock.json`.

   The `seed` service talks to **ClickHouse Cloud** (there is no local `clickhouse-server`). It creates `content_catalog`, `box_office_metrics`, `streaming_activity`, and `social_mentions`, then exits. Safe to re-run: it skips fact inserts if data already exists.

   To insert another fact batch (and refresh the catalog):
   ```bash
   docker compose run --rm seed python -m scripts.seed_clickhouse --force
   ```

4. **Open the dashboard**
   [http://localhost:3000](http://localhost:3000)

   The browser talks only to port 3000. Next.js proxies `/api/*` to FastAPI so Windows/Brave does not hit `localhost:8000` over IPv6 (that often shows as `net::ERR_EMPTY_RESPONSE` / `TypeError: Failed to fetch`).

   Direct API health (use IPv4, not `localhost`, if Docker Desktop is involved):
   [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Troubleshooting: frontend crash `exec docker-entrypoint.sh: no such file or directory`

Windows Git may save `frontend/docker-entrypoint.sh` with CRLF. Alpine cannot run that file. Pull this repo (`.gitattributes` keeps `.sh` as LF) and rebuild without cache:

```bash
docker compose build --no-cache frontend
docker compose up
```

### Troubleshooting: "Error connecting to the agent" / Failed to fetch

1. Confirm **both** containers are up: `docker compose ps` — `abota_backend` must be healthy and `abota_frontend` must be running (not restarting).
2. Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) (not `http://localhost:8000` on Windows).
3. Pull the latest `main` so the dashboard uses same-origin `/api` instead of calling `:8000` from the browser.
4. If you previously set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`, remove that line and restart `npm run dev`.

Stop with `Ctrl+C`, or `docker compose down`.

`mcp-clickhouse` is installed in the **backend image** and spawned per chat request as an MCP stdio subprocess against ClickHouse Cloud (HTTPS 8443, `CLICKHOUSE_VERIFY=true`). It is not a separate Compose service. The `seed` service uses `clickhouse-connect` only for DDL/INSERT; the agent never queries Cloud except through MCP.

---

## Deploy on Railway

If Railway shows **Railpack could not determine how to build the app**, the service is scanning the repo root. Follow **[RAILWAY.md](./RAILWAY.md)** section 0 (two services, Docker, no `start.sh`).

Step-by-step (service names, env vars, private networking): **[RAILWAY.md](./RAILWAY.md)**.

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
