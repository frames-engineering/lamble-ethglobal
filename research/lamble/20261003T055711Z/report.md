# LAMBLE refresh 2026-10-03 (run 20261003T055711Z)

Anchors: financial exclusive end 2026-10-03T00:00Z (settled days to 2026-10-02), narrative chart anchor 2026-10-03T04:00Z, 30 complete UTC days ending 2026-10-03T00:00Z, indexed launchpad activity as of 2026-10-03T06:12Z (source timestamp 1791007925). Prior run for comparison: 20261002T055743Z (earlier financial anchor, so it is both `--prior` and `--prior-narrative`). Volume method unchanged (token level, all pools).

Billed credits: 504 across 13 unique Frames runs (d1 5, d2 2, e1 63, e2 64, e3 40, f1 52, f2 58, f3 58, f4 58, f5 52, f6 41, c1 7, c2 4); the monthly balance went from 76,379 to 75,881 (84% of the grant remaining). 98 calls requested, 92 delivered; the 6 not delivered are listed below.

## New narratives (2)

- **Privacy coins** (`n-privacy`, category infra): ZERO (pons, Robinhood Chain), DarkSwap DARK (LaunchLab), Nullmask MASK (StonkFun), OMNI (Pump.fun) and ZkProof ZKD (pons). Metadata and the projects' own posts describe on-chain privacy: a privacy token (ZERO), private swaps through NEAR Intents toward ZEC (DarkSwap), a ZK privacy protocol whose metadata says it is by core ZEC contributors (Nullmask), private payments and shielded ZEC (OMNI) and private balances (ZKD). All five were above the $50K 24h volume and $100K market cap bars with no quarantine flag; rolling 24h token volume at discovery about $12.7M combined. Independent public sources: @NullMaskio (2026-09-30), @DarkSwapApp (2026-10-01), @Zerotrace_so (2026-10-02) and posts describing privacy as a narrative alongside Zcash's rally. These are public posts; treasury moves, rewards and usage are not verified and no affiliation was checked. Chart-window 24h volume is $18.3M (see below).
- **Holder rewards in the paired asset** (`n-holder-rewards`, category culture): ZCAT, PUMPE, MASKCAT, MMBTC, SEC (StonkFun) and STUPIDINU (LaunchLab), whose metadata says holders earn another asset (ZEC, PEPE reflections, MASK, WBTC, XRP, USELESS). About $9.6M rolling 24h at discovery. Source: StonkFun's official @LaunchOnSF post (2026-09-29) says its upgraded rewards pipeline is live for legacy coins including ZCAT, and a 2026-09-13 CoinGecko post covers ZCAT's ZEC rewards. This is the narrative replaced at the cap on 2026-10-02 (then about $3.9M); it is now larger than two active narratives. Payouts are claims and not verified. A 2026-09-30 post says STUPIDINU holders earn SUPERINU, while its metadata says USELESS; the metadata is what is recorded.
- The registry was at the six-narrative cap, so both replace the weakest narratives: **launchpad coins** (`n-launchpad-coins`, about $1.55M rolling 24h, smallest on both measures) and **Sapling** (`n-sapling`, about $2.41M, second-smallest on the rolling measure). Both stories are still current and above the retirement threshold; memberships are closed, not deleted. See "Needs your judgment" in the PR.

## Cluster decisions (16)

| Cluster | Decision | Reason |
|---|---|---|
| k-zero | created (n-privacy) | ZERO and ZKD plus DARK, MASK and OMNI that the word match missed; sources above. K0 is a Flap dividend coin. |
| k-paired | created (n-holder-rewards) | ZCAT, PUMPE, STUPIDINU, MMBTC, MASKCAT, SEC; @LaunchOnSF and CoinGecko sources. |
| k-earn | assigned (n-holder-rewards) | PUMPE, MASKCAT, SEC join; OTC (stocks lead), ORE (a game) and DELTA unrelated. |
| k-hold | assigned (n-holder-rewards) | PUMPE, MASKCAT, SEC join; HOLD is a pre-launch tool, rejected. |
| k-rewards | assigned (n-holder-rewards) | ZCAT, MMBTC (and STUPIDINU). |
| k-stays | assigned (n-holder-rewards) | ZCAT and MASKCAT join; BAG has no reward mechanism. |
| k-intelligence | assigned (n-super-intelligence) | SGI joins on its metadata and a post listing it with $SI; STUPIDINU goes to holder rewards; FABLE and NOVAAI unrelated. |
| k-agents | assigned (n-ai-agents) | CRADLE, MOONLET (now $135K market cap) and ORBIOBOOK ($110K) join; AGNET and ESCRO are under the market cap bar; arc is outside the Robinhood Chain story. |
| k-powered | rejected | Generic phrase: FILLED, DARK, MOONLET, MINEPAD, HOTBOT, THESIS. |
| k-three | rejected | Shared word only (🙈, Monkeys, www); no metadata story or source. |
| k-future | rejected | Generic word across unrelated coins. |
| k-born | rejected | BOXY, 旺柴, CRADLE share only a word; CRADLE goes to AI agents. |
| k-built | rejected | Generic word. |
| k-discord | rejected | Only the "Launched on discord.gg/uxento" line in common. |
| k-fomo | rejected | A word only (FOMO, THESIS, FOMO人生). |
| k-right | rejected | A word only (BOXY, FABLE, HOOKDOG). |

Deferred lead from the previous report (tokenized stocks: OTC, OCTO, STONK, GSTOCK, 蝴蝶人生, plus the SARP and WSOS strategic-assets coins): re-evaluated and still deferred. The mechanisms differ (stock desks, fees paid in stock, stock liquidity pools, tokenized oil and asset taglines), ELON is under the market cap bar, and no single product or independent source ties them together. No cluster named it today; it is recorded as deferred candidates. Other leads looked at and rejected: 龙虾 (four.meme), SPROUT (1 hour old), www, the Taigan/AIKOL coins, Zscribe (an inscription coin).

## Member changes

- Added to existing narratives: CRADLE, MOONLET and ORBIOBOOK to AI agents on Robinhood Chain (eleven coins now); SGI and si.gov to Super Intelligence (seven coins now). SGI is the weakest-evidenced addition: its metadata and one 2026-10-02 post that lists $SGI tie it to the story, and an earlier post about an $SGI quotes a different address, so it is not counted. ORBIOBOOK ($110K market cap) is just above the bar and is watched.
- Closed with the two retired narratives: REGULARS, NEARPAD, EMBER, FROINK, WIRED, CURVE, GO, ZIP (launchpad coins) and SAPLING, SHINU, TREE (Sapling).
- No other removals. The lowest remaining members (DEBT $439, DDOS $5.8K, Cream $2.5K rolling 24h at discovery) are watched: DEBT was $10.2K yesterday, so it is below the $1K removal bar for the first of two observations.
- Registry: `dailyEvidence` drops the sapling.cash scrape and the `"sapling.cash"` search and adds `"@LaunchOnSF" rewards holders` and `Nullmask ZEC privacy` (3 e1 pages become 2; 10 e1 calls including the `memecoin meta` trend query).

## Story changes

- UsePaid: its 2026-09-30 post says the claim system and fee structure changed from 80% recipient / 20% $PAID buybacks to 65% / 25% / 10% retained by the protocol; the X-handle routing coins are unaffected in membership. The top coin e/acc was reported at a $30M all-time-high market cap on 2026-10-01 with over $142,000 said to have been sent (a project claim, not verified).
- Super Intelligence: posts through 2026-10-03 still describe the rebrand; posts also call several $SI copies scams or rugs (claims only).
- Orbio (inference credits) and AI-agent sources unchanged; the Cradle posts (2026-10-02) describe a Robinhood Chain launchpad where each token is paired with an AI agent and staking that pays ETH from trades (project claims).
- Sapling: no change in its sources (shielded stamps live 2026-09-28, CoinGecko listing 2026-10-01); it is retired here only because of the cap.

## Data changes vs the 20261002T055743Z run

| Narrative | Coins | 24h (chart window) | 24h change | 7d | 30d |
|---|---:|---:|---:|---:|---:|
| Super Intelligence coins | 7 | $36,132,856 | -10.6% | $242,997,811 | $294,307,558 |
| Privacy coins (new) | 5 | $18,325,160 | +428.9% | $31,809,756 | $38,299,112 |
| Holder rewards in the paired asset (new) | 6 | $12,702,906 | +120.4% | $36,248,430 | $303,207,592 |
| X-handle creator-fee routing | 17 | $9,332,373 | -52.8% | $315,060,335 | $444,403,453 |
| Fees paid as AI inference credits | 3 | $8,457,244 | -61.4% | $63,995,487 | $141,147,470 |
| AI-agent coins on Robinhood Chain | 11 | $7,149,312 | -30.2% | $32,702,337 | $211,932,815 |

Yesterday's 24h chart-window values were $40,412,794 (Super Intelligence), $19,792,116 (X-handle routing), $21,915,258 (inference credits) and $9,592,294 (AI agents, eight coins). For the two new narratives the change compares today's members with their own prior 24 hours, with membership reconstructed today. The 30-day figures include the current members' history before they joined; most privacy coins are new (ZERO was 7 hours old at discovery; DARK 36, ZKD 24 and OMNI 11 hours old), while ZCAT and MASK carry the holder-rewards and privacy history. The 30-day window moved one day, so the existing narratives' 30-day totals are not comparable one to one with yesterday's.

Volume caveat now shown only for Super Intelligence (Super Gooner Intelligence, si.gov and SuperIntelligence Pets, 24% of its volume, each over 10x market cap in 24h). It is no longer shown for inference credits, X-handle routing or Sapling (retired); not shown for the two new narratives or AI agents.

Financials (covered subtotal, 14 venues; StonkFun, BONK.fun, Graphite, Bags and Binance Alpha excluded as before): fee subtotal $6,104,432 (was $6,439,000). Summed over venues with data: creator earnings (supply-side revenue) 24h $3,698,727 over 15 venues (was $3,981,009), 7d $25,268,556 (was $24,804,132), 30d $166,486,461 over 10 venues with complete history (was $169,427,095). Indexed launches 82,642 (was 88,944) and completions 5,620 (was 5,628), 14 and 11 venues, beta provider-indexed counts. StonkFun's DefiLlama series now ends 2026-10-01, two days behind the anchor (it ended 2026-09-30 yesterday), so its 24h/7d/30d metrics stay null; its 30-day chart history is kept. 82 indexed launchpad rows returned.

## Failures and refunds

- Not delivered (6 of 98): f1 seq 8 (pons-v2 `dailySupplySideRevenue`) and f5 seq 5 (rapid-launch `dailyFees`), both refunded because Frames' cross-check flagged points dated after the run date; the normalizer found every date up to the runtime date and the prior complete days matching, and kept the bodies as validated, non-delivered (the same handling as Foci yesterday). e2 seq 0 (`powered $FILLED`, a negative result) and seq 7 (`born $BOXY`, a seller error): the posts were read but nothing depends on them. e3 seq 0 (scrape of stonk.fun: the domain did not resolve, so there is no official StonkFun page evidence beyond the @LaunchOnSF post) and seq 1 (`"stonk.fun" paired holders rewards`, no results).
- No price-change failures (`amount_exceeds_cap`), no retries.
- Two offline data-handling fixes, no assertion weakened: (1) `scripts/frames-refresh/save.py` crashed on an unrelated persisted result containing a truncated multi-byte character; it now reads with `errors='replace'`. (2) `scripts/frames-refresh/normalize.py` created a membership record only for tokens it had never seen, so ZCAT and PUMPE (known tokens returning to a new narrative) would have had none; it now opens a new membership interval for a known token with no open interval in that narrative, still requiring a `newMembers` rationale and evidence.
