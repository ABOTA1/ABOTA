"use client";

// app/page.tsx – Main dashboard page
// Renders: KPI cards, box-office chart, and the agent chat panel.

import { useEffect, useState } from "react";
import { AgentChatPanel } from "@/components/chat/AgentChatPanel";
import { AnalyticsChart } from "@/components/charts/AnalyticsChart";
import { BoxOfficeChart } from "@/components/charts/BoxOfficeChart";
import { PlatformShareChart } from "@/components/charts/PlatformShareChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Box Office – Top Movies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpis?.top_movies?.length ? (
                  <BoxOfficeChart data={kpis.top_movies} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    {loading ? "Loading data…" : "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Mentions trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpis?.mentions_trend?.length ? (
                  <TrendChart
                    series={[
                      {
                        name: "Mentions",
                        data: kpis.mentions_trend.map((point) => ({
                          label: point.label,
                          value: point.mentions,
                        })),
                      },
                    ]}
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    {loading ? "Loading data…" : "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Social share / streaming platforms
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpis?.platform_breakdown?.length ? (
                  <PlatformShareChart data={kpis.platform_breakdown} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    {loading ? "Loading data…" : "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {agentAnalytics?.title || "Agent Chart"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentAnalytics?.series?.length ? (
                  <AnalyticsChart analytics={agentAnalytics} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Ask the agent a question to populate this chart.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Top movies</CardTitle>
              <CardDescription>Revenue ranking from the latest KPI snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Movie</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Mentions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : kpis?.top_movies?.length ? (
                    kpis.top_movies.map((movie) => (
                      <TableRow key={movie.movie_title}>
                        <TableCell className="font-medium">{movie.movie_title}</TableCell>
                        <TableCell className="text-right">{formatUSD(movie.total_revenue)}</TableCell>
                        <TableCell className="text-right">
                          {movie.total_mentions != null ? formatCompact(movie.total_mentions) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
