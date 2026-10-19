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
