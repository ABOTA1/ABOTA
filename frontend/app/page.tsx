"use client";

// app/page.tsx – Main dashboard page
// Renders: KPI cards, box-office chart, and the agent chat panel.

import { useEffect, useState } from "react";
import { AgentChatPanel } from "@/components/chat/AgentChatPanel";
import { BoxOfficeChart } from "@/components/charts/BoxOfficeChart";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchKpis } from "@/lib/api";
import { formatUSD, formatCompact } from "@/lib/utils";
import type { KpiSnapshot, AnalyticsResult } from "@/types/analytics";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [agentAnalytics, setAgentAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Top Movie Revenue"
              value={
                loading
                  ? "Loading…"
                  : kpis?.top_movies?.[0]
                  ? formatUSD(kpis.top_movies[0].total_revenue)
                  : "N/A"
              }
              sub={kpis?.top_movies?.[0]?.movie_title ?? ""}
            />
            <KpiCard
              label="Total Platforms"
              value={loading ? "Loading…" : String(kpis?.platform_breakdown?.length ?? 0)}
              sub="Streaming + Theaters"
            />
            <KpiCard
              label="Avg Social Mentions"
              value={
                loading
                  ? "Loading…"
                  : kpis?.platform_breakdown
                  ? formatCompact(
                      kpis.platform_breakdown.reduce((s, p) => s + p.total_mentions, 0) /
                        (kpis.platform_breakdown.length || 1)
                    )
                  : "N/A"
              }
              sub="Per platform"
            />
            {/* TODO: Add a 4th real KPI (e.g. trending score, forecast) */}
            <KpiCard label="Agent Queries" value="Ready" sub="Ask anything below" />
          </section>

          {/* ── Charts ────────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                Box Office – Top Movies
              </h2>
              {kpis?.top_movies ? (
                <BoxOfficeChart data={kpis.top_movies} />
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  {loading ? "Loading data…" : "No data available"}
                </div>
              )}
            </div>

            {/* Agent-driven chart: updates when the agent returns analytics */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {agentAnalytics?.title ?? "Agent Chart"}
              </h2>
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
            </div>
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

// ── KPI Card sub-component ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
