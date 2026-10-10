# Daily refresh 2026-10-10 (run 20261010T055705Z)

Runtime 2026-10-10 05:57 UTC. Financial anchor (exclusive end) 2026-10-10T00:00Z, so the settled day is 2026-10-09; chart anchor 2026-10-10T04:00Z; 30 complete daily bars end 2026-10-10T00:00Z. Prior run: 20261009T055804Z (financial anchor 2026-10-09, an earlier anchor, so it is both `--prior` and the narrative baseline). Billed 852 credits against the 2,500 cap (see Failures and billing); the monthly balance after the run is about 67,400 credits (76% of the grant at start, 75% at the end), far above the 10,000 floor.

## New narrative

**Post-quantum coins (`n-post-quantum`) created, replacing Inference credits at the six-narrative cap.**

- Story: on 2026-10-07 Ethereum Foundation researcher Justin Drake posted a call for the industry to "calmly begin planning for 'bunker mode'" (a controlled mass migration of assets to fresh addresses whose public keys stay hidden behind a hash; e4:0, post 2107837081313505768, 6.3M views). Vitalik Buterin posted the same day that he does not recommend scrambling to move funds today but that risks to cryptography from AI-accelerated math, next to quantum, should be taken seriously (post 2107976296320106851). The Block reported on 2026-10-07 that Europol urges the industry to prepare for quantum threats (post 2107801828738159100). Coverage ties Drake's call to AI-accelerated math as well as quantum. pqc.market (scraped, e4:2) describes launching pump.fun coins with hash-based post-quantum attestations.
- Constituents (all pump.fun, Solana, none flagged by the quarantine rules): QI / Quantum Inu (token created 2026-10-09 04:11 UTC; about $10.07M rolling 24h volume at discovery), PQC / pqc.market (created 2026-10-08 02:42 UTC; about $5.35M), Tardigrade (2026-10-09; about $1.68M), Quantcum (2026-10-09; about $0.90M), BNKR / Bunker Coin (2026-10-09; about $0.88M) and BUNKER / Bunker Mode (2026-10-09; about $0.53M). About $19.4M combined against the $500K bar. All were created after the 2026-10-07 posts. QI, PQC, Tardigrade, Quantcum and BNKR name post-quantum proofs on PQC in their metadata; BUNKER's metadata says "separate, hash-based authorization" and does not mention pqc.market (included on that reading; the weakest fit, flagged below). Tardigrade, Quantcum, BNKR and BUNKER are under the $100K market cap bar but pass the $50K volume bar, which is how `discover.py` and the registry apply `addMember`.
- Result: 24h volume $28,157,122 (chart window to 04:00 UTC; +451.0% vs the prior 24h), 7-day $34,311,499, 30-day $29,758,896 (membership is reconstructed today and applied to past days; the coins did not exist for most of them). A volume caveat is shown: Bunker Coin, Tardigrade and Quantcum traded over 10x their market cap in 24h (17% of the narrative's volume), so it may include wash or bot trading.
- Copy states what the sources say; no claim that the coins' post-quantum security is verified or that they are affiliated with Drake, the Ethereum Foundation or Europol.
- At the cap it replaces **Inference credits** (`n-inference-credits`): the smallest of the six at discovery ($1.47M 24h token volume against $1.86M for Agency) and falling ($4.64M in the prior sample). Its defining source (orbio.so) is still live, so it was not retired for a lost source. ORBIO, SUAN and BINF are closed members. API (pump.fun, credits for holders, $1.02M) and MESH (AI credits for holders, $0.14M) are new credit-style coins that were not added; they are deferred in `candidates`.

## Cluster decisions (all 7)

| Cluster | Decision | Reason |
|---|---|---|
| k-post | created (`n-post-quantum`) | See above. SNOOP ("Tag me under any post") matched on the word only. Quantum-themed coins that are not post-quantum cryptography are not added: qOMPUTE and QUBIT (quarantined, extreme 24h moves), the second QI contract (quarantined, implausible market cap), two Quantum Cat coins, QOAT and qpepe. Resolves yesterday's deferred k-quantum lead. |
| k-super | rejected | Super Intelligent Beauty (SIB x2, about $3.67M and $0.99M, plus PERSUASION with empty metadata): posts of 2026-10-10 say Musk replied "Super Intelligent Beauty" to an AI video from @tetsuoai. A one-day meme, not the White House "Super Intelligence" rename behind `n-super-intelligence`; only one contract has metadata. |
| k-powered | rejected | Generic phrase. PQC joins the new narrative; TasQ stays deferred; NOTHUMAN is a reptilian meme coin. |
| k-fees | rejected | Different mechanisms behind the word fees (CALI, API, SIB, HARMONIC, WIRED); no shared story or independent source. |
| k-wallet | deferred | New lead: Robinhood Chain agents with their own wallets. DAEMON (about $0.94M), Dots ($0.63M, market cap about $93K), TRENCHERS ($0.11M) and HARMONIC ($0.21M) total about $1.9M on pons, but the only sources are the projects' own posts (e3:4). MESH does not fit. Re-check for an independent source. |
| k-robinhood | rejected | The venue word over unrelated products; DAEMON and Dots go to k-wallet; PAPA (news platform with stock rewards) has no tokenized-asset mechanism. |
| k-agent | rejected | Generic word; ALOIS (Alzheimer's research agent) has no shared story; HARMONIC and TRENCHERS sit in k-wallet. |

Looked past the clusters: PAWS, MEMECHAN, open/acc, SWOLF, JPAD, SWITCHED, PATCH and similar high-volume launches have empty or generic metadata and no shared story (all in `candidates.json`). STONK and OTC (the stock-reward lead from earlier runs) and GSTOCK stay deferred with project-only sources. DAWS ("Tokenized exposure to ... clean water infrastructure", about $11M market cap after a day) is deferred: no source for the claim.

## Member changes

- Added to `n-post-quantum` (new): QI, PQC, Tardigrade, Quantcum, BNKR, BUNKER (rationales and evidence refs in `curation.json`).
- Added to `n-tokenized-assets`: opcode (OP, pons, Robinhood Chain; "The RWA prop AMM for every chain"; about $504K 24h volume, about $126K market cap, +648% in 24h, pool about 10 hours old). The narrative now has nine coins.
- Removed: none under the removal rule (lowest pool volumes: ACTII $5.4K and SHOOKS $5.0K, SLEUTHY $1.3K, above the $1,000 line).
- Retired: `n-inference-credits` (replaced at the cap). Its three members' intervals are closed in `memberships.json`.
- Narratives now: Post-quantum coins, AI influencer characters, Super Intelligence coins, Tokenized stocks and RWA coins, Agency living tokens, Launchpad coins with on-chain rules (6; 39 constituents, was 35).

## Narrative volumes (hourly all-pool sums to 04:00 UTC)

| Narrative | Coins | 24h | vs prior 24h | 7-day | 30-day | Prior-report 24h |
|---|---|---|---|---|---|---|
| Post-quantum coins (new) | 6 | $28,157,122 | +451.0% | $34,311,499 | $29,758,896 | n/a |
| AI influencer characters | 5 | $10,050,051 | +220.7% | $91,523,537 | $183,765,198 | $3,133,779 |
| Super Intelligence coins | 12 | $4,728,945 | -64.2% | $135,640,278 | $428,158,856 | $13,199,655 |
| Tokenized stocks and RWA | 9 | $3,441,553 | +14.5% | $19,086,745 | $75,822,162 | $3,007,003 |
| Agency living tokens | 3 | $2,914,204 | -35.8% | $113,604,492 | $130,509,485 | $4,540,711 |
| Launchpad coins with on-chain rules | 4 | $2,907,304 | -60.8% | $71,808,521 | $108,015,500 | $7,418,524 |

Prior-report 24h figures are yesterday's values; the change column compares each narrative with its own prior 24h on the same membership. Tokenized assets' 30-day total moved from $73.4M to $75.8M mainly because OP is applied to past days (its pool is hours old). Super Intelligence's drop reflects the wave fading, not a membership change.

## Data changes vs yesterday

- Covered fee subtotal (14 venues, settled day 2026-10-09): $4,423,917.06, up 10.6% from $3,998,216 (day 2026-10-08). Excluded as before: StonkFun, BONK.fun, Graphite, Bags and Binance Alpha (overlaps unresolved).
- Creator earnings (DefiLlama supply-side revenue, 15 venues that define it, latest day): $2,514,412 against $2,053,126. 7-day $18,790,115 (prior $19,970,937). 30-day $126,738,124 across the 11 venues with 30 complete days (prior $131,533,228). These cover different venue sets than the fee subtotal.
- Fees across the 18 venues with a daily series: 24h $4,538,206 (prior $4,145,415); 30-day $202,615,309 across 14 venues with 30 complete days (prior $208,555,234).
- Indexed launchpad activity (beta, 14 venues for creations, 11 for completions): 66,473 created and 3,449 completed in 24h, against 74,443 and 4,456.
- Financial revisions: LaunchLab restated 325 days of fees (2025-11-18 to 2026-10-08), 321 of revenue and 325 of supply-side revenue, all upward. For the last 30 complete days the restatement adds about $148K to fees and $118K to supply-side revenue, and the 2026-10-08 value moved from $91,337 to $95,420. Yesterday's 30-day totals were pre-restatement, so the 30-day comparisons above are slightly inflated in favour of today.
- Volume caveat shown on Post-quantum coins only.

## Story changes

- New: bunker mode / post-quantum (above).
- Tokenized assets: no new official post since @RobinhoodCrypto's 2026-10-08 T. Rowe Price exploration; the story text is unchanged apart from OP.
- Super Intelligence: SpaceXSI/SIF search was refunded as a negative result (see below) but its returned posts, all dated 2026-10-04/05, repeat the Trump SIF and SpaceXSI rename coverage; volume is falling fast.
- Programmable rules, Agency, AI influencers: story searches returned fresh posts (@Hoookedpad and @pickhooks 2026-10-08/09; @tryagency coverage 2026-10-03 to 10-08; Higgsfield and Higgspad posts to 2026-10-09); no change to their copy.

## Failures, refunds and billing

- **My mistake, disclosed:** I submitted the e1 evidence calls under the d1 key and cap by copy error. Result: 3 of 10 e1 calls delivered (29 credits), 7 were skipped as `budget_exceeded` and charged nothing. I saved that run as `e1.json` (its request file records `sent_as`), retried the 7 skipped calls as `e2`, and ran d1 under a new key (`...-d1b`, recorded in `d1-request.json`). No call was paid twice; the only cost of the mistake is that the Higgspad and `$SI` searches are in the e1 run rather than in one batch.
- Plan caps were too low for current prices (fee-summary calls now bill $0.01075 each, X searches $0.0119, Codex $0.00615): f1–f4 each lost one call to `budget_exceeded` (re-requested once as f7, delivered), c1 lost two (re-requested once as c3; one of them came back `seller_error` although the body contained every requested series, so it is used and checked by the daily/hourly reconciliation). `plan.py` caps are raised (d1 0.04, e1 0.13, f 0.12, c1 0.05, c2 0.03) so tomorrow's batches fit.
- Refunds / disputes kept as observations: f5 seq 0 (stonkbrokers-nightshades `dailyRevenue`; cross-check claimed future dates; logged in `deliveryDisputes`, validated against prior complete days); d1 seq 0 and 2 (`negative_result`: first claimed `solana_recent` missing, second claimed future creation dates; both usable, creation dates are checked against the run start); e3 seq 2 (`powered $PQC`, cross-check said the query's second word was missing; 17 tweets used) and e2 seq 5 (SIF search).
- Code changes: `normalize.py` now (a) accepts a retried c1 call from a later c3+ batch and uses a refunded body that still carries the requested data, (b) scans for credentials with header/token-shaped patterns instead of the bare word "authorization", which false-positived on the BUNKER description and on a tweet quoting "authorization and deployment of nuclear weapons"; the scan still flags `authorization:` headers, `x-api-key` and long bearer tokens, and no credential was found in `raw/`. `tests/frames-data.test.mjs` skips fee calls that returned no body (budget-skipped; the retry batch supplies them). No assertion on numbers, identities or gaps was weakened.
- Billed credits by batch: d1 13, d2 7, e1 29, e2 65, e3 54, e4 29 (discovery and evidence 197); f1 97, f2 97, f3 97, f4 97, f5 97, f6 76, f7 43 (fees 604); c1 25, c2 19, c3 7 (bars 51). Total 852. This is above the 450–550 normal day: fee-summary calls now cost about double per call (the 57 delivered fee calls cost 604), and the new-narrative checks (e3, e4) cost 83.

## Flags for the owner

1. **Cost per call has roughly doubled for DefiLlama fee-summary calls** (about 10.6 credits each against about 5.6 before); a normal day is now likely 700–850 credits.
2. **BUNKER's fit** to the post-quantum narrative rests on a reading of its metadata ("hash-based authorization"); drop it if you prefer a strict pqc.market-only list (the narrative still has five coins and clears every bar).
3. **Replacement choice:** Inference credits was the smallest at discovery, but after API and MESH (credits-for-holders coins, $1.16M together) it would have been about $2.6M, larger than Agency ($1.86M). I judged by the pre-addition figure as in earlier runs; say if you want a different order.
4. **Rule observation:** the member bar passes on volume OR market cap, so four of the six new coins are under the $100K market cap line (the narrative caveat covers wash trading). Consider requiring both.
5. Deferred leads for tomorrow: k-wallet (agents with their own wallets on Robinhood Chain), STONK/OTC stock-reward coins, API/MESH credit coins, SIB if the Musk reply spawns more coins with metadata.
