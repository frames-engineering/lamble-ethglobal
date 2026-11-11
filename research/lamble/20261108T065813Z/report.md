# Daily refresh 2026-11-08 (run 20261108T065813Z)

Prior run: 20261107T065735Z. Financial anchor 2026-11-08 (last complete UTC day 2026-11-07); chart anchor 2026-11-08T05:00Z.

## New narratives
**Be Like José coins** (`n-be-like-jose`) created. Three coins named Be Like José: Pump.fun 87CQto... (José), LaunchLab 5NRzuq... (Jose) and Flap 0xc022fd... (José, BNB Chain), $9.02M combined 24h volume at discovery. Names are the story (all descriptions empty). Independent source: Elon Musk's X post "I want to be José" of 2026-11-07 18:38 UTC (e3:0, 16K likes), plus a 2026-11-08 post quoting him on the Jose meme (one man digging a hole, eight watching). Yesterday's two-coin deferral is resolved by the third coin and the source. Dates from Codex: the three pools opened on 2026-11-06 between 22:15 and 23:17 UTC, about 19-20 hours before the post, so the coins did not launch on it. A 322x/$2.6M claim in caller posts is not verified here. At the six-narrative cap, **Democrats win Congress coins** was paused (24h volume $0.09M across four coins in the sweep vs $0.31M the day before; José coins $9.0M); its four memberships stay open and its defining source is not gone.

## Cluster and lead decisions
- k-sym-MARS: rejected. Three MarsCoin/MARS coins sharing a ticker ($3.85M), opened within the hour; posts (e2:0) are promotions, a Bruno Mars pitch, a NASA-imagery claim and a note that the Pump.fun coin copies an older Marscoin. No single story, no independent source.
- k-sym-TAOLF: rejected. Three LaunchLab TAOLF coins ($3.44M), a play on FLOAT; e2:1 has caller/trader posts only.
- Deferred leads: COGE (one coin now meets the bar; story current, e3:3 NYC ballot proposals passed 2026-11-03/04); AODF and UODF (oil and dividend fund family, e3:2 found no independent source and most of the family carries implausible market-cap flags).
- José/Jose from yesterday: now created as a narrative (above). 41 candidates recorded in curation.json.

## Member changes
- Added to Anthropic IPO coins: Clanker V4 on Robinhood Chain 0xff20a7... (name-only; pool opened 2026-11-07 10:49 UTC; $24.1M 24h volume, $2.0M market cap).
- Archived (under $1,000 24h volume on two observations): Anthropic Robinhood 0xf289e2..., Base 0x191d77..., Robinhood 0x11188a... (Anthropic IPO coins) and テスラSI (bsc 0x5958c1..., Super Intelligence coins).
- Paused narrative: Democrats win Congress coins (above). No retirements or removals.

## Narrative volumes (USD)
| narrative | 24h | prior 24h | 30d |
|---|---|---|---|
| Anthropic IPO coins | $24,962,510 | $97,730,024 | $133,971,124 |
| Coins paired with tokenized stocks | $19,064,861 | $12,713,936 | $477,939,956 |
| Be Like José coins | $10,674,615 | new | $12,946,053 |
| Zcash launchpad coins | $2,215,596 | $1,125,071 | $48,691,913 |
| Super Intelligence coins | $1,249,287 | $967,721 | $95,210,248 |
| GTA 6 launch coins | $495,052 | $2,102,978 | $7,030,798 |

Volume caveats shown: Anthropic IPO coins (two coins, Robinhood Chain 0xff20a7... and Pump.fun wMHBD2..., traded over 10x market cap, 98% of the volume) and Be Like José coins (40% from the LaunchLab coin).

## Data changes vs yesterday
- Covered fee subtotal $2,084,508.93 (was $2,321,249.37); creator earnings (DefiLlama supply-side, included venues) $1,103,641.64 (was $1,152,754.62); 30-day creator earnings $46,322,657 (was $47,246,201); 30-day covered fees $91,840,752 (was $93,733,947).
- Indexed launches (24h) 46,023 (was 52,804); completions 2,642 (was 2,531).
- Provider revisions in the hourly overlap: 15 observations revised in the release ingest.

## Failures and refunds
- Calls requested 704, delivered 538; the rest refunded or empty (seller_error 97, negative_result 58, delivered_empty 39, caller_error 6), mostly in the Pump/FOMO panels. c1 had two delivered_with_caveats bodies (used).
- d1 call 0 returned only solana_active (solana_recent missing; refunded, used as observation by discover.py).
- Two FOMO holders bodies (p4 seq 9, p21 seq 9) arrived as body_ref and were retrieved free with frames_get_tool_results (recorded as bodyRetrievedFrom).
- Panels p19-p62 were called by four helper agents; save.py does not search subagent transcripts, so bodies were saved with a scratchpad script.

## Billing
3,690 credits across 75 unique Frames runs per the run's billing record (discovery/collect 1,060 incl. follow-ups; panels 62 batches, 3,782 planned). Account balance moved 99,336 -> 95,696 (3,640). Panels: 62 batches called, none skipped.
