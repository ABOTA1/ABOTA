// lib/api.ts – Typed fetch client for the FastAPI backend.

import type { ChatResponse, KpiSnapshot } from "@/types/analytics";

/**
 * Browser calls stay same-origin (`/api/...`) by default.
 * Next.js proxies those paths to FastAPI (see app/api/[...path]/route.ts).
 *
 * Direct `http://localhost:8000` is ignored: on Windows, Brave often resolves
 * localhost to IPv6 (::1) while Docker/uvicorn only listen on IPv4, which
 * surfaces as net::ERR_EMPTY_RESPONSE / TypeError: Failed to fetch.
 */
function resolveApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw);
    const isLocalBackend =
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.port === "8000" || url.port === "");
    if (isLocalBackend) {
      return "";
    }
  } catch {
    return raw.replace(/\/$/, "");
  }
  return raw.replace(/\/$/, "");
}

const API_URL = resolveApiUrl();

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { error?: string; detail?: string };
    return json.error || json.detail || text;
  } catch {
    return text;
  }
}

/**
 * Send a natural-language question to the Gemini agent.
 * Returns a structured ChatResponse with an answer and optional analytics.
 */
export async function askAgent(question: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(`Agent API error ${res.status}: ${await readError(res)}`);
  }

  return res.json() as Promise<ChatResponse>;
}

/**
 * Fetch pre-computed KPI snapshot for the initial dashboard load.
 * No agent call – fast direct ClickHouse query.
 */
export async function fetchKpis(): Promise<KpiSnapshot> {
  const res = await fetch(`${API_URL}/api/kpis`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`KPI API error ${res.status}: ${await readError(res)}`);
  }

  return res.json() as Promise<KpiSnapshot>;
}
