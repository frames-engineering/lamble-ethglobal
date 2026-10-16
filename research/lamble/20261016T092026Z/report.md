# Daily refresh 2026-10-16 (run 20261016T092026Z)

Runtime 2026-10-16 09:20 UTC. Financial anchor (exclusive end) 2026-10-14T00:00Z, so the settled day is 2026-10-13; chart anchor 2026-10-16T08:00Z; 30 complete daily bars end 2026-10-16T00:00Z. Financial baseline: 20261013T055731Z (anchor 2026-10-13, an earlier anchor than yesterday's run, which had the same 2026-10-14 anchor as today); narrative baseline: 20261015T055742Z.

**Financial anchor is two days behind the clock again.** At 09:20 UTC the clock would settle 2026-10-15, but DefiLlama's flap-sh fees series ends on 2026-10-13 (every other covered venue reaches 2026-10-15 or later, pons-v2 now included). The normalizer refuses a subtotal with a missing component, so the run used `--financial-anchor 2026-10-14`, as yesterday. No re-fetch was bought: yesterday's re-fetch of the lagging venues returned the same end date and cost 65 credits. The settled day is therefore the same as yesterday's.

## New narratives

**Created: Flying Tesla Roadster coins (`n-flying-tesla-roadster`)**, six coins, 24h token volume $47.29M at discovery (hourly all-pool sum $50.53M). It replaces Tokenized stocks and RWA coins at the six-narrative cap (see Retired).

- Story: posts dated 2026-10-16 (@niccruzpatane, @cb_doge, @latestinspace, e3:1) describe Tesla's live unveiling of a next-generation Roadster with SpaceX cold-gas thrusters on the evening of 2026-10-15, with a claimed 0-60 mph in 0.81 seconds and deliveries in 2028. DEXTools (e3:0) quotes Tesla's "Real life, baby" video caption and Elon Musk's "Turns out the future does have flying cars". @AlJR86 wrote on 2026-10-14 that a Roadster with rocket thrusters would be revealed "TOMORROW" (e3:1). Trader posts about $FTR (@PumpfunEco, @StalkHQ, @moonshot, e2:0) are promotion, not an independent source for the story.
- Members (all above the member bars, no quarantine flag): Flying Tesla Roadster FTR (`DFMt2F...pump`, pump.fun, $24.5M, pool created 2026-10-15 02:08 UTC, before the unveiling), 特斯拉能飞 (Clanker, Robinhood Chain, $10.4M), FTR (`FpYJX9...`, Meteora DBC, $5.1M), 特斯拉能飞 (`0x610a...7777`, Flap, BNB Chain, $4.0M), FTR (`7PKE3K...`, Meteora DBC, $1.8M) and Starman STARMAN (pump.fun, $1.4M, "the driver of the flying Tesla Roadster"; the weakest link).
- Not added: the StonkFun FTR (pool created 2026-08-15, predates the story), RDSTR (market cap $47.6K, under the $100K bar), two pump.fun FTR contracts (extreme 24h move, quarantined).
- **This reverses yesterday's deferral of the same lead** (three copies of one meme, one-day hook). The rule as written is met, and today the coins span three chains and four launchpads at $47M, so I created it. The owner has not said whether copies of one meme should count; flagged below.
- Volume caveat shown on the page: Flying tesla roadster (Clanker) and Starman traded over 10x their market cap in 24h (24% of the narrative's volume); it may include wash or bot trading.

## Cluster decisions (all 6)

| Cluster | Decision | Reason |
|---|---|---|
| k-flying | created (`n-flying-tesla-roadster`) | See above. |
| k-through | rejected | The word "through" over FTR (placed in the new narrative), BURROW (a dark web launchpad) and BOOT (a GitHub agent launchpad). |
| k-stocks | deferred | STONK ("Backed by stocks", $6.5M), BUBBLE ("The Official coin for all ai stocks", $3.2M, 14 hours old) and OTC ("earn stocks, pre-ipo, and yield", $1.9M). STONK and OTC are the Solana stock-meme pair (a 2026-09-07 @cfm_sol post compares both as "tokenized stocks + Meme"; @otc_labs posted its own revenue on 2026-10-15, e2:3), but BUBBLE is an AI-stock meme, so only two coins share a mechanism; no cap room for a second new narrative. |
| k-created | rejected | GOAT (the 2024 truth_terminal meme), BOOT, MVP: unrelated; the story search (e2:2) returned GOAT11 call-group posts and prop-firm ads. |
| k-earn | rejected | OTC, GP (RuneScape Gold), HRX, VCAT, HEDGE: the word only. |
| k-robinhood | rejected | BURROW, IRIDIUS, SECTORAL share the word only; the stock-token coins (IRIDIUS, HEDGE) belonged with Tokenized stocks, which left today. |

Looked past the clusters: the Make launchpad (@usemakepad, 2026-10-15, e1:8) fits Creator fees routed to people but has no coin of its own in the data; the 2026-10-16 trend query "memecoin meta" (e1:9) returned call-group posts. STREAM's second contract (a copy of the quarantined STREAM, AI streamer) is deferred; the graded-card pair GRAIL and CATCH is under the three-coin bar.

`curation.json` records 188 candidates (rejected, deferred, quarantined, removed), appended to `candidates.json`.

## Member changes

- Added: the six Flying Tesla Roadster coins above (new narrative).
- Removed from `n-credits-for-holders` (now 4 coins): LLMPad (LLM), $56 of 24h token volume at discovery and $656 pool volume in the 2026-10-15 run, under the $1,000 line on two consecutive observations.
- Retired: **Tokenized stocks and RWA coins** (`n-tokenized-assets`, 11 coins), replaced at the cap. It had the lowest 24h token volume of the six at discovery (about $658K, down from about $1.61M; Programmable rules at about $1.04M and Credits for holders at about $1.09M were next) against $47.3M for the new one. It is above the $100K retirement line and its defining source is still active (@RobinhoodCrypto's 2026-10-15 buildathon post; @CEOAdam's 2026-10-15 objection to Robinhood's AMC stock token, e1:3), so this is a replacement by the 24h rule, not a retirement for inactivity. Memberships are closed, not deleted. **Flagged for the owner.**
- Narratives (6; 42 constituents, down from 48): Super Intelligence coins (16), Flying Tesla Roadster coins (6), Creator fees routed to people (6), Programmable rules (5), AI influencer characters (5), Credits for holders (4).

## Narrative volumes (hourly all-pool sums to 08:00 UTC)

| Narrative | Coins | 24h | prior-run 24h | 7-day | 30-day (complete days) |
|---|---|---|---|---|---|
| Flying Tesla Roadster coins | 6 | $50,525,052 | new | $52,423,955 | $6,196,258 (only 2026-10-15 is a complete day) |
| Super Intelligence coins | 16 | $6,962,499 | $7,749,952 | $51,368,405 | $475,407,750 |
| Credits for holders | 4 | $3,265,473 | $4,162,568 | $29,516,681 | $188,090,897 |
| Creator fees routed to people | 6 | $2,187,836 | $2,116,378 | $27,129,544 | $72,384,570 |
| AI influencer characters | 5 | $1,885,798 | $1,954,252 | $24,373,734 | $201,367,241 |
| Programmable rules | 5 | $1,864,766 | $3,498,915 | $18,603,721 | $123,793,914 |

Prior-run 24h figures are yesterday's published window (05:57 UTC) and the windows end three hours apart, and Credits for holders lost a coin, so rows are not like-for-like. The 24h window includes 2026-10-16 00:00-08:00 UTC while the 30-day series stops at the last complete day, which is why the new narrative's 24h figure exceeds its 30-day figure. 30-day totals apply today's membership to past days.

## Data changes vs yesterday

- Covered fee subtotal (14 venues, settled day 2026-10-13): $3,690,873.27, against $3,807,669.27 reported yesterday for the same settled day. The difference (-$116,796) is DefiLlama revising pons-v2's 2026-10-13 fees from 531,844 to 415,048; versus the settled day 2026-10-12 ($4,028,169.00 in the 2026-10-13 run) the subtotal is down 8.4%. Same exclusions (StonkFun, BONK.fun, Graphite, Bags, Binance Alpha).
- Creator earnings (DefiLlama supply-side revenue, 16 venues that define it, latest complete day in each series): $1,877,803 against $1,972,864. 7-day $14,536,464 (prior $14,631,525). 30-day $110,168,925 across 14 venues with 30 complete days (prior $109,575,011 across 13); one more venue now has 30 complete days, so the 30-day totals are not like-for-like.
- Fees across the 19 venues with a daily series: 24h $3,920,181 (prior $4,036,977); 7-day $29,895,303; 30-day $207,504,439 across 17 venues with 30 complete days (prior $206,810,762 across 16; not like-for-like).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 65,306 created and 2,961 completed in 24h, against 59,919 and 3,812.
- Financial revisions against the 2026-10-13 baseline run: StonkFun's fees, revenue and supply-side series were revised for 69, 69 and 38 older days; StonkFun is excluded from the covered subtotal. pons-v2's 2026-10-13 revision (above) is found only by comparing with yesterday's raw data and is not counted by the normalizer, which compares against the 2026-10-13 run.
- Daily bars reconcile with hourly sums for 252 pool-days (maximum relative gap 2.6e-10). 1,908 pre-creation zero buckets are recorded.

## Story changes

- Flying Tesla Roadster: new (above).
- Super Intelligence: no newer official item than the 2026-10-04 White House SIF and SpaceXSI posts (twelve days old); @BFGDAO (2026-10-15) says the task force will hold its first meeting on Thursday, naming no source, and nothing official was found. Volume is down 10% on the prior sample.
- Creator fees routed to people: usepaid.app re-scraped (e1:0); @usemakepad introduced Make on 2026-10-15, a Solana launchpad that sends creator fees to the X account a coin is launched for.
- Credits for holders: orbio.so re-scraped (e1:1); LLMPad leaves; the narrative text and story status were updated.
- Programmable rules and AI influencers: copy and signals unchanged. Newest items are @Hoookedpad's 2026-10-14 custom-hooks post and Higgsfield's 2026-10-14 "Episode 2".
- Tokenized stocks: retired.

## Failures, refunds and billing

- Refunded (`seller_error`, charged $0, bodies kept as observations): f2 seq 1 (flap-sh supply-side), f3 seq 8 (meteora-dbc revenue) and f6 seq 3 (four.meme supply-side). No re-run: the answer was already in hand and the rule is to never retry a failing call.
- **Process deviation, d1:** the first d1 batch was sent with three of its four calls and a different idempotency key, by mistake; the missing constituent-snapshot call was sent separately as `d1b`. `raw/d1.json` is the programmatic merge of `d1a.json` and `d1b.json` (saved by `save.py`, calls identical to `d1-request.json`). Cost 26 credits in total, no duplicate paid call. Anchors and every number come from the same four calls.
- `e3` (2 targeted X searches on the Roadster story, 22 credits) was added after the story batch; its request file is `raw/e3-request.json`.
- Financial anchor override (`--financial-anchor 2026-10-14`) as above; no assertion weakened.
- Billed credits by batch: d1 26 (d1a 19 + d1b 7), d2 7, e1 101, e2 54, e3 22 (discovery and evidence 210); f1 108, f2 97, f3 97, f4 108, f5 108, f6 65 (fees 583); c1 37, c2 19 (bars 56). Total 849 over 15 unique run ids against the 2,500 cap.

## Flags for the owner

1. **Copies of one meme and the new-narrative rule (decision needed).** Yesterday's report asked this and it was not answered, so I read `newNarrative` literally and created Flying Tesla Roadster at $47M. If copies of one meme should not count, the rule needs a line saying so and the narrative should go.
2. **A live narrative was replaced.** Tokenized stocks and RWA coins was retired as the weakest narrative by 24h volume although its story is current; it can return as a new narrative when it ranks higher. Consider whether the cap-replacement rule should look at 30-day volume (Creator fees is lowest on 30 days).
3. **Strongest deferred lead:** STONK and OTC (two stock-meme coins sharing a mechanism) with BUBBLE.
4. **Lagging venue:** flap-sh publishes DefiLlama's latest day two days late; the financial anchor is now two days behind the clock for the second run in a row.
5. **Young pools:** five of the six Flying Tesla Roadster pools are under 8 hours old and the volume caveat applies; expect the 24h figure to fall sharply within days.
