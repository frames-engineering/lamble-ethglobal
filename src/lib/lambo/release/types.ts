/**
 * Release contract. A release is an immutable directory under data/releases/<releaseId>/:
 *
 *   manifest.json   identity, cutoff, data-through per component, method versions, file checksums, validation
 *   public.json     everything the website renders (public facts; scrapeable by design)
 *   bundles.json    paid API additions: provenance-level series, full histories, evidence graph, method inputs
 *   changes.json    change events this release introduced, numbered on one global cursor
 *
 * The website reads public.json only. bundles.json is read only by the paid fulfillment path.
 */
import type { Chain } from "../core/identity.ts";
import type { DataState, Measure } from "../core/measure.ts";

export const RELEASE_SCHEMA = "lambo.release.v1";

export interface SeriesPoint {
  time: number;
  value: number | null;
}

export interface ReleaseManifest {
  schemaVersion: typeof RELEASE_SCHEMA;
  releaseId: string;
  dataCutoff: string;
  generatedAt: string;
  latestRun: string;
  sourceRuns: string[];
  dataThrough: { financial: string | null; hourlyVolume: string | null; dailyVolume: string | null; prices: string | null; membership: string };
  methodVersions: Record<string, string>;
  files: Record<string, { sha256: string; bytes: number }>;
  contentSha256: string;
  counts: Record<string, number>;
  previousReleaseId: string | null;
  changes: { fromSeq: number; toSeq: number; count: number; reconstructed: boolean };
  validation: { passed: boolean; checks: { id: string; passed: boolean; detail: string }[] };
  limitations: string[];
}

export interface Evidence {
  id: string;
  kind: "frames-call" | "x-post" | "page" | "curated-source" | "legacy";
  label: string;
  url: string | null;
  at: string | null;
  route: string;
}

export interface MembershipPublic {
  intervalId: string;
  narrativeId: string;
  narrativeSlug: string;
  narrativeTitle: string;
  tokenId: string;
  effectiveFrom: string;
  recordedAt: string;
  effectiveTo: string | null;
  collection: "collected" | "collection_paused" | "inactive" | "ended";
  observedThrough: string | null;
  basis: string;
  rationale: string | null;
  closeReason: string | null;
  evidence: string[];
}

export interface BottomingPublic {
  state: "not_applicable" | "insufficient_data" | "evaluated";
  stage: number | null;
  label: string;
  priceBasis: "candles" | "samples" | "none";
  asOf: string;
  episodeId: string | null;
  peak: { time: string; price: number } | null;
  low: { time: string; price: number } | null;
  drawdownCurrent: number | null;
  drawdownMax: number | null;
  secondsSinceLow: number | null;
  conditions: { id: "capitulation" | "low_holds" | "absorption"; label: string; state: string; detail: string }[];
  explanation: string;
  invalidatesIf: string[];
  history: { asOf: string; state: string; stage: number | null; label: string }[];
  episodes: { id: string; peakTime: string; peakPrice: number; lowTime: string; lowPrice: number; closedAt: string | null; closeReason: string | null; invalidations: number }[];
  methodVersion: string;
}

export interface HolderComponentPublic {
  /** Label, area and requirements: ReleasePublic.methods.holderComponents. */
  id: string;
  measure: Measure<number>;
  inputs: Record<string, unknown>;
  history: SeriesPoint[];
}

export interface CoinPublic {
  id: string;
  chain: Chain;
  address: string;
  displayAddress: string;
  name: string | null;
  symbol: string | null;
  names: { name: string; symbol: string }[];
  explorerUrl: string | null;
  identity: {
    tokenCreatedAt: string | null;
    tokenCreatedBasis: string | null;
    firstObservedAt: string;
    firstAvailableAt: string;
    firstObservedRun: string;
    originVenue: string | null;
    originStatus: string | null;
    pools: { poolId: string; address: string; kind: string; createdAt: string | null }[];
  };
  collection: { status: "collected" | "collection_paused" | "inactive"; lastCollectedAt: string | null; note: string };
  market: {
    price: Measure<number>;
    marketCap: Measure<number>;
    fdv: Measure<number>;
    liquidity: Measure<number>;
    volume24hRolling: Measure<number>;
    priceChange24hRolling: Measure<number>;
    change1d: Measure<number>;
    change7d: Measure<number>;
    change30d: Measure<number>;
    volume7d: Measure<number>;
  };
  charts: { price: SeriesPoint[]; priceBasis: "snapshot-samples" | "daily-candles"; volumeDaily: SeriesPoint[]; volumeDailyEnd: string | null };
  holders: { components: HolderComponentPublic[]; composite: { state: string; score: number | null; bound: [number, number] | null; note: string; version: string }; methodVersion: string };
  bottoming: BottomingPublic;
  memberships: MembershipPublic[];
  /** return7d is a fraction (−0.41 = −41%). */
  peers: { tokenId: string; symbol: string | null; narrativeSlug: string; return7d: number | null }[];
  providerPanels: { capability: string; applicable: boolean; state: DataState; note: string }[];
  evidence: string[];
}

export interface NarrativeMemberPublic {
  tokenId: string;
  symbol: string | null;
  name: string | null;
  chain: Chain;
  intervalId: string;
  effectiveFrom: string;
  collection: MembershipPublic["collection"];
  observedThrough: string | null;
  volume24h: number | null;
  volume7d: number | null;
  share7d: number | null;
  /** Fraction (−0.41 = −41%), unlike the percent-valued market change measures. */
  return7d: number | null;
  originVenue: string | null;
}

export interface NarrativePublic {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  summary: string | null;
  lifecycle: { state: "collected" | "collection_paused" | "retired"; since: string; reason: string | null; history: { state: string; from: string; to: string | null; reason: string | null }[] };
  featured: { featured: boolean; rank: number | null };
  trend: "new" | "rising" | "steady" | "fading" | "unknown" | "not_collected";
  firstObservedAt: string;
  story: { notice: string | null; interpretation: string | null; observedAt: string | null; evidence: string | null } | null;
  evidence: { projectClaims: Evidence[]; independent: Evidence[]; posts: Evidence[]; note: string };
  members: NarrativeMemberPublic[];
  memberCounts: { open: number; collected: number; paused: number; inactive: number; ended: number };
  activity: {
    volume24h: Measure<number>;
    volume7d: Measure<number>;
    volume30d: Measure<number>;
    change7dPct: number | null;
    hourly: SeriesPoint[];
    daily: SeriesPoint[];
    lastObservedAt: string | null;
    volumeScope: string;
    caveat: string | null;
  };
  concentration: { top1Share: number | null; hhi: number | null };
  breadth: { advancing: number; withPrices: number; members: number };
  overlap: { narrativeSlug: string; tokens: number }[];
}

export interface LaunchpadPublic {
  slug: string;
  name: string;
  presentation: Record<string, unknown>;
  financialAnchor: string | null;
  metrics: {
    h24: { fees: number | null; revenue: number | null; supplySide: number | null; change: number | null };
    d7: { fees: number | null; revenue: number | null; supplySide: number | null; change: number | null };
    d30: { fees: number | null; revenue: number | null; supplySide: number | null; change: number | null };
    history30d: SeriesPoint[];
  };
  feeSubtotal: { included: boolean; excludedReason: string | null };
  indexed: { asOf: string; created24: number; created7d: number; completed24: number | null; completed7d: number | null; history: { asOf: string; created24: number }[] } | null;
  coins: { tokenId: string; symbol: string | null }[];
  narratives: { slug: string; title: string; coins: number }[];
  supplySideDefinition: string | null;
}

export interface MarketPublic {
  feeSubtotal: { value: number | null; anchor: string | null; history30d: SeriesPoint[]; included: string[]; excluded: Record<string, string>; scope: string; change7dPct: number | null };
  creatorEarnings: { value7d: number | null; venues: string[]; scope: string };
  indexed: { created24: number | null; completed24: number | null; completionVenues: number; creationVenues: number; asOf: string | null; scope: string };
  rolling7d: { start: string; end: string; narrativeVolume: number | null; fees: number | null; note: string };
  developingWeek: { id: string; start: string; through: string; fees: number | null; feeDays: number; narrativeVolume: number | null; volumeDays: number; partial: true };
  narratives: { slug: string; title: string; volume7d: number | null; change7dPct: number | null; trend: string; featured: boolean }[];
  tracked: { coins: number; collected: number; narratives: number; collectedNarratives: number };
}

export interface ReleasePublic {
  schemaVersion: typeof RELEASE_SCHEMA;
  releaseId: string;
  dataCutoff: string;
  coins: CoinPublic[];
  narratives: NarrativePublic[];
  launchpads: LaunchpadPublic[];
  market: MarketPublic;
  evidence: Record<string, Evidence>;
  coverage: { capability: string; status: string; enabled: boolean; population: string | null; coverage: string }[];
  evaluation: unknown;
  methods: {
    holderComponents: { id: string; label: string; requires: string[]; maxAgeSeconds: number; unavailableNote: string | null }[];
    providerPanels: { capability: string; status: string; enabled: boolean; note: string; coverage: string }[];
    bottomingEvaluationTimes: string[];
  };
}

export interface ChangeEvent {
  seq: number;
  releaseId: string;
  at: string;
  entityType: "coin" | "narrative" | "launchpad" | "market" | "research" | "edition";
  entityId: string;
  kind: string;
  summary: string;
  from: unknown;
  to: unknown;
  reconstructed: boolean;
}
