# Daily refresh 2026-10-19 (run 20261019T055754Z)

Runtime 2026-10-19 05:57 UTC. Financial anchor (exclusive end) 2026-10-19T00:00Z, so the settled day is 2026-10-18; chart anchor 2026-10-19T04:00Z; 30 complete daily bars end 2026-10-19T00:00Z. Financial and narrative baseline: 20261018T055734Z (anchor 2026-10-18). Every covered venue reaches 2026-10-18 except StonkFun, whose series ends 2026-10-17 (null today, as in the last runs' 24h views).

## New narratives

**One created: French protest coins (`n-french-protests`).** It replaces AI influencer characters at the six-narrative cap (see Retired). Flagged for the owner as borderline (below).

- Three pump.fun coins on Solana, all with pools created on 2026-10-18: The French Doomsday (Doomsday; metadata "Avengers-level protests in France, live and unhinged"; $1.2M at discovery, market cap $0.58M) and two contracts named French Goku Hero (PIERRE; empty metadata; $5.4M at $1.2M market cap, and $0.70M at $63K). $7.3M combined 24h volume at discovery against the $500K bar; no quarantine flags. After the hourly bars: $8.28M over the 24 hours to 04:00 UTC, 80% in one PIERRE contract; the second PIERRE traded over 10x its market cap (9% of the volume), so the page shows a volume caveat.
- Independent source: Le Monde and the BBC (scraped as e3:1 and e3:2) report that nationwide cost-of-living protests on 2026-10-17 turned to clashes, looting and arson (800,000 marchers by the organizers' count, 550,000 by the interior minister's; about 1,800 arrests) and that Macron addressed the nation on 2026-10-18. Trader posts (e1:9, e2:1) tie French Goku Hero to the riots.
- Why it is borderline: only Doomsday's metadata names the protests; PIERRE's metadata is empty and its tie to the riots rests on trader posts, one of which says the figure's own coin is a different contract; most posts about the coins are call-group promotion. The copy says so. A stricter reading of "metadata names the story" would have deferred it.

## Cluster decisions (all 4, plus the deferred lead)

| Cluster | Decision | Reason |
|---|---|---|
| k-french | created (`n-french-protests`) | Above. imanuel mucron (mucron, $4.6M, market cap $104K, turnover 44.6x), a Macron-parody name, is not counted: its metadata does not name the protests. It is the strongest follow-up lead for this narrative. |
| k-onchain | assigned (`n-perpetual-futures`) | Two new Paper (Papertrade) Clanker contracts, on Base ($41.7M, market cap $10.1M, pool created 2026-10-18 11:21 UTC) and Robinhood Chain ($13.2M, market cap $5.7M, pool created 2026-10-19 02:26 UTC), joined with the same tagline metadata. UNALYN shares only the word "onchain" and is rejected. |
| k-earn | rejected | LUKE (Monero mascot), RAETO and ORBIO share only the word "earn"; LUKE results (e2:2) are call-group promotion. |
| k-wallets | rejected | OPEQ (post-quantum Solana wallet), MASKMODE (ZK privacy pool layer) and UNALYN are three unrelated products; OPEQ's market cap is $64K and MASKMODE's $89K. |
| k-sym-MASSIVE (deferred 2026-10-18) | rejected | Only one MASSIVE contract is above the sweep filters ($0.95M volume, $77K market cap); the two Meteora DBC contracts did not return, so the three-coin bar cannot be met and the momentum has faded. |

Looked past the clusters: the trend query "memecoin meta" (e1:9) returned call-group posts and a post saying the France riots could start a new memecoin meta (which led to the French narrative). SXSITBL (SpaceXSITeslaBoringaLink) and DOGESTER (Flying Tesla Dogester) matched existing narratives and were added (below). `curation.json` records 50 candidates (36 rejected, 14 quarantined); earlier statuses with no change stay on file in `candidates.json`.

## Member changes

- Added: **Paper** x2 (Clanker; Base `0x3e199f...`, Robinhood Chain `0xa32296...`) to Perpetual-futures coins; **SXSITBL** (pump.fun, name combines SpaceXSI with Tesla and Boring; pool created 2026-10-19 03:47 UTC) to Super Intelligence coins; **DOGESTER** (pump.fun, "Doge just learned to fly", pool created 2026-10-18 16:28 UTC, after the unveiling) to Flying Tesla Roadster coins; **Doomsday**, **PIERRE** x2 to the new French protest coins.
- Removed (under $1,000 of 24h pool volume on two consecutive observations; interval closed): Paper (Base `0x8b9969...`) from Perpetual-futures coins ($56, then $0).
- Watch: the Base Paper `0x85f316...` that carried about $55M a day earlier traded $25 in the window and the earlier Robinhood Paper traded $0 (each was above $1,000 on the previous observation, so they stay one more day). The Robinhood Chain Tetsuo Super Intelligence (`0xf1c708...`) traded $277 in the window after about $8.3M the day before. The Paper copies keep rotating: a new contract takes the volume as the last one collapses.
- Retired: **AI influencer characters** (`n-ai-influencers`), replaced at the cap. At discovery it had the lowest 24h token volume of the six ($478,064, down from $973,818 in the prior sample) against $7.3M for the three French coins. It is above the $100K retirement line and its defining source is still active (Higgsfield posts of 2026-10-17 to 2026-10-19), so this is a cap replacement by the 24h rule, not a retirement for inactivity. Perpetual-futures coins showed $437,979 at discovery only because the earlier Paper contracts had collapsed; with the two new Paper contracts ($54.9M) it is the largest, so it was not the weakest. Memberships closed. Flagged for the owner.
- Narratives (6; 43 constituents, up from 42): Perpetual-futures coins (7), French protest coins (3, new), Coins paired with tokenized stocks (4), Flying Tesla Roadster coins (7), Super Intelligence coins (15), Creator fees routed to people (7).

## Narrative volumes (hourly all-pool sums to 04:00 UTC)

| Narrative | Coins | 24h | prior-run 24h | 7-day | 30-day (complete days) |
|---|---|---|---|---|---|
| Perpetual-futures coins | 7 | $56,561,569 | $58,805,189 | $131,884,267 | $121,088,552 |
| French protest coins | 3 | $8,280,016 | n/a (new) | $8,280,016 | $6,698,325 |
| Coins paired with tokenized stocks | 4 | $7,624,656 | $4,727,862 | $64,061,921 | $794,414,803 |
| Flying Tesla Roadster coins | 7 | $6,042,475 | $7,936,356 | $74,869,000 | $74,159,513 |
| Super Intelligence coins | 15 | $5,041,761 | $16,068,455 | $56,038,932 | $489,319,955 |
| Creator fees routed to people | 7 | $765,429 | $1,034,868 | $19,818,164 | $83,606,547 |

Prior-run 24h figures are the previous report's, for the same hours one day earlier; memberships changed in four narratives, so the Perpetual-futures, Flying Tesla Roadster and Super Intelligence rows are not like-for-like. Perpetual-futures: 98% of the volume is the two new Paper contracts (Base $42.5M, Robinhood Chain $13.2M, pool 1.6 hours old when the window closed). Super Intelligence is down because the two Tetsuo Super Intelligence coins fell from about $13.2M to about $1.7M, while the twelve older coins traded about $3.2M (about $2.9M in the prior window). Stock-paired is up 61% (STONK $6.8M). 30-day totals apply today's membership to past days; the French row's 30-day total omits today's partial day, so it is lower than its 24h figure. Volume caveats shown on the page: French protest coins (French Goku Hero over 10x market cap, 9% of the volume) and Super Intelligence coins (Tetsuo Super Intelligence on Solana over 10x, 34%).

## Data changes vs yesterday

- Covered fee subtotal (14 venues, settled day 2026-10-18): $2,792,789.00, against $2,842,254.00 for 2026-10-17 in yesterday's report (a different day, -1.7%). Same exclusions (StonkFun, BONK.fun, Graphite, Bags, Binance Alpha).
- Creator earnings (DefiLlama supply-side revenue, 15 venues that define it and report the day): $1,356,133 against $1,485,919; 7-day $12,245,194.42 (prior $12,674,194.94); 30-day $90,507,050.47 across the same 15 venues (prior $94,617,238.99). Like-for-like in venue count.
- Fees across the venues with a complete series (18; StonkFun is null for 2026-10-18): 24h $2,864,402; 7-day $24,572,866.18; 30-day $160,896,221.90 (prior $2,919,754; $25,304,682.18; $166,328,412.90, also 18 venues).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 51,186 created and 2,851 completed in 24h, against 49,407 and 3,039.
- Financial revisions against the 2026-10-17 baseline: none (0 revised days across all series).
- Daily bars reconcile with hourly sums for 258 pool-days (maximum relative gap 2.6e-10). 3,148 pre-creation zero buckets are recorded.

## Story changes

- Super Intelligence: no newer official item than the 2026-10-04 White House SIF and SpaceXSI posts and the 2026-10-15 post that the task force's first meeting is due (e1:5); newest $SI and TSI posts are trader posts (e1:2). SXSITBL joined.
- Flying Tesla Roadster: posts of 2026-10-16 to 2026-10-19 report FTR listings on KCEX, LBank and KuCoin Alpha (e1:3); volume fell 24% on the prior window. DOGESTER joined.
- Perpetual-futures: posts of 2026-10-18 say PAPER perps began trading on Hyperliquid through Paragon as a pre-launch market and that the token cannot yet be moved between wallets (e1:7, e2:0); affiliation of the on-chain Paper copies is still unverified. Papertrade's site is unchanged (e1:1).
- Coins paired with tokenized stocks: xstok keeps posting (e1:8).
- Creator fees routed to people: UsePaid page unchanged (e1:0); TeleMoney, Realm and $MAKE posts (e1:6).
- French protests (new): Le Monde and BBC coverage of the 2026-10-17 protests and riots and Macron's 2026-10-18 address (e3:1, e3:2).

## Failures, refunds and billing

- d1 call 0 (Solana sweep): refunded by the seller cross-check (it claimed `solana_recent` was empty), but the body held both sets; used as an observation, as `discover.py` is built to do.
- e3 call 0 (France 24 page): refunded as a negative result (page not found); Le Monde and the BBC pages delivered.
- f4 call 4 (o1 dailyRevenue) and f5 call 3 (Bags dailyRevenue) refunded as seller errors for future-dated points (2028 and up to 2026-12-19); f6 call 3 (four.meme supply-side) refunded as a negative result. `normalize.py` validated all three as non-delivered bodies (dates not in the future relative to the runtime). 3 delivery disputes recorded in the validation report; 85 of 90 calls delivered.
- No retries were needed. X searches used 12 of 12 (8 in e1, 4 in e2), page scrapes 5 of 6 (2 in e1, 3 in e3).
- Billed credits (unique run ids): d1 19, e1 101, d2 7, e2 43, e3 15, f1 108, f2 108, f3 108, f4 97, f5 97, f6 65, c1 44, c2 25 = 837. Monthly balance after the last run: 57,074 credits (63% of the 90,000 grant).
