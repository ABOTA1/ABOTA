// lib/api.ts – Typed fetch client for the FastAPI backend.

import type {
  ChatResponse,
  KpiSnapshot,
  MetricsSummary,
} from "@/types/analytics";

/**
 * Send a natural-language question to the Gemini agent.
 * Returns a structured ChatResponse with an answer and optional analytics.
 */
export async function askAgent(question: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
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
  const res = await fetch("/api/kpis", {
    // TODO: Add revalidation strategy when deploying (e.g. next: { revalidate: 60 })
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KPI API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<KpiSnapshot>;
}

/**
 * Fetch aggregate metrics for the dashboard KPI cards.
 * No agent call – direct ClickHouse aggregation in the backend.
 */
export async function fetchMetricsSummary(): Promise<MetricsSummary> {
  const res = await fetch("/api/metrics/summary", {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Metrics summary API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<MetricsSummary>;
}
