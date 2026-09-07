"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchKpis } from "@/lib/api";
import type { KpiSnapshot } from "@/types/analytics";

interface KpiContextValue {
  kpis: KpiSnapshot | null;
  loading: boolean;
  error: string | null;
}

const KpiContext = createContext<KpiContextValue | null>(null);

export function KpiProvider({ children }: { children: ReactNode }) {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKpis()
      .then((data) => {
        if (data.error) setError(data.error);
        setKpis(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({ kpis, loading, error }), [kpis, loading, error]);

  return <KpiContext.Provider value={value}>{children}</KpiContext.Provider>;
}

export function useKpis() {
  const ctx = useContext(KpiContext);
  if (!ctx) {
    throw new Error("useKpis must be used within KpiProvider");
  }
  return ctx;
}
