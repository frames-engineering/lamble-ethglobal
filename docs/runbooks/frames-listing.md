# Runbook: getting the LAMBLE API into the Frames catalog

Status 2026-10-19: **not listed.** Nothing in this repository can list the API; listing depends on a deployed
public URL, a working payment configuration and, for some directories, steps outside this repository that
have not been verified.

## Evidence

- Free catalog search, 2026-10-19 (`frames_search_tools`, search id `srch_893f6f0d-c10e-4c50-880d-247ef050a0b0`,
  0 credits), queries "LAMBLE trenches research", "lamble coin research bundle", "crypto trenches narratives
  weekly research API lamble": no LAMBLE tool among 50 candidates.
- Catalog tool ids carry the directory they were indexed from. Prefixes seen in that search and in
  `docs/data/providers.json`: `bazaar.` (x402 Bazaar), `mpp.` (MPP directory), `agentic.` and `frames.`
  (origin not documented in anything this work could read).
- Comparable listings in the same search, for the cost benchmark (seller price hints, before the Frames fee):
  a single-coin research brief at $0.02 (`bazaar.www-blockchainiq-co-api-x402-v1-research-coin`), a narrative
  tracker at $0.02 (`agentic.httpay-xyz..api-narrative-tracker`), a trending-coins list at $0.01
  (`bazaar.agents-dyoeway-org-trending`). These are hints from the catalog, not quotes, and do not establish
  demand.
- Frames bills a buyer `price × 1.15 + $0.005` per delivered call (the `frames_invoke_tools` description).

## What the code already does

- Every x402 challenge declares Bazaar discovery metadata (`extensions.bazaar`: GET, route template with path
  parameters, output schema reference) through `@x402/extensions/bazaar`
  (`src/lib/lamble/payments/x402.ts`, tested in `tests/lamble/api.test.ts`). Declaring it does not list anything.
- The OpenAPI description (`/api/v1/openapi.json`) and `/llms.txt` describe every route, price and the export
  status.
- MPP challenges carry a stable realm (`MPP_REALM`, default `lamble`) and the offer scope.

## Prerequisites, in order

1. **Rights.** Owner review of Codex and DefiLlama terms. Until `rights.redistribution` is `permitted` for
   the relevant capabilities in `docs/data/providers.json`, coin, history, week and launchpad bundles answer
   403 and are not sellable; only narrative and article bundles can be offered (with market sections withheld).
2. **A public deployment** with `NEXT_PUBLIC_SITE_URL` set to its origin (canonical URLs in challenges come
   from configuration, never from the Host header).
3. **A durable commerce database.** `data/commerce.sqlite` must live on persistent, writable storage shared
   by every server process (a single long-running Node server with a volume). A serverless filesystem loses
   purchases and replay claims; see `docs/runbooks/payments.md`.
4. **Payment configuration** (`docs/runbooks/payments.md` §4): x402 pay-to address and facilitator, and/or MPP
   recipient and `MPP_SECRET_KEY`. Mainnet stays refused until `docs/data/pricing.json` is `production` and
   approved.
5. **Directory listing** — unverified procedures, to confirm with each directory before relying on them:
   - x402 Bazaar: facilitators that support the Bazaar extension catalogue resources from the discovery
     metadata in payments they process. Whether the public testnet facilitator catalogues, and when, is not
     stated in the installed packages.
   - MPP directory: listing procedure not documented in anything read for this work.
   - Frames-native (`frames.`) and `agentic.` entries: ask Frames how sellers are onboarded.
6. **Verification.** After listing, run the same free search (queries above). Only when a LAMBLE tool id is
   returned, set `NEXT_PUBLIC_LAMBLE_FRAMES_LISTING=listed` so pages stop saying "not yet listed". Record the
   tool id and search id here.

Do not buy our own endpoint repeatedly to create usage, and do not ask Frames to change ranking.
