# Daily refresh 2026-10-26 (run 20261026T055802Z)

Run time 2026-10-26 05:58:02 UTC. Financial anchor (exclusive end) **2026-10-25**, the same as the previous run: pump.fun's DefiLlama series ended on 2026-10-24 at run time (other venues already showed 2026-10-25 or a partial 2026-10-26), so the latest day every included venue supports did not advance; `normalize.py` was run with `--financial-anchor 2026-10-25`, `--prior 20261024T055759Z` (the last run with an earlier anchor) and `--prior-narrative 20261025T055758Z`. StonkFun now has its 2026-10-24 day, so it has windowed figures (24h fees $65,207, -64.2%). Chart anchor 2026-10-26 04:00 UTC; daily bars through 2026-10-26 00:00 UTC (30 days). Release published: rel-20261026T055802Z-938d60b9. Not a Monday: the 2026-W42 edition is unchanged and 2026-W43 stays delayed (no validated run reaches its end yet). Articles written: daily-2026-10-26, narrative-launchpad-coins-2026-w44, coin-si-solana-9aqmjj-2026-w44.

## New narratives

**Launchpad and launch-tool coins (n-launchpad-coins), created.** Four coins on covered launchpads whose own metadata describes a launchpad or launch tool, $7.93M combined rolling 24h volume (LAUNCH $5.35M, NTRNDM $0.97M, HOOKED $0.92M, RAYPAD $0.69M), each meeting the $50K volume and $100K market-cap bars with no quarantine flag:
- **Launch (LAUNCH, LaunchLab)**: "Launch launches coins on StonkFun, which runs on Raydium LaunchLab." Created about 18 hours before discovery, 5.0x turnover, +2,527% in 24h.
- **RAYDIUM LAUNCHPAD (RAYPAD, LaunchLab)**: "A Launchpad the way it should be: no snipers, no copycats, and every fee burns your coin forever." About 3 hours old.
- **notrandom (NTRNDM, Pump.fun)**: "Non-random pumpfun CA launcher, and custom Solana wallet addresses." Created about 2026-10-10, so it predates the wave.
- **Hooked (HOOKED, Meteora DBC)**: "Launch a token with rules built into the token itself." Created about 2026-10-03; an earlier on-chain-rules launchpad narrative removed it on 2026-10-17, so it rejoins as a new interval.
Independent sources: a GeckoTerminal post of 2026-10-26 05:46 UTC (e2:1) calling LAUNCH a launchpad built on StonkFun; notrandom.fun's own page (e3:0, scraped today); @notrandomdotfun posts (e3:1). A checker account's scans (e3:2) say LAUNCH's own fee burn and RAYPAD's burn vault were not verified; the copy says so. Cap handling: Perpetual-futures coins were paused to make room (below).

## Cluster decisions (8, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-fees | created | LAUNCH, with RAYPAD, NTRNDM and HOOKED, forms the new narrative; LAUNCHCAT is a cat meme and bInference sells AI credits. |
| k-runs | created | LAUNCH and HOOKED join the new narrative; Zenity and Thinkr are unrelated. |
| k-built | rejected | Claude, Hooked and Zenity share only the word built. |
| k-mascot | rejected | Chop, Palu and Fat Panda share only the word mascot. |
| k-titty | rejected | Crude name jokes (GTA, BNB, ETH); no source. |
| k-paired | deferred | BTC/BNB/ETH pairing coins on pump.fun, one verified post says BTC is paired with WBTC via notrandom.fun; only two of three meet the member bars (Big Testicle Coin has an $83K market cap). Re-check tomorrow. |
| k-agent | rejected | FLAPAI ("Agent-only launchpad", $65K market cap, under the bar), Zenity, bInference. Flap's own FLAP APPS post (2026-10-23) noted; recorded as a candidate. |
| k-anyone | rejected | Generic word. |

Previously deferred leads re-evaluated: Kimchi (CSocnz...) stays deferred and its narrative paused; USDF (3PGHr2..., fifth day) stays deferred with no independent source. BILLIONS did not recur in today's sweep. 21 candidate records added.

## Member and narrative changes

- **Paused: Perpetual-futures coins (n-perpetual-futures)** at the six-narrative cap: rolling 24h token volume $33K across seven members against $54.19M in the prior sample (the Base Paper copy traded $83 after $53.4M); the new narrative has more volume and a current story. Memberships stay open; pools removed from poolUniverse.
- **Archived (under $1,000 on two consecutive observations):** PAPER (Robinhood Chain, 0x179b22...; $0 and $0) and ACTII (Super Intelligence; $955 then $267).
- Added: LAUNCH, RAYPAD, NTRNDM, HOOKED (above). No coins removed by contradicting evidence; none retired. Not archived yet (first observation): DACITY on Pons ($1,994), Paper on Base, VIRTUAL, GSIR ($81 after $1.08M).
- Registry: dailyEvidence now scrapes notrandom.fun (replacing papertrade.xyz) and searches "launchpad coin $LAUNCH $RAYPAD $NTRNDM $HOOKED" (replacing the Papertrade search); e1 stays at 10 calls.

## Data changes vs yesterday (run 20261025T055758Z)

- Covered fee subtotal (14 included venues): **$2,658,348**, unchanged from yesterday because the anchor did not advance.
- Indexed launches 24h: **47,765** against 48,371 (-1.3%); completions 24h: **2,975** against 2,890 (+2.9%). 14 creation venues, 11 completion venues.
- Windowed sums over launchpads with data (overlapping venues are added, so not a de-duplicated market total):

| Window | Fees | Revenue | Creator earnings |
|---|---|---|---|
| 24h | $2.78M (yesterday $2.71M) | $1.45M ($1.40M) | $1.32M ($1.32M) |
| 7d | $24.62M ($23.59M) | $13.37M ($12.47M) | $11.18M ($11.12M) |
| 30d | $151.09M ($138.63M) | $76.69M ($65.64M) | $73.87M ($72.98M) |

The only 24h change is StonkFun gaining its window; the 7d and 30d windows include its days. pump.fun creator earnings $434,725, Flap $618,220, Pons $208,551 (same anchor day).

- Narratives (24h chart-window volume to 04:00 UTC, change on the preceding window, 30-day volume of current members):

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Coins paired with tokenized stocks | 5 | $35.39M | +186.0% | $538.95M |
| Launchpad and launch-tool coins (new) | 4 | $13.27M | +429.0% | $116.05M |
| GTA 6 Dacity Coin coins | 4 | $3.73M | -64.0% | $72.23M |
| Super Intelligence coins | 12 | $1.15M | -62.7% | $429.08M |
| AI inference market coins | 3 | $0.66M | -15.3% | $151.94M |
| PHP2Shell coins | 4 | $0.12M | -70.2% | $21.19M |
| Perpetual-futures coins (paused, 7 coins) | not collected | | | |

No volume caveat is shown for any narrative today.

## Story changes

- **Launchpad coins**: new (above). **Perpetual-futures**: Papertrade posts continue (a 2026-10-26 post says $8.5M of protocol fees in its first week; 2026-10-25 coverage says PAPER itself will not trade), but the contract copies lost their volume.
- **GTA 6 Dacity Coin**: posts of 2026-10-24/25 repeat the trailer/plane claim; none is official; volume fell 64%.
- **Stock-paired**: xstok listed $CATE (2026-10-25, e1:5); STONK is 92% of the narrative's volume.
- **PHP2Shell, AI inference, Super Intelligence**: no new sources; PHP2Shell is $123K, near the $100K pause threshold (first observation above it).

## Failures, refunds, billing

- Calls: 707 requested, 541 delivered; 166 undelivered and refunded (billed $0): 164 of 614 Pump/FOMO panel calls (unsupported FOMO tokens, empty holder lists) and two DefiLlama supply-side calls (graphite-protocol: zero series; genius.fun: dated in the future), kept as disputed deliveries in validation-report.json (all dates up to the runtime day, prior complete days match).
- d1 call 0: the Codex response lacked the `solana_recent` data set and was refunded; the `solana_active` and the other sweeps were used.
- One redaction: the scraped docs page of useorbix.app (e1:1) contains the example `Authorization: Bearer $ORBIX_API_KEY` line (a variable name, not a key); `normalize.py`'s credential-pattern assertion rejected it, the assertion was left unchanged, and that text in raw/e1.json was replaced with a redaction note, as on previous days.
- No price-change failures and no retries. OHLC fields were accepted in c1 and c2.
- **Billed credits: 3,713** over 83 unique Frames runs (d1/d2 26, e1/e2/e3 203, f1-f6 594, c1/c2 56, p1-p62 2,834). Balance 30,157 before, 26,376 after (29% of the 90,000 monthly grant).
- **Pump/FOMO panels**: `plan.py panels` planned 614 calls in 62 batches (`plannedCredits` 3,776 of the 3,800 ceiling; `reservedByOtherBatchesCredits` 1,140), covering 140 coins (32 constituents plus 108 other tracked coins; 43 skipped by the planner for the ceiling). All 62 batches were called; none skipped for the 10,000 budget.

## Anchors and checks

Financial 2026-10-25; chart 2026-10-26 04:00 UTC; 32 pools; 1,277 pre-creation zero buckets; daily bars reconcile with hourly sums (max relative gap 5.9e-10 against 0.02, 192 days). The check results are in the pull request.

## For the owner

- The financial anchor did not advance because pump.fun's DefiLlama series lagged by a day at 06:00 UTC; the fee subtotal is therefore yesterday's number. Consider a later run time or a retry of pump.fun's three calls.
- k-paired (BTC/BNB/ETH pairing coins, $1.82M) is the strongest deferred lead; it would qualify if Big Testicle Coin passes the market-cap bar tomorrow, with the notrandom.fun post as the source.
- The Launchpad narrative's lead coin LAUNCH is 40% of its volume at 5x turnover; its story is current but young.
- Perpetual-futures was paused because its copies' volume collapsed; the written retire rule (two consecutive observations under $100K) had not triggered, so this relies on the cap-replacement rule.
- NarrativeCategory has no launchpad category; the new narrative uses `infra`.
