# Daily refresh 2026-11-09 (run 20261109T065907Z)

Prior run: 20261108T065813Z. Financial anchor 2026-11-09 (last complete UTC day 2026-11-08); chart anchor 2026-11-09T05:00Z.

## New narratives
**Nvidia CEO scandal coins** (`n-nvidia-ceo-scandal`) created. Four coins whose names carry the story: The Nvidia Spy (Pump.fun BdouwE..., symbol Alice, pool opened 2026-11-07 03:05 UTC), The Nvidia Spy (LaunchLab 792ros..., 2026-11-08 20:19 UTC, nine minutes after the Times post), Jensen Huang Coin (Pump.fun GgN3jf..., 2026-11-09 02:40 UTC) and Jensen Hung (Pump.fun 4xgqef..., 04:12 UTC); $3.87M 24h volume in the normalized run. Independent source: The New York Times post on X of 2026-11-08 20:10 UTC (e4:0) that Nvidia opened an investigation into CEO Jensen Huang after he acknowledged a relationship with a business executive U.S. intelligence determined to be a Chinese spy, plus an Axios post and other news posts. Allegations are as reported, not verified here; no connection between any coin and the people involved is shown. Volume caveat shown: Jensen Huang Coin and The Nvidia Spy traded over 10x market cap (62% of the volume). Created at the cap by pausing GTA 6 launch coins.

## Cluster and lead decisions
- k-sym-牛逼: **deferred**. Six coins named 牛逼, $24.7M combined 24h volume, independent source Elon Musk's X post "Chinese 𝕏 is 牛逼" of 2026-11-09 03:13 UTC (e2:0). It meets the newNarrative bar, but the five qualifying coins (Clanker V4 on Base 0x4f9399..., Meteora DBC LWfjNF..., 28esqU..., DmXHBL..., B8v6GM...) opened 05:01-06:41 UTC, after the 05:00 UTC chart anchor, so there are no bars to chart (normalize divided by zero when it was tried). Create it on the next run. The Flap coin 0x9665f0... (+14,472% in 24h) is quarantined; the four.meme Niubi coin predates the post by a year and was rejected.
- Nvidia NVIDIH (Pump.fun) and Pussycoin (LaunchLab) were rejected: metadata does not name the story (e3:0).
- Deferred leads from 2026-11-08: COGE, AODF and UODF were not re-found as new qualifying clusters; they stay deferred (oil/dividend fund family still carries implausible market-cap flags).
- 36 other candidates above the member bar were recorded as rejected in curation.json.

## Member changes
- Added to Anthropic IPO coins: Base Anthropic 0x0a3467... (name-only, Clanker V4; pool opened 2026-11-08 13:42 UTC; $22.3M 24h volume, $10.2M market cap). The Robinhood Chain "Claude" coin 0xb19cae... was rejected (name does not refer to the IPO; its market cap and volume mirror the Base coin to within $3).
- Archived (under $1,000 on two observations): Base Anthropic 0xf6d41c... and SpaceXSI (solana 2GYMvn..., Super Intelligence coins).
- Paused: GTA 6 launch coins (lowest 24h volume of the six, $0.21M) and Super Intelligence coins ($0.67M). The second pause is a data-handling consequence: bars had been planned for two new narratives and the 牛逼 deferral came after collection, so Super Intelligence pools have no bars today. Memberships stay open; resume Super Intelligence first.

## Narrative volumes (USD)
| narrative | 24h | prior 24h | 30d |
|---|---|---|---|
| Anthropic IPO coins | $22,789,593 | $24,962,510 | $102,736,521 |
| Coins paired with tokenized stocks | $21,063,051 | $19,064,861 | $486,428,266 |
| Nvidia CEO scandal coins | $3,871,533 | new | $5,491,894 |
| Be Like José coins | $1,554,598 | $10,674,615 | $15,006,867 |
| Zcash launchpad coins | $1,165,926 | $2,215,596 | $48,861,383 |

## Data changes vs yesterday
- Covered fee subtotal $2,013,229.74 (was $2,084,508.93); creator earnings (DefiLlama supply-side, included venues) $1,104,746.09 (was $1,103,641.64); 30-day creator earnings $44,937,225 (was $46,322,657); 30-day covered fees $89,422,995 (was $91,840,752).
- Indexed launches (24h) 42,190 (was 46,023); completions 2,472 (was 2,642).
- Release rel-20261109T065907Z-5f36dc74; weekly edition 2026-W45 written; 4 research articles written.

## Failures and refunds
- Calls requested 687, delivered 510 (delivered 411, delivered_with_caveats 54, delivered_empty 45 across all rows; seller_error 98, negative_result 67, caller_error 8), mostly in the Pump/FOMO panels (602 requested, 427 delivered). d1 call 0 was refunded for a missing solana_recent query and used as an observation by discover.py.
- Panels p1-p61 were called by five helper agents; save.py does not search subagent transcripts, so they saved with a recursive-glob copy of it (same logic). Every saved file's tool order was checked against its request.

## Billing
3,490 credits per the run's billing record (discovery, collect and follow-ups 830; panels 61 batches, 2,660). The panels planner reserved 3,702. Balance 95,534 -> 92,041 as recorded in validation-report.json.
