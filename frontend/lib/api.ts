// lib/api.ts – Typed fetch client for the FastAPI backend.

import type { ChatResponse, KpiSnapshot } from "@/types/analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    const text = await res.text();
    throw new Error(`Agent API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<ChatResponse>;
}

/**
 * Fetch pre-computed KPI snapshot for the initial dashboard load.
 * No agent call – fast direct ClickHouse query.
 */
export async function fetchKpis(): Promise<KpiSnapshot> {
  const res = await fetch(`${API_URL}/api/kpis`, {
    // TODO: Add revalidation strategy when deploying (e.g. next: { revalidate: 60 })
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KPI API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<KpiSnapshot>;
}
