# Deploy ABOTA on Railway

ABOTA is a **monorepo**. One GitHub service with Root Directory `/` cannot be built by Railpack: there is no `package.json` or `requirements.txt` at the repo root. That is the error `Railpack could not determine how to build the app` plus `Script start.sh not found`.

You need **two services** in the **same** project, branch `cursor/railway-deploy-0f80` (or `Endpoints` after merge). Name them `backend` and `frontend`.

## 0. Fix the failed `ABOTA` service (do this first)

On the service that already failed:

1. **Settings → Source** → branch with this Dockerfile (not an old `Endpoints`/`main` without the root `Dockerfile`).
2. **Settings → Build** → Builder = **Dockerfile** (not Railpack). Dockerfile path = `Dockerfile`. Root Directory = empty or `/`.
3. **Settings → Deploy → Custom Start Command** → **clear it**. Do not use `start.sh`. The image `CMD` already runs uvicorn.
4. Rename the service to **`backend`**.
5. Add variables (section 2 below) and redeploy.

Then **+ New → GitHub Repo** (same repo) for **`frontend`**:

1. **Settings → Root Directory** = `frontend`
2. **Settings → Config File** = `/frontend/railway.toml` (required so it does not inherit the root `railway.toml`, which builds the API)
3. Builder = Dockerfile, Dockerfile path = `Dockerfile`
4. **Generate domain** on **frontend** only
5. Variables in section 3

## 1. Why two services

| Service | Root Directory | Config file | What it runs |
|---|---|---|---|
| `backend` | `/` (default) | `/railway.toml` | FastAPI + `mcp-clickhouse` |
| `frontend` | `frontend` | `/frontend/railway.toml` | Next.js standalone |

ClickHouse Cloud and Gemini stay external. Do not add a Railway database.

## 2. Backend variables

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

```text
PORT=3000
BACKEND_INTERNAL_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
```

Leave `NEXT_PUBLIC_API_URL` **unset**.

## 4. Check

- `https://<frontend>.up.railway.app` — dashboard
- `https://<frontend>.up.railway.app/api/health` — `"mcp_clickhouse": "installed"`
- Agent chat — first question can take 30–90s

Seed is optional if Cloud already has `abota` data:

```bash
cd backend
python -m scripts.seed_clickhouse
```

## 5. Chat timeouts

The Next.js proxy allows **300s**. Raise the backend HTTP timeout in Railway if the Agent is cut off.
