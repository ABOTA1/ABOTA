"use client";

import Link from "next/link";
import { ArrowUpRight, Clapperboard, MessageSquare, Sparkles, BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { KpiCard } from "@/components/layout/KpiCard";
import { PageFrame } from "@/components/layout/PageFrame";
import { PageHeader } from "@/components/layout/PageHeader";
import { useKpis } from "@/hooks/useKpis";
import { formatCompact, formatUSD } from "@/lib/utils";

export default function OverviewPage() {
  const { kpis, summary, loading, summaryLoading, error, summaryError } = useKpis();
  const top = kpis?.top_movies?.[0];
  const sentiment =
    summary?.average_sentiment == null ? "—" : summary.average_sentiment.toFixed(2);

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Overview"
        title="The house snapshot"
        description="Two beats only: the title leading the market, and the pulse of platforms and social. Charts and chat live on their own stages."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryError && !summaryLoading ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <EmptyState
              icon={BarChart3}
              title="Could not load house totals"
              description={summaryError}
              className="min-h-[8rem] rounded-2xl border border-destructive/30 bg-destructive/5"
            />
          </div>
        ) : (
          <>
            <KpiCard
              label="Total revenue"
              loading={summaryLoading}
              delayMs={40}
              value={summary ? formatUSD(summary.total_revenue) : "—"}
              sub="All box-office revenue"
            />
            <KpiCard
              label="Titles tracked"
              loading={summaryLoading}
              delayMs={80}
              value={summary ? formatCompact(summary.total_titles) : "—"}
              sub="Unique content titles"
            />
            <KpiCard
              label="Social mentions"
              loading={summaryLoading}
              delayMs={120}
              accent
              value={summary ? formatCompact(summary.total_mentions) : "—"}
              sub="Across tracked platforms"
            />
            <KpiCard
              label="Avg. sentiment"
              loading={summaryLoading}
              delayMs={160}
              value={sentiment}
              sub="−1.0 negative to +1.0 positive"
            />
          </>
        )}
      </section>

      <div className="grid items-stretch gap-6 lg:grid-cols-5">
        <article
          className="glass-card animate-rise relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:col-span-3"
        >
          <div aria-hidden className="orb orb-violet -left-16 -top-20 h-56 w-56" />
          <div aria-hidden className="orb orb-gold -bottom-24 -right-10 h-48 w-48" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Leading title
          </p>
          {loading ? (
            <div className="relative mt-6 space-y-3">
              <div className="h-10 w-2/3 animate-shimmer rounded-lg bg-muted" />
              <div className="h-16 w-1/2 animate-shimmer rounded-lg bg-muted" />
            </div>
          ) : top ? (
            <div className="relative mt-5">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    {top.movie_title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[top.genre, top.country].filter(Boolean).join(" · ") || "Highest revenue in the snapshot"}
                  </p>
                </div>
              </div>
              <p className="mt-8 font-display text-4xl tabular-nums tracking-tight text-foreground sm:text-5xl">
                {formatUSD(top.total_revenue)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {top.total_mentions != null
                  ? `${formatCompact(top.total_mentions)} social mentions in the window`
                  : "Total box-office revenue"}
              </p>
              <Link
                href="/box-office"
                className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Open box office
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          ) : (
            <p className="relative mt-6 text-sm text-muted-foreground">
              {error ? "Could not load KPIs. Check the API and try again." : "Seed ClickHouse to see the leading title."}
            </p>
          )}
        </article>

        <div className="grid gap-4 lg:col-span-2">
          <KpiCard
            label="Platforms"
            loading={loading}
            delayMs={80}
            value={String(kpis?.platform_breakdown?.length ?? 0)}
            sub="Theatrical + streaming mix"
            icon={<Sparkles className="h-3.5 w-3.5" />}
          />
          <KpiCard
            label="Avg. social mentions"
            loading={loading}
            delayMs={140}
            accent
            value={
              kpis?.platform_breakdown?.length
                ? formatCompact(
                    kpis.platform_breakdown.reduce((s, p) => s + p.total_mentions, 0) /
                      kpis.platform_breakdown.length,
                  )
                : "—"
            }
            sub="Per platform in the snapshot"
          />
          <Link href="/agent" className="block">
            <KpiCard
              label="Agent"
              delayMs={200}
              value="Ask Gemini"
              sub="Chat and a live result chart"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
            />
          </Link>
        </div>
      </div>
    </PageFrame>
  );
}
