import type { Point } from "./types";

/** Snapshot the fixtures are anchored to. All relative times are computed against it. */
export const SNAPSHOT_AT = "2026-09-26T00:00:00Z";
export const SNAPSHOT_TS = Math.floor(Date.parse(SNAPSHOT_AT) / 1000);
export const DAY = 86_400;
export const HOUR = 3_600;

/** Small, fast, deterministic PRNG (mulberry32). Returns numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string, for deriving seeds from slugs. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Standard normal sample from a uniform generator (Box–Muller). */
export function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface RandomWalkOptions {
  seed: number | string;
  /** Number of points. */
  n: number;
  /** Seconds between points. Defaults to one day. */
  step?: number;
  /** Value of the last point. The walk is generated backwards from here. */
  end: number;
  /** Value of the first point. Defaults to `end` (flat drift). */
  start?: number;
  /** Relative volatility per step, e.g. 0.12. */
  vol: number;
  min?: number;
  max?: number;
  /** Unix seconds of the last point. Defaults to the snapshot. */
  endTime?: number;
  /** "linear" interpolates start→end; "geometric" compounds (exponential growth or decay). */
  drift?: "linear" | "geometric";
}

/**
 * Deterministic series (daily unless `step` says otherwise) that ends exactly
 * at `end` and drifts from `start`. Multiplicative noise keeps values
 * positive and scale-free.
 */
export function randomWalk(opts: RandomWalkOptions): (Point & { value: number })[] {
  const { n, end, vol } = opts;
  const step = opts.step ?? DAY;
  const start = opts.start ?? end;
  const min = opts.min ?? 0;
  const max = opts.max ?? Number.POSITIVE_INFINITY;
  const endTime = opts.endTime ?? SNAPSHOT_TS;
  const rand = mulberry32(typeof opts.seed === "string" ? hashSeed(opts.seed) : opts.seed);

  // Build noise multipliers, then rescale so the path lands on `end`.
  const noise: number[] = [];
  for (let i = 0; i < n; i++) noise.push(Math.exp(gaussian(rand) * vol));

  const raw: number[] = [];
  let acc = 1;
  for (let i = 0; i < n; i++) {
    acc *= noise[i] ?? 1;
    raw.push(acc);
  }
  const last = raw[n - 1] ?? 1;

  const points: (Point & { value: number })[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const drift =
      opts.drift === "geometric" && start > 0 && end > 0
        ? Math.exp(Math.log(start) + (Math.log(end) - Math.log(start)) * t)
        : start + (end - start) * t;
    // Noise is relative to the drift line and pinned to 1 at the end.
    const rel = (raw[i] ?? 1) / (last ** t);
    const value = Math.min(max, Math.max(min, drift * rel));
    points.push({ time: endTime - (n - 1 - i) * step, value });
  }
  // Pin the last point exactly.
  const lastPoint = points[n - 1];
  if (lastPoint) lastPoint.value = Math.min(max, Math.max(min, end));
  return points;
}
