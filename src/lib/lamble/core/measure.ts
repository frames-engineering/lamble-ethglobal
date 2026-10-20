/**
 * Every published number carries its state. Zero is a measured zero; a missing value is never zero.
 *
 * - observed: taken from a source observation.
 * - derived: computed deterministically from observed inputs.
 * - stale: observed or derived, but older than the component's accepted age. The value is kept and labelled.
 * - insufficient_data: the method applies, but the evidence it needs is missing or too thin.
 * - unavailable: no source in the catalog provides this input for this entity (or its capability is not enabled).
 * - not_applicable: the measure does not apply (for example a bottoming test outside a drawdown).
 */
export const DATA_STATES = ["observed", "derived", "stale", "insufficient_data", "unavailable", "not_applicable"] as const;
export type DataState = (typeof DATA_STATES)[number];

export type Unit =
  | "usd"
  | "usd_per_token"
  | "percent"
  | "percentage_points"
  | "ratio"
  | "count"
  | "seconds"
  | "token_units"
  | "score"
  | "boolean"
  | "text";

export interface Coverage {
  /** What population or universe the value describes, in words a reader can check. */
  scope: string;
  /** Share of the required inputs that were observed, 0..1, when it can be computed. */
  fraction?: number | null;
  /** Observed inputs and required inputs, when countable. */
  observed?: number;
  required?: number;
  /** Population label for holder data, which is never silently widened. */
  population?: "all_holders" | "top_holders_sample" | "fomo_users" | "pump_users" | "recent_trades_sample" | "tracked_universe" | "covered_venues";
}

export interface Measure<T = number> {
  state: DataState;
  value: T | null;
  unit: Unit;
  /** Source observation or computation time of the value itself (component-specific). */
  asOf: number | null;
  window?: { start: number; end: number } | null;
  coverage?: Coverage | null;
  /** Evidence ids; resolve through the release's evidence index. */
  evidence?: string[];
  method?: string | null;
  /** Why the value is missing, stale or qualified. */
  note?: string | null;
}

export function observed<T = number>(value: T, unit: Unit, asOf: number | null, extra: Partial<Measure<T>> = {}): Measure<T> {
  return { ...extra, state: "observed", value, unit, asOf };
}

export function derived<T = number>(value: T, unit: Unit, asOf: number | null, extra: Partial<Measure<T>> = {}): Measure<T> {
  return { ...extra, state: "derived", value, unit, asOf };
}

export function missing<T = number>(
  state: "insufficient_data" | "unavailable" | "not_applicable",
  unit: Unit,
  note: string,
  extra: Partial<Measure<T>> = {},
): Measure<T> {
  return { ...extra, state, value: null, unit, asOf: extra.asOf ?? null, note };
}

export function hasValue<T>(m: Measure<T>): m is Measure<T> & { value: T } {
  return m.value !== null && (m.state === "observed" || m.state === "derived" || m.state === "stale");
}

/** Labels a value stale when its own asOf is older than maxAge at `now`. Never refreshes asOf. */
export function withFreshness<T>(m: Measure<T>, now: number, maxAgeSeconds: number): Measure<T> {
  if (!hasValue(m) || m.asOf === null || m.state === "stale") return m;
  if (now - m.asOf <= maxAgeSeconds) return m;
  return { ...m, state: "stale", note: m.note ?? `Older than ${Math.round(maxAgeSeconds / 3600)}h at release time.` };
}

/** Throws when a measure breaks the state contract: values only in value-bearing states, never NaN. */
export function assertMeasure(m: Measure<unknown>, where: string): void {
  const bearing = m.state === "observed" || m.state === "derived" || m.state === "stale";
  if (bearing && m.value === null) throw new Error(`${where}: ${m.state} measure without a value`);
  if (!bearing && m.value !== null) throw new Error(`${where}: ${m.state} measure carries a value`);
  if (typeof m.value === "number" && !Number.isFinite(m.value)) throw new Error(`${where}: non-finite value`);
  if (!bearing && !m.note) throw new Error(`${where}: ${m.state} measure needs a note`);
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (100 * (current - previous)) / previous;
}

/** Exactly rounded sum (Shewchuk), matching Python's math.fsum used by the normalizer. */
export function fsum(values: readonly number[]): number {
  const partials: number[] = [];
  for (let x of values) {
    let i = 0;
    for (let y of partials) {
      if (Math.abs(x) < Math.abs(y)) [x, y] = [y, x];
      const hi = x + y;
      const lo = y - (hi - x);
      if (lo) partials[i++] = lo;
      x = hi;
    }
    partials.length = i;
    partials.push(x);
  }
  return partials.reduce((a, b) => a + b, 0);
}

/** Sum that is unknown when any input is unknown. */
export function sumOrNull(values: readonly (number | null)[]): number | null {
  if (values.some((v) => v === null)) return null;
  return fsum(values as number[]);
}
