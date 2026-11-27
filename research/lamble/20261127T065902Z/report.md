# LAMBLE daily refresh 2026-11-27 (run 20261127T065902Z)

The prior run used for comparison is 20261126T065820Z (`--prior`). Its financial anchor is earlier, so no `--prior-narrative` was needed.

X search worked again today after yesterday's outage.
- **Searches run:** 15. That is 7 in e1, 6 follow-ups in e2 and 2 in e3, within the 24-search cap.
- **Failures:** two e2 searches ("SpaceX IPO" and "Kai Ken $KAI") returned HTTP 502 and were refunded. They were not retried.
- **Extra snapshot:** one Codex call (d3) checked SpaceXLife and other SpaceX-named coins.

discover.py reported **no theme clusters** today. Every decision below comes from the scout's leads, yesterday's deferred lead and the story searches.

## New narratives (1)
**SpaceX share-gift coins** (`n-spacex-share-gift`, culture).

**The story:**
- Posts from about 20:30 UTC on 2026-11-25 say SpaceX will put one share into every active Trump Account, and that Elon Musk will match it. One is Michael Dell's post thanking SpaceX and Musk.
- On 2026-11-26 at 03:43 UTC Musk posted: "Every child in America will receive two SpaceX shares, one from the company and one from me personally" (e3:0).
- Reuters reported that the pledge could be worth more than $18 billion, and Fox News that SpaceX pledges stock to every active Trump Account (e3:0).
- The gift is a pledge, not a delivery. No coin is shown to be affiliated with SpaceX or Musk.

**Members** (all three opened after the pledge):

| Coin | Launchpad | Pool opened (UTC) | Evidence | d1 volume | d1 cap | Liquidity |
|---|---|---|---|---|---|---|
| SpaceXCoin | Flap, BNB Chain (0xdde274...) | 2026-11-26 05:27 | Name; posts tie this contract to the pledge (e2:0, e3:1) | $4,595,159 | $1,660,755 | — |
| SpaceXCoin | Pump.fun (G2XqmS...) | 2026-11-27 02:24 | Description "SpaceXCoin represents SpaceXLife" | $927,420 | $1,068,627 | — |
| SpaceX | Clanker V4, Base (0x7d1a56...) | 2026-11-27 05:27 | Name only (no description) | $25,352,056 | $10,202,631 (the Clanker cap) | $190,024 USDC |

The Base coin's pool opened after this run's 05:00 UTC chart anchor. Every bucket in today's window therefore counts as a pre-creation zero, and its volume enters from the next run.

**Measured:** $6,878,320 over the chart window. SpaceXCoin on Flap carries 90.5% of it at 4.0x its cap. The 30-day total is $4,136,599.

**Paused to make room: Solana privacy coins** (`n-solana-privacy-coins`), at the six-narrative cap. Its memberships stay open.
- It had the lowest rolling 24h volume of the six: $420,109 in the d1:3 snapshot, down from $1,193,571 over the 2026-11-26 window.
- The two SpaceXCoin coins traded $5,522,579 in d1.
- Its source is not gone: posts of 2026-11-27 still discuss Helius Privacy Rings (e1:2).
- The Helius search in `dailyEvidence` was replaced by "SpaceX shares Trump Accounts $SpaceXCoin". e1 stays at 7 calls.

## Cluster and lead decisions
| Lead | Decision | Reason |
|---|---|---|
| k-spacex (deferred 11-26) | created → n-spacex-share-gift | Three SpaceX-named coins now meet the member bar. Musk, Reuters and Fox News posts are the source (see above). SpaceXLife fell to a $27,825 cap with $8,077 liquidity (d3:0) and is not a member. |
| k-sym-KURO (scout confirmed) | rejected | None of its four coins is in today's sweep (d1). The claim rests on Grok-bot replies that "Kuro" is its Shiba mascot (e2:2), which a rival deployer disputes as paid promotion. |
| k-sym-DRAGONRIDERS (scout deferred) | rejected | Only the Pump.fun coin (5xrT8y..., $1,052,877) remains. The only story is a subreddit "members' name", and e2:5 found only call-group posts. |
| k-zolana (scout deferred) | rejected | None of the three Zolana coins is in today's sweep. The overlapping privacy narrative is paused. |

**Other candidates:** 197 are recorded in curation.json: 175 rejected, 21 quarantined and 1 deferred.
- **Deferred:** the MeteoraDBC ni hao cat copy (9wKmSm..., $1,077,577 in d3:0). It opened at 06:22 UTC, after the anchor; re-check it next run.
- **Single-story coins rejected:** Kai Ken (KAI, $3.19M; its story search failed with 502), OpenAI (Clanker, Robinhood Chain, $21.3M at the Clanker cap; no source in e2:4), Snowball, DexData, Elonmas and Cate Inu.
- **Quarantined:** the UBR "United Bitcoin Reserve" and oil-index (USOI, GOTF, UGOS, UODF) copies, for implausible caps or extreme 24h moves.

## Member changes
- **Added:** ni hao cat (mihao, Flap, BNB Chain 0xebe0f1...) joins Ni hao cat coins.
  - Posts of 2026-11-27 give this contract, and one counts eight copycats that day (e1:1).
  - d1: $1,087,012 volume and a $239,197 cap. It traded $46,516 in today's window after its 04:55 UTC launch.
- **Archived:** Vice City Index (BAWSAQ, GTA 6 launch coins). It had $335 of volume over the 2026-11-26 window and $129 in the d1:3 snapshot.
- **Removed or retired:** none.

**Totals:** 6 active narratives, 36 collected pools:
- GTA 20
- stock-paired 5
- SpaceX 3
- 4chan 3
- Ansem 3
- ni hao cat 2

## Data vs 2026-11-26
**Anchors:**
- Financial: 2026-11-27 (last complete UTC day 2026-11-26).
- Chart: 2026-11-27 05:00 UTC.
- Daily bars end 2026-11-27 00:00 UTC. 216 token-days were reconciled; the largest relative gap was 6.2e-10.

**Headline numbers** (2026-11-26 in brackets):
- **Covered fee subtotal:** $2,051,654 ($1,974,967). Pump.fun fees were $1,226,689 ($1,266,545).
- **Indexed, 24h:** 54,857 launches (53,397) and 2,070 completions (2,612). These come from 14 creation venues and 11 completion venues.
- **Creator earnings** (DefiLlama supply-side revenue, 16 venues): 24h $917,786 ($902,289); 30-day $32.4M ($33.1M).
- **Financial revisions:** none (0 providers). Delivery disputes: none.

| Narrative | Coins | 24h (chart window) | 2026-11-26 | Change | 30-day |
|---|---|---|---|---|---|
| SpaceX share-gift coins (new) | 3 | $6,878,320 | — | — | $4,136,599 |
| Ni hao cat coins | 2 | $2,647,114 | $1,470,812 | +80.0% | $229,778,106 |
| Coins paired with tokenized stocks | 5 | $2,592,941 | $9,678,260 | −73.2% | $377,280,134 |
| 4chan Zoo meme coins | 3 | $1,820,258 | $7,619,909 | −76.1% | $26,241,594 |
| Ansem pump-wallet selloff coins | 3 | $895,612 | $2,830,800 | −68.4% | $94,872,002 |
| GTA 6 launch coins | 20 | $870,951 | $1,179,790 (21) | −26.2% | $150,036,947 |
| Solana privacy coins (paused) | 5 | not collected | $1,193,571 | — | — |

**Volume caveats** (over 10x turnover):
- **GTA 6:** Founder traded 21.6x its $2,370 cap, 5.9% of the volume.
- **Others:** none. The 4chan caveat from yesterday is gone; Jimmy Rustles is now at 2.7x.

## Story changes
- **SpaceX share-gift coins:** new (see above).
- **Ni hao cat:** posts say a BNB Chain copy launched on 2026-11-27.
- **Stock-paired:** Basket's 2026-11-25 post is still the official source. Gate Trenches notes Basket is built on Raydium LaunchLab, not an official Raydium product.
- **4chan, Ansem and GTA:** no new official source. Today's notes describe what the posts say.

## Failures, refunds and billing
**Outside the panels:**
- **X search:** e2:1 and e2:3 returned seller_error (502) and were refunded.
- **Delivered with caveats:** d1:2 (trending), e2:5, f3:8, f4:1, f4:3, f4:7, f4:8, f6:5 and c1:0. Codex accepted the OHLC fields in c1 and c2, and there was no amount_exceeds_cap.

**Pump/FOMO panels:** all 62 planned batches (p1–p62, 616 calls) were called and saved, by four parallel subagents. None were skipped for the budget.
- Plan: 36 collected coins and 103 others; 188 coins were left out by the planner's ceiling.
- plannedCredits: 3,788. reservedByOtherBatchesCredits: 1,140.
- 402 of 616 calls were delivered:
  - 300 delivered
  - 46 delivered with caveats
  - 56 delivered empty
- **Skipped at $0 (61 calls):** 58 Pump coin-mint calls were `cross_run_undelivered`, because Frames kept the tool benched. 3 were `tool_charged_no_delivery_this_run`.
- **Refunds:** 94 seller_error, 56 negative_result and 3 caller_error. They are mostly FOMO token and holder calls for Robinhood and Base tokens (TOKEN_UNSUPPORTED).
- Panels billed **2,506 credits**.

**Billed credits** (sum of billing.charged_credits over 76 unique run ids): **3,371** of the 10,000 budget, within the 5,000 dailyCreditCeiling.
- 865 outside the panels: f 616, c 69, d 39, e 141.
- 2,506 for the panels.
- frames_get_usage: 24,156 available at the start and 20,802 after the run (monthly allowance 0, purchased 20,802). The 3,354 drop is 17 credits less than the billed sum.

## Release
- rel-20261127T065902Z-3e45a844 was published. This run's ingest added +6,020 observations and 0 revisions.
- Research: daily-2026-11-27 was written. coin-otc-solana-mukldt-2026-w48 and narrative-gta-6-dacity-coin-2026-w48 were pinned. state-of-the-trenches-2026-w47 is unchanged.
- No new weekly edition (Friday).

## For the owner
- **SpaceX (Base, Clanker V4):**
  - It joins on its name alone, as earlier name-only Anthropic Clanker coins did.
  - It traded $25.4M at the $10.2M Clanker cap within about 1.5 hours of opening. Earlier Clanker coins at that cap later showed zero liquidity.
  - It contributes $0 today because it opened after the anchor. If its volume turns out to be wash trading, it would dominate this narrative from tomorrow.
  - Without it the narrative has two coins, under the three-coin bar.
- **SpaceXCoin (Flap):** at 4.0x turnover it carries 90.5% of the narrative's window volume.
- **Pump coin-mint:** Frames has benched it for a second day (cross_run_undelivered), so there is no coin-mint panel data.
