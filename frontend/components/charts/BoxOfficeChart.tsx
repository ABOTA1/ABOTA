"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_COLORS } from "@/components/charts/chart-theme";

export interface BoxOfficePoint {
  movie_title: string;
  total_revenue: number;
  total_mentions?: number;
}

interface BoxOfficeChartProps {
  data: BoxOfficePoint[];
}

export function BoxOfficeChart({ data }: BoxOfficeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 56 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="movie_title"
          tick={{ fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
          tick={{ fontSize: 11 }}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.45 }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="total_revenue"
          name="Revenue"
          fill={CHART_COLORS[0]}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
