"use client";

import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendPercent?: number;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
}

const variantStyles = {
  default: "bg-card border-border",
  success: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
  info: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
};

const iconColorStyles = {
  default: "text-muted-foreground",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
};

export function KPICard({
  label,
  value,
  subtext,
  trend,
  trendPercent,
  icon,
  variant = "default",
}: KPICardProps) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${variantStyles[variant]}`}>
      {/* Header: Label + Icon */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <div className={`text-lg ${iconColorStyles[variant]}`}>{icon}</div>}
      </div>

      {/* Main Value */}
      <div className="mb-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div className="flex items-center gap-1">
          {trend === "up" && (
            <>
              <ArrowUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                {trendPercent ? `+${trendPercent}%` : "Increasing"}
              </span>
            </>
          )}
          {trend === "down" && (
            <>
              <ArrowDown className="w-3 h-3 text-red-600 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {trendPercent ? `-${trendPercent}%` : "Decreasing"}
              </span>
            </>
          )}
          {trend === "neutral" && (
            <>
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Stable</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
