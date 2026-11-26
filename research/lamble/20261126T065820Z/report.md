# LAMBLE daily refresh 2026-11-26 (run 20261126T065820Z)

The prior run used for comparison is 20261125T065841Z (`--prior`). Its financial anchor is earlier, so no `--prior-narrative` was needed.

**Story checks were degraded today.** The only validated X search route (`bazaar.twitter-use-x402atlas-com-search`) returned HTTP 502 on every call. That covers e1 (7 searches), the story batch e2 (2) and one retry, e3 (9). Frames refunded all 18 calls and marked the tool `tool_unreliable_this_run`. It was not retried again. One page scrape (e4, https://basket.xyz) returned Not Found and was refunded. No new posts were read today.

## New narratives (0)
None qualified.

- No word cluster had three coins whose metadata names one story.
- No independent source could be searched.

The strongest leads were:
- **k-zero ($6.5M).** Only ZeroSumEnjoyer (Pump.fun, DTSkmo..., $4.0M) ties to the livestream-dispute story the scout found.
- **k-spacex (deferred).** SpaceXLife and SpaceXCoin on Flap traded $2.68M combined. Their metadata is empty and there are only two coins.

## Other narrative changes
**Resumed: Coins paired with tokenized stocks** (`n-stock-paired-coins`, paused 2026-11-25). It was restored from 20261124T065842Z, with Basket added.
- **Collected coins:** STONK, OTC, GTA VI (GTA6), 牛起来 and the new Basket (BASKET, LaunchLab, 3Tg6Yn...).
- **Why Basket qualifies:** the Basket account (@Basketdotxyz) posted on 2026-11-25 at 04:39 UTC that "$BASKET is live". The post describes a Raydium launchpad pairing coins with tokenized stocks and gives the contract `3Tg6YnNrfPdFfsY14MaNsDMWLseAyrUDS3myJtbaJN6f`. It is evidence `frames-20261125T065841Z-e3-5`, cited from the prior run because X search was down today.
- **Correction to yesterday:** yesterday's report said no official post named this contract. It does.
- **Volume:** in d1, BASKET traded $3,845,638 with a $1,051,130 cap; in d3, $3,808,702. Its three MeteoraDBC copies are dead (d3:0).
- **Snapshot (d3:0):** $4,455,564 across the five coins, against $69,680 for the weakest active narrative.

**Paused: Nvidia CEO scandal coins** (`n-nvidia-ceo-scandal`), at the six-narrative cap. Its memberships stay open.
- In the 2026-11-26 snapshot it traded $69,680 across 10 coins (d1:3), down from $2,151,526 over the 2026-11-25 window.
- Yesterday 89% of its volume came from coins trading over 10x their collapsed caps.
- The source is not gone: NVIDIA reinstated Huang on 2026-11-23.

**Archived:** Cool Dog (LOOSY, GTA 6 launch coins, HF2RBP...). It had $91 of volume over the 2026-11-25 window and $34 in the 2026-11-26 snapshot.

**Retired or removed:** none. Anthropic IPO coins stay paused.

**Totals:** 6 active narratives, 38 collected pools:
- GTA 21
- privacy 5
- stock-paired 5
- Ansem 3
- 4chan 3
- ni hao cat 1

## Cluster and lead decisions
| Lead | Decision | Reason |
|---|---|---|
| k-zero (cluster; scout confirmed) | rejected | Only ZeroSumEnjoyer names the story. Its MeteoraDBC copy has $44 of volume and no liquidity (d3:0). Grodia, zero (Flap) and Moth use the word for other things. |
| k-stock (cluster) | rejected | GTA6 is already a stock-paired member. zero is an AI-agent skill token; SPCX Chain is a chain token. |
| k-agent (cluster) | rejected | Three unrelated AI-agent products. |
| k-anthropic (scout confirmed) | rejected | Anthropic (Clanker, Base, 0x42dd44...) shows $37.7M volume and Anthropic 3x Long (ANT, Robinhood) $22.1M, both at the $10.2M Clanker cap with zero liquidity in d3:0. Neither is in the sweep. Flap ANT is already a paused member. The one free cap slot went to the larger stock-paired narrative. |
| k-sym-BASKET (deferred 11-25) | assigned → n-stock-paired-coins | See above. |
| k-sym-SCAMSEM (deferred 11-25) | rejected | All three pools are dead in d3:0 ($0, $3,008 and $0). |
| k-instead (scout deferred) | rejected | jobcoin is 14,169 h old, PTO is $126,628, and OnlyUp is not in the sweep. No story. |
| k-spacex (posts/sweep) | deferred | Two empty-metadata Flap coins, $2,684,565 combined. Re-check tomorrow. |

**Other candidates:** 203 are recorded in curation.json: 186 rejected, 15 quarantined and 2 deferred (the SpaceX coins). They include:
- Slingoor "The White Bull", whose metadata names neither Ansem nor the sale.
- Pompompurin, Norfeather (the Thanksgiving-parade turkey) and the two Elonmas coins. Each story has only one coin, apart from the Elonmas pair (an Elon-in-a-Santa-suit joke, not a story).

## Data vs 2026-11-25
**Anchors:**
- Financial: 2026-11-26 (last complete UTC day 2026-11-25).
- Chart: 2026-11-26 05:00 UTC.
- Daily bars end 2026-11-26 00:00 UTC. 228 token-days were reconciled; the largest relative gap was 1.9e-9.

**Headline numbers** (2026-11-25 in brackets):
- **Covered fee subtotal:** $1,974,967 ($1,803,061). Pump.fun fees were $1,266,545 ($1,240,524).
- **Indexed, 24h:** 53,397 launches (48,404) and 2,612 completions (2,328). These come from 14 creation venues and 11 completion venues.
- **Creator earnings** (DefiLlama supply-side revenue, 16 venues): 24h $902,289 ($756,866); 30-day $33.1M ($33.8M).
- **Financial revisions:** 3 providers revised days.

| Narrative | Coins | 24h (chart window) | 2026-11-25 | 30-day (2026-11-25) |
|---|---|---|---|---|
| Coins paired with tokenized stocks (resumed) | 5 | $9,678,260 | not collected ($2,097,697 on 11-24) | $403.1M |
| 4chan Zoo meme coins | 3 | $7,619,909 | $14,685,834 | $23.9M ($7.1M) |
| Ansem pump-wallet selloff coins | 3 | $2,830,800 | $25,219,806 | $95.5M ($91.7M) |
| Ni hao cat coins | 1 | $1,470,812 | $4,928,591 | $227.4M ($225.8M) |
| Solana privacy coins | 5 | $1,193,571 | $2,085,866 | $21.9M ($20.4M) |
| GTA 6 launch coins | 21 | $1,179,790 | $2,441,943 (22) | $160.6M ($163.7M) |
| Nvidia CEO scandal coins (paused) | 10 | not collected | $2,151,526 | — |

Stock-paired: Basket carries $6,990,680 (72%) at 7.2x its cap. The 30-day total is almost all STONK.

**Volume caveats** (over 10x turnover):
- **4chan:** 4CHAN (42.2x an $88,194 cap) and Jimmies (290x a $1,661 cap), together 55% of the volume.
- **Privacy:** Confidential Cat cCAT (11.5x), 17%.
- **Others:** none.

## Story changes
None from posts today, because X search was down.
- Each story note says so and keeps the 2026-11-25 notes.
- The stock-paired summary now describes Basket's 2026-11-25 post.

## Failures, refunds and billing
**Outside the panels:**
- **X search:** all 18 calls (e1, e2, e3) failed with HTTP 502 and were refunded.
- **Scrape:** e4 returned negative_result and was refunded.
- **d1:2** (trending) returned negative_result and was refunded. The cross-check said its createdAt values were "in the future". The body was used as an observation.
- **f1:8** (pons-v2 supply side) and **f5:6** (rapid-launch revenue) had seller_error and were refunded. Both bodies end at 2026-11-26 and match the prior complete days. They are kept as delivery disputes.
- **Caveats:** f1:2 (pump.fun supply-side chart ends Feb 2026) and f4:7/f4:8 (clanker charts end in 2025) were delivered with caveats. The venues' own definitions apply.
- **Codex:** accepted the OHLC fields in c1 and c2; all 9 calls were delivered. There was no amount_exceeds_cap.

**Pump/FOMO panels:** all 62 planned batches (p1–p62, 614 calls) were called and saved, in order, by four parallel subagents. None were skipped for the budget.
- Plan: 38 collected coins and 100 others; 185 coins were left out by the planner's ceiling.
- plannedCredits: 3,776. reservedByOtherBatchesCredits: 1,220.
- 414 of 614 calls were delivered:
  - 304 delivered
  - 57 delivered with caveats
  - 53 delivered empty
- **Skipped at $0 (64 calls):** 59 calls were `cross_run_undelivered`, because Frames kept Pump coin-mint benched. 5 were `tool_charged_no_delivery_this_run`.
- **Refunds:** 84 seller_error, 49 negative_result and 3 caller_error. Most were FOMO token, holder and candle calls for Robinhood and Base tokens (TOKEN_UNSUPPORTED).
- **Inlined body:** p1:9 (FOMO holders, 301,911 characters) came back as a body_ref. It was fetched free with frames_get_tool_results and inlined unchanged.
- Panels billed **2,581 credits**.

**Billed credits** (sum of billing.charged_credits over 77 unique run ids): **3,264** of the 10,000 budget, within the 5,000 dailyCreditCeiling.
- 683 outside the panels: f 594, c 56, d 33, e 0.
- 2,581 for the panels.
- frames_get_usage: 28,191 available at the start and 24,937 after the run (monthly allowance 0, purchased 24,937). The 3,254 drop is 10 credits less than the billed sum.

## Release
- rel-20261126T065820Z-0c5ca3cb was published. This run's ingest added +6,423 observations and 267 revisions.
- Research: daily-2026-11-26 was written. coin-otc-solana-mukldt-2026-w48 and narrative-gta-6-dacity-coin-2026-w48 were pinned.
- No new weekly edition (Thursday).

## For the owner
- **X search outage:**
  - The only validated X route was down all day, and the hourly scout's 06:18 run reported the same failure.
  - No story could be checked. If it persists, discovery cannot create narratives.
  - Consider validating a second X search provider.
- **BASKET:**
  - It is the launchpad's own token, not itself a stock-paired coin. It joins on the official post that names its contract.
  - That post was cited from the prior run's evidence because today's searches failed.
  - It is 7.2x turnover, under the 10x caveat.
- **Nvidia pause:** the pause uses the d1 rolling snapshot ($69,680), as earlier cap decisions did. The narrative can be resumed if the Jensen coins revive.
