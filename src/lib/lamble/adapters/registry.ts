/**
 * Registered adapters. A capability can only be enabled when its `adapter` key is listed here
 * (checkCatalogRules); adding a tool id to the catalog alone never enables production use.
 */
import { codexLaunchpadActivity, codexTokenBars, codexTokenDiscovery, codexTokenMetadata, codexTokenSnapshot } from "./codex.ts";
import { defillamaFees } from "./defillama.ts";
import { curationAdapter } from "./lamble.ts";
import { firecrawlScrape, xSearch } from "./social.ts";
import type { Adapter } from "./types.ts";
import {
  fomoActivity,
  fomoCandles,
  fomoDevelopers,
  fomoFeed,
  fomoHolders,
  fomoList,
  fomoTheses,
  fomoToken,
  pumpCandles,
  pumpCoin,
  pumpHolders,
  pumpList,
  pumpTraders,
  pumpTrades,
} from "./x4o2.ts";

const ALL: Adapter[] = [
  codexTokenBars,
  codexTokenSnapshot,
  codexTokenDiscovery,
  codexTokenMetadata,
  codexLaunchpadActivity,
  defillamaFees,
  xSearch,
  firecrawlScrape,
  curationAdapter,
  fomoFeed,
  fomoActivity,
  fomoHolders,
  fomoCandles,
  fomoToken,
  fomoList,
  fomoTheses,
  fomoDevelopers,
  pumpHolders,
  pumpCandles,
  pumpTrades,
  pumpCoin,
  pumpList,
  pumpTraders,
];

export const ADAPTERS: ReadonlyMap<string, Adapter> = new Map(ALL.map((a) => [a.key, a]));
export const ADAPTER_KEYS: ReadonlySet<string> = new Set(ADAPTERS.keys());

export function adapterFor(key: string | null): Adapter | null {
  return key ? (ADAPTERS.get(key) ?? null) : null;
}
