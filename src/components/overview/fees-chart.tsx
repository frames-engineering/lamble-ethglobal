"use client";

import { useMemo } from "react";

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import type { FeeDay, FeeSeries } from "@/components/overview/data";
import { compactUsd } from "@/lib/format";

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const day = (t: number) => DAY.format(new Date(t * 1000));

/** $3.29M, $757K, $940: two decimals only where they carry information. */
export function chartMoney(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1e6) return compactUsd(v, 2);
  if (v >= 1e3 && Math.round(v / 1e3) < 1000) return `$${Math.round(v / 1e3)}K`;
  return compactUsd(v, 2);
}

/** Series keys become CSS custom properties (--color-{key}-0), and launchpad slugs carry dots: key by a safe form of the id. */
const keyOf = (s: FeeSeries) => `lp-${s.id.replace(/[^a-z0-9-]/gi, "-")}`;
/** The day's total rides in the category label, so the tooltip heads with it; the axis shows only the date. */
const SEP = " · ";

/**
 * Daily fees stacked by launchpad (evilcharts / ECharts, LAMBLE_CHART styling, brand launchpad colors). Hover a
 * day for its breakdown; click a legend entry to single out one launchpad. No per-bar hover highlight: crossing the gap
 * between columns toggled it and made the chart blink.
 */
export function FeesChart({ series, days }: { series: FeeSeries[]; days: FeeDay[] }) {
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
    () => days.map((d) => ({ day: `${day(d.time)}${SEP}${chartMoney(d.total)}`, ...Object.fromEntries(series.map((s, j) => [keyOf(s), d.parts[j] ?? 0])) })),
    [days, series],
  );

  return (
    <figure>
      <EChartsBarChart data={rows} config={config} xDataKey="day" stackType="stacked" valueFormatter={chartMoney} className="h-72 md:h-80">
        <EChartsBarChart.Grid />
        <EChartsBarChart.XAxis dataKey="day" tickFormatter={(v) => v.split(SEP)[0] ?? v} />
        <EChartsBarChart.YAxis tickFormatter={(v) => compactUsd(Number(v))} />
        <EChartsBarChart.Tooltip />
        <EChartsBarChart.Legend isClickable />
        {series.map((s) => (
          <EChartsBarChart.Bar key={s.id} dataKey={keyOf(s)} />
        ))}
      </EChartsBarChart>

      <figcaption className="sr-only">Daily launchpad fees for the last 30 settled days, stacked by launchpad. The table below lists every value.</figcaption>
      {/* sr-only on a wrapper: a table sizes to its content and ignores the 1px width, widening the page on phones. */}
      <div className="sr-only">
        <table>
          <caption>Daily launchpad fees by launchpad</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {series.map((s) => (
                <th key={s.id} scope="col">
                  {s.label}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.time}>
                <th scope="row">{day(d.time)}</th>
                {d.parts.map((v, j) => (
                  <td key={series[j]?.id ?? j}>{chartMoney(v)}</td>
                ))}
                <td>{chartMoney(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
