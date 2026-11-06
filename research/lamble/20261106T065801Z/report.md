# LAMBLE daily refresh, 2026-11-06 (run 20261106T065801Z)

## New narrative
**GTA 6 launch coins** (`n-gta6-launch-coins`, category culture). Three Pump.fun coins whose metadata names GTA 6: Rocco ("The Official GTA 6 Dog", pool opened 2026-11-05 15:05 UTC), EEAGLE/EEGL ("Actual GTA VI Character", pool opened 2026-10-29, so it predates the story's news hook) and Mission Passed/RETIRE ("GTA6 runner", pool opened 2026-11-06 02:29 UTC). Sweep volume was $2.96M combined; the chart-window 24h volume is $2.90M. Independent sources (e3:0, e3:1): Rockstar Games' own X post of 2026-11-05 (two weeks to launch, new screenshots, "See you in Leonida on November 19") and iGrandTheftAuto.com's post that the trailer dog is named Rocco. The coins are not shown to be connected to Rockstar or Take-Two. It was found by reading the sweep, not by a word cluster. At the six-narrative cap the Anakin Skywalker coins were paused ($0.37M against $2.96M).

## Cluster decisions (13 clusters + 1 story lead)
- k-deployed, k-agent, k-data, k-across, k-robinhood, k-powered, k-subscriptions, k-agents, k-trades, k-layer, k-open, k-projects: **rejected**. Shared words or footers in unrelated metadata (j7tracker footer, AI-agent products, Robinhood Chain names, etc.); e2 searches returned caller shills, scam alerts and promotions, no news or official source. Reasons are in curation.json.
- k-intelligence: **assigned** to Super Intelligence coins. Apple Super Intelligence (AppleSI, Flap, BSC; $100K volume, $242K market cap) carries the Super Intelligence term like TeslaSI/SpaceXSI. The 苹果SI twin ($55K market cap) is below the $100K bar. XTX, HEY and SIC are separate AI products.
- story-gta6: **created** (above).
- Deferred leads re-evaluated: the oil and dividend fund family (day 16) stays quarantined (all but one coin carry implausible-cap/extreme-move flags; e3:3 returned posts on Trump's $5,000 "dividend" pledge, nothing naming the coins). GAVELDROP/Paper/Impeach from yesterday were not re-qualified. New lead COGE (NYC Mayor Mamdani's Commission on Government Efficiency, five ballot proposals passed per e3:2): two COGE coins, one at $98K market cap (below bar), so **deferred**.

## Member changes
- Added: Anthropic Clanker V4 on Base (0x191d77..., $52.8M volume, $10.2M market cap) and on Robinhood Chain (0x11188a..., $24.1M, $10.2M) to Anthropic IPO coins (name-only, as yesterday's coin; both show the same market cap and +920% 24h move, flagged in the narrative copy); AppleSI (0x6556a6...) to Super Intelligence coins; Rocco, EEGL, RETIRE to the new narrative.
- Archived (under $1,000 two observations running): TSI (Pump.fun, AcV6Cc...) and Anthropic on Robinhood Chain 0xcee339... .
- Paused: Anakin Skywalker headline coins (memberships open). Binance hack coins remain paused from yesterday.

## Narrative volumes (chart window, USD)
| narrative | 24h | 7d | 30d |
|---|---|---|---|
| Anthropic IPO coins | 78,518,002 | 105,353,151 | 111,836,128 |
| Coins paired with tokenized stocks | 15,733,674 | 120,225,197 | 495,832,738 |
| GTA 6 launch coins | 2,896,290 | 4,391,273 | 3,517,731 |
| Democrats win Congress coins | 2,350,575 | 7,259,608 | 7,167,843 |
| Zcash launchpad coins | 1,718,186 | 12,557,563 | 51,667,319 |
| Super Intelligence coins | 1,556,356 | 7,836,915 | 113,329,081 |

Volume caveat shown: Democrats win Congress coins (Democat and DEM turnover is above the 10x threshold; 63.4% of the narrative's volume is from those two coins).

## Data changes vs yesterday
- Financial anchor moved from 2026-11-04 to 2026-11-06 (last complete UTC day 2026-11-05). Chart anchor 2026-11-06 05:00 UTC.
- Covered fee subtotal (14 streams): $2,275,478.01 for 2026-11-05 (2026-11-04: $2,782,360.02; yesterday's run showed 2026-11-03: $2,582,060.15).
- Creator earnings (sum of venues with supply-side revenue): $1,145,407 on 2026-11-05 against $1,353,614 on the prior anchor day.
- Indexed launches 51,150 and completions 2,541 (yesterday 53,428 and 2,835), 14 creation venues and 11 completion venues.
- 33 pools in 6 narratives; 86 indexed launchpad rows.

## Story changes
- Anthropic IPO: posts of 2026-11-06 cite the WSJ on run rate above $80B, a smaller or delayed raise and doubts about a $1.5T valuation; one post says an IPO-cancelled report is unreliable. Reports in posts, not verified.
- Midterms: Democrats-win posts remain the story; no new source.

## Failures and refunds
- d1 `solana_recent` and one other discovery sweep call were refunded by Frames' cross-check ("omits solana_recent"); the delivered `solana_active` and EVM sweeps were used (refundedButUsed noted in discovery.json).
- FOMO panels: many token/holder/candle calls refunded as `negative_result`/`seller_error` (unsupported tokens, "future" candle timestamps); 114 seller_error, 62 negative_result, 7 caller_error outcomes across 711 calls (524 delivered). Refunded calls bill 0.
- Two oversized FOMO holders bodies (p4 seq 9, 219,201 chars; p22 seq 9, 249,861 chars) arrived as `body_ref` and were retrieved free with frames_get_tool_results, assembled from pages by script and inlined into raw/p4.json and raw/p22.json (UTF-16 length checked against the stored size).
- p18 to p20 results were small inline results; saved after re-polling in the main session.

## Billing
Batches d1, d2, e1 to e3, f1 to f6, c1, c2: 899 credits; 62 panel batches (p1 to p62; 616 planned calls, 3,788 planned credits, none skipped): 2,710 credits. Total billed 3,609 credits (normalizer ledger sum); the frames_get_usage balance fell from 106,979 to 103,411 (3,568). Budget 10,000; available after: 103,411 (monthly allowance 70,577 + purchased 32,834).
