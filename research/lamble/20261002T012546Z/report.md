# Refresh 20261002T012546Z

- Financial anchor (exclusive): 2026-10-01T00:00:00Z; chart anchor: 2026-10-02T00:00:00Z; 30-day bars end 2026-10-02T00:00:00Z.
- Baselines: financial `20260928T154336Z` (this morning's `20261002T003446Z` shares the same settled anchor), narrative `20261002T003446Z`.
- Calls: 93 requested, 87 delivered; billed 479 credits (f1 58, f2 58, f3 58, f4 46, f5 58, f6 41, c1 5, c2 4, d1 5, d2 2, e1 69, e2 48, e3 27); balance after 89,218.
- Delivery disputes retained as validated bodies: binance-alpha dailySupplySideRevenue, o1-launchpad dailyRevenue. The c1 snapshot and creation-time calls were refunded for "future" 2026 dates; the bodies are valid (every createdAt precedes the run, now asserted).
- Volume method: token-level, all pools (first published run with it; previous site data was single-pool).

## New: creator earnings

DefiLlama `dailySupplySideRevenue` for all 19 venues; 15 define it. Graphite, StonkFun, Binance Alpha and four.meme define no supply side and stay null.

| Venue | Fees 7d | Creator earnings 7d | Share |
|---|---:|---:|---:|
| pump.fun | $14,585,206 | $3,941,451 | 27% |
| pons | $10,809,269 | $9,167,606 | 85% |
| flap-sh | $7,736,847 | $5,865,184 | 76% |
| stonkfun | $5,964,201 | — | — |
| launchlab | $2,928,350 | $2,369,648 | 81% |
| bonk.fun | $2,365,986 | $964,669 | 41% |
| argus-world | $1,116,945 | $957,494 | 86% |
| graphite-protocol | $934,203 | — | — |
| meteora-dbc | $695,560 | $570,482 | 82% |
| genius.fun | $381,069 | $283,980 | 75% |
| binance-alpha | $299,740 | — | — |
| clanker | $239,046 | $199,209 | 83% |
| o1-launchpad | $203,088 | $93,201 | 46% |
| bags | $172,502 | $86,258 | 50% |
| four.meme | $44,965 | — | — |
| rapid-launch | $43,182 | $5,945 | 14% |
| basestonk | $30,985 | $15,417 | 50% |
| stonkbrokers | $28,586 | $24,156 | 85% |
| foci | $18,244 | $344 | 2% |

## New: 30-day narrative chart

Codex daily all-pool token bars, 30 complete UTC days. 245 token-days overlap the hourly window; max relative gap 2.7e-09 (tolerance 0.02). Days before a coin existed are zero by the creation-time rule.

| Narrative | Coins | 24h | 7d | 30d |
|---|---:|---:|---:|---:|
| Super Intelligence coins | 5 | $40,686,149 | $215,321,602 | $256,852,394 |
| X-handle creator-fee routing | 17 | $25,336,783 | $365,495,004 | $434,486,846 |
| Launchpads launched as coins | 8 | $7,097,418 | $84,317,497 | $369,900,000 |
| Holder rewards in the paired asset | 2 | $4,504,097 | $32,793,862 | $376,562,140 |
| Sapling: Zcash coins on Solana | 3 | $171,613 | $2,050,844 | $2,050,844 |

## Narrative discovery

Discovery swept 230 candidates on 16 launchpads (d1/d2), clustered them into 16 themes, ran 8 cluster story searches (e2) and 4 targeted checks (e3).

**Created**

- **Super Intelligence coins** (`n-super-intelligence`): Fox News, 2026-09-29: Trump says he and tech leaders renamed AI "Super Intelligence". Super Inu ($SI, StonkFun, created Sept 21) re-pitched around it (daily volume $9M to $67M on Sept 29); SI (pump.fun), 四 (four.meme, read as SI), SIGF and SIP followed.
- **Sapling: Zcash coins on Solana** (`n-sapling`): sapling.cash and @saplingdotcash; SAPLING plus SHINU and TREE, whose metadata says they launched on Sapling. Qualified on Codex rolling 24h volume ($4.3M); the site window (to 00:00 UTC) shows $172K because SHINU launched after it and SAPLING ran in the last hour.

**Members**: added HALL and JACK to X-handle creator-fee routing (UsePaid metadata); CURVE, GO and ZIP to launchpad coins. Removed XPAD, INSTA and DOLL (below $1K on two consecutive observations).

**Cluster decisions**

| Cluster | Decision | Reason |
|---|---|---|
| k-elon | rejected | Word match only: quq is a 2025 BSC emoji coin mentioning Elon; ELON (fees in stock) and e/acc are unrelated UsePaid or stock coins. |
| k-tokenized | rejected | XDP is Doppler Finance, an exchange-listed tokenized-markets project; FUSE and STACK are stock-paired launch tools. No shared story. |
| k-super | created | Super Intelligence wave: Trump renamed AI on 2026-09-29; SI and Super Inu coins on three launchpads. SACC and SGI excluded (no SI story in metadata). |
| k-sym-SI | created | Same wave as k-super; Stupid Inu ($SI, no metadata) excluded. |
| k-intelligence | created | Same wave; NOVAAI and SGI excluded as generic AI or parody names. |
| k-paid | deferred | Mix of UsePaid coins (already n-x-money; HALL and JACK added there) and ORBIO/ERRAND fee-to-credit coins; see k-inference. |
| k-stocks | rejected | Stock-backed launch tools (STONK quote asset, FUSE, OTC) overlap n-pair-rewards and launch tools; no single new story today. |
| k-hold | deferred | Hold-to-earn coins (ORBIO, PUMPE, GP); overlaps the fee-to-credit lead in k-inference. |
| k-inference | deferred | Real lead: ORBIO, SUAN and PRIORS convert trading fees into AI inference or agent credits ($9.4M combined). Not created only because this run already adds two narratives (maxNewPerRun). Re-evaluate next run. |
| k-credits | deferred | Same lead as k-inference. |
| k-orbio | deferred | Same lead as k-inference; ERRAND and ORBITAL need their own sources. |
| k-market | rejected | Generic word: prediction markets (SGT, RBD) mixed with LUCKY99 and a stablecoin treasury coin. |
| k-burns | assigned | SAPLING moves into the new Sapling narrative; CURVE into launchpad coins; HARMONIC and PARASITE have no shared story. |
| k-layer | rejected | Generic word ("layer"); PEXRA is a pre-launch airdrop account per its own posts. |
| k-zcash | created | Sapling Zcash launchpad: SAPLING and SHINU (launched on Sapling) plus TREE. ZIP is a separate Zcash launchpad, added to launchpad coins; MeteoraDBC SHINU copies excluded. |
| k-backed | rejected | STONK is a quote asset; SUAN and BINF are treasury-backed coins without a shared story. |

Deferred lead for the next run: coins that convert trading fees into AI inference or agent credits (ORBIO, SUAN, PRIORS; $9.4M combined), held back only by `maxNewPerRun`.

## Pipeline changes

- `discover.py`: theme clusters (shared tickers and words; generic words capped) and a `stories` step that writes cluster story searches; registry `trendQueries` run in e1.
- `normalize.py`: requires a decision for every cluster; supply-side metrics; c2 daily bars with reconciliation; `discovery-decisions.json`.
- Rules: `maxActive` 6, `maxNewPerRun` 2; the page now shows every active narrative (previously capped at 3).
