# LAMBLE daily refresh — 20260928T154336Z

Runtime 2026-09-28T15:43:36Z. Repository `d6885b4` (default branch identical). Prior runs:
financial `20260926T172434Z`, metadata `20260926T175634Z` (unchanged, reused), activity
`20260926T182058Z`, narrative `20260926T184109Z`. Offline replay: `python3 normalize.py`.

## Anchors

- Financial exclusive end F = 2026-09-28T00:00Z. All 19 venues report 2026-09-27 as their latest
  complete day; 13 also return a partial 2026-09-28 bucket, which is excluded.
- Chart exclusive end T = 2026-09-28T14:00Z (one complete-hour margin), 168 hourly buckets.
- Indexed activity `sourceAsOf` 1790610126 (2026-09-28T15:42:06Z).

## Changes

| Metric | 2026-09-26 run | This run |
| --- | --- | --- |
| Covered fee subtotal (14 venues, last complete day) | $4,889,133 | $5,069,407 |
| Indexed launches 24h (14 venues) | 74,239 | 72,583 |
| Indexed completions 24h (11 venues) | 4,211 | 4,321 |
| X-handle fee routing, 24h sample volume | $92.6M | $21.9M (−40.7% vs prior 24h) |
| Paired-asset rewards, 24h sample volume | $2.76M | $0.96M (−57.2% vs prior 24h) |

Narrative story change: the UsePaid homepage now states "X Money payouts are paused until
further notice." The summary says so. Signals were replaced with an official UsePaid post that
caps payouts and a token account asking when the payout issue will be resolved. KNOTS signals
now include the 2026-09-28 STONK-paid meme contest. The KNOTS page still reports holder
distributions (self-reported).

## Corrections

- Codex `filterTokens.change24` is a ratio, not a percent. `raw/u1.json` shows this from hourly closes: for CALI,
  0.002584 / 0.007374 − 1 = −0.650 against a reported −0.644; for KARDASHEV, 1.98 against 1.956.
  Example-token `change24h` is now `100 × change24`. The 2026-09-26 narrative run stored the raw
  ratio, so its figures were understated 100×. For example, e/acc showed "326.7%" where the raw
  value meant about +32,672%.

## Validation

- 38 financial calls: 37 delivered. `rapid-launch` `dailyRevenue` was refunded after a "future dates"
  cross-check. Every date is at or before the runtime date and 188 prior complete days match the
  reference body, so it is retained as a validated, non-delivered body (same policy as the
  reference run).
- Revisions: StonkFun 2026-09-25 fees and revenue were restated from 779,116 to 944,073
  (`financial-revisions.json`). There were no methodology text changes.
- `filterLaunchpads`: 80 of 80 rows, IDs unique, counts integer and non-negative, 24h ≤ 7d. There
  were no new or removed launchpad IDs.
- Bars: 9 pools × 168 hours, with no missing live-pool buckets. 545 buckets were filled as
  pre-creation zeros (five pools created on 2026-09-26). 123 hours overlap the prior run with no
  revisions over $0.01.
- 24h and 7d totals reconcile to hourly sums within $0.01. Contender shares sum to 100%.
- Registry recheck: DEBT, DDOS and Cream are not on the current UsePaid homepage. The homepage lists a
  rotating subset, so membership is retained and each check is recorded on the membership.

## Gaps

- No new constituent discovery. The homepage tokens outside the nine-pool universe (for example nip,
  FUTURIST, STONKCAT and Paperbag) remain unclassified.
- The metadata and logos are unchanged (weekly/monthly cadence).
- Five venues have incomplete 30-day histories (genius.fun, argus-world, stonkbrokers, rapid-launch
  and foci), so the fee-subtotal history has gaps for those days.

## Billing

240 credits in total, counting each unique run once: f1 58, f2 58, f3 58, f4 41, c1 4, e1 19, u1 2.
84% of the monthly grant remains and the balance is 75,267 credits. 46 calls were made: 38
financial, 3 Codex, 4 evidence and social, and 1 unit check.
