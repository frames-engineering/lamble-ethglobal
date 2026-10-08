# LAMBLE refresh 2026-10-08 (run 20261008T055710Z)

Anchors: financial exclusive end 2026-10-08T00:00Z (settled days to 2026-10-07), narrative chart anchor 2026-10-08T04:00Z, 30 complete UTC days ending 2026-10-08T00:00Z, indexed launchpad activity as of source timestamp 1791439925 (2026-10-08T06:12Z). Prior run for comparison: 20261007T055714Z (earlier financial anchor, so it is both `--prior` and `--prior-narrative`). Volume method unchanged (token level, all pools).

Billed credits: 505 across 15 unique Frames runs (d1 4, d1 evm_recent retry 2, d2 2, e1 74, e2 72, e3 16, f1 58, f2 52, f3 52, f4 58, f5 58, f6 41, f7 6, c1 6, c2 4). validation-report.json counts 503 because the d1 retry (`raw/d1b-evm-recent-retry.json`, run run_4738b3bf9c344fedbf2816d374f06ebf) is kept as a raw reference outside the normalized batches. The account balance went from 72,880 to 72,382 (80% of the monthly grant remaining); the 7-credit gap to the billed sum is the ledger's own rounding and refunds. Budget cap for the day was 2,500.

## New narratives

One: **Tokenized stocks and RWA coins** (`n-tokenized-assets`, category Stonks, four coins), created from the k-tokenized, k-assets and k-stocks clusters.

- Borro.Markets (BORRO, pons, Robinhood Chain): metadata "Lend, borrow and short stock tokens. Earn rent on what you lend. On Robinhood Chain." Pool created 2026-10-05 19:25 UTC.
- HyperDex (HYDX, pons, Robinhood Chain): "Unified Marketplace for Tokenized Assets & RWAs". Pool created 2026-09-24.
- Prism Assets (PRISM, Flap, Robinhood Chain): "a marketplace for buying, selling & tokenising real-world assets with AI". Pool created 2026-08-04.
- Tokenize Everything (EVERYTHING, Pump.fun, Solana): metadata calls tokenized RWAs the biggest crypto meta of the last year and a half. Pool created 2026-10-07 07:02 UTC (about 23 hours old at discovery); price up about 4,600% in 24h; one 2026-10-07 post by @RaOnChain calls it a scam with supply held by inorganic wallets (single-account claim, not verified). It is 83.5% of the narrative's 24h volume.
- Bars: four coins (bar is three) with $7.56M 24h in the chart window (discovery sample $7.56M; $1.22M without EVERYTHING) against the $500K bar. Independent sources: @RobinhoodCrypto, 2026-09-08, "$150M in Robinhood Stock Tokens TVL on Robinhood Chain" (e3:0); the 2026-10-07 @RobinHubHB recap saying @RobinhoodCrypto outlined the Stock Token cycle (e3:0); @Borromarkets 2026-10-06 on Uniswap v4 hooks for stock tokens (e2:7). The coins are not shown to be issued by or affiliated with Robinhood.
- In today's chart window the narrative has $7,564,261 24h, $11,997,039 7d and $41,343,259 30d (reconstructed membership; the 24h change of +1,200.6% compares today's members with their own prior 24h and is not like for like).
- OGEE (OgeePerps, "power perpetuals for tokenized stocks", @OgeePerps posts 2026-10-07) fits the story but its market cap (about $63K) is under the $100K bar: deferred, add if it clears.
- Cap handling: the set was at six, so **Binance Intelligence coins (`n-binance-intelligence`) was retired** by the cap rule (rolling 24h token volume at discovery $567,612, the smallest of the six, against about $7.56M for the new narrative). **Flagged for the owner:** this is a cap replacement by the 24h rule one day after Binance Intelligence was created, not retirement for inactivity (it is above the $100K retirement threshold and its launch story is still current). Its three coins' memberships are closed.

## Cluster decisions (17)

| Cluster | Decision | Reason |
|---|---|---|
| k-tokenized | created (n-tokenized-assets) | EVERYTHING (Tokenize Everything, Solana), HYDX (HyperDex, "Unified Marketplace for Tokenized Assets & RWAs") and, with k-assets, BORRO (lend/borrow/short stock tokens) and PRISM (tokenising real-world assets) have metadata that names tokenized stocks or RWAs. Four coins clear the member bars (market cap $100K or more, no flag) with about $7.56M combined 24h volume against the $500K bar ($1.22M without EVERYTHING). Independent sources: @RobinhoodCrypto (2026-09-08, $150M Stock Tokens TVL on Robinhood Chain) and the 2026-10-07 recap of its Stock Token cycle post (e3:0). OGEE (power perps for tokenized stocks) fits the story but its market cap is about $63K, under the $100K bar, so it is not added yet. At the six-narrative cap it replaces Binance Intelligence (24h $567,612 at discovery, the smallest); flagged for owner judgment. |
| k-assets | created (n-tokenized-assets) | Same narrative as k-tokenized: EVERYTHING, HYDX and PRISM ("a marketplace for buying, selling & tokenising real-world assets") are three of its four coins. |
| k-stocks | created (n-tokenized-assets) | Partly folded into the tokenized stocks and RWA narrative: EVERYTHING joins it. OGEE fits the story but is under the $100K market-cap bar (deferred). STONK ("Launch tokens / Backed by stocks.") is StonkFun's own launchpad coin: the line is a tagline and no source ties it to tokenized stocks, so it stays deferred ($9.4M 24h, market cap $133M). OTC ("Over-The-Counter Desks, earn stocks, pre-ipo, and yield.") is vague and no source was found; deferred. |
| k-agent | rejected | Generic word. GRIFFAIN (a now-inactive Solana AI-agent platform coin, about 16,900 hours old; posts are price calls), PRIORS (agent credit on Robinhood Chain, removed earlier), WORM (security layer for agentic finance) and HARMONIC (an agent that claims its own creator fees) share no mechanism or source. |
| k-using | rejected | Generic word over unrelated coins. AnyPS5 (a PS5 homebrew meme; posts are about a PS5 controller tool and call groups), GIF (deployed using j7tracker) and TON618 (a brain/superintelligence launchpad claim, market cap about $75K, under the bar). |
| k-fees | rejected | Generic word over different mechanisms: e/acc (removed earlier; the search found only call-group posts), slopcannon (fees to @boneGPT via UsePaid), ANSEM, PRIORS, BLOKEYS, BUNNIL (team fees fund agents), HARMONIC and UFG (creator fees fund an ETH treasury). No shared story or source. |
| k-deployed | rejected | Generic word. AnyPS5 and GIF were deployed with j7tracker; BBC (Big Bundle Cat) is a Mosh coin. No shared story. |
| k-powered | rejected | Generic word. PQC (post-quantum-proof tokens on Pump.fun, 3 hours old; the search found call-group posts), TON618, TasQ, USA and THESIS share no mechanism. TasQ and TON618 use "SI" wording; see candidates. |
| k-market | rejected | Generic word. 404 (a "page not found" meme, call-group posts), PQC and THESIS are unrelated. |
| k-united | rejected | Generic word. e/acc, USDF, UDR and USA are mostly the quarantined US-dividend family or unrelated; UFG funds an ETH treasury. No verified shared mechanism. |
| k-robinhood | rejected | Generic word (a chain name). BORRO and OGEE belong to the tokenized-stock story (see k-tokenized); PRIORS, CrawlScan (a memecoin crawler), GOLDEN (Robinhood's first crypto award), GLIM (a pixel strategy game) and COMD (an agent law firm) are unrelated. |
| k-brain | rejected | Word only. TON618 (market cap about $75K, under the bar; "Autonomous SI launchpad"), BCI (a holder-as-neuron mapped-brain game) and oBrain share no verified story. |
| k-earn | rejected | Generic word over different mechanisms (BORRO lending, OTC desks, DELTA liquidity staking, GRIFT game, GLIM game). |
| k-fomo | rejected | Word only. GOMO is a social trading app that pitches itself against Fomo (posts are promotion), UPAY pays "with fomo", THESIS and FOMO人生 are unrelated. |
| k-finance | rejected | Generic word. ZKDARK (privacy darkpool), UDR (quarantined family) and WORM are unrelated; the privacy theme has no current independent source in this run. |
| k-watch | rejected | Generic word. 分身 (AI clones on a BNB social feed), POKEDEX, THESIS and VRAX are unrelated. |
| k-technology | rejected | Previous deferral re-evaluated: only one of the three TITS ("Texas Institute Of Technology and Science") pools is still in the sweep (StonkFun, about $2.1M 24h, market cap about $158K, price down about 53%); its metadata is still empty and the only posts are call-group promotion. Fewer than three qualifying coins with metadata naming a story today. |

Other leads looked at and not added (full list with reasons in `candidates.json`): TasQ ("Your SI (AI), your data": SI as wordplay for AI, no Super Intelligence reference; deferred), TON618 ("Autonomous SI launchpad", market cap about $75K under the bar), CAPYBARA (two day-old pools with empty metadata), TWEETCRAFT and CATCRAFT (Minecraft theme, two coins), the Mosh coins BUN and BBC (two coins), PQC (post-quantum token launches, not the transfer-hook mechanism), and the flagged tokens with 24h volume of $250K or more recorded as quarantined (US-dividend UDR/USDF/USDP, oil WSOS/WOSE/GOIF, SENTS, XRPN and others).

## Member changes

- Added to the new tokenized stocks and RWA narrative (4): EVERYTHING, BORRO, HYDX, PRISM.
- Removed with the retired Binance Intelligence narrative (3): 币安智能, 币安AI, bibi.
- No other removals. SLEUTHY (Agency, $886 pool volume) and SGI (Super Intelligence, $531) are under the $1,000 line for the first time; the rule needs two consecutive observations, so both stay and are first in line tomorrow.
- Registry: `poolUniverse` is 32 pools (13 Super Intelligence, 5 AI influencers, 4 rules, 3 inference credits, 3 Agency, 4 tokenized assets); `dailyEvidence` swaps the `"Binance Intelligence" Agent OS` search for `Robinhood Chain stock tokens` (one page, eight searches and the `memecoin meta` trend query).

## Story changes

- Tokenized stocks and RWA: new, see above.
- Binance Intelligence: retired (cap), no newer source checked today beyond what yesterday's run recorded.
- Super Intelligence: posts of 2026-10-04 to 2026-10-07 repeat the Super Intelligence Force and the reported SpaceXSI rename; no new official source. Signals and story status carried over.
- Programmable rules: Hooked posts of 2026-10-08 (holder-crate and AI-assisted hook creation commentary) add nothing new to the narrative copy. Agency, AI influencers, inference credits: nothing newer than yesterday's sources besides Higgsfield and Agency promotion posts. The orbio.so page scrape returned content consistent with before.

## Data changes vs the 20261007T055714Z run

| Narrative | Coins | 24h (chart window) | 24h change | 7d | 30d | Volume caveat |
|---|---:|---:|---:|---:|---:|---|
| Super Intelligence coins | 13 | $8,261,335 | -31.9% | $192,842,810 | $414,285,559 | none |
| Tokenized stocks and RWA coins | 4 (new) | $7,564,261 | +1,200.6% (not like for like) | $11,997,039 | $41,343,259 | none |
| Launchpad coins with on-chain rules | 4 | $5,326,617 | -17.3% | $85,221,863 | $96,163,069 | none |
| Agency living tokens | 3 | $5,307,231 | -64.0% | $123,282,730 | $122,630,604 | none |
| Fees paid as AI inference credits | 3 | $4,520,758 | -51.4% | $81,228,045 | $181,094,854 | none |
| AI influencer characters | 5 | $3,662,592 | -57.2% | $82,942,469 | $170,677,079 | none |

Yesterday's 24h chart-window values were $12,128,138 (Super Intelligence), $6,440,525 (rules), $14,750,961 (Agency), $9,303,303 (inference credits), $8,564,419 (AI influencers) and $2,766,323 (Binance Intelligence, retired). The 30-day windows moved one day. Market-wide volume fell sharply for most narratives.

Financials (covered subtotal, 14 venues; StonkFun, BONK.fun, Graphite, Bags and Binance Alpha excluded as before): fee subtotal $4,311,814 (was $5,173,673). Summed over venues with data: creator earnings (supply-side revenue) 24h $2,255,619 over 15 venues (was $2,827,901), 7d $21,898,584 over 15 venues (was $23,406,940), 30d $138,601,120 over 11 venues with complete history (was $141,353,706 over 10, so the 30-day figure now includes one more venue and is not like for like). Indexed launches 84,195 (was 85,837) and completions 5,535 (was 6,026), 14 and 11 venues, beta provider-indexed counts; 83 indexed launchpad rows returned (same as yesterday). DefiLlama revised history for 11 providers (financial-revisions.json), Meteora DBC `dailyFees` for 255 older days among them (small changes).

## Failures and refunds

- Refunded and not delivered (5 of 94 requested calls in the saved batches):
  - d1 seq 1 (EVM sweep): `evm_recent` was missing from the body; refunded. `evm_active` was present and used. The EVM-recent query was retried once as its own call (run_4738b3bf9c344fedbf2816d374f06ebf, 2 credits, 20 rows, delivered); it is saved as `raw/d1b-evm-recent-retry.json` and was read by hand because `discover.py` only reads d1. It found no new story.
  - f3 seq 7 (Meteora DBC `dailyFees`): refunded because the cross-check claimed future dates; the body ends on 2026-10-07 and differs from yesterday's body on 255 older days (provider revision), so the normalizer's undelivered-body assertion failed. The call was re-requested once (f7, delivered). `normalize.py` now ignores a refunded call that a later financial batch re-requested with identical arguments and got delivered; no assertion was weakened.
  - f2 seq 8 (Graphite `dailyFees`): refunded for the same future-dates reason; the retained body matches prior complete days. Graphite is excluded from the fee subtotal.
  - c1 seq 3 (Robinhood Chain hourly bars for five tokens): refunded with "data for 3 of 5 tokens missing"; the body has all five series (two with pre-launch nulls), so it is kept as a validated non-delivered body.
  - e2 seq 4 (`fees $e/acc`): negative result (no tweet with both words); the posts were call-group posts and were not used.
- Operational: the d1 batch (Codex sweep) stayed in `executing` for roughly 40 minutes before completing; it was not re-submitted.
- Not run: no further story checks beyond e3 (2 X searches).
