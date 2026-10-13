# Daily refresh 2026-10-13 (run 20261013T055731Z)

Runtime 2026-10-13 05:57 UTC. Financial anchor (exclusive end) 2026-10-13T00:00Z, so the settled day is 2026-10-12; chart anchor 2026-10-13T04:00Z; 30 complete daily bars end 2026-10-13T00:00Z. Prior run and narrative baseline: 20261012T055809Z (financial anchor 2026-10-12, an earlier anchor). Billed 936 credits (sum of `billing.charged_credits` over 13 unique run ids) against the 2,500 cap; the project balance moved from 63,753 to 62,824 (929; the ledger and the per-run sums differ by 7), so the monthly balance is 62,824 credits (70% of the 90,000 grant), far above the 10,000 floor.

## New narratives

**One created: `n-creator-fee-routing` (Creator fees routed to people), replacing Post-quantum at the six-narrative cap.**

- Coins (six, three covered launchpads, about $6.74M combined 24h token volume at discovery; hourly all-pool sum for the six at the chart anchor: $7,105,240): MarsX (pump.fun, $4.87M, pool created 2026-10-12; "Fees to @arikuschnir via UsePaid"), TeleMoney/TM (pump.fun, $657K, 2026-10-10; "Launch coins on pumpfun with fees redirected to any telegram username"), Pepper The Raccoon (pump.fun, $586K, 2026-10-10; "redirecting fees to his Owner"), slopcannon (pump.fun, $370K, 2026-09-26; "Fees to @boneGPT via UsePaid"), Cashed Money/CASHED (pons, $143K, 2026-09-18; "Fees to @GetCashedMoney via Cashed") and WIRED (Flap, $112K, 2026-09-26; "Token launches with fees wired to social media accounts"). slopcannon and WIRED were rejected earlier, and TM, Pepper and CASHED were a deferred "fee-routing lead" since 2026-10-03 (project-only sources, not re-checked); MarsX's $4.87M made the lead the largest unassigned theme of the day.
- Sources beyond metadata: usepaid.app (scraped today, e3:0) says "UsePaid routes each coin's creator fees to the X account it's launched for. The fees are held for that X user to claim."; @TeleMoneySOL posts of 2026-10-10 to 2026-10-12 (e3:3) describe the Telegram-username version and report 108 coins launched, 262.8 SOL of creator fees generated and 17,411.2 GRAM paid out; @PickACycle (2026-10-12, e3:1) says one pump.fun coin's fees can now go to UsePaid, OTC desks and agencypad at once; @Joindotfun (2026-10-07, e3:1) announced a waitlist for launching a coin for any creator and sending the fees to them. That meets `newNarrative` as written (an official page and posts beyond metadata), the same bar the credits narrative met yesterday. All of it is the tools' and projects' own claims: no news coverage, payouts not verified, no affiliation among the coins checked. **Flagged for the owner.**
- Cap replacement: Post-quantum had the lowest 24h token volume of the six at discovery ($1.42M, down from $3.95M in yesterday's sample; Launchpad coins with on-chain rules was next at $1.63M), against $6.74M for the new coins, and the new story is current. Post-quantum is above the $100K retirement line and its defining source (Justin Drake's 2026-10-07 "bunker mode" call) is still being discussed (e1:7: MARA Foundation interview 2026-10-12, Starknet chapter 2026-10-13), so this is a cap replacement by the 24h rule, not a retirement for inactivity. Its seven coins (QI, PQC, Tardigrade, Quantcum, BNKR, BUNKER, QHOST) are closed members. Note: the new narrative's 71% share from MarsX alone (about 12 hours old, over 10x its market cap) means the volume caveat is shown on it.
- Not scraped: Cashed and WIRED sites (their metadata states the mechanism and the UsePaid and TeleMoney sources describe it).

## Cluster decisions (all 12)

| Cluster | Decision | Reason |
|---|---|---|
| k-fees | created (`n-creator-fee-routing`) | See above. SOLVE (fees reward agents), BOTS, VSWAP and HARMONIC share the word but not the mechanism. |
| k-creator | assigned (`n-creator-fee-routing`) | CASHED joins through k-fees; [ss] (AI TV station) and HARMONIC (agent that burns its own fees) are not routing tools. |
| k-agents | rejected | HIRE ($8.2M, created 2026-10-12; metadata only "Launched on discord.gg/uxento"): posts describe a pair-with-HIRE launchpad with AI marketing agents (e2:0) but no metadata or independent source names a mechanism shared by other coins. SOLVE, ZEREBRO, WISP unrelated. Revisit HIRE. |
| k-fund | rejected | HUMPH is a camel meme ("born with a reserve"); AODF is the oil/dividend-fund lead (deferred; volume fell from $16.6M to $1.8M); BOTS unrelated. |
| k-stocks | rejected | STONK ($3.6M, StonkFun's own token; posts found are August and September promotion, e2:3) and OTC stay deferred; RAETO ("Your tokenized stocks pay for your AI inference") has a $68K market cap, under the $100K member bar. VERDEX (tokenized-markets marketplace the word match missed) was added to Tokenized stocks. |
| k-platform, k-anything, k-market, k-used, k-next, k-earn, k-agent | rejected | Generic words over unrelated coins (REA, MOBY, BOTS, VSWAP, ZEREBRO, CHILLGUY, Bear, ANUBIS, POLAR, JUSTQ, VRAX, SOLVE, OTC, BLUFF, Grok Bot, HARMONIC); the story-search posts are caller and promotion posts (e2:4 to e2:9). RAETO would fit AI credits for holders if it passes $100K. |

Looked past the clusters: a "Custom Pairs" update (@a1lon9, 2026-10-11, e1:9), STONK/HIRE/FEED/shard/nox "launch a coin paired with anything / a penny stock" launchpads: no coin metadata names the mechanism, so no narrative (lead); the oil/dividend-fund coins remain quarantined by the new-pool rules (GOIF, DOTF, IOF, UDR); SI-named BNB Chain coins (GROKSI, BinanceSI) have empty or one-word metadata and were not added.

Today's `curation.json` records 197 candidates (162 rejected, 25 quarantined, 9 deferred, 1 removed), appended to `candidates.json`.

## Member changes

- Added to `n-creator-fee-routing` (new narrative, six coins): MarsX, TeleMoney (TM), Pepper The Raccoon, slopcannon, Cashed Money (CASHED), Wired fees to socials (WIRED).
- Added to `n-tokenized-assets` (now 12 coins): VERDEX (pons, "The front door to tokenized markets. 226 real-world assets, 12 issuers, 70 chains, one order.", $153K at discovery, pool about 351 hours old at discovery).
- Removed: QI, PQC, Tardigrade, Quantcum, BNKR, BUNKER, QHOST with the Post-quantum narrative. No other coin met the $1,000 removal line.
- Retired: `n-post-quantum` (cap replacement, above).
- Narratives (6; 47 constituents, unchanged): Super Intelligence coins (16), Creator fees routed to people (6), AI credits for holders (4), AI influencer characters (5), Tokenized stocks and RWA coins (12), Launchpad coins with on-chain rules (4).

## Narrative volumes (hourly all-pool sums to 04:00 UTC)

| Narrative | Coins | 24h | vs prior 24h (same members) | 7-day | 30-day | Yesterday's reported 24h |
|---|---|---|---|---|---|---|
| Super Intelligence coins | 16 | $7,605,188 | +34.6% | $62,271,055 | $450,798,900 | $5,648,735 |
| Creator fees routed to people | 6 | $7,105,240 | +57.3% | $31,147,480 | $64,905,851 | new |
| AI credits for holders | 4 | $5,172,182 | +30.1% | $38,870,752 | $183,800,990 | $3,975,010 |
| AI influencer characters | 5 | $2,744,765 | -39.7% | $36,867,062 | $195,371,349 | $4,550,339 |
| Tokenized stocks and RWA coins | 12 | $2,515,584 | -10.7% | $23,012,020 | $78,450,153 | $2,813,909 |
| Launchpad coins with on-chain rules | 4 | $2,110,665 | +0.5% | $28,595,404 | $114,401,883 | $2,101,160 |

30-day totals apply today's membership to past days. Volume caveats shown: Creator fees (MarsX over 10x its market cap, 71% of the volume), AI credits (LLMPad, 2%) and Tokenized stocks (Mintfolio, 14%); the Super Intelligence caveat (SpaceX Super Intelligence) no longer applies.

## Data changes vs yesterday

- Covered fee subtotal (14 venues, settled day 2026-10-12): $4,028,169.00, up 15.4% from $3,490,492.00. Same exclusions (StonkFun, BONK.fun, Graphite, Bags, Binance Alpha). The 30-day subtotal change is null.
- Creator earnings (DefiLlama supply-side revenue, 15 venues that define it, latest day): $2,061,042 against $1,785,134. 7-day $15,326,808 (prior $16,293,045). 30-day $112,409,057 across 12 venues with 30 complete days (prior $116,920,114 across 11, so the two 30-day totals are not like-for-like: one more venue now has 30 complete days).
- Fees across the 18 venues with a daily series: 24h $4,181,749 (prior $3,596,218); 30-day $186,315,894 across 15 venues with 30 complete days (prior $190,852,836 across 14).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 70,222 created and 4,270 completed in 24h, against 57,410 and 4,700.
- Financial revisions: LaunchLab fees, revenue and supply-side series were revised for older days (216, 214 and 103 days, 2025-04-16 to 2025-11-17; fees roughly 4 to 5 times the earlier values on the earliest days); none of the revised days is inside the last 30 days or the settled window. No other overlapping complete day changed.
- Daily bars reconcile with hourly sums for 282 pool-days (maximum relative gap 2.6e-10). 2,137 pre-creation zero buckets are recorded.

## Story changes

- Creator fees routed to people (new): see above; the sources are the tools' own pages and posts, all dated 2026-10-07 to 2026-10-12 (UsePaid's earliest post on X in the results is 2026-09-24).
- Super Intelligence: no newer official announcement than the 2026-10-04 White House SIF and SpaceXSI posts; the 2026-10-12 $SI posts are from the SI276 project (a developer burn update and a video message) and a different project using the ticker (Silicon Interchain). Volume across the coins rose 34.6% versus the prior 24 hours.
- Tokenized assets: @RobinhoodCrypto posted on 2026-10-12 that Robinhood Chain turned 100 days old; the 2026-10-08 Stock Token ETF exploration remains the latest product item. VERDEX added.
- AI credits for holders: orbio.so scraped again (e1:1); @CryptoRank_VCs (2026-10-12) lists Orbio as a Robinhood Chain token for earning OpenRouter credits from fees; no new third-party comparison posts.
- AI influencers, Programmable rules: newest items are @Higgspad's 2026-10-11 "V3 is live. 800+ AI influencers" and @Hoookedpad's 2026-10-12 Options hook; copy and signals unchanged.
- Post-quantum leaves the page; posts about Drake's call were still appearing on 2026-10-13.

## Failures, refunds and billing

- Refunded negative results (no charge): e1 seq 6 (SpaceXSI/SIF search, 11 tweets returned, used as the story source), e2 seq 4 (platform $REA search), c1 seq 3 (Robinhood Chain hourly bars: data came back and was used, the seller classed it negative because some values are zero). No call failed; none was retried.
- `delivered_with_caveats`: f1 seq 2, f2 seq 0 and 4, f4 seq 4, 7 and 8 (venues whose series end earlier than today or carry projected dates, already known), f6 seq 3 (four.meme supply-side: the caveat said the series looked like protocol revenue; checked, it equals fees minus revenue to the dollar on the last days, 182 = 5,242 - 5,060, so it is supply-side), plus tweet-keyword caveats on e1 seq 3 and 9 and e2 seq 1 and 8, and token-network and createdAt caveats on d1 seq 3, d2 and c1 seq 5. All passed the normalizer's checks.
- No code change was needed except repointing the importer defaults and registry references.
- Billed credits by batch: d1 25, d2 7, e1 90, e2 97, e3 51 (discovery and evidence 270); f1 108, f2 108, f3 108, f4 108, f5 108, f6 76 (fees 616); c1 31, c2 19 (bars 50). Total 936 over 13 unique run ids. The balance fell by 929 (63,753 to 62,824).

## Flags for the owner

1. **Creator-fee-routing sources** are the tools' own page and posts (UsePaid, TeleMoney) plus third-party tool posts, not news; same caveat as the credits narrative. If `newNarrative.evidence` should require a source unrelated to the coins, both narratives would revert to deferrals.
2. **Post-quantum cap replacement**: Post-quantum still has a live source (Drake's call is current) and the larger 7-day volume ($46.6M at yesterday's reading versus $31.1M for the new narrative); the 24h rule picked the replacement. MarsX alone is 71% of the new narrative's 24h volume and is about 12 hours old, so the narrative's weight rests on one fresh, high-turnover coin; the volume caveat is shown.
3. **Strongest unresolved leads**: HIRE ($8.2M, pump.fun, pair-with-HIRE launchpad with AI marketing agents; metadata names no story), the oil/dividend-fund coins (AODF down to $1.8M, others still quarantined) and the "launch a coin paired with anything / a penny stock" launchpads (STONK, shard, nox, FEED).
4. **Cost**: a normal day is again about 940 credits (fees 616), above the 450-550 in the procedure.
