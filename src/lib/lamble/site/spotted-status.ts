/**
 * Status rules for Just spotted (src/components/overview/just-spotted.tsx). Pure: every rule reads one scout snapshot
 * (spotted.json has no price change, liquidity or scan-to-scan delta), so each status describes the coin or lead as of
 * the latest scan, never a trend.
 */
import type { SpottedCoin, SpottedLead } from "./spotted.ts";

/** Churning: 24h volume at least this many times the market cap. (The pipeline flags 10× turnover and quarantines 100×.) */
export const CHURN_TURNOVER = 20;
/** Running: 24h volume per hour since the first pool (at least one hour) at or above this. A volume pace, not price. */
export const RUN_PACE_USD_PER_HOUR = 1_000_000;
/** Ageing out: first pool at least this old. New coins leave the list at the scout's newCoinHours (24h). */
export const AGEING_OUT_HOURS = 18;

export type CoinStatus = "just-in" | "churning" | "running" | "ageing-out";

/** Whether `at` is the scan itself: first seen by the latest scout run. */
export const inLatestScan = (at: string, generatedAt: string) => Date.parse(at) >= Date.parse(generatedAt);

/** 24h volume over market cap; null when the market cap is unknown or zero. */
export const turnover = (c: Pick<SpottedCoin, "volume24Usd" | "mcapUsd">) => (c.mcapUsd ? c.volume24Usd / c.mcapUsd : null);

/** 24h volume per hour since the first pool, counting at least one hour. */
export const pace = (c: Pick<SpottedCoin, "volume24Usd" | "ageHours">) => c.volume24Usd / Math.max(c.ageHours, 1);

/**
 * One status per coin, first match wins. Churning is checked before Running so a caution is never hidden behind a
 * positive label; Just in comes first because it is about the scan, not the coin.
 */
export function coinStatus(c: Pick<SpottedCoin, "firstSpottedAt" | "volume24Usd" | "mcapUsd" | "ageHours">, generatedAt: string): CoinStatus | null {
  if (inLatestScan(c.firstSpottedAt, generatedAt)) return "just-in";
  const t = turnover(c);
  if (t !== null && t >= CHURN_TURNOVER) return "churning";
  if (pace(c) >= RUN_PACE_USD_PER_HOUR) return "running";
  if (c.ageHours >= AGEING_OUT_HOURS) return "ageing-out";
  return null;
}

/**
 * Leads: the data's `confirmed` (a post about the story was found) is shown as a Potential Narrative; the data's
 * `tracked` (the daily refresh adopted the theme into a narrative) is shown as Narrative Confirmed. The display word
 * "Confirmed" is the data's `tracked`, not its `confirmed`.
 */
export type LeadStatus = "potential" | "confirmed";
export const leadStatus = (l: Pick<SpottedLead, "status">): LeadStatus => (l.status === "tracked" ? "confirmed" : "potential");
