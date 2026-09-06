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
      <div className="mx-auto max-w-[1760px] p-4 sm:p-5 xl:flex xl:h-[calc(100dvh-3.5rem)] xl:gap-6 xl:overflow-hidden xl:p-6">
        <div className="min-w-0 flex-1 space-y-5 xl:overflow-y-auto xl:pr-1">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Live analytics</h1>
            <p className="text-sm text-muted-foreground">
              Box office, streaming, and social sentiment from ClickHouse Cloud.
            </p>
          </div>

          <section id="kpis" className="scroll-mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Top movie revenue"
              loading={loading}
              value={
                kpis?.top_movies?.[0]
                  ? formatUSD(kpis.top_movies[0].total_revenue)
                  : "—"
              }
              sub={kpis?.top_movies?.[0]?.movie_title ?? (error ? "Could not load KPIs" : "Highest title")}
            />
            <KpiCard
              label="Platforms"
              loading={loading}
              value={String(kpis?.platform_breakdown?.length ?? 0)}
              sub="Streaming + theaters"
            />
            <KpiCard
              label="Avg. social mentions"
              loading={loading}
              value={
                kpis?.platform_breakdown?.length
                  ? formatCompact(
                      kpis.platform_breakdown.reduce((s, p) => s + p.total_mentions, 0) /
                        kpis.platform_breakdown.length,
                    )
                  : "—"
              }
              sub="Per platform"
            />
            <KpiCard
              label="Agent chart"
              value={agentAnalytics ? "Synced" : "Ready"}
              sub={agentAnalytics ? "Updated from last question" : "Ask in the agent panel"}
            />
          </section>

          <section id="charts" className="scroll-mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">
            <ChartCard title="Box office" description="Top titles by total revenue">
              {kpis?.top_movies?.length ? (
                <div className="h-[220px] sm:h-[240px] xl:h-[260px] w-full min-w-0">
                  <BoxOfficeChart data={kpis.top_movies} />
                </div>
              ) : (
                <EmptyState
                  icon={BarChart2}
                  title={loading ? "Loading box office" : "No box-office data"}
                  description={
                    error
                      ? "The KPI snapshot could not be loaded. Check the API and try again."
                      : "Seed ClickHouse to see top-movie revenue here."
                  }
                />
              )}
            </ChartCard>

            <ChartCard title="Mentions trend" description="Weekly social volume">
              {kpis?.mentions_trend?.length ? (
                <div className="h-[220px] sm:h-[240px] xl:h-[260px] w-full min-w-0">
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
                  title={loading ? "Loading mentions" : "No mentions trend"}
                  description="Weekly social volume appears here once the snapshot includes mentions."
                />
              )}
            </ChartCard>

            <ChartCard
              title="Platform mix"
              description="Revenue share across theatrical and streaming"
              className="lg:col-span-2"
            >
              {kpis?.platform_breakdown?.length ? (
                <div className="h-[220px] sm:h-[240px] xl:h-[260px] w-full min-w-0 max-w-xl mx-auto">
                  <PlatformShareChart data={kpis.platform_breakdown} />
                </div>
              ) : (
                <EmptyState
                  icon={PieChart}
                  title={loading ? "Loading platforms" : "No platform share"}
                  description="Streaming and theatrical mix shows up after a successful KPI fetch."
                />
              )}
            </ChartCard>
          </section>

          <section id="data" className="scroll-mt-4 pb-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold tracking-tight">Top movies</CardTitle>
                <CardDescription>Revenue ranking with genre and origin country</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <EmptyState icon={Table2} title="Loading table" description="Fetching the KPI snapshot." />
                ) : kpis?.top_movies?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Movie</TableHead>
                          <TableHead>Genre</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Mentions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kpis.top_movies.map((movie) => (
                          <TableRow key={movie.movie_title}>
                            <TableCell className="font-medium">{movie.movie_title}</TableCell>
                            <TableCell>{movie.genre ?? "—"}</TableCell>
                            <TableCell>{movie.country ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatUSD(movie.total_revenue)}</TableCell>
                            <TableCell className="text-right tabular-nums">
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

        <aside className="mt-6 flex min-h-0 w-full min-w-0 flex-col gap-4 xl:mt-0 xl:h-full xl:w-[26rem] xl:shrink-0">
          <Card id="agent-chart" className="scroll-mt-4 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold tracking-tight">
                {agentAnalytics?.title || "Agent result"}
              </CardTitle>
              {!agentAnalytics ? (
                <CardDescription>Chart fills in after you ask a question</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {agentAnalytics?.series?.length ? (
                <div className="h-[200px] sm:h-[220px] xl:h-[240px] w-full min-w-0">
                  <AnalyticsChart analytics={agentAnalytics} />
                </div>
              ) : (
                <EmptyState
                  className="min-h-[10rem] py-6"
                  icon={MessageSquare}
                  title="Waiting for a question"
                  description="Ask about box office, mentions, or platforms."
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

          <section id="chat" className="scroll-mt-4 flex min-h-[24rem] flex-1 flex-col xl:min-h-0">
            <AgentChatPanel
              onAnalytics={setAgentAnalytics}
              className="h-full min-h-[24rem] xl:min-h-0"
            />
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
}) {
  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        {loading ? (
          <div className="mt-1 h-8 w-28 animate-pulse rounded-md bg-muted" />
        ) : (
          <CardTitle className="text-2xl tabular-nums tracking-tight">{value}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
