"use client";

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
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_COLORS } from "@/components/charts/chart-theme";

interface TrendChartProps {
  series: ChartSeries[];
  height?: number;
}

export function flattenSeries(series: ChartSeries[]): Array<Record<string, string | number>> {
  const rows = new Map<string, Record<string, string | number>>();
  for (const s of series) {
    for (const point of s.data) {
      const row = rows.get(point.label) ?? { label: point.label };
      row[s.name] = point.value;
      rows.set(point.label, row);
    }
  }
  return Array.from(rows.values());
}

export function TrendChart({ series, height = 240 }: TrendChartProps) {
  const data = flattenSeries(series);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip
          cursor={{ stroke: "hsl(var(--border))" }}
          content={<ChartTooltip />}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, idx) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            name={s.name}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
