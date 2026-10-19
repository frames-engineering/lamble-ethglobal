/** Server-only catalog loading. */
import type { Catalog } from "./catalog.ts";
import { readJson, resolveFromRoot } from "../server/io.ts";

export const CATALOG_PATH = "docs/data/providers.json";
export const JOBS_PATH = "docs/data/jobs.json";
export const REGISTRY_PATH = "docs/prompts/refresh-market-data.sources.json";

let cached: Catalog | null = null;

export function loadCatalog(fresh = false): Catalog {
  if (!cached || fresh) cached = readJson<Catalog>(resolveFromRoot(CATALOG_PATH));
  return cached;
}

export interface JobSpec {
  id: string;
  kind: "paid-collection" | "free-probe" | "offline" | "delivery";
  description: string;
  cadence: string;
  cron: string | null;
  scheduleStatus: "active-external" | "configured" | "manual";
  scheduleEvidence: string;
  capabilities: string[];
  scope: string;
  budget: { maxCreditsPerRun: number; typicalCredits: string; authorization: string; maxDeliveriesPerDestinationPerDay?: number };
  pagination: Record<string, unknown>;
  freshness: Record<string, unknown>;
  writerGroup: string;
  outputs: string[];
}

export interface JobsConfig {
  jobsVersion: number;
  updatedAt: string;
  policy: Record<string, string>;
  codexBars: { fields: string[]; ohlcFields: string[]; ohlcEnabled: boolean; ohlcStatus: string; maxAliasesPerCall: number; bodyCharLimit: number };
  jobs: JobSpec[];
}

export function loadJobs(): JobsConfig {
  return readJson<JobsConfig>(resolveFromRoot(JOBS_PATH));
}

export interface RegistryVenue {
  slug: string;
  providerSlug: string;
  scope: string;
  methodology?: Record<string, string>;
  indexedProviderIds?: string[];
}

export interface RegistryPool {
  tokenId: string;
  name: string;
  symbol: string;
  chain: string;
  address: string;
  originLaunchpadSlug: string;
  originStatus: string;
  pool: string;
  networkId: number;
  narrativeId: string;
}

export interface Registry {
  venues: RegistryVenue[];
  poolUniverse: RegistryPool[];
  feeExclusions: Record<string, string>;
  narrativeRules: Record<string, Record<string, unknown>>;
  capabilities?: Record<string, string>;
  [key: string]: unknown;
}

export function loadRegistry(): Registry {
  return readJson<Registry>(resolveFromRoot(REGISTRY_PATH));
}
