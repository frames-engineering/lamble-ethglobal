# LAMBLE daily refresh 2026-11-28 (run 20261128T065844Z)

The prior run used for comparison is 20261127T065902Z (`--prior`). Its financial anchor is earlier, so no `--prior-narrative` was needed.

**X search failed again today.**
- **e1:** 3 of 7 searches returned HTTP 502 and were refunded: GTA (e1:0), Basket (e1:3) and Ansem (e1:4). The ni hao cat, SpaceX, 4chan and "memecoin meta" searches delivered.
- **e2:** 8 follow-ups (the three e1 retries, plus Claude, baboon, "ball" coins, US oil funds and MoonBoy) all failed. Three returned 502, then Frames marked the tool `tool_unreliable_this_run` and skipped the other five at $0. Nothing was retried after that.
- **Other X search tools:** the Frames catalog lists others (for example `frames.twitter.post.api-search-tweets`, invoke_ready at $0.01). They are not in `docs/data/providers.json` and the normalizer does not read their body shape, so none was used.
- **Extra snapshot:** one Codex call (d3) checked the deferred MeteoraDBC ni hao cat copy and ran phrase searches for "mihao", "ni hao", "baboon" and "claude".

discover.py reported **no theme clusters**, and the scout has no open leads: all four in `data/live/spotted.json` were rejected on 2026-11-27.

## New narratives (none)
No story met `narrativeRules.newNarrative` (three coins whose metadata names the story, $500K+ combined 24h volume, an independent source). The strongest leads, all recorded in `clusterDecisions`:

| Lead | Decision | Reason |
|---|---|---|
| k-baboon | deferred | Baboon Smirk (Zhaki, 2YAfPh..., $1,624,942, opened 2026-11-27 12:54 UTC) and He's Up To Something (BABOON, B8bkqf..., $216,930, opened 2026-11-16) are the only baboon coins above the member bar (d3:0). That is two coins, under the three-coin bar, and the story search (e2:4) failed. |
| k-oil-reserve | deferred | US "oil fund" and "reserve" coins: USOI, UOF, FODF, GOTF, UGOS, NOAF, NOTF, USFF, USAR, UBR. Most are flagged (implausible cap for a new pool, extreme 24h move). The unflagged ones (NOTF, USFF, USAR, the Base UBR) total about $386,915, under $500K. Their story search (e2:6) failed. |
| k-ball | rejected | Snowball, Memeball, Fireball and 雪球2027 share only the word "ball". Their metadata names no common story. |
| k-claude | rejected | Claude (Clanker, Robinhood Chain, 0x922eb7...) traded $24,670,999 at the $10.2M Clanker cap, 4 hours old. It is the same pattern as yesterday's OpenAI coin, and no other Claude coin is above the bar (d3:0). |

**Yesterday's deferred lead re-evaluated:** the MeteoraDBC ni hao cat copy (9wKmSm...) is **rejected**. d3:0 shows $15 of 24h volume, $0 liquidity and a $103,933 cap.

**Other candidates:** 196 are recorded in curation.json (166 rejected, 24 quarantined, 6 deferred). The deferred ones are the two baboon coins and the four unflagged oil/reserve coins.
- **Single-coin rejections:** MoonBoy ($4.49M, 10.2x turnover), WLFI, Split, STEADY, POLO, Bitcoin Inu, among others.
- **Quarantined:** the UBR, USOI, UOF, FODF, GOTF, NOAF, VIDA, PCB and ATX copies.

## Member changes
**Archived** (below $1,000 on two consecutive observations; collection stops, memberships stay open):
- **Jimmies** (4chan Zoo, GisWWj...): $272 over the 2026-11-27 window, $32 in d1:3.
- **SHIT** (GTA 6, 6sZUjg...): $467 over the window, $23 in d1:3.
- **SpaceX** (Clanker V4, Base, 0x7d1a56...):
  - Its first observation was $0, because its pool opened after yesterday's anchor.
  - d1:3 shows $220, a flat price at the $10.2M Clanker cap, and $190,032 of liquidity. It had traded $25.4M on 2026-11-27.

**Added, removed or retired:** none.

**Totals:** 6 active narratives, 33 collected pools:
- GTA 19
- stock-paired 5
- Ansem 3
- 4chan 2
- ni hao cat 2
- SpaceX 2

Solana privacy coins stay paused.

## Data vs 2026-11-27
**Anchors:**
- Financial: 2026-11-28 (last complete UTC day 2026-11-27).
- Chart: 2026-11-28 05:00 UTC.
- Daily bars end 2026-11-28 00:00 UTC. 198 token-days were reconciled; the largest relative gap was 6.2e-10.

**Headline numbers** (2026-11-27 in brackets):
- **Covered fee subtotal:** $2,105,258 ($2,051,654). Pump.fun fees were $1,197,355 ($1,226,689).
- **Indexed, 24h:** 53,970 launches (54,857) and 2,042 completions (2,070). These come from 14 venues.
- **Creator earnings** (DefiLlama supply-side revenue, 16 venues): 24h $959,008 ($917,786); 30-day $31,590,021 ($32,398,678).
- **Financial revisions:** none.
- **Delivery disputes:** 1. f4:9, StonkBrokers Nightshades dailyFees, returned negative_result: its daily data runs into December 2026. It was refunded.

| Narrative | Coins | 24h (chart window) | 2026-11-27 | Change | 30-day |
|---|---|---|---|---|---|
| Ni hao cat coins | 2 | $3,920,721 | $2,647,114 | +48.1% | $233,361,056 |
| SpaceX share-gift coins | 2 (3) | $3,407,257 | $6,878,320 | −50.5% | $9,741,637 |
| Coins paired with tokenized stocks | 5 | $1,749,891 | $2,592,941 | −32.5% | $349,008,017 |
| 4chan Zoo meme coins | 2 (3) | $1,125,953 | $1,820,258 | −38.1% | $26,246,651 |
| Ansem pump-wallet selloff coins | 3 | $684,737 | $895,612 | −23.5% | $94,674,266 |
| GTA 6 launch coins | 19 (20) | $664,232 | $870,951 | −23.7% | $146,654,385 |

**Volume caveats** (over 10x turnover):
- **Ni hao cat:** the BNB Chain copy (0xebe0f1...) traded 65.3x its $33,138 cap, 55% of the volume. Its price fell 82% over 24h.
- **SpaceX:** SpaceXCoin on Pump.fun (G2XqmS...) traded 265x a $1,608 cap, 13% of the volume. Its price fell 99.8% over 24h, and liquidity is $1,505.
- **Gone:** yesterday's GTA caveat (Founder).

## Story changes
- **Ni hao cat (e1:1):** posts of 2026-11-27 argue the BNB Chain copy is the "real" mihao because the name is a Chinese pun. There is a 2026-11-28 call-group post.
- **SpaceX (e1:2):**
  - A post of 2026-11-27 ties the Flap SpaceXCoin's name to a 2019 CZ post ("SpaceXcoin @elonmusk").
  - A 2026-11-28 post calls it a BSC meme with no product.
  - The summary now names two collected coins and the archived Base coin.
- **4chan Zoo (e1:5):** more posts retelling the 2014 image. Nothing official.
- **GTA 6, stock-paired and Ansem:** the searches failed. The notices say so, and yesterday's notes stand.
- **Signals:** none changed; every narrative keeps yesterday's.

## Failures, refunds and billing
**Outside the panels:**
- **X search:** e1:0, e1:3, e1:4, e2:0, e2:2 and e2:3 returned seller_error (502) and were refunded. e2:1 and e2:4–e2:7 were skipped as tool_unreliable_this_run, at $0.
- **Refunded:** f4:9 (negative_result, see the disputes above).
- **Delivered with caveats:**
  - f1:4, f2:1, f2:5, f3:7, f3:9, f5:0, f5:3 and f5:4: future-dated or stale DefiLlama chart rows.
  - c1:1, c1:3 and c1:4, plus e1:6. Codex accepted the OHLC fields in c1 and c2, with no GraphQL errors and no amount_exceeds_cap.
  - The c1:1 caveat ("only p0") is wrong: the body has all 30 aliases with 167–168 hourly bars each.

**Pump/FOMO panels:** all 62 planned batches (p1–p62, 615 calls) were called once each and saved, by four parallel subagents. None were skipped for the budget.
- Plan: 33 collected coins and 106 others; 188 coins were left out by the planner's ceiling.
- plannedCredits: 3,782. reservedByOtherBatchesCredits: 1,150.
- 405 of 615 calls were delivered:
  - 298 delivered
  - 50 delivered with caveats
  - 57 delivered empty
- **Refunds (147 calls):** 83 seller_error (mostly FOMO TOKEN_UNSUPPORTED) and 64 negative_result (mostly empty holder lists).
- **Skipped at $0 (63 calls):** 59 cross_run_undelivered (Pump coin-mint is still benched by Frames) and 4 tool_charged_no_delivery_this_run.
- **Saving:** p36 was briefly saved from another subagent's run and was saved again with its own run id. All 75 raw files now have distinct run ids, and their tool sequences match their requests.
- Panels billed **2,523 credits**.

**Billed credits** (sum of billing.charged_credits over 75 unique run ids): **3,254** of the 10,000 budget, within the 5,000 dailyCreditCeiling.
- 731 outside the panels: f 605, c 44, d 39, e 43.
- 2,523 for the panels.
- frames_get_usage: 19,951 available at the start and 16,711 after the run (monthly allowance 0, purchased 16,711). The 3,240 drop is 14 credits less than the billed sum.

## Release
- rel-20261128T065844Z-c6b272dd was published. This run's ingest added +4,969 observations and 0 revisions.
- Research: daily-2026-11-28 was written. coin-otc-solana-mukldt-2026-w48 and narrative-gta-6-dacity-coin-2026-w48 were pinned. state-of-the-trenches-2026-w47 is unchanged.
- No new weekly edition (Saturday).

## For the owner
- **X search has failed on two of the last three days**: fully on 2026-11-26, and today all follow-ups plus three e1 searches.
  - It is the only validated route. Today it blocked the story checks for the baboon and oil/reserve leads.
  - Consider approving a second X search provider in `providers.json` (Frames lists `frames.twitter.post.api-search-tweets` as invoke_ready at $0.01, about twice today's price). The normalizer would need its body shape.
- **SpaceX share-gift coins have two collected coins.**
  - The Base coin was archived after two sub-$1,000 observations. The first of those was a pre-creation $0, not a measured quiet day.
  - SpaceXCoin on Pump.fun fell 99.8% (cap $1,608). If it keeps trading, it stays in; if it goes quiet, the narrative will rest on one coin.
  - The rules have no minimum constituent count for an existing narrative, which may deserve one.
- **The Clanker-cap pattern repeats:** OpenAI yesterday, Claude today, each with about $20–25M of volume at exactly the $10.2M cap. None was added.
