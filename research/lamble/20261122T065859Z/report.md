# LAMBLE daily refresh 2026-11-22 (run 20261122T065859Z)

The prior run used for comparison is 20261121T065756Z (`--prior`). Its financial anchor is earlier, so no `--prior-narrative` was needed.

X search worked again today after the 2026-11-21 outage. 16 X searches ran in all: 7 in e1, 2 in the story batch e2 and 7 targeted follow-ups in e3. Two of them were refunded: e2:1 failed the cross-check and e3:5 returned no posts. No page scrapes were needed.

## New narratives
**None created.** The strongest leads:

| Lead | Volume | Why it did not qualify (yet) |
|---|---|---|
| **Elon Musk Uranus post coins** (k-uranus, cluster; scout confirmed) | $1,298,328 for the 3 clustered coins | The source is current: Elon Musk posted "It's high time we probed Uranus again!" on 2026-11-21 at 20:40 UTC (e3:3, his account). But only **two** coins meet the member bar: UranusCoin (Meteora DBC, BNQU49..., $1,421,578 volume, $357,619 cap, pool opened 06:27 UTC today) and UranusCoin (Flap, 0xd3ba2b..., $515,552, $213,662 cap; its description quotes the post). Uranus Coin (Pump.fun, DUvFjn..., $710,471) has a $55,577 cap, under the $100K bar. UrAnus (Flap) predates the post by about 114 days. Many other Uranus coins in the posts are not in the sweep. **Deferred**; a dailyEvidence search was added. |
| **Christmas-variant coins** (scout lead k-sym-CATEMAS) | $2,178,034 for 3 qualifying coins | Three swept coins meet the member bar: Catemas (Pump.fun, $1,756,573, $135,123 cap), Mihaomas (Meteora DBC, $196,938) and Wishmas (Pump.fun, $224,523). Posts talk of a "full Christmas meta" (e3:2), and the Catemas account says it is paired with Cate (e3:0). But every post is a trader's call or a coin's own account. No news, official page or independent post names the story, so the source bar is not met. **Deferred**; a dailyEvidence search was added. Mihaomas joined Ni hao cat coins on its name instead. |

## Cluster and lead decisions
| Lead | Decision | Reason |
|---|---|---|
| k-uranus (cluster) | deferred | Only 2 coins meet the member bar (see above). |
| k-united (cluster) | rejected | "United" comes from oil- and energy-fund names. 2 of the 4 coins are quarantined, the others carry $183,549 and $33,250, and the story search (e2:1) returned only unrelated posts and was refunded. |
| k-sym-CATEMAS (scout, confirmed) | deferred | No independent source (see above). |
| k-sym-RIZZMAS3 (scout, deferred at 02:17 UTC) | rejected | Re-checked: the $RIZZMAS3 search again returned no posts (e3:5), and none of the scout's pools is in the sweep. The swept RIZZMAS ("RIZZMAS 3") has a $69,724 cap. |
| k-anthropic (tracked) | assigned n-anthropic-ipo | No coin joins today. Anthropic Coin 2Phhxq... is deferred (see below). The Robinhood Chain Clanker "Anthropic" pair ($23,849,599 at the $10.2M Clanker cap) is rejected, as is AnthropicAI on Base (under the volume bar). |

Yesterday's deferral, Anthropic Coin DYDSuJ..., was re-evaluated. It is not in today's sweep, so there is nothing to resolve the gap with; it is recorded as rejected and can be reconsidered if it reappears.

191 candidates are recorded in curation.json: 171 rejected, 14 quarantined and 6 deferred.

## Member changes
**Joined:**
- **GTA 6 launch coins:**
  - Leonida (LEONIDA, Pump.fun, 8T3ztD...) is named for the game's state. Its pool opened 2026-11-22 03:44 UTC. d1: $731,511 volume, $119,406 cap. Posts (e3:4) say a GTA 6 PC recomp project shares the name.
  - GTV (Pump.fun, n6JDMg...) says "Get paid per view on your GTA 6 clips". Its pool opened 2026-11-19 02:20 UTC. d1: $149,605 volume, $4,942,585 cap.
- **Coins paired with tokenized stocks:** 牛起来 (Flap, BNB Chain, 0x080bae...). Its description says holders get real stock rights backed by QQQB stock. d1: $531,159 volume, $1,122,192 cap. The claims are its own and not verified.
- **Ni hao cat coins:** Mihaomas (MIHAOMAS, Meteora DBC, BMrZfk...), a Christmas spin-off of mihao. Its pool opened 06:35 UTC, after the chart window, so it shows no volume yet. d1: $196,938 volume, $997,838 cap.

**Deferred, needs the owner's eye:** Anthropic Coin (ANT, Meteora DBC, 2Phhxq...).
- It met the member bar in the d1 pair snapshot ($170,867 volume, $730,213 cap) and was first added.
- Its all-pool hourly bars (c1:2, p62) show $17,237,345 over the 24h window: $1.4–2.7M every hour from 20:00 UTC to 04:00 UTC. That is about 23x its market cap.
- It would have been 89% of the narrative's volume.
- This is the same pattern that held out DYDSuJ... on 2026-11-21, so it was taken out of the registry before the final normalize. It is not quarantined by the rules (turnover is under 100x).

**Archived** (under $1,000 on two consecutive observations, the 2026-11-21 chart window then the 2026-11-22 snapshot):

| Coin | Narrative | 2026-11-21 | 2026-11-22 |
|---|---|---|---|
| DTC (6dhKEN...) | Dacity | $295 | $44 |
| DACITY (39wVWd...) | Dacity | $695 | $295 |
| DCI (85EzCV...) | Dacity | $6 | $1 |
| gtacoin (LaunchLab, DSKM3d...) | GTA | $151 | $371 |
| the first Pump.fun Stand With Jensen (SWJ, 13EAww...) | Nvidia | $0 | $1 |

No pauses, resumptions or retirements. There are 6 active narratives and 62 collected pools: GTA 35, Nvidia 8, Dacity 7, stock-paired 5, Anthropic 5, ni hao cat 2.

## Data vs 2026-11-21
**Anchors:**
- Financial: 2026-11-22 (last complete UTC day 2026-11-21).
- Chart: 2026-11-22 05:00 UTC.
- The 30-day daily bars end 2026-11-22 00:00 UTC. 378 token-days were reconciled; the largest relative gap was 1.3e-8.

**Headline numbers** (2026-11-21 in brackets):
- **Covered fee subtotal:** $1,517,468 ($1,659,072.03).
- **Indexed, 24h:** 42,119 launches (48,997) and 2,167 completions (2,355).
- **Creator earnings** (DefiLlama supply-side revenue, 16 venues): 24h $680,624 ($749,079); 30-day $35.7M ($36.6M).

| Narrative | Coins | 24h | 2026-11-21 | 30-day (2026-11-21) |
|---|---|---|---|---|
| Ni hao cat coins | 2 | $3,057,337 | $4,186,303 (1) | $214.9M ($212.1M) |
| Coins paired with tokenized stocks | 5 | $2,343,432 | $3,472,044 (4) | $476.2M ($485.3M) |
| GTA 6 launch coins | 35 | $2,265,963 | $9,764,067 (34) | $201.9M ($204.0M) |
| Anthropic IPO coins | 5 | $2,208,884 | $2,543,472 (5) | $32.7M ($30.2M) |
| Nvidia CEO scandal coins | 8 | $2,154,572 | $2,118,337 (9) | $29.5M ($26.7M) |
| GTA 6 Dacity Coin coins | 7 | $173,062 | $363,222 (10) | $136.8M ($145.2M) |

**Volume caveats:**
- **Nvidia:** 97% of the volume is from coins trading over 10x their market cap. JENSEN carries $1,980,898 at a $2,648 cap (748x), down from a $1,538,267 cap a day earlier. The newer Pump.fun Stand With Jensen trades at 72x a $1,442 cap.
- **GTA:** The State of Leonida trades at 61.5x a $2,250 cap (6% of the volume).
- **The other four narratives:** no caveat.

## Story changes
Posts were checked again today; the notices carry today's findings.
- **GTA:** IGN posted on 2026-11-20 that Rockstar confirmed $3.79 billion of GTA 6 retail sales in its first 24 hours (e1:3).
- **Dacity:** posts of 2026-11-19 and 2026-11-21 say the DCTY questline ends with the founder rugging the coin (e1:0).
- **Anthropic:** posts of 2026-11-19 cover the Nasdaq listing at $83 and about $81B raised. A 2026-11-20 post puts ANT near $89.67 pre-market (e1:2).
- **Ni hao cat:** posts say KFC changed its profile picture to the cat, then deleted it (e1:4). A 2026-11-22 post reads Ansem's "Merry Christmas" and "Mihao" posts as "Mihaomas" (e3:1).
- **Nvidia:** Business Insider posted on 2026-11-21 that Huang is working the phones on a return as CEO (e1:5).
- **Stock-paired:** today's search returned only xStocks tokenized-stock posts, with no new post about xstok, STONK or OTC.

Volume moves:
- GTA fell 77% to $2.27M, three days after release.
- Dacity fell 52%.
- Nvidia's volume is flat, but almost all of it is the collapsed JENSEN.

## Failures, refunds and billing
**Outside the panels:**
- e2:1 ("united $USEF") failed the cross-check and was refunded.
- e3:5 ("$RIZZMAS3") returned no posts and was refunded.
- c1:0 (Codex filterLaunchpads, the launchpad activity) was refunded: the cross-check called its timestamps "in the future". The body was retained inline and used by normalize, as on earlier days.
- c1:2 (getTokenBars, aliases p32–p62) came back as a body_ref. It was retrieved free with frames_get_tool_results (stored under seq 1) in 6 pages, 324,589 chars, length checked, inlined and marked `bodyRetrievedFrom`.
- f1–f6: every call was delivered. Some were marked "delivered with caveats" because the checker flagged future-dated chart points. In f4, seq 0 included a breakdown that was not requested, and seq 7 (Clanker dailyRevenue) ends in May 2025.
- No amount_exceeds_cap.

**Pump/FOMO panels:** all 62 planned batches (p1–p62, 617 calls) were called and saved. None were skipped for the budget.
- Plan: 63 collected coins (the registry before the Anthropic Coin hold-out) and 74 other coins; 171 coins were left out by the planner's ceiling.
- plannedCredits: 3,795. reservedByOtherBatchesCredits: 1,180.
- **FOMO was unavailable for the third day running:** all 341 FOMO calls were refunded (seller_error).
- Pump: 276 calls.
  - 181 delivered: 132 clean, 47 with caveats, 2 empty.
  - 69 caller_error, 17 seller_error and 9 negative_result, all refunded.
  - Several refunded trade and candle bodies were flagged for a wrong mint or future timestamps.
- 69 of the 137 planned coins have at least one delivered panel call.
- Panels billed **1,135 credits**.

**Billed credits** (sum of billing.charged_credits over 75 unique run ids): **1,985** of the 10,000 budget.
- 850 outside the panels.
- 1,135 for the panels.
- frames_get_usage after the run: 43,233 available (monthly allowance 10,399, purchased 32,834).

## Release
- rel-20261122T065859Z-10f22124 was published. This run's ingest added +8,652 observations.
- The local store was empty in this container, so all 61 runs were ingested.
- The article daily-2026-11-22 was written.
- The weekly editions W45 and W46 were already frozen and are unchanged.
