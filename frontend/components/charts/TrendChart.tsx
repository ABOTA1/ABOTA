"use client";

// components/charts/TrendChart.tsx – Recharts line chart for time-series data.
// TODO: Wire this to the agent's line-chart responses.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartSeries } from "@/types/analytics";

interface TrendChartProps {
  series: ChartSeries[];
  height?: number;
}

const COLORS = [
  "hsl(221.2 83.2% 53.3%)",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(346.8 77.2% 49.8%)",
  "hsl(43.3 96.4% 56.3%)",
];

export function TrendChart({ series, height = 240 }: TrendChartProps) {
  // Flatten series into Recharts-compatible data format
  const labels = series[0]?.data.map((p) => p.label) ?? [];
  const data = labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    series.forEach((s) => {
      row[s.name] = s.data[i]?.value ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
        <Legend />
        {series.map((s, idx) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={COLORS[idx % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
