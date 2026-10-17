# Daily refresh 2026-10-17 (run 20261017T055714Z)

Runtime 2026-10-17 05:57 UTC. Financial anchor (exclusive end) 2026-10-17T00:00Z, so the settled day is 2026-10-16; chart anchor 2026-10-17T04:00Z; 30 complete daily bars end 2026-10-17T00:00Z. Financial baseline: 20261016T092026Z (anchor 2026-10-14); narrative baseline: 20261016T092026Z. The financial anchor is back on the clock: the flap-sh lag of the last two days is gone and every covered venue except StonkFun reaches 2026-10-16.

## New narratives (2 created, 2 retired at the six-narrative cap)

**Created: Perpetual-futures coins (`n-perpetual-futures`)**, five coins, 24h token volume $66.0M at discovery (hourly all-pool sum $68.4M).

- Members: Paper (Papertrade tagline, Clanker, Base, $51.3M), Paper (same metadata, Clanker, Robinhood Chain, $10.7M), EmpireX EMPIREX (Pons, Robinhood Chain, $0.84M), Purps PURPS (Meteora DBC, "Launch perp backed tokens", $0.39M) and Aloooong (pump.fun, "First 10x PUMP long perpetual meme", $2.78M). All above the $50K / $100K member bars, no quarantine flag.
- Independent sources: Papertrade's own page (papertrade.xyz, e3:0: "Synthetic perpetuals on Hyperliquid", up to 1000x leverage) and its account's posts (e3:1: launch timing 14:00 UTC on 2026-10-10); @HyperEmpireX's 2026-10-16 launch post (e2:4); 2026-10-17 posts calling perp-backed memes the next meta (e3:2).
- **Cautions, written into the copy:** the two Paper pools were created about 20 and 4 hours before discovery and no source seen names these contracts, while posts about the PAPER token describe minting and staking it on Hyperliquid (e2:0), so affiliation with Papertrade is not verified; the Paper coins are 92% of the narrative's volume; the Base Paper (10.5x) and Aloooong (13.5x) traded over 10x their market cap, so the page shows a volume caveat (81% of the volume). Aloooong is a meme, not a venue. One venue's name dominates, so this is partly the "copies of one meme" question again (flagged below).
- Replaces **Programmable rules** (`n-programmable-rules`) at the cap: lowest 24h token volume of the six at discovery ($0.80M, down from $1.86M).

**Created: Coins paired with tokenized stocks (`n-stock-paired-coins`)**, four coins, 24h token volume $3.98M at discovery (hourly all-pool sum $7.47M).

- Members: STONK (StonkFun, "Backed by stocks", $2.16M), OTC (pump.fun, "earn stocks, pre-ipo, and yield", $1.10M), XSTOK (LaunchLab, "tokens paired with stocks", $0.40M, pool 14 hours old) and GTA6 (StonkFun, "Earn $TTWO Stock", $0.31M).
- Independent sources: @xstokfun's 2026-10-16 launch posts (e3:3), @LaunchOnSF's $MUSK4 pairing post (e3:4), @otc_labs revenue posts (e2:3), and a 2026-10-15 trader post counting 360K+ wallets and $31M of tokenized-stock rewards from Solana memecoins (e3:4). All figures are the projects' own.
- Resolves the lead deferred on 2026-10-15 and 2026-10-16 (STONK and OTC plus BUBBLE): xstok opened on 2026-10-16 and is the third coin, GTA6 the fourth. BUBBLE ("the Official coin for all ai stocks") stays out.
- Replaces **AI credits for holders** (`n-credits-for-holders`): second-lowest 24h token volume ($1.10M, down from $3.27M).

Both retirements are cap replacements by the 24h rule, not retirements for inactivity: each is above the $100K line and its defining source is still active (@Hoookedpad 2026-10-14; the 2026-10-16 @MCGlive podcast with the Orbio developer, e1:7). Memberships are closed, not deleted. **Flagged for the owner.**

## Cluster decisions (all 14)

| Cluster | Decision | Reason |
|---|---|---|
| k-perpetual | created (`n-perpetual-futures`) | See above. |
| k-onchain | rejected | The word over Paper x2 (in the new narrative), MUT8 (brand coin) and MADE (founder-persona AI coin). |
| k-exchange | rejected | Paper x2 (in the new narrative) and AVA (Holoworld utility token). |
| k-fully | rejected | Paper x2 (in the new narrative) and MAKERS (3-hour-old market-making launchpad). |
| k-elon | rejected | ELON (StonkFun), ELON (Meteora DBC), GORK: the name only; empty metadata, results are listing promotion (e2:1), pools 1 and 12 hours old. |
| k-stocks | created (`n-stock-paired-coins`) | See above. |
| k-earn | assigned (`n-stock-paired-coins`) | OTC and GTA6 joined; MADE, MNRA (GPU compute) and BORRO (stock-token lending) share only the word. |
| k-powered | rejected | EMPIREX is in the new narrative; MIDWAY and AVA share only the word. |
| k-fees | assigned (`n-creator-fee-routing`) | WORLD ("Fees to @iammarcmalone via UsePaid", $1.19M) rejoined; MADE and MAKERS share only the word. |
| k-roadster | assigned (`n-flying-tesla-roadster`) | FTR "Farting Tesla Roadster" (pump.fun) and Flying Tesla Roadster (Flap) joined; StonkFun FTR predates the story, Flap "Roadster" has a $70K market cap. |
| k-robinhood | rejected | The chain name over EMPIREX (in the new narrative), INVR (market cap $78K), BORRO, TOOLS. |
| k-sym-PRIME | rejected | Three PRIME meme copies, the newest 0 hours old; X results (e2:7) are dev-live and wallet-tracker posts with no news or official source. |
| k-agents | rejected | AVA, GORK, ORBLIVION: different products. |
| k-layer | rejected | MIDWAY, WAFER, ORBLIVION: different products. |

Looked past the clusters: the trend query "memecoin meta" (e1:9) returned call-group and signal-seller posts; XTO / USOS / USDF / WOSE (oil-themed pump.fun coins) are quarantined (implausible market cap for a new pool, extreme 24h move); NODF and STREAM remain quarantined. `curation.json` records 185 candidates (rejected, deferred, quarantined), appended to `candidates.json`.

## Member changes

- Added: the nine coins of the two new narratives above (Paper x2, EMPIREX, PURPS, Aloooong; STONK, XSTOK, OTC, GTA6); FTR "Farting Tesla Roadster" (pump.fun) and Flying Tesla Roadster (Flap) to Flying Tesla Roadster coins; WORLD back into Creator fees routed to people (it had left earlier on low volume; 24h volume now $1.19M and its metadata still names UsePaid).
- Removed (under $1,000 of 24h pool volume on two consecutive observations, intervals closed): both Meteora DBC FTR contracts (`FpYJX9...`, `7PKE3K...`) from Flying Tesla Roadster coins; SPACEXSI and Ollie (pump.fun) from Super Intelligence coins.
- Retired: Programmable rules (5 coins) and AI credits for holders (4 coins), above.
- Watch: the Clanker 特斯拉能飞 on Robinhood Chain traded about $570 in the 24 hours to 04:00 UTC (it traded $10.4M in yesterday's sample, market cap $61.7K); it is under the line on one observation, so it stays until tomorrow.
- Narratives (6; 41 constituents, down from 42): Perpetual-futures coins (5), Flying Tesla Roadster coins (6), Coins paired with tokenized stocks (4), Super Intelligence coins (14), Creator fees routed to people (7), AI influencer characters (5).
- Tooling fix: `normalize.py` now sets the candidate status of members of a retired narrative to `removed` (they stayed `accepted`, which the existing test `discovery keeps rejected and quarantined candidates out of narratives` rejects). Assertions unchanged.

## Narrative volumes (hourly all-pool sums to 04:00 UTC)

| Narrative | Coins | 24h | prior-run 24h | 7-day | 30-day (complete days) |
|---|---|---|---|---|---|
| Perpetual-futures coins | 5 | $68,445,108 | new | $68,542,099 | $57,631,084 (only 2026-10-16 is a complete day for most coins) |
| Flying Tesla Roadster coins | 6 | $28,321,958 | $50,525,052 | $71,134,842 | $68,891,946 |
| Coins paired with tokenized stocks | 4 | $7,472,685 | new | $66,286,180 | $862,002,257 |
| Super Intelligence coins | 14 | $4,184,214 | $6,962,499 | $47,699,767 | $476,270,812 |
| Creator fees routed to people | 7 | $3,135,402 | $2,187,836 | $30,326,476 | $83,946,439 |
| AI influencer characters | 5 | $2,277,622 | $1,885,798 | $19,532,473 | $203,708,772 |

Prior-run 24h figures are yesterday's published window (09:20 UTC run, chart anchor 08:00) and today's ends 4 hours earlier at 04:00 UTC, and memberships changed in three narratives, so rows are not like-for-like. 30-day totals apply today's membership to past days: the stock-paired 30-day figure is dominated by STONK's September volume (30-day series of one long-lived coin), and the perpetual-futures figure is mostly the last day. Volume caveats shown on the page: Perpetual-futures coins (Papertrade and Aloooong over 10x market cap; 81% of the volume) and Flying Tesla Roadster coins (flying tesla roadster and Starman over 10x; 15%).

## Data changes vs yesterday

- Covered fee subtotal (14 venues, settled day 2026-10-16): $3,470,184.00, against $3,690,873.27 for 2026-10-13 in yesterday's report (the settled day moved forward three days, so this is a different day, not a revision). Same exclusions (StonkFun, BONK.fun, Graphite, Bags, Binance Alpha).
- Creator earnings (DefiLlama supply-side revenue, 15 venues that define it and report the day): $1,757,436 against $1,877,803 (16 venues; StonkFun's series ends 2026-10-15 so it is null today). 7-day $13,020,876.78 (prior $14,536,463.84). 30-day $98,404,444.99 across 15 venues with 30 complete days (prior $110,168,925 across 14). Not like-for-like (different settled day, StonkFun missing, one more venue with 30 complete days).
- Fees across the venues with a complete series (18, StonkFun excluded for the same reason): 24h $3,546,304; 7-day $25,933,212.44; 30-day $171,353,121.90 across 18 venues (prior 24h $3,920,181.27 over 19, 7-day $29,895,302.59, 30-day $207,504,439.33 over 17).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 58,406 created and 3,026 completed in 24h, against 65,306 and 2,961.
- Financial revisions against the 2026-10-13 baseline run: three flap-sh series (fees, revenue, supply-side) were revised for 2026-10-13 only (fees 914,364 to 901,884; revenue 226,801 to 213,216; supply-side 687,564 to 688,665). Not in the covered subtotal's 2026-10-16 day.
- Daily bars reconcile with hourly sums for 246 pool-days (maximum relative gap 2.6e-10). 2,214 pre-creation zero buckets are recorded.

## Story changes

- Perpetual-futures: new (above). Coins paired with tokenized stocks: new (above).
- Flying Tesla Roadster: no new news; traders' posts and scam warnings (e2:6), volume down 44% on yesterday's run, two Meteora contracts and the Clanker coin faded; story status updated.
- Super Intelligence: no newer official item than the 2026-10-04 White House SIF and SpaceXSI posts (13 days old, e1:6); newest $SI posts are 2026-10-11 and earlier (e1:2). Volume $4.18M against $6.96M. SPACEXSI and Ollie left.
- Creator fees routed to people: usepaid.app re-scraped (e1:0); @usemakepad says $MAKE is live (2026-10-16) and @usePalNow previews Pal with PayPal claims (e1:8); WORLD rejoined. Copy and story status updated.
- AI influencer characters: copy and signals unchanged. Newest items are @Higgspad's 2026-10-11 V3 post and 2026-10-14 Higgsfield posts (e1:5).
- Programmable rules and AI credits for holders: retired.

## Failures, refunds and billing

- Two calls were refunded as `seller_error` because the seller's cross-check flagged a future-dated trailing point: f3 seq 3 (genius.fun supply-side) and f4 seq 9 (StonkBrokers fees). Each was retried once as `f7` (22 credits) and delivered; no further retries. No call is in dispute now.
- StonkFun's DefiLlama series ends 2026-10-15 (one day behind the anchor), so its fees, revenue and supply-side are null for the settled day; it is excluded from the covered subtotal anyway.
- Story-check allowance: e1 used 2 page scrapes and 8 X searches (7 story searches plus the "memecoin meta" trend query), e2 the 10 cluster searches written by `discover.py stories`, and e3 one page scrape and 4 X searches (`raw/e3-request.json`) to find the independent sources for the two new narratives.
- Financial anchor is the natural one for the run (2026-10-17); no override used. No assertion weakened.
- Billed credits by batch: d1 25, d2 7, e1 101, e2 97, e3 51 (discovery and evidence 281); f1 108, f2 108, f3 97, f4 97, f5 108, f6 76, f7 22 (fees 616); c1 44, c2 25 (bars 69). Total **966** over 14 unique run ids against the 2,500 cap; balance after the run 58,712 credits (65% of the monthly grant remaining).

## Flags for the owner

1. **Copies of one meme and the new-narrative rule (still unanswered).** The two Paper coins are 92% of the Perpetual-futures narrative's volume and look like copies of one project's tagline whose affiliation with Papertrade is unverified; the narrative also meets the rule without them (EMPIREX, PURPS and Aloooong, $4.0M combined at discovery), so I kept it with the cautions in the copy. If copies of one meme should not count, the rule needs a line saying so.
2. **Two live narratives were replaced in one run.** Programmable rules and AI credits for holders were retired by the 24h cap-replacement rule. Both have far larger 30-day volume ($123.8M and $188.1M in yesterday's report) than their 24h volume suggests; the rule might look at 30-day volume.
3. **Strongest deferred / watched leads:** none deferred. Watch: the Clanker 特斯拉能飞 coin (about $570 24h volume), the ELON copies (promotion only) and BUBBLE (AI-stocks meme).
4. **StonkFun lag:** DefiLlama publishes StonkFun fees one day late today; its metrics are null for the settled day.
5. **Young pools:** four of the five Perpetual-futures pools and XSTOK are under two days old; expect the 24h figures to fall.
