import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  loading,
  delayMs = 0,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  delayMs?: number;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "glass-card animate-rise group relative overflow-hidden",
        accent && "border-primary/30",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <CardHeader className="relative p-5 pb-2">
        <CardDescription className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {icon}
          {label}
        </CardDescription>
        {loading ? (
          <div className="mt-2 h-8 w-28 animate-shimmer rounded-md bg-muted" />
        ) : (
          <CardTitle className="mt-1 font-display text-2xl tabular-nums tracking-tight sm:text-3xl">
            {value}
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="relative p-5 pt-0">
        {loading ? (
          <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
        ) : (
          <p className="text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
