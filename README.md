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

## ⚡ Quick Start (< 15 min from `git clone`)

### Prerequisites
- Docker & Docker Compose
- A [Gemini API key](https://aistudio.google.com/app/apikey)
- A **ClickHouse Cloud** instance ($400 free credits available)

---

### Setup Instructions

1. **Clone the repo**
   ```bash
   git clone https://github.com/ABOTA1/ABOTA.git
   cd ABOTA
   ```

2. **Configure secrets**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set:
   - `GEMINI_API_KEY=your_key_here`
   - `CLICKHOUSE_HOST=your-instance.clickhouse.cloud`
   - `CLICKHOUSE_PASSWORD=your_cloud_password_here`

3. **Launch the stack (FastAPI + Next.js)**
   ```bash
   docker compose up --build
   ```
   *(Note: The `mcp-clickhouse` server runs automatically inside the backend container as an MCP stdio subprocess).*

4. **Seed the database (Run once in a new terminal)**
   ```bash
   docker exec abota_backend python -m scripts.seed_clickhouse
   ```

5. **Open the dashboard**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Technical Highlights
*   **100% compliant with Hackathon tracks:** Uses `google-genai` for the AI layer and the official `mcp-clickhouse` server over the Model Context Protocol to query the database.
*   **Fully Asynchronous Backend:** Gemini calls the MCP server completely async to ensure performance on the API layer.
*   **ClickHouse Cloud Ready:** Uses native secure connectivity on port 8443 for modern deployments.

## License

MIT
probando