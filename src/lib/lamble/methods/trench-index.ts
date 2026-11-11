/**
 * Trench index: one 0–100 read on how busy the trenches are against their own recent past. 0 is frozen, 100 is
 * peak euphoria. Pure: the service hands it daily fee rows and launch snapshots already in the release.
 *
 *   fees      50%  7-day launchpad fees (the non-overlapping fee subtotal), percentile against the last
 *                  90 days and against the last year, averaged. On bonding curves fees are a fixed share of
 *                  volume, so they stand in for launchpad volume.
 *   breadth   25%  share of those launchpads whose 7-day fees are at or above their own 90-day median, so a
 *                  single venue's run doesn't read as the whole market's.
 *   launches  25%  tokens created in the last 24 hours across indexed launchpads, percentile against up to
 *                  90 days of daily snapshots (the snapshots started 2026-09-28, so the window is shorter
 *                  until they have run for 90 days).
 */
import { DAY } from "../core/time.ts";

export const TRENCH_INDEX_VERSION = "trench-index-v1";

export const WEIGHTS = { fees: 0.5, breadth: 0.25, launches: 0.25 } as const;

/** Bands of the 0–100 scale, low to high. `from` is inclusive. */
export const TRENCH_BANDS = [
  { id: "frozen", label: "Frozen", from: 0 }, // not "Dead": the bands read as a temperature, coldest first
  { id: "cold", label: "Cold", from: 25 },
  { id: "warm", label: "Warm", from: 50 },
  { id: "hot", label: "Hot", from: 75 },
] as const;

export type TrenchBand = (typeof TRENCH_BANDS)[number];

/** A venue joins the breadth count once it has this many 7-day sums inside the 90-day window. */
const MIN_BREADTH_HISTORY = 30;
/** Below this many days of fee history in the 90-day window the index is not published. */
const MIN_FEE_HISTORY = 60;

export interface DailyValue {
  /** UTC day start, seconds. */
  day: number;
  value: number;
}

export interface TrenchIndexInput {
  /** The last settled UTC day to score (day start, seconds). */
  asOfDay: number;
  /** Daily fees for each venue in the fee subtotal, any order. */
  venueFees: Record<string, DailyValue[]>;
  /** Tokens created in the trailing 24 hours, summed over venues, one snapshot per day. */
  launches: DailyValue[];
}

export interface TrenchIndex {
  version: typeof TRENCH_INDEX_VERSION;
  /** The scored day, ISO date. */
  asOf: string;
  score: number;
  band: TrenchBand;
  fees: { score: number; value7d: number; pct90: number; pct365: number };
  breadth: { score: number; above: number; venues: number };
  launches: { score: number; latest: number; windowDays: number };
}

/** Share of the window at or below the current value, 0–100. The current day is part of its own window. */
function percentile(window: number[], current: number): number {
  return (100 * window.filter((v) => v <= current).length) / window.length;
}

/** Trailing 7-day sums keyed by the last day of each window; a window with a missing day is skipped. */
function rolling7(daily: Map<number, number>): Map<number, number> {
  const out = new Map<number, number>();
  for (const day of daily.keys()) {
    let sum = 0;
    let complete = true;
    for (let i = 0; i < 7; i++) {
      const v = daily.get(day - i * DAY);
      if (v === undefined) {
        complete = false;
        break;
      }
      sum += v;
    }
    if (complete) out.set(day, sum);
  }
  return out;
}

/** Values whose day falls in the `days` days ending on `end`, inclusive. */
function windowOf(series: Map<number, number>, end: number, days: number): number[] {
  const start = end - (days - 1) * DAY;
  return [...series].filter(([d]) => d >= start && d <= end).map(([, v]) => v);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function bandOf(score: number): TrenchBand {
  return [...TRENCH_BANDS].reverse().find((b) => score >= b.from) ?? TRENCH_BANDS[0];
}

/** Null when there is too little history to place the latest day (a fresh install, a gap in the fee rows). */
export function computeTrenchIndex({ asOfDay, venueFees, launches }: TrenchIndexInput): TrenchIndex | null {
  // Fees: the subtotal per day. A venue that didn't exist yet adds nothing, which is what happened.
  const subtotal = new Map<number, number>();
  for (const rows of Object.values(venueFees)) {
    for (const { day, value } of rows) if (day <= asOfDay) subtotal.set(day, (subtotal.get(day) ?? 0) + value);
  }
  const fees7 = rolling7(subtotal);
  const value7d = fees7.get(asOfDay);
  const last90 = windowOf(fees7, asOfDay, 90);
  if (value7d === undefined || last90.length < MIN_FEE_HISTORY) return null;
  const pct90 = percentile(last90, value7d);
  const pct365 = percentile(windowOf(fees7, asOfDay, 365), value7d);

  // Breadth: each venue against its own 90-day median.
  let above = 0;
  let venues = 0;
  for (const rows of Object.values(venueFees)) {
    const own = rolling7(new Map(rows.filter((r) => r.day <= asOfDay).map((r) => [r.day, r.value])));
    const current = own.get(asOfDay);
    const window = windowOf(own, asOfDay, 90);
    if (current === undefined || window.length < MIN_BREADTH_HISTORY) continue;
    venues++;
    if (current >= median(window)) above++;
  }

  // Launches: the latest snapshot against up to 90 days of them.
  const byDay = new Map(launches.map((l) => [l.day, l.value]));
  const lastLaunchDay = Math.max(...byDay.keys());
  const latest = byDay.get(lastLaunchDay);
  const launchWindow = windowOf(byDay, lastLaunchDay, 90);
  if (latest === undefined || venues === 0) return null;

  const parts = {
    fees: (pct90 + pct365) / 2,
    breadth: (100 * above) / venues,
    launches: percentile(launchWindow, latest),
  };
  const score = Math.round(parts.fees * WEIGHTS.fees + parts.breadth * WEIGHTS.breadth + parts.launches * WEIGHTS.launches);

  return {
    version: TRENCH_INDEX_VERSION,
    asOf: new Date(asOfDay * 1000).toISOString().slice(0, 10),
    score,
    band: bandOf(score),
    fees: { score: Math.round(parts.fees), value7d, pct90, pct365 },
    breadth: { score: Math.round(parts.breadth), above, venues },
    launches: { score: Math.round(parts.launches), latest, windowDays: launchWindow.length },
  };
}
