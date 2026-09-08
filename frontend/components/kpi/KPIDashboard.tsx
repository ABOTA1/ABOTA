"use client";

import { Activity, BarChart3, Film, Loader2, MessageCircle, Users } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { DynamicTable } from "@/components/tables/DynamicTable";
import { useKpis } from "@/hooks/useKpis";
import { formatCompact, formatUSD } from "@/lib/utils";

export function KPIDashboard() {
  const { kpis, summary, loading, summaryLoading, error, summaryError } = useKpis();

  if (loading && summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border bg-card">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading KPIs...</p>
        </div>
      </div>
    );
  }

  const topMovie = kpis?.top_movies?.[0];
  const topPlatform = kpis?.platform_breakdown?.[0];
  const kpiError = error || kpis?.error;

  return (
    <div className="space-y-6">
      {summaryError && !summary ? (
        <div className="flex items-center justify-center h-32 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            Error loading house totals: {summaryError}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Revenue"
            value={summaryLoading ? "…" : formatUSD(summary?.total_revenue ?? 0)}
            subtext="All box-office revenue"
            variant="success"
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <KPICard
            label="Titles Tracked"
            value={summaryLoading ? "…" : formatCompact(summary?.total_titles ?? 0)}
            subtext="Unique content titles"
            variant="info"
            icon={<Film className="w-4 h-4" />}
          />
          <KPICard
            label="Social Mentions"
            value={summaryLoading ? "…" : formatCompact(summary?.total_mentions ?? 0)}
            subtext="Total mentions tracked"
            variant="default"
            icon={<MessageCircle className="w-4 h-4" />}
          />
          <KPICard
            label="Average Sentiment"
            value={
              summaryLoading
                ? "…"
                : summary?.average_sentiment == null
                  ? "N/A"
                  : summary.average_sentiment.toFixed(2)
            }
            subtext="Across social mentions"
            variant="warning"
            icon={<Activity className="w-4 h-4" />}
          />
          {topMovie && (
            <KPICard
              label="Top Movie"
              value={topMovie.movie_title}
              subtext={formatUSD(topMovie.total_revenue)}
              variant="info"
              icon={<BarChart3 className="w-4 h-4" />}
            />
          )}
          {topPlatform && (
            <KPICard
              label="Top Platform"
              value={topPlatform.platform}
              subtext={`${formatCompact(topPlatform.titles)} titles`}
              variant="warning"
              icon={<Users className="w-4 h-4" />}
            />
          )}
        </div>
      )}

      {kpiError ? (
        <p className="text-sm text-red-600 dark:text-red-400">Could not load ranking tables: {kpiError}</p>
      ) : null}

      {kpis?.top_movies ? (
        <DynamicTable
          title="🎬 Top Movies by Revenue"
          columns={[
            { key: "movie_title", label: "Movie Title" },
            {
              key: "total_revenue",
              label: "Revenue",
              format: (v) => formatUSD(v),
            },
          ]}
          rows={kpis.top_movies}
          maxRows={10}
        />
      ) : null}

      {kpis?.platform_breakdown ? (
        <DynamicTable
          title="📺 Platform Breakdown"
          columns={[
            { key: "platform", label: "Platform" },
            {
              key: "titles",
              label: "Titles",
              format: (v) => formatCompact(v),
            },
            {
              key: "total_revenue",
              label: "Revenue",
              format: (v) => formatUSD(v),
            },
            {
              key: "total_mentions",
              label: "Social Mentions",
              format: (v) => formatCompact(v),
            },
          ]}
          rows={kpis.platform_breakdown}
          maxRows={10}
        />
      ) : null}
    </div>
  );
}
