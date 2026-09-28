# Frames landing snapshot

The production provider serves `frames.ts`, generated from research run
`20260928T154336Z` (financials, indexed activity and narratives; metadata from `20260926T175634Z`). The page performs no metered calls and does not refresh automatically.

After a new research acquisition has been normalized and validated:

```sh
node scripts/import-frames-snapshot.mjs research/lamble/<financial-run> research/lamble/<metadata-run>/launchpad-enrichment.json research/lamble/<activity-run>/landing-metrics.json research/lamble/<narrative-run>
npx tsc --noEmit
npm run lint
npm run build
```

The importer checks venue identity coverage, known chain IDs, narrative time grids,
volume reconciliation and signal evidence. It includes only presentation data and
source links; raw requests, billing receipts and research evidence stay outside the
application bundle. Preserve the research directory for auditing and offline tests.

Run the current snapshot regression checks with Node 24:

```sh
node --experimental-strip-types --test tests/frames-data.test.mjs
```

Unknown numeric values remain null. Supported chains and financial chain coverage
are separate. Hero chain badges use supported chains. Overlapping financial totals
remain unknown. The original landing copy is retained; research provenance stays in data.
Narrative coin percentages use the explicitly labelled selected-pool volume share;
the legacy attention and launch-share fields remain unknown.

Current metadata overlay: `research/lamble/20260926T175634Z/launchpad-enrichment.json`.
It fills all 19 chain records. `docs/data/launchpad-logos.json` overrides logo paths
with reviewed local assets for all 19 venues, preserving them across imports.
Sixteen use official site assets (o1 uses its parent brand); LaunchLab, Graphite
and Argus use DefiLlama's explicitly mapped protocol icons. The registry records
source URLs, fetch times and SHA-256 hashes. These assets are served locally.
Some support sets are partial. Stable and Ink are supplemental metadata because
they are outside the current ChainId contract. Metadata collection is explicit;
the snapshot importer is entirely offline.

Activity overlay: `research/lamble/20260928T154336Z/landing-metrics.json`.
Each refresh run carries its own `normalize.py`; run it before importing. The app
keeps beta indexed observations in `activityObservation`; verified event-count
fields remain null. `coverage.ts` contains the separately labelled fee subtotal
and the explicit list of excluded overlapping venues. Narrative launch origins
are shown without inventing a launch-share ranking.

Daily agent prompt: [refresh-market-data.md](../../../../docs/prompts/refresh-market-data.md).
Current narrative overlay: `research/lamble/20260928T154336Z/`, with three narratives,
22 identified coins and complete 24h/7d hourly series. Discovery candidates, including
rejected, deferred and quarantined tokens, are in that run's `candidates.json`. Each
narrative carries its own source links in `_meta.provenanceSources`. Pre-creation zeros apply only to buckets
fully before the independently queried pool creation time, not token-wide trading.
Example-token `change24h` is a percent: Codex `filterTokens.change24` is a ratio
(verified against hourly closes in the 2026-09-28 run) and is multiplied by 100.
