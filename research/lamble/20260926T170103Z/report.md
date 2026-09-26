# LAMBLE market-data acquisition — 20260926T170103Z

## Result and limits

Two specific narratives now have resolved token identities and real, auditable hourly charts. All 19 application venue slugs are preserved and have acquired financial-source mappings. Fourteen rows have 30 complete fee days; twelve have fees, revenue and correctly calculated changes for all three requested windows.

**This is a partial acquisition, not a drop-in production dataset.** Both narrative charts measure explicitly selected two-token/two-pool samples. Launch counts and curve-completion counts remain unknown for every venue. Supported-chain and fee-configuration verification is incomplete. There is no justified third featured narrative.

Frames discovery, descriptors, usage and unpaid probes worked. **No paid Frames invocation was made.** The user's instruction requires an existing approved overall ceiling, which was not present in this session. A clarification was sent; no ceiling was received. The account's $10 per-run maximum was not treated as authorization. Actual market datasets here were obtained from public APIs outside Frames. Therefore no paid Frames data route is claimed as validated.

Runtime inventory anchor: **2026-09-26 17:01:03 UTC**. Individual requests have later `fetched_at` values. Financial anchor: **September 26 00:00 UTC**, using complete prior UTC days. Chart anchor: **September 26 16:00 UTC**, with a one-hour collection safety margin. These are separate snapshots, not a synchronized rolling feed.

## Repository contract

`git ls-remote --symref origin HEAD` resolved `main` at `d98c8a73d78de4f008db032bc51659812d710bf3`, equal to local HEAD. All requested files and relevant chart/format/share imports were inspected. Since `762c11c`, six files changed for CSS, hero animation/contrast, navigation and table presentation. The requested data contract and fixture generation are unchanged.

The provider still selects fixtures, both histories are generated, the first three narrative array entries become visible choices, and the “Launch here” button has no route. Additional conflict: `relativeTime` defaults to the fixture snapshot and the revenue-take display clamps values at 100%. `node_modules/next/dist/docs/` is absent. No Next.js/application code was written, no packages were added to the app, and nothing was committed or deployed.

## Supported specific stories

### 1. X-handle creator-fee routing

UsePaid's [documentation](https://usepaid.app/docs) describes routing token creator fees to a named X account. Its [public registry](https://usepaid.app/) exposes names, contracts, venue tags and recipients. This is a concrete payout behavior, not a generic culture sector. CALI and Elon Coin appear by contract and independently resolve to matching GeckoTerminal identities and PumpSwap pools. The sources report pump.fun origin; creation instructions were not independently decoded.

The docs report an 80/20 recipient/buyback split and explicitly say pump.fun is live, Pons is not yet live, and four.meme is exploratory. The homepage and discussion can imply broader availability. This conflict is retained; the sample uses only Solana pump.fun tokens. Payout amounts, fiat settlement, recipient endorsement and claimed social momentum are not independently verified and are not populated as metrics. Relative token ages and registry `change: 0` values were not used as launch timestamps or price changes.

### 2. Holder rewards in the paired asset

[KNOTS's own site](https://www.knotsonstonk.com/) describes its reversed-STONK joke, StonkFun origin and a transfer-tax mechanism paying holders in STONK. [Bitquery's dated investigation](https://www.bitquery.io/investigations/is-stonkfun-dumping-on-holders) describes the recurring mechanism across KNOTS, ZCAT and other reward coins. [ZCAT's published profile](https://www.mexc.co/en-NG/learn/article/what-is-anonymous-cat-zcat-the-solana-meme-coin-paying-zec/1) identifies its contract and ZEC reward pairing. This is a specific recurring holder-reward behavior. Claims of superior returns are not made.

KNOTS and ZCAT resolve by chain and full address. ZEC and STONK are the selected pools' base/quote counterparts and are excluded as constituents. Pool USD turnover can be used regardless of which side the member occupies; base-token market cap and price-change fields cannot be reused for a quote-side member, so those example fields are null.

### Measured sample, not all-market ranking

| Narrative | Constituents | Selected-pool USD volume, 24h | Selected-pool USD volume, 7d |
| --- | --- | ---: | ---: |
| X-handle creator-fee routing | ELON, CALI | $10,159,739.49 | $19,204,629.85 |
| Holder rewards in the paired asset | ZCAT, KNOTS | $2,848,330.49 | $12,746,068.48 |

Twenty-four buckets cover **[September 25 16:00, September 26 16:00 UTC)**. Seven-day history contains 168 hourly buckets per narrative. Points are oldest first, Unix seconds, with timestamp denoting bucket start. Missing source buckets would produce null; there are none in these selected histories. No daily totals, rolling snapshots or generated curves were used to construct them.

The selected pools are unique. Neither selected pair joins two included constituents, so no constituent-side double counting occurs within this sample. Multi-hop routes can still contribute activity in multiple pools; this is DEX pool turnover, not unique trader spending. All other pools and CEX trading are omitted. Pool discovery stopped after one response page per token and was not exhausted. CALI had 8 returned pools; Elon Coin had 16. Only the first ranked pool per token was frozen into this retrospective dataset.

CALI's 15:00–16:00 September 26 hour equals the sum of 60 minute bars exactly: **$329,440.59267238935**. This supports the start-time convention. An aligned `before_timestamp` returned the boundary bucket, so normalization explicitly filters `[start,end)` and subsequent requests use `end-1`. CALI's missing seventh-day edge bucket was acquired in a bounded two-bucket prefix request.

Membership is **reconstructed today**, not “as observed then.” No earlier detection is claimed. `status`, `startedAt`, `mindshare`, launch totals and legacy attention shares remain null. Supplemental contender volume shares are provided, but must not be silently inserted into the attention field. `topLaunchpads` stays null because it means share of launches, not volume.

Ordering is a curated evidence-backed selection sorted by measured sample volume descending, then slug. It is not a market-wide top-two ranking. Potential accelerationist recipient-funding tokens remain a subnarrative candidate inside UsePaid; stock-paired memes remain a separate candidate requiring specific member evidence. Neither was promoted to manufacture a third slot.

## Launchpad financial acquisition

Every row below uses dated `dailyFees` and `dailyRevenue` responses from the [DefiLlama public API](https://github.com/DefiLlama/api-docs/blob/main/llms-free.txt). Revenue and all three percentage changes are included in `launchpads.json`. The table shows fee coverage for scanning. Provider methodology, raw totals, source hashes and exact requests are preserved.

| Application slug | Fees: last complete UTC day | Fees: 7 complete days | Fees: 30 complete days | History | Gaps / scope |
| --- | ---: | ---: | ---: | --- | --- |
| pump.fun | $1,724,583.00 | $11,350,419.00 | $45,278,232.00 | 30/30 | financial windows complete |
| stonkfun | $779,116.00 | $8,938,795.00 | $23,643,697.00 | 30/30 | financial windows complete |
| pons | $1,528,158.00 | $16,440,904.00 | $141,180,676.00 | 30/30 | d30: change; V2 only |
| flap-sh | $727,148.00 | $7,620,167.00 | $38,363,800.00 | 30/30 | financial windows complete |
| launchlab | $573,684.00 | $4,516,583.00 | $8,113,229.00 | 30/30 | financial windows complete |
| bonk.fun | $455,204.00 | $3,635,751.00 | $7,075,592.00 | 30/30 | financial windows complete |
| graphite-protocol | $179,157.00 | $1,441,444.00 | $2,810,726.00 | 30/30 | financial windows complete |
| genius.fun | $45,121.00 | $1,363,715.00 | — | 9/30 | d7: change; d30: fees, revenue, change |
| argus-world | $148,380.00 | $727,690.00 | — | 18/30 | d30: fees, revenue, change |
| meteora-dbc | $86,816.00 | $486,809.00 | $1,241,854.00 | 30/30 | financial windows complete |
| binance-alpha | $31,557.00 | $397,305.00 | $2,161,016.00 | 30/30 | financial windows complete |
| o1-launchpad | $27,492.00 | $296,546.00 | $5,513,937.00 | 30/30 | financial windows complete |
| clanker | $4,392.00 | $136,054.00 | $376,411.00 | 30/30 | financial windows complete |
| stonkbrokers | $1,960.00 | $87,433.00 | — | 11/30 | d7: change; d30: fees, revenue, change; Nightshades only |
| bags | $16,718.00 | $70,251.00 | $327,422.00 | 30/30 | financial windows complete |
| rapid-launch | $6,899.00 | $43,897.00 | — | 29/30 | d7: change; d30: fees, revenue, change |
| basestonk | $3,646.00 | $39,806.00 | $405,603.00 | 30/30 | d30: change |
| four.meme | $5,844.00 | $37,573.00 | $224,020.00 | 30/30 | financial windows complete |
| foci | $5,010.00 | $35,111.40 | — | 11/30 | d7: change; d30: fees, revenue, change |

Changes compare full current and previous windows: `100*(current-previous)/previous`. Missing dates and zero previous totals yield null. For example, pump.fun's 7-day fee change is **+2.8794%**, not the fixture's +3.51% daily-vs-seven-days-ago comparison. StonkFun's full-week change is **+47.8466%**, not the fixture's −32.25% daily comparison. Source summary fields occasionally include an in-progress day; they are retained for reconciliation and not used to override the complete-day sums.

### Definitions and overlap that prevent a hero sum

- **pump.fun:** adapter fees include curve trades, graduation and Mayhem flows. Creator/cashback earnings are supply-side revenue. PumpSwap is a separately linked product, so these row financials do not mean all lifetime trading of pump-origin tokens. The current [fee page](https://pump.fun/docs/fees) documents 125 bps for SOL/USDC curve trades, including 30 bps of trade value for creator fees: **2,400 bps of the total fee**, in that configuration. Creation is 0 SOL/USDC. Post-graduation tiers and cashback/mobile variants prevent a universal creator-share constant. The USD market-cap graduation target is unknown.
- **LaunchLab, StonkFun, BONK.fun, Graphite:** LaunchLab includes protocol, frontend/platform and creator curve fees; StonkFun's adapter includes its curve platform fees, graduated CPMM creator fees and locked-LP fees. These flows overlap. Graphite's official bio identifies infrastructure powering BONK.fun/LiveBONK. Their events and fees cannot be blindly added.
- **Meteora DBC / Bags:** Bags has DBC pre-migration and DAMM post-migration fee flows on Solana, plus separate Robinhood versions. DBC is an engine. The two rows do not define disjoint activity.
- **Pons:** the preserved application row uses **V2 financials only**, matching the baseline's 7d/30d figures. V1 is retained separately. [V1 docs](https://docs.ponsfamily.com) say immediate Uniswap V3 pools, no curve, and no migration; its 4.2 ETH liquidity milestone is not curve completion. [V2 docs](https://docs.ponsfamily.com/docs/v2) describe curve sellout followed by a Uniswap V4 pool. Neither threshold should be forced into an unsupported USD market-cap constant.
- **StonkBrokers:** the baseline's faction-token description and 7d financial value match **Nightshades**, one product of a broader platform. The row is explicitly scoped to Nightshades. Safe Launch has separate retained observations. Other products include NFT/loan, locker, LP-management and game fees; these are not all token launches.
- **Flap, BaseStonk, Foci:** tax, treasury, holder and creator flows differ. Foci recognizes fees on keeper settlement, not trade time. BaseStonk and Foci revenue can include holder-directed value; the UI's “share the venue keeps” needs qualification.
- **Binance Alpha:** broader discovery/trading activity is not a distinct creation-event population. **Rapid Launch** is a toolkit; collector fees do not establish venue-origin creations. Detailed adapter methodology for every row is in `entity-mapping.json` and `provider-financials.json`.

Official homepages were attempted for all 19 slugs. Eight returned meaningful identity metadata; the Binance Alpha response was empty. Ten other sites failed fetches. Declared icon URLs are stored separately and binary availability was not tested. Existing hex colors are retained only as editorial presentation choices. Full supported-chain lists are not proven by fee adapter coverage. Clanker's homepage explicitly adds BNB Chain relative to the fixture; its financial adapter coverage is recorded separately.

## What can be integrated now

- Source-backed identity/description subsets, adapter methodology and explicitly scoped calendar-day financial metrics.
- Four resolved coin identities and two charts of 24 real hourly sample buckets, plus 168-hour extensions. `series.id` remains `volume`, and its sum equals the corresponding sample `volume24hUsd`.
- Thirty-date launchpad grids, with real fee points and null gaps. Fourteen are complete.

**Requires minimal integration changes:** nullable numbers and unknown states; per-metric dates and scope labels; whitespace chart points; explicit nullable `hasBondingCurve`; versioned fee configurations; token addresses and evidence URLs; accurate share labels; timestamp-based history joins; overlap-aware aggregates; genuine current time for relative labels; external-logo ingestion; and internal launch routing. No current `Launchpad[]`/`Narrative[]` compatibility is claimed. Detailed field-by-field statuses are in `contract-and-coverage.json`.

## Frames routes and charges

Free calls successfully returned usage, catalog descriptors and unpaid live probes. `mpp.codex.post.graphql` returned a query-wrapper schema and live HTTP 400 probe; `bazaar.defillama-use-x402atlas-com-fee-summary` and `...-fees` returned fee-query parameter schemas and live 402 quotes. `agentic.emc2ai-io..x402-bitquery-pumpfun-launches-raw` returned bounded `limit`/`timeperiod` arguments. Firecrawl, Twitter search/summary and the cursor-based launch candidate were also probed; none were invoked. Probe history referring to earlier project calls is not this run's evidence.

**Actual Frames charge: 0 credits. `percent_remaining`: 84.** No paid run IDs or billing blocks exist for this run. Balance remained 76,008 credits at the two usage checks. The existing open reserve is not attributed to this investigation. Quotes, including 0.005 USD for the fee-summary provider and 0.000385 USD for the bounded Pump launch provider, are quotes only.

The tested data routes were outside Frames: DefiLlama `/summary/fees/{slug}` with `dailyFees`/`dailyRevenue`, GeckoTerminal token-pool discovery and pool hourly/minute OHLCV, plus public website extraction. DEX Screener returned 403. Codex `getLaunchpads` documentation URL and the guessed Meteora documentation route returned 404; no schema or claims were inferred from those failures. The Meteora URL was not used as evidence.

## Smallest repeatable path and remaining work

1. Reuse saved provider IDs, four token contracts and four pool IDs. Refresh the four pool histories hourly with two hours of overlap; recompute the same declared sample. Revalidate metadata daily. Preserve revisions and old membership versions.
2. Refresh 19 fee adapters × two data types daily (38 public GETs). Use the last complete day, retain 60 days, and merge by timestamp. Refresh Pons V1/Safe Launch separately if desired. No tested source-side date filter exists for these fee calls.
3. Refresh discovery every 30 minutes, social evidence every 30–60 minutes, and configurations/branding weekly. These are proposals only; no recurring task was created.
4. Once the approved overall Frames ceiling is supplied, run the exact bounded seed batch in `acquisition-recipes.json`, poll terminal status, inspect every body reference, and record actual credits by unique run ID. Then expand token/pool coverage and launch indexing. Do not repeat broad catalog discovery unnecessarily.
5. For complete launch/graduation metrics, index documented creation and curve-completion events, verify finality and window exhaustion, and deduplicate transaction/instruction/log identities. A newest-token feed, first pool or discovery timestamp cannot fill these fields.

Remaining work is substantive: paid Frames delivery validation, new-launch sampling across venues, complete token/pool membership, event counts, timestamped social signals, 30 daily narrative buckets and other requested attention/breadth histories, most fee variants, and exhaustive supported-chain/branding verification. Nulls preserve these limits.

## Artifacts and replay

Core files: `launchpads.json`, `narratives.json`, `tokens.json`, `memberships.json`, `evidence.json`, `field-provenance.json`, `entity-mapping.json`, `narrative-series.json`, `chart-data.csv`, `contract-and-coverage.json`, `acquisition-recipes.json`, `refresh-manifest.json`, `validation-report.json`. Supplemental files retain raw provider financials, candidate narratives and selected pools.

Run `python3 build_dataset.py`, `python3 package_research.py`, and `python3 validate.py` from this directory to reproduce normalization and checks **without live spending or network access**. `collect_public.py` defaults to a dry run; `--live` explicitly enables bounded unauthenticated GETs. Render with `uv run --with matplotlib plot_preview.py` (may download plotting dependencies). `chart-preview.png` and `.svg` contain actual measured data and were visually inspected.
