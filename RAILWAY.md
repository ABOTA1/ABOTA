# Deploy ABOTA on Railway

Two services in **one** Railway project, same GitHub repo. ClickHouse Cloud and Gemini stay as they are — do not add a Railway database.

Name the services exactly `backend` and `frontend` so the variable references below resolve.

## 1. New project

1. [railway.com/new](https://railway.com/new) → **Deploy from GitHub repo** → `ABOTA1/ABOTA`.
2. Empty the first auto-created service or skip it. Add two services from the **same** repo:
   - **backend** → Settings → Root Directory = `backend`
   - **frontend** → Settings → Root Directory = `frontend`
3. Each folder has a `railway.toml` that selects the Dockerfile (`Dockerfile` vs `Dockerfile.prod`).

## 2. Backend variables

Service **backend** → Variables. Copy from `backend/.env` (never commit that file).

```text
GEMINI_API_KEY=<your key>
GEMINI_MODEL=gemini-3.8-flash
CLICKHOUSE_HOST=<your-instance.clickhouse.cloud>
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=<cloud password>
CLICKHOUSE_SECURE=true
CLICKHOUSE_VERIFY=true
CLICKHOUSE_DATABASE=abota
CLICKHOUSE_QUERY_TIMEOUT=15
APP_ENV=production
PORT=8000
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

## 3. Frontend variables

Service **frontend** → Variables:

```text
PORT=3000
BACKEND_INTERNAL_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
```

Leave `NEXT_PUBLIC_API_URL` **unset**. The browser calls same-origin `/api`; Next.js proxies to FastAPI on the private network.

## 4. Networking

1. **frontend** → Settings → **Generate domain**. That URL is the public app.
2. Do **not** generate a public domain on **backend** unless you want to hit `/api/health` from outside. The Agent must stay on the private URL.
3. Deploy both services.

## 5. Check

- `https://<frontend>.up.railway.app` — dashboard
- `https://<frontend>.up.railway.app/api/health` — proxied FastAPI (`mcp_clickhouse` should be `"installed"`)
- Agent chat — first question can take 30–90s (Gemini + MCP spawn)

Seed is optional if ClickHouse Cloud already has `abota` data from local `docker compose`. To re-seed from your laptop:

```bash
cd backend
python -m scripts.seed_clickhouse
```

## 6. Chat timeouts

The Next.js proxy allows **300s**. If Railway still cuts the Agent, raise the backend service timeout in Settings (HTTP). Do not put the FastAPI Agent on a serverless function.
