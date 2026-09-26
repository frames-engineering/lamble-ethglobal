`filterTokens` is the workhorse query for token discovery on Codex. Almost every numeric attribute Codex computes per token is exposed here as both a filter input and a sortable ranking attribute, and most are evaluated over five rolling time windows (5m, 1h, 4h, 12h, and 24h) so you can build views tuned to any cadence.

For continuously updating results, use our subscription version, [`onFilterTokensUpdated`](https://docs.codex.io/api-reference/subscriptions/onfiltertokensupdated), which mirrors the same filter shape and pushes new matches as the underlying data changes on a polling basis.

## Use this data for

- **Token screeners and trending feeds.** Rank by `volume24`, `change24`, `trendingScore24`, or any of 100+ ranking attributes to power gainer boards and new-listing feeds, scoped to one network or every network at once. Narrow further by specific exchanges or specific launchpads.
- **Quality filtering for legit tokens.** Combine `profanity: false`, `potentialScam: false`, and `trendingIgnored: false` with sensible liquidity and volume thresholds to surface real tokens and filter out scams, low-effort copies, stablecoins, and base assets.
- **Category-scoped screens.** Use the `categories` filter ([`TokenCategoryFilter`](https://docs.codex.io/api-reference/input-objects/tokencategoryfilter)) with `anyOf`, `allOf`, `noneOf`, and `hasCategory` to scope any screen to curated token categories like DeFi, L1, AI, and memes. Browse the available categories with [`categories`](https://docs.codex.io/api-reference/queries/categories).
- **Launchpad (memescope) filtering.** Filter by `launchpadProtocol`, `launchpadCompleted`, `launchpadMigrated`, and migration timestamps to surface graduating tokens (Pump.fun, Bonk, Meteora DBC) the moment they hit the open market. For live-streamed launchpad data, combine with our [`onLaunchpadTokenEventBatch`](https://docs.codex.io/api-reference/subscriptions/onlaunchpadtokeneventbatch) subscription.
- **Global fee data.** Filter and sort on the full Global Fees Paid surface (`totalFees{w}`, `feeToVolumeRatio{w}`, `poolFees24`, builder tips, and more) to identify low-friction trading pairs or tokens where MEV dominates. See [Global Fees Paid](https://docs.codex.io/concepts/global-fees-paid) for the full field map.
- **Holder-quality and bot-detection screens.** Use `top10HoldersPercent`, `insiderHeldPercentage`, `bundlerHeldPercentage`, `sniperHeldPercentage`, and `walletAgeAvg` to filter out concentrated supplies and bot-driven launches.

Every filter and field listed above is available in a single `filterTokens` call, so a full screening page can blend trending rankings, risk filters, launchpad status, fee economics, and holder analysis in one query rather than chaining multiple requests.

Some fields on this endpoint (`asset`, `assetDeployments`, `organization`) are powered by [The Grid](https://thegrid.id/) and will only be populated for established, verified tokens. See [Verified Metadata](https://docs.codex.io/recipes/discover-tokens#verified-metadata) in the Discover Tokens recipe for full details.

**Boolean filtering**: The `filters` input supports an optional `boolFilter` field that accepts `and`, `or`, and `not` operators (nestable up to 4 levels). Use it when you need different filter conditions for a subsets of tokens, such as per-network thresholds, or across different fields. For example, you might want different filter conditions depending on whether tokens are on Solana or Base. See [Advanced Filtering](https://docs.codex.io/recipes/discover-tokens#advanced-filtering) for details.

**Note on market cap**: `marketCap` is fully diluted, price multiplied by total supply, and replaces the deprecated FDV field. For a circulating-supply-based value, use `circulatingMarketCap`.

### ReturnsTokenFilterConnection

See [TokenFilterConnection](https://docs.codex.io/api-reference/types/tokenfilterconnection)

Show Properties\[TokenFilterResult\]

The list of tokens matching the filter parameters. See [TokenFilterResult](https://docs.codex.io/api-reference/types/tokenfilterresult)Int

The number of tokens returned.Int

Where in the list the server started when returning items.

### ArgumentsTokenFilters

A set of filters to apply. See [TokenFilters](https://docs.codex.io/api-reference/input-objects/tokenfilters)

Show PropertiesTokenBoolFilter

Recursive boolean expression for combining token filters. See [TokenBoolFilter](https://docs.codex.io/api-reference/input-objects/tokenboolfilter)TokenCategoryFilter

See [TokenCategoryFilter](https://docs.codex.io/api-reference/input-objects/tokencategoryfilter)NumberFilter

The unix timestamp for the creation of the token’s first pair. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unix timestamp for the creation of the token. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unix timestamp for the token’s last transaction. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of buys in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of buys in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of buys in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of buys in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of buys in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent price change in the past 5 minutes. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent price change in the past hour. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent price change in the past 12 hours. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent price change in the past 24 hours. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent price change in the past 4 hours. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent volume change in the past 5 minutes. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent volume change in the past hour. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent volume change in the past 4 hours. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent volume change in the past 12 hours. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percent volume change in the past 24 hours. Decimal format. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)\[String\]

The list of exchange contract IDs to filter by. Applied in conjunction with `network` filter using an OR condition. When used together, the query returns results that match either the specified exchanges or the specified network.\[String\]

The list of exchange contract addresses to filter by.NumberFilter

The highest price in USD in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The highest price in USD in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The highest price in USD in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The highest price in USD in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The highest price in USD in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The amount of liquidity in the token’s top pair. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The token’s cumulative route-backed liquidity in USD, summed across the token’s pairs with valid routing liquidity. Distinct from `liquidity`, which covers the top pair only. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The lowest price in USD in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The lowest price in USD in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The lowest price in USD in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The lowest price in USD in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The lowest price in USD in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The fully diluted market cap. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The circulating market cap. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)\[Int\]

The list of network IDs to filter by. Applied in conjunction with `exchangeId` filter using an OR condition. When used together, the query returns results that match either the specified exchanges or the specified network.NumberFilter

The number of different wallets holding the token. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The token price in USD. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of sells in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of sells in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of sells in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of sells in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of sells in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of transactions in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of transactions in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of transactions in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of transactions in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The number of transactions in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of buys in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of buys in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of buys in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of buys in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of buys in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of sells in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of sells in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of sells in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of sells in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of sells in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of transactions in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of transactions in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of transactions in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of transactions in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The unique number of transactions in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The trade volume in USD in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The trade volume in USD in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The trade volume in USD in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The trade volume in USD in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The trade volume in USD in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The buy volume in USD in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The buy volume in USD in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The buy volume in USD in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The buy volume in USD in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The buy volume in USD in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The sell volume in USD in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The sell volume in USD in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The sell volume in USD in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The sell volume in USD in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The sell volume in USD in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)Boolean

Whether to include tokens that have been flagged as scams. Default: falseBoolean

Whether to filter for tokens on testnet networks. Use `true` for testnet tokens only, `false` for mainnet tokens only and `undefined` (default) for both.Boolean

Only include verified tokensBoolean

Filter potential Scams

Whether to ignore pairs/tokens not relevant to trending. This is done checking against a few factors and ignoring uninteresting tokens like stables / network tokens. If you want all tokens regardless of these checks, then don’t include this field. (default) If you want only tokens that fail the trending ignore checks, then set it to `true`. (i.e. stablecoins, rugs, network base tokens) If you want only tokens that pass the trending ignore checks, then set it to `false`.\[String!\]

The addresses of the token creators (supports multiple addresses). Max 25 addresses. You cannot provide both creatorAddress and creatorAddresses.\[String!\]

A list of launchpad protocols.\[String!\]

A list of launchpad names. Any of the following: Pump.fun, Pump Mayhem, Bonk, BONAD.fun, Nad.Fun, Baseapp, Baseapp Creator, Zora, Zora Creator, Four.meme, Four.meme Fair, Believe, Moonshot, Jupiter Studio, boop, Heaven, TokenMill V2, Virtuals, Clanker, Clanker V4, ArenaTrade, Moonit, LaunchLab, MeteoraDBC, Meteora Alpha Vault, Zora Solana, Cooking.City, time.fun, BAGS, Circus, Dealr, OhFuckFun, PrintFun, Trend, shout.fun, xApple, Sendshot, DubDub, cults, OpenGameProtocol, AMERICA.fun, Kumbaya, bow.fun, Sushi Launch, Printr, Bankr, Liquid, Noice, Flaunch, Coinbarrel, Blowfish, MeMoo, Metaplex, Scale, Eitherway, Livo, Trench, Flap, NOXA Fun, hood.fun, pons, Peach, LONG, Feel.cash, EasyA Kickstart, Doppler, o1.exchange, minara.fun, UniswapCCA, tren.ch, StonkFun, Tolly, Launchfair, send.fun, hostile.xyz, Argus, Faze, Lift.Boolean

Indicates if the launchpad is completed.Boolean

Indicates if the launchpad has migrated.NumberFilter

The graduation percentage. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The timestamp when the launchpad was completed. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The timestamp when the launchpad was migrated. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)Boolean

The token is freezable.Boolean

The token is mintable.Boolean

Whether the token name or symbol contains profanity.NumberFilter

The average age of the wallets that traded in the last 24h. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The standard deviation of age of the wallets that traded in the last 24h. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percentage of wallets that are less than 1d old that have traded in the last 24h. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

The percentage of wallets that are less than 7d old that have traded in the last 24h. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by total fees in the past 5 minutes. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by total fees in the past hour. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by total fees in the past 4 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by total fees in the past 12 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by total fees in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by pool fees in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by fee to volume ratio in the past 24 hours. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of wallets that have sniped the token See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by percentage of tokens held by snipers See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of wallets that have bundled the token See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by percentage of tokens held by bundlers See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of wallets that have been an insider of the token See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by percentage of tokens held by insiders See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of suspicious wallets (deduplicated union of snipers, bundlers, and insiders) See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by percentage of tokens held by suspicious wallets See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by percentage of tokens held by the dev See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by top 10 holders percentage. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of posts in the token’s coin community. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of members in the token’s coin community. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by number of likes in the token’s coin community. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by unix timestamp for the most recent post in the token’s coin community. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)Boolean

Filter by whether the token has linked Grid asset data.\[String!\]

Filter by Grid bluechip ratings. Returns tokens matching any of the provided ratings.\[RiskVerdict!\]

Filter by risk verdict. Returns tokens matching any of the provided verdicts. See [RiskVerdict](https://docs.codex.io/api-reference/enums/riskverdict)\[RiskAnalysisCoverage!\]

Filter by how much contract analysis stood behind the verdict. See [RiskAnalysisCoverage](https://docs.codex.io/api-reference/enums/riskanalysiscoverage)\[RiskReasonCode!\]

Filter by risk reason codes. Returns tokens where any of the provided reasons fired. See [RiskReasonCode](https://docs.codex.io/api-reference/enums/riskreasoncode)NumberFilter

Filter by weighted risk score. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by when the engine last recorded a change to the risk assessment, in Unix seconds. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by all-time high price. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by all-time low price. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by all-time high FDV. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by all-time low FDV. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by all-time high circulating market cap. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

Filter by all-time low circulating market cap. See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)NumberFilter

deprecated

See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)

This field is deprecated. Age isn’t supported - use createdAt insteadNumberFilter

deprecated

See [NumberFilter](https://docs.codex.io/api-reference/input-objects/numberfilter)

This field is deprecated. FDV isn’t supported - use marketCap insteadString

deprecated

The address of the creator of the token.

This field is deprecated. Use creatorAddresses string array insteadTokenPairStatisticsType

The type of statistics returned. Can be `FILTERED` or `UNFILTERED`. Default is `UNFILTERED`. See [TokenPairStatisticsType](https://docs.codex.io/api-reference/enums/tokenpairstatisticstype)

Show PropertiesenumenumString

A phrase to search for. Can match a token or pair contract address or partially match a token’s name or symbol.\[String\]

A list of token IDs (`address:networkId`) or addresses. Can be left blank to discover new tokens.\[String\]

A list of token IDs (`address:networkId`) to exclude from results\[TokenRanking\]

A list of ranking attributes to apply. See [TokenRanking](https://docs.codex.io/api-reference/input-objects/tokenranking)

Show PropertiesTokenRankingAttribute

The attribute to rank tokens by. See [TokenRankingAttribute](https://docs.codex.io/api-reference/enums/tokenrankingattribute)RankingDirection

The direction to apply to the ranking attribute. See [RankingDirection](https://docs.codex.io/api-reference/enums/rankingdirection)Boolean

Flag to use aggregated token stats. Default is `false`.Int

The maximum number of tokens to return.Int

Where in the list the server should start when returning items. Use `count` + `page` from the previous query to request the next page of results.

### Example

[Test this query in the Explorer →](https://docs.codex.io/explore)

```graphql
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

- Response limit: 200 tokens per request
- If `rankings` is omitted, results default to trending order (the `trendingScore` attribute). Pass `rankings` explicitly when you need a specific sort.
- Use `trendingScore24` or `volume24` rankings for better results instead of `createdAt`
- Apply quality filters such as volume and liquidity minimums to avoid low quality tokens
- Use `phrase` parameter for searching by token name, symbol, or contract address
- For exact symbol searches, use the `$` prefix and combine `phrase` with volume/liquidity rankings to improve results
- We recommend the use of `useAggregatedStats: true` to include aggregated token stats in results. This is not enabled by default.

**Paginating results**: `filterTokens` uses offset-based pagination, not a cursor. Set `limit` for the page size (up to 200 results per request) and `offset` to skip results. For the next page, set `offset` to your previous `offset` plus the number of results returned.

### Troubleshooting Tips

How does Codex identify and label scam tokens vs verified tokens?

Codex doesn’t expose a single “verified” or “spam” label, but several fields together cover this. Detection is automated, based on transaction flow patterns and the wallets interacting with each token. Defined.fi users can also flag tokens on the frontend (moderated daily), and confirmed flags are reflected in the `isScam` response field.

**Reading verification status (response fields):**

- `isScam` (boolean): `isScam: false` is Codex’s equivalent of a token being “verified.” Includes both algorithmic detection and confirmed user flags from Defined.fi. Available on `token`, `tokens`, `filterTokens`, and `pairMetadata` (via `enhancedToken0` / `enhancedToken1`).
- `potentialScamReasons` (`[PotentialScamReason]`): array of enum values explaining why a token was flagged. Possible values: `MinimumLiquidity`, `LiquidityRugPull`, `SuspiciousWalletActivity`, `AbnormalBuyerRatio`. Available on `filterTokens` results (`TokenFilterResult`) and `filterPairs` results (`PairFilterResult`).

Note: there is no `isVerified` or `potentialScam` response field. Both are filter inputs only.

**Filtering on `filterTokens` (input fields):**

- `isVerified: true`: only return verified tokens (excludes anything flagged as a scam).
- `potentialScam: true`: return only tokens flagged as potential scams (useful for inspection).
- `potentialScam: false`: explicitly exclude flagged tokens.
- `includeScams: true`: include scam-flagged tokens in your results. Default is `false`, so by default `filterTokens` already excludes flagged tokens.

Detection isn’t perfect, but the defaults cut exposure significantly.

**Recommended for trending pages:** Combine `potentialScam: false` with `trendingIgnored: false` to also exclude uninteresting tokens like stablecoins, network base tokens, and known rugs.

Cannot query field "price" / "priceChange24h" on type "TokenFilterResult"

A few result fields have names that are commonly guessed wrong. The correct names are:

- **`priceUSD`** — the current token price (not `price` or `priceUsd`)
- **`change24`** — percent price change over the past 24 hours, in decimal format (not `priceChange24h` or `priceChange24`). The same pattern applies to the other windows: `change5m`, `change1`, `change4`, `change12`.
- **`token.info.description`** — the token description lives on `token.info` (`TokenInfo`), not directly on `token` (`EnhancedToken`). The same goes for `totalSupply`, `circulatingSupply`, and the `image*Url` fields.

If you hit a `GRAPHQL_VALIDATION_FAILED` error, check the [TokenFilterResult](https://docs.codex.io/api-reference/types/tokenfilterresult) type reference for the full list of valid response fields.

Results are returning too much junk data or scam tokens

Add quality filters to improve results. We recommend setting minimum thresholds for volume, liquidity, holders, etc. Additionally, rank results by `trendingScore24` or `volume24` rather than liquidity to get more meaningful results. Experiment with filters that will suit your needs.

Responses seem slow. What is the expected response time for queries and how long does it take for new tokens to be queryable?

Response times are generally 60-150ms and it takes ~2-5 seconds to update the search cluster with new data. Contact our team if you are experiencing consistently delayed response times.

How do I know if I can trust a null value for Mintable/Freezable status?

A `null` or `undefined` value for Mintable/Freezable will both return `null` through Codex. To differentiate between the two, we’ve included an `isMintableValid` and `isFreezableValid` field to show whether the `null` value returned is trustworthy or if we simply lack that information for the token (ie: `undefined`).

What's the difference between `createdAt` and `token.createdAt`?

These two timestamps represent different things and often won’t match:

- **`createdAt`** (result level): on-chain creation timestamp of the token’s *current top pair* — not the token itself. For newly launched tokens the two usually coincide, but for older tokens with multiple pairs the current top pair may have been created later than both the token and its first pair. To see creation timestamps for every pair, use [`listPairsForToken`](https://docs.codex.io/api-reference/queries/listpairsfortoken).
- **`token.createdAt`** (nested): Codex *indexing time* — when we first saw the token, not its on-chain creation. Typically 1-2s after pair creation for new tokens, but can be months or years later for historical tokens that predate our coverage of their source (e.g. pump.fun tokens created before we supported it).

You may also notice `lastTransaction` (the last on-chain *trade*) timestamped *prior to* `token.createdAt`. That’s expected — our indexing time can be later than the token’s last trade, and transfers or burns don’t update `lastTransaction`.

### Related Recipes

- [Discover Tokens](https://docs.codex.io/recipes/discover-tokens): Build token discovery pages with trending data, filters, and search
- [Launchpads](https://docs.codex.io/recipes/launchpads): Build a launchpad discovery view with real-time token lifecycle updates
- [Launchpad Lifecycle](https://docs.codex.io/recipes/launchpad-lifecycle): Understand how tokens progress through launchpad stages from bonding curve to graduation