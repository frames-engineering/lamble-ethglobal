# Daily refresh 2026-10-15 (run 20261015T055742Z)

Runtime 2026-10-15 05:57 UTC. Financial anchor (exclusive end) 2026-10-14T00:00Z, so the settled day is 2026-10-13; chart anchor 2026-10-15T04:00Z; 30 complete daily bars end 2026-10-15T00:00Z. Prior run and narrative baseline: 20261013T055731Z (financial anchor 2026-10-13, an earlier anchor; there was no run on 2026-10-14).

**Financial anchor is one day earlier than the clock allows.** At 05:57 UTC the clock would settle 2026-10-14, but DefiLlama's series for pons-v2 and flap-sh (both in the covered subtotal) still ended on 2026-10-13, and a single re-fetch of both venues' three series (batch f7, 65 credits) returned the same end date. The normalizer refuses a subtotal with a missing component, so the run uses anchor 2026-10-14 for every venue. `normalize.py` gained a `--financial-anchor YYYY-MM-DD` option for this (it still rejects any data point after the run's own date); no assertion was weakened. Every other venue's 2026-10-14 day was collected but sits outside the windows.

Billed 978 credits (sum of `billing.charged_credits` over 15 unique run ids) against the 2,500 cap; the project balance moved from 61,787 to 60,815 (972; the ledger and the per-run sums differ by 6), so the monthly balance is 60,815 credits (68% of the 90,000 grant), far above the 10,000 floor.

## New narratives

**None created.** Two borderline leads were deferred (flagged for the owner); no cluster met the bar with the evidence found, and the cap is full (6 active).

- **Flying Tesla Roadster (FTR), $2.40M combined 24h volume** (two pump.fun contracts, one Flap). The story is real and dated: the Tesla Roadster unveiling on 2026-10-15, with Elon Musk saying it is a candidate for "greatest product demo of all time" (@elonmusk, e3:0) and Axios and The Verge links on 2026-10-14. But all three coins are the same meme, only one has metadata describing anything (paired with $SPCX and $TSLA through OTC desks), the other two are empty, and one was 4 hours old at discovery. A one-day event hook on one meme, not three coins sharing a mechanism.
- **Hatchan (ハッチャン), $2.00M combined 24h volume** (one pump.fun, two Flap), launched on 2026-10-14 after Nikkei and Japanese X reported Akita Prefectural University's bear-deterrent robot "MATAGI-roid Hatchan" (e3:1). Same shape: one meme, copies, one coin with metadata ("Hatchan, the first Robot INU!"), no link to the university shown.
- Read literally, `newNarrative` (three coins whose names name the story, $500K+, one independent source) is met by both, and either would have replaced the weakest narrative at the cap (Tokenized stocks, $1.61M). I read the rule as needing three coins sharing a story rather than copies of one meme and deferred both; if copies should count, say so and the rule needs a line about it.
- Other leads: NIHILISM (four contracts, $6.77M, 0-1 hours old, metadata empty, no source), CLAIM (creator-fee launchpad, $671K, market cap $58.8K under the $100K bar), BURR ("hooks on ZEC", $966K, market cap $43K under the bar), QPF (quantum-resistant L1, 4 hours old; only two coins name post-quantum), the pair/custom-pairs coins (STONK, OTC, FTR) and the US oil/dividend-fund coins (GOIF, IOF, UDR, ARF, SARP; searched in e4:0, only tracker and promotion posts).

## Cluster decisions (all 13)

| Cluster | Decision | Reason |
|---|---|---|
| k-sym-NIHILISM | rejected | Four contracts of one meme named Nihilism (Meteora DBC, pump.fun), $6.77M, 0-1 hours old, empty or one-word metadata; the posts (e2:0) are price calls and alerts, one complains about copies and one signal post says there is no story; no independent source. |
| k-sym-FTR | deferred | See above (e2:1, e3:0). Re-evaluate after the unveiling. |
| k-pepe | rejected | BABYDOPE, PEDO, PONK are three separate pepe memes; no shared mechanism. The cluster's story search (e2:2) was refused by the batch cap and not charged, and not re-run. |
| k-through | rejected | Generic word over FTR, UDR, sauce and MORROW. |
| k-hatchan | deferred | See above (e2:3, e3:1). |
| k-robinhood | assigned (`n-programmable-rules`) | IGNITION (pons, $1.54M, market cap $981K, pool created 2026-10-13): "Rename it re-tier it rewrite the hook logic anytime after launch on Robinhood"; @HoodInsiderHB (2026-10-14) and @MaxelRowan (2026-10-15) describe an editable-token launchpad on Robinhood Chain mainnet (e2:4). CALL and LEVEE share only the word. |
| k-quantum | rejected | Only QPF and QI name post-quantum; SPOOKY is a quantum-entanglement demo. Two coins fail the three-coin bar. |
| k-creator | deferred | CLAIM matches the fee-routing mechanism (e2:8) but its market cap is $58.8K, under the $100K member bar; MEMEOS and HARMONIC are unrelated. |
| k-autonomous | rejected | MEMEOS, pippin and HARMONIC share a word only. |
| k-private | rejected | OMNI (removed earlier), TasQ and VEIL (Veilora) are three different privacy products with no independent shared source. |
| k-assets | rejected | MEMEOS, SARP, VEIL; SARP appears to belong to the unresolved US fund-coin wave (e4:0 found no independent source) and nothing ties it to tokenized securities. |
| k-fees | deferred | CLAIM again (see k-creator); LEVEE, EUREKA and HARMONIC share the word only. |
| k-agent | rejected | Four unrelated agent tokens. |

Looked past the clusters: the "Pair Token" posts of 2026-10-13 (@ClutchMarkets, @OxSimpleFarmer, @Hookrfun, e1:3 and e1:4) describe a mechanism built with Uniswap v4 hooks on Robinhood Chain, but no coin's metadata names it; the pair/custom-pairs coins (STONK, OTC, FTR) stay a deferred lead. STREAM ("launch an AI streamer with its own token", filmed with Higgsfield per @streampadfun, e1:5) is quarantined for an extreme 24h move; it would be a candidate for AI influencers once the flag clears. The trend query "memecoin meta" (e1:9) returned call-group posts and the 2026-10-11 Custom Pairs update only. The 2026-10-13 deferred HIRE lead was re-checked: metadata is still only "Launched on discord.gg/uxento"; unchanged.

Today's `curation.json` records 184 candidates (154 rejected, 15 quarantined, 13 deferred, 2 removed), appended to `candidates.json`.

## Member changes

- Added to `n-programmable-rules` (now 5 coins): IGNITION (pons).
- Added to `n-credits-for-holders` (now 5 coins): Raeto (RAETO, pons; "Your tokenized stocks pay for your AI inference ... earn credits for 400+ models"; rejected on 2026-10-13 for a $68K market cap, now $257K with $286K 24h volume).
- Removed from `n-tokenized-assets` (now 11 coins): opcode (OP), $129 of 24h token volume at discovery and $272 pool volume in the 2026-10-13 run, under the $1,000 removal line on two consecutive observations.
- Retired: none. All six narratives are above the $100K retirement line.
- Narratives (6; 48 constituents, up from 47): Super Intelligence coins (16), Credits for holders (5), Programmable rules (5), Creator fees routed to people (6), AI influencer characters (5), Tokenized stocks and RWA coins (11).

## Narrative volumes (hourly all-pool sums to 04:00 UTC)

| Narrative | Coins | 24h | vs prior 24h (same members) | 7-day | 30-day | 2026-10-13 reported 24h |
|---|---|---|---|---|---|---|
| Super Intelligence coins | 16 | $7,749,952 | +12.5% | $56,520,290 | $465,750,234 | $7,605,188 |
| Credits for holders | 5 | $4,162,568 | +95.3% | $32,059,469 | $188,711,084 | $5,172,182 |
| Programmable rules | 5 | $3,498,915 | -6.8% | $24,105,018 | $121,635,684 | $2,110,665 |
| Creator fees routed to people | 6 | $2,116,378 | -28.8% | $25,114,091 | $70,088,753 | $7,105,240 |
| AI influencer characters | 5 | $1,954,252 | -1.8% | $28,584,501 | $199,226,543 | $2,744,765 |
| Tokenized stocks and RWA coins | 11 | $1,613,840 | -24.6% | $17,146,885 | $78,641,418 | $2,515,584 |

30-day totals apply today's membership to past days, so rows with added or removed coins are not like-for-like with 2026-10-13 (Credits for holders and Programmable rules gained a coin, Tokenized stocks lost one). **No volume caveat is shown today** (the 2026-10-13 caveats on MarsX, LLMPad and Mintfolio no longer meet the 10x-turnover rule).

## Data changes vs 2026-10-13

- Covered fee subtotal (14 venues, settled day 2026-10-13): $3,807,669.27, down 5.5% from $4,028,169.00 (settled day 2026-10-12). Same exclusions (StonkFun, BONK.fun, Graphite, Bags, Binance Alpha). The 30-day subtotal change is null (the subtotal series has 3 missing days).
- Creator earnings (DefiLlama supply-side revenue, 16 venues that define it, latest settled day): $1,972,864 against $2,061,042 (15 venues). 7-day $14,631,525 (prior $15,326,808). 30-day $109,575,011 across 13 venues with 30 complete days (prior $112,409,057 across 12), so the two 30-day totals are not like-for-like: one more venue now has 30 complete days.
- Fees across the 19 venues with a daily series: 24h $4,036,977 (prior $4,181,749 across 18); 30-day $206,810,762 across 16 venues with 30 complete days (prior $186,315,894 across 15; not like-for-like).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 59,919 created and 3,812 completed in 24h, against 70,222 and 4,270.
- Financial revisions: StonkFun's fees, revenue and supply-side series were revised for 69, 69 and 38 older days (2026-08-04 to 2026-10-11; for example fees on 2026-10-11 went from 149,467 to 168,269). StonkFun is excluded from the covered subtotal, so only the fees-across-venues and creator-earnings sums touch it; none of the revised days is in the settled day. No other overlapping complete day changed.
- Daily bars reconcile with hourly sums for 288 pool-days (maximum relative gap 2.6e-10). 1,654 pre-creation zero buckets are recorded.

## Story changes

- Super Intelligence: no newer official item than the 2026-10-04 White House SIF and SpaceXSI posts (eleven days old); the newest $SI posts are from Silicon Interchain (a different project on the same ticker) and traders. Volume is up 12.5% on the prior 24 hours but about half the 2026-10-13 token-level sample ($3.5M at discovery against $7.6M).
- Creator fees routed to people: usepaid.app re-scraped (e1:0); @TeleMoneySOL announced on 2026-10-13 a holder fee-back update and repeated its 2026-10-12 figures (108 coins, 262.8 SOL, 17,411.2 GRAM); @UsePaid posted three claims by @TAsimovF (up to $6,936.66). Volume fell 28.8% and the MarsX caveat no longer applies.
- Tokenized assets: @RobinhoodApp note of 2026-10-13, RobinHub's 2026-10-14 recap ($100B cumulative DEX volume on @RobinhoodCrypto), @RamsesExchange ("$2.5B+ Trading Volume on Robinhood Chain and 30+ Stock Tokens") and the Pair Token posts; opcode (OP) leaves.
- Credits for holders: orbio.so re-scraped (e1:1); @orbiodotso's 2026-10-13 CREDIT-on-Ethereum post; RAETO joins.
- Programmable rules: @Hoookedpad's custom-hooks, Options and Block Zero Protection posts (2026-10-11 to 2026-10-14); IGNITION joins; signals refreshed. A 2026-10-13 post alleges funder-wallet clustering around HOOKED (the narrative summary says rules are the projects' own claims).
- AI influencers: newest items are @Higgspad's 2026-10-11 "V3 is live" and Higgsfield's 2026-10-14 "Episode 2"; copy and signals unchanged.

## Failures, refunds and billing

- Refunded (`seller_error`, no charge, bodies used as observations as before): f6 seq 3 (four.meme supply-side) and seq 4 (foci fees); both carry the known projected-date caveat. e2 seq 2 (`pepe $BABYDOPE` search) was refused by the batch cap (`budget_exceeded`, not charged) and not re-run.
- `delivered_with_caveats`: f1 seq 6, f2 seq 3, f3 seq 5, f5 seq 2 and 7 (series with projected dates, already known), f7 seq 0 and 5, c1 seq 1 and 4 (createdAt and subset caveats), c2 seq 2, d1 seq 0, 2 and 3, d2, and keyword caveats on e1 and e2 searches. All passed the normalizer's checks.
- One re-fetch (f7: pons-v2 and flap-sh, 65 credits) found no 2026-10-14 data; per the anchor rule above the run used 2026-10-14. That 65 credits bought nothing and is the main reason today exceeds a normal day.
- Code changes: `--financial-anchor` in `normalize.py`; importer defaults and registry references repointed.
- Billed credits by batch: d1 25, d2 7, e1 101, e2 97, e3 22, e4 11 (discovery and evidence 263); f1-f5 108 each, f6 54, f7 65 (fees 659); c1 37, c2 19 (bars 56). Total 978 over 15 unique run ids. The balance fell by 972 (61,787 to 60,815).

## Flags for the owner

1. **Same-meme copies and the new-narrative rule**: FTR and Hatchan each have three coins named for a dated, independently reported story and over $500K combined volume. I deferred both as one meme with copies. If copies should count as coins, the rule needs saying so (and the page would then fill with single-meme narratives).
2. **Lagging venues**: pons-v2 and flap-sh publish DefiLlama's latest day later than the 4-hour settle rule assumes. Today cost an extra re-fetch and a one-day-earlier anchor; consider a longer settle window or an optional per-run anchor in the plan step.
3. **Cost**: 978 credits again exceeds the 450-550 normal day in the procedure (fees 594 without the re-fetch).
4. **Strongest unresolved leads**: CLAIM and BURR (both fit existing narratives but are under the $100K market cap bar), the pair/custom-pairs coins (STONK, OTC, FTR) and the US oil/dividend-fund coins (no independent source).
