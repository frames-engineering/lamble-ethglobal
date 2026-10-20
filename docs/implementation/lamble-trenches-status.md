# LAMBLE trenches research — implementation status

Branch `claude/zen-curie-brdxtq`. Kept current while building; each row names where the requirement is
implemented, how it is tested, what evidence exists and its status. Statuses:

- **implemented+tested** — code exists and automated tests exercise it with retained or synthetic data.
- **implemented** — code exists; exercised manually or only by build, not by an automated test.
- **live-verified** — exercised against the real external system in this work.
- **blocked (external)** — cannot be completed without an external prerequisite, named in the row.
- **partial** — some of the requirement is met; the remainder is named.

Until 2026-10-20 no owner-approved Frames budget was supplied, so only free calls were made (`frames_get_usage`,
`frames_search_tools`, `frames_get_tool`, `frames_probe_tools`, 2026-10-19). On 2026-10-20 the owner approved up to
500 credits for a one-off Pump/FOMO sample (143 spent) and a ceiling of 5,000 credits per daily run; see
[Pump and FOMO enabled](#pump-and-fomo-enabled-2026-10-20).

**Naming.** The implementation brief used "Lambo" as its working label and said to keep the established public
name. The product is LAMBLE. On 2026-10-20 every use of the label was renamed: code folders, environment
variables (`LAMBLE_*`), response headers (`Lamble-*`), capability tokens (`lamble_cap_`), schema ids, the MPP
realm, the store file and this document's filename. Nothing had been deployed, so no client used the old names.

**Regenerated artifacts.** Releases, weekly editions, the change feed and articles were rebuilt on 2026-10-20 from
the retained runs with the corrected code. They had never been published or deployed. Earlier rows below that
cite release ids or edition revisions (r2) describe the state before the rebuild; current ids are in
[qa/checks.txt](qa/checks.txt).

**Earlier statuses corrected.** An audit on 2026-10-20 found rows marked implemented whose substance was missing:
W4 (links ran one way), M1 (the store dropped holder panels, trades and candles, so 7 components could never
populate even with data), A1/A4 (weekly path, envelope times), R3 (no research, edition or correction events),
O5 (verification was a date an operator typed). Those rows now point to the follow-up section.

## Batch 1 — provider and data foundation

| ID | Requirement | Implementation | Tests / evidence | Status |
|---|---|---|---|---|
| P1 | One authoritative, schema-validated provider catalog | `docs/data/providers.json`, `docs/data/providers.schema.json`, `src/lib/lamble/catalog/catalog.ts`, `scripts/lamble/providers.ts validate` | `tests/lamble/foundation.test.ts` (catalog rules); `npm run lamble -- providers validate` | implemented+tested |
| P2 | Separate capabilities / universe+rules / cadence+budget | capabilities: `providers.json`; universe+rules: `docs/prompts/refresh-market-data.sources.json` (tool IDs removed, `capabilities` keys added); jobs: `docs/data/jobs.json` | plan.py regression (below) | implemented+tested |
| P3 | Every capability records key, provider, tool ID, host, schema, networks, adapter, units, coverage, pagination, timestamps, refresh, max age, cost, validation, rights | `providers.json` capability entries; schema enforces required fields | schema validation | implemented+tested |
| P4 | Capability names in code; tool IDs only in the catalog | `scripts/frames-refresh/catalog.py`; `plan.py`, `discover.py`, `normalize.py` resolve via `tool()`/`search_ids()`; scripts assert no `bazaar.`/`mpp.`/`srch_` literals | Regenerated 2026-10-19 requests byte-identical to the archived run with OHLC off (all 10 batches); `normalize.py` re-run on a copy reproduces every output except evidence `upstream` labels | implemented+tested |
| P5 | New provider needs registered adapter + validation; inserting an ID does not enable it | `checkCatalogRules` (enable rule), `src/lib/lamble/adapters/registry.ts`, `providers.ts enable` | foundation test "candidates cannot be enabled" | implemented+tested |
| P6 | Retain Codex, DefiLlama, Firecrawl, X | 8 enabled capabilities with validated contracts and evidence paths | catalog validate | implemented |
| P7 | x4o2 Pump + FOMO seeds, descriptors re-verified | 6 Pump + 7 FOMO seeds plus `pump.search`, `pump.traders`, `fomo.activity`, `fomo.search`; descriptors via `frames_get_tool`, live schemas via `frames_probe_tools` (`data/provider-health/2026-10-19.json`) | Live 402 schemas disagree with descriptors (integers vs strings; Robinhood listed on every FOMO route) — catalog follows the live schema and keeps the descriptor | live-verified: descriptors and liveness (2026-10-19); response bodies for 16 routes (2026-10-20, see below) |
| P8 | Provider-specific normalization (FOMO population, Pump panel sample, source-reported P&L, pinned posts, timestamps, units, arg types, payment ≠ data network, candle depth) | `src/lib/lamble/adapters/x4o2.ts` (field-map driven; refuses without a verified map), `codex.ts`, `defillama.ts`, `social.ts` | foundation tests 3–9 use SYNTHETIC fixtures | implemented+tested; x4o2 field maps for 8 routes verified against retained responses (2026-10-20); `x4o2.test.ts` normalizes each retained body in production mode |
| P9 | Onboarding workflow discover→inspect→probe→smoke→normalize→validate→register→enable | `scripts/lamble/providers.ts inspect/smoke/register/enable/health`; `docs/runbooks/provider-onboarding.md` | foundation tests (enable rules) | implemented |
| P10 | Machine-readable coverage matrix + public sources page | `docs/data/provider-coverage.json` (generated); `/sources` | build | implemented |
| P11 | Codex OHLC price candles at no extra call cost | `jobs.json codexBars.ohlcEnabled=true`; `plan.py` selection; `normalize.py check_ohlc` | Field names from the retained official doc example only; **first live run will verify** | implemented (unverified live) |

## Batch 2 — observation store and ingestion

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| S1 | Relational store with migrations | `src/lib/lamble/store/sqlite.ts`, `src/lib/lamble/store/schema.ts`, `npm run lamble -- migrate` | `tests/lamble/release.test.ts` | implemented+tested |
| S2 | Canonical identity: network + address, Solana case preserved, EVM lowercase; pools (incl. 32-byte v4 ids) | `src/lib/lamble/core/identity.ts` | `tests/lamble/foundation.test.ts` | implemented+tested |
| S3 | Observations keep source, evidence, observed and availability time, revisions (never overwritten) | `observations` table (`revision_of`), `scripts/lamble/ingest.ts`; availability = first commit time of the run manifest | Ingestion fidelity: 43/43 snapshot prices and 19/19 venue 7-day fees equal the normalizer output; partial ingest rolls back | implemented+tested |
| S4 | States observed / derived / stale / insufficient_data / unavailable / not_applicable | `src/lib/lamble/core/measure.ts` (`assertMeasure`); release check `measure-states` | release validation on every publish | implemented+tested |
| S5 | Membership intervals with unique ids; featured, collection, membership and lifecycle separate; cap replacements reinterpreted | `normalize.py` (`interval_id`, `pausedNarratives`, `archivedMembers`), `ingest.ts classifyClosure`, `memberships.close_kind` | methods test "leaving featured placement…"; D9 below | implemented+tested |
| S6 | Programmatic collection path replacing transcript scraping | see O3 | — | implemented+tested (O3) |

## Batch 3 — methods

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| M1 | Holder analysis: 9 components in 4 areas with stated semantics; composite versioned, gated, disabled | `src/lib/lamble/methods/holders.ts` (holder-analysis-v1.1.0), `docs/methods/holder-analysis.v1.json` | `tests/lamble/methods.test.ts`; `tests/lamble/holder-path.test.ts` (F1) | implemented+tested end to end with SYNTHETIC panels and trades; in the release 7 of 9 components stay unpopulated **blocked (external)**: no enabled capability collects holder panels or wallet-resolved trades |
| M2 | Bottoming test: three-condition state machine, no look-ahead, reset on new low, not_applicable vs insufficient_data | `src/lib/lamble/methods/bottoming.ts` (bottoming-v1.0.2), `docs/methods/bottoming.v1.json`; inputs from `scripts/lamble/release/holder-inputs.ts` | methods tests; holder-path test (provider candles, FIFO sales with unknown cost) | implemented+tested; no coin can reach stage 1 until a source with complete wallet-resolved trade history exists |
| M3 | Forward-evaluation harness | `src/lib/lamble/methods/evaluation.ts` | methods test | implemented+tested; 0 signals, so no performance claim |
| M4 | Weekly editions: ISO weeks end-exclusive, three historical modes, flows vs stocks, dedup, comparable basket, revisions; holder and bottoming changes where measurable | `src/lib/lamble/methods/weekly.ts` (weekly-v1.2.1: prices at or before each boundary), `scripts/lamble/weekly.ts` (`weekSignals`) | methods tests (boundaries, as-known-then, dedup, comparable basket) | implemented+tested |

## Batch 4 — releases and service layer

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| R1 | Immutable, content-addressed releases; atomic publication; checksum-verified reads | `scripts/lamble/release/*`, `src/lib/lamble/service.ts` | `tests/lamble/release.test.ts` (tamper, rollback) | implemented+tested |
| R2 | One read path for website and API; no provider calls when serving or building | `src/lib/lamble/service.ts` | api test A11: fetch stubbed, import scan of pages, components, API, site, research and service | implemented+tested |
| R3 | Change events on one global cursor, including corrections, editions and research | `src/lib/lamble/release/changes.ts`, `scripts/lamble/release/publish.ts` (`appendChangeEvents`), `data/changes/events.json` | release tests (F3) | implemented+tested |
| R4 | Latest complete edition plus comparison week | `data/editions/2026-W42` r2, `2026-W41` r2 (reconstructed), weekly-v1.2.1; r1 of each kept | regenerated 2026-10-20; r2 corrects post-boundary prices (see review findings) | implemented |

## Batch 5 — public website

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| W1 | Routes `/`, `/coins`, `/coins/[chain]/[address]`, `/narratives(/[slug])`, `/market(/[week])`, `/launchpads(/[slug])`, `/research(/[slug])`, `/methodology`, `/sources`, `/api` | `src/app/**` | `next build`: 210 pages; Playwright at 1440 and 390 px: all 200, no horizontal overflow, no page errors | implemented |
| W2 | Coin page: identity, market with per-value as-of, charts with gaps, changes, holder table, bottoming test, memberships, peers, provider panels, research, evidence, agent retrieval | `src/app/coins/[chain]/[address]/page.tsx` | screenshots | implemented |
| W3 | Unknown coin: not-covered page with request text; malformed chain/address: 404 | same file (`NotCovered`), `src/app/not-found.tsx` | `/coins/solana/So111…112` 200 not-covered; `/coins/notachain/xyz` 404 | implemented |
| W4 | Bidirectional links coin ↔ narrative ↔ launchpad ↔ week ↔ article | all pages; `editionsFor` in `src/lib/lamble/service.ts` (F4) | build, e2e, screenshots | implemented (coin→launchpad, coin/launchpad→edition were missing before 2026-10-20) |
| W5 | Frames setup and copyable prompts without invented deep links, listings or status | `src/app/api/page.tsx`, `src/components/research/agent-access.tsx`; `NEXT_PUBLIC_FRAMES_MCP_URL` unset → "use the connection details in your Frames account"; `NEXT_PUBLIC_LAMBLE_FRAMES_LISTING` unset → "not yet listed" | manual | implemented |
| W6 | Metadata, canonical URLs, sitemap, robots, RSS and Atom, share cards from release data | `generateMetadata` per route, `src/app/sitemap.ts`, `robots.ts`, `research/feed.xml`, `research/atom.xml`, `opengraph-image.tsx` (home, coin, narrative, edition) | build | implemented |
| W7 | No paid data in pages, hydration payloads or static artifacts | pages read `public.json` only; `loadBundles` is called only by the paid API path | grep: no page imports `loadBundles` | implemented |
| W8 | Accessible, responsive, explicit states | skip link, landmarks, `aria-current`, labelled filters, chart text summaries, states as text not colour | 390 px screenshots | implemented |
| W9 | Local watchlist (no account) | `src/components/research/client.tsx` (`localStorage`, this browser only) | manual | implemented |
| W10 | Replace launch-only homepage and placeholder agent onboarding; launch stays secondary | `src/app/page.tsx`, `src/components/hero/research-hero.tsx`; removed the placeholder prompt, mock ticker and fixture provider | — | implemented |
| W11 | Article pipeline with attribution and review policy; ≥1 weekly, coin and narrative article | `src/lib/lamble/research/*`, `scripts/lamble/research.ts`, `content/research/` (daily, weekly 2026-W42, coin SI, narrative Super Intelligence) | template text from release values; every block cited; deep dives `pending-review`, hidden when `VERCEL_ENV=production`; see O1 | implemented+tested |

Defects found while building Batch 5 and fixed at the source: negative `secondsSinceLow` for sample-based episodes (bottoming-v1.0.1); trend reported for narratives no longer collected (now `not_collected`, release builder 1.1.0); week-over-week change reported on a 1-of-17 comparable basket (weekly-v1.1.0, editions revised to r2); fractional `return7d` rendered as percent; `Intl` compact currency differing between Node and Chromium ICU (hydration mismatch) replaced by a deterministic formatter.

## Batch 6 — research API and payments

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| A1 | `/api/v1` resources: coins, coin, coin bundle and history, narratives, `market/weeks` (moved from `/api/v1/weeks` on 2026-10-20), launchpads, research, changes, index, health | `src/app/api/v1/**` (thin), `src/lib/lamble/api/routes.ts` (bodies), `resources.ts` | `tests/lamble/api.test.ts` (12); HTTP smoke against `next start`: free routes 200, rights-blocked bundles 403, sellable bundles 503 without payment config | implemented+tested |
| A2 | OpenAPI, schemas, example responses, agent docs | `/api/v1/openapi.json` (`openapi.ts` schemas for every free response; `examples.ts` builds examples from the published release; paid routes get refusal examples only), `/llms.txt`, `/api` page | api tests: Ajv validates every example and every live free response (all coins' chains, every narrative, week and article) against the schemas | implemented+tested |
| A3 | Free discovery shows identity, coverage, availability, schema, price; no market values | `coinDiscovery`, `narrativeDiscovery`, `weekDiscovery`, `articleDiscovery` | api test asserts no market value appears in coin discovery | implemented+tested |
| A4 | Envelope with schemaVersion, release (id, dataCutoff, methodVersions), generatedAt, dataThrough and interval | `src/lib/lamble/api/http.ts` (`releaseMeta`, `editionMeta`, article meta) | api tests (F2) | implemented+tested |
| A5 | Unknown rights block paid exports | `src/lib/lamble/api/rights.ts`: per-section sources; unsellable bundles answer 403 with no offer; withheld sections marked, never dropped | api tests (403 creates no offer and no settlement; flipping rights opens sections) | implemented+tested; **blocked (owner)**: Codex and DefiLlama terms review — until then coin, history, week and launchpads bundles are not for sale |
| A6 | x402 and MPP adapters around one entitlement layer: offers pinned to a release, single-use payment keys, verify before settle, no client tx hashes, capability re-download, lost-response replay, uncertain settlement, append-only audit | `src/lib/lamble/payments/**`, `docs/runbooks/payments.md` | `tests/lamble/payments.test.ts` (18), plus api test: full offline x402 purchase through the real route (one settlement, capability re-download, capability refused for another narrative) | implemented+tested offline; **not live-verified** (no facilitator, chain, wallet or budget) |
| A7 | Config-driven test prices | `docs/data/pricing.json` (status test, approved false); pages read prices through the payment layer's loader | pricing parse tests | implemented+tested |
| A8 | Bazaar discovery metadata on x402 challenges | `X402Adapter.paymentRequiredHeader` (declare + enrich via the registered Bazaar extension) | api test decodes PAYMENT-REQUIRED: GET, route template `/api/v1/narratives/:slug/bundle` | implemented+tested; listing **unverified** |
| A9 | Frames seller onboarding inspected; no invented listing | `docs/runbooks/frames-listing.md`; free search 2026-10-19 (`srch_893f6f0d-…`): no LAMBLE tool; pages say "not yet listed" unless `NEXT_PUBLIC_LAMBLE_FRAMES_LISTING=listed` | free search evidence | implemented; listing **blocked (external)** |
| A10 | One live acceptance if credentials, registration, deployment and budget permit | not run: no pay-to address, facilitator credentials, MPP recipient or secret, funded wallet, purchase budget, public deployment, or durable commerce storage | runbook §9 lists the prerequisites | **blocked (external)** |
| A11 | No paid calls in page views, builds or bundle retrieval | serving reads release files; api test stubs `fetch` and scans `src/app`, `src/components`, API, site, research and the service for collection imports and `fetch(` | api test | implemented+tested |

## Batch 7 — articles, collection, delivery, operations

| ID | Requirement | Where | Tests / evidence | Status |
|---|---|---|---|---|
| O1 | Daily facts, weekly State of the Trenches, coin and narrative deep dives; ≥1 of each required format published to local/preview | `src/lib/lamble/research/generate.ts` (templates 1.1.0), `validate.ts` (publishing gate), `scripts/lamble/research.ts`, `content/research/` (4 articles), `content/research-selection.json` | `tests/lamble/research.test.ts` (10) (F7) | implemented+tested; deep dives are still template text, not analysis a person wrote |
| O2 | Attribution and review policy without invented bylines or approvals | `docs/runbooks/editorial-policy.md`; article `attribution` and `review` fields | research tests | implemented+tested |
| O3 | Programmatic, budget-guarded Frames collection replacing transcript scraping, within catalog limits | `src/lib/lamble/frames/{mcp,collect}.ts`, `npm run lamble -- collect`; ledger `data/collect/ledger.json` | `tests/lamble/collect.test.ts` (9) against a fake MCP server (F9) | implemented+tested; **not live-verified**: Frames MCP endpoint URL and auth scheme for headless use not known in this work |
| O4 | Local watchlists and cursor changes API | `src/components/research/client.tsx`; `/api/v1/changes` | api tests | implemented+tested |
| O5 | Pluggable webhook / Telegram delivery, not activated | `src/lib/lamble/notify/{deliver,verify}.ts`, `npm run lamble -- deliver [verify|confirm]`, `docs/data/notifications.json` (`enabled: false`, no destinations) | `tests/lamble/notify.test.ts` (8) (F10) | implemented+tested; not activated (no destination, no bot) |
| O6 | Jobs, locks, checkpoints, observability | `docs/data/jobs.json`, `scripts/lamble/lock.ts` (sync and async), `npm run lamble -- status` | release tests (rollback), collect tests | implemented |
| O7 | Deployment and scheduler configuration prepared, not activated | `docs/runbooks/operations.md`, `docs/ops/Dockerfile` (template, not built), `docs/ops/github-actions/lamble-offline-refresh.yml` (template, not installed) | — | implemented (untested templates) |
| O8 | Runbooks | operations, provider onboarding, editorial policy, payments, Frames listing | — | implemented |
| O9 | Documentation drift D1–D9 corrected | README, `src/lib/data/snapshots/README.md`, `docs/prompts/refresh-market-data.md` (cost 805–978 credits/run measured 2026-10-12..19; six-narrative cap and paused collection; collector; publish step) | — | implemented |

## Batch 8 — QA

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| Q1 | Type checks, lint, all tests, production build, diff check | [qa/checks.txt](qa/checks.txt): tsc 0, lint 0, 111/111 tests, build 221 pages, 9/9 browser tests, `git diff --check` clean | tested |
| Q2 | The 20 required cases | [qa/README.md](qa/README.md) maps each case to its test | tested |
| Q3 | Rendered pages inspected, screenshots retained | [qa/screenshots](qa/screenshots) (desktop 1440 and mobile 390; `next start` of the production build); 9/9 browser tests | tested |
| Q4 | Clean environment | full and shallow (`--depth 1`) clones: `npm run data:setup` rebuilt the identical release `rel-20261019T055754Z-bda72390`, editions and articles with a clean `git status` | tested |
| Q5 | Observability | `npm run lamble -- status`: freshness (exit 1 when older than 36 h), coverage, billed credits per run, reservations, publish failures, delivery state, seller receipts | implemented |

## Follow-up 2026-10-20 — rename and audit gaps 1–11

| ID | Gap | Implementation | Tests / evidence | Status |
|---|---|---|---|---|
| F1 | Holder and bottoming data path | migration `0002_holder_inputs` (token_events, trade_coverage, holder_panels, balance_checkpoints, candles, address_labels); `ingest.ts writeOutput`; `methods/inputs.ts` (coverage spans, provider daily candles, flows, FIFO sales); `release/holder-inputs.ts`; `holders.ts` computes components 1, 2, 4–7; `docs/data/address-labels.json` | `holder-path.test.ts`: SYNTHETIC adapter output → store → inputs → concentration, whale accumulation and dip absorption populated; all-holder measures refuse a top-holder sample; coverage below threshold refuses; FIFO splits unknown cost | implemented+tested; x4o2 routes enabled 2026-10-20 and the sample bodies load through ingest into candles, panels, trades and coverage. **Not yet live in a release**: no daily run has collected panels. Pump's holders route is `pump_users`, so concentration, whale accumulation and the persistence components still have no valid panel |
| F2 | API path and envelope | `/api/v1/market/weeks[/{week}[/dataset]]`; `generatedAt`, `dataThrough`, `interval` on every response; OpenAPI schemas and examples | api test validates with Ajv | implemented+tested |
| F3 | Research, edition and correction events | `correctionChanges` (restated windows per coin/launchpad plus a release summary), `edition.published/revised`, `research.published/updated`; hidden articles never announced | release tests | implemented+tested |
| F4 | Two-way links | coin origin → launchpad; coin and launchpad → editions that include them | build, e2e | implemented |
| F5 | Homepage and daily view | homepage "What changed" (`latestChanges`); `/market` daily view with the daily note link | screenshots `home-changes-desktop`, `market-daily-desktop` | implemented |
| F6 | Edition sections | entrants/exits/continuing, concentration and breadth per narrative, stories with evidence, holder and bottoming changes | screenshot `edition-sections-desktop` | implemented |
| F7 | Articles | chart blocks equal to the cited release value; "What cuts against this" in every format; publishing gate (`validate.ts`); one coin and one narrative deep dive per ISO week, pinned once written; richer deep dives (peers, membership history, editions, origin venues) | research tests (gate rejects a doctored chart and an unresolvable citation) | implemented+tested |
| F8 | Narrative market context | members' price, market cap and liquidity; narrative market cap, liquidity and median return as a cross-section | build, screenshots | implemented |
| F9 | Operations | `providers health --run` (free tools only, drift report); collector enforces `maxCallsPerRun`, `maxUsdPerBatch`, refuses unregistered/discovered/blocked tools, paces batches; `src/app/error.tsx` | `health.test.ts` (fake MCP server); collect tests incl. every retained plan within the caps | implemented+tested; health run **not live-verified** (no headless MCP endpoint); caps for x.search and codex.token-snapshot raised to measured maxima |
| F10 | Destination verification | webhook signed challenge echo; Telegram one-time code (hash only, 30-minute expiry, 5 attempts); eligibility requires the verified target plus consent | notify tests | implemented+tested; not activated |
| F11 | Reproducible availability | `store/availability.ts`, `data/run-availability.json` | availability tests; full and shallow clones reproduce the release | implemented+tested |

## Live verification and spending in this work

- Frames: free calls through 2026-10-20's audit follow-up; then **143 credits** for the owner-approved Pump/FOMO
  sample (limit 500): runs `run_be6f161263a7432bba091f2df987820a` (50), `run_b0881123277949cb85cb25ec9c55dd15` (37),
  `run_f97bef59ca6543a28858c67b20a80141` (56). Balance afterwards 56,034 credits.
- Payments: **no live payment.** Offline tests only.
- Schedules active: the external daily Claude Code routine (not installed by this repository). Configured but
  not active: weekly aggregation template, notification delivery (disabled). The x4o2 panels are a step of the
  daily routine (ceiling 5,000 credits per run) but run only once this branch is merged, since the routine branches
  from the default branch.

## Pump and FOMO enabled (2026-10-20)

Owner approvals on 2026-10-20: up to 500 credits for a one-off sample, and up to 5,000 credits per daily run
(`jobs.json` `dailyCreditCeiling`, about 1,200 for the existing refresh and at most 3,800 for the panels). Only
the sample has been spent.

| ID | Item | Where | Evidence | Status |
|---|---|---|---|---|
| X1 | One retained response per route | `research/lamble/samples/x4o2-20261020/` (three full Frames run bodies and requests; one file per route under `routes/`) | 16 routes; 13 delivered. Refunded at no charge: `fomo.candles` and `fomo.lists` (Frames' cross-check called the timestamps "in the future"; the latest bucket was the hour in progress), `fomo.developers` (empty list). `pump.holders` rejected `limit: 100` (50 works) | live-verified |
| X2 | Field maps and enabling | `docs/data/providers.json`: `pump.coin`, `pump.trades`, `pump.candles`, `pump.holders`, `fomo.token`, `fomo.holders`, `fomo.candles`, `fomo.activity` validated and enabled, each map `verifiedAgainst` its retained body; adapters read `{raw, decimals}` amounts, numeric network ids, `swap_buy`/`swap_sell`, FOMO's EVM wallet field, Pump's `final` flag, and drop intervals that had not ended at the run time | `x4o2.test.ts` (3): every enabled route normalizes its retained body in production mode, with spot values (holder count 3,890; trade amount 15,383.767354; open day and open hour dropped) | implemented+tested |
| X3 | Pump's holders population | new population `pump_users` (catalog, schema, method description, store migration `0003_pump_users_population`) | PIERRE: 526 positions listed vs 3,890 holders on the coin route; top-10 share 10.6% in the list vs 25.2% reported | implemented+tested. Consequence: no x4o2 route supplies a top-holder or all-holder panel, so concentration, whale accumulation and the persistence components stay unavailable |
| X4 | Daily plan within the ceilings | `plan.py panels` (whole coins, constituents first, then the prior run's coins by market cap; ceiling lowered by what the run's other requests reserve; refuses to re-plan once a panel batch was called); `catalog.py billed_usd` (price × 1.15 + $0.005); `collect.ts` `runCeilingUsd`; `normalize.py` counts `p` batches | planner tests (2); collector test "a run never reserves more than its daily ceiling across batches"; on 2026-10-19's batches: 1,130 credits reserved + 615 panel calls for 3,782 = 4,912 | implemented+tested; **not run daily yet** |
| X5 | End-to-end load | ingest of a scratch run stamped 2026-10-20T01:30Z (a copy of 2026-10-19 plus the sample bodies as `p` batches) | 72 closed candles (Pump: 2 daily, PIERRE being two days old, and 33 hourly; FOMO: 33 hourly and 4 of 12h), 3 `fomo_users` and 2 `pump_users` panels, 220 trade events, Pump tape coverage 3,575 s, 4 reported holder counts and top-10 shares; only the 10 unmapped exploration calls were skipped | tested manually (scratch store, not committed) |

What the panels can and cannot change once collected daily:

- **Bottoming.** Every coin in the current release runs on point samples (`priceBasis: "samples"`), constituents
  included: `codexBars.ohlcEnabled` has been on since batch 1, but every retained run was planned by the default
  branch's `plan.py`, which asks Codex for `{t volume}` only. After the merge, Codex OHLC (no extra calls) gives
  the constituents daily candles; Pump's 30 daily candles cover pump.fun coins without Codex candles; FOMO 12h
  candles become days only when both halves are complete.
- **Dip absorption** needs 80% tape coverage per interval. Pump's tape is the latest 100 trades, minutes for an
  active coin, so it rarely qualifies; quiet coins may.
- **Holder components** that need the largest positions or all holders stay unavailable (X3). Holder counts and
  top-10 shares are stored as source-reported observations.

External prerequisites: the branch must be merged before the routine collects panels; the routine's own prompt
must carry the 5,000-credit budget; 5,000 credits a day is about 150,000 a month, above the plan's 90,000 monthly
grant, so the account needs purchased credits (balance 56,034 after the sample).

## Review findings fixed (PR #28, 2026-10-20)

Codex reviewed commit `5e86730` and raised nine findings. Each was traced in the code; all nine were real. Seven had no
effect on the retained data (latent); two were live: weekly returns used prices sampled after the week boundary, and a
paid article credential could receive a newer article under an older release's name (payments are not live).

| Finding | Fix | Test |
|---|---|---|
| A run that failed validation still wrote narratives, curation, fee policy and venues | `ingest.ts`: a daily run must pass; it is recorded but contributes nothing otherwise | release test: failed run contributes no rows |
| Change events of an interrupted publication were served and duplicated on retry | `committedEvents` (feed, publish, append): only releases up to the published pointer count | release test: interrupted then retried publication |
| Prune cleared earlier tombstones | `removed` follows the directory | release test: two prunes |
| A provider row missing from the latest run kept publishing stale counts | `indexedRowsCurrent`: every component from the latest activity anchor | release test |
| Index history summed revisions | latest revision per row and time at the cutoff | release test on a temporary store |
| Paid article served for any pinned release | served only for the article's own release; otherwise 410 `resource_gone` | api test: stale credential gets 410 |
| Edition citations in paid article bundles returned only a link | resolved from the cited revision (only reachable once redistribution rights permit cited values) | api test with permitted rights |
| Weekly prices could come from after the boundary | `lastAtOrBefore`, tolerance one sampling day (24 h); W41 and W42 corrected as r2 (22 and 19 returns changed, 10 and 2 now unknown) | methods test |
| An empty fee policy produced a complete edition with fees 0 | empty selection: subtotal unknown, fee check fails | methods test |

## Documentation drift found

| ID | Drift | Resolution |
|---|---|---|
| D1 | README: "No recurring refresh or paid background job is installed" vs refresh prompt: "A scheduled Claude Code routine runs the scripted path below once a day" vs git history (daily "Daily refresh" PRs 2026-10-02..19, none 2026-10-14) | An external Claude Code routine is active; nothing in the repository installs a schedule. `jobs.json` labels it `active-external`; README and operations runbook corrected (Batch 7). |
| D2 | Registry `automaticRefresh: false` | Means "nothing in-repo"; documented in jobs.json policy. |
| D3 | `src/lib/data/snapshots/README.md` names runs 20260928T154336Z / 20261002T003446Z as current | Actual imported run is 20261019T055754Z; README corrected (Batch 7). |
| D4 | Refresh prompt §5 "currently only two narratives are supported … first three array entries drive the landing selection" | Six-narrative cap; prompt corrected (Batch 7). |
| D5 | Refresh prompt "Daily call envelope … 42 calls" | Measured 2026-10-12..19: 88–100 calls, 805–978 credits per run; prompt corrected (Batch 7). |
| D6 | Tool IDs and search IDs hardcoded in plan.py, discover.py, normalize.py | Moved to the catalog (P4). |
| D7 | `save.py` scrapes local Claude transcripts as the only result-capture path | Programmatic collector `npm run lamble -- collect` (O3); save.py kept for interactive sessions. |
| D8 | README "Two evidence-backed narratives cover nine identified coins" | README rewritten (Batch 7). |
| D9 | All 15 historical narrative "retirements" (2026-10-02..19) closed 95 memberships only to fit the six-narrative cap | Reinterpreted as collection paused (Batch 2); normalize.py `pausedNarratives` and the refresh prompt separate featured placement from lifecycle (Batch 7). |
