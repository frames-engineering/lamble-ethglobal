# Daily refresh 2026-10-29 (run 20261029T055729Z)

Run time 2026-10-29 05:57:29 UTC. Financial anchor (exclusive end) **2026-10-29**; it advanced two days from the prior run's 2026-10-27, so `normalize.py` ran with `--prior research/lamble/20261028T055810Z` (an earlier anchor) and no separate narrative baseline. Chart anchor 2026-10-29 04:00 UTC; 30 complete UTC days of daily bars; 31 pools; 944 pre-creation zero buckets. Release published: rel-20261029T055729Z-44fc7637. The 2026-W43 edition stays frozen (revision 1) and 2026-W42 is unchanged. Articles: daily-2026-10-29 written; coin-si-solana-9aqmjj-2026-w44 and narrative-launchpad-coins-2026-w44 re-pinned; state-of-the-trenches-2026-w43 unchanged.

## New narratives (2, the `maxNewPerRun` limit)

**Anthropic IPO coins (n-anthropic-ipo, 4 coins, category stonks).** Yesterday's deferred lead: it failed only the volume bar ($273K). Today it clears every bar.
- Anthropic (ANT, Pump.fun, 4Wdn6G...): "$ANT The Meme Stock for the Anthropic IPO". Lookup e3:0 about $52.6K volume, $114K market cap (just over the $50K and $100K member bars). Pool opened 2026-10-19.
- Anthropic (ANT, StonkFun, BTZK1B...): "The Anthropic Ant." About $72K volume, $329K market cap. Pool opened 2026-09-11, long before the filing.
- Anthropic (ANTS, Pump.fun, Vbj43i...): "As Anthropic eyes Wall Street, Ant Group dons a suit." About $666K volume, $567K market cap, created 2026-10-28 14:38 UTC.
- Anthropic (Anthropic, Clanker V4, Robinhood Chain, 0xead1a3...): no description, its name is the story. About $15.2M volume on a $10.2M market cap (turnover 1.5x), created 2026-10-28 09:38 UTC, 20 hours old, no quarantine flag. It carries 95% of the narrative's volume, which is launch-day trading.
- Independent source: Cointelegraph, The Kobeissi Letter and Wall Street Engine posts of 2026-10-26 report an S-1 filing seeking a Nasdaq listing under the ticker ANT, and a Bloomberg post of 2026-10-29 05:28 UTC covers investors' proxy trades for the IPO (e3:1). Not checked against the SEC record here.
- The Base "Anthropic" Clanker coin (0xd11b4b...) stays quarantined; the Claude coin (0x2e3516..., $141 of volume, $14 of liquidity) was rejected.
- The coins borrow the company's name or ticker; none is shown to be connected to Anthropic. The ANT pool on Pump.fun and the StonkFun ANT pool predate the filing.
- Pool addresses for the two ANT coins come from the e3:0 Codex lookup (token0/token1 match the mints; change24 matches yesterday's market caps).

**Zcash launchpad coins (n-zcash-launchpads, 3 coins, category infra), from cluster k-zcash.**
- SNARKS Launchpad (SNARKS, Meteora DBC): "Official Snarks Launchpad coin, every trade pays a 1% fee in ZEC and 60% of it goes to holders every 48 hours." About $1.18M volume, $132K market cap. Pool opened 2026-10-11.
- Sapling (SAPLING, Pump.fun): "the rootstock of SAPLING, the zcash launchpad on solana." About $344K volume, $2.8M market cap. It was in the Sapling narrative that was retired on 2026-10-03 at the cap; it joins as a new interval.
- Zcash Shielded Assets (Stamp, Pump.fun): no description, its name is the story; Moonshot's post of 2026-09-20 calls it verified there (e3:2). About $411K volume, $1.17M market cap.
- Independent source: BSC News (2026-10-29) says Zcash turned 10 on 2026-10-28; Snarks Pad posted "Happy birthday @Zcash $SNARKS"; sapling.cash posted on 2026-10-29 that its launches now run on Raydium LaunchLab (e2:1, e3:3). Fee, burn and payout claims are the projects' own and are not verified here.
- Combined 24h token volume in the sweep $1.93M; 24h chart-window volume $2.85M.

Both were created at the six-narrative cap by pausing the two weakest narratives (below).

## Cluster decisions (2, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-wallet | rejected | HERMIT (Pump.fun), SNARKS (Meteora DBC) and OWNERLESS (Pons) share only the word wallet. The HERMIT posts (e2:0) mostly concern the XRPL Hermit the Frog coin and paid-call spam. SNARKS joins the Zcash narrative on its own metadata. |
| k-zcash | created (n-zcash-launchpads) | SNARKS, SAPLING and Zcash Shielded Assets (above). |

Leads past the clusters: the Anthropic IPO coins (created, above). Re-evaluated and still deferred: the oil and dividend fund family (USOE, USDF, UDTF; day 8: the unflagged coins are USOE ($2.9M) and two USDF coins, the search e3:4 found only an airdrop-spam post, and most of the family's pools carry implausible market caps); Robotaxi, Nothing (belief lead: no new search today, still only promoter sources), Frongus, Kimchi, Super Intelligent Beauty: no new independent source. Zerocash (a LaunchLab coin launched on sapling.cash, 5 hours old, $85K market cap, metadata does not name Zcash) deferred. 93 candidates are recorded in curation.json (17 quarantined for implausible market caps or moves).

## Member and narrative changes

- **Paused at the cap (memberships stay open):** 2028 presidential-run coins (ELON2028 on LaunchLab and Pump.fun, TRUMP2028): $105K of rolling 24h token volume in the sweep against about $6.3M in yesterday's chart window; the committee story has no source newer than 2026-10-27 (e1:8). GTA 6 Dacity Coin coins (three Pump.fun coins): the newest source is a post of 2026-10-25 (e1:5), $988K in the sweep against $1.82M yesterday. AI inference markets ($652K in the sweep) stay in because its story has fresh 2026-10-27 posts; the choice between GTA 6 and AI inference as the second pause is a judgement call (see below).
- No coin removed or archived; no narrative retired. Super Intelligence (12), stock-paired (5), launchpad (4) and AI inference (3) are unchanged.
- Registry: poolUniverse now 31 pools (7 added, 6 removed); dailyEvidence swaps the GTA 6 and Elon 2028 searches for "Anthropic IPO S-1 $ANT coin" and "sapling.cash zcash launchpad Solana" (e1 stays at 10 calls: 3 pages and 6 X searches plus the trend query). `latestRefreshRun` and the importer defaults point at this run.

## Data changes vs yesterday (run 20261028T055810Z)

- Covered fee subtotal (14 included venues): **$3,163,194** against $3,289,786 (-3.8%); financial anchor advanced from 2026-10-27 to 2026-10-29. No revisions to the last seven days.
- Indexed launches 24h: **52,723** against 58,316 (-9.6%); completions 24h: **2,862** against 3,090 (-7.4%). 14 creation venues, 11 completion venues.
- Windowed sums over launchpads with data. StonkFun's DefiLlama series ends before 2026-10-29, so its windows are unknown today and 18 venues count against 19 yesterday (15 against 16 for creator earnings); the declines below are partly that, not only market moves.

| Window | Fees | Revenue | Creator earnings |
|---|---|---|---|
| 24h | $3.47M (yesterday $3.66M) | $1.71M ($1.89M) | $1.76M, 15 venues ($1.72M, 16) |
| 7d | $22.43M ($24.08M) | $11.54M ($12.75M) | $10.89M ($11.14M) |
| 30d | $128.52M ($144.10M) | $62.26M ($73.45M) | $66.26M ($70.07M) |

Creator earnings by venue, 24h: pump.fun $482,133 ($564,478), Flap $496,039 ($595,513), Pons $337,163 ($261,529), LaunchLab $198,705 ($103,451), Clanker $1,423 ($894).

- Narratives (24h chart-window volume to 04:00 UTC, change on the preceding window, 30-day volume of current members):

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Coins paired with tokenized stocks | 5 | $32.35M | +21.5% | $534.43M |
| Anthropic IPO coins (new) | 4 | $16.01M | n/a (+3,994% on a partial prior window) | $22.25M |
| Launchpad and launch-tool coins | 4 | $5.61M | -56.6% | $142.70M |
| Super Intelligence coins | 12 | $3.11M | -57.1% | $414.77M |
| Zcash launchpad coins (new) | 3 | $2.85M | +48.0% | $31.75M |
| AI inference market coins | 3 | $2.23M | +14.2% | $140.57M |

Yesterday's paused narratives: 2028 presidential-run $6.34M and GTA 6 Dacity Coin $1.82M (24h) are no longer collected. Volume caveats shown today: Launchpad coins (Launch traded over 10x its market cap, 78% of the volume) and Super Intelligence (Super Iguana over 10x, 18%). The two new narratives show no caveat. The 30-day volumes of the new narratives apply today's membership to past days (Anthropic's is mostly its 20-hour-old Robinhood coin's launch day).

## Story changes

- **Anthropic IPO:** new; the filing posts of 2026-10-26 and the Bloomberg post of 2026-10-29 (e3:1). The earlier deferral was for volume only.
- **Zcash launchpads:** new; Zcash's 10th anniversary, the Snarks Pad birthday post and the sapling.cash LaunchLab post (e2:1, e3:3).
- **Super Intelligence:** the e1:3 search found only 2026-10-09 and 2026-10-18 posts today; no new source after the 2026-10-27 Trump post.
- **Stock-paired:** xstok listed SNDKx (2026-10-28) and the Stonks Exchange offers launches paired with listed stocks (e1:4).
- **2028 presidential-run:** the committee story is two days old; a post says the super PAC filed with the FEC (e1:8). No coin is linked to it. Paused.
- **GTA 6 Dacity Coin:** a post of 2026-10-25 calls the coin's chart a post-hype bleed (e1:5); no newer source. Paused.

## Failures, refunds, billing

- Calls: 702 requested, 555 delivered; 147 undelivered and billed $0: f1 call 4 (StonkFun dailyRevenue; Frames' cross-check called dates "in the future" although every date is <= the run date and 94 prior complete days match, so the body was retained as validated, not retried) and 146 of 614 panel calls (85 seller errors for unsupported FOMO tokens, 51 negative results such as empty holder lists or candles, 7 caller errors, 3 unlabelled). No d, e or c call failed.
- No price-change failures; OHLC fields were accepted in c1 and c2.
- p1: the first invocation returned "MCP server connection lost" before a run id; repeated once with the same idempotency key (a single run, billed once). Several large `frames_get_run` results were saved to files and read from there.
- One redaction: the scraped docs page of useorbix.app (e1:1) contains an example `curl` header line that uses a variable name, not a key; `normalize.py`'s credential-pattern assertion rejected it, the assertion was left unchanged, and that text in raw/e1.json was replaced with the same redaction note as on previous days.
- First normalize failed on a curation error (new narrative categories `ai` and `privacy` are not in `NarrativeCategory`); corrected to `stonks` and `infra` and rebuilt.
- **Billed credits: 3,781** over 75 unique Frames runs (d1/d2 32, e1 98, e2 22, e3 50, f1-f6 605, c1/c2 56, p1-p62 2,918). Balance 28,259 before, 24,525 after (16% of the monthly grant); the monthly allowance holds 14,525 and 10,000 are purchased credits.
- **Pump/FOMO panels:** `plan.py panels` planned 614 calls in 62 batches (`plannedCredits` 3,776 of the 3,800 ceiling; `reservedByOtherBatchesCredits` 1,180), covering 140 coins (31 constituents plus 109 other tracked coins; 53 skipped by the planner for the ceiling). All 62 batches were called; none skipped for the 10,000 budget. Panels billed 2,918 credits.

## Anchors and checks

Financial 2026-10-29; chart 2026-10-29 04:00 UTC; daily bars through 2026-10-29 00:00 UTC; hourly/daily reconciliation passed. Checks run on the final tree: `npx tsc --noEmit`, `npm run lint`, `node --experimental-strip-types --test tests/frames-data.test.mjs` (12 of 12), `npm run build`, `git diff --check` and a credential scan of the raw files all passed.

## For the owner

- **Second pause at the cap:** I paused GTA 6 Dacity Coin (stalest story, smaller chart-window volume yesterday, $1.82M) rather than AI inference markets ($652K in today's sweep, fresh story). Today's sweep volume would have chosen AI inference; tell me if the rule should rank by story currency or by volume.
- **Anthropic IPO is dominated by one 20-hour-old coin** (95% of volume, no description). Its 30-day total is only that launch day. Revisit tomorrow once the ANT coins carry more of it.
- **StonkFun lags DefiLlama** by days at times; the fee windows and venue counts swing when it falls out and back in.
- **Monthly allowance:** 14,525 left plus 10,000 purchased; at about 3,800 credits a day it covers under four more days, and `renews_at` is null.
- **Belief/Nothing lead and the oil/dividend fund family** received no new independent source; the second is on day 8 of deferral.
