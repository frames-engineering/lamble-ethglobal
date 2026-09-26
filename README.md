# LAMBLE — landing page

LAMBLE is a meta launchpad: describe the token you want to launch, get a recommendation for the launchpad where it has the best odds, and deploy there from one place. This repo is the **frontend only**. The backend (a Telegram mini app) lives elsewhere.

The landing page has three parts: a hero/about, **Current Narratives** (what people are launching right now, with a Polymarket-style featured card and chart) and a **Launchpad screener** (19 venues ranked by fees, revenue, launches, graduations, momentum and fee model).

## Stack

- Next.js 16 (App Router, `src/`), React 19, TypeScript strict
- Tailwind v4 bridged to the Backpack-derived tokens in `src/styles/tokens.css` (dark default, `data-theme="light"` for light)
- shadcn (Base UI, `base-nova`) components customized to the token system in `src/components/ui`
- `lightweight-charts` for historical charts, `liveline` for the live pulse, inline SVG sparklines in tables and tiles
- `motion` for reveals, `lucide-react` icons, `next-themes` for the theme toggle

## Scripts

```bash
npm run dev     # http://localhost:3000
npm run build
npm run start
npm run lint
```

The lockfile is `package-lock.json` because bun could not resolve packages through the sandboxed proxy the app was scaffolded in. `bun install` migrates it to `bun.lock` if you prefer bun.

## Data

The landing page uses an offline, generated Frames data snapshot through
`src/lib/data/providers/frames.ts`. Rendering and builds make no paid data calls.

- Financials use verified complete UTC-day observations and explicit fee-subtotal exclusions.
- Launch/completion observations are labelled indexed because provider coverage is beta.
- Two evidence-backed narratives cover nine identified coins, with real 24-hour and seven-day hourly volume. The volume universe is a selected pool sample, not the entire market.
- Unknown fields remain null; fixtures are not the active provider.

### Refresh the data

Ask the agent: **“Follow [the daily refresh prompt](docs/prompts/refresh-market-data.md) to refresh the landing data.”**

The prompt includes daily work, exact validated tool recipes, timing and validation
rules, known blockers, and the [source registry](docs/prompts/refresh-market-data.sources.json).
See [snapshot integration notes](src/lib/data/snapshots/README.md) for offline import
commands. No recurring refresh or paid background job is installed.

## Structure

```
src/app                 layout, page, globals.css (theme bridge), icon, OG image
src/styles/tokens.css   design tokens (source of truth: design-system/tokens.css)
src/components/ui       customized shadcn primitives
src/components/brand    wordmark, letter-mark avatars, chain marks
src/components/hero     hero, stat tiles, how it works
src/components/narratives  featured card, contenders, signals, cards, live pulse
src/components/launchpads  screener table, toolbar, columns, detail sheet
src/components/charts   lightweight-charts wrapper, liveline wrapper, sparkline
src/lib/data            types, fixtures, provider, aggregates, seeded generators
src/hooks               scroll, active section, theme colors, mock ticker
```
