# Refresh 20261002T015435Z

- Financial anchor (exclusive): 2026-10-01T00:00:00Z; chart anchor: 2026-10-02T00:00:00Z; 30-day bars end 2026-10-02T00:00:00Z. Same settled anchor as the two earlier runs today, so 57 DefiLlama calls were re-collected and match: 0 financial revisions, covered fee subtotal unchanged at $5,991,185.
- Baselines: financial `20260928T154336Z` (earlier anchor), narrative `20261002T012546Z` (the 01:25 run that merged as PR #8).
- Calls: 95 requested, 90 delivered; billed 495 credits (d1 3, d2 2, e1 63, e2 56, e3 35, f1 58, f2 58, f3 58, f4 52, f5 58, f6 41, c1 7, c2 4); balance after 88,756 at the last batch. With the earlier run today (479) the day total is 974 of the 2,500 budget.
- Delivery disputes: o1-launchpad dailyRevenue (refunded "future data"; every date is on or before the runtime date and 87 prior days match, so the body is retained). d1 had two refunded sub-queries that still returned valid bodies (`evm_recent` flagged by the cross-check, and the constituent snapshot flagged for "2028" dates, as c1 did last run); both are used as observations. e2 searches for `layer $PEXRA` and `through $SACC` were refunded as imperfect matches; their posts were read but nothing depends on them.
- Volume method: token-level, all pools (unchanged).

## New narrative

- **Fees paid as AI inference credits** (`n-inference-credits`): the lead deferred earlier today (k-inference). ORBIO (pons), SUAN (Flap) and BINF (Flap): token metadata names the mechanism (ORBIO: half of trading fees become inference credits paid to holders; SUAN: half of trading fees become BEAD, 1 BEAD = $1 AI inference credit; BINF: agent-token fees pay for the agents' AI). Rolling 24h volume at discovery was $9.3M combined (all three above the $50K / $100K member bar; none quarantined). Independent public sources: orbio.so (official page selling LLM credits at a discount), @SUANdotBID and @getbinference official posts, and an Orbio builder post. Payouts and usage are self-reported and not verified; no affiliation among the coins was checked. SUAN's pool is under 24h old, so the chart shows zeros before its creation (pre-creation zero rule).

## Member changes

- Added **PUMPE** (Pumpkin Pepe, StonkFun) to Holder rewards in the paired asset: metadata says it is a StonkFun launch paired with bridged ETH PEPE with a 3% transaction tax to PEPE reflections for holders. 24h token volume $1.36M at discovery.
- No removals or retirements. Lowest members: REGULARS $5.9K and NEARPAD $2.0K (launchpad coins), DEBT $10K, DDOS $8.6K, Cream $8.4K (X-handle routing) are all above the $1K removal bar.
- Registry: `dailyEvidence` now scrapes orbio.so and searches `"@orbio_so" inference credit` (replacing the Froink search); the `four.meme meta` trend query was dropped to keep e1 at 10 calls.

## Cluster decisions

| Cluster | Decision | Reason |
|---|---|---|
| k-elon | rejected | quq is a 2025 BSC emoji coin mentioning Elon in its description; e/acc and ELON are unrelated; the search found only 2025 shill posts. |
| k-tokenized | rejected | XDP is Doppler Finance (exchange-listed yield protocol); FUSE and STACK are stock-paired launch tools. |
| k-paid | created | ORBIO moves into the new narrative; PAID/ELON have no fee-to-credit story; ERRAND and SHILL are separate products. |
| k-stocks | rejected | Stock-backed launch tools, STONK is a quote asset; different mechanisms. |
| k-layer | rejected | Generic word; PEXRA is pre-launch with no product source; ORBITAL is an Orbio-built audit app. |
| k-hold | assigned | ORBIO to inference credits; PUMPE to paired-asset rewards. GP and SEC lack paired-asset metadata (candidates); SHILL is a $62K-cap coin with a different mechanism. |
| k-inference | created | Qualifies today: three coins, $9.3M, official sources. MANY (routing API) and CASINO excluded. |
| k-credits | created | Same lead; TANK and PRIORS excluded. |
| k-orbio | assigned | ORBIO joins; ERRAND and ORBITAL are apps built on Orbio, not fee-to-credit coins. |
| k-market | rejected | Generic word; prediction-market coins share no common story; SUAN moves. |
| k-around | rejected | Generic word; PEXRA, UDR, LIEGE unrelated. |
| k-building | rejected | Generic word; PEXRA, 4, MANY unrelated. |
| k-stonkfun | assigned | PUMPE to paired-asset rewards; COMMIE and GP have no tax or paired-asset metadata. |
| k-backed | assigned | SUAN and BINF to inference credits; STONK is a quote asset. |
| k-credit | assigned | SUAN to inference credits; PRIORS is agent credit loans (not fee-to-inference), the rest are unrelated products. |
| k-through | rejected | Generic word; SACC has no Super Intelligence wording or source. |

Re-evaluated from the earlier report: PRIORS was part of the deferred lead, but its metadata and posts describe USDG credit and reputation for ERC-8004 agents, not fee-to-inference credits, so it is a rejected candidate. SACC remains unverified for the Super Intelligence narrative.

## Data changes vs the 01:25 run

| Narrative | Coins | 24h | 7d | 30d | 24h change |
|---|---:|---:|---:|---:|---:|
| Super Intelligence coins | 5 | $40,686,149 | $215,321,602 | $256,852,394 | -42.7% |
| X-handle creator-fee routing | 17 | $25,336,783 | $365,495,004 | $434,486,846 | +42.7% |
| Fees paid as AI inference credits (new) | 3 | $23,259,370 | $61,052,736 | $134,973,210 | +161.9% |
| Launchpads launched as coins | 8 | $7,097,418 | $84,317,497 | $369,900,000 | +92.1% |
| Holder rewards in the paired asset | 3 | $5,848,364 | $34,138,129 | $377,906,408 | +84.4% |
| Sapling: Zcash coins on Solana | 3 | $171,613 | $2,050,844 | $2,050,844 | +144.4% |

- Window volumes match the earlier run for existing narratives (same chart anchor); pair-rewards rose from $4,504,097 to $5,848,364 because of PUMPE.
- Indexed launches 90,482 (was 90,222), completions 5,662 (was 5,659), 14 creation and 11 completion venues. Creator earnings (supply-side revenue) cover 15 venues, unchanged.
- Volume caveats shown: Super Intelligence (Super Inu, 19%), X-handle routing (Bryce Hall Coin and JACK, 20%), launchpad coins (ZIP, 20%).

## Story changes

- New: inference credits (orbio.so page; SUAN, bInference posts).
- Unchanged: Super Intelligence, Sapling, UsePaid, KNOTS stories (e1 pages and searches returned the same sources).
- Not verified: no payouts, usage, or affiliation claims were checked.
