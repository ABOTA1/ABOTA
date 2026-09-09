"use client";

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { flattenSeries } from "@/components/charts/TrendChart";
import type { AnalyticsResult } from "@/types/analytics";

interface MiniChartProps {
  analytics: AnalyticsResult;
}

/** Compact chart rendered inside the agent message bubble (Issue #5). */
export function MiniChart({ analytics }: MiniChartProps) {
  const { chart_type, series, raw_rows } = analytics;
  const primary = series[0];

  // ── Table ──────────────────────────────────────────────────────────────────
  if (chart_type === "table") {
    if (!raw_rows?.length) return null;
    const cols = Object.keys(raw_rows[0]);
    const rows = raw_rows.slice(0, 5);
    return (
      <div className="mt-2 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border/50 bg-muted/40">
              {cols.map((c) => (
                <th key={c} className="px-2 py-1 text-left font-medium text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                {cols.map((c) => (
                  <td key={c} className="px-2 py-1 text-foreground">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {raw_rows.length > 5 && (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            +{raw_rows.length - 5} more rows
          </p>
        )}
      </div>
    );
  }

  // ── Bar ────────────────────────────────────────────────────────────────────
  if (chart_type === "bar" && primary?.data?.length) {
    const data = primary.data.map((p) => ({ label: p.label, value: p.value }));
    return (
      <div className="mt-2 h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={36} />
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              itemStyle={{ fontSize: 11 }}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
            />
            <Bar dataKey="value" name={primary.name} fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Line ───────────────────────────────────────────────────────────────────
  if (chart_type === "line" && series?.length) {
    const data = flattenSeries(series);
    return (
      <div className="mt-2 h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} minTickGap={20} />
            <YAxis tick={{ fontSize: 9 }} width={36} />
            <Tooltip contentStyle={{ fontSize: 11 }} itemStyle={{ fontSize: 11 }} />
            {series.map((s, idx) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}