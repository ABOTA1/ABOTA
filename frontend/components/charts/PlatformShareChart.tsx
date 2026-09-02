"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_COLORS } from "@/components/charts/chart-theme";

export interface PlatformSharePoint {
  platform: string;
  titles?: number;
  total_revenue?: number;
  total_mentions: number;
}

interface PlatformShareChartProps {
  data: PlatformSharePoint[];
  metric?: "total_mentions" | "total_revenue";
}

export function PlatformShareChart({
  data,
  metric = "total_mentions",
}: PlatformShareChartProps) {
  const total = data.reduce((sum, row) => sum + Number(row[metric] ?? 0), 0);
  const chartData = data.map((row) => ({
    ...row,
    share: total > 0 ? (Number(row[metric] ?? 0) / total) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey={metric}
          nameKey="platform"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={84}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.platform} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
