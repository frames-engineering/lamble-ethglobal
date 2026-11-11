"use client";

import { useMemo } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import { formatValue, type ValueFormat } from "@/components/research/measure";
import { compactUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ResearchSeries {
  id: string;
  label: string;
  /** A theme token from research/colors: SERIES.accent, launchpadColor(slug) or PALETTE. */
  color: string;
  points: { time: number; value: number | null }[];
}

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const HOUR = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const MONTH = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", year: "numeric" });

/** Series keys become CSS custom properties (--color-{key}-0): keep them identifiers, not ids like "pump.fun". */
const keyOf = (i: number) => `s${i}`;

/** The tooltip carries one more digit than the axis: the axis reads $3.3M, the hovered day $3.29M. */
const tooltipValue = (v: number, format: ValueFormat) => (format === "usd" ? compactUsd(v, 2) : formatValue(v, format));

/**
 * Every time-series chart on the site (docs/design/charts.md): one or more series over time, as a line (levels:
 * price, rolling counts) or an area (flows: volume, fees). Gaps (null) stay gaps; they are never drawn as zero.
 * The summary sits under the chart for screen readers and readers without JavaScript, since the chart itself is
 * a canvas; `hideSummary` keeps it for assistive tech only where the panel already says it.
 */
export function SeriesChart({
  series,
  format,
  height = 220,
  className,
  tickFormat = "day",
  kind = "line",
  summary,
  hideSummary = false,
}: {
  series: ResearchSeries[];
  format: ValueFormat;
  /** Pixel height; ignored when `className` sets one (the lead chart's responsive h-56 md:h-64). */
  height?: number;
  className?: string;
  tickFormat?: "day" | "hour" | "month";
  kind?: "line" | "area";
  summary: string;
  hideSummary?: boolean;
}) {
  const hasData = series.some((s) => s.points.some((p) => p.value !== null));

  const { rows, config, times, timed } = useMemo(() => {
    const times = [...new Set(series.flatMap((s) => s.points.map((p) => p.time)))].sort((a, b) => a - b);
    const coarse = (t: number) => (tickFormat === "month" ? MONTH : DAY).format(new Date(t * 1000));
    // Several samples on one day (price snapshots) would share a category label: give each its time then.
    const timed = tickFormat === "hour" || new Set(times.map(coarse)).size < times.length;
    const label = (t: number) => (timed ? `${HOUR.format(new Date(t * 1000))} UTC` : coarse(t));
    const byTime = series.map((s) => new Map(s.points.map((p) => [p.time, p.value])));
    return {
      times,
      timed,
      rows: times.map((t) => ({ t: label(t), ...Object.fromEntries(series.map((_, i) => [keyOf(i), byTime[i]?.get(t) ?? null])) })),
      config: Object.fromEntries(series.map((s, i) => [keyOf(i), { label: s.label, colors: { light: [s.color], dark: [s.color] } }])) as ChartConfig,
    };
  }, [series, tickFormat]);

  // Hourly data: one label per UTC day. Daily data past two weeks: one a week, counted back from the latest
  // day so the newest point is always labeled. Otherwise ECharts spaces the labels itself.
  const n = times.length;
  const interval =
    tickFormat === "hour"
      ? (i: number) => (times[i] ?? 1) % 86_400 === 0
      : tickFormat === "day" && !timed && n > 14
        ? (i: number) => (n - 1 - i) % 7 === 0
        : undefined;

  return (
    <figure>
      <div style={className ? undefined : { height }} className={className} aria-hidden={!hasData}>
        {hasData ? (
          <EChartsAreaChart data={rows} config={config} xDataKey="t" valueFormatter={(v) => tooltipValue(v, format)} className="h-full">
            <EChartsAreaChart.Grid />
            {/* Hourly labels read "Oct 21, 14:00 UTC"; the axis keeps the date. */}
            <EChartsAreaChart.XAxis dataKey="t" interval={interval} tickFormatter={timed ? (v) => v.split(",")[0] ?? v : undefined} />
            <EChartsAreaChart.YAxis tickFormatter={(v) => formatValue(v, format)} />
            <EChartsAreaChart.Tooltip />
            {series.length > 1 && <EChartsAreaChart.Legend />}
            {series.map((s, i) => (
              <EChartsAreaChart.Area key={s.id} dataKey={keyOf(i)} variant={kind === "line" ? "none" : "gradient"} />
            ))}
          </EChartsAreaChart>
        ) : (
          <div className="flex h-full items-center justify-center rounded-sm border border-dashed border-line-med text-xs text-med">No observations in this window.</div>
        )}
      </div>
      <figcaption className={cn("mt-2 text-xs leading-relaxed text-med", hideSummary && "sr-only")}>{summary}</figcaption>
    </figure>
  );
}
