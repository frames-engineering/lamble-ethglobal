/**
 * Core data model for the LAMBLE landing page.
 *
 * The landing page serves a dated Frames research snapshot.
 * The shapes are deliberately backend-friendly so a real API can replace the
 * provider without touching components.
 */

export type ChainId =
  | "solana"
  | "base"
  | "bsc"
  | "ethereum"
  | "arbitrum"
  | "monad"
  | "robinhood"
  | "arc"
  | "xlayer"
  | "unichain";

/** One sample in a time series. `time` is unix seconds (UTC midnight for daily data). */
export interface Point {
  time: number;
  value: number | null;
}

export type Timeframe = "h24" | "d7" | "d30";

export interface PeriodMetrics {
  /** Trading + graduation fees paid by users, USD. */
  fees: number | null;
  /** Share of fees kept by the launchpad, USD. */
  revenue: number | null;
  /** Change vs the previous period, in percent (e.g. -12.5). */
  change: number | null;
}

export interface FeeModel {
  /** Swap fee on the bonding curve, in basis points. */
  tradingFeeBps: number | null;
  /** Portion of the swap fee routed to the token creator, in basis points of the fee. */
  creatorShareBps: number | null;
  /** Cost to create a token, USD (0 = free). */
  launchCostUsd: number | null;
  /** Market cap at which the token graduates to a DEX, USD. */
  graduationTargetUsd: number | null;
  note?: string | null;
}

export interface LaunchpadMetrics {
  h24: PeriodMetrics;
  d7: PeriodMetrics;
  d30: PeriodMetrics;
  launched24h: number | null;
  launched7dAvg: number | null;
  graduated24h: number | null;
  /** Graduations / launches over the last 7 days, percent. */
  graduationRate7d: number | null;
  /** 30 daily points of fees, oldest first. */
  history30d: Point[];
}

export interface Launchpad {
  slug: string;
  name: string;
  domain: string;
  url: string;
  twitter?: string;
  description: string;
  chains: ChainId[];
  /** Hex color used by the letter-mark avatar. */
  brandColor: string;
  /** Optional local logo path under /public. Falls back to the letter-mark. */
  logoSrc?: string;
  bestFor: string[];
  /** Where graduated tokens end up trading. */
  graduatesTo: string | null;
  feeModel: FeeModel;
  /** Short reasons the router would pick this venue. */
  routingNotes: string[];
  metrics: LaunchpadMetrics;
  hasBondingCurve?: boolean | null;
  /** Financial coverage is distinct from verified supported chains above. */
  metricChains?: ChainId[];
  /** Beta indexed observations; not independently verified complete event counts. */
  activityObservation?: {
    sourceAsOf: number;
    providerIds: string[];
    indexedCreated24: number;
    indexedCompleted24: number | null;
    indexed7dAvg: number;
    indexed7dCompletionRate: number | null;
    coverage: string;
  };
  provenance?: {
    financialAnchor: string;
    scope: string;
    additionalMetricChains: string[];
    supportedChainCoverage?: string;
    additionalSupportedChains?: string[];
    metadataSourceUrls?: string[];
    metadataFetchedAt?: string;
    sourceUrl: string | null;
    methodology: Record<string, string>;
    deliveryDisputed: boolean;
    configurationVariants: string[];
  };
}

export type NarrativeStatus = "heating" | "peak" | "cooling";

export type NarrativeCategory =
  | "ai-agents"
  | "politifi"
  | "animals"
  | "culture"
  | "infra"
  | "stonks";

export interface Contender {
  id: string;
  name: string;
  symbol?: string;
  /** Share of the narrative's launch attention, percent. */
  share: number | null;
  /** Change in share over 24h, percentage points. */
  change24h: number | null;
  color: string;
  launchpadSlug?: string;
  address?: string;
  explorerUrl?: string;
  measuredVolumeShare?: number;
}

/** A launchpad's slice of the launches in one narrative. */
export interface NarrativeLaunchpad {
  slug: string;
  /** Share of the narrative's launches on this venue, percent. */
  share: number | null;
  /** Change in share over 24h, percentage points. */
  change24h: number | null;
}

export type SignalSource = "onchain" | "x" | "launchpad" | "newswire";

export interface Signal {
  id: string;
  source: SignalSource;
  /** Human label for the source, e.g. "On-chain", "X trend". */
  label: string;
  title: string;
  /** ISO timestamp. */
  at: string;
  url?: string;
}

export interface ExampleToken {
  symbol: string;
  name: string;
  launchpadSlug: string;
  chain: ChainId;
  address?: string;
  mcapUsd: number | null;
  change24h: number | null;
}

export interface NarrativeSeries {
  id: string;
  label: string;
  color: string;
  /** Hourly points over the last 24h, oldest first. Values are USD volume traded in that hour. */
  points: Point[];
}

export interface Narrative {
  id: string;
  slug: string;
  title: string;
  category: NarrativeCategory;
  summary: string;
  status: NarrativeStatus | null;
  /** Share of all launch attention right now, percent. */
  mindshare: number | null;
  /** Change in mindshare over 24h, percentage points. */
  change24h: number | null;
  volume24hUsd: number | null;
  volume7dUsd: number | null;
  launches24h: number | null;
  launches7d: number | null;
  /** ISO timestamp of when the narrative started trending. */
  startedAt: string | null;
  series: NarrativeSeries[];
  /** Optional seven-day hourly volume, same explicit constituent universe. */
  extendedSeries?: NarrativeSeries[];
  /** Percent change in sampled volume versus prior 24h; not mindshare. */
  volumeChange24h?: number | null;
  contenders: Contender[];
  /** Venues carrying the most launches in this narrative, largest first. */
  topLaunchpads: NarrativeLaunchpad[] | null;
  signals: Signal[];
  exampleTokens: ExampleToken[];
  suggestedLaunchpads: { slug: string; reason: string }[];
  provenance?: {
    chartAnchor: string;
    volumeScope: string;
    sources: { label: string; url: string }[];
  };
}

export interface DataProvider {
  getLaunchpads(): Promise<Launchpad[]>;
  getNarratives(): Promise<Narrative[]>;
}
