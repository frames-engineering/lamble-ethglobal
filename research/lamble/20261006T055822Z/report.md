# LAMBLE refresh 2026-10-06 (run 20261006T055822Z)

Anchors: financial exclusive end 2026-10-06T00:00Z (settled days to 2026-10-05), narrative chart anchor 2026-10-06T04:00Z, 30 complete UTC days ending 2026-10-06T00:00Z, indexed launchpad activity as of source timestamp 1791268925 (2026-10-06T06:42Z). Prior run for comparison: 20261005T055716Z (earlier financial anchor, so it is both `--prior` and `--prior-narrative`). Volume method unchanged (token level, all pools).

Billed credits: 532 across 14 unique Frames runs (d1 5, d2 2, e1 66, e2 72, e3 40, e4 11, f1 52, f2 58, f3 58, f4 58, f5 58, f6 41, c1 7, c2 4). The account balance went from 74,909 to 74,384 (83% of the monthly grant remaining); the 7-credit gap to the billed sum is the ledger's own rounding and refunds. 101 calls requested, 95 delivered; the 6 not delivered are listed below. Budget cap for the day was 2,500.

## New narratives

One: **Launchpad coins with on-chain rules** (`n-programmable-rules`, four coins, found outside the theme clusters, in the story searches and the volume ranking).

- Hooked (HOOKED, MeteoraDBC): metadata "Launch a token with rules built into the token itself. Solana runs the transfer hook on every trade." On 2026-10-04 @MeteoraEco (the account of the underlying Meteora protocol's ecosystem, not of Hooked) described it as powered by Meteora's dynamic bonding curve, using Token-2022 transfer hooks "to let builders choose who can hold tokens, how they trade, who gets rewarded". It was rejected on 2026-10-02 as one coin with no second coin sharing the mechanism.
- SPEC (Spec, MeteoraDBC): empty metadata, rejected on 2026-10-04 for having no source. The official spec.fun page scraped today (e4:0) describes "Solana Programmable Extension Coins" with extensions enforced on every transfer and lists $SPEC as its top token (24h volume about $0.6M, matching Codex).
- HOOKI (MeteoraDBC): empty metadata; the official @Hoookedpad account (2026-10-05) describes an AI agent given "the keys to a token's rules" on Hooked. The search that returned the post was refunded as a negative result (most tweets lacked both search words); the post is retained as evidence. The pool is 11 hours old with a 24h price change of about +4,899% (just under the 50x quarantine ratio); the volume caveat is shown for it.
- pickhooks (hooks, Flap): metadata "one token, one rule. a launchpad on BNB Chain where coins carry rules."; its own @pickhooks account (2026-10-04) announced version 2 with 40 rules.
- Bars: four coins (bar is three), combined 24h token volume at discovery $9,951,644 (HOOKED $3,649,475, HOOKI $4,452,997, SPEC $609,975, hooks $1,239,197; bar is $500K), independent source @MeteoraEco plus official pages and posts. In today's chart window the narrative has $12,173,523 24h, $78,075,526 7d and $84,592,299 30d (reconstructed membership, so the 30-day figure includes history before the coins joined; HOOKI began trading on 2026-10-05).
- HOOKER (Pump.fun, "Launch your token with custom hooks") fits the story but its market cap (about $68K) is under the $100K bar. SHOOKS stays in Super Intelligence (its metadata is about building Uniswap V4 hooks, a developer tool). FLAPHOOK (@Flap_Hook, 2026-10-05) is a new BNB Chain hook launchpad coin that the sweep did not return.
- Cap handling: the narrative set was at the six-narrative cap, so **Privacy coins (`n-privacy`) was retired** (rolling 24h token volume at discovery $2,633,420 against $9,951,644 for the new narrative; it was the smallest once USEFUL joined holder rewards, $3,093,830, and the smaller of the two on 7-day and 30-day volume in yesterday's run). Its story is current (Nullmask posts through 2026-10-04) and its coins are well above the retirement threshold, so this is a cap replacement, not a retirement for inactivity. The five pools (ZERO, DarkSwap DARK, Nullmask MASK, OMNI, ZkProof ZKD) were removed from `poolUniverse` and their membership intervals closed, not deleted.

## Cluster decisions (16)

| Cluster | Decision | Reason |
|---|---|---|
| k-intelligence | rejected | Shared word. OpenAI (Clanker, 18 hours old, $81.0M 24h volume at about $1.36M market cap) copies OpenAI's mission statement; Open AI (ChatGPT-6) and NVIDIA are namesake coins; the search for the coin found only posts about the company. ANIMA is a separate Flap framework; 币安智能 and bibi are the Binance lead. |
| k-creator | deferred | Feebits (FEEBITS; "Launch a coin for your favorite streamer") has two coins (Meteora DBC $23.4M, Pump.fun $3.9M) and official @feebitsdotfun and @pandez_ posts (2026-10-05/06: "Feebits is now live", "150k bits paid out to streamers"), but both are one product's coin; no third coin names the mechanism. |
| k-stocks | deferred | STONK, OTC and SLAZH (plus BEYOND and GSTOCK) use tokenized stocks in different mechanisms; the only independent post found (@floordottop 2026-10-05, OKX and ICE filing for round-the-clock US stocks) is about the sector. Flagged for owner judgment below. |
| k-binance | deferred (re-evaluated) | The 2026-10-05 12:00 UTC livestream happened: @binance posted the launch livestream and a recap ("Binance Intelligence is here... Agent OS, Binance AI, AI Pro"). Only two coins clear the member bars: 币安智能 ($2.5M, market cap about $936K) and bibi ($0.53M, about $159K). BAI (about $47K), 币安AI (about $82K) and BI (about $93K) are under the $100K market cap bar. Create it when a third clears. |
| k-agents | rejected | Generic word over different mechanisms (Cadence, Artifact Council, PRIORS, Attention+, older Robinhood agent coins); ANIMA and WISP form a separate Flap AI-agent theme with no shared source. |
| k-autonomous | rejected | Generic word (ANIMA, Ash Pokémon-card collector, HARMONIC). |
| k-layer | rejected | Generic word (ANIMA, bibi, QLE, WORM). |
| k-backed | rejected | "Backed" only (STONK, M2M, SLAZH). |
| k-digital | rejected | Generic word. UDR ("The U.S proposed a dividend for Americans"), ADTF, ECTF and NTDA are a US-dividend/trust-fund coin family whose siblings (USDF, USDP, ATFS, DOTF, IOF, VSOF, WSOS, WOSE, XRPN, GOIF, SARP) are quarantined; the story search returned no posts. |
| k-built | rejected | Generic word. |
| k-money | rejected | Generic word. |
| k-infrastructure | rejected | Generic word. |
| k-future | rejected | Generic word. |
| k-finance | rejected | Generic word. |
| k-fomo | rejected | Word only; HOOKER belongs to the hooks story but is under the market cap bar. |
| k-robinhood | rejected | Generic word over unrelated Robinhood Chain coins. |

Other leads looked at and not added (full list with reasons in `candidates.json`): phubber (two pools, $67.6M and $6.4M, blank metadata; one post says its website links to a previously rugged project's account), Lil Caesar, plague-themed launches (one qualifying coin), Mintro, Backers, Solborn, Souvenir (a launchpad coin; not shown to reward its own holders), Hamster, and 29 quarantined candidates (every flagged token with 24h volume of $250K or more).

## Member changes

- Added to Holder rewards in the paired asset (1): USEFUL COIN (USEFUL, LaunchLab), metadata "Paired with $USELESS. Finally, a relationship that pays.", the same pitch as STUPIDINU. Pool about 53 hours old; the narrative now has seven coins.
- Added to Launchpad coins with on-chain rules (4): HOOKED, HOOKI, SPEC, hooks (above).
- Removed with the retired Privacy narrative (5): ZERO, DARK, MASK, OMNI, ZKD.
- Not removed: Super Intelligence's SIP is at $894 24h pool volume today, under the $1,000 removal threshold for the first time (yesterday $1,497); it goes if it is under the threshold again tomorrow. No narrative is near the $100K retirement threshold.
- Registry: `poolUniverse` is 36 pools (14 Super Intelligence, 7 holder rewards, 5 AI influencers, 4 rules, 3 inference credits, 3 Agency); `dailyEvidence` swaps the Nullmask search for `$HOOKED transfer hook launchpad` (one page, eight searches and the `memecoin meta` trend query).

## Story changes

- Programmable rules: new, see above. A public post (@greedfi, 2026-10-05) is skeptical of the Hooked ecosystem and one review notes hooks are not permanent by default; both are in the copy.
- Super Intelligence: no new official source today. The 2026-10-04 White House Super Intelligence Force post and the reported SpaceXAI to SpaceXSI rename remain the latest; a 2026-10-06 post notes the account had not been renamed yet. Signals and story status are carried over.
- Binance Intelligence: now official (see k-binance), not a narrative yet.
- Holder rewards: @LaunchOnSF (2026-10-04) "Over $90,000,000 in rewards have been sent to holders of StonkFun reward coins" is repeated by BSC News (2026-10-06); still a platform claim. StonkFun's October 4 and 5 revenue posts concern its platform coin.
- Agency, AI influencers, inference credits: nothing newer than yesterday's sources (orbio.so page scraped; the @orbio_so search was refunded as a seller error and not used). Higgsfield's 2026-10-05 post adds more "AI influencer" promotion; Higgspad's own 2026-10-05 posts continue.

## Data changes vs the 20261005T055716Z run

| Narrative | Coins | 24h (chart window) | 24h change | 7d | 30d | Volume caveat |
|---|---:|---:|---:|---:|---:|---|
| Super Intelligence coins | 14 | $24,807,630 | -58.4% | $318,269,192 | $390,161,482 | none (yesterday 53%) |
| Agency living tokens | 3 | $17,815,522 | -44.4% | $103,224,538 | $99,051,211 | none (yesterday 16%) |
| AI influencer characters | 5 | $14,350,350 | -58.3% | $74,207,304 | $154,750,591 | none (yesterday 83%) |
| Launchpad coins with on-chain rules | 4 (new) | $12,173,523 | +5.1% | $78,075,526 | $84,592,299 | HOOKI, 36% |
| Fees paid as AI inference credits | 3 | $9,189,462 | +12.7% | $83,892,096 | $172,679,534 | none |
| Holder rewards in the paired asset | 7 (was 6) | $4,591,657 | +10.3% | $41,733,615 | $302,250,672 | none |

Yesterday's 24h chart-window values were $59,696,469 (Super Intelligence), $34,440,286 (AI influencers), $32,064,081 (Agency), $8,154,652 (inference credits), $4,059,424 (holder rewards) and $3,234,017 (privacy, retired). The 24h change compares today's members, including coins added today, with their own prior 24h (membership reconstructed today), so the Holder rewards and Rules changes are not like for like; the 30-day windows moved one day, so 30-day totals are not directly comparable with yesterday's. The volume caveat disappeared for three narratives because the flagged coins' turnover fell below 10x.

Financials (covered subtotal, 14 venues; StonkFun, BONK.fun, Graphite, Bags and Binance Alpha excluded as before): fee subtotal $5,474,550 (was $5,382,610). Summed over venues with data: creator earnings (supply-side revenue) 24h $3,027,814 over 15 venues (was $3,052,377), 7d $24,632,514 over 15 venues (was $24,815,502), 30d $147,535,762 over 10 venues with complete history (was $156,278,621). Indexed launches 86,255 (was 85,114) and completions 5,617 (was 5,573), 14 and 11 venues, beta provider-indexed counts; 83 indexed launchpad rows returned (same as yesterday). StonkFun's DefiLlama series ends 2026-10-04, one day behind the last settled day (2026-10-05), so its 24h/7d/30d metrics stay null (same as yesterday); its 30-day chart history is kept. No financial revisions were found (0 across providers); the 216 daily bars reconcile with hourly sums (max relative gap 2.2e-9).

## Failures and refunds

- Not delivered (6 of 101), none retried:
  - f1 seq 6 (pons-v2 `dailyFees`): refunded because the cross-check flagged dates in the future (from November 2026). The normalizer found every date up to the runtime date and 62 prior complete days matching, and kept the body as validated, non-delivered (the same handling as earlier days).
  - e1 seq 2 (`"@orbio_so" inference credit`): seller error (one of two tweets lacked "credit"); not used.
  - e2 seq 6 (`digital $UDR`): negative result (no tweet with both words); the posts were only about the ticker and no decision relied on them.
  - e3 seq 1 (`"dividend for Americans" $UDR`): negative result, zero tweets (used as "no source found" for the UDR family).
  - e3 seq 6 (`$OpenAI Clanker token`): negative result (no tweet had all three words); used only as "no coin-specific source".
  - e4 seq 2 (`$HOOKI Hooked`): negative result (most tweets lacked both words); the @Hoookedpad post it returned is retained as HOOKI evidence, with this caveat stated in the member rationale. Its tweets cannot enter the signal list (the normalizer only takes delivered calls).
- No price-change failures (`amount_exceeds_cap`).
- d2 was sent from the generated request file; all 249 lookups returned.
- Story checks exceeded `maxXSearchesPerRun` (28 X searches across e1 to e4 against 12; two page scrapes against 6), as in earlier days: 10 were the cluster theme searches from `discover.py stories`.
- No code changes to the refresh scripts. Offline changes: the importer's default run paths and the registry references point at this run; the registry's `poolUniverse` and `dailyEvidence` follow the curation above.

## Needs the owner's judgment

- Privacy coins was retired to make room for the new rules narrative under the cap rule. On the rolling 24h measure privacy and holder rewards were within 4% of each other ($2.63M against $2.54M) before USEFUL joined holder rewards; privacy was the weaker on 7-day and 30-day volume. Its story is current. If you would rather retire another narrative, or raise `maxActive`, privacy's memberships are closed intervals and can be reopened.
- The rules narrative is a mechanism theme (launchpads whose tokens carry on-chain rules), not a news event, and 36% of its chart-window volume is HOOKI, an 11-hour-old coin that traded about 17.6x its market cap. Two of its four coins (SPEC, HOOKI) have empty metadata and qualify on an official page or post, which the evidence rule allows; HOOKED had been rejected on 2026-10-02 as a single coin.
- Deferred leads that could become narratives but would need a slot: Binance Intelligence (two of three qualifying coins; three more are 7% to 53% below the market cap bar), tokenized stocks (STONK, OTC, SLAZH, BEYOND, GSTOCK, about $8.4M 24h at discovery, different mechanisms) and Feebits (one product, two pools).
- Rule calibration: at the six-narrative cap the "replace the weakest" test compares rolling 24h volume at discovery, which swings day to day; a rule using a multi-day measure would stop a narrative with a $310M 30-day total (holder rewards) from being the weakest on a single bad day. Theme-word clusters were again almost all generic words (13 of 16 rejected, 3 deferred); the rules story and the Binance lead came from the story searches and the volume ranking.
