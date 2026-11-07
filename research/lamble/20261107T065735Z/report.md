# Daily refresh 2026-11-07 (run 20261107T065735Z)

Prior run: 20261106T065801Z. Financial anchor 2026-11-07 (last complete UTC day 2026-11-06); chart anchor 2026-11-07T05:00Z.

## New narratives
None. The only theme cluster, **k-anthropic**, was *assigned* to Anthropic IPO coins. Strongest leads that did not qualify: COGE (NYC Commission on Government Efficiency; two coins, news coverage in e3:2, below the three-coin minimum) and Be Like José (two coins, Pump.fun $1.94M + LaunchLab $0.47M volume; e3:0 returned only caller posts and no independent source).

## Cluster and lead decisions
- k-anthropic: assigned to n-anthropic-ipo. Three name-only coins named Anthropic opened 2026-11-06 (Clanker V4 on Base 0xf6d41c..., $54.0M 24h volume; Clanker V4 on Robinhood Chain 0xd50933..., $42.6M; ANTS ejrz94... on Pump.fun, $0.6M); story current (e2:0).
- COGE: deferred (re-evaluated from yesterday). Be Like José (2 coins): deferred. scamsem: rejected (caller posts only, e3:1). ROCCO (police K9): rejected, not the GTA 6 dog. RELAY (OTC desk): rejected, not the OTC coin. 51 candidates recorded in curation.json.

## Member changes
- Added (3) to Anthropic IPO coins, as above.
- Archived: ENERGY (Wr8xaw...) from Coins paired with tokenized stocks, under $1,000 24h volume on two observations ($950 today, $873 yesterday).
- Not archived (one observation only): yesterday's Anthropic Clanker coins 0x191d77... and 0x11188a... fell to under $400; DEM and Democat also dropped under $1,000 for the first time.
- No pauses, retirements or removals.

## Narrative volumes (USD)
| narrative | 24h | prior 24h | 30d |
|---|---|---|---|
| Anthropic IPO coins | $97,730,024 | $78,518,002 | $209,498,533 |
| Coins paired with tokenized stocks | $12,713,936 | $15,733,674 | $484,669,795 |
| GTA 6 launch coins | $2,102,978 | $2,896,290 | $6,471,653 |
| Zcash launchpad coins | $1,125,071 | $1,718,186 | $50,207,842 |
| Super Intelligence coins | $967,721 | $1,556,356 | $107,037,790 |
| Democrats win Congress coins | $312,830 | $2,350,575 | $7,426,488 |

Volume caveats shown: Mission Passed (GTA 6 launch coins) and Mr. Veto (Democrats win Congress coins) traded over 10x market cap.

## Data changes vs yesterday
- Covered fee subtotal $2,321,249.37 (was $2,275,478.01); creator earnings (DefiLlama supply-side, included venues) $1,152,754.62 (was $1,091,495.71).
- Indexed launches (24h) 52,804 (was 51,150); completions 2,531 (was 2,541).
- Provider revisions in the hourly overlap: 920 observations revised in the release ingest; Coins paired with tokenized stocks differs in 111 of 144 overlapping hours (membership change plus revisions).

## Failures and refunds
- Calls requested 704, delivered 521; the rest were refunded or empty (seller_error, negative_result, delivered_empty, caller_error), mostly in the Pump/FOMO panels. c1 call 2 (BSC bars) was refunded but its body held all five series and is used.
- p4 seq 9 (FOMO holders) arrived as body_ref; retrieved free with frames_get_tool_results and merged (recorded in the call as bodyRetrievedFrom).
- scripts/frames-refresh/save.py does not search subagent transcripts; p20-p22 were saved with a scratchpad copy that adds that glob. Worth adding to save.py.

## Billing
3566 credits across 75 unique Frames runs (discovery/collect 851, panels 2,715); balance after 99736.
