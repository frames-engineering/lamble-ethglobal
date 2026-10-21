# Daily refresh 2026-10-21 (run 20261021T055751Z)

Run time 2026-10-21 05:57:51 UTC. Financial anchor (exclusive end) 2026-10-21 (last settled day 2026-10-20; StonkFun only to 2026-10-19). Chart anchor 2026-10-21 04:00 UTC. Prior run for the normalizer: 20261020T103127Z (earlier financial anchor, so it is both the financial and the narrative baseline). Release published: rel-20261021T055751Z-1894577a.

## New narrative

**n-kimchi-pumpfun, Kimchi coins** (created; 2026-10-21 24h volume $19.78M, five coins). The story: posts of 2026-10-20 and 2026-10-21 say the trader known as @kimchi1x joined Pump.fun. Sources: a reply from @kimchi1x's own account to @Pumpfun at 00:00 UTC on 2026-10-21 reading "let's work" (e3:0); a Pump.fun Ecosystem post that he "BEAT his $40M Trump trade in 1 HOUR after joining Pumpfun" (e3:0); the kimchlsol post (04:20 UTC) committing 75% of the $KIMCHI supply to a distribution for community members (e2:1; unverified). One post disputes the wallet linked to him (e3:0).

Constituents (each qualifies on its own metadata naming Kimchi; none is tied to Kimchi by a source):

| Coin | Launchpad | Metadata | 24h chart-window volume |
|---|---|---|---|
| Aura Final Boss (Kimchi), 0xbca6f3... | Clanker V4, Robinhood Chain | symbol Kimchi, description "Aura Final Boss" | $11.67M (59.0%) |
| Aura Final Boss (Kimchi), 9EQbGT... | pump.fun | symbol Kimchi, description "official kimchi coin" | $2.85M (14.4%) |
| Aura Final Boss (Kimchi), Am8iBf... | pump.fun | description names @kimchi1x; pool from 2026-07-27, predates the story | $2.58M (13.0%) |
| Kimchi Boss (KIMCHIBOSS), AMuS3K... | pump.fun | name Kimchi Boss | $1.78M (9.0%) |
| kimchi, De5V2N... | pump.fun | name and symbol kimchi, no description (weakest link) | $0.90M (4.6%) |

Not counted: the pump.fun contract that posts name (CSocnz..., $36.7M market cap), a Kimchi Coin contract (7thgKg...) and a third Aura Final Boss contract (A9ZPgW...) are quarantined (extreme 24h move flag, pools 6 to 7 hours old). The Robinhood Chain Kimchi pool traded only in the 00:00 and 01:00 UTC hours of 2026-10-21 and recorded nothing from 02:00, and the others faded by 03:00 UTC. Borderline: the name Kimchi is the story's own name rather than a shared theme word, but the narrative measures lookalike and older contracts, not the coin the posts discuss.

## Cluster decisions (13, all recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-kimchi | created (n-kimchi-pumpfun) | Four coins named Kimchi plus the older Aura Final Boss; independent posts above; $17.5M of rolling 24h volume at discovery. |
| k-boss | assigned (n-kimchi-pumpfun) | The Aura Final Boss Kimchi coins and Kimchi Boss; BREZ (Course Final Boss) shares only the word Boss. |
| k-final | assigned (n-kimchi-pumpfun) | Two of four are the Kimchi coins; HEYI and BREZ share only the word Final. |
| k-onchain | assigned (n-perpetual-futures) | Only Papertrade (Paper, Clanker V4, Base) belongs: its metadata describes the fully onchain perpetual exchange. GH0ST and TimQ share only "onchain". |
| k-sym-PHP | **deferred** | Four PHP-UP-2026 coins (pump.fun x1, MeteoraDBC x3; pools 12 to 42 minutes old; $5.0M rolling 24h volume; caps $155K to $460K; no quarantine flag) meet the coin, volume and source bar: the name is the title of the leaked PHP exploit write-up, php.net announced an emergency security release for CVE-2026-109618 and CVE-2026-109619 for 14:00 UTC on 2026-10-21, and Cloudflare and security researchers confirm (e3:2). Deferred because the narrative cap is full, the weakest narrative (Flying Tesla Roadster, $1.25M) was just resumed by the owner's decision, and the pools are under an hour old. Re-check next run. |
| k-money | rejected | Shares only the word money (MONEYBIZ is a capuchin meme and a trader calls it a bundled scam). |
| k-agent | rejected | Agent ID, Alchemist AI, Factor: no common story. |
| k-earn | rejected | QUANTS (NFT launchpad), Orbio.so and Raeto (removed earlier): no common story. |
| k-fees | rejected | Different fee-sharing designs; nothing ties them to one story. |
| k-paired | rejected | 589 is paired with XRP, not a tokenized stock; Nvidia Paired Cat (NPC) has only a name suggesting the pairing and is a deferred candidate. |
| k-future | rejected | BFC, POFD, NAFF share only the word future. |
| k-binance | rejected | Three Binance-themed Flap coins with different pitches; no independent source. |
| k-agents | rejected | Alchemist AI, TimQ, Factor: no common story. |

The previous report's deferred lead (the third Pokémon on pump.fun, ESsWeu...) belonged to the retired card-gacha narrative and closed with it. The Borly/ORBIO AI-compute search returned no posts this run (e1:7 negative result); the earlier decisions stand.

## Owner decision applied (2026-10-20, settled)

- **n-pumpfun-card-gacha retired** with the reason "created without meeting the newNarrative bar: only one constituent (FILLED) has metadata or an official source naming the story". Its five memberships are closed and its pools removed from poolUniverse.
- **n-flying-tesla-roadster resumed**: its seven pools are back in poolUniverse and it is out of pausedNarratives. The normalizer had no way to restore a paused narrative, so I added `curation.resumedNarratives` (restores the record and evidence from run 20261020T055747Z) and fixed the lifecycle rebuild in `scripts/lamble/ingest.ts`, which left the earlier pause open when a narrative was collected again (the release showed it paused).

## Other narrative changes

- **n-french-protests paused** at the six-narrative cap so Kimchi can be featured: lowest 24h volume of the active six at discovery ($333K, down from $4.5M), one dated story (the 2026-10-17 protests). A pause, not a retirement: memberships and pages stay.
- **n-perpetual-futures**: added Paper (Papertrade, Clanker V4, Base, 0xb3552e...; pool created 2026-10-20 10:45 UTC; $54.8M, 99.8% of the narrative's volume; metadata "trade with up to 1000x leverage and 0 slippage, on the first fair launched fully onchain perpetual exchange"; BingX listing post of 2026-10-21 in e3:3, no post names the contract). Archived (collection stopped, membership open) Paper Base 0x3e199f... and Paper Robinhood 0xa32296...: under $1,000 on two consecutive observations.
- **n-super-intelligence**: archived 四 (four.meme) on the same rule.
- No coins were removed by evidence of contradiction.
- Candidates looked at and not added: 19 recorded in curation.json (3 quarantined Kimchi contracts, 4 deferred PHP coins, NPC deferred, 11 rejected).

## Data changes vs yesterday (run 20261020T103127Z)

Anchors: financial 2026-10-21 (all venues through 2026-10-20 except StonkFun through 2026-10-19, so StonkFun's windowed figures are null today); chart 2026-10-21 04:00 UTC; daily bars through 2026-10-21 00:00 UTC (30 days, 234 daily/hourly reconciliations, max relative gap 3e-10).

- Covered fee subtotal (14 included venues): **$3,505,868** against $3,530,897 (-0.7%).
- Indexed launches 24h: **59,245** against 59,492 (-0.4%); completions 24h: **3,272** against 3,229 (+1.3%). 14 creation venues, 11 completion venues.
- Windowed sums over launchpads with data (StonkFun removed from yesterday's figures for a like-for-like comparison; sums add overlapping venues, so they are not a de-duplicated market total):

| Window | Fees | Revenue | Creator earnings (15 venues measured) |
|---|---|---|---|
| 24h | $3.59M (-1.3%) | $1.82M (-5.2%) | $1.78M (+3.1%) |
| 7d | $23.85M (-0.8%) | $12.03M (-0.7%) | $11.81M (-0.8%) |
| 30d | $154.42M (-1.9%) | $69.31M (-0.8%) | $85.10M (-2.8%) |

pump.fun creator earnings $623,553 (24h; $647,978 yesterday), Flap $565,586 ($538,109), Pons $454,937 ($369,509).

- Narratives (24h chart-window volume, change on the preceding 24h window, 30-day volume of current members):

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Perpetual-futures coins | 5 | $54.92M | +24.1% | $111.2M |
| Kimchi coins (new) | 5 | $19.78M | n/a (preceding window $0.24M) | $7.3M |
| GTA 6 Dacity Coin coins | 4 | $11.89M | +82.4% | $40.4M |
| Coins paired with tokenized stocks | 4 | $10.05M | +54.8% | $728.0M |
| Super Intelligence coins | 14 | $3.72M | -21.2% | $479.6M |
| Flying Tesla Roadster coins (resumed) | 7 | $1.25M | -71.0% | $80.2M |

Volume caveat shown: GTA 6 Dacity Coin coins (GTAVI AudaCity and Dacity Coin traded over 10x their market cap; 23% of the volume).

## Story changes

- Perps: Papertrade posts of 2026-10-19 to 2026-10-20 say the Hyperliquid pre-launch PAPER perp was halted after Papertrade said the token would not be transferable and settled at $0.0263 after about $15M of volume (e1:4, unverified); BingX lists $PAPER perps (2026-10-21, e3:3). The earlier Base copy contracts faded and a new one took the volume.
- Stock-paired: 2026-10-20 posts say the XSTOK launchpad went live on Solana, got a CoinGecko listing and migrated (e1:5).
- Super Intelligence, GTA 6 Dacity Coin: no newer posts than 2026-10-15 to 2026-10-19.
- Roadster: no new announcement or listing.
- French protests (paused): A DropSite News post of 2026-10-21 reports the government blaming "ultra-left" agitators (the Black Bloc) for turning Saturday's protests of over 500,000 people into rioting (e1:2).

## Failures and refunds

- 712 calls requested, 563 delivered; 149 not delivered and refunded ($0): panels 142 of 615 (85 seller errors, 54 negative results, 2 caller errors, 1 undocumented; mostly FOMO token/candle lookups and some Pump candles/trades), f2:6 (bonk.fun dailyRevenue) and f6:0 (basestonk dailySupplySideRevenue), both seller errors for future-dated rows (the two disputed deliveries in validation-report.json; neither figure is used), d1:0 and d1:1 (the two 72h "recent" sweeps returned nothing / were omitted), c1:3 (Robinhood hourly bars, labelled negative_result but complete data, used), e1:7 and e2:8 (no useful posts).
- Gap: with the "recent" sweeps empty, discovery of coins created in the last 72h relied on the active (top-volume) and trending sweeps. The Kimchi coins appeared there; coins under the $10K liquidity floor or outside the top 100 would be missed.
- No price-change (amount_exceeds_cap) failures. Codex accepted the OHLC fields (4,954 OHLC bars).

## Panels (Pump and FOMO)

62 batches (p1 to p62), 615 calls planned and called, covering 139 coins (39 constituents and 100 other tracked coins by market cap; 25 further coins skipped by the plan's ceiling, none for the daily budget). Planned 3,782 credits (ceiling 3,800; reserved by other batches 1,130); billed 2,948 credits after refunds. No batch was skipped.

## Billing

Sum of billing.charged_credits over 75 unique run ids: **3,858** credits (discovery d1/d2 20; evidence e1/e2/e3 234; DefiLlama f1 to f6 594; Codex c1/c2 62; panels 2,948). Non-panel part 910 (limit 1,200); total under the 5,000 dailyCreditCeiling and the 10,000 authorization. Account balance 51,079 before the run, 47,266 after (percent remaining 53).

## Checks

tsc, lint, node tests for frames-data (12), build: pass. `npm test` (the wider suite) has one failing test, "article figures are the release's figures" (tests/lamble/research.test.ts): it expects a Super Inu peer with a 7-day return, and today none exists because the observation store has no 2026-10-14 snapshot (no run that day), so no price falls within 12 hours of seven days back. It resolves on its own once a snapshot seven days old exists.
