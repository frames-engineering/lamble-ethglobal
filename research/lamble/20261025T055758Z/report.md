# Daily refresh 2026-10-25 (run 20261025T055758Z)

Run time 2026-10-25 05:57:58 UTC. Financial anchor (exclusive end) 2026-10-25 (last settled day 2026-10-24; StonkFun published through 2026-10-23 and has no windowed figures). Chart anchor 2026-10-25 04:00 UTC; daily bars through 2026-10-25 00:00 UTC (30 days). Prior run for the normalizer: 20261024T055759Z (earlier financial anchor, so it is both the financial and the narrative baseline). Release published: rel-20261025T055758Z-0e6b5b6d. Not a Monday, so no weekly edition was frozen; the 2026-W41 and 2026-W42 editions are unchanged, and the daily article daily-2026-10-25 was written.

## New narratives

**None created.** The one cluster `discover.py` reported and the leads found by reading the posts did not meet `narrativeRules.newNarrative`:

- **BILLIONS ticker** (cluster k-sym-BILLIONS, rejected). Five coins with the ticker BILLIONS (four on Meteora DBC, one on pump.fun), all created 0 to 1 hour before discovery, $12,467,912 combined rolling 24h volume (BILLIONS 4.46M, 3.23M, 2.91M, 1.54M and 0.33M). Only one has any metadata ("billions on stonk must billions"). The X searches (e2:0, e3:0, e3:1) found one anonymous account (@simontheguyman, 2026-10-25 04:53 UTC) saying Trump "dropped a ticker" on Truth Social, and other accounts pointing to two different contracts (CnKbRo1r..., which one poster calls a two-year-old $Billions, and 9uNgkU..., created an hour before discovery). The only Trump text in the results is a post relayed by a commentary account that uses "$Billions" as dollars about Iran, and a search of Trump's own X account returned no post naming a coin. No independent public source names any of the five coins and the metadata names no story: the evidence bar is not met. Strongest lead today by volume; re-check tomorrow.
- **Oil and dividend fund coins** (USDF, NODF, NOTF, XTO, USOE; deferred for a fourth day). NODF, NOTF, XTO, USOE and several USDF copies carry extreme-move or implausible-cap flags today; one unflagged coin remains, USDF (3PGHr2..., "Official United States Dividend Fund.", $354,447, 266 hours old). A story-check search for the fund names (e3:2, 7 posts) returned only scanner, airdrop-spam and call-group posts from 2026-09-17 to 2026-10-22 and no news or official source. Below the three-coin and independent-source bars.
- **Cat-with-a-sword memes** (SWORDOPE $4.89M, CATTLEAXE $3.69M, plus the older swordcat). Found by reading the candidate list, not by a cluster. The posts (e3:3) are call-group promotions and one scam alert (CATTLEAXE supply "fully bundled", unverified); each coin's metadata describes a different character; no news or official source. Rejected.
- **OpenAI (robinhood, Clanker, $10.1M, 3.5 hours old)**: a generic OpenAI blurb, not an inference market or credits. Rejected as unrelated to the AI inference narrative.
- **Chunkee** (pump.fun, "Leonida's wetland boss"): mentions GTA 6's setting but not Dacity Coin; rejected on the same ground as Peekhole and Macca.

## Cluster decisions (1, recorded in curation.json)

| Cluster | Decision | Reason |
|---|---|---|
| k-sym-BILLIONS | rejected | Five young coins share only the ticker; one has metadata; the Trump-ticker claim comes from one anonymous account and no independent source names the coins (e2:0, e3:0, e3:1). |

Two previously deferred leads were re-evaluated and recorded in `candidates`: USDF (3PGHr2...) stays deferred (fourth day, no independent source) and the Kimchi contract the posts name (CSocnz...) stays deferred and quarantined from an earlier run, with the Kimchi narrative still paused. 58 candidate records were added (new coins looked at and not added, 6 of them quarantined by the flags).

## Member changes

- **n-gta6-dacity-coin**: added **DacityCoin** (pump.fun, 4rYsDH...; empty description, the name carries the story). Token created 2026-10-15 13:18 UTC (four days after the 2026-10-11 post, so it launched on the story), $382,827 rolling volume, $128,344 market cap, no flag. It was in no earlier candidate record. Now four coins. Dacity Coin on Pons (0x6d8933...) traded $490 in the discovery sweep (it was $2,960 on 2026-10-24) and $483 in the chart window: one observation under the $1,000 removal rule, so it is archived tomorrow if it stays under.
- **n-perpetual-futures**: added **Papertrade (Paper, Clanker V4, Base, 0xbec0c6...)**, a new copy of Papertrade's tagline ("trade with up to 1000x leverage and 0 slippage, on the first fair launched fully onchain perpetual exchange"), token created 2026-10-24 07:25 UTC, $53,374,993 volume, $10,201,720 market cap (5.2x turnover, price +920% in 24h), no flag. It meets the written member bars on its metadata, as the earlier Paper copies did, but no post names the contract and the earlier copies lost their volume within two days (flagged for the owner). The Robinhood Chain Paper (0x179b22...) that carried the volume yesterday shows $0 in the sweep and the chart window: first observation under $1,000. Now seven coins.
- **n-ai-inference-markets**, **n-stock-paired-coins**, **n-php2shell**, **n-super-intelligence**: no member changes. ACTII (Super Intelligence) was $103 yesterday and $1,002 today, so it is not archived.
- Retired: none. Removed by contradicting evidence: none. Archived: none. Paused: Kimchi coins stay paused (no change).

## Data changes vs yesterday (run 20261024T055759Z)

- Covered fee subtotal (14 included venues): **$2,658,348** against $3,334,142 (-20.3%).
- Indexed launches 24h: **48,371** against 55,445 (-12.8%); completions 24h: **2,890** against 3,199 (-9.7%). 14 creation venues, 11 completion venues.
- Windowed sums over launchpads with data (sums add overlapping venues, so they are not a de-duplicated market total):

| Window | Fees | Revenue | Creator earnings (15 venues measured) |
|---|---|---|---|
| 24h | $2.71M (-23.4%) | $1.40M (-23.1%) | $1.32M (-23.7%) |
| 7d | $23.59M (-1.6%) | $12.47M (-1.5%) | $11.12M (-1.7%) |
| 30d | $138.63M (-2.5%) | $65.64M (-1.6%) | $72.98M (-3.2%) |

pump.fun creator earnings $434,725 (24h; $515,462 yesterday), Flap $618,220 ($644,735), Pons $208,551 ($334,161). The daily fee drop is broad (pump.fun -16.1%, Pons -37.2%, LaunchLab -83.7% and Bonk.fun -82.7% after their 2026-10-23 spikes); DefiLlama's 2026-10-24 point equals its own total24h for each venue, so it is a complete day, not a partial one.

- Narratives (24h chart-window volume to 04:00 UTC, change on the preceding 24h window, 30-day volume of current members):

| Narrative | Coins | 24h | Change | 30d |
|---|---|---|---|---|
| Perpetual-futures coins | 7 | $54.19M | +2,033.7% | $89.17M |
| Coins paired with tokenized stocks | 5 | $12.38M | +24.3% | $540.72M |
| GTA 6 Dacity Coin coins | 4 | $10.37M | +164.8% | $68.29M |
| Super Intelligence coins | 13 | $3.09M | +35.6% | $441.71M |
| AI inference market coins | 3 | $0.78M | -33.5% | $158.63M |
| PHP2Shell coins | 4 | $0.41M | -57.5% | $20.90M |
| Kimchi coins (paused, 6 coins) | not collected | last featured $61.12M on 2026-10-23 | | |

Volume caveat now shown: **Perpetual-futures** ("Virtual Trade traded over 10× its market cap in 24h (1% of this volume)"; Virtual Trade traded $766K on a $3.6K market cap). The much larger perps headline is not a caveat case by the 10x rule (the new Base Paper is 98.5% of it at 5.2x its market cap) but is one young copy contract's trading, and the story text says so. No other narrative shows a caveat.

## Story changes

- **Perpetual-futures**: newest $PAPER post (2026-10-24 13:13 UTC, e1:4) is a promotional summary of the PAPER ICO; Papertrade's site is unchanged (e1:0). A 2026-10-20 post (one account, not verified) still says the Paragon PAPER perp was halted and settled after Papertrade said PAPER would not be transferable.
- **GTA 6 Dacity Coin**: posts of 2026-10-24 (e1:6) repeat the claim in new words (@leakhex: a "CoinSide" app clip and a plane with Dacity Coin branding in the launch trailer at 0:55; @Jodugame: an overhyped side-mission stunt; @MaxelRowan: a $GDC fan-fiction coin). None is an official source.
- **AI inference markets**: @M00FIELD (2026-10-24 19:15 UTC) relays that Borro says Orbio CREDIT is now collateral, calling it untested; Phala posts mention Orbio and Kudo (2026-10-22). Rolling 24h token volume in the sweep fell to $169K from $548K a day earlier, still above the $100K retirement threshold.
- **PHP2Shell**: security coverage continues (Qualys 2026-10-23; scanner tools through 2026-10-25 05:18 UTC); no post mentions the coins.
- **Stock-paired**: xstok's 2026-10-21 Ave partnership (confirmed by @AveaiGlobal) and 2026-10-22 $KIMCHI listing; airdrop-spam posts of 2026-10-24/25; no news about the five coins.
- **Super Intelligence**: only two trader posts (2026-10-09, 2026-10-18); GSIR (added 2026-10-24) is 35.1% of the narrative's volume ($1.08M, 1.1x its $965K market cap).

## Failures, refunds, billing

- Calls: 691 requested, 557 delivered; 134 undelivered and refunded (billed $0): 133 of the 603 Pump/FOMO panel calls (FOMO market panels report `TOKEN_UNSUPPORTED` for many Robinhood Chain and Base coins, empty holder lists) and one DefiLlama call, **meteora-dynamic-bonding-curve dailyRevenue** (a series dated in the future, refunded as a seller error and kept as a disputed delivery in validation-report.json: every date up to the runtime day, 549 prior complete days match). The meteora revenue figures use the retained body. It was not retried.
- One redaction: the scraped docs page of useorbix.app (e1:1) contained the public example `curl` line with an authorization-header placeholder (`$ORBIX_API_KEY`, a variable name, not a key). `normalize.py`'s credential-pattern assertion rejected the file, the assertion was left unchanged, and the single placeholder header line in the saved raw/e1.json was replaced with a redaction note, as on 2026-10-24.
- No price-change failures, no retry; the OHLC fields in c1 and c2 were accepted (5,333 bars).
- **Billed credits: 3,788** over 74 unique Frames runs (d1/d2 32, e1/e2/e3 152, f1-f6 605, c1/c2 69, p1-p61 2,930). The account balance fell from 34,467 to 30,725 (34% of the 90,000 monthly grant), 3,742 by the balance, 46 below the per-run billing sum.
- **Pump/FOMO panels**: `plan.py panels` planned 603 calls in 61 batches (`plannedCredits` 3,708 of the 3,720 ceiling; `reservedByOtherBatchesCredits` 1,280), covering 137 coins (36 constituents plus 101 other tracked coins by market cap; 43 coins skipped by the planner for the ceiling). All 61 batches were called; none skipped for the 10,000 daily budget. 470 calls delivered; 2,930 credits billed.

## Anchors and checks

Financial 2026-10-25 (StonkFun 2026-10-24 for its own lag); chart 2026-10-25 04:00 UTC; 36 pools; 1,757 pre-creation zero buckets; daily bars reconcile with hourly sums (max relative gap 2.6e-10 against a 0.02 tolerance, 216 reconciled days). `npx tsc --noEmit`, `npm run lint`, `node --experimental-strip-types --test tests/frames-data.test.mjs`, `npm run build` and `git diff --check` results are in the pull request; no credential-like text in raw files after the redaction above.

## For the owner

- **Perpetual-futures is now one young copy contract**: the new Base Paper (0xbec0c6...) is 98.5% of its $54.19M. Adding it follows the written member bars and yesterday's precedent (the 0xd0814c... copy), but the pattern is a new unaffiliated copy each day whose volume vanishes within two days, and it moves the narrative 20x. Consider a rule for Clanker copies of one tagline (for example, count only the copy named by a Papertrade source, or cap a single coin's share).
- The oil and dividend fund family has now been deferred four days with no independent source; consider dropping it from the daily watch.
- BILLIONS ($12.5M across five coins) is the largest unclassified cluster in a while and rests on one anonymous Truth Social claim; worth a look tomorrow for a news source.
- Fee subtotal fell 20% day on day, driven by LaunchLab, Bonk.fun and Pons after their 2026-10-23 spikes; it is a complete DefiLlama day, not a data gap.
