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

export interface MovieKpi {
  movie_title: string;
  total_revenue: number;
  total_mentions?: number;
}

export interface PlatformBreakdown {
  platform: string;
  titles: number;
  total_revenue: number;
  total_mentions: number;
}

export interface MentionsTrendPoint {
  label: string;
  mentions: number;
}

export interface KpiSnapshot {
  top_movies: MovieKpi[];
  platform_breakdown: PlatformBreakdown[];
  mentions_trend?: MentionsTrendPoint[];
  error?: string;
}
