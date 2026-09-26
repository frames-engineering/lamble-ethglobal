/**
 * Core data model for the LAMBLE landing page.
 *
 * Everything here is served by the fixture provider today (frontend only).
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
  value: number;
}

export type Timeframe = "h24" | "d7" | "d30";

export interface PeriodMetrics {
  /** Trading + graduation fees paid by users, USD. */
  fees: number;
  /** Share of fees kept by the launchpad, USD. */
  revenue: number;
  /** Change vs the previous period, in percent (e.g. -12.5). */
  change: number;
}

export interface FeeModel {
  /** Swap fee on the bonding curve, in basis points. */
  tradingFeeBps: number;
  /** Portion of the swap fee routed to the token creator, in basis points of the fee. */
  creatorShareBps: number;
  /** Cost to create a token, USD (0 = free). */
  launchCostUsd: number;
  /** Market cap at which the token graduates to a DEX, USD. */
  graduationTargetUsd: number;
  note?: string;
}

export interface LaunchpadMetrics {
  h24: PeriodMetrics;
  d7: PeriodMetrics;
  d30: PeriodMetrics;
  launched24h: number;
  launched7dAvg: number;
  graduated24h: number;
  /** Graduations / launches over the last 7 days, percent. */
  graduationRate7d: number;
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
  graduatesTo: string;
  feeModel: FeeModel;
  /** Short reasons the router would pick this venue. */
  routingNotes: string[];
  metrics: LaunchpadMetrics;
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
  share: number;
  /** Change in share over 24h, percentage points. */
  change24h: number;
  color: string;
  launchpadSlug?: string;
}

/** A launchpad's slice of the launches in one narrative. */
export interface NarrativeLaunchpad {
  slug: string;
  /** Share of the narrative's launches on this venue, percent. */
  share: number;
  /** Change in share over 24h, percentage points. */
  change24h: number;
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
}

export interface ExampleToken {
  symbol: string;
  name: string;
  launchpadSlug: string;
  chain: ChainId;
  mcapUsd: number;
  change24h: number;
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
  status: NarrativeStatus;
  /** Share of all launch attention right now, percent. */
  mindshare: number;
  /** Change in mindshare over 24h, percentage points. */
  change24h: number;
  volume24hUsd: number;
  volume7dUsd: number;
  launches24h: number;
  launches7d: number;
  /** ISO timestamp of when the narrative started trending. */
  startedAt: string;
  series: NarrativeSeries[];
  contenders: Contender[];
  /** Venues carrying the most launches in this narrative, largest first. */
  topLaunchpads: NarrativeLaunchpad[];
  signals: Signal[];
  exampleTokens: ExampleToken[];
  suggestedLaunchpads: { slug: string; reason: string }[];
}

export interface DataProvider {
  getLaunchpads(): Promise<Launchpad[]>;
  getNarratives(): Promise<Narrative[]>;
}
