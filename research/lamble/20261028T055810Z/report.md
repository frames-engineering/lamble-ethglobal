# Daily refresh 2026-10-28 (run 20261028T055810Z)

Run time 2026-10-28 05:58:10 UTC. Financial anchor (exclusive end) **2026-10-27**: it did not advance from yesterday because pump.fun, StonkFun and Meteora DBC still end on 2026-10-26 in DefiLlama, so `normalize.py` was run with `--financial-anchor 2026-10-27`. Chart anchor 2026-10-28 04:00 UTC; daily bars through 2026-10-28 00:00 UTC (30 days, 180 days reconciled with hourly sums, max relative gap 5.9e-10 against 0.02). Because the anchor equals yesterday's, `--prior research/lamble/20261026T055802Z` (earlier anchor) and `--prior-narrative research/lamble/20261027T055746Z` were used. Release published: rel-20261028T055810Z-36a9564b. The 2026-W43 edition stays frozen (revision 1) and 2026-W42 is unchanged. Articles: daily-2026-10-28 written; coin-si-solana-9aqmjj-2026-w44 and narrative-launchpad-coins-2026-w44 re-pinned; state-of-the-trenches-2026-w43 unchanged.

## New narratives

**None created.** No story met all three bars of `narrativeRules.newNarrative` (three coins whose metadata names the story, $500K combined 24h volume, one independent public source). The strongest leads:

- **Backed by nothing but belief (k-belief), deferred.** Believe in Something (Something, Pump.fun, AZdhik...; metadata "They said pump coins are backed by nothing but belief. We turned that into Something.", $3.9M volume, $1.6M market cap) and two coins named Backed By Belief (Nothing, Pump.fun: 51SfaA... with $4.0M volume and $990K market cap, FpSSpq... with $277K volume and a $62K market cap, under the $100K member bar). Combined $8.2M, but only two qualifying coins and no news or official source: the posts that carry the story (e3:0) come from promoters and a checker account, which says the remark was made at a House hearing, not in the Senate as the promoters say. Re-evaluate when a hearing record or news report and a third qualifying coin appear.
- **Anthropic IPO coins, deferred (below the volume bar).** Anthropic filed an S-1 on 2026-10-26 under the ticker ANT (e3:1, many posts). Yesterday's Claude-coin data gap has resolved, but the three coins trade only $273K together in a direct lookup (e4): ANT on Pump.fun $137K, ANT on StonkFun $127K, Claude on Robinhood Chain $8.7K (down 96%, $14 of liquidity). The Base "Anthropic" coin ($55.2M volume on a $500K market cap, 4.8 hours old) is quarantined for extreme turnover.
- **Oil and dividend fund family (k-fund), deferred, day 7.** USOE (vC36Mc...), UDTF (FLrXqB...) and USDF (3PGHr2...) are the unflagged coins ($2.1M combined), the rest of the family carries implausible market caps. The one search run for it today (e5:1) found only a post calling a fund-named coin "a memecoin wearing a fund name" and airdrop-claim spam: no independent source.
- Robotaxi Coin (Pump.fun, $2.9M volume, $513K market cap; fleet-tracker and checker posts, e3:2): one coin above the market-cap bar, deferred. Frongus ($10.4M across Pump.fun and StonkFun, e3:3): no story beyond promoters, deferred. GTA6DOG, GTA6ALLIGATOR and GTA6CAT (GTA VI-themed, $5.1M combined) name GTA VI hype, not Dacity Coin, so they were not added to the Dacity narrative; recorded for the owner.

## Cluster decisions (8, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-always | rejected | CHICO (GTA6DOG), STFD and PANDU share only the word always; a checker account (e2:0) calls CHICO's volume wash trading. |
| k-belief | deferred | See above: two qualifying coins, no news or official source. |
| k-anytime | rejected | INVERSE (a trading tool), PANDU and RAID share only the word. |
| k-tokenized | rejected | SODI, UDTF and RAETO share only the word; RAETO belongs to the AI inference narrative, SODI is recorded in candidates. |
| k-fund | deferred | Oil and dividend fund family without an independent source (above); ENVAR shares only the word. |
| k-agent | rejected | ENVAR, CL Ai Agent, Sotto Fi and Binance Agent share only the generic word agent. |
| k-paid | rejected | ENVAR, PEAK and ORBIO share only the word paid (ORBIO is in the inference narrative). |
| k-energy | rejected | STFD, MACCA and MOONX share only the word; STFD's metadata does not say it is stock-paired. |

Previously deferred leads re-evaluated: the Anthropic IPO lead (above, now below the volume bar rather than blocked by a data gap), the oil and dividend fund family (USDF/UDTF/USOE, above), Kimchi (CSocnz..., $505K, deferred, no Kimchi-on-Pump.fun source, narrative stays paused), Super Intelligent Beauty (no new evidence, stays deferred).

## Member and narrative changes

- **Resumed:** AI inference market coins (n-ai-inference-markets; ORBIO, ORBIX, RAETO), paused yesterday only for sequencing; their pools were restored to the registry and their record restored from run 20261026T055802Z (`resumedNarratives`). 24h chart-window volume $1.96M (+1.6%).
- **Added:** Super Iguana (SI, Pump.fun, 3yM6w9...) to Super Intelligence coins: metadata "Donald Trump Just post about SI on his social"; token created 2026-10-27 16:48 UTC, 30 minutes after the Truth Social post that e5:0 reports (see story changes); $3.2M volume and $285K market cap in the sweep, 13 hours old, no quarantine flag. Volume caveat now shown for it (it traded over 10x its market cap, 42% of the narrative's volume).
- **Archived (under $1,000 on two consecutive observations):** DACITY (Dacity Coin, Pons, Robinhood Chain, 0x6d8933...; $195 yesterday, again under $1,000 today).
- No coin removed for contradicting evidence; no narrative retired or paused. Six narratives are active (the cap). PHP2Shell, Kimchi and Perpetual-futures coins stay paused with memberships open.
- Registry: dailyEvidence unchanged (e1 stays at 10 calls). `latestRefreshRun` and the importer defaults point at this run.

## Data changes vs yesterday (run 20261027T055746Z)

- Covered fee subtotal (14 included venues): **$3,289,786**, identical to yesterday (same anchor, no revisions).
- Indexed launches 24h: **58,316** against 57,766 (+1.0%); completions 24h: **3,090** against 3,254 (-5.0%). 14 creation venues, 11 completion venues.
- Windowed sums over launchpads with data (overlapping venues are added, so not a de-duplicated market total). StonkFun's series ends on 2026-10-26 and is known this time (yesterday its windows were unknown), so 19 venues count against 18 yesterday; the increase comes from adding StonkFun, not from revised data:

| Window | Fees | Revenue | Creator earnings (16 venues; 15 yesterday) |
|---|---|---|---|
| 24h | $3.66M (yesterday $3.46M) | $1.89M ($1.79M) | $1.72M ($1.67M) |
| 7d | $24.08M ($22.86M) | $12.75M ($11.90M) | $11.14M ($10.97M) |
| 30d | $144.10M ($132.88M) | $73.45M ($63.70M) | $70.07M ($69.17M) |

pump.fun creator earnings $564,478, Flap $595,513, Pons $261,529, LaunchLab $103,451 (all unchanged from yesterday, same anchor). StonkFun 24h fees $200,577, revenue $95,899, creator earnings $56,001.

- Narratives (24h chart-window volume to 04:00 UTC, change on the preceding window, 30-day volume of current members):

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Coins paired with tokenized stocks | 5 | $26.62M | -22.0% | $531.73M |
| Launchpad and launch-tool coins | 4 | $12.93M | -2.7% | $143.29M |
| Super Intelligence coins | 12 | $7.26M | +337.3% | $420.49M |
| 2028 presidential-run coins | 3 | $6.34M | -40.5% | $16.97M |
| AI inference market coins (resumed) | 3 | $1.96M | +1.6% | $142.57M |
| GTA 6 Dacity Coin coins | 3 | $1.82M | -31.0% | $76.21M |

Volume caveats shown today: Super Intelligence coins (Super Iguana over 10x its market cap, 42% of the volume) and 2028 presidential-run coins (all three coins over 10x, 100% of the volume). The Super Intelligence change is mostly Super Iguana's launch-day trading.

## Story changes

- **Super Intelligence:** a fresh source. On 2026-10-27 16:18 UTC an account that republishes Truth Social posts quoted President Trump asking when the Wall Street Journal will start calling AI "SI (Super Intelligence)" and saying the administration will soon ban the term "AI/Artificial Intelligence" in relevant documents (e5:0); crypto news accounts repeated it. First fresh Trump post on the rename since 2026-09-29. Wording is not verified against the original post.
- **AI inference markets:** Bankless published an overview of the top three inference markets (Orbio, Surplus Intelligence, Antseed) on 2026-10-27; Beeper says it buys inference from Orbio CREDIT's order book (e1:6). Claims are the projects' own.
- **Stock-paired:** xstok listed $CATE (2026-10-25); accounts say StonkFun switched on points that earn xStonk (2026-10-27) (e1:4).
- **Launchpad coins:** the same "$LAUNCH allocation is now live" message from several accounts again today (e1:7); looks like a copied template.
- **2028 presidential-run:** the committee story is a day old and repeated widely; one post says it filed with the FEC (e1:8). No coin is shown to be linked to it.
- **GTA 6 Dacity Coin:** no newer source than 2026-10-24/25 posts; DACITY archived.

## Failures, refunds, billing

- Calls: 710 requested, 549 delivered; 161 undelivered and billed $0: 156 of 614 Pump/FOMO panel calls (95 seller errors for unsupported FOMO tokens, 51 empty holder lists or candles, 9 caller errors, 1 other), e2 calls 0, 4, 6 and e3 call 4 (X searches refunded as negative result or seller error), and c1 call 1.
- c1 call 1 (the Solana hourly bars for 23 series) was refunded by the Frames cross-check, which said only the first series was present; the saved body contains all 23 series (167-168 hourly buckets each). It was used as is, with no retry (yesterday's avoidable retry was not repeated). Its null buckets are pre-creation hours handled by the pre-creation rule.
- A first test call with a tiny `max_usd` was refused for budget (billed $0). p1 (a transient `D1_ERROR` before the run started), c2 and p22 (client-side timeouts) each needed one repeat under the same idempotency key; Frames returns the same run for a repeated key, so nothing was paid twice. The calls to `frames_get_run` timed out several times and were repeated.
- One redaction: the scraped docs page of useorbix.app (e1:1) contains an example `curl` header line that uses a variable name, not a key; `normalize.py`'s credential-pattern assertion rejected it (as it did yesterday), the assertion was left unchanged, and that text in raw/e1.json was replaced with the same redaction note as before.
- No price-change failures. OHLC fields were accepted in c1 and c2.
- **Billed credits: 3,768** over unique Frames runs (d1/d2 32, e1 98, e2 43, e3 43, e4 7, e5 22, f1-f6 616, c1/c2 50, p1-p62 2,857). Account balance 32,625 before, 28,881 after (per the validation report). The monthly-allowance balance remains far above the 10,000 floor.
- **Pump/FOMO panels**: `plan.py panels` planned 614 calls in 62 batches (`plannedCredits` 3,776 of the 3,800 ceiling; `reservedByOtherBatchesCredits` 1,200), covering 140 coins (30 constituents plus 110 other tracked coins; 47 skipped by the planner for the ceiling). All 62 batches were called; none skipped for the 10,000 budget. Panels billed 2,857 credits.

## Anchors and checks

Financial 2026-10-27 (pump.fun, StonkFun, Meteora DBC end on 2026-10-26); chart 2026-10-28 04:00 UTC; 30 pools; 1,193 pre-creation zero buckets; daily bars reconcile with hourly sums. Checks (`npx tsc --noEmit`, `npm run lint`, `node --experimental-strip-types --test tests/frames-data.test.mjs` 12 of 12, `npm run build`, `git diff --check`, credential scan) are in the pull request.

## For the owner

- **Belief/Nothing lead ($8.2M):** two qualifying coins and only promoter and checker sources; will qualify if a third coin and a news or official record appear. The posts disagree on whether the remark was made in the Senate or at a House hearing.
- **Oil and dividend fund family** is in its seventh day with no independent source; consider whether to stop spending story checks on it.
- Fee windows: the 30-day total rose $11M mostly because StonkFun's series is known again (a lagging series flips the window sums each time it falls behind), not from revisions.
- The refunded c1 call 1 (a Frames cross-check judging a complete body incomplete) is a repeat pattern from yesterday (c1 call 2); the normalizer copes, but the refund flag hides a delivered body.
- Many `frames_get_run` and one `frames_invoke_tools` calls timed out on the client side while the batches themselves were fine; idempotency keys made retries free.
