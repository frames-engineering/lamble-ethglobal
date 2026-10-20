/**
 * Metric registry. Every observation in the store names one of these. Flow metrics can be summed over
 * disjoint windows; stock and rolling metrics never are (weekly totals of holders, market caps or
 * rolling-24h observations are meaningless).
 */
import type { Unit } from "./measure.ts";

export type MetricKind = "flow" | "stock" | "rolling" | "price" | "rate";

export interface MetricSpec {
  unit: Unit;
  kind: MetricKind;
  label: string;
}

export const METRICS = {
  // Token market data (Codex)
  "token.price_usd": { unit: "usd_per_token", kind: "price", label: "Price" },
  "token.market_cap_circulating_usd": { unit: "usd", kind: "stock", label: "Circulating market cap" },
  "token.liquidity_usd": { unit: "usd", kind: "stock", label: "Liquidity" },
  "token.volume_rolling24h_usd": { unit: "usd", kind: "rolling", label: "Volume, rolling 24h" },
  "token.price_change_rolling24h_pct": { unit: "percent", kind: "rate", label: "Price change, rolling 24h" },
  "token.volume_usd": { unit: "usd", kind: "flow", label: "Volume in bucket" },
  "token.price_open_usd": { unit: "usd_per_token", kind: "price", label: "Open" },
  "token.price_high_usd": { unit: "usd_per_token", kind: "price", label: "High" },
  "token.price_low_usd": { unit: "usd_per_token", kind: "price", label: "Low" },
  "token.price_close_usd": { unit: "usd_per_token", kind: "price", label: "Close" },
  // Source-reported holder counts and shares (x4o2), never all-holder unless the source says so
  "token.holders_count_reported": { unit: "count", kind: "stock", label: "Holder count (source-reported)" },
  "token.top10_share_reported": { unit: "percent", kind: "stock", label: "Top-10 holder share (source-reported)" },
  // Venue financials (DefiLlama, keyed by provider slug)
  "venue.fees_usd": { unit: "usd", kind: "flow", label: "Fees" },
  "venue.revenue_usd": { unit: "usd", kind: "flow", label: "Revenue" },
  "venue.supply_side_usd": { unit: "usd", kind: "flow", label: "Creator earnings (supply side)" },
  // Indexed launchpad activity (Codex, keyed by provider row id; rolling windows)
  "index.created_rolling24h": { unit: "count", kind: "rolling", label: "Indexed launches, rolling 24h" },
  "index.created_rolling7d": { unit: "count", kind: "rolling", label: "Indexed launches, rolling 7d" },
  "index.completed_rolling24h": { unit: "count", kind: "rolling", label: "Indexed completions, rolling 24h" },
  "index.completed_rolling7d": { unit: "count", kind: "rolling", label: "Indexed completions, rolling 7d" },
  "index.migrated_rolling24h": { unit: "count", kind: "rolling", label: "Indexed migrations, rolling 24h" },
} as const satisfies Record<string, MetricSpec>;

export type MetricKey = keyof typeof METRICS;

export function isMetricKey(value: string): value is MetricKey {
  return Object.hasOwn(METRICS, value);
}

/** Throws when asked to sum a non-flow metric over time. */
export function assertSummable(metric: MetricKey): void {
  if (METRICS[metric].kind !== "flow") throw new Error(`${metric} is a ${METRICS[metric].kind} metric; it cannot be summed over time`);
}
