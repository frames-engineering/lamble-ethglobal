"use client";

import { useEffect, useRef, useState } from "react";
import { gaussian, hashSeed, mulberry32 } from "@/lib/data/seeded";

export interface TickerSeriesSpec {
  id: string;
  /** Long-run mean the walk reverts to. */
  mean: number;
  /** Step noise as a fraction of the mean. */
  sigma?: number;
}

export interface TickerPoint {
  time: number;
  value: number;
}

export interface TickerSeries {
  id: string;
  data: TickerPoint[];
  value: number;
}

interface Options {
  series: TickerSeriesSpec[];
  seed?: string;
  tickMs?: number;
  /** Points kept per series. */
  keep?: number;
  /** Seconds of history to backfill on mount so the chart is not empty. */
  backfillSeconds?: number;
  paused?: boolean;
}

/**
 * Mean-reverting random walk per series, one tick per `tickMs`. Deterministic
 * given the seed. Returns fresh arrays each tick so consumers can diff props.
 */
export function useMockTicker({
  series,
  seed = "pulse",
  tickMs = 1000,
  keep = 600,
  backfillSeconds = 90,
  paused = false,
}: Options): TickerSeries[] {
  const specKey = series.map((s) => `${s.id}:${s.mean}:${s.sigma ?? 0.08}`).join("|");
  const state = useRef<{ key: string; rand: () => number; values: number[]; buffers: TickerPoint[][] } | null>(null);
  const [out, setOut] = useState<TickerSeries[]>([]);

  useEffect(() => {
    const specs = series;
    const st = state.current;
    if (!st || st.key !== specKey) {
      const rand = mulberry32(hashSeed(`${seed}:${specKey}`));
      const values = specs.map((s) => s.mean);
      const buffers = specs.map(() => [] as TickerPoint[]);
      const now = Math.floor(Date.now() / 1000);
      // Backfill so the chart opens with a line instead of a dot.
      for (let t = backfillSeconds; t >= 1; t--) {
        specs.forEach((s, i) => {
          const sigma = (s.sigma ?? 0.08) * s.mean;
          const v = Math.max(0, (values[i] ?? s.mean) + 0.08 * (s.mean - (values[i] ?? s.mean)) + sigma * gaussian(rand));
          values[i] = v;
          buffers[i]?.push({ time: now - t, value: v });
        });
      }
      state.current = { key: specKey, rand, values, buffers };
      setOut(specs.map((s, i) => ({ id: s.id, data: [...(buffers[i] ?? [])], value: values[i] ?? s.mean })));
    }
    if (paused) return;

    const id = window.setInterval(() => {
      const cur = state.current;
      if (!cur) return;
      const now = Date.now() / 1000;
      specs.forEach((s, i) => {
        const prev = cur.values[i] ?? s.mean;
        const sigma = (s.sigma ?? 0.08) * s.mean;
        const v = Math.max(0, prev + 0.08 * (s.mean - prev) + sigma * gaussian(cur.rand));
        cur.values[i] = v;
        const buf = cur.buffers[i];
        if (buf) {
          buf.push({ time: now, value: v });
          if (buf.length > keep) buf.splice(0, buf.length - keep);
        }
      });
      setOut(specs.map((s, i) => ({ id: s.id, data: [...(cur.buffers[i] ?? [])], value: cur.values[i] ?? s.mean })));
    }, tickMs);
    return () => window.clearInterval(id);
  }, [specKey, seed, tickMs, keep, backfillSeconds, paused, series]);

  return out;
}
