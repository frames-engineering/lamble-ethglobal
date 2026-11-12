# LAMBLE chart standard

Set on 2026-11-10, after Marcelo found the charts inconsistent, "childish" (too rounded, too many gaps) and the
overview's lead volume chart hard to see behind a dashed line. Charts should read like instruments: square
marks, solid lines, quiet axes, and color that always means the same thing.

Most of this is enforced in code. `LAMBLE_CHART` in `src/components/evilcharts/ui/echarts-chart.tsx` sets the
defaults every evilcharts chart reads, so a chart built from the vendored components conforms without extra
props. Don't override those defaults per chart. Change the standard there and here, together.

## Pick the form from the data's job

| Data | Form | Component |
| --- | --- | --- |
| A flow over time: volume, fees (one series) | Area: solid line over a soft wash | `SeriesChart kind="area"` |
| A level over time: price, rolling counts, an index | Line, no fill | `SeriesChart kind="line"` |
| A flow split by entity over time: daily fees by launchpad | Stacked columns | `EChartsBarChart stackType="stacked"` |
| Each entity's share of that flow | 100% stacked columns, same colors and order | `EChartsBarChart stackType="percent"` |
| One score against its bands: the trench index | Banded arc gauge | `overview/trench-gauge` |
| A trend inside a table row | Sparkline, bare line in muted ink | `charts/sparkline` |
| A value compared down a table column | Bar behind the figure | `bg-chart-bar` span |
| Parts of one whole, ranked | One segmented bar in the ranked ramp | `bg-chart-r1…r4`, then `bg-chart-0` |

Not used: pies and donuts for shares (a segmented bar or a table reads better), radar, radial, sankey and
calendar heatmaps (LAMBLE has no data shaped for them), dual axes, glow, frosted tooltips, pattern fills and
animated dashes. Dashed strokes are reserved for projections, and LAMBLE draws none.

evilcharts (read 2026-11-10) offers area, line, bar, composed, pie, radial, radar, sankey and calendar heatmap
charts. Only area, bar and pie are vendored. A line is the area chart with `variant="none"`, so the line
component isn't needed.

## Marks

- **Corners:** square. Bars, stacked segments, gauge bands, legend and tooltip swatches, and table value bars
  all have radius 0. The tooltip card keeps `rounded-sm`. The trench gauge got no exception: its bands touch,
  and its marker rides the dotted scale inside the ring.
- **Gaps:** none inside a stack, and color parts the segments. Columns keep ECharts' default 20% category gap.
- **Lines:** 1.5px, solid, straight between points (no smoothing, which invents values between samples).
- **Area wash:** the series color fading from 16% opacity at the line to 0 at the baseline.
- **Gaps in data:** a missing point stays a gap and is never drawn as zero.
- **Motion:** none. Charts render in place, with no wipes, staggered grow-ins or re-animation on a range change.
  The one exception is the trench gauge on the overview's first load: its marker sweeps from 0 to the score
  while the number counts up with it, and the bands fade in (see Motion in [system.md](system.md)).

## Axes, tooltip, legend

- **Grid:** horizontal hairlines only, solid, in the border token. No vertical grid, no axis lines, no tick dots.
- **Axis labels:** Geist Mono 11px in muted ink. Y labels are compact (`$3.3M`). X labels: one per UTC day on
  hourly data, and one a week (counted back from the latest day) on daily data longer than two weeks. Labels
  that would still collide (a phone-width chart) are dropped (`hideOverlap`).
- **Tooltip:** a solid 1px crosshair on time charts, and a card with the period, square swatches, labels in
  muted ink and figures in mono. Figures carry one more digit than the axis (`$3.29M` against `$3.3M`).
- **Legend:** only with two or more series, with square swatches, in its own row above the canvas: right-aligned
  on one line on desktop, left-aligned and wrapping on phones, so it never covers the plot or runs off the edge.
  On stacked charts its entries are buttons (`aria-pressed`, 44px tall on touch) that single out one entity.
  Charts with a legend get a taller box on phones (`h-88 sm:h-72`) so the wrapped rows don't eat the plot. A
  single series has no legend: the panel heading names it.

## Color

Tokens live in `src/styles/tokens.css`, and `src/components/research/colors.ts` hands them to charts.

- **Hue families:** `--color-viz-{green,gold,orange,coral,pink,violet,blue,sky,teal}`, one step per theme, all
  of even visual weight. Light-theme steps are darker so they hold 3:1 on the light page.
- **Brands keep their hue on every chart.** `LAUNCHPAD_HUE` maps each launchpad to a family taken from its
  logo: pump.fun green, Flap.sh gold, LaunchLab (Raydium) blue, Meteora DBC coral, BONK.fun orange, clanker
  violet, four.meme teal, and so on. A launchpad whose logo has no color gets a fixed hue marked "assigned".
  A launchpad's own chart (its fee history) uses `launchpadColor(slug)`. Several together use
  `launchpadColors(slugs)`, which keeps each brand hue and gives a clashing smaller venue a free hue.
- **Stack order** follows `LAUNCHPAD_HUE` (`launchpadRank`): the largest venues sit at the base and keep
  their place from day to day, and "others" goes on top.
- **Not a brand:** a single series uses `SERIES.accent` (blue). Several non-brand series use `PALETTE`
  (`--color-viz-1…7`: blue, coral, violet, green, gold, sky, pink), assigned in order and never cycled. Past
  seven series, fold the rest into "others".
- **Others** is `SERIES.others` (`--color-viz-0`), a neutral gray and never a hue.
- **Up and down:** `SERIES.positive` / `SERIES.negative` only for series that mean up and down.
- **Text never wears a series color.** Labels, values and legends stay in text tokens, and the swatch
  carries identity.

Validated on 2026-11-10 with the dataviz palette checks, against `#0e0e0d` (dark) and `#fcfcfb` (light). The
fees stack (green, gold, pink, blue, coral), the generic order and the gauge bands (violet, sky, gold, coral)
pass the lightness band, the chroma floor, CVD separation between neighbors, the normal-vision floor and 3:1
contrast. Orange and teal aren't on any shared chart yet: validate them against their neighbors when they
are. Re-run the checks whenever a hue or the stack order changes.

## Sizes

- The lead chart (the overview's narrative volume): `h-56 md:h-64`.
- Section charts (the fees stack): `h-72 md:h-80`.
- Panel charts on detail pages: 220px. In a side sheet or an article: 180px.

## Accessibility

The chart is a canvas, so every chart ships its reading as text. `SeriesChart` renders its `summary` as the
caption (`hideSummary` keeps it for screen readers when the panel already shows the figures). Stacked charts
carry a visually hidden table of every value. With two or more series the legend names each one, so color
is never the only identity.

## Vendored evilcharts

The files in `src/components/evilcharts` came from the `@evilcharts` registry and carry local patches, all
marked `LAMBLE`:

- `LAMBLE_CHART` defaults: stroke width and variant, area wash, bar radius, stack gap, grid line, tick dots,
  axis font and size, tooltip roundness, legend variant, animation, `legendInFlow` (a top legend is a static
  row above the canvas instead of an overlay, and the grid drops its 42px band) and `axisHideOverlap`.
- The legend (`ui/echarts-legend.tsx`) wraps, and clickable entries are `<button>`s.
- `resolveColors` returns `fontMono`, because canvas text can't read CSS variables.
- The tooltip has square swatches, `shadow-md` and a solid 1px crosshair.
- Charts redraw on `data-theme` changes and take a `valueFormatter`, and the area chart takes `XAxis
  interval` (from the first install).
- The bar chart's `<Brush>` takes `defaultRange` (percent of the data, opening window); the chart collects its
  children before creating its live state so the brush can start there (launchpads route history charts).

When updating a chart from the registry, re-apply these patches. Add a new chart type with
`npx shadcn add @evilcharts/<name>` and point its defaults at `LAMBLE_CHART` before using it.
