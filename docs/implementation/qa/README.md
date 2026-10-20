# QA record — 2026-10-19

Command outputs: [checks.txt](checks.txt). Screenshots (production build, `next start`, Chromium): [screenshots/](screenshots).
Pre-existing failures: none. `tests/frames-data.test.mjs` (the regression suite that existed before this work)
passes unchanged; no assertion was weakened and no test was removed.

Synthetic fixtures are used only in tests and are labelled SYNTHETIC in each file
(`tests/fixtures/synthetic/README.md`); tests that read actual research (data/, content/) are read-only.

## Required cases

| # | Case | Test |
|---|---|---|
| 1 | Same ticker, different contracts distinct; Solana case survives | `foundation.test.ts` "same ticker, different contracts…"; `api.test.ts` EVM case folding |
| 2 | Missing/stale distinct from zero; units and timestamps | `foundation.test.ts` "missing and stale…", "units and timestamp conversions…", "FOMO candle times…" |
| 3 | Pinned FOMO post not newest trade; pagination does not duplicate | `foundation.test.ts` "a pinned FOMO post…" |
| 4 | Sampled holder panels never complete coverage | `foundation.test.ts` "sampled FOMO and Pump holder panels…"; `holder-path.test.ts` (stored top-holder panels refused for all-holder measures) |
| 5 | Buy/sell/buy is not uninterrupted holding | `methods.test.ts` |
| 6 | Price doubling does not create new wallets | `methods.test.ts` |
| 7 | Transfers/rebases are not whale purchases | `methods.test.ts` |
| 8 | Inadequate acquisition cost blocks capitulation | `methods.test.ts` |
| 9 | New lower low resets; missing bars never stabilize | `methods.test.ts` (+ open-interval regression) |
| 10 | Thursday classification absent from Monday's as-known-then view | `methods.test.ts` |
| 11 | Featured removal keeps membership and history | `methods.test.ts`; `release.test.ts` change events |
| 12 | Multi-tag tokens and overlapping fees not double-counted | `methods.test.ts` |
| 13 | Weekly boundaries, partial weeks, year transition, scope changes | `methods.test.ts`, `foundation.test.ts` |
| 14 | Historical articles stay pinned; corrections explicit | `research.test.ts` "historical articles stay pinned…", weekly deep dives pinned once written; `release.test.ts` research and correction events; `api.test.ts` article offers bind to the article's release |
| 15 | Website and API agree | `api.test.ts` (bundle members = page data); `e2e/site.test.ts` (page HTML vs API JSON, same release) |
| 16 | No double charge on retries, concurrency, lost responses; replay and cache access fail | `payments.test.ts` (18); `api.test.ts` full purchase through the route |
| 17 | No paid collection in builds or ordinary retrieval | `api.test.ts` (fetch stub + import scan); `collect.test.ts` (no budget → no call) |
| 18 | Schema changes, rate limits, malformed data, failed jobs cannot publish invalid replacements | `release.test.ts` (rejected/partial release, tamper, malformed data, ingest rollback); `foundation.test.ts` (adapter refuses unverified maps); `collect.test.ts` (malformed requests, requires-approval, budget refusal) |
| 19 | Clean environment migrates, loads observations, runs | full and shallow clones in `checks.txt`: identical release, editions and articles, clean `git status` |
| 20 | Desktop/mobile flows, direct URLs, filters, chart gaps, watchlists, source links | `e2e/site.test.ts` (9) |

Also tested: payload separation (free discovery has no market values; pages never read bundles), paid
responses `private, no-store`, payment-event redaction, webhook signature verification and SSRF guard,
delivery token redaction. There is no operator HTTP endpoint (operators use the CLI), so there is no operator
authentication to test.

## Not tested here

- Any live payment, facilitator, chain or wallet (no credentials, budget or deployment).
- Headless Frames collection against the real Frames MCP endpoint (URL and auth scheme unknown); the
  collector is tested against a fake MCP server.
- `docs/ops/Dockerfile` and the scheduler template (not built or installed).
