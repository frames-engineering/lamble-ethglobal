# Landing metric gaps: acquired observations and integration

## Delivered

Codex `filterLaunchpads`, invoked through Frames `mpp.codex.post.graphql`, returned
all 80 result rows (`count = returned length`, limit 200, offset 0) with a common
source timestamp of Unix 1790446927. The documented query distinguishes creation,
curve completion and liquidity migration and supports named launch surfaces
separately from underlying protocols.

Fourteen roster venues map to these observations. Pump.fun combines the mutually
named Pump.fun and Pump Mayhem surfaces; Four.meme combines standard and Fair;
Clanker combines legacy and V4. Other names are mapped individually. No global row
is added to its per-network rows. Exact mappings and raw values are saved in
`landing-metrics.json` and `raw/launchstats.json`.

**Important validation limit:** the endpoint is explicitly beta. Its source docs
do not establish exact bucket cutoffs, backfill completeness or finality, and
`Created` lifecycle events mean metadata population, which is not independently
proved identical to finalized creation events in the aggregate implementation.
These are **provider-indexed observations**, retained as `candidate_unverified`
for the strict event-count contract. They are not silently written into the
legacy verified `launched24h` or `graduated24h` fields. The app exposes the separate
`activityObservation` object with visible “Indexed” labels or `≈` table values.

| New visible metric | Value | Scope |
|---|---:|---|
| Fees 24h · covered venues | $4,889,133 | 14 mapped fee streams; complete UTC day ending 2026-09-26 00:00 UTC |
| Indexed launches 24h | 74,239 | 14 named roster venues covered by Codex |
| Indexed completions 24h | 4,211 | 11 venues with usable curve-completion semantics |
| Completion / creation ratio | 5.95% | Same 11 venues, 70,746 indexed creations; not a cohort probability |

The fee subtotal is a deterministic sum of saved, previously verified DefiLlama
observations. It excludes StonkFun, BONK.fun, Graphite, Bags and Binance Alpha to
avoid known or unresolved overlapping flows. This also excludes independent
post-migration/other-chain components within those rows, so it is not a full
all-roster total. Included adapters retain their own recognition and pricing
limitations. A single economic trade can pay several distinct fees; independent
fees are distinct flows, not duplicates merely because they share a transaction.
The partition is a methodology-based inference, not event-level reconciliation.
The label was changed from “all launchpads” to “covered venues” accordingly.

No 30-day subtotal change is invented: several included histories are incomplete.
The offline derivation joins history by timestamp and propagates any missing
component to null. Only nine dates have a complete subtotal, so no aggregate
30-day trend is shown.

## Narrative panel

The known constituents originate on Pump.fun (CALI and Elon Coin) or StonkFun
(ZCAT and KNOTS). Their launchpad names are now visible under “Launchpads.” The
legacy launch-share ranking remains null. No origin-token distribution or trading
volume share is silently substituted for share of narrative launches. Token
membership, real 24-hour volume charts and chart totals are unchanged.

## Precise remaining gaps

- **Graphite:** engine/fee participant; separate creation attribution is unresolved.
- **Binance Alpha:** listings/discovery are not token creations; uniform curve graduation is not applicable.
- **RapidLaunch:** toolkit submissions can overlap underlying venue creations; no exhaustive attributed deployment dataset.
- **StonkBrokers / BaseStonk:** no matching Codex activity rows in the exhausted result set.
- **Argus:** Codex reports 80 completions but zero migrations, while the scoped financial methodology says tokens open directly in real v4 pools. Completion counts/rates are excluded until reconciled.
- **Clanker / o1:** direct-pool launch semantics; zero provider completion fields are not used as curve graduations.
- **All indexed rows:** exact finalized event counts, boundary semantics and full coverage remain unverified. Beta indexed values are supplemental, explicitly qualified observations.
- **Narratives:** complete member-token creation events, previous-window launch shares, wider token discovery and a third evidence-backed narrative remain unavailable. Card launch counts are still null.
- **Financials:** fee subtotal omits unresolved overlapping components; missing daily histories and unknown numeric fee configuration are unchanged.

## Routes and cost

| Frames run | Route | Outcome | Charged credits |
|---|---|---|---:|
| run_a5b54798db004af4b1270c65f0db8a93 | Dune SQL execute | Payment challenge parse failure; no query result | 0 |
| run_6b2f9c783ec04b07a9831752ef262179 | Allium async SQL | Job accepted; no retrieved result. Documented status/results require API-key auth, no matching Frames route found | 12 |
| run_93fc39161faa4449977b6c044bc32bd2 | Codex GraphQL filterLaunchpads | 80 rows delivered and inspected | 2 |
| See raw/semantics.json | Codex introspection | Introspection disabled; not used | 0 |

**This pass: 14 charged credits; final receipt 84% remaining.** No SQL result or
stored-reference placeholder was treated as acquired activity data. Documentation
was fetched via public HTTPS outside Frames. No accounts, wallets, trades, external
writes, commits or deployments were created.

## Repeatable path

1. Reuse the exact `raw/launchstats-request.json` GraphQL selection (one Frames call).
2. Verify returned count, all row identities, common timestamp, no duplicate names,
   and monotonic 24h/7d counts. Keep absent rows unknown and quarantine semantic
   conflicts. Revalidate beta limitations before upgrading field status.
3. Use the existing daily fee acquisition recipe and the fixed exclusion mapping.
   Never replace the DefiLlama fee basis with Codex pool-fee totals.
4. Run `python3 research/lamble/20260926T182058Z/normalize.py`, followed by
   `node scripts/import-frames-snapshot.mjs`. Both are offline by default.
5. Rebuild and run regression checks. No recurring job is installed. A later
   explicitly run refresh can collect indexed activity hourly and fees daily.

Production build, TypeScript, lint, six regression tests and whitespace checks
passed. Browser validation confirmed the populated summary cards and table, while
preserving unknown strict metrics and the existing charts.
