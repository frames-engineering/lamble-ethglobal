> ## Documentation Index
> Fetch the complete documentation index at: https://docs.codex.io/llms.txt
> Use this file to discover all available pages before exploring further.

# filterTokens

> Discover, screen, and rank tokens across every supported network using 100+ on-chain signals: trading activity, liquidity, holder behavior, fee economics, and launchpad lifecycle.

`filterTokens` is the workhorse query for token discovery on Codex. Almost every numeric attribute Codex computes per token is exposed here as both a filter input and a sortable ranking attribute, and most are evaluated over five rolling time windows (5m, 1h, 4h, 12h, and 24h) so you can build views tuned to any cadence.

For continuously updating results, use our subscription version, [`onFilterTokensUpdated`](/api-reference/subscriptions/onfiltertokensupdated), which mirrors the same filter shape and pushes new matches as the underlying data changes on a polling basis.

## Use this data for

* **Token screeners and trending feeds.** Rank by `volume24`, `change24`, `trendingScore24`, or any of 100+ ranking attributes to power gainer boards and new-listing feeds, scoped to one network or every network at once. Narrow further by specific exchanges or specific launchpads.
* **Quality filtering for legit tokens.** Combine `profanity: false`, `potentialScam: false`, and `trendingIgnored: false` with sensible liquidity and volume thresholds to surface real tokens and filter out scams, low-effort copies, stablecoins, and base assets.
* **Category-scoped screens.** Use the `categories` filter ([`TokenCategoryFilter`](/api-reference/input-objects/tokencategoryfilter)) with `anyOf`, `allOf`, `noneOf`, and `hasCategory` to scope any screen to curated token categories like DeFi, L1, AI, and memes. Browse the available categories with [`categories`](/api-reference/queries/categories).
* **Launchpad (memescope) filtering.** Filter by `launchpadProtocol`, `launchpadCompleted`, `launchpadMigrated`, and migration timestamps to surface graduating tokens (Pump.fun, Bonk, Meteora DBC) the moment they hit the open market. For live-streamed launchpad data, combine with our [`onLaunchpadTokenEventBatch`](/api-reference/subscriptions/onlaunchpadtokeneventbatch) subscription.
* **Global fee data.** Filter and sort on the full Global Fees Paid surface (`totalFees{w}`, `feeToVolumeRatio{w}`, `poolFees24`, builder tips, and more) to identify low-friction trading pairs or tokens where MEV dominates. See [Global Fees Paid](/concepts/global-fees-paid) for the full field map.
* **Holder-quality and bot-detection screens.** Use `top10HoldersPercent`, `insiderHeldPercentage`, `bundlerHeldPercentage`, `sniperHeldPercentage`, and `walletAgeAvg` to filter out concentrated supplies and bot-driven launches.

Every filter and field listed above is available in a single `filterTokens` call, so a full screening page can blend trending rankings, risk filters, launchpad status, fee economics, and holder analysis in one query rather than chaining multiple requests.

<Note>
  Some fields on this endpoint (`asset`, `assetDeployments`, `organization`) are powered by [The Grid](https://thegrid.id/) and will only be populated for established, verified tokens. See [Verified Metadata](/recipes/discover-tokens#verified-metadata) in the Discover Tokens recipe for full details.
</Note>

<Note>
  **Boolean filtering**: The `filters` input supports an optional `boolFilter` field that accepts `and`, `or`, and `not` operators (nestable up to 4 levels). Use it when you need different filter conditions for a subsets of tokens, such as per-network thresholds, or across different fields.  For example, you might want different filter conditions depending on whether tokens are on Solana or Base. See [Advanced Filtering](https://docs.codex.io/recipes/discover-tokens#advanced-filtering) for details.
</Note>

<Note>
  **Note on market cap**: `marketCap` is fully diluted, price multiplied by total supply, and replaces the deprecated FDV field. For a circulating-supply-based value, use `circulatingMarketCap`.
</Note>

<div data-generated>
  ## GraphQL

  ```
  type Query {
    filterTokens(
      filters: TokenFilters
      statsType: TokenPairStatisticsType
      phrase: String
      tokens: [String]
      excludeTokens: [String]
      rankings: [TokenRanking]
      useAggregatedStats: Boolean
      limit: Int
      offset: Int
    ): TokenFilterConnection
  }

  type SocialLinks {
    bitcointalk: String
    blog: String
    coingecko: String
    coinmarketcap: String
    discord: String
    email: String
    facebook: String
    github: String
    instagram: String
    linkedin: String
    reddit: String
    slack: String
    telegram: String
    twitch: String
    twitter: String
    website: String
    wechat: String
    whitepaper: String
    youtube: String
  }

  type TokenInfo {
    id: String!
    address: String!
    circulatingSupply: String
    cmcId: Int
    gridAssetId: String
    bluechipRating: String
    isScam: Boolean
    name: String
    networkId: Int!
    symbol: String!
    totalSupply: String
    imageThumbHash: String
    imageThumbUrl: String
    imageSmallUrl: String
    imageLargeUrl: String
    imageBannerUrl: String
    videoExternalUrl: String
    description: String
  }

  type OrganizationUrl {
    url: String!
    type: String
  }

  type OrganizationSocial {
    url: String!
    type: String
  }

  type AssetDeployment {
    id: String!
    networkId: Int!
    address: String!
    standard: String
    assetId: String!
    rootId: String!
    token: EnhancedToken
  }

  type Asset {
    id: String!
    name: String
    description: String
    ticker: String
    type: String
    status: String
    icon: String
    rootId: String!
    assetDeployments: [AssetDeployment!]!
  }

  type Organization {
    name: String!
    foundingDate: String
    descriptionShort: String
    descriptionLong: String
    tagLine: String
    type: String
    sector: String
    urls: [OrganizationUrl!]!
    socials: [OrganizationSocial!]!
    logo: String
    icon: String
    header: String
    rootId: String!
    assets: [Asset!]!
  }

  type ExplorerTokenData {
    id: String!
    blueCheckmark: Boolean
    description: String
    divisor: String
    tokenPriceUSD: String
    tokenType: String
  }

  type Exchange {
    id: String!
    address: String!
    color: String
    name: String
    exchangeVersion: String
    iconUrl: String
    networkId: Int!
    tradeUrl: String
  }

  enum WalletCategory {
    NORMIE
    TOKEN_CREATOR
    EXCHANGE
    DEFI_EXCHANGE
    PAIR
    PAIR_TOKEN_HOLDER
    POOL_AUTHORITY
    STAKING_VAULT
    NOTORIOUS
    BURN
    LOCKER
  }

  type WalletFunding {
    fundedByAddress: String!
    fundedByLabel: String
    fundedAt: Int!
    tokenAddress: String!
    networkId: Int!
    amount: String!
    transactionHash: String!
  }

  type WalletPolymarketProfile {
    proxyWallet: String!
    xUsername: String
    displayName: String
    pseudonym: String
    profileImageUrl: String
    verifiedBadge: Boolean
    displayUsernamePublic: Boolean
    fetchedAt: Int!
  }

  type Wallet {
    address: String!
    category: WalletCategory
    firstSeenTimestamp: Int
    firstFunding: WalletFunding
    identityLabels: [String!]
    avatarUrl: String
    displayName: String
    twitterId: String
    twitterUsername: String
    telegramId: String
    telegramUsername: String
    website: String
    discordId: String
    discordUsername: String
    githubId: String
    githubUsername: String
    farcasterId: String
    farcasterUsername: String
    description: String
    ethosScore: Int
    ethosLevel: String
    ethosVerified: Boolean
    tradeSourceIds: [String!]
    identitySource: String
    identityUpdatedAt: Int
    polymarket: WalletPolymarketProfile
    tokensCreatedCount: Int
    tokensMigratedCount: Int
  }

  type LaunchpadData {
    launchpadName: String
    graduationPercent: Float
    poolAddress: String
    completedAt: Int
    completed: Boolean
    completedSlot: Int
    migratedSlot: Int
    migratedAt: Int
    migrated: Boolean
    migratedPoolAddress: String
    launchpadProtocol: String
    launchpadIconUrl: String
    isCashbackEnabled: Boolean
    category: String
  }

  type TokenExtrema {
    id: String!
    address: String!
    networkId: Int!
    athPrice: String!
    athPriceTimestamp: Int!
    atlPrice: String!
    atlPriceTimestamp: Int!
    athFdv: String!
    athFdvTimestamp: Int!
    atlFdv: String!
    atlFdvTimestamp: Int!
    athCircMc: String!
    athCircMcTimestamp: Int!
    atlCircMc: String!
    atlCircMcTimestamp: Int!
  }

  type CoinCommunity {
    id: String!
    createdAt: Int!
    postCount: Int!
    memberCount: Int!
    likeCount: Int!
    lastPostAt: Int
  }

  type Token2022ScaledUiAmountConfig {
    authority: String
    multiplier: Float!
    newMultiplierEffectiveTimestamp: String
    newMultiplier: Float
  }

  type Token2022TransferFee {
    epoch: String!
    transferFeeBasisPoints: Int!
    maximumFee: String!
  }

  type Token2022TransferFeeConfig {
    transferFeeConfigAuthority: String
    olderTransferFee: Token2022TransferFee!
    newerTransferFee: Token2022TransferFee!
  }

  type Token2022Extensions {
    scaledUiAmountConfig: Token2022ScaledUiAmountConfig
    transferFeeConfig: Token2022TransferFeeConfig
  }

  type B20Extensions {
    multiplier: String
    multiplierObservedAt: String
    pausedTransfer: Boolean
    pausedMint: Boolean
    pausedBurn: Boolean
    supplyCap: String
  }

  type TokenExtensions {
    token2022: Token2022Extensions
    b20: B20Extensions
  }

  type Erc7572CustomInfo {
    type: String!
    featuredImage: String
    collaborators: [String!]
  }

  enum CategoryType {
    CANONICAL
    NARRATIVE
  }

  enum CategoryStatus {
    DRAFT
    ACTIVE
    ARCHIVED
  }

  type Category {
    id: String!
    name: String!
    shortName: String
    slug: String!
    description: String
    type: CategoryType!
    status: CategoryStatus!
    parentId: String
    memberCount: Int
  }

  enum RiskVerdict {
    SCAM
    HIGH_RISK
    CAUTION
    NEUTRAL
    VERIFIED
    VERIFIED_CONTESTED
  }

  enum RiskAnalysisCoverage {
    NOT_ANALYZED
    INCONCLUSIVE
    ANALYZED
  }

  enum RiskReasonCode {
    PROOF_HONEYPOT_SIM
    PROOF_NON_TRANSFERABLE
    PROOF_TRANSFER_FEE_100
    PROOF_PAUSED
    PROOF_DEFAULT_FROZEN
    PROOF_RUG_OCCURRED
    AUTH_MINT
    AUTH_FREEZE
    AUTH_PERMANENT_DELEGATE
    AUTH_TRANSFER_HOOK
    AUTH_PAUSABLE
    AUTH_OWNER_NOT_RENOUNCED
    AUTH_CAN_TRANSFER_OWNERSHIP
    TAX_BUY_HIGH
    TAX_SELL_HIGH
    TAX_HONEYPOT_UNCONFIRMED
    TAX_PAUSED
    LIQ_MINIMAL
    LIQ_UNKNOWN
    LIQ_RUG_CLIFF
    LIQ_UNLOCKED
    LIQ_DRAINING
    HOLD_TOP10_CONCENTRATED
    HOLD_DEV_HEAVY
    HOLD_SNIPER_HEAVY
    HOLD_BUNDLER_HEAVY
    HOLD_INSIDER_HEAVY
    FLOW_ONE_WAY
    FLOW_WALLET_FARM
    FLOW_WASH_DOMINATED
    FLOW_BUNDLED_LAUNCH
    FLOW_MECHANICAL_TRADING
    FLOW_RING_DOMINATED
    REP_SERIAL_RUGGER
    REP_RISKY_CREATOR
    REP_SCAMMER_FUNDED
    REP_IMITATOR_SYMBOL
    REP_IMITATOR_NAME
    LABEL_MANUAL_SCAM
    LABEL_VERIFIED
  }

  type TokenRisk {
    verdict: RiskVerdict
    score: Float
    flaggedAt: Int
    coverage: RiskAnalysisCoverage
    reasons: [RiskReasonCode!]
  }

  type EnhancedToken {
    id: String!
    address: String!
    cmcId: Int
    decimals: Int!
    isScam: Boolean
    name: String
    networkId: Int!
    symbol: String
    socialLinks: SocialLinks
    info: TokenInfo
    gridAssetId: String
    bluechipRating: String
    organization: Organization
    asset: Asset
    exchanges: [Exchange!]
    creatorAddress: String
    creator: Wallet
    creatorBalanceNBT: String
    createBlockNumber: Int
    createTransactionHash: String
    createdAt: Int
    mintable: String
    freezable: String
    isFreezableValid: Boolean
    isMintableValid: Boolean
    launchpad: LaunchpadData
    top10HoldersPercent: Float
    profanity: Boolean
    extrema: TokenExtrema
    coinCommunity: CoinCommunity
    extensions: TokenExtensions
    tokenStandardCustomData: Erc7572CustomInfo
    categories: [Category!]
    risk: TokenRisk
  }

  type PooledTokenValues {
    token0: String
    token1: String
    invalidReserves: Boolean!
  }

  type CurrencyUnits {
    currency0: String!
    currency1: String!
    decimals0: Int!
    decimals1: Int!
  }

  type UniswapV4Data {
    uniswapV4HookAddress: String
    isToken0NetworkToken: Boolean
    isDynamicFee: Boolean
    currencyUnits: CurrencyUnits
    type: String!
  }

  type ArenaTradeData {
    tokenId: String
    type: String!
  }

  type PumpData {
    creator: String
    type: String!
  }

  union ProtocolData = UniswapV4Data | ArenaTradeData | PumpData

  type PairProtocolCustomData {
    uniswapV4HookAddress: String
  }

  type Pair {
    address: String!
    exchangeHash: String!
    fee: Int
    id: String!
    networkId: Int!
    protocol: String
    tickSpacing: Int
    token0: String!
    token1: String!
    createdAt: Int
    token0Data: EnhancedToken
    token1Data: EnhancedToken
    pooled: PooledTokenValues
    virtualPooled: PooledTokenValues
    currencyUnits: CurrencyUnits
    protocolData: ProtocolData
  }

  enum PotentialScamReason {
    MinimumLiquidity
    LiquidityUnknown
    LiquidityRugPull
    SuspiciousWalletActivity
    AbnormalBuyerRatio
    DevConcentration
    SniperConcentration
    BundledLaunch
    ForeignVenueLaunch
    SellerHub
  }

  type TokenFilterResult {
    token: EnhancedToken
    createdAt: Int
    lastTransaction: Int
    buyCount5m: Int
    buyCount1: Int
    buyCount12: Int
    buyCount24: Int
    buyCount4: Int
    change5m: String
    change1: String
    change12: String
    change24: String
    change4: String
    volumeChange5m: String
    volumeChange1: String
    volumeChange4: String
    volumeChange12: String
    volumeChange24: String
    exchanges: [Exchange]
    high5m: String
    high1: String
    high12: String
    high24: String
    high4: String
    liquidity: String
    totalLiquidityUsd: String
    quoteToken: String
    low5m: String
    low1: String
    low12: String
    low24: String
    low4: String
    marketCap: String
    circulatingMarketCap: String
    pair: Pair
    liquidPair: Pair
    liquidPairLiquidity: String
    liquidPairPriceUSD: String
    priceUSD: String
    trendingScore: Float
    sellCount5m: Int
    sellCount1: Int
    sellCount12: Int
    sellCount24: Int
    sellCount4: Int
    txnCount5m: Int
    txnCount1: Int
    txnCount12: Int
    txnCount24: Int
    txnCount4: Int
    uniqueBuys5m: Int
    uniqueBuys1: Int
    uniqueBuys12: Int
    uniqueBuys24: Int
    uniqueBuys4: Int
    uniqueSells5m: Int
    uniqueSells1: Int
    uniqueSells12: Int
    uniqueSells24: Int
    uniqueSells4: Int
    uniqueTransactions5m: Int
    uniqueTransactions1: Int
    uniqueTransactions12: Int
    uniqueTransactions24: Int
    uniqueTransactions4: Int
    volume1: String
    volume5m: String
    volume12: String
    volume24: String
    volume4: String
    buyVolume1: String
    buyVolume12: String
    buyVolume24: String
    buyVolume4: String
    buyVolume5m: String
    sellVolume1: String
    sellVolume12: String
    sellVolume24: String
    sellVolume4: String
    sellVolume5m: String
    poolFees5m: String
    poolFees1: String
    poolFees4: String
    poolFees12: String
    poolFees24: String
    baseFees5m: String
    baseFees1: String
    baseFees4: String
    baseFees12: String
    baseFees24: String
    priorityFees5m: String
    priorityFees1: String
    priorityFees4: String
    priorityFees12: String
    priorityFees24: String
    builderTips5m: String
    builderTips1: String
    builderTips4: String
    builderTips12: String
    builderTips24: String
    l1DataFees5m: String
    l1DataFees1: String
    l1DataFees4: String
    l1DataFees12: String
    l1DataFees24: String
    totalFees5m: String
    totalFees1: String
    totalFees4: String
    totalFees12: String
    totalFees24: String
    feeToVolumeRatio5m: String
    feeToVolumeRatio1: String
    feeToVolumeRatio4: String
    feeToVolumeRatio12: String
    feeToVolumeRatio24: String
    isScam: Boolean
    holders: Int
    walletAgeAvg: String
    walletAgeStd: String
    swapPct1dOldWallet: String
    swapPct7dOldWallet: String
    sniperCount: Int
    sniperHeldPercentage: Float
    bundlerCount: Int
    bundlerHeldPercentage: Float
    insiderCount: Int
    insiderHeldPercentage: Float
    suspiciousCount: Int
    suspiciousHeldPercentage: Float
    devHeldPercentage: Float
    top10HoldersPercent: Float
    potentialScamReasons: [PotentialScamReason]
    athPrice: String
    athPriceTimestamp: Int
    atlPrice: String
    atlPriceTimestamp: Int
    athFdv: String
    athFdvTimestamp: Int
    atlFdv: String
    atlFdvTimestamp: Int
    athCircMc: String
    athCircMcTimestamp: Int
    atlCircMc: String
    atlCircMcTimestamp: Int
  }

  type TokenFilterConnection {
    results: [TokenFilterResult]
    count: Int
    page: Int
  }

  input TokenBoolFilter {
    and: [TokenFilters!]
    or: [TokenFilters!]
    not: TokenFilters
  }

  input TokenCategoryFilter {
    anyOf: [String!]
    allOf: [String!]
    noneOf: [String!]
    hasCategory: Boolean
  }

  input NumberFilter {
    gte: Float
    gt: Float
    lte: Float
    lt: Float
  }

  input TokenFilters {
    boolFilter: TokenBoolFilter
    categories: TokenCategoryFilter
    createdAt: NumberFilter
    tokenCreatedAt: NumberFilter
    lastTransaction: NumberFilter
    buyCount5m: NumberFilter
    buyCount1: NumberFilter
    buyCount12: NumberFilter
    buyCount24: NumberFilter
    buyCount4: NumberFilter
    change5m: NumberFilter
    change1: NumberFilter
    change12: NumberFilter
    change24: NumberFilter
    change4: NumberFilter
    volumeChange5m: NumberFilter
    volumeChange1: NumberFilter
    volumeChange4: NumberFilter
    volumeChange12: NumberFilter
    volumeChange24: NumberFilter
    exchangeId: [String]
    exchangeAddress: [String]
    high5m: NumberFilter
    high1: NumberFilter
    high12: NumberFilter
    high24: NumberFilter
    high4: NumberFilter
    liquidity: NumberFilter
    totalLiquidityUsd: NumberFilter
    low1: NumberFilter
    low5m: NumberFilter
    low12: NumberFilter
    low24: NumberFilter
    low4: NumberFilter
    marketCap: NumberFilter
    circulatingMarketCap: NumberFilter
    network: [Int]
    holders: NumberFilter
    priceUSD: NumberFilter
    sellCount1: NumberFilter
    sellCount5m: NumberFilter
    sellCount12: NumberFilter
    sellCount24: NumberFilter
    sellCount4: NumberFilter
    txnCount5m: NumberFilter
    txnCount1: NumberFilter
    txnCount12: NumberFilter
    txnCount24: NumberFilter
    txnCount4: NumberFilter
    uniqueBuys1: NumberFilter
    uniqueBuys5m: NumberFilter
    uniqueBuys12: NumberFilter
    uniqueBuys24: NumberFilter
    uniqueBuys4: NumberFilter
    uniqueSells5m: NumberFilter
    uniqueSells1: NumberFilter
    uniqueSells12: NumberFilter
    uniqueSells24: NumberFilter
    uniqueSells4: NumberFilter
    uniqueTransactions1: NumberFilter
    uniqueTransactions5m: NumberFilter
    uniqueTransactions12: NumberFilter
    uniqueTransactions24: NumberFilter
    uniqueTransactions4: NumberFilter
    volume1: NumberFilter
    volume12: NumberFilter
    volume24: NumberFilter
    volume4: NumberFilter
    volume5m: NumberFilter
    buyVolume1: NumberFilter
    buyVolume12: NumberFilter
    buyVolume24: NumberFilter
    buyVolume4: NumberFilter
    buyVolume5m: NumberFilter
    sellVolume1: NumberFilter
    sellVolume12: NumberFilter
    sellVolume24: NumberFilter
    sellVolume4: NumberFilter
    sellVolume5m: NumberFilter
    includeScams: Boolean
    isTestnet: Boolean
    isVerified: Boolean
    potentialScam: Boolean
    trendingIgnored: Boolean
    creatorAddresses: [String!]
    launchpadProtocol: [String!]
    launchpadName: [String!]
    launchpadCompleted: Boolean
    launchpadMigrated: Boolean
    launchpadGraduationPercent: NumberFilter
    launchpadCompletedAt: NumberFilter
    launchpadMigratedAt: NumberFilter
    freezable: Boolean
    mintable: Boolean
    profanity: Boolean
    walletAgeAvg: NumberFilter
    walletAgeStd: NumberFilter
    swapPct1dOldWallet: NumberFilter
    swapPct7dOldWallet: NumberFilter
    totalFees5m: NumberFilter
    totalFees1: NumberFilter
    totalFees4: NumberFilter
    totalFees12: NumberFilter
    totalFees24: NumberFilter
    poolFees24: NumberFilter
    feeToVolumeRatio24: NumberFilter
    sniperCount: NumberFilter
    sniperHeldPercentage: NumberFilter
    bundlerCount: NumberFilter
    bundlerHeldPercentage: NumberFilter
    insiderCount: NumberFilter
    insiderHeldPercentage: NumberFilter
    suspiciousCount: NumberFilter
    suspiciousHeldPercentage: NumberFilter
    devHeldPercentage: NumberFilter
    top10HoldersPercent: NumberFilter
    coinCommunityPostCount: NumberFilter
    coinCommunityMemberCount: NumberFilter
    coinCommunityLikeCount: NumberFilter
    coinCommunityLastPostAt: NumberFilter
    hasGridData: Boolean
    bluechipRatings: [String!]
    riskVerdicts: [RiskVerdict!]
    riskCoverages: [RiskAnalysisCoverage!]
    riskReasons: [RiskReasonCode!]
    riskScore: NumberFilter
    riskFlaggedAt: NumberFilter
    athPrice: NumberFilter
    atlPrice: NumberFilter
    athFdv: NumberFilter
    atlFdv: NumberFilter
    athCircMc: NumberFilter
    atlCircMc: NumberFilter
  }

  enum TokenPairStatisticsType {
    FILTERED
    UNFILTERED
  }

  enum TokenRankingAttribute {
    riskScore
    riskFlaggedAt
    createdAt
    tokenCreatedAt
    lastTransaction
    buyCount5m
    buyCount1
    buyCount4
    buyCount12
    buyCount24
    change5m
    change1
    change4
    change12
    change24
    volumeChange5m
    volumeChange1
    volumeChange4
    volumeChange12
    volumeChange24
    high5m
    high1
    high4
    high12
    high24
    holders
    notableHolderCount
    liquidity
    totalLiquidityUsd
    low5m
    low1
    low4
    low12
    low24
    marketCap
    circulatingMarketCap
    priceUSD
    sellCount5m
    sellCount1
    sellCount4
    sellCount12
    sellCount24
    trendingScore
    trendingScore5m
    trendingScore1
    trendingScore4
    trendingScore12
    trendingScore24
    txnCount5m
    txnCount1
    txnCount4
    txnCount12
    txnCount24
    uniqueBuys5m
    uniqueBuys1
    uniqueBuys4
    uniqueBuys12
    uniqueBuys24
    uniqueSells5m
    uniqueSells1
    uniqueSells4
    uniqueSells12
    uniqueSells24
    uniqueTransactions5m
    uniqueTransactions1
    uniqueTransactions4
    uniqueTransactions12
    uniqueTransactions24
    volume5m
    volume1
    volume4
    volume12
    volume24
    buyVolume5m
    buyVolume1
    buyVolume4
    buyVolume12
    buyVolume24
    sellVolume5m
    sellVolume1
    sellVolume4
    sellVolume12
    sellVolume24
    poolFees5m
    poolFees1
    poolFees4
    poolFees12
    poolFees24
    baseFees5m
    baseFees1
    baseFees4
    baseFees12
    baseFees24
    priorityFees5m
    priorityFees1
    priorityFees4
    priorityFees12
    priorityFees24
    builderTips5m
    builderTips1
    builderTips4
    builderTips12
    builderTips24
    l1DataFees5m
    l1DataFees1
    l1DataFees4
    l1DataFees12
    l1DataFees24
    totalFees5m
    totalFees1
    totalFees4
    totalFees12
    totalFees24
    feeToVolumeRatio5m
    feeToVolumeRatio1
    feeToVolumeRatio4
    feeToVolumeRatio12
    feeToVolumeRatio24
    launchpadCompletedAt
    launchpadMigratedAt
    graduationPercent
    walletAgeAvg
    walletAgeStd
    swapPct1dOldWallet
    swapPct7dOldWallet
    sniperHeldPercentage
    bundlerHeldPercentage
    insiderHeldPercentage
    suspiciousHeldPercentage
    sniperCount
    bundlerCount
    insiderCount
    suspiciousCount
    devHeldPercentage
    top10HoldersPercent
    coinCommunityPostCount
    coinCommunityMemberCount
    coinCommunityLikeCount
    coinCommunityLastPostAt
  }

  enum RankingDirection {
    ASC
    DESC
  }

  input TokenRanking {
    attribute: TokenRankingAttribute
    direction: RankingDirection
  }
  ```
</div>

### Example

<a href="/explore" target="_blank" rel="noopener noreferrer">Test this query in the Explorer →</a>

```graphql theme={null}
{
  filterTokens(
    filters: {network: 1399811149, buyVolume24: {gt: 5000}, circulatingMarketCap: {gt: 1000000, lt: 20000000}}
    rankings: [{attribute: trendingScore24, direction: DESC}]
    limit: 25
  ) {
    results {
      buyVolume24
      sellVolume24
      circulatingMarketCap
      createdAt
      holders
      liquidity
      token {
        info {
          address
          name
          symbol
        }
        createdAt
        creatorAddress
        createTransactionHash
      }
      txnCount24
      walletAgeAvg
      walletAgeStd
    }
  }
}
```

### Usage Guidelines

* Response limit: 200 tokens per request
* If `rankings` is omitted, results default to trending order (the `trendingScore` attribute). Pass `rankings` explicitly when you need a specific sort.
* Use `trendingScore24` or `volume24` rankings for better results instead of `createdAt`
* Apply quality filters such as volume and liquidity minimums to avoid low quality tokens
* Use `phrase` parameter for searching by token name, symbol, or contract address
* For exact symbol searches, use the `$` prefix and combine `phrase` with volume/liquidity rankings to improve results
* We recommend the use of `useAggregatedStats: true` to include aggregated token stats in results. This is not enabled by default.

<Note>
  **Paginating results**: `filterTokens` uses offset-based pagination, not a cursor. Set `limit` for the page size (up to 200 results per request) and `offset` to skip results. For the next page, set `offset` to your previous `offset` plus the number of results returned.
</Note>

### Troubleshooting Tips

<AccordionGroup>
  <Accordion title="How does Codex identify and label scam tokens vs verified tokens?">
    Codex doesn't expose a single "verified" or "spam" label, but several fields together cover this. Detection is automated, based on transaction flow patterns and the wallets interacting with each token. Defined.fi users can also flag tokens on the frontend (moderated daily), and confirmed flags are reflected in the `isScam` response field.

    **Reading verification status (response fields):**

    * `isScam` (boolean): `isScam: false` is Codex's equivalent of a token being "verified." Includes both algorithmic detection and confirmed user flags from Defined.fi. Available on `token`, `tokens`, `filterTokens`, and `pairMetadata` (via `enhancedToken0` / `enhancedToken1`).
    * `potentialScamReasons` (`[PotentialScamReason]`): array of enum values explaining why a token was flagged. Possible values: `MinimumLiquidity`, `LiquidityRugPull`, `SuspiciousWalletActivity`, `AbnormalBuyerRatio`. Available on `filterTokens` results (`TokenFilterResult`) and `filterPairs` results (`PairFilterResult`).

    Note: there is no `isVerified` or `potentialScam` response field. Both are filter inputs only.

    **Filtering on `filterTokens` (input fields):**

    * `isVerified: true`: only return verified tokens (excludes anything flagged as a scam).
    * `potentialScam: true`: return only tokens flagged as potential scams (useful for inspection).
    * `potentialScam: false`: explicitly exclude flagged tokens.
    * `includeScams: true`: include scam-flagged tokens in your results. Default is `false`, so by default `filterTokens` already excludes flagged tokens.

    Detection isn't perfect, but the defaults cut exposure significantly.

    **Recommended for trending pages:**
    Combine `potentialScam: false` with `trendingIgnored: false` to also exclude uninteresting tokens like stablecoins, network base tokens, and known rugs.
  </Accordion>

  <Accordion title="Cannot query field &#x22;price&#x22; / &#x22;priceChange24h&#x22; on type &#x22;TokenFilterResult&#x22;">
    A few result fields have names that are commonly guessed wrong. The correct names are:

    * **`priceUSD`** — the current token price (not `price` or `priceUsd`)
    * **`change24`** — percent price change over the past 24 hours, in decimal format (not `priceChange24h` or `priceChange24`). The same pattern applies to the other windows: `change5m`, `change1`, `change4`, `change12`.
    * **`token.info.description`** — the token description lives on `token.info` (`TokenInfo`), not directly on `token` (`EnhancedToken`). The same goes for `totalSupply`, `circulatingSupply`, and the `image*Url` fields.

    If you hit a `GRAPHQL_VALIDATION_FAILED` error, check the [TokenFilterResult](/api-reference/types/tokenfilterresult) type reference for the full list of valid response fields.
  </Accordion>

  <Accordion title="Token not being returned in search results">
    Check if the token has been flagged as a potential scam by adding `includeScams: true` to your filters. Also verify you're searching the correct network and the token has trading activity (we only index tokens after swaps have occurred).
  </Accordion>

  <Accordion title="Results are returning too much junk data or scam tokens">
    Add quality filters to improve results. We recommend setting minimum thresholds for volume, liquidity, holders, etc. Additionally, rank results by `trendingScore24` or `volume24` rather than liquidity to get more meaningful results. Experiment with filters that will suit your needs.
  </Accordion>

  <Accordion title="Responses seem slow. What is the expected response time for queries and how long does it take for new tokens to be queryable?">
    Response times are generally 60-150ms and it takes \~2-5 seconds to update the search cluster with new data. Contact our team if you are experiencing consistently delayed response times.
  </Accordion>

  <Accordion title="How can I create trending pages similar to those on Defined.fi?">
    Check out our [Discover Tokens](/recipes/discover-tokens) recipe for more useful tips on how to use `filterTokens`.
  </Accordion>

  <Accordion title="How do I know if I can trust a null value for Mintable/Freezable status?">
    A `null` or `undefined` value for Mintable/Freezable will both return `null` through Codex. To differentiate between the two, we've included an `isMintableValid` and `isFreezableValid` field to show whether the `null` value returned is trustworthy or if we simply lack that information for the token (ie: `undefined`).
  </Accordion>

  <Accordion title="How does `phrase` search work? I'm getting incorrect results.">
    Avoid sorting by `createdAt` when using `phrase` search. Instead, rank by `trendingScore24` or `volume24` (those produce far more meaningful results). We index over 75+ Million tokens, so finding the right token from a one-word phrase requires sensible ranking. For exact symbol matches, prefix the phrase with `$` (e.g. `$PEPE`); for contract address matches, pass the address directly.
  </Accordion>

  <Accordion title="What's the difference between `createdAt` and `token.createdAt`?">
    These two timestamps represent different things and often won't match:

    * **`createdAt`** (result level): on-chain creation timestamp of the token's *current top pair* — not the token itself. For newly launched tokens the two usually coincide, but for older tokens with multiple pairs the current top pair may have been created later than both the token and its first pair. To see creation timestamps for every pair, use [`listPairsForToken`](/api-reference/queries/listpairsfortoken).
    * **`token.createdAt`** (nested): Codex *indexing time* — when we first saw the token, not its on-chain creation. Typically 1-2s after pair creation for new tokens, but can be months or years later for historical tokens that predate our coverage of their source (e.g. pump.fun tokens created before we supported it).

    You may also notice `lastTransaction` (the last on-chain *trade*) timestamped *prior to* `token.createdAt`. That's expected — our indexing time can be later than the token's last trade, and transfers or burns don't update `lastTransaction`.
  </Accordion>
</AccordionGroup>

### Related Recipes

* [Discover Tokens](/recipes/discover-tokens): Build token discovery pages with trending data, filters, and search
* [Launchpads](/recipes/launchpads): Build a launchpad discovery view with real-time token lifecycle updates
* [Launchpad Lifecycle](/recipes/launchpad-lifecycle): Understand how tokens progress through launchpad stages from bonding curve to graduation
