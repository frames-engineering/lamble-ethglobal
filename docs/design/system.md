# LAMBLE design system (from the November 2026 overhaul)

How pages are built after the overhaul (decision record: [overhaul-2026-11.md](overhaul-2026-11.md)). Tokens
live in `src/styles/tokens.css` and are bridged to Tailwind in `src/app/globals.css`; use the Tailwind names
below and never raw hex, new CSS variables, or per-component `dark:` color overrides.

## Rule zero: every component is there on purpose

A component earns its place by answering a question a LAMBLE reader has. Don't add pills, tabs, chips, stat
tiles or cards to fill space or because a reference site has them. Hide noise (internal identifiers, process
logs) unless the page exists to show it, and keep caveats that qualify a figure next to that figure.

## Shell (already in the root layout)

Sidebar (desktop), phone bar with a drawer, a top bar with breadcrumbs and the data cutoff, and the shared
minimal footer. The overview renders its own footer with the lambo. Pages render only their content.

## Page anatomy

```tsx
<Container>                                  // components/layout/container: 1120px column
  <PageHeader eyebrow title description meta actions />   // Geist Pixel title; 1–3 line lede; meta = dates, ids
  <dl className="grid grid-cols-2 border-t border-l border-line md:grid-cols-4">…</dl>  // optional key figures
  <Section id title description aside={<MoreLink …/>}>  // 20px h2, one line on what it shows
    <Panel>…chart / table / list…</Panel>    // hairline card; small title only if the Section has several
  </Section>
</Container>
```

- **PageHeader** (`research/panel`): the only place Geist Pixel (`font-display`) appears. A long summary belongs in a Section's
  body, not in the lede.
- **Section**: page-level blocks, `pt-12` apart. One onward link at most, in `aside`.
- **Panel**: a bordered card (`rounded-sm border border-line`, no fill, no shadow). Don't nest Panels.
- **Key-figure grid**: cells `border-r border-b border-line p-4 md:p-5`, figure `font-mono text-2xl`, label
  `text-sm text-med`, an optional `text-xs` sub-line. Use for a page's three or four headline numbers.
- **Filled cards** (`rounded-lg bg-card p-5 hover:bg-surface-3`) only for link grids such as research.

## Type

| Role | Classes |
| --- | --- |
| Page title | `PageHeader` (font-display, 36/48px) |
| Section heading | `text-xl font-medium` |
| Panel heading | `text-base font-medium` |
| Body | `text-sm` (lede `text-base text-med`) |
| Captions, labels | `text-xs text-med` |
| Uppercase eyebrow | `text-2xs font-medium tracking-[0.08em] uppercase text-med`, sparingly |
| Figures, addresses, ids | `font-mono` (MeasureValue already is) |

Headings use `font-medium`, not `font-semibold`. Numbers in columns are right-aligned.

## Color

Text `text-high` / `text-med` / `text-low`. Surfaces: `bg-background` (page), `bg-surface-1` or `bg-card`
(sidebar, filled cards), `bg-surface-3` (filled-card hover), `bg-hover` (row hover), `bg-active` (selected).
Lines: `border-line`. Meaning: `text-positive` / `text-negative` for up and down only, `text-link` for links
and "new". Charts: `bg-chart-r1…r4` (ranked parts of one whole), `bg-chart-0` (the rest of it),
`bg-chart-bar` (bars behind table values). Chart series colors, including each launchpad's fixed brand hue,
come from `research/colors.ts`; the rules are in [charts.md](charts.md).

## Charts

Follow the chart standard in [charts.md](charts.md): which form fits which data, square and gapless marks,
solid 1.5px lines, quiet mono axes, brand hues that never change, and no entrance motion. Its defaults live in
`LAMBLE_CHART` (`evilcharts/ui/echarts-chart.tsx`), so the vendored evilcharts components conform without
extra props. Time series go through `SeriesChart` (`research/charts.tsx`), and table sparklines stay inline SVG
(`charts/sparkline.tsx`), since one ECharts canvas per table row would be heavy.

## Controls

`Button` (`variant="outline"` for secondary) for actions, and `<Link className={buttonVariants(…)}>` for
navigation that should look like a button (Base UI's `nativeButton={false}` would announce a link as a button),
`Badge` (status labels), `Segmented` (`ui/segmented`, two or three views of one thing), `InfoTip`
(`ui/info-tip`, scope notes beside a figure's label), `MoreLink` (a section's onward link).

## Shapes and motion

One radius for every component: `rounded-sm` (3px, almost square), on cards, tables, key-figure grids,
buttons, inputs, badges, chips, segmented controls, tooltips and sheets. `rounded-xs` (2px) only for an item
nested in a padded 3px container (a segmented control's buttons) and for tiny logos. `rounded-full` only for
circles: status dots, avatars, token marks, the switch. tokens.css collapses `rounded-md`…`rounded-3xl` to the
same 3px so shadcn components conform, but write `rounded-sm`. Charts follow their own square standard
([charts.md](charts.md)). Rules and dividers span the content column, never the page gutters. No card shadows.

Motion: hover transitions 150ms on color/background only; `Button` presses to 0.96. Only the overview has a
first-load entrance, there to make the page feel quick: the opening blocks (title, then lede and trench
index, then actions, section tabs, key figures and the narratives) rise 8px and fade in 60ms apart with
`rise-0`…`rise-5` (`PageHeader enter` for the header), all done in under 0.7s. Below the narratives nothing
animates, and nothing animates on scroll. The trench gauge's marker sweeps from 0 to the score along its
dotted scale (700ms), the score counts up in step with it (a CSS counter), and the band label rises in as
the marker lands. It's all CSS in `globals.css`, so it runs at first paint without JavaScript, and
`prefers-reduced-motion` turns all of it off.
