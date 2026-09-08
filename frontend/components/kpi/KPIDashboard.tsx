"use client";

import { useState, useEffect } from "react";
import { Activity, BarChart3, Film, Loader2, MessageCircle, Users } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { DynamicTable } from "@/components/tables/DynamicTable";
import { fetchKpis, fetchMetricsSummary } from "@/lib/api";
import type { KpiSnapshot, MetricsSummary } from "@/types/analytics";

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
};

export function KPIDashboard() {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        const [kpiData, summaryData] = await Promise.all([
          fetchKpis(),
          fetchMetricsSummary(),
        ]);
        setKpis(kpiData);
        setSummary(summaryData);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border bg-card">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading KPIs...</p>
        </div>
      </div>
    );
  }

  if (error || kpis?.error) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">
          Error loading KPIs: {error || kpis?.error}
        </p>
      </div>
    );
  }

  const topMovie = kpis?.top_movies?.[0];
  const topPlatform = kpis?.platform_breakdown?.[0];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={formatCurrency(summary?.total_revenue ?? 0)}
          subtext="All box office revenue"
          variant="success"
          icon={<BarChart3 className="w-4 h-4" />}
          trend="up"
          trendPercent={12}
        />

        <KPICard
          label="Titles Tracked"
          value={formatNumber(summary?.total_titles ?? 0)}
          subtext="Unique content titles"
          variant="info"
          icon={<Film className="w-4 h-4" />}
        />

        <KPICard
          label="Social Mentions"
          value={formatNumber(summary?.total_mentions ?? 0)}
          subtext="Total mentions tracked"
          variant="default"
          icon={<MessageCircle className="w-4 h-4" />}
        />

        <KPICard
          label="Average Sentiment"
          value={summary?.average_sentiment == null
            ? "N/A"
            : summary.average_sentiment.toFixed(2)}
          subtext="Across social mentions"
          variant="warning"
          icon={<Activity className="w-4 h-4" />}
        />

        {topMovie && (
          <KPICard
            label="Top Movie"
            value={topMovie.movie_title}
            subtext={formatCurrency(topMovie.total_revenue)}
            variant="info"
            icon={<BarChart3 className="w-4 h-4" />}
          />
        )}

        {topPlatform && (
          <KPICard
            label="Top Platform"
            value={topPlatform.platform}
            subtext={`${formatNumber(topPlatform.titles)} titles`}
            variant="warning"
            icon={<Users className="w-4 h-4" />}
          />
        )}

      </div>

      {/* Top Movies Table */}
      {kpis?.top_movies && (
        <DynamicTable
          title="🎬 Top Movies by Revenue"
          columns={[
            { key: "movie_title", label: "Movie Title" },
            {
              key: "total_revenue",
              label: "Revenue",
              format: (v) => formatCurrency(v),
            },
          ]}
          rows={kpis.top_movies}
          maxRows={10}
        />
      )}

      {/* Platform Breakdown Table */}
      {kpis?.platform_breakdown && (
        <DynamicTable
          title="📺 Platform Breakdown"
          columns={[
            { key: "platform", label: "Platform" },
            {
              key: "titles",
              label: "Titles",
              format: (v) => formatNumber(v),
            },
            {
              key: "total_revenue",
              label: "Revenue",
              format: (v) => formatCurrency(v),
            },
            {
              key: "total_mentions",
              label: "Social Mentions",
              format: (v) => formatNumber(v),
            },
          ]}
          rows={kpis.platform_breakdown}
          maxRows={10}
        />
      )}
    </div>
  );
}
