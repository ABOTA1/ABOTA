"use client";

// components/charts/BoxOfficeChart.tsx – Recharts bar chart for revenue data.
// TODO: Replace with your final chart design / add more series.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatUSD } from "@/lib/utils";

interface BoxOfficeChartProps {
  data: Array<{ movie_title: string; total_revenue: number }>;
}

export function BoxOfficeChart({ data }: BoxOfficeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 60 }}>
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
        />
        <Tooltip
          formatter={(value: number) => [formatUSD(value), "Revenue"]}
          contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
        />
        <Bar dataKey="total_revenue" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
