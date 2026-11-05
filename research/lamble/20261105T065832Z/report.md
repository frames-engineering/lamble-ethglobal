# Daily refresh 2026-11-05 (run 20261105T065832Z)

Run time 2026-11-05 06:58 UTC. Financial anchor (exclusive end) **2026-11-04**, the same as the previous run: Pump.fun and StonkFun had not published 2026-11-04 yet (their series end on 2026-11-03), so `normalize.py` ran with `--financial-anchor 2026-11-04`, `--prior research/lamble/20261103T065831Z` (the last run with an earlier anchor) and `--prior-narrative research/lamble/20261104T065857Z`. Chart anchor 2026-11-05 05:00 UTC; 30 complete UTC days of daily bars (192 reconciled days, max relative gap 3.7e-10 against hourly sums); 32 pools; 1,248 pre-creation zero buckets. Release published: rel-20261105T065832Z-adbc7611. Today is a Thursday: no weekly edition was due (2026-W43 stays frozen, 2026-W44 unchanged). Articles: daily-2026-11-05 written; state-of-the-trenches-2026-w44 unchanged; coin-owl-solana-68agsj-2026-w45 and narrative-stock-paired-coins-2026-w45 pinned.

## New narratives (1)

**Democrats win Congress coins** (`n-midterm-democrats-coins`, category politifi). Four Pump.fun coins, $2.98M of chart-window 24h volume ($4.33M over 30 days of the coins' lives), created from cluster k-victory plus the Mr. Veto coins that were deferred yesterday:

| Coin | Metadata or name | 24h volume at discovery | Pool opened (UTC) |
|---|---|---|---|
| Mr. Veto (VETO, `SivBpe...`) | "President Trump lays out his strategy for dealing with a potential Democratic-controlled Congress." | $841,898 | 2026-11-04 18:26 |
| Mr Veto (VETO, `4xWRsd...`) | no description; name is Trump's "Mr. Veto" line | $375,267 (market cap $108,635) | 2026-11-01 15:50 |
| Democratic Party (DEM, `WE52e9...`) | "Watcher.Guru posted about the U.S. Democratic Party taking both the House and Senate... the midterm election results" | $264,275 | 2026-11-04 04:22 |
| The Democrat Cat (Democat, `9Y1F6d...`) | "...lead Democrats to victory." | $1,558,723 | 2026-11-04 21:50 |

Independent sources (posts on X, e3:1 and e3:2): Reuters, BNO News and Watcher.Guru on 2026-11-04 report that Democrats won the House and the Senate; Fox News and CTV News report that Trump posted a red "VETO" hat on Truth Social after the Senate projection; Newsmax (2026-11-01, linked in a post) reports he said he would be "Mr. Veto" if Democrats won Congress. Reports in posts, not verified here. No coin is shown to be connected to any party or official. Combined volume $3.04M at discovery against the $500K bar; four coins against the three required.

At the six-narrative cap the weakest narrative was paused: **Binance hack coins** (three SAFU coins, $0.52M rolling 24h volume at discovery against $3.04M for the new narrative; chart-window $1.11M the day before). The hack began 2026-10-29 and withdrawals reopened on 2026-11-03, so the defining source stands; this is a pause (memberships stay open, collection stopped, pools left `poolUniverse`), not a retirement.

## Cluster decisions (7, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-victory (GAVELDROP, Democat, DEM; $4.12M) | created, `n-midterm-democrats-coins` | Democat and DEM name the midterm result in their descriptions; with the two Mr. Veto coins from the Codex phrase search (e3:0) that is four coins, $3.04M, and news posts from Reuters, Fox News, CTV News and Newsmax. GAVELDROP ($2.30M, "He won the vote. The floor won the gavel... victory speech... Blue ballots fly.") parodies an election win but names no election, party or Congress: not counted, recorded as a deferred candidate. |
| k-giving (RAMBO, MINTED, OAK; $3.08M) | rejected | Shared word in unrelated metadata. e2:1 returned shills and a scam alert. RAMBO is a RAM-price meme with an Elon Musk quote; it is the only coin with RAM metadata, so a RAM narrative is under the three-coin bar. |
| k-blue (GAVELDROP, DEM, BLUECHIP; $2.72M) | rejected | GAVELDROP and DEM are handled in k-victory; BLUECHIP is the finance term. |
| k-ever (CHICKPOT, MINTED, LIQT; $2.60M) | rejected | Shared word. e2:2 returned caller shills ("$11K to $4.2M MC"), no news or official source. |
| k-american (AODF, XTO, AORP; $1.13M) | deferred (oil and dividend fund family, day 15) | Most of the family (UODF, AODT, USOE, UDTF, AODF clones) is flagged implausible-cap-for-new-pool or extreme-24h-move and stays quarantined; unflagged AODF is one coin. e2:3 returned scanner posts ("millions were extracted from $aodf early this morning", "DEV HOLDS 79% OF SUPPLY"), no news or official source. |
| k-robinhood (Kitsu, ZKBLAST, OAK, UPOCH; $0.93M) | rejected | The chain name shared by different stories; e2:4 returned caller posts and a generated reply. |
| k-powered (ZKBLAST, OAK, SIC; $0.68M) | rejected | Unrelated. ZKBLAST's own posts (e2:5) say its launchpad factory is live on Robinhood Chain and HyperEVM; one coin, $0.29M. |

Leads re-evaluated: the **Mr. Veto lead** (deferred day 1 yesterday) is now the new narrative. Yesterday's other VETO coins (`B93V9u...`, `GdpMkp...`) are not above the sweep or phrase-search bars today and were recorded as rejected candidates. **Paper** (Clanker V4, Base; $51.2M volume, $10.2M market cap, 18 hours old) is a single coin: deferred (no independent source searched). **SARAH** (Zcash shielded-wallet routing) did not appear in today's sweep. **Impeach** ($2.46M, empty description) rejected: nothing ties the name to a source. The Lightberry Lumi coins stay paused (FCC exemption posts of 2026-10-31 to 2026-11-03 in e1:7 keep the source standing).

## Member and narrative changes

- **Added to Anthropic IPO coins (1):** Anthropic (Anthropic, Clanker V4, Robinhood Chain, `0xf289e2...`; name only; $22,570,458 volume, $10,199,817 market cap, price up 920% in 24h, pool opened 2026-11-04 13:08 UTC after the 2026-10-26 S-1 posts; turnover 2.2x, no quarantine flag). It is the third name-only Anthropic coin in four days (Base 2026-11-02, Robinhood Chain 2026-11-03 and 2026-11-04), each with a launch-day spike while the previous one fades; the Robinhood Chain coin `0xcee339...` traded $43 today against $15.8M yesterday and stays collected one more day (first observation under $1,000).
- **Archived (1):** Anthropic (`0xfff156...`, Base): $83 yesterday and $0 today, under $1,000 on two consecutive observations. Membership stays open; collection stopped; removed from `poolUniverse`.
- **Added to the new narrative (4):** see above. **Paused (1):** Binance hack coins, with their three pools removed from `poolUniverse`.
- Registry: `poolUniverse` has 32 pools (5 added, 4 removed). `dailyEvidence` stays at 10 calls in e1: the Binance search became "Democrats win House Senate midterm results" and the Veto search that returned nothing in e1:6 became "Trump Mr. Veto red hat Truth Social Democrats Congress" (the version that returned posts in e3:1).
- Story searches: 19 X searches (e1 10 with one returning no posts, e2 6, e3 2; the Codex phrase searches in e3:0 are not X searches) and no page scrapes (limits 24 and 6).

## Data changes vs yesterday (run 20261104T065857Z)

- **Covered fee subtotal** (14 included venues): **$2,582,060** for 2026-11-03, unchanged from yesterday's run (the anchor did not advance; no included venue's 2026-11-03 value was revised). Three provider series were revised again: Pump.fun dailyFees, dailyRevenue and dailySupplySideRevenue for 15 days (2026-10-19 to 2026-11-02; for example 2026-11-02 fees $1,646,109 to $1,606,826 relative to the 2026-11-03 run). Two delivery disputes (binance-alpha dailySupplySideRevenue and foci dailyRevenue: refunded, retained as validated non-delivered bodies with prior overlap matching).
- **Indexed launches** 24h: **53,428** against 55,522 (-3.8%). **Completions** 24h: **2,835** against 3,207 (-11.6%). 14 creation venues, 11 completion venues.
- **Windowed sums** over launchpads with data. StonkFun now has 2026-11-03 data (it did not yesterday), so the sums cover 19 venues for fees and revenue and 16 for creator earnings (yesterday 18 and 15); the covered subtotal is unaffected because StonkFun is excluded from it.

| Window | Fees | Revenue | Creator earnings |
|---|---|---|---|
| 24h | $2.99M, 19 venues (yesterday $2.81M, 18) | $1.56M ($1.48M) | $1.35M, 16 venues ($1.33M, 15) |
| 7d | $20.89M ($19.98M) | $10.71M ($10.15M) | $9.99M ($9.83M) |
| 30d | $111.73M ($105.88M) | $57.82M ($53.17M) | $53.38M ($52.71M) |

Creator earnings by venue, 24h (unchanged from yesterday as the anchor did not advance): pump.fun $483,776, Flap $413,532, Pons $164,444, LaunchLab $146,794, BONK.fun $66,996.

- **Narratives.** 24h chart-window volume to 05:00 UTC, change on the preceding window, and 30-day volume of current members.

| Narrative | Coins | 24h | Change | 30d (yesterday) |
|---|---|---|---|---|
| Anthropic IPO coins | 5 | $23.04M | +40.6% | $49.20M ($79.77M) |
| Coins paired with tokenized stocks | 6 | $16.71M | -54.2% | $500.97M ($495.25M) |
| Democrats win Congress coins (new) | 4 | $2.98M | +177.3% | $4.33M |
| Super Intelligence coins | 10 | $1.19M | +17.9% | $135.28M ($153.19M) |
| Zcash launchpad coins | 4 | $1.07M | -67.2% | $55.05M ($56.34M) |
| Anakin Skywalker headline coins | 3 | $0.94M | -59.4% | $28.29M ($27.02M) |

Yesterday's 24h figures: stock-paired $36.49M, Anthropic $16.38M, Zcash $3.28M, Anakin $2.31M, Binance $1.11M (paused today), Super Intelligence $1.01M. The Anthropic 30-day total fell by $30.6M because the members changed (the Base coin that traded $53.6M on 2026-11-02 was archived and its collection stopped) and heavy days left the window; Super Intelligence's fell by $17.9M as early-October days left it.

- **Volume caveats:** none. Yesterday's caveat on Anakin Skywalker headline coins is no longer shown (no coin traded over 10x its market cap).

## Story changes

- Anthropic IPO coins: posts of 2026-11-02 to 2026-11-05 repeat that Anthropic made its S-1 public on 2026-10-26 and intends to list on Nasdaq under ANT; one post gives an earliest roadshow of 2026-11-10 and first trade of 2026-11-16; one post of 2026-11-04 says a revised S-1 shows $33.2 billion of revenue for the first nine months of 2026 and $895 billion of compute commitments (yesterday's posts said about $17B for Q3). Reports in posts, not verified here.
- Democrats win Congress coins: new story, see above.
- Zcash launchpads: Sapling's posts of 2026-11-04 say 41 days of operation, $45.75M traded, 498 coins launched and 30 graduated, $643.6K protocol revenue; a post of 2026-11-05 says Sapling is now run by an independent Zcash company, @saplingdotllc (its own claims; not verified here). No story-status rewrite.
- Binance hack coins (now paused): posts of 2026-11-03 say Binance reopened withdrawals for more assets after the $6.3B hack.
- Other narratives: no change in sources.

## Failures, refunds and billing

- 704 calls requested, 540 delivered. The 164 undelivered calls were refunded or not charged (100 seller_error, 52 negative_result, 8 caller_error, 4 with no outcome recorded). Almost all are panel calls: FOMO market panels returning TOKEN_UNSUPPORTED with a null market, empty holder lists, and candle bodies the cross-check calls "future" because FOMO labels the bucket by its start. Bodies are retained and normalized at no charge. e1:6 (the old Veto search) returned no posts.
- No Codex OHLC rejection: c1 and c2 returned the o/h/l/c fields and 5,072 OHLC bars were ingested.
- One panel body (p4 call 9, the FOMO holders list for the Solana coin `4kjruq...`, 218,014 characters) came back by reference; it was fetched with `frames_get_tool_results` (stored seq 6) in four free pages and stored inline in `raw/p4.json` before normalizing.
- e3 was called as a story-check batch (a Codex phrase search for "veto", "democrat", "midterm" and "congress" and two X searches); its request file `raw/e3-request.json` was written after the call from the exact arguments used, because the call was made directly rather than planned by `discover.py`.
- 0 ingest warnings from `npm run lamble -- refresh`; the release passed its checks.
- **Billed credits: 3,694** (sum of `billing.charged_credits` over 75 unique run ids, from validation-report.json): discovery d1 25, d2 7; evidence e1 97, e2 54, e3 28; collect f1-f6 594, c1 37, c2 19; panels 2,833 across 62 batches (32 constituents plus 108 other coins; 73 coins skipped by the planner's ceiling; plannedCredits 3,776, reservedByOtherBatchesCredits 1,080). No batch was skipped for the budget. Daily budget 10,000.
- Frames usage moved from 111,345 to 107,697 available credits (3,648; the gap to 3,694 is the ledger's rounding against the per-run bills). Available now: monthly allowance 74,863 plus purchased 32,834.
