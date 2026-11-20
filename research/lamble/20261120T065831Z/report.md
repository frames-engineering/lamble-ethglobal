# LAMBLE daily refresh 2026-11-20 (run 20261120T065831Z)

Prior run for comparison: 20261119T065820Z (`--prior`).

## Rebased mid-run
The first pass of this run was built on a stale main (d45fef7, before the 2026-11-18 and 2026-11-19 runs merged). The first `git fetch` had failed because the remote branch did not exist yet. That pass was never pushed.

The branch was reset to the current main. Collected batches were kept: d1, d2, e1–e3, f1–f6 and p1–p62 are inputs that do not depend on the universe. The curation was rewritten against main's 2026-11-19 registry.
- c1 and c2 (bars for the universe) were collected again for the 66-pool universe, using new idempotency keys (`-rebased`).
- The superseded c1/c2 are kept in `raw-superseded/` for audit and are not read by the normalizer.
- The new c1 was fetched at about 08:03 UTC, not 06:58, so its `filterLaunchpads` indexed counts are about an hour later than the rest of the run.
- c1:2 (hourly bars, 345,089 chars) arrived as a body_ref. It was retrieved free with frames_get_tool_results in six pages, joined by script (length checked) and inlined. The call is marked `bodyRetrievedFrom`.
- d1 and the panels were planned against the stale universe, which is why the panel gaps listed below exist.

## New narratives
**None created.** No cluster or lead met the newNarrative bar as a new story:
- **k-apocrycoin** (4 coins, $5,084,218) is an in-game coin from GTA VI. GTA 6 launch coins already holds two Apocrycoin coins, so it was assigned there.
- **k-anthropic** (4 coins, $58,044,805) is mostly two name-only Clanker "Anthropic" pairs at the $10.2M Clanker market cap. The other two are under the market-cap bar. Rejected.
- **Strongest lead: Apple's AI agent (k-apple, deferred).**
  - News posts of 2026-11-19 by Investing.com and Wall St Engine say Apple is building an autonomous AI agent (e3:3).
  - Only two coins qualify: Apple AI Agent (iAgent, $3,204,003) and Apple Inu ($2,384,769). The bar is three.
- **Cat Mario** (scout, $5.6M across 3 coins): only one coin clears the market-cap bar, and the only source is an unverified claim of a Roaring Kitty post. Rejected.

## Narrative changes
- No pauses, resumptions or retirements. There are 6 active narratives and 66 collected pools: GTA 39, Dacity 10, Nvidia 8, stock 4, Anthropic 4, ni hao 1.
- **DacityCoin DCTY (9hjBLB...)** stays out.
  - It traded $27,382,683 in the d1 sweep and carries no flag today.
  - It was quarantined on 2026-11-19 (it moved over 50x in 24h), and discover.py keeps previously quarantined coins out of the eligible list.
  - It is recorded as a quarantined candidate. See the flags below.

## Cluster and lead decisions
| Lead | Decision | Reason |
|---|---|---|
| k-apocrycoin (cluster) | assigned n-gta6-launch-coins | in-game Apocrycoin (e2:2); three more apocrycoin coins join |
| k-anthropic (cluster) | rejected | Clanker name-only pairs at the $10.2M cap; Anthropic Inu and Junior under the market-cap bar |
| k-sym-PIPI (scout) | assigned n-gta6-launch-coins | PIPI (6MKD1N...) joins; in-game ad disputed (e3:2) |
| k-theft (scout) | assigned n-gta6-launch-coins | Grand Theft Crew is already a member; the others are not in the sweep |
| k-sym-BUNCOIN (scout) | rejected | GTA in-game listing claim; Buncoin at a $54,791 market cap; the others are not in the sweep |
| k-sym-FIONA (scout) | rejected | Cincinnati Zoo story; the only swept coin (B34nXK...) is quarantined |
| k-sym-CATMARIO (scout) | rejected | one qualifying coin; no source |
| k-apple (outside clusters) | deferred | real news, two coins |

The four leads deferred on 2026-11-19 were re-evaluated. None of them is in today's sweep, so each is recorded as a rejected candidate:
- Meteora DBC DCTY 3fgnpG...
- Grand Theft Alleycat
- Meteora DBC Anthropic Coin 8J2VUc...
- MEOWL

183 candidates are recorded in curation.json, each with a reason.

## Member changes
Values are from the d1 sweep.

**Joined GTA 6 launch coins** (46 members, 39 collected):
- Three apocrycoin coins:
  - Hj3Y3G... (APCY), $1,398,012
  - HVxXzE..., $1,187,161
  - BR76qv... (Meteora DBC), $1,201,012
- PIPI (6MKD1N..., "PIPI the first meme coin in GTA found"), $6,201,546.
  - Posts dispute whether its in-game ad is real (e3:2).
- OFFICIALGTA (OGTA), $2,631,196. Nothing shows it is official.
- Cool Dog (LOOSY, "Loosy, jet-ski dog in GTA VI"), $1,070,141.
- BuckMe Coin (DEgAkP..., "the Cash App of GTA 6"), $496,270.
  - It was under the market-cap bar on 2026-11-19 ($80,292) and is at $160,890 today.

**Joined Nvidia CEO scandal coins** (11 members, 8 collected):
- Stand With Jensen (Pump.fun, gHZhqE...), $729,521.
- stand with jensen (Flap, BNB Chain, 0xaadd3b...), $65,194.
  - Its description claims Elon Musk and CZ back Huang's return, which is not verified here.

**Archived** (under $1,000 on two consecutive observations; the 2026-11-19 window, then today):
- Vice City Bawsaq: $670, then $125.
- Vice City Index (Meteora DBC): $0, then $0.
- Leonida Games: $137, then $47.
- Grand Theft Anthropic: $86, then $69.
- Bring Jensen Back: $628, then $130.

## Data vs 2026-11-19
**Anchors:**
- Financial: 2026-11-20 (last complete UTC day 2026-11-19).
- Chart: 2026-11-20 05:00 UTC.
- 30-day daily bars end 2026-11-20 00:00 UTC. 396 token-days were reconciled; the largest relative gap was 1.3e-8.

**Headline numbers** (2026-11-19 in brackets):
- **Covered fee subtotal:** $1,959,579.10 ($2,302,063).
- **Indexed, 24h:** 48,122 launches (58,773) and 2,712 completions (3,055).
- **Creator earnings** (DefiLlama supply-side revenue, 16 venues): 24h $945,768 ($1,009,063); 30-day $37.5M ($38.3M).

Narrative volume over the chart window to 05:00 UTC:

| Narrative | Coins | 24h | 2026-11-19 | 30-day |
|---|---|---|---|---|
| GTA 6 launch coins | 39 | $23,896,381 | $37,681,852 (36) | $207.7M |
| Ni hao cat coins | 1 | $19,557,885 | $7,951,465 | $207.2M |
| GTA 6 Dacity Coin coins | 10 | $9,693,102 | $19,789,513 | $154.5M |
| Anthropic IPO coins | 4 | $8,654,387 | $1,399,243 | $27.7M |
| Coins paired with tokenized stocks | 4 | $6,571,317 | $14,629,071 | $489.5M |
| Nvidia CEO scandal coins | 8 | $941,164 | $313,619 (7) | $26.3M |

**Volume caveats** (coins trading over 10x their market cap):
- **Dacity:** 95%. AudaCity is at 11.5x; DCTC and the DacityCoin 4rYsDH... are at 312x and 85x, with market caps under $26K.
- **GTA:** 46%. PIPI is at 51.9x; GTA Season is at 862x on a $2,312 market cap.
- **Anthropic:** 8%.
- **Nvidia:** 6%.

## Story changes
- **GTA VI:**
  - The game was released on 2026-11-19 (e1:0).
  - Posts say Apocrycoin is mentioned in a mission (e2:2), and that a PIPI ad can appear in the in-game social app (disputed, e3:2).
- **Dacity:**
  - Posts say a streamer found a DacityCoin app showing DCTY.
  - Posts also say Papa AudaCity rugs the coin in the questline's final mission (e2:1, e3:0, e3:1).
  - The narrative's own coins halved, while the DCTY coin, which is not a member, took the volume.
- **Anthropic:**
  - The IPO priced at $83, and ANT began trading on Nasdaq on 2026-11-19.
  - Posts say it raised about $81B and closed about 17% up (e1:2, e2:0). ANTS carries 92% of the narrative's volume.
- **Nvidia:**
  - Posts report an SEC probe and that the petition passed 200,000 signatures (2026-11-18).
  - A post says Huang is reportedly raising $50B for a new chip company (2026-11-20; e1:5).
- **Stock-paired:** Stockereum offers launch pairs with Anthropic's tokenized stock (e1:1). GTA6 (StonkFun) fell back after release day.
- **Ni hao cat:** a post says KFC changed its profile picture to the cat (e1:4). Volume rose 146%.

## Failures, refunds and billing
**Outside the panels** (refunded, $0):
- d1:0 and d1:2: the cross-check flagged the bodies as truncated or "future". The bodies are complete and were used.
- e1:6 ("memecoin meta"): negative_result.
- e3:4 (Firecrawl scrape of a GTA wiki page): refused before payment, mpp_unsupported_real.
- f3:0 (graphite supply-side) and f4:2 (binance-alpha supply-side): negative_result. These are the 2 deliveryDisputes.

**Pump/FOMO panels: all 62 planned batches (p1–p62) were called and saved. None were skipped for the budget.**
- Plan: 614 calls covering 56 constituents and 81 other coins. 148 coins were left out by the planner's ceiling.
- **FOMO was down for the whole run.** All 350 FOMO calls returned "Temporarily unavailable" and were refunded (seller_error).
  - They were not retried.
  - 17 batches billed 0.
- Pump: 168 delivered (126 delivered, 40 with caveats, 2 empty), billed 1,053 credits.
  - 96 refunded: 66 caller_error, 20 seller_error and 10 negative_result.
- Because the panels were planned on the stale universe, **17 current members have no panel today**:
  - GTA coins added 2026-11-18/19: Jason & Lucia, Official Grand Theft Auto VI, GTA Vice Inu, Grand Trench Agency, ⭐⭐⭐⭐⭐⭐, Apocrycoin 7fZK84, Founder Official, Founder, buckme, GTA Season, VICE 6, Cool Dog 5tAB1D, Hugh Johnson.
  - Dacity coins: two DCI DacityCoin, AudaCity ERDrma, DCTC.
  - The release keeps their earlier panel observations.

**Billed credits** (sum of billing.charged_credits over 77 unique run ids): **1,943** of the 10,000 budget.
- 1,887 in the runs this release uses: panels 1,053, outside the panels 834.
- 56 in the superseded c1/c2: 37 + 19.
- frames_get_usage after the run: 49,424 available (monthly allowance 16,589, purchased 32,834).

## Release
- Published rel-20261120T065831Z-5ffa4023; ingest recorded +9,020 observations.
- Run with `--rebuild` because the local store held the stale first-pass ingest of this run.
- Article daily-2026-11-20 written.
- The W47 coin and narrative articles are pinned. Weekly editions W45 and W46 are unchanged.

## Checks
All passed:
- `npx tsc --noEmit`
- `npm run lint`
- `tests/frames-data.test.mjs` (12 of 12)
- `npm run build`
- `git diff --check`
- Credential scan of the run and the release files.

## For the owner's judgment
- **DCTY (9hjBLB...).** The coin the Dacity story names has been unflagged today, with $27.4M. It stays out only because it was quarantined on 2026-11-19. Decide whether a coin can leave quarantine.
- **FOMO outage** for a second day. Consider letting the planner retry or skip FOMO.
- **Panels missed 17 members** because they were planned before the rebase. Tomorrow's plan from the current registry covers them.
- **Apple AI agent lead (deferred).** One more qualifying coin would create the narrative.
- **Overlap.** Both GTA narratives cover in-game coins. Consider merging them.
