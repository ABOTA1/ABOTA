// types/analytics.ts – Shared TypeScript types mirroring the Pydantic schemas.

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
}

export type ChartType = "bar" | "line" | "pie" | "table";

export interface AnalyticsResult {
  chart_type: ChartType;
  title: string;
  series: ChartSeries[];
  raw_rows: Record<string, unknown>[];
  sql_executed?: string;
  insights: string[];
}

export interface ChatResponse {
  answer: string;
  analytics?: AnalyticsResult;
  error?: string;
}

export interface ChatRequest {
  question: string;
  session_id?: string;
}

// KPI snapshot returned by GET /api/kpis
export interface KpiSnapshot {
  top_movies: Array<{ movie_title: string; total_revenue: number }>;
  platform_breakdown: Array<{
    platform: string;
    titles: number;
    total_revenue: number;
    total_mentions: number;
  }>;
  error?: string;
}
