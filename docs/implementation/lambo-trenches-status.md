# Lambo trenches research — implementation status

Branch `claude/zen-curie-brdxtq`. Kept current while building; each row names where the requirement is
implemented, how it is tested, what evidence exists and its status. Statuses:

- **implemented+tested** — code exists and automated tests exercise it with retained or synthetic data.
- **implemented** — code exists; exercised manually or only by build, not by an automated test.
- **live-verified** — exercised against the real external system in this work.
- **blocked (external)** — cannot be completed without an external prerequisite, named in the row.
- **partial** — some of the requirement is met; the remainder is named.

No owner-approved Frames budget was supplied for this work, so no paid Frames call was made. Free calls only:
`frames_get_usage`, `frames_search_tools`, `frames_get_tool`, `frames_probe_tools` (2026-10-19).

## Batch 1 — provider and data foundation

| ID | Requirement | Implementation | Tests / evidence | Status |
|---|---|---|---|---|
| P1 | One authoritative, schema-validated provider catalog | `docs/data/providers.json`, `docs/data/providers.schema.json`, `src/lib/lambo/catalog/catalog.ts`, `scripts/lambo/providers.ts validate` | `tests/lambo/foundation.test.ts` (catalog rules); `npm run lambo -- providers validate` | implemented+tested |
| P2 | Separate capabilities / universe+rules / cadence+budget | capabilities: `providers.json`; universe+rules: `docs/prompts/refresh-market-data.sources.json` (tool IDs removed, `capabilities` keys added); jobs: `docs/data/jobs.json` | plan.py regression (below) | implemented+tested |
| P3 | Every capability records key, provider, tool ID, host, schema, networks, adapter, units, coverage, pagination, timestamps, refresh, max age, cost, validation, rights | `providers.json` capability entries; schema enforces required fields | schema validation | implemented+tested |
| P4 | Capability names in code; tool IDs only in the catalog | `scripts/frames-refresh/catalog.py`; `plan.py`, `discover.py`, `normalize.py` resolve via `tool()`/`search_ids()`; scripts assert no `bazaar.`/`mpp.`/`srch_` literals | Regenerated 2026-10-19 requests byte-identical to the archived run with OHLC off (all 10 batches); `normalize.py` re-run on a copy reproduces every output except evidence `upstream` labels | implemented+tested |
| P5 | New provider needs registered adapter + validation; inserting an ID does not enable it | `checkCatalogRules` (enable rule), `src/lib/lambo/adapters/registry.ts`, `providers.ts enable` | foundation test "candidates cannot be enabled" | implemented+tested |
| P6 | Retain Codex, DefiLlama, Firecrawl, X | 8 enabled capabilities with validated contracts and evidence paths | catalog validate | implemented |
| P7 | x4o2 Pump + FOMO seeds, descriptors re-verified | 6 Pump + 7 FOMO seeds plus `pump.search`, `pump.traders`, `fomo.activity`, `fomo.search`; descriptors via `frames_get_tool`, live schemas via `frames_probe_tools` (`data/provider-health/2026-10-19.json`) | Live 402 schemas disagree with descriptors (integers vs strings; Robinhood listed on every FOMO route) — catalog follows the live schema and keeps the descriptor | live-verified (descriptors and liveness only); **no response bodies** |
| P8 | Provider-specific normalization (FOMO population, Pump panel sample, source-reported P&L, pinned posts, timestamps, units, arg types, payment ≠ data network, candle depth) | `src/lib/lambo/adapters/x4o2.ts` (field-map driven; refuses without a verified map), `codex.ts`, `defillama.ts`, `social.ts` | foundation tests 3–9 use SYNTHETIC fixtures | implemented+tested; x4o2 field paths **blocked (external)**: need one retained response per route under an approved budget |
| P9 | Onboarding workflow discover→inspect→probe→smoke→normalize→validate→register→enable | `scripts/lambo/providers.ts inspect/smoke/register/enable/health`; `docs/runbooks/provider-onboarding.md` (pending) | partial tests | partial |
| P10 | Machine-readable coverage matrix + public sources page | `docs/data/provider-coverage.json` (generated); `/sources` page pending | — | partial |
| P11 | Codex OHLC price candles at no extra call cost | `jobs.json codexBars.ohlcEnabled=true`; `plan.py` selection; `normalize.py check_ohlc` | Field names from the retained official doc example only; **first live run will verify** | implemented (unverified live) |

## Batch 2 — observation store and ingestion

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| S1 | Relational store with migrations | `src/lib/lambo/store/sqlite.ts`, `src/lib/lambo/store/schema.ts`, `npm run lambo -- migrate` | `tests/lambo/release.test.ts` | implemented+tested |
| S2 | Canonical identity: network + address, Solana case preserved, EVM lowercase; pools (incl. 32-byte v4 ids) | `src/lib/lambo/core/identity.ts` | `tests/lambo/foundation.test.ts` | implemented+tested |
| S3 | Observations keep source, evidence, observed and availability time, revisions (never overwritten) | `observations` table (`revision_of`), `scripts/lambo/ingest.ts`; availability = first commit time of the run manifest | Ingestion fidelity: 43/43 snapshot prices and 19/19 venue 7-day fees equal the normalizer output; partial ingest rolls back | implemented+tested |
| S4 | States observed / derived / stale / insufficient_data / unavailable / not_applicable | `src/lib/lambo/core/measure.ts` (`assertMeasure`); release check `measure-states` | release validation on every publish | implemented+tested |
| S5 | Membership intervals with unique ids; featured, collection, membership and lifecycle separate; cap replacements reinterpreted | `normalize.py` (`interval_id`, `pausedNarratives`, `archivedMembers`), `ingest.ts classifyClosure`, `memberships.close_kind` | methods test "leaving featured placement…"; D9 below | implemented+tested |
| S6 | Programmatic collection path replacing transcript scraping | pending (Batch 7) | — | pending |

## Batch 3 — methods

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| M1 | Holder analysis: 9 components in 4 areas with stated semantics; composite versioned, gated, disabled | `src/lib/lambo/methods/holders.ts`, `docs/methods/holder-analysis.v1.json` | `tests/lambo/methods.test.ts` (retention, new wallets, transfers, concentration, composite gating) | implemented+tested; 7 of 9 components **blocked (external)**: no validated holder-balance or wallet-resolved trade capability |
| M2 | Bottoming test: three-condition state machine, no look-ahead, reset on new low, not_applicable vs insufficient_data | `src/lib/lambo/methods/bottoming.ts` (bottoming-v1.0.1), `docs/methods/bottoming.v1.json` | methods tests incl. look-ahead and open-interval regression | implemented+tested; every coin in the current release is insufficient_data (139) or not_applicable (8): no candles in the store, no wallet-resolved sales |
| M3 | Forward-evaluation harness | `src/lib/lambo/methods/evaluation.ts` | methods test | implemented+tested; 0 signals, so no performance claim |
| M4 | Weekly editions: ISO weeks end-exclusive, three historical modes, flows vs stocks, dedup, comparable basket, revisions | `src/lib/lambo/methods/weekly.ts` (weekly-v1.1.0), `scripts/lambo/weekly.ts` | methods tests (boundaries, as-known-then, dedup, comparable basket) | implemented+tested |

## Batch 4 — releases and service layer

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| R1 | Immutable, content-addressed releases; atomic publication; checksum-verified reads | `scripts/lambo/release/*`, `src/lib/lambo/service.ts` | `tests/lambo/release.test.ts` (tamper, rollback) | implemented+tested |
| R2 | One read path for website and API; no provider calls when serving or building | `src/lib/lambo/service.ts` | build makes no provider calls (reads files); automated check pending (Batch 8) | implemented |
| R3 | Change events on one global cursor | `src/lib/lambo/release/changes.ts`, `data/changes/events.json` | release test | implemented+tested |
| R4 | Latest complete edition plus comparison week | `data/editions/2026-W42` (r1, r2), `2026-W41` (r1, r2, reconstructed) | r2 = weekly-v1.1.0 at the same cutoff; reasons recorded in each file | implemented |

## Batch 5 — public website

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| W1 | Routes `/`, `/coins`, `/coins/[chain]/[address]`, `/narratives(/[slug])`, `/market(/[week])`, `/launchpads(/[slug])`, `/research(/[slug])`, `/methodology`, `/sources`, `/api` | `src/app/**` | `next build`: 210 pages; Playwright at 1440 and 390 px: all 200, no horizontal overflow, no page errors | implemented |
| W2 | Coin page: identity, market with per-value as-of, charts with gaps, changes, holder table, bottoming test, memberships, peers, provider panels, research, evidence, agent retrieval | `src/app/coins/[chain]/[address]/page.tsx` | screenshots | implemented |
| W3 | Unknown coin: not-covered page with request text; malformed chain/address: 404 | same file (`NotCovered`), `src/app/not-found.tsx` | `/coins/solana/So111…112` 200 not-covered; `/coins/notachain/xyz` 404 | implemented |
| W4 | Bidirectional links coin ↔ narrative ↔ launchpad ↔ week ↔ article | all pages | manual | implemented |
| W5 | Frames setup and copyable prompts without invented deep links, listings or status | `src/app/api/page.tsx`, `src/components/research/agent-access.tsx`; `NEXT_PUBLIC_FRAMES_MCP_URL` unset → "use the connection details in your Frames account"; `NEXT_PUBLIC_LAMBO_FRAMES_LISTING` unset → "not yet listed" | manual | implemented |
| W6 | Metadata, canonical URLs, sitemap, robots, RSS and Atom, share cards from release data | `generateMetadata` per route, `src/app/sitemap.ts`, `robots.ts`, `research/feed.xml`, `research/atom.xml`, `opengraph-image.tsx` (home, coin, narrative, edition) | build | implemented |
| W7 | No paid data in pages, hydration payloads or static artifacts | pages read `public.json` only; `loadBundles` is called only by the paid API path | grep: no page imports `loadBundles` | implemented |
| W8 | Accessible, responsive, explicit states | skip link, landmarks, `aria-current`, labelled filters, chart text summaries, states as text not colour | 390 px screenshots | implemented |
| W9 | Local watchlist (no account) | `src/components/research/client.tsx` (`localStorage`, this browser only) | manual | implemented |
| W10 | Replace launch-only homepage and placeholder agent onboarding; launch stays secondary | `src/app/page.tsx`, `src/components/hero/research-hero.tsx`; removed the placeholder prompt, mock ticker and fixture provider | — | implemented |
| W11 | Article pipeline with attribution and review policy; ≥1 weekly, coin and narrative article | `src/lib/lambo/research/*`, `scripts/lambo/research.ts`, `content/research/` (daily, weekly 2026-W42, coin SI, narrative Super Intelligence) | template text from release values; every block cited; deep dives `pending-review`, hidden when `VERCEL_ENV=production` | implemented (tests pending) |

Defects found while building Batch 5 and fixed at the source: negative `secondsSinceLow` for sample-based episodes (bottoming-v1.0.1); trend reported for narratives no longer collected (now `not_collected`, release builder 1.1.0); week-over-week change reported on a 1-of-17 comparable basket (weekly-v1.1.0, editions revised to r2); fractional `return7d` rendered as percent; `Intl` compact currency differing between Node and Chromium ICU (hydration mismatch) replaced by a deterministic formatter.

## Batch 6 — research API and payments

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| A1 | `/api/v1` resources: coins, coin, coin bundle and history, narratives, weeks, launchpads, research, changes, index, health | `src/app/api/v1/**` (thin), `src/lib/lambo/api/routes.ts` (bodies), `resources.ts` | `tests/lambo/api.test.ts` (12); HTTP smoke against `next start`: free routes 200, rights-blocked bundles 403, sellable bundles 503 without payment config | implemented+tested |
| A2 | OpenAPI, schemas, agent docs | `/api/v1/openapi.json` (`src/lib/lambo/api/openapi.ts`, generated from paths, pricing and the rights gate), `/llms.txt`, `/api` page | api test checks every paid route documents price, 402, 403, 503 | implemented+tested |
| A3 | Free discovery shows identity, coverage, availability, schema, price; no market values | `coinDiscovery`, `narrativeDiscovery`, `weekDiscovery`, `articleDiscovery` | api test asserts no market value appears in coin discovery | implemented+tested |
| A4 | Envelope with schemaVersion and release (id, dataCutoff, methodVersions) | `src/lib/lambo/api/http.ts` | api tests | implemented+tested |
| A5 | Unknown rights block paid exports | `src/lib/lambo/api/rights.ts`: per-section sources; unsellable bundles answer 403 with no offer; withheld sections marked, never dropped | api tests (403 creates no offer and no settlement; flipping rights opens sections) | implemented+tested; **blocked (owner)**: Codex and DefiLlama terms review — until then coin, history, week and launchpads bundles are not for sale |
| A6 | x402 and MPP adapters around one entitlement layer: offers pinned to a release, single-use payment keys, verify before settle, no client tx hashes, capability re-download, lost-response replay, uncertain settlement, append-only audit | `src/lib/lambo/payments/**`, `docs/runbooks/payments.md` | `tests/lambo/payments.test.ts` (18), plus api test: full offline x402 purchase through the real route (one settlement, capability re-download, capability refused for another narrative) | implemented+tested offline; **not live-verified** (no facilitator, chain, wallet or budget) |
| A7 | Config-driven test prices | `docs/data/pricing.json` (status test, approved false); pages read prices through the payment layer's loader | pricing parse tests | implemented+tested |
| A8 | Bazaar discovery metadata on x402 challenges | `X402Adapter.paymentRequiredHeader` (declare + enrich via the registered Bazaar extension) | api test decodes PAYMENT-REQUIRED: GET, route template `/api/v1/narratives/:slug/bundle` | implemented+tested; listing **unverified** |
| A9 | Frames seller onboarding inspected; no invented listing | `docs/runbooks/frames-listing.md`; free search 2026-10-19 (`srch_893f6f0d-…`): no LAMBLE tool; pages say "not yet listed" unless `NEXT_PUBLIC_LAMBO_FRAMES_LISTING=listed` | free search evidence | implemented; listing **blocked (external)** |
| A10 | One live acceptance if credentials, registration, deployment and budget permit | not run: no pay-to address, facilitator credentials, MPP recipient or secret, funded wallet, purchase budget, public deployment, or durable commerce storage | runbook §9 lists the prerequisites | **blocked (external)** |
| A11 | No paid calls in page views, builds or bundle retrieval | serving reads release files; api test stubs `fetch` and scans `src/app`, `src/components`, API, site, research and the service for collection imports and `fetch(` | api test | implemented+tested |

## Documentation drift found

| ID | Drift | Resolution |
|---|---|---|
| D1 | README: "No recurring refresh or paid background job is installed" vs refresh prompt: "A scheduled Claude Code routine runs the scripted path below once a day" vs git history (daily "Daily refresh" PRs 2026-10-02..19, none 2026-10-14) | An external Claude Code routine is active; nothing in the repository installs a schedule. `jobs.json` labels it `active-external`; README to be corrected. |
| D2 | Registry `automaticRefresh: false` | Means "nothing in-repo"; documented in jobs.json policy. |
| D3 | `src/lib/data/snapshots/README.md` names runs 20260928T154336Z / 20261002T003446Z as current | Actual imported run is 20261019T055754Z; README to be corrected. |
| D4 | Refresh prompt §5 "currently only two narratives are supported … first three array entries drive the landing selection" | Six active narratives; UI shows all. To be corrected. |
| D5 | Refresh prompt "Daily call envelope … 42 calls" | 2026-10-19 run: 90 calls, 837 credits. To be corrected. |
| D6 | Tool IDs and search IDs hardcoded in plan.py, discover.py, normalize.py | Moved to the catalog (P4). |
| D7 | `save.py` scrapes local Claude transcripts as the only result-capture path | Programmatic collector pending (O7). |
| D8 | README "Two evidence-backed narratives cover nine identified coins" | Six narratives, 43 open constituents, 147 tokens on record. To be corrected. |
| D9 | All 15 historical narrative "retirements" (2026-10-02..19) closed 95 memberships only to fit the six-narrative cap | Reinterpreted as collection paused (Batch 2); refresh prompt and normalize.py to separate featured placement from lifecycle. |
