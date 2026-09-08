"use client";

// app/page.tsx – Main dashboard page
// Renders: KPI cards, box-office chart, and the agent chat panel.

import { useEffect, useState } from "react";
import { AgentChatPanel } from "@/components/chat/AgentChatPanel";
import { BoxOfficeChart } from "@/components/charts/BoxOfficeChart";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { KPIDashboard } from "@/components/kpi/KPIDashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import { fetchKpis } from "@/lib/api";
import type { AnalyticsResult, KpiSnapshot } from "@/types/analytics";

export default function DashboardPage() {
  const [agentAnalytics, setAgentAnalytics] = useState<AnalyticsResult | null>(null);
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis()
      .then(setKpis)
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* ── KPI Dashboard with Cards & Tables ─────────────────────────── */}
          <section>
            <KPIDashboard />
          </section>

          {/* ── Charts ────────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Box Office – Top Movies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpis?.top_movies ? (
                  <BoxOfficeChart data={kpis.top_movies} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    {loading ? "Loading data…" : "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent-driven chart: updates when the agent returns analytics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {agentAnalytics?.title ?? "Agent Chart"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentAnalytics?.series?.length ? (
                  <BoxOfficeChart
                    data={agentAnalytics.series[0].data.map((p) => ({
                      movie_title: p.label,
                      total_revenue: p.value,
                    }))}
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Ask the agent a question to populate this chart.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── Agent Chat ────────────────────────────────────────────────── */}
          <section>
            <AgentChatPanel onAnalytics={setAgentAnalytics} />
          </section>
        </main>
      </div>
    </div>
  );
}
