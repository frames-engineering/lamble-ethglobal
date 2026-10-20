# LAMBLE — trenches research, powered by Frames

LAMBLE publishes research on the crypto trenches: coin pages with holder analysis and a bottoming test,
narratives with their full membership and lifecycle history, launchpad economics, and a weekly State of the
Trenches edition. People read it on the website; agents read the same research through a structured API,
with fixed-price bundles paid per request (x402 or MPP). There are no reader accounts or subscriptions.
Data is acquired through [Frames](https://frames.ag); the launch bot remains available as a secondary link.

Status, requirement by requirement, with tests and evidence: [docs/implementation/lamble-trenches-status.md](docs/implementation/lamble-trenches-status.md).

## How it fits together

```
Frames (paid reads, budget-guarded)        scripts/frames-refresh (plan, discover, normalize)
        │                                   scripts/lamble collect (programmatic) or an agent session
        ▼
research/lamble/<run>/  ── retained raw responses, requests, evidence, normalized outputs (per daily run)
        │  npm run lamble -- ingest
        ▼
data/lamble.sqlite       ── observation store: tokens, pools, observations (with availability time and
        │                  revisions), memberships, lifecycle, evidence (gitignored, rebuilt from runs)
        │  npm run lamble -- release / weekly / research
        ▼
data/releases/<id>/     ── immutable, content-addressed release: public.json (website), bundles.json.gz
data/editions/<week>/   ── weekly editions, revised (r2, r3…) never edited
data/changes/           ── one change feed: release diffs, corrections, editions, research
content/research/       ── articles generated from a release; every citation and chart checked before writing
        │
        ├── website (src/app)   reads public.json only
        └── /api/v1             free discovery + paid bundles (rights-gated, x402/MPP)
```

Serving a page or an API request never calls a provider. Builds read committed release files.

## Commands

```bash
npm run dev                 # http://localhost:3000
npm run build && npm start
npm run lint
npm run typecheck
npm test                    # unit and integration tests (offline)
npm run data:setup          # rebuild the store and outputs from retained runs (offline, never spends)

npm run lamble -- providers validate|matrix|inspect|health [--plan|--run]   # catalog; health --run: free probes
npm run lamble -- ingest | release | weekly | research | refresh | status
npm run lamble -- collect research/lamble/<run> <batch…> [--dry-run]   # paid Frames reads, budget + catalog limits
npm run lamble -- deliver [--dry-run]                                  # change notifications (disabled)
npm run lamble -- deliver verify <id> | confirm <id> <code>           # verify a webhook or Telegram destination
```

Node 22.13 or later (built-in `node:sqlite`, `--experimental-strip-types`).

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, feeds and payment resource URLs | `http://localhost:3000` |
| `NEXT_PUBLIC_FRAMES_URL` | Link target for "Powered by Frames" | `https://frames.ag` |
| `NEXT_PUBLIC_FRAMES_MCP_URL` | Frames MCP URL shown in agent setup | unset: readers are told to use their Frames account |
| `NEXT_PUBLIC_LAMBLE_FRAMES_LISTING` | `listed` only after the API is found in Frames search | unset: pages say "not yet listed" |
| `NEXT_PUBLIC_LAMBLE_COVERAGE_REQUEST_URL` | Intake for coverage requests | unset: copyable request text only |
| `LAMBLE_X402_*`, `LAMBLE_MPP_*`, `MPP_SECRET_KEY` | Payment protocols | disabled — see [docs/runbooks/payments.md](docs/runbooks/payments.md) |
| `LAMBLE_COMMERCE_DB_PATH` | Commerce database (purchases, entitlements) | `data/commerce.sqlite` |
| `LAMBLE_FRAMES_BUDGET_ID`, `LAMBLE_FRAMES_BUDGET_USD` | Owner-approved budget for `collect` | unset: no paid call |
| `FRAMES_MCP_URL`, `FRAMES_MCP_AUTHORIZATION` | Frames MCP endpoint for `collect` and `providers health --run` | unset |
| `LAMBLE_DELIVERY_ENABLED` | Allow `deliver` to send | unset |
| `LAMBLE_HIDE_PENDING_REVIEW` | Hide unreviewed deep dives outside Vercel production | unset |

## Documentation

- Methods: [docs/methods](docs/methods) (the files the code reads; rendered at `/methodology`)
- Provider catalog: [docs/data/providers.json](docs/data/providers.json), jobs and budgets: [docs/data/jobs.json](docs/data/jobs.json)
- Runbooks: [operations](docs/runbooks/operations.md), [provider onboarding](docs/runbooks/provider-onboarding.md),
  [editorial policy](docs/runbooks/editorial-policy.md), [payments](docs/runbooks/payments.md),
  [Frames listing](docs/runbooks/frames-listing.md)
- Daily acquisition routine: [docs/prompts/refresh-market-data.md](docs/prompts/refresh-market-data.md)

## Stack

Next.js 16 (App Router), React 19, TypeScript strict; Tailwind v4 bridged to the design tokens in
`src/styles/tokens.css` (dark default); shadcn (Base UI) primitives in `src/components/ui`;
`lightweight-charts` and inline SVG sparklines; `@x402/*` and `mppx` for payments; `node:sqlite` stores.

```
src/app                  pages, /api/v1 route handlers, feeds, sitemap, share images
src/components/research  research UI kit (measures with states, panels, evidence, charts, agent access)
src/components/launchpads  screener table and detail sheet
src/lib/lamble            core (identity, time, measures), catalog, adapters, methods, release types,
                         service (the one read path), api, payments, research, notify, frames
scripts/lamble            CLI: providers, ingest, release, weekly, research, collect, deliver, status
scripts/frames-refresh   daily acquisition planning and normalization (Python)
```
