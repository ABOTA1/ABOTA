# Deploy the ABOTA dashboard on Vercel

The FastAPI Agent stays on Railway. Vercel only hosts Next.js.

Do **not** point Vercel at `*.railway.internal`. That hostname only works inside Railway. Use the public API domain.

## 1. Railway API (already running)

Confirm:

`https://acceptable-laughter-production-4884.up.railway.app/api/health`

Add this backend variable (or rely on the `*.vercel.app` CORS regex):

```text
CORS_ORIGINS=https://<your-app>.vercel.app
```

Redeploy the backend after changing CORS.

## 2. Vercel project

1. [vercel.com/new](https://vercel.com/new) → Import `ABOTA1/ABOTA`.
2. **Root Directory** = `frontend`.
3. Framework Preset = Next.js.
4. Branch = `cursor/railway-deploy-0f80`.
5. Environment variable (Production + Preview):

```text
NEXT_PUBLIC_API_URL=https://acceptable-laughter-production-4884.up.railway.app
```

Leave `BACKEND_INTERNAL_URL` unset. The browser talks to Railway directly, so the Agent is not limited by Vercel’s 10s Hobby function timeout.

6. Deploy. The site URL is `https://<project>.vercel.app`.

## 3. Check

- Dashboard loads (Overview KPIs).
- `/agent` can ask a question (30–90s is normal).
- If the browser console shows a CORS error, set `CORS_ORIGINS` on Railway to the exact Vercel origin and redeploy the API.
