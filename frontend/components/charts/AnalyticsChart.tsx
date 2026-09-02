"use client";

import { BoxOfficeChart } from "@/components/charts/BoxOfficeChart";
import { PlatformShareChart } from "@/components/charts/PlatformShareChart";
import { TrendChart } from "@/components/charts/TrendChart";
import type { AnalyticsResult } from "@/types/analytics";

export function AnalyticsChart({ analytics }: { analytics: AnalyticsResult }) {
  const primary = analytics.series[0];
  if (!primary?.data?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No chart series in this result.
      </div>
    );
  }

  if (analytics.chart_type === "line") {
    return <TrendChart series={analytics.series} />;
  }

  if (analytics.chart_type === "pie") {
    return (
      <PlatformShareChart
        data={primary.data.map((point) => ({
          platform: point.label,
          total_mentions: point.value,
        }))}
      />
    );
  }

  return (
    <BoxOfficeChart
      data={primary.data.map((point) => ({
        movie_title: point.label,
        total_revenue: point.value,
      }))}
    />
  );
}
