# Operations runbook

What runs, when, what it costs, and what to do when it fails. Jobs, cadence, scope and budgets are declared
in [`docs/data/jobs.json`](../data/jobs.json); this page explains how to operate them.

## Jobs

| Job | How it runs today | Cost | Command |
|---|---|---|---|
| Daily acquisition | **Active, external**: a scheduled Claude Code routine follows [`docs/prompts/refresh-market-data.md`](../prompts/refresh-market-data.md) once a day; its own prompt states its budget and whether it may commit or merge. Nothing in this repository installs a schedule. The routine branches from the default branch, so changes here reach it only once merged. | 805–978 credits per run (2026-10-12..19); owner-approved ceiling 5,000 credits per run including the panels (2026-10-20, `jobs.json` `dailyCreditCeiling`) | agent session, or `npm run lamble -- collect` with a budget |
| Release, weekly editions, articles | Offline; run after each acquisition (step 5b of the routine) | free | `npm run lamble -- refresh` |
| Weekly aggregation | Covered by `refresh` (it freezes a week once its checks pass, usually Monday after the daily run). A standalone Monday schedule is **configured, not active** (`jobs.json` cron `30 7 * * 1`; template below). | free | `npm run lamble -- weekly` |
| x4o2 Pump/FOMO panels | **Configured, part of the daily routine (step 3b) once this branch is merged.** 8 routes enabled 2026-10-20 with field maps verified against retained responses (`research/lamble/samples/x4o2-20261020/`); the other sampled routes stay candidates. `plan.py panels` fills whole coins, constituents first, up to the job's 3,800 credits and never past the run's 5,000-credit ceiling; the collector refuses a batch that would reserve more. | ≤3,800 credits per run (615 calls planned on 2026-10-19's batches: 3,782) | `python3 scripts/frames-refresh/plan.py $RUN panels`, then `npm run lamble -- collect $RUN p1 …` |
| Provider health | Manual, free calls only. `--run` executes `frames_probe_tools` and `frames_get_tool` through `FRAMES_MCP_URL` (the runner refuses any other tool) and writes `data/provider-health/<date>.json` with liveness, quotes and drift; exit 1 when anything drifted. Without the endpoint, `--plan` prints the list for an agent session. | free | `npm run lamble -- providers health --run` |
| Notification delivery | **Disabled**: no destinations, `notifications.json` `enabled: false`. A destination is eligible only after `deliver verify` (webhook: signed challenge echoed; Telegram: one-time code sent to the chat, then `deliver confirm <id> <code>`), with operator-recorded consent. | free | `npm run lamble -- deliver` |

The collector refuses, before any call, a batch that names a tool without a registered capability, a discovered,
blocked or deprecated capability, more calls in the run than a capability's `cost.maxCallsPerRun`, or a
`max_usd` above the sum of its capabilities' `cost.maxUsdPerBatch`; batches are invoked at least 2 s apart.
`x.search` (30) and `codex.token-snapshot` (4) caps were raised on 2026-10-20 to the measured maxima of the
retained daily plans (28 and 3); a test keeps every retained plan within the caps.

Writers take a lock per writer group (`data/locks/<group>.lock`, stale after 30 minutes), so a release and a
weekly build never write at the same time. `npm run lamble -- status` shows the published release, the latest
ingested run, editions and lock state.

## Publishing and rollback

- A release is published by swapping `data/releases/published.json` after its files are written and validated
  (checksums, measure states, fee and narrative-volume reconciliation with the run's normalizer, evidence
  resolution, no credential-like text). A rejected release changes nothing.
- Rollback: point `published.json` at an earlier retained release (`data/releases/index.json` lists them;
  pinned releases are never pruned) and redeploy. Never edit a release directory; publish a correction instead.
- Weekly editions are never edited: `npm run lamble -- weekly --revise` writes r+1 with the reasons;
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
npm start`) with a volume mounted for the commerce database (`LAMBLE_COMMERCE_DB_PATH`), or replace the store
with a shared database before scaling out. A serverless filesystem would lose purchases. Prerequisites and
acceptance steps: [payments runbook](payments.md) §9. Back the commerce database up as financial records.

Templates (not activated, not built or run in this work):
[`docs/ops/Dockerfile`](../ops/Dockerfile) for topology B and
[`docs/ops/github-actions/lamble-offline-refresh.yml`](../ops/github-actions/lamble-offline-refresh.yml) for a
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
| `LockBusyError` | `npm run lamble -- status` | wait; a crashed holder is taken over after 30 minutes |
| `collect: refused` | budget id/amount, remaining budget, request `max_usd`, the catalog limit named in the output | get an approved budget; never raise `max_usd` or a catalog cap to fit without evidence |
| `research: rejected` | the citation or chart named in the output | an article whose citation does not resolve or whose chart differs from the release is not written; fix the generator |
| `deliver verify` fails | the endpoint's response | a webhook must answer 200 with `{"challenge": <the value sent>}`; a plain 200 is not a verification |
| `collect: requires_approval` | the Frames run | approve or cancel it in Frames, then rerun the same batch (same idempotency key) |
| Paid route 500 `release_not_pinned` | route code | a route passed "latest"; see payments runbook §2 |
| Purchases in `uncertain` | `listNeedingReconciliation` | payments runbook §7 |
