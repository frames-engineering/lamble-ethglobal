### ReturnsTokenBarsResponse

See [TokenBarsResponse](https://docs.codex.io/api-reference/types/tokenbarsresponse)

Show Properties\[Float\]!

The opening price.\[Float\]!

The high price.\[Float\]!

The low price.\[Float\]!

The closing price.\[Int!\]!

The timestamp for the bar.String!

The status code for the batch: `ok` for successful data retrieval and `no_data` for empty responses signaling the end of server data.\[String\]

The volume with higher precision.\[String\]

The volume in the native token for the network\[Int\]!

The number of unique buyers\[Int\]!

The number of buys\[String\]!

The buy volume in USD\[Int\]!

The number of unique sellers\[Int\]!

The number of sells\[String\]!

The sell volume in USD\[String\]!

Liquidity in USD\[Int\]!

The number of traders\[Int\]!

The number of transactions\[String\]

The aggregate pool/DEX fees in USD\[String\]

The aggregate base fees (gas) in USD\[String\]

The aggregate priority fees in USD\[String\]

The aggregate builder tips (MEV) in USD\[String\]

The aggregate L1 data posting fees in USD (L2 rollups only)\[String\]

The total fees in USD (sum of poolFees + baseFees + priorityFees + builderTips + l1DataFees)\[String\]

Ratio of total fees to volume (totalFees / volume). Null when volume is zero.\[String\]

Ratio of builder tips (MEV) to total fees (builderTips / totalFees). Null when totalFees is zero.\[String\]

Gas cost per dollar of volume ((baseFees + priorityFees + l1DataFees) / volume). Null when volume is zero.\[String\]

Average total fee cost per transaction in USD (totalFees / transactions). Null when there are no transactions.\[String\]

MEV risk level for this bar: low (<3% builder tips), medium (3-30%), or high (>30%). Null for pre-genesis bars.\[String\]

Dominant fee component: gas-dominated (gas >50% of fees), mev-dominated (tips >20%), or pool-fee-dominated. Null when no fees.\[String\]

Rate of sandwich attacks per transaction (sandwichedEventCount / transactions). Null when no transaction data.EnhancedToken!

The token that is being returned See [EnhancedToken](https://docs.codex.io/api-reference/types/enhancedtoken)

### ArgumentsString!

required

The ID of the token (`tokenAddress:networkId`). For example, `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2:1` returns aggregated bar data for WETH pairs on Ethereum.Int!

required

The unix timestamp for the start of the requested range.Int!

required

The unix timestamp for the end of the requested range.String!

required

The time frame for each candle. Available options are `1S`, `5S`, `15S`, `30S`, `1`, `5`, `15`, `30`, `60`, `240`, `720`, `1D`, `7D`. Resolutions lower than 1 minute are only updated for the last 24 hours due to the volume of data produced.QuoteCurrency

The currency to use for the response. Can be `USD` or `TOKEN`. Default is `USD`. Use `currencyCode: TOKEN` for native token pricing. See [QuoteCurrency](https://docs.codex.io/api-reference/enums/quotecurrency)

Show PropertiesenumenumBoolean

Whether to remove leading null values from the response. Default is `false`. To fetch a token’s entire history, set resolution to `1D`, `from` value to `0` and `removeLeadingNullValues` to `true`.Boolean

Whether to remove empty bars from the response. This is useful for eliminating gaps in low-activity tokens. Default is `false`.TokenPairStatisticsType

The type of statistics returned. Can be `FILTERED` or `UNFILTERED`. Default is `UNFILTERED`. See [TokenPairStatisticsType](https://docs.codex.io/api-reference/enums/tokenpairstatisticstype)

Show PropertiesenumenumInt

Guarantees number of bars returned is at most this number. Use `countback: 1500` with `from: 0` for maximum results.

### Example

[Test this query in the Explorer →](https://docs.codex.io/explore)

```graphql
{
  getTokenBars(
    symbol: "So11111111111111111111111111111111111111112:1399811149"
    from: 1753121580
    to: 1758303571
    resolution: "5"
    countback: 10
    removeEmptyBars: true
  ) {
    o
    h
    c
    l
    volume
  }
}
```

### Usage Guidelines

- For data from mid-2025 onwards (timestamp 1753121580), `getTokenBars` returns an aggregated price across all pools. Anything before that falls back to the top pair.
- Historical data only includes OHLC data; volume/traders data cannot be aggregated across all pools on the fly.
- Includes more historical data than `getBars` because it iterates through top pairs rather than using a single pair.
- Response time is slightly faster for current data, but the difference from `getBars` is negligible.
- Refer to [getBars](https://docs.codex.io/api-reference/queries/getbars) for additional usage guidelines and troubleshooting tips.

Pricing for aggregate charts will no longer only use the top pair. Weighted average pricing will be used across a token’s top pairs, based on liquidity/recency, while filtering out lower quality pairs from contributing.

### Troubleshooting Tips

When should I use getTokenBars vs getBars?

Use `getTokenBars` when you want aggregate price data for a token across all its trading pairs — it uses weighted average pricing based on liquidity. Use `getBars` when you want price data for a specific trading pair.

Null or empty values returned

- Check that your timestamp window is accurate and long enough for the resolution requested
- Ensure the token has started trading (we do not index tokens until trades occur)
- Use `removeLeadingNullValues: true`

Updating charts in real-time

You can use `getTokenBars` to do an initial fetch of bars and then subscribe to `onTokenBarsUpdated` to keep it updated in real-time. More info on creating real-time charts is available [here](https://docs.codex.io/recipes/charts).

### Related Recipes

- [Detailed Token Page](https://docs.codex.io/recipes/detailed-token-page): Build a comprehensive token detail page with price, holders, trades, and real-time updates
- [Charts](https://docs.codex.io/recipes/charts): Render token charts with OHLCV data and real-time updates