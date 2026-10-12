# Daily refresh 2026-10-12 (run 20261012T055809Z)

Runtime 2026-10-12 05:58 UTC. Financial anchor (exclusive end) 2026-10-12T00:00Z, so the settled day is 2026-10-11; chart anchor 2026-10-12T04:00Z; 30 complete daily bars end 2026-10-12T00:00Z. Prior run and narrative baseline: 20261011T055716Z (financial anchor 2026-10-11, an earlier anchor). Billed 892 credits (sum of `billing.charged_credits` over 15 unique run ids) against the 2,500 cap; the project balance moved from 64,639 to 63,753, so the monthly balance is 63,753 credits (71% of the 90,000 grant), far above the 10,000 floor.

## New narratives

**One created: `n-credits-for-holders` (AI credits for holders), replacing Agency at the six-narrative cap.** Yesterday's deferred credits lead (`k-credits`) was re-evaluated with the follow-up the rule asks for:

- Coins: API (pump.fun, $1.07M 24h token volume at discovery), ORBIO (pons, $862K), LLMPad/LLM (pump.fun, $272K) and bInference/BINF (Flap, $89K): four coins on three covered launchpads whose metadata names AI credits for holders, about $2.29M combined (hourly all-pool sum for the four: $3,975,010). ORBIO and BINF are re-added: they were closed members of the retired `n-inference-credits`.
- Sources beyond metadata: Orbio's own page (orbio.so, scraped today, e3:1) sells LLM credits at a discount supplied by holders who offer unused credit; a rival project, @decentramindapp (2026-10-09, e3:2), says ORBIO pioneered the model it builds on; @TonyBinance (2026-10-10, e3:3) compares BINF and ORBIO as both turning token taxes into AI credits; @GemHuntersHQ (2026-10-10, e2:3) calls API "basically ORBIO, but better for holders"; @getbinference (2026-10-08, e3:3) says agents earned $16,722 of AI credit from their tokens' fees; and @CreditsPadsol (2026-10-09, e3:2) announced a new AI-credits launchpad. That meets `newNarrative` as written (an official page or X posts beyond metadata). It is still the projects' and traders' own claims, with no news coverage, which is the concern yesterday's report raised: **flagged for the owner**.
- Cap replacement: Agency had the lowest 24h token volume of the six at discovery ($1.32M, down from $2.81M; Launchpad coins with on-chain rules was a near tie at $1.32M), against $2.29M for the credits coins, and the credits story is current. Agency is above the $100K retirement line and its source (official @tryagency posts, 2026-10-01 to 2026-10-04) is still live, so this is a cap replacement by the 24h rule, not a retirement for inactivity. Its three coins (AGENCY, Aiden, SLEUTHY) are closed members.
- Not used: holdapi.lol (API's page) timed out (e3 seq 0, refunded); the Orbio page already carried the mechanism and the call was not retried.

## Cluster decisions (all 6)

| Cluster | Decision | Reason |
|---|---|---|
| k-credits | created (`n-credits-for-holders`) | See above. |
| k-stocks | assigned (`n-tokenized-assets`) | HUME MARKETS ("Tokenized stocks, all in one place. Perps. Options. Lending & Borrowing", $210K, created 2026-10-11) added, together with Ballast (BLLS, "Stock Token portfolios on @Robinhoodapp", $308K), which the word match missed. STONK ($1.87M, "Backed by stocks") and OTC ($733K, "earn stocks, pre-ipo, and yield") stay deferred: project-only sources and no tokenized-stock product. Kairo (trading agent) and GRASS (a game) are not tokenized-asset products. |
| k-earn | rejected | Generic word: apelink (referral buy-links, single coin), CLAWHUNTER (agent bounties), ORBIO (to credits), OTC (deferred stock-yield lead). |
| k-goes | rejected | Generic word over FARM (the farmfun.farm launchpad token), FIGHT, Pororo and TRIAN. |
| k-through | rejected | Generic word over apelink, CLAWHUNTER and LLM (LLM goes to credits). |
| k-robinhood | rejected | Venue word over MOTION (0%-fee trading terminal), Dots, GRASS and HUME (HUME assigned through k-stocks). |

Looked past the clusters:

- **US oil/dividend-fund coins** (deferred, strongest unresolved lead): American Oil Dividend Fund (AODF, Meteora, $16.6M, created 2026-10-11, the largest unflagged volume today), plus GOIF, USDF, a second and third AODF, DOTF, IOF, USOS, ROAR, TDF and UDR. These share a "dividend/oil fund" theme tied to posts about a $5,000 dividend for Americans (e3:6), but all of them except AODF-Meteora and an older rejected USDF are flagged by the quarantine rules (extreme 24h move or an implausible market cap on a new pool), so they cannot count; the posts found are promo and airdrop spam plus one warning that Trump did not endorse DOTF (e3:5, e3:6). Re-check as the flagged pools age past 168 hours.
- Super Intelligence: two Flap coins named TeslaSI added (below). TesIaSI (a lookalike spelling whose metadata claims Tesla was renamed, which the sources do not support), SpaceXSI永动机 (a chat-group ad) and a third TeslaSI (rejected earlier) are not added. "smoking Inu" (SI on pons) does not name Super Intelligence.
- PAPER ($52.0M, a Clanker perpetuals exchange) is a single coin; QLI ("Quantum QLi") does not claim post-quantum cryptography; NOCKAI is a single open-model coin; Cashed ("Turn creator fees into X money") stays with the deferred fee-routing lead.

Today's `curation.json` records 192 candidates (151 rejected, 28 quarantined, 13 deferred), appended to `candidates.json`.

## Member changes

- Added to `n-credits-for-holders`: API, ORBIO, LLM, BINF (new narrative; four coins).
- Added to `n-super-intelligence` (now 16 coins): Tesla Super Intelligence (TeslaSI, Flap, created 2026-10-11, $622K, about 7x its market cap) and TeslaSI with Chinese metadata that follows the SpaceXAI to SpaceXSI rename (Flap, created 2026-10-10, $393K).
- Added to `n-tokenized-assets` (now 11 coins): HUME and BLLS (both pons, created 2026-10-11).
- Removed: AGENCY, Aiden and SLEUTHY with the Agency narrative. No coin met the $1,000 removal line; the lowest pool volumes are SHOOKS ($4,159) and OP ($1,562, down from $55K), both above it.
- Retired: `n-agency` (cap replacement, above).
- Narratives (6; 47 constituents, was 42): Super Intelligence coins, AI influencer characters, AI credits for holders, Post-quantum coins, Tokenized stocks and RWA coins, Launchpad coins with on-chain rules.

## Narrative volumes (hourly all-pool sums to 04:00 UTC)

| Narrative | Coins | 24h | vs prior 24h (same members) | 7-day | 30-day | Yesterday's reported 24h |
|---|---|---|---|---|---|---|
| Super Intelligence coins | 16 | $5,648,735 | -47.2% | $79,459,263 | $444,199,323 | $10,672,227 |
| AI influencer characters | 5 | $4,550,339 | +9.4% | $48,472,648 | $192,643,288 | $4,161,118 |
| AI credits for holders | 4 | $3,975,010 | -38.6% | $42,500,583 | $180,215,019 | new |
| Post-quantum coins | 7 | $3,947,127 | -52.9% | $46,638,680 | $45,867,204 | $8,380,053 |
| Tokenized stocks and RWA coins | 11 | $2,813,909 | +30.6% | $21,716,388 | $75,966,346 | $2,142,595 |
| Launchpad coins with on-chain rules | 4 | $2,101,160 | -8.3% | $38,658,262 | $112,427,134 | $2,290,609 |

30-day totals apply today's membership to past days (the credits total includes ORBIO's earlier large days). Volume caveat shown on Super Intelligence only: SpaceX Super Intelligence traded over 10x its market cap (6% of the volume).

## Data changes vs yesterday

- Covered fee subtotal (14 venues, settled day 2026-10-11): $3,490,492.00, up 0.6% from $3,470,220.26. Same exclusions (StonkFun, BONK.fun, Graphite, Bags, Binance Alpha). The 30-day subtotal change is null.
- Creator earnings (DefiLlama supply-side revenue, 15 venues that define it, latest day): $1,785,134 against $1,832,601. 7-day $16,293,045 (prior $17,560,788). 30-day $116,920,114 across the 11 venues with 30 complete days (prior $122,075,420).
- Fees across the 18 venues with a daily series: 24h $3,596,218 (prior $3,548,284); 30-day $190,852,836 across 14 venues with 30 complete days (prior $196,892,837).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 57,410 created and 4,700 completed in 24h, against 62,372 and 4,308.
- Financial revisions: none of the overlapping complete days changed.
- Daily bars reconcile with hourly sums for 282 pool-days (maximum relative gap 3.2e-10).

## Story changes

- Super Intelligence: no newer official announcement than the 2026-10-04 White House SIF and SpaceXSI posts; one 2026-10-09 post reports Trump calling users of "Artificial Intelligence" the enemy. Volume across the coins fell about 47% (Ollie and SPACEXSI faded further). Copy extended for the two TeslaSI coins.
- Post-quantum: Drake's 2026-10-07 call was quoted by Business Insider on 2026-10-08 and posts were still appearing on 2026-10-12; volume fell about 53%.
- Tokenized assets: @RobinhoodCrypto's 2026-10-08 Stock Token ETF post is still the latest official item; new apps (HUME, Ballast) added; story notice refreshed.
- AI influencers, Programmable rules: no new official source; copy and signals unchanged (Higgspad posted "V3 is live. 800+ AI influencers" on 2026-10-11).
- Agency leaves the page; its 2026-10-12 posts in e1:4 were holder chatter and were not used.

## Failures, refunds and billing

- e3 seq 0 (holdapi.lol scrape) returned a timeout seller error and was refunded; not retried (the Orbio page supplied the mechanism).
- f1 seq 5 (StonkFun supply-side) and f6 seq 3 (four.meme supply-side) returned seller errors with bodies; retried once as f7 and both delivered (22 credits). f3 seq 0 (Graphite supply-side) is a refunded negative result (all zeros); Graphite is excluded from the subtotal, the body matches 419 prior days and is retained.
- c1 seq 4 and several fee calls were `delivered_with_caveats` and passed the normalizer's checks.
- Code change: `tests/frames-data.test.mjs` summed fee windows left to right while the normalizer uses an exactly rounded sum (`math.fsum`), which differed in the last bit (19754.06 vs 19754.059999999998) in one 7-day window; the test now uses an exactly rounded sum helper with the same strict equality. No assertion was weakened.
- Billed credits by batch: d1 25, d2 7, e1 94, e2 43, e3 62 (discovery and evidence 231); f1 97, f2 108, f3 97, f4 108, f5 108, f6 65, f7 22 (fees 605); c1 37, c2 19 (bars 56). Total 892 over 15 unique run ids. The balance fell by 886 (64,639 to 63,753).

## Flags for the owner

1. **Credits narrative sources**: it qualifies under the rule as written (official page plus third-party posts), but the sources are projects and traders, not news; if you want a stricter "independent" definition (news or a source unrelated to the coins), `newNarrative.evidence` should say so and this narrative would revert to a deferral.
2. **Agency cap replacement** was a near tie with Programmable rules on 24h volume ($1.32M each) and Agency still has a live source and the larger 7-day volume ($80M at yesterday's reading); the 24h rule picked it.
3. **Oil/dividend-fund lead** is the largest unresolved theme by volume but is mostly quarantined by the new-pool flags; it may qualify within days if enough pools age out.
4. **Cost**: a normal day is again about 900 credits (fees 605), above the 450-550 in the procedure.
