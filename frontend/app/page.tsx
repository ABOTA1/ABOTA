"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BarChart2, MessageSquare, Table2, PieChart, LineChart } from "lucide-react";
import { AgentChatPanel } from "@/components/chat/AgentChatPanel";
import { AnalyticsChart } from "@/components/charts/AnalyticsChart";
import { BoxOfficeChart } from "@/components/charts/BoxOfficeChart";
import { PlatformShareChart } from "@/components/charts/PlatformShareChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/layout/EmptyState";
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
import { useKpis } from "@/hooks/useKpis";
import { formatUSD, formatCompact } from "@/lib/utils";
import type { AnalyticsResult } from "@/types/analytics";

export default function DashboardPage() {
  const { kpis, loading, error } = useKpis();
  const [agentAnalytics, setAgentAnalytics] = useState<AnalyticsResult | null>(null);

  useEffect(() => {
    if (!agentAnalytics) return;
    if (window.matchMedia("(max-width: 1279px)").matches) {
      document.getElementById("agent-chart")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [agentAnalytics]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-6">
          <section id="kpis" className="scroll-mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <KpiCard
              label="Top Movie Revenue"
              value={
                loading
                  ? "Loading…"
                  : kpis?.top_movies?.[0]
                  ? formatUSD(kpis.top_movies[0].total_revenue)
                  : "N/A"
              }
              sub={kpis?.top_movies?.[0]?.movie_title ?? (error ? "Could not load KPIs" : "")}
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
                  : kpis?.platform_breakdown?.length
                  ? formatCompact(
                      kpis.platform_breakdown.reduce((s, p) => s + p.total_mentions, 0) /
                        kpis.platform_breakdown.length,
                    )
                  : "N/A"
              }
              sub="Per platform"
            />
            <KpiCard
              label="Agent queries"
              value={agentAnalytics ? "Updated" : "Waiting"}
              sub={agentAnalytics ? "Chart synced from chat" : "Ask anything in chat"}
            />
          </section>

          <section id="charts" className="scroll-mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Box Office – Top Movies">
              {kpis?.top_movies?.length ? (
                <div className="h-[220px] sm:h-[260px] w-full min-w-0">
                  <BoxOfficeChart data={kpis.top_movies} />
                </div>
              ) : (
                <EmptyState
                  icon={BarChart2}
                  title={loading ? "Loading box office…" : "No box-office data"}
                  description={
                    error
                      ? "The KPI snapshot could not be loaded. Check the API and try again."
                      : "Seed ClickHouse to see top-movie revenue bars here."
                  }
                />
              )}
            </ChartCard>

            <ChartCard title="Mentions trend">
              {kpis?.mentions_trend?.length ? (
                <div className="h-[220px] sm:h-[260px] w-full min-w-0">
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
                </div>
              ) : (
                <EmptyState
                  icon={LineChart}
                  title={loading ? "Loading mentions…" : "No mentions trend"}
                  description="Weekly social volume appears here once the snapshot includes mentions_trend."
                />
              )}
            </ChartCard>

            <ChartCard title="Social share / streaming platforms" className="lg:col-span-2">
              {kpis?.platform_breakdown?.length ? (
                <div className="h-[220px] sm:h-[260px] w-full min-w-0 max-w-xl mx-auto">
                  <PlatformShareChart data={kpis.platform_breakdown} />
                </div>
              ) : (
                <EmptyState
                  icon={PieChart}
                  title={loading ? "Loading platforms…" : "No platform share"}
                  description="Streaming and theatrical mix shows up here after a successful KPI fetch."
                />
              )}
            </ChartCard>
          </section>

          <section id="data" className="scroll-mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Top movies</CardTitle>
                <CardDescription>Revenue ranking from the latest KPI snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <EmptyState icon={Table2} title="Loading table…" description="Fetching the KPI snapshot." />
                ) : kpis?.top_movies?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Movie</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Mentions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kpis.top_movies.map((movie) => (
                          <TableRow key={movie.movie_title}>
                            <TableCell className="font-medium">{movie.movie_title}</TableCell>
                            <TableCell className="text-right">{formatUSD(movie.total_revenue)}</TableCell>
                            <TableCell className="text-right">
                              {movie.total_mentions != null ? formatCompact(movie.total_mentions) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState
                    icon={Table2}
                    title="No rows to show"
                    description={
                      error
                        ? "The table stays empty until /api/kpis responds."
                        : "Seed the database to populate this ranking."
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <aside className="mt-6 xl:mt-0 xl:sticky xl:top-4 min-w-0 space-y-4">
          <Card id="agent-chart" className="scroll-mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {agentAnalytics?.title || "Agent chart"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentAnalytics?.series?.length ? (
                <div className="h-[220px] sm:h-[280px] w-full min-w-0">
                  <AnalyticsChart analytics={agentAnalytics} />
                </div>
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="Waiting for a question"
                  description="This chart stays empty until the agent returns analytics. Ask about box office, mentions, or platforms."
                >
                  <a
                    href="#chat"
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    Go to chat
                  </a>
                </EmptyState>
              )}
            </CardContent>
          </Card>

          <section id="chat" className="scroll-mt-4">
            <AgentChatPanel
              onAnalytics={setAgentAnalytics}
              className="h-[min(36rem,calc(100dvh-8rem))] xl:h-[min(36rem,calc(100dvh-22rem))]"
            />
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5">
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
