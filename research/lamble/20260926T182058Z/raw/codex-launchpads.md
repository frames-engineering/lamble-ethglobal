> ## Documentation Index
> Fetch the complete documentation index at: https://docs.codex.io/llms.txt
> Use this file to discover all available pages before exploring further.

# filterLaunchpads

> Returns a list of launchpads based on a variety of filters. Reference for the filterLaunchpads query in the Codex API: arguments, response fields, and usage.

<Note>
  **Beta**: `filterLaunchpads` is live in production but still being validated. Some stats need up to two weeks of history to fully accumulate, so expect fields and results to firm up over the coming weeks. Feedback is welcome while we finalize it.
</Note>

<div data-generated>
  ## GraphQL

  ```
  type Query {
    filterLaunchpads(
      filters: LaunchpadFilters
      launchpads: [String!]
      networks: [Int!]
      scope: LaunchpadFilterScope
      rankings: [LaunchpadRanking!]
      limit: Int
      offset: Int
    ): LaunchpadFilterConnection
  }

  enum LaunchpadFilterScope {
    network
    global
  }

  type LaunchpadStats {
    volume1: String
    volume4: String
    volume12: String
    volume24: String
    buyVolume1: String
    buyVolume4: String
    buyVolume12: String
    buyVolume24: String
    sellVolume1: String
    sellVolume4: String
    sellVolume12: String
    sellVolume24: String
    volumeChange1: Float
    volumeChange4: Float
    volumeChange12: Float
    volumeChange24: Float
    transactions1: Int
    transactions4: Int
    transactions12: Int
    transactions24: Int
    buys1: Int
    buys4: Int
    buys12: Int
    buys24: Int
    sells1: Int
    sells4: Int
    sells12: Int
    sells24: Int
    activeTokens1: Int
    activeTokens4: Int
    activeTokens12: Int
    activeTokens24: Int
    liquidity: String
    marketCap: String
    poolFees1: String
    poolFees4: String
    poolFees12: String
    poolFees24: String
    totalFees1: String
    totalFees4: String
    totalFees12: String
    totalFees24: String
    feeToVolumeRatio1: Float
    feeToVolumeRatio4: Float
    feeToVolumeRatio12: Float
    feeToVolumeRatio24: Float
  }

  type LaunchpadFilterResult {
    id: String!
    launchpadName: String
    displayName: String
    launchpadUrl: String
    iconUrl: String
    color: String
    isThirdParty: Boolean
    launchpadProtocol: String
    networkId: Int
    networkIds: [Int!]
    scope: LaunchpadFilterScope
    timestamp: Int
    isTestnet: Boolean
    tokensTotal: Int
    tokensCompletedTotal: Int
    tokensMigratedTotal: Int
    migrationRate: Float
    avgGraduationPercent: Float
    tokensCreated1: Int
    tokensCreated4: Int
    tokensCreated12: Int
    tokensCreated24: Int
    tokensCreated1w: Int
    tokensCompleted1: Int
    tokensCompleted4: Int
    tokensCompleted12: Int
    tokensCompleted24: Int
    tokensCompleted1w: Int
    tokensMigrated1: Int
    tokensMigrated4: Int
    tokensMigrated12: Int
    tokensMigrated24: Int
    tokensMigrated1w: Int
    migrationRate24: Float
    migrationRate1w: Float
    volume1: String
    volume4: String
    volume12: String
    volume24: String
    buyVolume1: String
    buyVolume4: String
    buyVolume12: String
    buyVolume24: String
    sellVolume1: String
    sellVolume4: String
    sellVolume12: String
    sellVolume24: String
    volumeChange1: Float
    volumeChange4: Float
    volumeChange12: Float
    volumeChange24: Float
    transactions1: Int
    transactions4: Int
    transactions12: Int
    transactions24: Int
    buys1: Int
    buys4: Int
    buys12: Int
    buys24: Int
    sells1: Int
    sells4: Int
    sells12: Int
    sells24: Int
    activeTokens1: Int
    activeTokens4: Int
    activeTokens12: Int
    activeTokens24: Int
    liquidity: String
    marketCap: String
    poolFees1: String
    poolFees4: String
    poolFees12: String
    poolFees24: String
    totalFees1: String
    totalFees4: String
    totalFees12: String
    totalFees24: String
    feeToVolumeRatio1: Float
    feeToVolumeRatio4: Float
    feeToVolumeRatio12: Float
    feeToVolumeRatio24: Float
    pre: LaunchpadStats
    post: LaunchpadStats
  }

  type LaunchpadFilterConnection {
    results: [LaunchpadFilterResult]
    count: Int
    offset: Int
  }

  input NumberFilter {
    gte: Float
    gt: Float
    lte: Float
    lt: Float
  }

  input LaunchpadStatsFilters {
    volume1: NumberFilter
    volume4: NumberFilter
    volume12: NumberFilter
    volume24: NumberFilter
    buyVolume1: NumberFilter
    buyVolume4: NumberFilter
    buyVolume12: NumberFilter
    buyVolume24: NumberFilter
    sellVolume1: NumberFilter
    sellVolume4: NumberFilter
    sellVolume12: NumberFilter
    sellVolume24: NumberFilter
    volumeChange1: NumberFilter
    volumeChange4: NumberFilter
    volumeChange12: NumberFilter
    volumeChange24: NumberFilter
    transactions1: NumberFilter
    transactions4: NumberFilter
    transactions12: NumberFilter
    transactions24: NumberFilter
    buys1: NumberFilter
    buys4: NumberFilter
    buys12: NumberFilter
    buys24: NumberFilter
    sells1: NumberFilter
    sells4: NumberFilter
    sells12: NumberFilter
    sells24: NumberFilter
    activeTokens1: NumberFilter
    activeTokens4: NumberFilter
    activeTokens12: NumberFilter
    activeTokens24: NumberFilter
    liquidity: NumberFilter
    marketCap: NumberFilter
    poolFees1: NumberFilter
    poolFees4: NumberFilter
    poolFees12: NumberFilter
    poolFees24: NumberFilter
    totalFees1: NumberFilter
    totalFees4: NumberFilter
    totalFees12: NumberFilter
    totalFees24: NumberFilter
    feeToVolumeRatio1: NumberFilter
    feeToVolumeRatio4: NumberFilter
    feeToVolumeRatio12: NumberFilter
    feeToVolumeRatio24: NumberFilter
  }

  input LaunchpadFilters {
    launchpadProtocol: [String!]
    isThirdParty: Boolean
    isTestnet: Boolean
    timestamp: NumberFilter
    tokensTotal: NumberFilter
    tokensCompletedTotal: NumberFilter
    tokensMigratedTotal: NumberFilter
    migrationRate: NumberFilter
    avgGraduationPercent: NumberFilter
    tokensCreated1: NumberFilter
    tokensCreated4: NumberFilter
    tokensCreated12: NumberFilter
    tokensCreated24: NumberFilter
    tokensCreated1w: NumberFilter
    tokensCompleted1: NumberFilter
    tokensCompleted4: NumberFilter
    tokensCompleted12: NumberFilter
    tokensCompleted24: NumberFilter
    tokensCompleted1w: NumberFilter
    tokensMigrated1: NumberFilter
    tokensMigrated4: NumberFilter
    tokensMigrated12: NumberFilter
    tokensMigrated24: NumberFilter
    tokensMigrated1w: NumberFilter
    migrationRate24: NumberFilter
    migrationRate1w: NumberFilter
    volume1: NumberFilter
    volume4: NumberFilter
    volume12: NumberFilter
    volume24: NumberFilter
    buyVolume1: NumberFilter
    buyVolume4: NumberFilter
    buyVolume12: NumberFilter
    buyVolume24: NumberFilter
    sellVolume1: NumberFilter
    sellVolume4: NumberFilter
    sellVolume12: NumberFilter
    sellVolume24: NumberFilter
    volumeChange1: NumberFilter
    volumeChange4: NumberFilter
    volumeChange12: NumberFilter
    volumeChange24: NumberFilter
    transactions1: NumberFilter
    transactions4: NumberFilter
    transactions12: NumberFilter
    transactions24: NumberFilter
    buys1: NumberFilter
    buys4: NumberFilter
    buys12: NumberFilter
    buys24: NumberFilter
    sells1: NumberFilter
    sells4: NumberFilter
    sells12: NumberFilter
    sells24: NumberFilter
    activeTokens1: NumberFilter
    activeTokens4: NumberFilter
    activeTokens12: NumberFilter
    activeTokens24: NumberFilter
    liquidity: NumberFilter
    marketCap: NumberFilter
    poolFees1: NumberFilter
    poolFees4: NumberFilter
    poolFees12: NumberFilter
    poolFees24: NumberFilter
    totalFees1: NumberFilter
    totalFees4: NumberFilter
    totalFees12: NumberFilter
    totalFees24: NumberFilter
    feeToVolumeRatio1: NumberFilter
    feeToVolumeRatio4: NumberFilter
    feeToVolumeRatio12: NumberFilter
    feeToVolumeRatio24: NumberFilter
    pre: LaunchpadStatsFilters
    post: LaunchpadStatsFilters
  }

  enum LaunchpadRankingAttribute {
    volume1
    volume4
    volume12
    volume24
    buyVolume1
    buyVolume4
    buyVolume12
    buyVolume24
    sellVolume1
    sellVolume4
    sellVolume12
    sellVolume24
    volumeChange1
    volumeChange4
    volumeChange12
    volumeChange24
    transactions1
    transactions4
    transactions12
    transactions24
    buys1
    buys4
    buys12
    buys24
    sells1
    sells4
    sells12
    sells24
    activeTokens1
    activeTokens4
    activeTokens12
    activeTokens24
    liquidity
    marketCap
    poolFees1
    poolFees4
    poolFees12
    poolFees24
    totalFees1
    totalFees4
    totalFees12
    totalFees24
    feeToVolumeRatio1
    feeToVolumeRatio4
    feeToVolumeRatio12
    feeToVolumeRatio24
    timestamp
    tokensTotal
    tokensCompletedTotal
    tokensMigratedTotal
    migrationRate
    avgGraduationPercent
    tokensCreated1
    tokensCreated4
    tokensCreated12
    tokensCreated24
    tokensCreated1w
    tokensCompleted1
    tokensCompleted4
    tokensCompleted12
    tokensCompleted24
    tokensCompleted1w
    tokensMigrated1
    tokensMigrated4
    tokensMigrated12
    tokensMigrated24
    tokensMigrated1w
    migrationRate24
    migrationRate1w
  }

  enum RankingDirection {
    ASC
    DESC
  }

  enum LaunchpadStatsPhase {
    combined
    pre
    post
  }

  input LaunchpadRanking {
    attribute: LaunchpadRankingAttribute!
    direction: RankingDirection
    phase: LaunchpadStatsPhase
  }
  ```
</div>

### Example

<a href="/explore" target="_blank" rel="noopener noreferrer">Test this query in the Explorer →</a>

```graphql theme={null}
{
  filterLaunchpads(
    filters: {volume24: {gt: 100000}}
    rankings: [{attribute: volume24, direction: DESC}]
    limit: 10
  ) {
    count
    results {
      launchpadName
      displayName
      networkId
      tokensCreated24
      tokensCompleted24
      tokensMigrated24
      migrationRate24
      volume24
      liquidity
      marketCap
    }
  }
}
```

### Usage Guidelines

* Response limit: 200 launchpads per request
