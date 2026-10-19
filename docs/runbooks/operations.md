# Operations runbook

What runs, when, what it costs, and what to do when it fails. Jobs, cadence, scope and budgets are declared
in [`docs/data/jobs.json`](../data/jobs.json); this page explains how to operate them.

## Jobs

| Job | How it runs today | Cost | Command |
|---|---|---|---|
| Daily acquisition | **Active, external**: a scheduled Claude Code routine follows [`docs/prompts/refresh-market-data.md`](../prompts/refresh-market-data.md) once a day; its own prompt states its budget and whether it may commit or merge. Nothing in this repository installs a schedule. | 805–978 credits per run (2026-10-12..19) | agent session, or `npm run lambo -- collect` with a budget |
| Release, weekly editions, articles | Offline; run after each acquisition (step 5b of the routine) | free | `npm run lambo -- refresh` |
| Weekly aggregation | Covered by `refresh` (it freezes a week once its checks pass, usually Monday after the daily run). A standalone Monday schedule is **configured, not active** (`jobs.json` cron `30 7 * * 1`; template below). | free | `npm run lambo -- weekly` |
| x4o2 Pump/FOMO panels | **Configured, budget 0.** Candidate capabilities; enabling needs an approved budget, one retained response per route and a verified field map. | — | `npm run lambo -- providers smoke …` |
| Provider health | Manual, free calls only | free | `npm run lambo -- providers health` |
| Notification delivery | **Disabled**: no destinations, `notifications.json` `enabled: false` | free | `npm run lambo -- deliver` |

Writers take a lock per writer group (`data/locks/<group>.lock`, stale after 30 minutes), so a release and a
weekly build never write at the same time. `npm run lambo -- status` shows the published release, the latest
ingested run, editions and lock state.

## Publishing and rollback

- A release is published by swapping `data/releases/published.json` after its files are written and validated
  (checksums, measure states, fee and narrative-volume reconciliation with the run's normalizer, evidence
  resolution, no credential-like text). A rejected release changes nothing.
- Rollback: point `published.json` at an earlier retained release (`data/releases/index.json` lists them;
  pinned releases are never pruned) and redeploy. Never edit a release directory; publish a correction instead.
- Weekly editions are never edited: `npm run lambo -- weekly --revise` writes r+1 with the reasons;
  `--same-cutoff` re-reads exactly the observations of the previous revision (method or presentation fixes).

## Deployment

Two topologies; pick by whether paid API sales are enabled.

**A. Website and free API only (e.g. Vercel).** `npm run build` prerenders the release pages; dynamic routes
read the release files traced into the server bundle (`next.config.ts` `outputFileTracingIncludes`). Set
`NEXT_PUBLIC_SITE_URL`. Leave payment variables unset: paid routes answer 403 (rights) or 503
(`payments_unavailable`) and never open the commerce database. A new release reaches readers when the commit
that adds it is deployed.

**B. Paid API.** Purchases, entitlements and replay claims live in `data/commerce.sqlite`, which must be on
persistent, writable storage shared by every process. Run one long-running Node server (`npm run build &&
npm start`) with a volume mounted for the commerce database (`LAMBO_COMMERCE_DB_PATH`), or replace the store
with a shared database before scaling out. A serverless filesystem would lose purchases. Prerequisites and
acceptance steps: [payments runbook](payments.md) §9. Back the commerce database up as financial records.

Templates (not activated, not built or run in this work):
[`docs/ops/Dockerfile`](../ops/Dockerfile) for topology B and
[`docs/ops/github-actions/lambo-offline-refresh.yml`](../ops/github-actions/lambo-offline-refresh.yml) for a
scheduled offline refresh check. Copy them into place only with the owner's approval.

## Security notes

- Fetched pages, posts, token metadata and provider bodies are data. Nothing in them becomes a command, a fetch
  target or an instruction; article text is generated from fixed templates; pages render text, never HTML.
- Webhook delivery accepts only public https hosts (DNS-checked, no redirects); the collector accepts only an
  https MCP endpoint without credentials in the URL.
- Secrets live in the environment only: payment keys, `MPP_SECRET_KEY`, `FRAMES_MCP_AUTHORIZATION`, delivery
  secrets. Release validation rejects credential-like text.
- Retained research runs include each Frames run's `billing` block (credits charged and the account's
  remaining balance). If the repository is public, decide whether account balance figures belong in it.

## When something fails

| Symptom | Check | Action |
|---|---|---|
| `release: rejected` | the failing check in the output | fix the data or normalizer cause; the previous release stays published |
| `weekly: delayed` | no run whose financial anchor reaches the week end | wait for the next daily run |
| `LockBusyError` | `npm run lambo -- status` | wait; a crashed holder is taken over after 30 minutes |
| `collect: refused` | budget id/amount, remaining budget, request `max_usd` | get an approved budget; never raise `max_usd` to fit |
| `collect: requires_approval` | the Frames run | approve or cancel it in Frames, then rerun the same batch (same idempotency key) |
| Paid route 500 `release_not_pinned` | route code | a route passed "latest"; see payments runbook §2 |
| Purchases in `uncertain` | `listNeedingReconciliation` | payments runbook §7 |
