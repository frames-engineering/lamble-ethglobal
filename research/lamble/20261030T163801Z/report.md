# Daily refresh 2026-10-30 (run 20261030T163801Z)

Run time 2026-10-30 16:38:01 UTC, a manual re-run (below). Financial anchor (exclusive end) **2026-10-30**, one day after the prior run's 2026-10-29, so `normalize.py` ran with `--prior research/lamble/20261029T055729Z` and no separate narrative baseline. Chart anchor 2026-10-30 15:00 UTC; 30 complete UTC days of daily bars (198 reconciled days); 33 pools; 1,288 pre-creation zero buckets. Release published: rel-20261030T163801Z-4cbb883a. The 2026-W43 edition stays frozen (revision 1) and 2026-W42 is unchanged. Articles: daily-2026-10-30 written; state-of-the-trenches-2026-w43 unchanged; coin-si-solana-9aqmjj-2026-w44 and narrative-launchpad-coins-2026-w44 pinned.

**How this run happened.**
- The scheduled 05:56 UTC run stopped before any call. Available credits were 10,939, so a normal day would have taken the balance below the 10,000 floor.
- After the owner topped up, this run was fired at 16:36 UTC. It called and saved every batch, then stopped at `normalize.py`'s credential scan on the useorbix.app scrape (see the redaction below).
- The owner then blocked useorbix.app and its coin ORBIX (`docs/data/blocked.json`, PR #42). The run was finished offline in an interactive session that evening. It was rebuilt on main, ORBIX was recorded in `removedMembers`, the placeholder was redacted, and then normalize, import, release and checks ran.
- No Frames call was made after the run's own batches.

## New narrative (1)

**Binance hack coins (n-binance-hack-coins, 4 coins, category culture), from clusters k-binance and k-fund.**
- **SAFU Fund** (SAFU, Flap, 0x7c907d...): "Taxes going to SAFU wallet for helping Binance to buyback tokens with USDC." About $4.36M volume and $1.28M market cap in d1. Pool opened 2026-10-30 11:32 UTC.
- **SAFU Fund** (SAFU, Flap, 0x9897ad...): "SAFU Fund". A Chinese-language post of 2026-10-30 (e2:1) names this contract. About $518K volume, $457K market cap. Pool opened 2026-10-30 13:30 UTC.
- **Funds Are Safu** (SAFU, Flap, 0xdd806e...): no description; its name quotes the phrase, and posts of 2026-10-30 (e2:1, e3:1) tie it to the hack. About $8.67M volume, $924K market cap. Its pool opened 2026-10-10, 20 days before the hack, so it did not launch on this story.
- **The $19 Freeze** ($19, Pump.fun, pa6bZZ...): "Starknet Foundation froze 428 STRK $0.0442 ($19) which were stolen on Binance." About $357K volume, $103K market cap (just over the $100K member bar). Pool opened 2026-10-30 15:24 UTC.
- **Independent sources** (e3:0, e3:1):
  - Binance's X service update of 2026-10-30 04:36 UTC: withdrawals paused, expected back within 48 hours.
  - Indian Express (05:32 UTC): about $3 billion frozen.
  - Nikkei Asia (10:00 UTC): a $6.3bn hack.
  - CZ's "Your funds are SAFU" post (11:57 UTC).
  - The hack size and frozen amounts are those outlets' reports and are not verified here. No coin is shown to be connected to Binance.
- Combined d1 volume of the four coins was about $13.9M; 24h chart-window volume was $13.51M.

Created at the six-narrative cap by pausing AI inference market coins (below).

## Cluster decisions (5, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-binance | created (n-binance-hack-coins) | SAFU Fund (0x7c907d...) and The $19 Freeze name Binance. We Trust Binance (WTB, Flap) has an empty description and a $61K market cap, under the member bar. |
| k-fund | created (n-binance-hack-coins) | The two SAFU Fund coins name Binance's SAFU fund. USDF shares only the word fund and stays with the deferred oil and dividend fund family. |
| k-exchange | deferred | Two Papertrade "Paper" copies, on Base (0x4f2488..., $39.7M, 4 hours old) and on Robinhood Chain (0x864aa9..., $13.3M, 14 hours old). They belong to the paused Perpetual-futures narrative, which stays paused. |
| k-hyper | rejected | HYPERCHAN and two HYPER INU coins share only the word hyper. The posts (e2:2) are call-group promotion and scam warnings. |
| k-sym-CTO | rejected | Three CTO (Chief/Crypto Troll Officer) coins share a ticker. Their metadata names neither Elon Musk, Binance nor the hack. |

Leads re-evaluated and still deferred, with no new independent source:
- the oil and dividend fund family (USDF, day 9);
- Backed By Belief (Nothing, $72K market cap, under the member bar);
- Kimchi.

## Member and narrative changes

- **Paused at the cap (memberships stay open):** AI inference market coins had the lowest rolling 24h token volume of the six active narratives in the sweep ($419K).
  - Their pools left `poolUniverse`.
  - The orbio.so and useorbix.app pages left e1. The Raeto search stays so the narrative can be resumed; it no longer includes ORBIX.
- **Removed:** ORBIX (useorbix.app, Pons, Robinhood Chain), under the owner's block in `docs/data/blocked.json` (the owner suspects the site is malware).
  - Its membership closed at the run time (`closedBy: removedMembers`).
  - The coin stays in the release files as a formerly tracked coin. The website hides it, its site and every mention of them in every release when it reads them (`src/lib/lamble/blocked.ts`).
- **Added:** Anonymous Cat (ZCAT, StonkFun) joined Zcash launchpad coins. Its metadata says "The Cat Stays Anonymous. No Socials. Zcash Rewards." About $1.08M volume and a $37.1M market cap. Its pool opened 2026-09-06, long before the narrative.
- No narrative retired and no coin archived.
- Registry: `poolUniverse` now has 33 pools (5 added, 3 removed). `dailyEvidence.pages` is notrandom.fun only. `latestRefreshRun` and the importer defaults point at this run.

## Data changes vs yesterday (run 20261029T055729Z)

- **Covered fee subtotal** (14 included venues): **$3,144,062** against $3,163,194 (-0.6%). The financial anchor advanced from 2026-10-29 to 2026-10-30. No revisions.
- **Indexed launches** 24h: **51,313** against 52,723 (-2.7%). **Completions** 24h: **3,052** against 2,862 (+6.6%). 14 creation venues, 11 completion venues.
- **Windowed sums** over launchpads with data. StonkFun's DefiLlama series is back, so 19 venues count against 18 yesterday (16 against 15 for creator earnings). Part of each rise is that, not only market moves.

| Window | Fees | Revenue | Creator earnings |
|---|---|---|---|
| 24h | $3.69M (yesterday $3.47M) | $1.88M ($1.71M) | $1.79M, 16 venues ($1.76M, 15) |
| 7d | $24.05M ($22.43M) | $12.39M ($11.54M) | $11.39M ($10.89M) |
| 30d | $134.45M ($128.52M) | $68.97M ($62.26M) | $64.87M ($66.26M) |

Creator earnings by venue, 24h: pump.fun $530,002 ($482,133), Flap $595,257 ($496,039), Pons $292,342 ($337,163), LaunchLab $177,520 ($198,705), Clanker $21,406 ($1,423).

- **Narratives.** 24h chart-window volume to 15:00 UTC, change on the preceding window, and 30-day volume of current members. This run's windows end 11 hours later in the day than yesterday's (15:00 against 04:00 UTC), so day-over-day comparisons span 35 hours.

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Coins paired with tokenized stocks | 5 | $38.67M | -0.2% | $554.54M |
| Binance hack coins (new) | 4 | $13.51M | +5,858.6%, on a prior window before three of its four coins existed | $23.02M |
| Zcash launchpad coins | 4 | $3.65M | +27.7% | $78.39M |
| Super Intelligence coins | 12 | $2.28M | +4.7% | $349.07M |
| Launchpad and launch-tool coins | 4 | $0.88M | -30.9% | $138.57M |
| Anthropic IPO coins | 4 | $0.50M | -50.3% | $22.85M |

- **Volume caveat** shown today: Anthropic IPO (Anthropic traded over 10x its market cap in 24h, 73% of the volume). Yesterday's Launchpad and Super Intelligence caveats are no longer shown.
- The 30-day volumes apply today's membership to past days. Zcash's includes ZCAT's history; Binance hack coins' is mostly Funds Are Safu's, since that is the only coin older than a day.

## Story changes

- **Binance hack:** new. Sources are Binance's service update and the Nikkei Asia and Indian Express posts (e3:0), and CZ's "Your funds are SAFU!" post, which is the phrase the coins borrow (e3:1).
- **AI inference markets:** paused. It had no story check, and its pages and its ORBIX search left e1.
- No other story status changed.

## Failures, refunds, billing

- **Calls:** 706 requested, 549 delivered. The 157 undelivered calls were billed $0:
  - 153 of 617 panel calls: 99 seller errors, 43 negative results such as empty holder lists or candles, 8 caller errors, 3 unlabelled.
  - d1 call 0: a Codex sweep query that returned no data.
  - Three DefiLlama calls whose bodies Frames' cross-check called dated in the future: f2:7 (bonk.fun dailySupplySideRevenue), and f3:8 and f3:9 (Meteora DBC dailyRevenue and dailySupplySideRevenue). They are recorded as the run's three delivery disputes in validation-report.json.
- **One redaction:** the scraped useorbix.app page (e1) contains the docs' example `curl` header line, which uses a variable name, not a key. `normalize.py`'s credential-pattern assertion rejected it. The assertion was left unchanged, and that text in raw/e1.json was replaced with the same redaction note as on 2026-10-25 to 2026-10-29. The page is no longer scraped.
- **Billed credits: 3,743** over 75 unique Frames runs: d1/d2 26, e1-e3 184, f1-f6 583, c1/c2 56, p1-p62 2,894.
  - Available credits were 20,939 before the run. The lowest balance the runs reported is 17,224, and `frames_get_usage` showed 17,242 at about 17:40 UTC. All of it is purchased credits; the monthly allowance is at 0.
- **Pump/FOMO panels:** `plan.py panels` planned 617 calls in 62 batches for 141 coins: 3,795 credits of the 3,800 ceiling, with 1,180 reserved by the run's other batches. All 62 batches were called and none was skipped for the 10,000 budget. Panels billed 2,894 credits.
- The d1 constituent snapshot was planned before the block, so it included ORBIX's address. That was a Codex market-data query, not a request to the site.

## Anchors and checks

Financial 2026-10-30; chart 2026-10-30 15:00 UTC; daily bars through 2026-10-30 00:00 UTC; hourly/daily reconciliation passed (max relative gap 5.9e-10 against a 0.02 tolerance).

Checks run on the final tree, all passed:
- `npx tsc --noEmit`
- `npm run lint`
- `node --experimental-strip-types --test tests/frames-data.test.mjs` (12 of 12)
- `npm run build` (no built page names the blocked site or coin)
- `git diff --check`
- a credential scan of the raw files

`npm test` passed 127 of 128. The failing test, "every retained daily plan since getTokenBars passes the catalog limits" (20261025T055758Z/e3), also fails on main.

## For the owner

- **Funds Are Safu predates the hack by 20 days.** It is in on its name and on posts tying it to the story, but it carries 62% of the narrative's sweep volume. Say if a pre-existing coin should need its own metadata to name the story.
- **The hack figures are news reports** ($6.3bn hack, about $3 billion frozen), not verified here. The narrative copy attributes them.
- **Papertrade copies** keep appearing every day or two with large, short-lived volume. That makes resume-or-defer for Perpetual-futures hard to apply; a rule would help.
- **Budget:** 17,224-17,242 available, all purchased. A normal day bills about 3,700-3,800, so the 10-31 run fits and the one after can call only the panels that fit above the 10,000 floor.
- **10-31 overlap:** tomorrow's run fires at 06:56 UTC, so its 24h windows overlap this run's by about 8 hours.
