"use client";

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { formatValue, type ValueFormat } from "@/components/research/measure";

const HistoryChart = dynamic(() => import("@/components/charts/history-chart").then((m) => m.HistoryChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

export interface ResearchSeries {
  id: string;
  label: string;
  color: string;
  points: { time: number; value: number | null }[];
}

/**
 * Time-series chart for research pages. Gaps (null) stay gaps; they are never drawn as zero.
 * A short text summary sits under the chart for screen readers and for readers without JavaScript.
 */
export function SeriesChart({
  series,
  format,
  height = 220,
  tickFormat = "day",
  kind = "line",
  summary,
}: {
  series: ResearchSeries[];
  format: ValueFormat;
  height?: number;
  tickFormat?: "day" | "hour" | "month";
  kind?: "line" | "area";
  summary: string;
}) {
  const hasData = series.some((s) => s.points.some((p) => p.value !== null));
  return (
    <figure>
      <div style={{ height }} aria-hidden={!hasData}>
        {hasData ? (
          <HistoryChart series={series} kind={kind} height={height} format={(v) => formatValue(v, format)} tickFormat={tickFormat} tooltip floorZero={format === "usd"} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line-med text-xs text-med">No observations in this window.</div>
        )}
      </div>
      <figcaption className="mt-2 text-2xs leading-relaxed text-med">{summary}</figcaption>
    </figure>
  );
}
