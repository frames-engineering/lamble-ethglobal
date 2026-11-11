import { SERIES } from "@/components/research/colors";
import { SeriesChart } from "@/components/research/charts";
import { compactUsd } from "@/lib/format";
import type { SeriesPoint } from "@/lib/lamble/release/types";

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const HOUR = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * The narrative explorer's volume chart, the overview's lead chart: the shared SeriesChart as an area in the
 * accent color, taller than a panel chart. One series, so no legend: the panel heading names it. The latest
 * reading goes to assistive tech only; the figures above the chart already show it.
 */
export function AreaChart({ points, unit, label }: { points: SeriesPoint[]; unit: "hour" | "day"; label: string }) {
  const last = [...points].reverse().find((p) => p.value !== null);
  const at = (t: number) => (unit === "hour" ? `${HOUR.format(new Date(t * 1000))} UTC` : DAY.format(new Date(t * 1000)));

  return (
    <SeriesChart
      series={[{ id: "volume", label: "Volume", color: SERIES.accent, points }]}
      format="usd"
      kind="area"
      tickFormat={unit}
      className="h-56 md:h-64"
      hideSummary
      summary={`${label}. ${last ? `Latest: ${compactUsd(last.value, 2)} on ${at(last.time)}.` : "No observations in this window."}`}
    />
  );
}
