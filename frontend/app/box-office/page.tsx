"use client";

import { BarChart2, Table2 } from "lucide-react";
import { BoxOfficeChart } from "@/components/charts/BoxOfficeChart";
import { ChartCard } from "@/components/layout/ChartCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageFrame } from "@/components/layout/PageFrame";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useKpis } from "@/hooks/useKpis";
import { formatCompact, formatUSD } from "@/lib/utils";

export default function BoxOfficePage() {
  const { kpis, loading, error } = useKpis();
  const movies = kpis?.top_movies ?? [];

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Box office"
        title="Revenue ranking"
        description="Chart and table as a pair: who is pulling, and the genre and country behind each title."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Top titles" description="Total revenue in the snapshot" delayMs={60}>
          {movies.length ? (
            <div className="h-[320px] w-full min-w-0 sm:h-[380px]">
              <BoxOfficeChart data={movies} />
            </div>
          ) : (
            <EmptyState
              icon={BarChart2}
              title={loading ? "Loading box office" : "No box-office data"}
              description={
                error
                  ? "The KPI snapshot could not be loaded. Check the API and try again."
                  : "Seed ClickHouse to see top-movie revenue here."
              }
            />
          )}
        </ChartCard>

        <ChartCard
          title="Title sheet"
          description="Genre, origin, revenue, mentions"
          delayMs={140}
        >
          {loading ? (
            <EmptyState icon={Table2} title="Loading table" description="Fetching the KPI snapshot." />
          ) : movies.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Movie</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Mentions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movies.map((movie) => (
                    <TableRow key={movie.movie_title}>
                      <TableCell className="font-medium">{movie.movie_title}</TableCell>
                      <TableCell>{movie.genre ?? "—"}</TableCell>
                      <TableCell>{movie.country ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(movie.total_revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {movie.total_mentions != null ? formatCompact(movie.total_mentions) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Table2}
              title="No rows to show"
              description={
                error ? "The table stays empty until /api/kpis responds." : "Seed the database to populate this ranking."
              }
            />
          )}
        </ChartCard>
      </div>
    </PageFrame>
  );
}
