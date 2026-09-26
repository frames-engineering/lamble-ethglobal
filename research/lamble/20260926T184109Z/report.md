# Narrative expansion

## What changed

The fee-routing narrative now includes seven named, address-resolved coins:
CALI, Elon Coin, Effective Accelerationism (e/acc), Kardashev Research,
DEBT COIN, dropping dollars on strangers (DDOS), and Cream. All seven are
listed in UsePaid's official registry with named recipients and Pump branding.
Recipient labels are not endorsements or verified payments.

The paired-asset rewards narrative retains ZCAT and KNOTS. Nine selected pools
now have reconciled 24-hour and seven-day hourly USD-volume series, ending
2026-09-26 17:00 UTC. Fee-routing volume is $92,618,159.33 over the sampled 24 hours;
paired-reward volume is $2,762,088.84. These are selected-pool volumes, not the
entire market. The larger fee-routing total reflects expanded coverage and must
not be described as growth from the earlier two-pool snapshot.

Five young pools had missing pre-creation bars. We separately queried each exact
pool's on-chain creation timestamp. Only full hourly buckets ending before that
time become zero; the creation hour and all later hours require real observed
bars. This is known nonexistence of those pools, not inactivity across all markets
for those tokens. Exact zero provenance is saved alongside the series. Current
membership is applied retrospectively, not evidence of detection seven days ago.

## Landing improvements

- Real 24h / 7d chart switch and total for the selected period.
- Cards show tracked-coin counts when launch-event counts are unavailable.
- Five highest-volume identified coins appear in the featured list, with shares
  against the full narrative sample, not renormalized to visible rows.
- Known launch origins remain visible without fabricated launch rankings.
- The importer accepts all four dataset paths explicitly for future refreshes.
- Daily refresh prompt and machine-readable source registry are linked in README.

## Discovery limits and next improvements

A bounded Codex scan sampled 20 high-volume and 20 recent-pair results across Pump,
StonkFun, Bags, Four.meme and Clanker V4 filters, with minimum liquidity $10,000.
Token metadata was redacted or null; the scan cannot establish a new story or
complete creation universe. Exact pool token addresses were retained, then five
identities were independently resolved through the official registry. Other
candidates remain unclassified. Pair creation timestamps are not token launches.

No third narrative was manufactured. To improve discovery next, obtain reliable
public token metadata plus address-level story evidence across the omitted
venues; maintain point-in-time memberships; track breadth, volume concentration
and launchpad distribution separately; and require sustained observed activity
before declaring a story heating or cooling. Indexed provider activity is not
substituted for narrative-specific launch events or social mindshare.

## Reproduce and validate

`python3 research/lamble/20260926T184109Z/normalize.py` is offline. Raw requests,
responses, source records, membership, token identities, chart CSV, validation and
billing manifest are in this directory. All collection used existing Frames routes;
public Codex documentation was read via direct HTTPS. No new accounts or wallets.

The daily prompt documents exact routes, source selection, cache/retry boundaries,
known blockers, null/coverage rules, input-path hazards, validation and billing.
No recurring task is installed.
