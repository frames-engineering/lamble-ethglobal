"use client";

import { useMemo, useState } from "react";

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import type { StackDay, StackSeries } from "@/components/launchpads/stack";
import { chartMoney } from "@/components/overview/fees-chart";
import { Segmented } from "@/components/ui/segmented";
import { compactNumber, compactUsd } from "@/lib/format";

const DATE = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
const MONTH = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
/** The day's total rides in the category label, so the tooltip heads with it; the axis shows only the date. */
const SEP = " · ";
/** Up to this many days the hidden table lists every day; past it, monthly totals. */
const DAILY_TABLE_DAYS = 45;
const VIEWS = [
  ["daily", "Daily"],
  ["share", "Share"],
] as const;

type Unit = "usd" | "count";
type View = (typeof VIEWS)[number][0];

/** Series keys become CSS custom properties (--color-{key}-0), and launchpad slugs carry dots: key by a safe form of the id. */
const keyOf = (s: StackSeries) => `lp-${s.id.replace(/[^a-z0-9-]/gi, "-")}`;
const count = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("en-US"));
const share = (v: number) => `${(v * 100).toFixed(1)}%`;
const date = (t: number) => DATE.format(new Date(t * 1000));

/** "Oct 26, 2026" → "Oct 26" in the latest year, "Oct 26 '25" before it. */
function tick(label: string, latestYear: string): string {
  const [monthDay, year] = label.split(", ");
  return year === latestYear || !year ? (monthDay ?? label) : `${monthDay} '${year.slice(2)}`;
}

/**
 * Daily values stacked by launchpad (evilcharts bars). With `brushDays`, a brush under the chart opens on the
 * last that many days and drags out to the whole history. With `withShare`, a Daily / Share toggle shows each
 * venue's part of the day instead of the amount; the brush window carries across.
 */
export function HistoryChart({
  series,
  days,
  unit,
  caption,
  brushDays,
  withShare = false,
}: {
  series: StackSeries[];
  days: StackDay[];
  unit: Unit;
  /** What the chart shows, for the hidden caption and table. */
  caption: string;
  brushDays?: number;
  withShare?: boolean;
}) {
  const [view, setView] = useState<View>("daily");
  const fmt = unit === "usd" ? chartMoney : count;
  const latestYear = days.length ? date(days[days.length - 1]!.time).slice(-4) : "";

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        series.map((s) => {
          const color = [s.color];
          return [keyOf(s), { label: s.label, colors: { light: color, dark: color } }];
        }),
      ),
    [series],
  );
  const rows = useMemo(
    () => days.map((d) => ({ day: `${date(d.time)}${SEP}${fmt(d.total)}`, ...Object.fromEntries(series.map((s, j) => [keyOf(s), d.parts[j] ?? null])) })),
    [days, series, fmt],
  );
  // The hidden table: every day for a short series, monthly totals for a long one.
  const table = useMemo(() => {
    if (days.length <= DAILY_TABLE_DAYS) return days.map((d) => ({ label: date(d.time), parts: d.parts, total: d.total }));
    const months = new Map<string, { label: string; parts: number[]; total: number }>();
    for (const d of days) {
      if (d.total === null) continue;
      const label = MONTH.format(new Date(d.time * 1000));
      const m = months.get(label) ?? { label, parts: series.map(() => 0), total: 0 };
      d.parts.forEach((v, j) => (m.parts[j] = (m.parts[j] ?? 0) + (v ?? 0)));
      m.total += d.total;
      months.set(label, m);
    }
    return [...months.values()];
  }, [days, series]);
  const range = brushDays && days.length > brushDays ? { start: (1 - brushDays / days.length) * 100, end: 100 } : null;
  const monthly = days.length > DAILY_TABLE_DAYS;

  return (
    <figure>
      {withShare && (
        <div className="mb-3 flex justify-end">
          <Segmented label="Chart view" options={VIEWS} value={view} onChange={setView} />
        </div>
      )}
      <EChartsBarChart
        data={rows}
        config={config}
        xDataKey="day"
        stackType={view === "share" ? "percent" : "stacked"}
        valueFormatter={view === "share" ? share : fmt}
        className={range ? "h-104 sm:h-96" : "h-88 sm:h-72 md:h-80"}
      >
        <EChartsBarChart.Grid />
        <EChartsBarChart.XAxis dataKey="day" tickFormatter={(v) => tick(v.split(SEP)[0] ?? v, latestYear)} />
        <EChartsBarChart.YAxis tickFormatter={(v) => (unit === "usd" ? compactUsd(Number(v)) : compactNumber(Number(v)))} />
        <EChartsBarChart.Tooltip />
        <EChartsBarChart.Legend isClickable />
        {series.map((s) => (
          <EChartsBarChart.Bar key={s.id} dataKey={keyOf(s)} />
        ))}
        {range && <EChartsBarChart.Brush defaultRange={range} formatLabel={(v) => v.split(SEP)[0] ?? v} />}
      </EChartsBarChart>

      <figcaption className="sr-only">
        {caption}, stacked by launchpad. The table below lists {monthly ? "monthly totals" : "every day"}.
      </figcaption>
      {/* sr-only on a wrapper: a table sizes to its content and ignores the 1px width, widening the page on phones. */}
      <div className="sr-only">
        <table>
          <caption>
            {caption}
            {monthly ? ", by month" : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col">{monthly ? "Month" : "Day"}</th>
              {series.map((s) => (
                <th key={s.id} scope="col">
                  {s.label}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {r.parts.map((v, j) => (
                  <td key={series[j]?.id ?? j}>{fmt(v)}</td>
                ))}
                <td>{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
