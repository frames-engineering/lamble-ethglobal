import type { Narrative } from "@/lib/data/types";

/**
 * Narrative fixtures. The provider generates one hourly series per narrative:
 * volume across the coins in the narrative for each of the last 24 hours,
 * summing to `volume24hUsd`.
 * Signal sources are neutral labels; nothing here quotes a real outlet.
 */
export type NarrativeFixture = Omit<Narrative, "series"> & {
  /** Relative hour-to-hour volatility of the generated volume series. */
  volumeVol?: number;
};

export const NARRATIVE_FIXTURES: NarrativeFixture[] = [
  {
    id: "n-x-money",
    slug: "x-money-fee-payout",
    title: "X Money fee payout",
    category: "culture",
    summary:
      "UsePaid lets creators launch Solana tokens on pump.fun and route 80% of fees—converted to dollars—directly to named X handles via X Money.",
    status: "heating",
    mindshare: 26.8,
    change24h: 5.4,
    volume24hUsd: 18_600_000,
    volume7dUsd: 74_200_000,
    launches24h: 1_480,
    launches7d: 6_900,
    startedAt: "2026-09-16T00:00:00Z",
    volumeVol: 0.15,
    contenders: [
      { id: "payout", name: "PAYOUT", share: 44, change24h: 6.1, color: "#00c278", launchpadSlug: "pump.fun" },
      { id: "tipjar", name: "TIPJAR", share: 29, change24h: -1.4, color: "#efa411", launchpadSlug: "pump.fun" },
      { id: "handle", name: "HANDLE", share: 15, change24h: 0.9, color: "#4c94ff", launchpadSlug: "pump.fun" },
    ],
    topLaunchpads: [
      { slug: "pump.fun", share: 81, change24h: 3.2 },
      { slug: "bags", share: 11, change24h: -1.6 },
      { slug: "bonk.fun", share: 5, change24h: 0.4 },
    ],
    signals: [
      { id: "s1", source: "onchain", label: "On-chain", title: "X Money payouts funded by pump.fun fees crossed $1.2M in the last 24h", at: "2026-09-25T22:30:00Z" },
      { id: "s2", source: "launchpad", label: "Launchpad feed", title: "pump.fun: 1,480 UsePaid-routed launches in 24h, three times last week's pace", at: "2026-09-25T15:20:00Z" },
      { id: "s3", source: "x", label: "X trend", title: "Creators posting X Money payout receipts from their coins are trending", at: "2026-09-25T08:10:00Z" },
    ],
    exampleTokens: [
      { symbol: "PAYOUT", name: "Payout", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 6_400_000, change24h: 72 },
      { symbol: "TIPJAR", name: "Tip Jar", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 2_100_000, change24h: 28 },
      { symbol: "HANDLE", name: "Handle", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 900_000, change24h: 11 },
    ],
    suggestedLaunchpads: [
      { slug: "pump.fun", reason: "UsePaid routes fees from pump.fun launches, and it has the deepest Solana buyer pool." },
      { slug: "bags", reason: "Alternative venue with royalty routing to attributed accounts." },
    ],
  },
  {
    id: "n-ai-agents",
    slug: "ai-agents",
    title: "AI agent tokens",
    category: "ai-agents",
    summary:
      "Coins fronted by autonomous agents: trading bots with a token, agent launch tooling, and companion agents that post their own updates.",
    status: "heating",
    mindshare: 23.4,
    change24h: 3.1,
    volume24hUsd: 14_200_000,
    volume7dUsd: 81_500_000,
    launches24h: 1_240,
    launches7d: 7_900,
    startedAt: "2026-08-19T00:00:00Z",
    contenders: [
      { id: "trading-agents", name: "Trading agents", share: 46, change24h: 2.4, color: "#00c278", launchpadSlug: "pump.fun" },
      { id: "agent-tooling", name: "Agent launch tools", share: 31, change24h: -1.8, color: "#efa411", launchpadSlug: "clanker" },
      { id: "companions", name: "Companion agents", share: 14, change24h: 0.6, color: "#4c94ff", launchpadSlug: "bonk.fun" },
    ],
    topLaunchpads: [
      { slug: "pump.fun", share: 44, change24h: 1.8 },
      { slug: "clanker", share: 33, change24h: -0.9 },
      { slug: "bonk.fun", share: 12, change24h: 0.7 },
    ],
    signals: [
      { id: "s1", source: "onchain", label: "On-chain", title: "38 agent-themed launches in the last 6h; 3 already graduated", at: "2026-09-25T21:10:00Z" },
      { id: "s2", source: "x", label: "X trend", title: "Agent-run wallets posting their own P&L, mentions up 240% in 48h", at: "2026-09-25T14:30:00Z" },
      { id: "s3", source: "launchpad", label: "Launchpad feed", title: "clanker: 61% of today's deploys reference an agent in the ticker or bio", at: "2026-09-25T09:05:00Z" },
    ],
    exampleTokens: [
      { symbol: "CLAWD", name: "Clawd Agent", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 4_200_000, change24h: 38 },
      { symbol: "AGNTX", name: "AgentX", launchpadSlug: "clanker", chain: "base", mcapUsd: 1_100_000, change24h: 12 },
      { symbol: "BOTI", name: "Boti", launchpadSlug: "bonk.fun", chain: "solana", mcapUsd: 640_000, change24h: -8 },
    ],
    suggestedLaunchpads: [
      { slug: "pump.fun", reason: "Deepest Solana buyer pool for agent memes right now." },
      { slug: "clanker", reason: "Native to the Farcaster and agent-builder crowd on Base." },
    ],
  },
  {
    id: "n-politifi",
    slug: "prediction-market-coins",
    title: "Prediction-market coins",
    category: "politifi",
    summary:
      "PolitiFi is back: memes about election outcomes, tokens that mirror market odds, and oracle plays riding record prediction-market volume.",
    status: "peak",
    mindshare: 17.8,
    change24h: 1.2,
    volume24hUsd: 9_800_000,
    volume7dUsd: 62_300_000,
    launches24h: 820,
    launches7d: 5_600,
    startedAt: "2026-08-30T00:00:00Z",
    contenders: [
      { id: "election-memes", name: "Election memes", share: 52, change24h: 1.9, color: "#00c278", launchpadSlug: "pump.fun" },
      { id: "odds-tokens", name: "Market-odds tokens", share: 29, change24h: -2.2, color: "#efa411", launchpadSlug: "launchlab" },
      { id: "oracle-plays", name: "Oracle plays", share: 12, change24h: 0.3, color: "#e17aff", launchpadSlug: "four.meme" },
    ],
    topLaunchpads: [
      { slug: "pump.fun", share: 49, change24h: 2.1 },
      { slug: "launchlab", share: 26, change24h: -1.3 },
      { slug: "four.meme", share: 14, change24h: 0.5 },
    ],
    signals: [
      { id: "s1", source: "onchain", label: "On-chain", title: "Volume on PolitiFi launches up 3.1x week over week", at: "2026-09-25T19:40:00Z" },
      { id: "s2", source: "x", label: "X trend", title: "#PolitiFi trending in four regions after the debate clip", at: "2026-09-25T06:15:00Z" },
      { id: "s3", source: "launchpad", label: "Launchpad feed", title: "BONK.fun: PolitiFi launches graduated at 2.4x the venue average this week", at: "2026-09-24T16:00:00Z" },
    ],
    exampleTokens: [
      { symbol: "MAYOR", name: "Mayor", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 2_800_000, change24h: 21 },
      { symbol: "POLLS", name: "Polls", launchpadSlug: "launchlab", chain: "solana", mcapUsd: 900_000, change24h: 5 },
      { symbol: "ODDS", name: "Odds", launchpadSlug: "four.meme", chain: "bsc", mcapUsd: 410_000, change24h: -14 },
    ],
    suggestedLaunchpads: [
      { slug: "bonk.fun", reason: "Community buybacks reward long-running political memes." },
      { slug: "pump.fun", reason: "Fastest first bid for time-sensitive news memes." },
    ],
  },
  {
    id: "n-stonks",
    slug: "tokenized-stock-memes",
    title: "Tokenized-stock memes",
    category: "stonks",
    summary:
      "Meme-stock tickers, pre-IPO plays and index baskets launched against tokenized equities on StonkFun, BaseStonk and StonkBrokers.",
    status: "heating",
    mindshare: 14.2,
    change24h: 4.6,
    volume24hUsd: 8_100_000,
    volume7dUsd: 44_900_000,
    launches24h: 960,
    launches7d: 5_100,
    startedAt: "2026-09-08T00:00:00Z",
    contenders: [
      { id: "meme-stocks", name: "Meme-stock tickers", share: 47, change24h: 5.1, color: "#00c278", launchpadSlug: "stonkfun" },
      { id: "pre-ipo", name: "Pre-IPO plays", share: 35, change24h: -3.4, color: "#efa411", launchpadSlug: "basestonk" },
      { id: "baskets", name: "Index baskets", share: 11, change24h: -0.9, color: "#4c94ff", launchpadSlug: "stonkbrokers" },
    ],
    topLaunchpads: [
      { slug: "stonkfun", share: 52, change24h: 4.4 },
      { slug: "basestonk", share: 31, change24h: -2.7 },
      { slug: "stonkbrokers", share: 12, change24h: 0.6 },
    ],
    signals: [
      { id: "s1", source: "launchpad", label: "Launchpad feed", title: "StonkFun: 2,140 launches in 24h, its biggest day this month", at: "2026-09-25T22:00:00Z" },
      { id: "s2", source: "onchain", label: "On-chain", title: "BaseStonk pools quoted in tokenized equities saw 4x volume", at: "2026-09-25T12:20:00Z" },
      { id: "s3", source: "newswire", label: "Newswire", title: "New tokenized-stock listings went live across three venues this week", at: "2026-09-24T08:00:00Z" },
    ],
    exampleTokens: [
      { symbol: "TSLAX", name: "Teslax", launchpadSlug: "stonkfun", chain: "solana", mcapUsd: 3_400_000, change24h: 44 },
      { symbol: "NVDAI", name: "Nvidai", launchpadSlug: "basestonk", chain: "base", mcapUsd: 1_600_000, change24h: 18 },
      { symbol: "IPOZ", name: "IPOZ", launchpadSlug: "stonkbrokers", chain: "robinhood", mcapUsd: 520_000, change24h: 9 },
    ],
    suggestedLaunchpads: [
      { slug: "stonkfun", reason: "Native venue for stock-paired launches on Solana." },
      { slug: "basestonk", reason: "Uniswap v4 pools priced in tokenized stocks on Base." },
    ],
  },
  {
    id: "n-robinhood",
    slug: "robinhood-chain-launch-season",
    title: "Robinhood Chain launch season",
    category: "infra",
    summary:
      "Retail traders arriving on Robinhood Chain are launching everything. Pons dominates fees, o1 and StonkBrokers pick up the long tail.",
    status: "peak",
    mindshare: 12.6,
    change24h: -0.8,
    volume24hUsd: 7_400_000,
    volume7dUsd: 58_200_000,
    launches24h: 640,
    launches7d: 5_300,
    startedAt: "2026-08-12T00:00:00Z",
    contenders: [
      { id: "pons-launches", name: "Pons launches", share: 58, change24h: -1.1, color: "#00c278", launchpadSlug: "pons" },
      { id: "o1-launches", name: "o1 launches", share: 22, change24h: 0.8, color: "#efa411", launchpadSlug: "o1-launchpad" },
      { id: "independent", name: "Independent deploys", share: 13, change24h: 0.2, color: "#e17aff", launchpadSlug: "stonkbrokers" },
    ],
    topLaunchpads: [
      { slug: "pons", share: 61, change24h: -1.4 },
      { slug: "o1-launchpad", share: 24, change24h: 1.1 },
      { slug: "stonkbrokers", share: 9, change24h: 0.2 },
    ],
    signals: [
      { id: "s1", source: "onchain", label: "On-chain", title: "Pons fees passed $16M over the last 7 days", at: "2026-09-25T20:00:00Z" },
      { id: "s2", source: "launchpad", label: "Launchpad feed", title: "o1: 260 launches in 24h on Robinhood Chain, up from 180 a week ago", at: "2026-09-25T11:45:00Z" },
      { id: "s3", source: "x", label: "X trend", title: "Robinhood Chain memes trending with retail accounts posting first launches", at: "2026-09-24T17:30:00Z" },
    ],
    exampleTokens: [
      { symbol: "HOODIE", name: "Hoodie", launchpadSlug: "pons", chain: "robinhood", mcapUsd: 5_100_000, change24h: 12 },
      { symbol: "RETAIL", name: "Retail", launchpadSlug: "o1-launchpad", chain: "robinhood", mcapUsd: 780_000, change24h: -6 },
      { symbol: "BROKR", name: "Brokr", launchpadSlug: "stonkbrokers", chain: "robinhood", mcapUsd: 300_000, change24h: 3 },
    ],
    suggestedLaunchpads: [
      { slug: "pons", reason: "Largest fee pool on Robinhood Chain right now." },
      { slug: "o1-launchpad", reason: "Same audience with far less launch competition." },
    ],
  },
  {
    id: "n-creator",
    slug: "creator-royalty-coins",
    title: "Creator-royalty coins",
    category: "culture",
    summary:
      "Coins that pay the person they are about. Royalty routing on Bags turned fan tokens and streamer coins into the fastest-growing niche of the month.",
    status: "heating",
    mindshare: 9.8,
    change24h: 2.7,
    volume24hUsd: 4_600_000,
    volume7dUsd: 21_800_000,
    launches24h: 410,
    launches7d: 2_300,
    startedAt: "2026-09-14T00:00:00Z",
    contenders: [
      { id: "attributed", name: "Creator-attributed launches", share: 55, change24h: 4.2, color: "#00c278", launchpadSlug: "bags" },
      { id: "fan-tokens", name: "Fan tokens", share: 30, change24h: -2.6, color: "#efa411", launchpadSlug: "pump.fun" },
      { id: "streamers", name: "Streamer coins", share: 12, change24h: -0.4, color: "#4c94ff", launchpadSlug: "graphite-protocol" },
    ],
    topLaunchpads: [
      { slug: "bags", share: 57, change24h: 4.8 },
      { slug: "pump.fun", share: 28, change24h: -2.2 },
      { slug: "graphite-protocol", share: 9, change24h: -0.3 },
    ],
    signals: [
      { id: "s1", source: "launchpad", label: "Launchpad feed", title: "Bags: fees up 584% week over week on royalty-routed launches", at: "2026-09-25T23:00:00Z" },
      { id: "s2", source: "onchain", label: "On-chain", title: "Royalty-routed fees hit a new weekly high across Solana venues", at: "2026-09-25T13:00:00Z" },
      { id: "s3", source: "x", label: "X trend", title: "Creators posting launch receipts and royalty dashboards trending", at: "2026-09-24T19:20:00Z" },
    ],
    exampleTokens: [
      { symbol: "FANBASE", name: "Fanbase", launchpadSlug: "bags", chain: "solana", mcapUsd: 2_200_000, change24h: 67 },
      { symbol: "CLIPS", name: "Clips", launchpadSlug: "bags", chain: "solana", mcapUsd: 640_000, change24h: 22 },
      { symbol: "STREAM", name: "Stream", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 1_300_000, change24h: 9 },
    ],
    suggestedLaunchpads: [
      { slug: "bags", reason: "Royalties route to the creator or to any attributed account." },
      { slug: "pump.fun", reason: "Creator fee share with the widest reach." },
    ],
  },
  {
    id: "n-monad",
    slug: "monad-ecosystem-memes",
    title: "Monad ecosystem memes",
    category: "infra",
    summary:
      "Monad-native memes cooled after the incentive round ended; cross-chain deploys from Flap.sh and o1 now carry most of the volume.",
    status: "cooling",
    mindshare: 7.4,
    change24h: -1.9,
    volume24hUsd: 2_900_000,
    volume7dUsd: 24_600_000,
    launches24h: 280,
    launches7d: 2_400,
    startedAt: "2026-07-28T00:00:00Z",
    contenders: [
      { id: "monad-natives", name: "Monad natives", share: 49, change24h: -2.8, color: "#00c278", launchpadSlug: "flap-sh" },
      { id: "cross-chain", name: "Cross-chain deploys", share: 36, change24h: 1.9, color: "#efa411", launchpadSlug: "o1-launchpad" },
      { id: "testnet-ogs", name: "Testnet OGs", share: 10, change24h: -0.3, color: "#e17aff", launchpadSlug: "clanker" },
    ],
    topLaunchpads: [
      { slug: "flap-sh", share: 47, change24h: -3.1 },
      { slug: "o1-launchpad", share: 34, change24h: 2.2 },
      { slug: "clanker", share: 11, change24h: -0.2 },
    ],
    signals: [
      { id: "s1", source: "launchpad", label: "Launchpad feed", title: "Flap.sh: Monad's share of launches down to 18% from 31% last week", at: "2026-09-25T15:10:00Z" },
      { id: "s2", source: "onchain", label: "On-chain", title: "Monad launch volume down 22% week over week", at: "2026-09-25T02:00:00Z" },
      { id: "s3", source: "x", label: "X trend", title: "Monad mentions cooling since the incentive program closed", at: "2026-09-23T10:00:00Z" },
    ],
    exampleTokens: [
      { symbol: "MONKE", name: "Monke", launchpadSlug: "flap-sh", chain: "monad", mcapUsd: 1_900_000, change24h: -12 },
      { symbol: "NADS", name: "Nads", launchpadSlug: "o1-launchpad", chain: "monad", mcapUsd: 410_000, change24h: -18 },
      { symbol: "PURPL", name: "Purpl", launchpadSlug: "clanker", chain: "monad", mcapUsd: 220_000, change24h: 4 },
    ],
    suggestedLaunchpads: [
      { slug: "flap-sh", reason: "Largest Monad launch volume, with a discovery leaderboard." },
      { slug: "clanker", reason: "Cheap Monad deploys straight into Uniswap v4." },
    ],
  },
  {
    id: "n-cats",
    slug: "cat-coin-revival",
    title: "Cat-coin revival",
    category: "animals",
    summary:
      "A viral clip restarted the cat cycle: classic cat memes lead, cat-and-AI mashups follow, and regional cats fill the long tail.",
    status: "heating",
    mindshare: 6.1,
    change24h: 1.4,
    volume24hUsd: 2_200_000,
    volume7dUsd: 9_700_000,
    launches24h: 350,
    launches7d: 1_600,
    startedAt: "2026-09-20T00:00:00Z",
    contenders: [
      { id: "classic-cats", name: "Classic cat memes", share: 44, change24h: 3.3, color: "#00c278", launchpadSlug: "pump.fun" },
      { id: "cat-ai", name: "Cat + AI mashups", share: 37, change24h: -1.2, color: "#efa411", launchpadSlug: "four.meme" },
      { id: "regional", name: "Regional cats", share: 15, change24h: -0.7, color: "#4c94ff", launchpadSlug: "bonk.fun" },
    ],
    topLaunchpads: [
      { slug: "pump.fun", share: 46, change24h: 2.9 },
      { slug: "four.meme", share: 35, change24h: -1.0 },
      { slug: "bonk.fun", share: 13, change24h: -0.5 },
    ],
    signals: [
      { id: "s1", source: "onchain", label: "On-chain", title: "Cat-themed launches 2.2x over 7 days; three graduated in the last 12h", at: "2026-09-25T18:45:00Z" },
      { id: "s2", source: "x", label: "X trend", title: "Cat memes trending after the viral clip crossed 40M views", at: "2026-09-25T03:30:00Z" },
      { id: "s3", source: "launchpad", label: "Launchpad feed", title: "four.meme: animal tickers are 27% of BNB launches today", at: "2026-09-24T21:00:00Z" },
    ],
    exampleTokens: [
      { symbol: "MEOWZ", name: "Meowz", launchpadSlug: "pump.fun", chain: "solana", mcapUsd: 3_900_000, change24h: 52 },
      { symbol: "KITTI", name: "Kitti", launchpadSlug: "four.meme", chain: "bsc", mcapUsd: 720_000, change24h: 19 },
      { symbol: "PURR", name: "Purr", launchpadSlug: "bonk.fun", chain: "solana", mcapUsd: 480_000, change24h: 7 },
    ],
    suggestedLaunchpads: [
      { slug: "pump.fun", reason: "Animal memes graduate fastest where the buyer pool is deepest." },
      { slug: "four.meme", reason: "BNB retail loves animal coins and competition is lower." },
    ],
  },
];
