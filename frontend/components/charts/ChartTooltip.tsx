"use client";

import { formatCompact, formatUSD } from "@/lib/utils";

type TooltipRow = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string;
}

function formatMetric(name: string, value: number): string {
  const key = name.toLowerCase();
  if (key.includes("revenue") || key.includes("taquilla")) {
    return formatUSD(value);
  }
  return formatCompact(value);
}

function extraCrossMetrics(
  row: Record<string, unknown> | undefined,
  payload: TooltipRow[],
) {
  if (!row) return [];
  const shownNames = new Set(payload.map((item) => String(item.name ?? "").toLowerCase()));
  const shownValues = new Set(
    payload.map((item) => Number(item.value)).filter((value) => Number.isFinite(value)),
  );
  const extras: Array<{ label: string; text: string }> = [];
  if (
    typeof row.total_revenue === "number" &&
    !shownNames.has("total_revenue") &&
    !shownNames.has("revenue") &&
    !shownValues.has(row.total_revenue)
  ) {
    extras.push({ label: "Revenue", text: formatUSD(row.total_revenue) });
  }
  if (
    typeof row.total_mentions === "number" &&
    !shownNames.has("total_mentions") &&
    !shownNames.has("mentions") &&
    !shownValues.has(row.total_mentions)
  ) {
    extras.push({ label: "Mentions", text: formatCompact(row.total_mentions) });
  }
  if (typeof row.titles === "number" && !shownNames.has("titles")) {
    extras.push({ label: "Titles", text: String(row.titles) });
  }
  if (typeof row.share === "number" && !shownNames.has("share")) {
    extras.push({ label: "Share", text: `${row.share.toFixed(1)}%` });
  }
  return extras;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const heading =
    label ||
    (typeof row?.platform === "string" && row.platform) ||
    (typeof row?.movie_title === "string" && row.movie_title) ||
    payload[0]?.name ||
    "";

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md min-w-[10rem]">
      {heading ? <p className="mb-1.5 font-semibold text-popover-foreground">{heading}</p> : null}
      <ul className="space-y-1">
        {payload.map((item) => {
          const name = String(item.name ?? "Value");
          const numeric = Number(item.value);
          return (
            <li key={name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                {name}
              </span>
              <span className="font-medium tabular-nums text-popover-foreground">
                {Number.isFinite(numeric) ? formatMetric(name, numeric) : String(item.value ?? "—")}
              </span>
            </li>
          );
        })}
        {extraCrossMetrics(row, payload).map((extra) => (
          <li key={extra.label} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span>{extra.label}</span>
            <span className="tabular-nums text-popover-foreground">{extra.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
