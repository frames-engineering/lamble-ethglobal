"use client";

import { useMemo } from "react";

import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import { type VizHue, hue } from "@/components/research/colors";

export interface GaugeBand {
  id: string;
  label: string;
  /** Inclusive lower bound on the 0–100 scale. */
  from: number;
}

/** The arc opens at the bottom: it runs counterclockwise from 210° (lower left, 0) to -30° (lower right, 100). */
const START = 210;
const SWEEP = 240;
/** A thin ring, as a share of the half-width. Bands are square and touch, like every chart (docs/design/charts.md). */
const INNER = 88;
const OUTER = 95;
/** The dotted scale just inside the ring (viewBox units): one dot every STEP points. The marker rides it. */
const TRACK = 37;
const STEP = 2.5;
const DOTS = Array.from({ length: 100 / STEP + 1 }, (_, i) => point(i * STEP, TRACK));

/**
 * Band colors from cold to hot, from the named chart hues (research/colors): frozen violet, cold sky, warm gold,
 * hot coral. Matched by band id so a reordered scale keeps its meaning.
 */
const COLOR: Record<string, VizHue> = { frozen: "violet", cold: "sky", warm: "gold", hot: "coral" };

/**
 * Three decimals: the server's and the browser's trig can differ in the last digit, which breaks hydration.
 * A declaration, not a const: DOTS calls point() while the module loads, before a const here would exist.
 */
function round(v: number) {
  return Math.round(v * 1000) / 1000;
}

/** Point on a circle of radius r (viewBox 0–100) at the scale position of `score`. */
function point(score: number, r: number) {
  const a = ((START - (SWEEP * score) / 100) * Math.PI) / 180;
  return { x: round(50 + r * Math.cos(a)), y: round(50 - r * Math.sin(a)) };
}

/**
 * The trench index as a banded arc (evilcharts pie sectors) over a dotted scale, a marker on the scale at the
 * score, the number in the middle and the band under it. The canvas is decorative; the label carries the reading for assistive
 * tech.
 */
export function TrenchGauge({ score, band, bands, label }: { score: number; band: string; bands: GaugeBand[]; label: string }) {
  const { data, config } = useMemo(() => {
    const rows: { band: string; value: number }[] = [];
    const cfg: ChartConfig = {};
    bands.forEach((b, i) => {
      rows.push({ band: b.id, value: (bands[i + 1]?.from ?? 100) - b.from });
      const color = [hue(COLOR[b.id] ?? "blue")];
      cfg[b.id] = { label: b.label, colors: { light: color, dark: color } };
    });
    // Sectors are laid counterclockwise from the lower right, so the hottest band goes first.
    return { data: rows.reverse(), config: cfg };
  }, [bands]);
  const marker = point(Math.min(100, Math.max(0, score)), TRACK);

  return (
    <div role="img" aria-label={label} className="relative mx-auto aspect-square w-full max-w-56">
      <EChartsPieChart data={data} config={config} dataKey="value" nameKey="band" className="pointer-events-none h-full w-full">
        <EChartsPieChart.Pie innerRadius={`${INNER}%`} outerRadius={`${OUTER}%`} paddingAngle={0} startAngle={START - SWEEP} endAngle={START} />
      </EChartsPieChart>

      <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {DOTS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.55} className="fill-low" />
        ))}
        {/* On the dotted scale; the background-colored ring clears the dots beside it. */}
        <circle cx={marker.x} cy={marker.y} r={2.6} className="fill-high stroke-background" strokeWidth={1.6} />
      </svg>

      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span className="font-mono text-5xl leading-none font-medium text-high">{score}</span>
        <span className="mt-2 text-sm text-med">{band}</span>
      </div>
    </div>
  );
}
