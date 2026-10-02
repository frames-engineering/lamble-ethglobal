# LAMBLE daily market-data refresh

Use this file as an agent prompt from the repository root:

> Follow `docs/prompts/refresh-market-data.md` to refresh LAMBLE's data now. Use the connected Frames MCP, save evidence, update the local landing snapshot, and run the validation checks. Do not commit or deploy. Paid calls must follow the budget authorization for this invocation.

The source registry beside this file records the known routes, mappings, pool universe
and daily evidence checks. A scheduled Claude Code routine runs the scripted path below
once a day; the routine's own prompt states its budget and whether it may commit,
open a pull request and merge. Without such an instruction, the boundaries below apply.

## Daily routine: scripted path

Run from the repository root on a fresh branch from the default branch. Every paid call
goes through the Frames MCP; scripts never spend.

1. `python3 scripts/frames-refresh/plan.py research/lamble/$(date -u +%Y%m%dT%H%M%SZ)`.
   This writes `raw/{f1..f4,c1,e1}-request.json` from the registry: 38 DefiLlama
   fee/revenue calls, Codex launchpad activity, hourly bars for every pool, a token
   market snapshot, and the evidence pages and X searches in `dailyEvidence`.
2. Call `frames_get_usage`, then invoke each batch with `frames_invoke_tools`, passing the
   file's `calls`, `idempotency_key`, `max_usd` and `search_ids` exactly. Poll
   `frames_get_run` until each run is `completed`.
3. Save each run with `python3 scripts/frames-refresh/save.py <run_id> <run>/raw/<batch>.json`.
   Never transcribe bodies by hand. If calls fail with `amount_exceeds_cap` (a seller
   price change), re-quote with `frames_probe_tools` (free) and retry only those calls
   as `e2` (`e3`…) with a new idempotency key; the normalizer reads every `e*` batch.
4. Review the evidence pages and posts, then write `<run>/curation.json`. It holds only
   judgment: `signals` (per narrative: `postId`, `title`, optional `label`; omit a
   narrative to keep its previous signals), `summaries`, `storyStatus`
   (`evidence: "e1:<seq>"`, `notice`, `interpretation`), `newMembers` (rationale and
   evidence for every registry pool not seen before), `removedMembers`, `newNarratives`,
   `provenanceSources` and `candidates`. Add or retire constituents in the registry's
   `poolUniverse` first; never remove a constituent without recording why.
5. `python3 scripts/frames-refresh/normalize.py <run> --prior <previous full run>`.
   It computes every metric, the turnover-based volume caveat and the validation report,
   and fails loudly on gaps, contradictions or identity mismatches. Fix the cause; never
   weaken an assertion to get a run through.
6. `node scripts/import-frames-snapshot.mjs <run> research/lamble/20260926T175634Z/launchpad-enrichment.json <run>/landing-metrics.json <run>`,
   then update the importer's default paths to the new run.
7. Run the checks in section 8 and inspect the page. Write `<run>/report.md` with changes,
   anchors, story changes, failures and billed credits.

Weekly or when discovery is due, run the token-, registry- and story-first sweep from
`research/lamble/20260928T154336Z/report.md` before step 4. Reference observations in
the registry are starting points, not current market claims.

## Mission and boundaries

Acquire actual observations for the landing page's launchpads and specific token
narratives. Update the data locally, retaining the existing design and copy except
where a metric's scope requires a qualifier. Do not add snapshot/research banners.
Do not fabricate numbers, replace unknowns with zero, or regenerate fixture walks.

External work is read-only. Do not create accounts or wallets, launch tokens, trade,
move funds or send messages. Commit, open pull requests, merge or install a recurring
task only when the invoking prompt (for example the scheduled routine) says so. Authorized
Frames data charges are allowed; inspect usage first. An old run's “no ceiling”
entry, a plan limit, or an account balance is not fresh spending authorization.
Use the authorization supplied for this invocation; if none exists, complete free
inspection and report that paid execution needs authorization. Never print secrets
or secret-bearing headers. No paid calls should run in page rendering or builds.

## 1. Inspect the current implementation before collecting

Read `AGENTS.md` and relevant installed Next.js docs before changing code. Inspect
`git status` and preserve unrelated work. Record the current local commit and, when
repository access permits, current default-branch commit without switching branches.
Read the current DTOs, provider, generated snapshots, importer, aggregate function,
hero tiles, narrative components, launchpad columns/detail sheet, and chart code.
Find the latest successful manifests, not merely the newest directory by name.

Starting references (paths relative to repo root):

- `docs/prompts/refresh-market-data.sources.json`: source registry and mappings.
- `docs/data/launchpad-logos.json`: reviewed local icons for all 19 venues, source URLs and hashes. The importer preserves these; update this registry when branding changes. Three icons come from DefiLlama protocol mappings, so prefer official replacements when available.
- `research/lamble/20260926T172434Z/`: financial and narrative acquisition, exact requests, evidence, tokens, memberships, recipes and validation.
- `research/lamble/20260926T175634Z/`: official chains/configuration, 13 local logo assets, metadata overlay and receipts.
- `research/lamble/20260926T182058Z/`: indexed launchpad activity, fee-subtotal exclusions, exact query and remaining gaps.
- `src/lib/data/snapshots/README.md`: integration notes.
- `research/lamble/20260926T184109Z/`: expanded nine-coin universe, seven-day bars, exact pool-creation evidence and pre-creation zero provenance.
- `tests/frames-data.test.mjs`: offline regression checks.

Preserve all 19 venue slugs. Supported chains, financial coverage and indexed-activity
coverage are different sets. Stable and Ink are supplemental support metadata,
outside the existing ChainId union. Do not add chains or venues silently.

### Current refresh hazards — address before import

The research scripts reproduce their original runs; they are **not generic daily
collectors**. At the reference revision:

- `20260926T172434Z/normalize_frames.py` fixes `TF`, `TC`, prior-run paths and batch names, and asserts equality with an old public snapshot.
- `20260926T175634Z/normalize_enrichment.py` fixes prior paths and the original scrape set.
- `20260926T182058Z/normalize.py` fixes prior financial paths and asserts an 80-row catalog. Eighty is an observation, not a permanent catalog size.
- `scripts/import-frames-snapshot.mjs` now accepts financial-run, enrichment, activity and narrative-run paths explicitly. Its default paths still point to the reference runs; always provide the new run paths. Review its narrative-specific source-link mapping before adding a third narrative.
- Tests include original numeric totals and original research paths.

Inspect whether these limitations have since been fixed. If not, minimally
parameterize the offline refresh/import helpers or create a new run-local
normalizer. Select financial, narrative, metadata and activity inputs explicitly.
Never overwrite old raw observations. Do not run an old script and call its output
fresh. Replace snapshot-specific test expectations with independently recomputed
new-source expectations; preserve arithmetic, identity and missing-data checks.
If adding narratives, remove hardcoded two-narrative assumptions first.

## 2. Start a timestamped run and inspect Frames

Create `research/lamble/<UTC-YYYYMMDDTHHMMSSZ>/` with `raw/`. Record runtime UTC,
repository revision, source versions, prior successful runs and approved budget.

Discover the actual connected tool names/schemas. Expected Frames operations:
`frames_get_usage`, `frames_search_tools`, `frames_get_tool`, `frames_probe_tools`,
`frames_invoke_tools`, `frames_get_run`, `frames_get_tool_results`.

Reuse validated tool/provider mappings. Inspect changed descriptors and use focused
2–4-angle searches only for missing routes or schema changes. Probe up to five
intended candidates; skip invoke-ready hits. Author exact `{id,args}` requests,
at most ten per batch, with discovery `search_ids`, a new stable idempotency key
per logical refresh batch, and an explicit small `max_usd` cap within authorization.
Reuse an idempotency key only to recover the same observation. Poll accepted runs
to terminal status. Retrieve and inspect every `body_ref` by run ID and sequence.
A delivered receipt or async job ID is not validated data.

Save redacted requests, full bounded responses, run IDs, sequences, outcomes and
billing. Avoid oversized retrievals: narrow at source, and bound retries/pages.

## 3. Refresh daily financials for all 19 venues

Validated route: `bazaar.defillama-use-x402atlas-com-fee-summary` (DefiLlama via Atlas).
For each provider mapping in the source registry, request both:

```json
{"protocol":"<mapped provider slug>","dataType":"dailyFees","excludeTotalDataChart":"false","excludeTotalDataChartBreakdown":"true"}
```

Use `dailyRevenue` for the second request. This is **38 calls**, batched at most ten.
Exact reference requests are in `raw/seed-request.json` and `raw/f1-request.json`
through `raw/f4-request.json` in the financial run. Select only the financial calls;
do not blindly replay mixed batches containing failed or irrelevant providers.

Use `totalDataChart`, not an assumed meaning of `total24h`. Verify provider identity,
units, UTC-midnight timestamps and latest complete-day availability. Choose a
financial exclusive-end anchor F supported by the data. If a venue lags, retain its
actual anchor or mark it stale; do not claim all venues are synchronized.

For each W = 1, 7, 30 days, calculate [F-W,F) and [F-2W,F-W):
`change = 100 * (current - previous) / previous`; missing/zero previous => null.
Keep fees, revenue, creator earnings and trading volume separate. Store exactly
30 complete UTC dates for fee history, oldest first, with unknown dates null.
Thirty-day changes require 60 complete fee days. Never forward-fill or interpolate.

Cache full histories. Reconcile at least the last seven complete days for revisions;
record older revisions if returned. Do not invent date filters the wrapper lacks.
Review methodology changes, provider flags and version/chain scope.

Fee subtotal: retain the explicit inclusion/exclusion policy in the latest
`landing-metrics.json`. The reference excludes StonkFun, BONK.fun, Graphite, Bags
and Binance Alpha because overlaps/components are unresolved. Recompute from the
new financial run and align by timestamp. Do not add all roster rows, silently
shrink the denominator after a failure, or label a subset “all launchpads.” The
partition is methodology-based, not event-level reconciliation. Do not substitute
Codex pool fees for the DefiLlama fee basis. Incomplete subtotal history => gaps;
missing prior 30-day window => no invented trend delta.

## 4. Refresh indexed launch/completion observations

Validated route: `mpp.codex.post.graphql`, query `filterLaunchpads`.
Reuse the exact field selection in
`research/lamble/20260926T182058Z/raw/launchstats-request.json`.
Official schema: https://docs.codex.io/api-reference/queries/filterlaunchpads.md
Lifecycle: https://docs.codex.io/recipes/launchpad-lifecycle.md
Named surfaces versus engines: https://docs.codex.io/launchpads.md

Start with `scope: global`, `isTestnet: false`, limit 200, offset 0. Validate returned
count versus rows; paginate only using documented offset/limit if needed, bounded
by the run budget. Check unique IDs, timestamps, nonnegative integer counts and
24h <= 7d. Keep named surfaces distinct from protocol/engine totals and never add
global rows to network rows. The registry contains the tested 14 venue mappings.

These counts are **beta provider-indexed observations**. Exact cutoffs, finalized
creation events and exhaustive historical coverage were not independently verified.
Keep them in `activityObservation`, with visible “Indexed”/`≈` qualifiers. Do not
promote them to strict event-verified DTO fields without new evidence. Codex's
Created lifecycle event means metadata population; do not equate indexing time or
pair creation with token creation. Keep completed and migrated fields separate.

Quarantine semantic conflicts. Reference Argus completion observations conflict
with its direct-v4-pool methodology and are excluded. Clanker/o1 curve completions
are not inferred from zero-valued provider fields. Pons financials cover V2 while
indexed surface coverage is broader/uncertain: preserve separate scope metadata.
For a completion ratio, numerator and creation denominator must cover the same
venues and window; do not divide 11 venues' completions by 14 venues' launches.
Seven-day period completion/creation ratios can exceed 100%; never clamp them.

Absent venues remain unknown, not zero. Graphite is an engine/fee participant;
Binance Alpha listings aren't creations; RapidLaunch toolkit actions overlap
underlying launches. StonkBrokers and BaseStonk had no matching indexed rows.

## 5. Refresh narrative evidence, constituents and real volume charts

The first three array entries drive the landing selection; currently only two
narratives are supported. They are a curated evidence-backed selection, not a
market-wide top-three ranking. Do not manufacture a third or preserve yesterday's
story as “emerging” without checking fresh evidence.

Perform token-first and story-first review daily. Revisit official source records
and public discussion, sample both recent launches and established activity across
covered venues, and record omitted venues. Use the saved UsePaid registry/docs,
KNOTS mechanism page, ZCAT address-level evidence and targeted X searches as seeds,
not as the full current discovery universe. Two bounded X queries are samples,
not a mention census. Add focused discovery only where it can resolve a real gap.

Require chain + case-sensitive contract address, name/symbol, origin venue,
evidence URL/record, source event time where known, first-observed time, rationale,
confidence and versioned effective membership intervals. Origins remain
source-reported unless creation transactions are independently decoded. Preserve
rejected candidates and dead/delisted constituents. Models interpret stories;
deterministic code computes metrics. Do not treat named recipients as endorsements
or verify payouts merely from a creator-fee routing claim. ZEC/STONK quote assets
are not constituents of the paired-reward narrative.

Validated market route: `mpp.codex.post.graphql` → `getBars`. The source registry
holds the nine exact pool identities and constituent memberships. Reference
`raw/e1-request.json` call 0 for seven days of hourly USD bars; `raw/seed-request.json`
call 0 for 24 hours; `raw/v1-request.json` for tested boundary/minute reconciliation.

Choose T_chart at a UTC hour boundary with a one-complete-hour safety margin:
`floor(runtime_seconds / 3600) * 3600 - 3600`, adjusted for observed ingestion lag.
Request each known pool with:

```graphql
getBars(symbol: "<pool>:1399811149", from: <T_chart-7*86400>,
  to: <T_chart-1>, resolution: "60", currencyCode: "USD",
  removeEmptyBars: false) { t volume }
```

This is a template: replace bracketed values with actual integers/validated IDs.
Use nine aliases in one query when supported; bound new-constituent batches.
The tested source uses seconds, start-labelled bars and inclusive end bounds;
`to=T_chart-1` avoids an extra boundary bucket. Recheck semantics after source changes.

Retain 24 required hourly buckets [T_chart-24h,T_chart), oldest first, id `volume`.
Also retain 168 hourly buckets when complete, then 30 daily buckets where supported.
Daily history must be actual interval sums, not rolling snapshots or evenly spread
volume. Incrementally merge by chain/pool/bucket with at least three-hour overlap;
a daily refresh needs all missing hours, not just the overlap. Keep revisions.

Aggregate only the declared constituent/pool universe; deduplicate shared pools and
trade events where available. Keep the fixed-pool sample scope explicit. Reconcile
24h and 7d totals against the same universe/time window (absolute tolerance $0.01,
with a separately justified rounding tolerance if required). Missing intervals
stay null and preserve the grid; zero requires complete observation. Never shrink
the universe after a failed source. Mark retrospective membership backfills as
“reconstructed today”; they do not prove historical detection.

Legacy `topLaunchpads` means share of narrative launches, not volume. Populate only
from complete member-creation events with a declared denominator; prior-window
change is percentage points. Otherwise retain null and show identified coin origins
under “Launchpads.” Contenders are real tokens; measured pool-volume share remains
separate from attention share. Mindshare, status and startedAt stay null without a
supported definition/history. Example market cap must not silently fall back to
FDV; example change24h means token-price change. Refresh those values independently
or retain their old timestamps/mark stale rather than presenting them as new.

## 6. Configuration and branding cadence

Daily: inspect meaningful announcements or source changes relevant to tracked
venues. Weekly: recheck official deployment tables, supported networks, curve
mechanics, destination AMMs and fee variants. Monthly/on rebrand: recheck logos.
The registry links every tested official-page request and per-field evidence.

Use official identities/assets. Cache hashes and reuse local logos; don't download
all assets every day. Inspect actual image signatures, reject active SVG content,
and never invent `/public` assets. Distinguish tax rates from swap fees, bps of fee
from bps of trade, quote reserve thresholds from market cap, and gas/liquidity from
launch charges. Do not invent constants for per-version/per-launch configurations.

## 7. Failed paths: don't pay repeatedly for known blockers

- Dune SQL via Frames failed payment-challenge parsing, before a query result.
- Allium SQL accepted an async job, but documented status/results require API-key
  authentication and no matching Frames result route was available. A job ID is
  not data. Verify a usable result path before another paid SQL submission.
- Codex GraphQL introspection is disabled: use official generated reference docs.
- Loophole launch feed ignored `since` and was truncated; not complete counts.
- Bitquery Pump launch wrapper was not validated beyond a capped/sample route.
- Otto X summary was generic/irrelevant; no narrative evidence was accepted.
- Redacted/null token metadata cannot resolve identity by row order or price.
- Firecrawl app shells, bot checks and geoblocks are not usable page evidence.

Check whether a documented blocker has changed before testing once; bound retries.
Label direct public HTTPS or another provider as an outside-Frames fallback, with
its different semantics. Never silently substitute price for volume, discovery for
creation, migration for completion, or protocol revenue for fees.

## 8. Validate, import and report

Save a new run's normalized launchpads, narratives, tokens, memberships, evidence,
series/CSV, coverage, recipes, refresh manifest, billing and validation report.
For populated fields retain source URL/tool/upstream, exact redacted request,
run/seq or immutable raw reference, extraction path, source_as_of, fetched_at,
window semantics, transformation, completeness, method version and limitations.
Preserve the supported statuses: verified_direct, verified_derived,
candidate_unverified, requires_indexer, requires_internal_config, not_applicable,
not_found, blocked. Don't call execution delivery semantic verification.

Before replacing the app snapshot, validate:

- 19 stable slugs, known ChainIds, valid references and unique token/pool identities.
- Financial windows, history grid, null handling and exclusion policy.
- Indexed observation mappings, scope, timestamp and same-universe ratios.
- Narrative evidence, membership versions, hourly grid and volume reconciliation.
- Logo existence/hashes and safe source URLs; no credentials in artifacts.
- No fresh run accidentally imports an old activity overlay or outdated narrative
  summary through hardcoded branches. Partial failures retain timestamped prior
  data or null, never a new freshness stamp. Unvalidated data does not replace a
  previously valid observation.

Once the helper input paths are explicit and every check passes, import the new
run and preserve current UI labels/qualifiers. Run:

```sh
npx tsc --noEmit
npm run lint
node --experimental-strip-types --test tests/frames-data.test.mjs
npm run build
git diff --check
```

Inspect the local landing page using the available browser skill: summary cards,
both/all narrative selections, chart gaps, launchpad search/filter/sort and detail
sheets. Confirm no research banner, fixture fallback or fabricated third narrative.
Do not commit/deploy unless separately instructed.

End with what changed, source anchors, venue/narrative coverage, remaining gaps,
validation results, paths to artifacts and actual billed credits. Sum
`billing.charged_credits` once per unique Frames run ID; report
`billing.percent_remaining`. Keep quotes and USD estimates separate. Do not claim
ongoing monitoring has begun.

## Daily call envelope and optional cadence

Starting daily workload: 38 financial calls + 1 indexed launchpad query + 1 batched
nine-pool seven-day bar query + 2 targeted social queries = **42 calls**. Add up to
four changed narrative evidence pages (46 total), and at most two focused discovery
calls if needed (48 total), subject to the invocation's authorization. Expand only
for an identified coverage need; don't spend the entire run rediscovering tools.
Pagination, retries and additional token batches must be counted explicitly.

Cache unchanged metadata and historical bars. Hourly activity/market bars and
30–60-minute social review are optional future schedules, not part of an installed
monitor. Initial acquisition (230 credits), enrichment (77), and activity repair
(14) are historical bills with different workloads, **not daily cost estimates**.
