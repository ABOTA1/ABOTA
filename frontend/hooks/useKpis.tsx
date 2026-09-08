"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchKpis, fetchMetricsSummary } from "@/lib/api";
import type { KpiSnapshot, MetricsSummary } from "@/types/analytics";

interface KpiContextValue {
  kpis: KpiSnapshot | null;
  summary: MetricsSummary | null;
  loading: boolean;
  error: string | null;
}

const KpiContext = createContext<KpiContextValue | null>(null);

export function KpiProvider({ children }: { children: ReactNode }) {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([fetchKpis(), fetchMetricsSummary()]).then(([kpiRes, summaryRes]) => {
      if (cancelled) return;

      if (kpiRes.status === "fulfilled") {
        if (kpiRes.value.error) setError(kpiRes.value.error);
        setKpis(kpiRes.value);
      } else {
        setError(kpiRes.reason instanceof Error ? kpiRes.reason.message : String(kpiRes.reason));
      }

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ kpis, summary, loading, error }),
    [kpis, summary, loading, error],
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
