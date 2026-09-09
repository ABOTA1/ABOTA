"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchKpis, fetchMetricsSummary } from "@/lib/api";
import type { KpiSnapshot, MetricsSummary } from "@/types/analytics";

interface KpiContextValue {
  kpis: KpiSnapshot | null;
  summary: MetricsSummary | null;
  loading: boolean;
  summaryLoading: boolean;
  error: string | null;
  summaryError: string | null;
}

const KpiContext = createContext<KpiContextValue | null>(null);

export function KpiProvider({ children }: { children: ReactNode }) {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchKpis()
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        setKpis(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetchMetricsSummary()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setSummaryError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSummary(null);
        setSummaryError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ kpis, summary, loading, summaryLoading, error, summaryError }),
    [kpis, summary, loading, summaryLoading, error, summaryError],
  );

  return <KpiContext.Provider value={value}>{children}</KpiContext.Provider>;
}

export function useKpis() {
  const ctx = useContext(KpiContext);
  if (!ctx) {
    throw new Error("useKpis must be used within KpiProvider");
  }
  return ctx;
}
