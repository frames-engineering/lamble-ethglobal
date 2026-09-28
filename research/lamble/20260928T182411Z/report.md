# LAMBLE narrative refresh — 20260928T182411Z

Narratives only. Runtime 2026-09-28T18:24:11Z. Financials and indexed activity remain on
`20260928T154336Z`. Offline replay: `python3 normalize.py`.

## Why

In `20260928T154336Z`, Froink was deferred because its pool was created at 15:09Z, after the
14:00Z chart anchor. BNB Chain and Robinhood Chain launch-tool tokens were omitted because charts
and explorer links were Solana-only. This run moves the anchor to 17:00Z and adds all three.

## Added to "Launchpads launched as coins"

| Token | Chain / launchpad | Evidence |
| --- | --- | --- |
| Froink (FROINK) | Solana / Pump.fun | X launch announcement (`x-2104598191681237311`) and Codex metadata |
| Wired fees to socials (WIRED) | BNB Chain / Flap | Metadata: "Token launches with fees wired to social media accounts" |
| Dollhouse (DOLL) | Robinhood Chain / Pons | Metadata: "Dollhouse is a launchpad on Robinhood Chain" |

The narrative now has 8 constituents with $20.1M of 24h sample volume (+53.6% vs the prior 24h,
same 8 pools). Froink contributes only 3 observed hours (15:00–17:00Z). Its large 24h share
reflects launch-day trading.

## Results at T = 17:00Z

| Narrative | Coins | 24h volume | vs prior 24h |
| --- | --- | --- | --- |
| X-handle creator-fee routing | 15 | $33.2M | −39.8% |
| Launchpads launched as coins | 8 | $20.1M | +53.6% |
| Holder rewards in the paired asset | 2 | $0.94M | −53.3% |

## Validation

- 25 pools × 168 hours, with no missing live-pool buckets. Pre-creation zeros cover only buckets
  entirely before provider pool creation.
- The 165 hours that overlap `20260928T154336Z` show no revisions over $0.01 for the two narratives
  whose universe is unchanged.
- The Robinhood Chain pool is a 32-byte Uniswap v4 pool ID; Codex `getBars` accepts it.
  Network 4663 is Robinhood Chain: Pons is Robinhood-only and Codex lists it on 4663.
- Market caps and 24h changes come from a fresh Codex snapshot (`raw/b1.json` call 2), with
  `change24` converted from ratio to percent.

## Limits

- Robinhood Chain has no verified explorer link, so Dollhouse renders without one.
- Story evidence (the UsePaid pause and the KNOTS page) is carried over from `20260928T154336Z`,
  not re-fetched.
- insta.fan, nearpad.tech and Dollhouse pools trade many times their market cap; volume may include
  wash or bot trading.

## Billing

4 credits (`run_00826fb6e2a04d7a8efbb658370547a5`); 84% of the monthly grant remains.
