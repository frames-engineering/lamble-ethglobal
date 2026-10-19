import type { Capability, Population } from "../catalog/catalog.ts";
import type { MetricKey } from "../core/metrics.ts";

export interface AdapterInput {
  body: unknown;
  request: { id: string; args: Record<string, unknown> };
  capability: Capability;
  /** When Lambo fetched the body (unix seconds). Bodies without a source time use this as observation time. */
  fetchedAt: number;
}

export interface ObservationRecord {
  entityType: "token" | "venue_provider" | "index_row" | "pool";
  entityId: string;
  metric: MetricKey;
  value: number;
  windowStart: number | null;
  windowEnd: number | null;
  /** Source event or as-of time; null when the source gives none (then fetchedAt is the observation time). */
  eventTime: number | null;
  extraction: string;
  population?: Population;
}

export interface TokenFact {
  tokenId: string;
  name?: string;
  symbol?: string;
  description?: string;
  sourceLaunchpad?: string;
  /** Token creation time as the source indexes it; not decoded from a creation transaction. */
  createdAt?: number;
  pool?: { poolId: string; createdAt: number | null };
  extraction: string;
}

export type EventClass = "trade" | "transfer" | "pinned_post" | "social" | "listing" | "other";

export interface EventRecord {
  /** Stable provider id; pages and runs are deduplicated on it. */
  sourceId: string;
  class: EventClass;
  type: string;
  tokenId: string | null;
  eventTime: number | null;
  side?: "buy" | "sell";
  usd?: number | null;
  wallet?: string | null;
  population: Population | "market_tape_sample";
  extraction: string;
}

export interface HolderRow {
  wallet: string;
  amount: number | null;
  valueUsd: number | null;
  /** Source-reported until independently validated. */
  costBasisUsd: number | null;
  isDeveloper: boolean | null;
}

export interface HolderPanel {
  tokenId: string;
  population: Population;
  /** A panel is complete only when the source says it covers every holder; x4o2 panels never do. */
  complete: false;
  observedAt: number | null;
  rows: HolderRow[];
  extraction: string;
}

export interface CandleRecord {
  tokenId: string;
  start: number;
  resolutionSeconds: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volumeUsd: number | null;
  measure: "price_usd";
}

export interface PostRecord {
  postId: string;
  url: string;
  author: string;
  createdAt: number | null;
  text: string;
  query: string | null;
}

export interface PageRecord {
  url: string;
  title: string | null;
  usable: boolean;
  reason?: string;
}

export interface SourceMeta {
  observedAt: number | null;
  source: string | null;
  stale: boolean | null;
  cacheAgeSeconds: number | null;
}

export interface AdapterOutput {
  observations: ObservationRecord[];
  tokens: TokenFact[];
  events: EventRecord[];
  panels: HolderPanel[];
  candles: CandleRecord[];
  posts: PostRecord[];
  pages: PageRecord[];
  meta: SourceMeta | null;
  /** Problems that did not stop normalization (skipped rows, unverified fields). */
  warnings: string[];
  /** True when the adapter refused to normalize (for example an unverified field map). */
  refused: boolean;
}

export interface Adapter {
  key: string;
  normalize(input: AdapterInput): AdapterOutput;
}

export function emptyOutput(): AdapterOutput {
  return { observations: [], tokens: [], events: [], panels: [], candles: [], posts: [], pages: [], meta: null, warnings: [], refused: false };
}

export class AdapterError extends Error {}

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}
