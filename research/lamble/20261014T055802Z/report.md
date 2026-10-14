# Daily refresh 2026-10-14 (run 20261014T055802Z) — NOT NORMALIZED, NOT MERGED

Runtime 2026-10-14 05:58 UTC. **The refresh stopped at the normalizer.** `normalize.py --prior research/lamble/20261013T055731Z` fails with
`AssertionError: undelivered stonkfun dailySupplySideRevenue contradicts prior complete days`. No normalized outputs, no import, and the app snapshot, importer defaults and registry `references` still point at 20261013T055731Z. This PR holds the raw evidence, the curation and the registry membership edits so the paid data is not lost; it is not mergeable as is.

## Why it stopped

- DefiLlama via Atlas returned the StonkFun `dailySupplySideRevenue` body in f1 (seq 5) and again in the one allowed retry f7 (seq 0). Both times Frames classed it `seller_error` / `negative_result` (cross-check says the chart holds future dates; the body's `totalDataChart` actually ends 2026-10-12) and refunded it.
- The body differs from yesterday's for 9 prior complete days (2026-10-03 to 2026-10-11): yesterday's run held 0 for those days, today's holds values (for example 2026-10-03: 34,370; 2026-10-08: 46,805; 24h total 16,881). That looks like DefiLlama's StonkFun adapter newly defining supply-side revenue (the response's methodology now defines `SupplySideRevenue` as creator and flywheel shares of fees paid out), not a data-handling defect, so I did not touch the assertion. The other three refunded calls were retried in f7 and two of them were delivered (graphite-protocol dailyFees, four.meme dailySupplySideRevenue); bags dailyRevenue was refunded again (its chart ends 2026-10-13; the normalizer stopped at StonkFun before reaching it, so its prior-day comparison was not run).
- Decision needed from the owner: accept a refunded-but-internally-consistent body when it only revises zero-valued ("not measured") prior days, or pay for another route. Not retried a second time per the standing rule.

## Narrative discovery (completed; recorded in curation.json)

No new narrative qualified. The five theme clusters:

| Cluster | Decision | Reason |
|---|---|---|
| k-exchange | rejected | Papertrade (Paper) is one perps-exchange product on two chains (Base via Clanker, flagged extreme-24h-move; Robinhood Chain), both under 5 hours old; the rest are older Binancians coins. |
| k-sym-BINANCIANS | rejected | Three BNB Chain coins reuse the name Binancians; posts are ticker shills (e2:1); ticker echo, no story. |
| k-binance | deferred | Strongest lead: Binance AI / BIBI. @binance posts a "100 Days of AI" series (Day 18 on 2026-10-13) and @binancezh posted Binance AI day 1 with the Bibi mascot on 2026-10-14 (e3:1, e3:0). Only BIBI ($1.17M, empty metadata) and 币安BiBi ($200K, market cap about $46K) name it, under the three-coin and $100K member bars. |
| k-through | rejected | Generic word over unrelated coins (JEANGUY, UNTXED, MORROW). |
| k-agent | rejected | Hydra, pippin and Harmonic Agent are different products. |

Looked past the clusters: Pair Tokens / StonkBrokers V4 hooks (e1:3, e1:4) have no coin metadata naming them (the e3 follow-up search timed out and was refunded; not retried); the HAMSTER transfer-hook post (e1:4) is not in the swept candidate set. Pump.fun "discord.gg/uxento" launcher tags (SEALS, Altai, HIRE) are a tool tag, not a story; HIRE stays rejected.

## Member changes (curation + registry, not yet normalized)

- Added to Creator fees routed to people: The Embryo Corporation (UNICORN, pump.fun; "Fees to @josiezayner via UsePaid"; $2.17M 24h, market cap about $125K, pool about 32 hours old).
- Added to Launchpad coins with on-chain rules: IGNITION (pons; "rewrite the hook logic anytime after launch on Robinhood"; $1.32M, market cap about $581K, pool about 19 hours old). The coin's own description; nothing ties it to Hookr or Hooked.
- Removed from Tokenized stocks and RWA coins: opcode (OP), below $1,000 24h volume on two consecutive observations.
- No retirements. All six narratives remain above the $100K line at discovery (token volume now: Super Intelligence $2.73M, Creator fees $2.38M, AI influencers $1.53M, On-chain rules $1.55M, Tokenized $1.51M, AI credits $0.95M).

## Failures, refunds and billing

Refunded: d1 seq 2 (trending query, createdAt future-dated), e2 seq 3 (JEANGUY search, used as evidence), e3 seq 2 (Pair Token search, timeout), f1 seq 5, f2 seq 8, f5 seq 3, f6 seq 3 (the four DefiLlama bodies retried in f7), f7 seq 0 and seq 2. Billed credits by batch: d1 19, d2 7, e1 101, e2 43, e3 22, f1 97, f2 97, f3 108, f4 108, f5 97, f6 65, f7 22, c1 37, c2 19; total 842 over 14 unique run ids against the 2,500 cap. Balance 62,623 before, 61,787 after the last batch (monthly floor 10,000 untouched).
