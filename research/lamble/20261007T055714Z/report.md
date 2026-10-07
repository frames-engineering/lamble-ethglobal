# LAMBLE refresh 2026-10-07 (run 20261007T055714Z)

Anchors: financial exclusive end 2026-10-07T00:00Z (settled days to 2026-10-06), narrative chart anchor 2026-10-07T04:00Z, 30 complete UTC days ending 2026-10-07T00:00Z, indexed launchpad activity as of source timestamp 1791353528 (2026-10-07T06:12Z). Prior run for comparison: 20261006T055822Z (earlier financial anchor, so it is both `--prior` and `--prior-narrative`). Volume method unchanged (token level, all pools).

Billed credits: 503 across 14 unique Frames runs (d1 retry 5, d1 first attempt 4, d2 2, e1 66, e2 72, e3 24, f1 52, f2 58, f3 52, f4 58, f5 58, f6 41, c1 7, c2 4). validation-report.json counts 499 because it lists only the 13 saved batches; the 4 credits of the discarded first d1 attempt are the difference. The account balance went from 74,384 to 73,887 (82% of the monthly grant remaining); the 6-credit gap to the billed sum is the ledger's own rounding and refunds. 94 calls were requested for the saved batches and 90 delivered. Budget cap for the day was 2,500.

## New narratives

One: **Binance Intelligence coins** (`n-binance-intelligence`, three coins on Flap), created from the cluster deferred on 2026-10-05 and 2026-10-06 once a third coin cleared the bars.

- 币安智能 (Binance Intelligence): empty metadata, so the name is the only text; pool created 2026-09-30, before the announcement. 24h volume at discovery about $1.62M, market cap about $315K, price down about 66% over 24h.
- bibi (Intelligence): metadata "Introducing a new layer of intelligence for everything finance. Join the Binance Intelligence launch livestream for an early look at what we've been building." Pool created 2026-10-04. About $0.24M 24h volume, market cap about $248K.
- 币安AI (Binance AI): metadata "币安马上出新的ai" ("Binance will soon release new AI"). Pool created 2026-10-05 at 14:39 UTC, after the livestream began. It cleared the market-cap bar today (about $178K; about $82K yesterday), the third qualifying coin.
- Bars: three coins (bar is three), combined 24h token volume at discovery $2,168,649 (bar is $500K). Independent sources: @binancezh posts of 2026-10-04 (livestream) and 2026-10-06 (Chinese-language launch AMA) in e2:9, and @scottmelker's 2026-10-06 post that Binance Intelligence has three products (Agent OS, Binance AI, Binance AI Pro) in e3:0. The coins are not shown to be issued by or affiliated with Binance.
- In today's chart window the narrative has $2,766,323 24h, $6,844,454 7d and $6,750,367 30d (reconstructed membership; the 30-day figure is a daily-bar window ending 2026-10-07T00:00Z and the 7-day figure is hourly to the chart anchor, so 7d can exceed 30d for young coins). 币安智能 is 80.5% of its volume, 币安AI 12.5%, bibi 7.1%.
- Cap handling: the set was at six, so **Holder rewards in the paired asset (`n-holder-rewards`) was retired** (rolling 24h token volume at discovery $1,658,008 against $2,168,649, the smallest of the six on that measure; the new story is current). **Flagged for the owner:** this is a cap replacement by the 24h rule, not retirement for inactivity. Holder rewards had the second-largest 30-day volume of the six in yesterday's run ($302.3M; 7d $41.7M), its story is still current (platform posts through 2026-10-06 in e1:3) and its seven coins (ZCAT, PUMPE, STUPIDINU, MMBTC, MASKCAT, SEC, USEFUL) were removed from `poolUniverse` with their membership intervals closed, not deleted.

## Cluster decisions (16)

| Cluster | Decision | Reason |
|---|---|---|
| k-binance | created (re-evaluated) | The three coins that clear the member bars now carry the Binance Intelligence story: 币安智能 (Binance Intelligence, about $1.62M 24h volume, market cap about $315K), 币安AI (Binance AI, about $0.31M, about $178K, up from about $82K yesterday) and bibi (Intelligence, about $0.24M, about $248K): combined about $2.17M against the $500K bar. Independent sources: @binancezh posts of 2026-10-04 and 2026-10-06 (e2:9) and @scottmelker's 2026-10-06 post on the three products (e3:0). Yesterday's deferral said to create it when a third coin cleared. At the cap it replaces holder rewards (about $1.66M at discovery, the smallest); BI (Binance Inu, about $65K) stays under the market-cap bar, BAI did not appear in today's sweep, and 币安支付, FLORK and BNBCAT carry no Binance Intelligence metadata. |
| k-intelligence | rejected | Shared word. 币安智能 and bibi are the Binance Intelligence coins handled in k-binance; SI276 ("Developed by @yhbryankimiq the World's Highest IQ Record Holder") is a separate IQ-record coin, not Super Intelligence or Binance Intelligence. |
| k-technology | deferred | Three coins named Texas Institute Of Technology and Science, ticker TITS (Meteora DBC $4.9M, StonkFun $2.0M and a second Meteora DBC pool $0.58M; 0.5 to 0.9 hours old; combined $7.5M). Posts say the ticker comes from Elon Musk's 2021 joke university name (Texas Institute of Technology and Science, cited in 2021 to 2024 posts and a Washington Post link) and today's coins use it, but the metadata is empty, all three pools are under one hour old and the only 2026 posts are promotion and call-group posts (e2:0, e3:2). It fails the metadata bar today; re-evaluate tomorrow. Flagged for owner judgment. |
| k-sym-TITS | deferred | Same three TITS coins as k-technology (shared ticker, empty metadata, under one hour old, promotion posts only); re-evaluate tomorrow. |
| k-built | rejected | Generic word over unrelated coins. BINDER (Binder Finance, perps on collectible card indexes), CATCRAFT (cat-block world), UDR (US-dividend coin family, siblings quarantined), DOT, SECTORAL, LIEGE and GRIFT share no mechanism. |
| k-platform | rejected | Generic word. GRIFFAIN (a Solana AI-agent platform coin, 16,878 hours old), mubarak and AGENCYBOOK (an Agency social platform coin, market cap about $59K) are unrelated; AGENCYBOOK is under the member market-cap bar for the Agency narrative. |
| k-powered | rejected | Generic word. DARK (privacy swaps), JUICE (PumpSwap liquidity), USA, TON618 and THESIS share no mechanism; the story search for DARK found only call-group posts. |
| k-earn | rejected | Generic word over different mechanisms (JUICE liquidity, OTC desks, DELTA liquidity staking, GRIFT game). |
| k-runs | rejected | Generic word. RULR ("deploy pumpfun coins like a smart contract. Set the rules at launch") fits the on-chain rules story but its market cap is about $78K, under the $100K bar, and the only posts about it are call-group posts (e2:5); ORBANCY (a Robinhood Chain coin whose mind runs its own treasury) and COW (blank metadata) are unrelated. |
| k-privacy | rejected | DARK, MASK and ZERO (three coins, about $3.55M combined) meet the member bars and privacy was retired from the narrative set on 2026-10-06 only because of the six-narrative cap, but a return needs a current independent source: today's search (e3:1) found Nullmask and DarkSwap posts through 2026-10-03/04 (project posts and promotion), nothing newer, and the combined volume is only about 11% above fees paid as AI inference credits, the weakest narrative it would replace. Not created; flagged for owner judgment. VEIL is under the market-cap bar. |
| k-united | rejected | Generic word. e/acc (removed earlier), UDR, USDF (US-dividend family, siblings quarantined), USA and UFG share no verified mechanism; the e/acc search was a seller error with only call-group posts. |
| k-liquidity | rejected | Generic word (JUICE, DELTA, FullMargin); no shared story or source. |
| k-finance | rejected | Generic word. KOMO ("Tokens paired with real things"; one post calls it a scam), WORM and UDR are unrelated; bibi is part of the Binance Intelligence narrative (k-binance). |
| k-agents | rejected | Generic word over different mechanisms (Attention+, PRIORS, ZZZ, SECTORAL, LIEGE, SECONDED, CRADLE); no shared source. |
| k-infrastructure | rejected | Generic word (JUICE, UDR, SECTORAL). |
| k-fomo | rejected | Word only (GOMO, FOMO人生, THESIS). |

Other leads looked at and not added (full list with reasons in `candidates.json`): TWEETCRAFT (about $11.2M, 10 hours old) and CATCRAFT form a two-coin Minecraft theme, one short of the bar; RULR fits the on-chain rules story but its market cap (about $78K) is under the $100K bar; BEAN is an AI-managed single coin; Binder, KOMO, JUICE, OpenAI (Clanker, extreme 24h move) and phubber are single or unrelated coins; DARK, MASK and ZERO (privacy) are discussed in k-privacy; plus the flagged tokens with 24h volume of $250K or more recorded as quarantined (see candidates.json).

## Member changes

- Added to the new Binance Intelligence narrative (3): 币安智能, 币安AI, bibi (above).
- Removed with the retired holder-rewards narrative (7): ZCAT, PUMPE, STUPIDINU, MMBTC, MASKCAT, SEC, USEFUL.
- Removed: SuperIntelligence Pets (SIP) from Super Intelligence. Its pool volume was $894 on 2026-10-06 and under $1,000 again today (discovery.py: below $1,000 on two consecutive observations), so the removal rule is met; the interval is closed. Super Intelligence now has 13 coins.
- Registry: `poolUniverse` is 31 pools (13 Super Intelligence, 5 AI influencers, 4 rules, 3 inference credits, 3 Agency, 3 Binance Intelligence); `dailyEvidence` swaps the `@LaunchOnSF rewards holders` search for `"Binance Intelligence" Agent OS` (one page, eight searches and the `memecoin meta` trend query).

## Story changes

- Binance Intelligence: new, see above. The 2026-10-05 12:00 UTC livestream (official @binance posts recorded in yesterday's run) is now corroborated by @binancezh (2026-10-04 and 2026-10-06) and @scottmelker (2026-10-06).
- Programmable rules: Hooked (@Hoookedpad, 2026-10-06) says its AI-assisted hook creation engine now includes staking; @signalcalls (2026-10-06) describes pickhooks as a BNB Chain launchpad with 40+ hooks. No change to the narrative copy or signals.
- Super Intelligence: no new official source today (posts of 2026-10-04 to 2026-10-06 repeat the Super Intelligence Force and the reported SpaceXSI rename). Signals and story status are carried over.
- Agency, AI influencers, inference credits: nothing newer than yesterday's sources besides Higgsfield and Agency promotion posts (@tryagency 2026-10-06 on Higgsfield templates; @wispbsc 2026-10-06 on Genjutsu presets). The orbio.so page scrape returned content consistent with before.
- Privacy: not restored, see k-privacy. Holder rewards: retired, see above.

## Data changes vs the 20261006T055822Z run

| Narrative | Coins | 24h (chart window) | 24h change | 7d | 30d | Volume caveat |
|---|---:|---:|---:|---:|---:|---|
| Agency living tokens | 3 | $14,750,961 | -17.2% | $117,975,499 | $116,291,189 | none |
| Super Intelligence coins | 13 (was 14) | $12,128,138 | -51.1% | $251,690,389 | $405,653,438 | none |
| Fees paid as AI inference credits | 3 | $9,303,303 | +1.2% | $88,891,111 | $180,391,480 | none |
| AI influencer characters | 5 | $8,564,419 | -40.3% | $81,016,083 | $166,485,814 | none |
| Launchpad coins with on-chain rules | 4 | $6,440,525 | -47.1% | $80,515,333 | $91,764,600 | none |
| Binance Intelligence coins | 3 (new) | $2,766,323 | +5.8% | $6,844,454 | $6,750,367 | none |

Yesterday's 24h chart-window values were $24,807,630 (Super Intelligence), $17,815,522 (Agency), $14,350,350 (AI influencers), $12,173,523 (rules), $9,189,462 (inference credits) and $4,591,657 (holder rewards, retired). The 24h change compares today's members with their own prior 24h (membership reconstructed today), so the Binance Intelligence change is not like for like, and the 30-day windows moved one day. No volume caveat is shown for any narrative.

Financials (covered subtotal, 14 venues; StonkFun, BONK.fun, Graphite, Bags and Binance Alpha excluded as before): fee subtotal $5,173,673 (was $5,474,550). Summed over venues with data: creator earnings (supply-side revenue) 24h $2,827,901 over 15 venues (was $3,027,814), 7d $23,406,940 over 15 venues (was $24,632,514), 30d $141,353,706 over 10 venues with complete history (was $147,535,762). Indexed launches 85,837 (was 86,255) and completions 6,026 (was 5,617), 14 and 11 venues, beta provider-indexed counts; 83 indexed launchpad rows returned (same as yesterday). StonkFun's DefiLlama series ends 2026-10-05, one day behind the last settled day (2026-10-06), so its 24h/7d/30d metrics stay null (same as yesterday); its 30-day chart history is kept. No financial revisions were found (0 across providers); the 186 reconciled daily bars match hourly sums (max relative gap 6.9e-10).

## Failures and refunds

- First d1 attempt discarded (not saved, 4 credits): I retyped the request by hand and dropped one character from one token address in the snapshot call, and its Solana sweep call also returned a seller error. I caught the mismatch by comparing the sent calls with the request file, re-sent d1 once with the exact request (all 4 calls delivered, saved as d1), and recorded the retry key in `raw/d1-request.json`. Every later batch was compared against its request file before saving and all matched.
- Not delivered (4 of 94 in the saved batches), none retried:
  - f1 seq 6 (pons-v2 `dailyFees`) and f3 seq 1 (genius.fun `dailyFees`): refunded because the cross-check flagged dates in the future (November and December 2026). The normalizer found every date up to the runtime date and the prior complete days matching, and kept both bodies as validated, non-delivered (the same handling as pons-v2 on earlier days). genius.fun is a new instance of that class today.
  - e1 seq 5 (`"@tryagency" AI agents launchpad`): negative result (fewer than all search words in some posts); the posts were read and not relied on for a decision.
  - e2 seq 6 (`united $e/acc`): seller error; only call-group posts, not used.
