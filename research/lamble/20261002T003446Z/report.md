# LAMBLE daily refresh — 20261002T003446Z

First run of the scripted daily path (`scripts/frames-refresh/`). Runtime 2026-10-02T00:34:46Z.
Prior runs: financial and activity `20260928T154336Z`, narratives `20260928T182411Z`.
Replay: `python3 scripts/frames-refresh/normalize.py research/lamble/20261002T003446Z --prior research/lamble/20260928T154336Z --prior-narrative research/lamble/20260928T182411Z`.

## Anchors

- Financial exclusive end: 2026-10-01T00:00:00Z. The run started 35 minutes after 2026-10-01 closed, so the new
  four-hour settle rule keeps 2026-10-01 out; complete days run through 2026-09-30.
- Chart exclusive end: 2026-10-01T23:00:00Z (one complete-hour margin), 168 hourly buckets over 25 pools.

## Changes

| Metric | Previous | This run |
| --- | --- | --- |
| Covered fee subtotal (14 venues, last complete day) | $5,069,407 (2026-09-27) | $5,991,185 (2026-09-30) |
| Indexed launches 24h (14 venues) | 72,583 | 90,441 |
| Indexed completions 24h (11 venues) | 4,321 | 5,674 |

| Narrative | 24h volume at 2026-09-28T17:00Z | 24h volume now | Coins |
| --- | --- | --- | --- |
| X-handle creator-fee routing | 33.15M | 15.48M (+29.2% vs prior 24h) | 15 |
| Holder rewards in the paired asset | 0.94M | 1.51M (+5.7% vs prior 24h) | 2 |
| Launchpads launched as coins | 20.11M | 1.31M (-31.7% vs prior 24h) | 8 |

## Story changes

- **UsePaid:** the "X Money payouts are paused" banner is gone. The homepage now says fees are
  held for the X user to claim and lists recent on-chain claims (for example The Mars Society,
  $3,249.54, two hours earlier). UsePaid posted on 2026-09-30 that its claim system launched
  with a new split of 65% recipient, 25% $PAID buybacks and 10% protocol (previously 80/20).
  The summary and signals are updated.
- **Launchpads launched as coins:** the Solana launch-tool coins have faded. insta.fan traded
  $708 in 24h (about $3.8M on 2026-09-28) and XPAD $856. WIRED (BNB Chain) carries 59% of the
  remaining $1.3M. A post naming "Wired and Bagspay" as UsePaid competitors independently ties
  WIRED to the story. PayThisPost and Bagspay are recorded as unverified candidates.
- **KNOTS:** the page still reports distributions (1,418,309 payouts, last six hours earlier).
  Today's KNOTS X search was refunded as a negative result, so its earlier signals are kept.

## Volume caveat

The card now shows a caveat when any constituent's 24h pool volume exceeds 10× its circulating
market cap. No coin crosses the threshold today; the highest ratio is MARTIANS at 1.6×. The
caveat appears automatically when a coin crosses it.

## Validation and failures

- 46 of 53 calls delivered.
- genius.fun `dailyFees` and pons-v2 `dailyRevenue` were refunded after a false "future dates"
  cross-check. Their dates and all overlapping prior days match, so both are retained.
- The four X searches in `e1` failed with `amount_exceeds_cap`: the seller raised its price
  from $0.0060 to $0.0069. After a free re-quote they were retried as `e2`; three delivered.
- No financial revisions against the prior run.
- 14 of 19 venues have complete 30-day histories.
- 820 pre-creation zero buckets; no missing live-pool buckets.
- Typecheck, lint, all 9 tests, the production build and `git diff --check` pass.

## Billing

243 credits across 7 runs (f1 52, f2 52, f3 58, f4 46, c1 6, e1 5, e2 24).
100% of the monthly grant remains and the balance is 89,733 credits.
