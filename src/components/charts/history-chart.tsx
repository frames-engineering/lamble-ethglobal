"use client";

import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LastPriceAnimationMode,
  LineSeries,
  LineStyle,
  TickMarkType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

import { useThemeColors, type ThemeColors } from "@/hooks/use-theme-colors";
import { DAY } from "@/lib/data/seeded";
import type { Point } from "@/lib/data/types";
import { hourTick, monthTick, shortDate, shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: Point[];
}

export type ChartRange = "1W" | "1M" | "3M" | "ALL";
export const CHART_RANGES: ChartRange[] = ["1W", "1M", "3M", "ALL"];
const RANGE_DAYS: Record<ChartRange, number | null> = { "1W": 7, "1M": 30, "3M": 90, ALL: null };

export type HoverValues = Record<string, number>;

type TickFormat = "month" | "day" | "hour";

interface HistoryChartProps {
  series: ChartSeries[];
  kind?: "line" | "area";
  range?: ChartRange;
  height: number | string;
  format?: (v: number) => string;
  tickFormat?: TickFormat;
  /** Keep zero inside the visible range (share-of-attention charts). */
  floorZero?: boolean;
  /** Show a hover card with the time and each series' value under the crosshair. */
  tooltip?: boolean;
  /** Called with hovered values per series id, or null when the cursor leaves. */
  onHover?: (values: HoverValues | null) => void;
  /** Wipe the chart in from the left on mount (chart-reveal). The library has no series entrance of its own. */
  drawIn?: boolean;
  className?: string;
}

interface HoverTip {
  /** Crosshair x in px from the chart's left edge. */
  x: number;
  /** Cursor is in the right half: open the card to the left of the crosshair. */
  flip: boolean;
  time: number;
  values: HoverValues;
}

type AnySeries = ISeriesApi<"Line"> | ISeriesApi<"Area">;

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m || !m[1]) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function themeOptions(c: ThemeColors) {
  return {
    layout: { textColor: c.med, fontFamily: c.font },
    grid: { horzLines: { color: c.divider } },
    crosshair: { vertLine: { color: c.lineMed } },
  };
}

/**
 * lightweight-charts wrapper for historical series. Creates the chart once,
 * syncs series on prop changes and recolors on theme changes without
 * re-creating the canvas. Load it with next/dynamic({ ssr: false }).
 */
export function HistoryChart({
  series,
  kind = "line",
  range = "ALL",
  height,
  format,
  tickFormat = "month",
  floorZero = false,
  tooltip = false,
  onHover,
  drawIn = false,
  className,
}: HistoryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Map<string, AnySeries>>(new Map());
  const onHoverRef = useRef<HistoryChartProps["onHover"]>(undefined);
  const formatRef = useRef<HistoryChartProps["format"]>(undefined);
  const colors = useThemeColors();
  const colorsRef = useRef(colors);
  const dense = tickFormat === "day" || range === "1W" || range === "1M";
  const denseRef = useRef(dense);
  const tickFormatRef = useRef(tickFormat);
  const floorZeroRef = useRef(floorZero);
  const tooltipRef = useRef(tooltip);
  const [tip, setTip] = useState<HoverTip | null>(null);

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect(() => {
    formatRef.current = format;
  }, [format]);
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);
  useEffect(() => {
    tooltipRef.current = tooltip;
  }, [tooltip]);
  useEffect(() => {
    floorZeroRef.current = floorZero;
    chartRef.current?.priceScale("right").applyOptions({ scaleMargins: { top: 0.14, bottom: floorZero ? 0.02 : 0.08 } });
  }, [floorZero]);
  useEffect(() => {
    denseRef.current = dense;
    tickFormatRef.current = tickFormat;
    // Re-run the tick formatter with the new density / format.
    chartRef.current?.timeScale().applyOptions({ timeVisible: tickFormat === "hour" });
  }, [dense, tickFormat]);

  // Create the chart once per mount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const c = colorsRef.current;
    const seriesMap = seriesRef.current;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: c.med,
        fontFamily: c.font,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: c.divider, style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderVisible: false,
        ticksVisible: false,
        scaleMargins: { top: 0.14, bottom: floorZeroRef.current ? 0.02 : 0.08 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightOffset: 0,
        timeVisible: tickFormatRef.current === "hour",
        secondsVisible: false,
        tickMarkFormatter: (time: Time, type: TickMarkType) => {
          if (typeof time !== "number") return null;
          if (tickFormatRef.current === "hour") return hourTick(time);
          if (type === TickMarkType.Year) return String(new Date(time * 1000).getUTCFullYear());
          if (type === TickMarkType.Month) return monthTick(time);
          // Day-level ticks: label them only when the visible window is short.
          return denseRef.current ? shortDate(time) : "";
        },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        horzLine: { visible: false, labelVisible: false },
        vertLine: { color: c.lineMed, width: 1, style: LineStyle.Solid, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
      localization: {
        locale: "en-US",
        priceFormatter: (v: number) => (formatRef.current ? formatRef.current(v) : v.toFixed(1)),
      },
    });
    chartRef.current = chart;

    const handler = (param: MouseEventParams<Time>) => {
      const point = param.point;
      const time = typeof param.time === "number" ? param.time : undefined;
      const values: HoverValues = {};
      if (point && time !== undefined) {
        for (const [key, api] of seriesMap) {
          const d = param.seriesData.get(api as unknown as ISeriesApi<SeriesType>) as
            | LineData<Time>
            | WhitespaceData<Time>
            | undefined;
          if (d && "value" in d) values[key] = d.value;
        }
      }
      const hovered = point !== undefined && time !== undefined && Object.keys(values).length > 0;
      onHoverRef.current?.(hovered ? values : null);
      if (tooltipRef.current) {
        setTip(hovered ? { x: point.x, flip: point.x > el.clientWidth / 2, time, values } : null);
      }
    };
    chart.subscribeCrosshairMove(handler);

    return () => {
      chart.unsubscribeCrosshairMove(handler);
      chart.remove();
      chartRef.current = null;
      seriesMap.clear();
    };
  }, []);

  // Recolor on theme change.
  useEffect(() => {
    chartRef.current?.applyOptions(themeOptions(colors));
  }, [colors]);

  // Sync series + visible range.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const map = seriesRef.current;
    const wanted = new Set(series.map((s) => s.id));

    for (const [id, api] of map) {
      if (!wanted.has(id)) {
        chart.removeSeries(api);
        map.delete(id);
      }
    }

    const autoscaleInfoProvider = floorZero
      ? (original: () => { priceRange: { minValue: number; maxValue: number } } | null) => {
          const res = original();
          if (res) res.priceRange.minValue = Math.min(0, res.priceRange.minValue);
          return res;
        }
      : undefined;

    let lastTime = 0;
    for (const s of series) {
      let api = map.get(s.id);
      if (!api) {
        api =
          kind === "area"
            ? chart.addSeries(AreaSeries, {
                lineColor: s.color,
                topColor: withAlpha(s.color, 0.28),
                bottomColor: withAlpha(s.color, 0),
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: true,
                crosshairMarkerRadius: 4,
                lastPriceAnimation: LastPriceAnimationMode.Continuous,
                autoscaleInfoProvider,
              })
            : chart.addSeries(LineSeries, {
                color: s.color,
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: true,
                crosshairMarkerRadius: 4,
                lastPriceAnimation: LastPriceAnimationMode.Continuous,
                autoscaleInfoProvider,
              });
        map.set(s.id, api);
      }
      api.setData(s.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      const last = s.points[s.points.length - 1];
      if (last && last.time > lastTime) lastTime = last.time;
    }

    const days = RANGE_DAYS[range];
    if (days === null || lastTime === 0) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleRange({
        from: (lastTime - days * DAY) as UTCTimestamp,
        to: lastTime as UTCTimestamp,
      });
    }
  }, [series, kind, range, floorZero]);

  return (
    <div style={{ height }} className={cn("relative", drawIn && "chart-reveal", className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {tooltip && tip && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-max rounded-lg border border-line-med bg-card px-2.5 py-1.5 leading-snug shadow-lg"
          style={{ left: tip.x, transform: tip.flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <p className="text-2xs text-med">{tickFormat === "hour" ? shortDateTime(tip.time) : shortDate(tip.time)}</p>
          {series.map((s) => {
            const v = tip.values[s.id];
            if (v === undefined) return null;
            return (
              <p key={s.id} className="mt-0.5 flex items-center gap-1.5 text-sm font-medium tabular-nums text-high">
                <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {format ? format(v) : v.toFixed(1)}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
