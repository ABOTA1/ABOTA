"use client";

import { useEffect, useState } from "react";
import { fetchKpis } from "@/lib/api";
import type { KpiSnapshot } from "@/types/analytics";

export function useKpis() {
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

  return { kpis, loading, error };
}
