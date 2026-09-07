"use client";

import { LineChart, PieChart } from "lucide-react";
import { PlatformShareChart } from "@/components/charts/PlatformShareChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { ChartCard } from "@/components/layout/ChartCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageFrame } from "@/components/layout/PageFrame";
import { PageHeader } from "@/components/layout/PageHeader";
import { useKpis } from "@/hooks/useKpis";

export default function TrendsPage() {
  const { kpis, loading } = useKpis();
  const trend = kpis?.mentions_trend ?? [];
  const platforms = kpis?.platform_breakdown ?? [];

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Trends"
        title="Social and platform mix"
        description="Weekly mention volume beside theatrical vs streaming share. Two reads, one stage."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Mentions" description="Weekly social volume" delayMs={60}>
          {trend.length ? (
            <div className="h-[320px] w-full min-w-0 sm:h-[380px]">
              <TrendChart
                series={[
                  {
                    name: "Mentions",
                    data: trend.map((point) => ({
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
          delayMs={140}
        >
          {platforms.length ? (
            <div className="mx-auto h-[320px] w-full min-w-0 max-w-lg sm:h-[380px]">
              <PlatformShareChart data={platforms} />
            </div>
          ) : (
            <EmptyState
              icon={PieChart}
              title={loading ? "Loading platforms" : "No platform share"}
              description="Streaming and theatrical mix shows up after a successful KPI fetch."
            />
          )}
        </ChartCard>
      </div>
    </PageFrame>
  );
}
