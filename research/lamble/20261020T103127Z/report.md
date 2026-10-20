# Daily refresh 2026-10-20, second run (run 20261020T103127Z)

Owner-requested second run of the day, fired after PR #28 (f933eee) added the Pump/FOMO panels step, the research-release step and Codex OHLC to c1/c2. Runtime 2026-10-20 10:31 UTC. Financial anchor (exclusive end) 2026-10-20T00:00Z, the same as this morning's run 20261020T055747Z, so the settled day is 2026-10-19; chart anchor 2026-10-20T09:00Z (this morning's was 04:00Z); 30 complete daily bars end 2026-10-20T00:00Z. Normalized with `--prior` 20261019T055754Z (last run with an earlier anchor) and `--prior-narrative` 20261020T055747Z. Every covered venue now reaches 2026-10-19, **including StonkFun**, whose series ended 2026-10-18 in this morning's run.

## New narratives

**One created: Pump.fun card-gacha coins (`n-pumpfun-card-gacha`).** It takes the slot of Flying Tesla Roadster coins, which is paused (see Member changes). Borderline; flagged for the owner.

- Five coins on covered launchpads: the collectooor (COLLECTOOOR, pump.fun; pool created 2026-10-19 18:59 UTC), the collectooor (COLLECTOOOR, pump.fun; pool 2026-10-20 02:52 UTC), Pokémon (pump.fun; pool 2026-10-20 00:01 UTC), Pokémon (MeteoraDBC; pool 2026-10-20 10:02 UTC) and filled.cards (FILLED, pump.fun; pool 2026-10-02). Rolling 24h volume at discovery about $10.6M combined against the $500K bar; chart-window 24h volume to 09:00 UTC $16.2M. No quarantine flags.
- Story: posts of 2026-10-19 and 2026-10-20 (e4:0) say Pump.fun put Collector Crypt card gacha packs and a card marketplace into its app. A CoinGecko post of 2026-10-20 07:50 UTC says $CARDS was up 19% following the integration; @zkayAPE (04:59 UTC) says about $2M of packs had been opened in the Pump.fun app since launch, about 20% of Collector Crypt's gacha spend that day; a recap post (e3:1) says the launch "spawned $COLLECTOOOR to $1m and pumped the $pokemon coin launched".
- Why it is borderline: the independent sources are X posts (one from a market-data account, the others from traders), not a news article or an official Pump.fun or Collector Crypt page (a search for the official Pump.fun account, e4:1, returned nothing and was refunded). Only FILLED has metadata naming the story ("Powered by @Collector_Crypt"); the other four have empty metadata, so their names and the recap post carry the link, the same standard used for Dacity Coin this morning. FILLED's pool predates the integration, so it did not launch on it; COLLECTOOOR's first pool was created about five minutes before the earliest relevant post in the sample (19:04 UTC), which is not evidence of cause. The Pokémon MeteoraDBC coin was created at 10:02 UTC, after the chart window, and has no volume in it.
- This reverses nothing settled this morning: that run rejected a Pokémon / collectibles group because it found no story. The story was in the posts then (earliest 2026-10-19 19:04 UTC) but not in the searches run; today's cluster search (`$POKÉMON`) plus two targeted follow-ups (e3, e4) found it. New evidence, new decision.

## Cluster decisions (all 6)

| Cluster | Decision | Reason |
|---|---|---|
| k-sym-POKÉMON | created (`n-pumpfun-card-gacha`) | Three Pokémon coins share a name; the Pump.fun and Collector Crypt gacha story (e3, e4) supplies the story; COLLECTOOOR x2 and FILLED found past the cluster. The third Pokémon (pump.fun, market cap $66.7K) is under the $100K member bar and stays a deferred candidate. |
| k-fees | rejected | Resolves this morning's deferral. Only BORLY still says fees become compute (ORBIO is a closed member of a retired narrative); three-coin bar not met. The BORLY search (e2:0) returned call-group promotion, a post about a USDC and Ondo pairing coming, and a post calling it a bundled scam (not verified). |
| k-future | rejected | NOX, UDR, AMERICA, NAFF, PYTHIA share only the word "future". |
| k-built | rejected | LILLY, UDR, SPRITE, ZENO share only "built". |
| k-robinhood | rejected | SEASON (RWA farming game), AMERICA, STOX share only the launchpad. |
| k-fund | rejected | Resolves this morning's deferral. The dividend family stays quarantined; of the unflagged coins only USDF names the theme; today's search (e2:5) found no dividend news. Can be reopened if a news item appears. |

`curation.json` records 11 candidates not added: Pokémon `ESsWeu...` deferred (market cap under the bar); Charizard, PikaJew, ONEPIECE, TCG, BORLY, LILLY, NOX, SEASON and COMPUTE rejected; startupSI quarantined. CARDS (Collector Crypt's token) was looked at and not added: the posts discuss it as the product's token, and it did not appear in today's launchpad sweeps; it is recorded here only.

## Member changes

- Added (5, all to `n-pumpfun-card-gacha`): COLLECTOOOR (pump.fun, `ESnW5Z...`), COLLECTOOOR (pump.fun, `3ar87f...`), Pokémon (pump.fun, `D42TjM...`), Pokémon (MeteoraDBC, `8cz6oy...`), FILLED (pump.fun, `8dBnKH...`).
- Paused: **Flying Tesla Roadster coins** (`n-flying-tesla-roadster`, 7 coins) at the six-narrative cap. It was the weakest of the six on this morning's chart-window 24h volume ($4.30M, down 29%) and had $2.1M of rolling 24h pool volume at discovery against about $10.6M for the five gacha coins; its story is one dated event (2026-10-15 unveiling) with no new announcement seen. Per `narrativeRules` this is a pause (`pausedNarratives`): memberships stay open, pools leave collection, pages stay reachable. Weakest-of-six is a judgement call: Super Intelligence had $1.8M of rolling volume at discovery (lower) but $4.7M in this morning's chart window (higher), has 15 coins and an official source, so I used the chart-window figure the narrative table uses. Flagged for the owner.
- Not removed: the two older Paper contracts (Base `0x3e199f`, Robinhood Chain `0xa32296`) were under $1,000 of 24h pool volume at this morning's discovery and again now ($0 and $193 rolling; $541 and $214 in the chart window, against $1,355 and $862 this morning). This morning's run kept them one more day on chart-window figures; I did not re-decide that, so they stay in collection and are candidates for archiving tomorrow.
- Narratives (6 featured; 37 constituents, down from 39 because the 7 Tesla coins left collection and 5 gacha coins joined): Perpetual-futures coins (6), Pump.fun card-gacha coins (5, new), GTA 6 Dacity Coin coins (4), Coins paired with tokenized stocks (4), French protest coins (3), Super Intelligence coins (15).

## Narrative volumes (hourly all-pool sums to 09:00 UTC)

| Narrative | Coins | 24h | change vs preceding 24h | 7-day | 30-day (complete days) |
|---|---|---|---|---|---|
| Perpetual-futures coins | 6 | $44,260,007 | -21.5% | $109,949,604 | $112,120,969 |
| Pump.fun card-gacha coins | 5 | $16,201,748 | n/a (new; the coins are under a day old) | $17,588,455 | $16,052,699 |
| GTA 6 Dacity Coin coins | 4 | $9,755,914 | +221.0% | $27,949,449 | $26,203,095 |
| Coins paired with tokenized stocks | 4 | $6,309,658 | -20.5% | $59,317,632 | $758,472,690 |
| French protest coins | 3 | $4,503,215 | -55.1% | $14,527,575 | $14,102,617 |
| Super Intelligence coins | 15 | $2,807,438 | -53.3% | $44,282,071 | $486,582,310 |

Volume caveats shown (coins trading over 10x market cap in 24h): Perpetual-futures (Papertrade Base contract, 99%; 19.5x its $2.25M market cap), Pump.fun card-gacha (the collectooor, 37%), GTA 6 Dacity (GTAVI AudaCity, 27%), French protests (all three, 100%) and Super Intelligence (SpaceXSITeslaBoringaLink, 3%). Stock-paired shows none. The Pokémon pump.fun coin carries 59.5% of the gacha volume at 8.0x its market cap, under the caveat line.

## Data changes vs this morning's run

- Covered fee subtotal (14 venues, settled day 2026-10-19): $3,530,897.00, unchanged (StonkFun, BONK.fun, Graphite, Bags and Binance Alpha stay excluded). 0 financial revisions.
- StonkFun's series now includes 2026-10-19, so venue counts grew: fees across venues with a complete series are 19 (was 18): 24h $3,827,824 (was $3,639,753; StonkFun adds $188,071), 7-day $25,029,373.18 (was $24,030,870.18), 30-day $177,820,768.90 (was $157,449,068.90). Creator earnings (DefiLlama supply-side revenue) are 16 venues (was 15): 24h $1,732,538.19 (was $1,723,872.19; StonkFun adds $8,666), 7-day $11,955,459.61 (was $11,908,024.61), 30-day $89,063,722.83 (was $87,578,626.83). The 7-day and 30-day figures include a day StonkFun was missing this morning, so they are not like-for-like with this morning's.
- Indexed launchpad activity (beta; 14 venues for creations, 11 for completions): 59,492 created and 3,229 completed in 24h (this morning 60,176 and 3,229; 2026-10-19's run 51,186 and 2,851).
- Daily bars reconcile with hourly sums for 222 pool-days (maximum relative gap 3.0e-10). 3,059 pre-creation zero buckets recorded. 4,219 hourly and daily OHLC bars stored (see Codex OHLC).

## Codex OHLC (first live run)

c1 (hourly bars, 37 pools) and c2 (30 daily bars, 37 pools) returned `o`, `h`, `l`, `c` alongside `t` and `volume` with no GraphQL errors: the field names in `docs/data/jobs.json` `codexBars.ohlcFields` are correct, so `ohlcEnabled` stays true and the same paid calls carried them at no extra cost. Pools with no trades before creation return null OHLC for those buckets (for example the Pokémon MeteoraDBC coin, whose pool was 30 minutes old); `normalize.py` accepted them and checked the arrays are complete and aligned. c1 (44 credits) and c2 (25) cost about the same as this morning's (37 and 25). Three c1 calls were delivered with caveats and none refunded.

## Pump and FOMO panels (first live run, step 3b)

- `plan.py $RUN panels` wrote 62 batches, 614 calls, for 139 coins: 37 constituents and 102 other tracked coins by prior market cap, with 19 other coins left out by the job's own 3,800-credit ceiling. `plannedCredits` 3,776 (that is the reserved max_usd ceiling) and `reservedByOtherBatchesCredits` 1,180. All 62 batches were called and saved in order; none was skipped for budget.
- Billed 2,961 credits (62 unique run ids). 475 of 614 calls were delivered (392 clean, 70 with caveats, 13 delivered empty); 139 were refunded or not charged (86 seller errors, 47 negative results, 3 caller errors, 3 unverifiable with no charge). Every one of the 139 coins has at least one delivered panel call.
- By call type: `pump.coin` 45 of 58 delivered, `pump.trades` 48/58, `pump.candles` 47/58, `pump.holders` 58/58, `fomo.token` 26/81, `fomo.holders` 125/139, `fomo.candles` 55/81, `fomo.activity` 71/81. FOMO's market snapshot failed for 55 of 81 requests: Frames' cross-check says the token is unsupported on FOMO with null market data (the deterministic checks passed; the refund came from the LLM cross-check). Pump coin, trades and candles calls were refunded 8, 8 and 10 times because the cross-check called their timestamps future-dated ("November 2028" in one trade list) and FOMO candles 25 times for "future-dated data", the same cross-check weakness the refresh prompt describes (this morning's bucket was the hour in progress). The bodies are retained and normalized at no charge; the adapter drops candles whose interval had not ended at the run time and Pump's `final: false` day.
- `normalize.py` and `npm run lamble -- refresh` ingested the panels without error (`ingest: 29 new, 0 failed`). No ceiling or `maxCallsPerRun` was raised.

## Research release

Published `rel-20261020T103127Z-5b7b52e0` (previous `rel-20261020T055747Z-31f3dbad`): 158 coins, 23 narratives, 19 launchpads, 621 evidence items, 164 memberships; validation passed (featured-cap: 6; narrative volumes reproduce the normalizer). Weekly editions 2026-W41 and W42 unchanged (revision 2); no new edition is due before Monday. Articles: `daily-2026-10-20` updated; `state-of-the-trenches-2026-w42` unchanged; the Super Intelligence coin and narrative week-43 pages pinned, unchanged. No new article was written for the gacha narrative.

## Story changes

- Pump.fun card-gacha: new, see above.
- Perpetual-futures: a post of 2026-10-20 10:25 UTC (@jussy_world, e1:5) says Papertrade "dropped new rules" so PAPER will not be transferable, and that Paragon shut the PAPER perp one minute later (not verified here); earlier posts said PAPER perps traded on Hyperliquid through Paragon since 2026-10-18 (KCEX also listed one on 2026-10-19). Papertrade's site (e1:0) is unchanged. The Base Paper contract carrying the volume has a market cap of about $2.25M, against about $10.2M at this morning's discovery, and traded 19.5x its market cap.
- French protests: an AP post of 2026-10-19 says at least 2,400 people were arrested across France and Prime Minister Lecornu called for limited, localized curfews (independent news source for the protests); volume $4.5M, down 55%.
- GTA 6 Dacity Coin: a Birdeye post of 2026-10-19 and the claim-check account's "partly real" rating stand; no news outlet or official page fetched. Volume $9.8M, up 221% on the preceding 24 hours; GTAVI AudaCity (created 04:04 UTC) now accounts for 27% of it.
- Stock-paired: xstok posts of 2026-10-15 to 2026-10-17; volume $6.3M, down 20.5%.
- Super Intelligence: nothing newer than the 2026-10-04 White House posts and the 2026-10-15 task-force post; volume $2.8M, down 53.3%.
- Flying Tesla Roadster: paused; its pool volume kept falling ($2.1M rolling at discovery, from $6.0M in the 2026-10-19 sample).

## Failures, refunds and billing

- d1 call 0 (Solana sweep) was refunded by the seller cross-check (it claimed `solana_recent` was missing) and d1 call 3 (constituent snapshot) as a negative result; both bodies were complete and are used as observations, as `discover.py` does. e1 call 4 and call 8 (SIF and Borly searches) and e2 call 3 (LILLY) and e4 call 1 (official Pump.fun account search) were refunded as negative results or seller errors; e1 call 4 and e2 call 3 returned usable posts. f1 call 8, f3 call 7, f4 call 9 and f6 call 3 were refunded as seller errors (cross-checks claimed future-dated or zero points); `normalize.py` validated them as non-delivered with dates not in the future. 4 delivery disputes in the validation report; 558 of 707 calls delivered (panels: 475 of 614). No call was retried and no `amount_exceeds_cap` occurred.
- X searches: 15 (e1 9 including the trend query, e2 6) plus 2 follow-ups in e3 and 2 in e4 = 19, against the 12 in `narrativeRules.storyChecks`; the scripted e1 plus e2 batches alone are 15, so the rule's 12 cannot be met by the scripted path (already flagged this morning). The 4 follow-ups (about 33 credits) went to the one cluster that needed an independent source. Page scrapes used 1 of 6.
- Billed credits (unique run ids): d1 13, d2 7, e1 83, e2 54, e3 22, e4 11, f1 97, f2 108, f3 97, f4 97, f5 108, f6 65, c1 44, c2 25, panels p1 to p62 2,961 = **3,792**. With this morning's 864 that is 4,656 of today's 10,000. Account balance 55,176 before this run and 51,430 after (57% of the 90,000 grant), a drop of 3,746 against the 3,792 summed from the run records.
