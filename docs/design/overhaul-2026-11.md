# UI overhaul, November 2026: decided from /proto/overhaul

Three directions were built behind a picker and compared against the existing site: **Mono** (after
tehcscreener.com), **Dune** (after dune.com/discover and dune.com/data/stablecoins) and **Discovery**
(the Dune shell with narratives leading). Dune was promoted, with Discovery's two discovery components.

## What shipped

- **Shell:** a 240px sidebar holds every menu: primary sections, then "Method" and "Agents" groups that
  expand and collapse, and a "Launching a token?" card. Phones get a top bar with a drawer that holds the
  same sidebar. A desktop top bar shows where you are and the release's data cutoff.
- **Type:** Geist for UI, Geist Mono only for figures and addresses, and Geist Pixel for page titles only.
  All three are self-hosted woff2 files in `src/fonts/`: Geist and Geist Mono are variable, and Geist
  Pixel is the Square cut from the `geist` package (one weight, 500). Geist Pixel replaced the interim
  system serif (Iowan Old Style, Charter, Georgia) on 2026-11-10.
- **Color:** warm near-neutral grays, hairline borders instead of shadows, and white as the only accent
  (primary buttons are white pills). Color appears only in chart series and up/down figures. The chart
  series palette passed the colorblind and contrast validator in both themes.
- **Overview (`/`):** title and intro with a Methodology button. Then the four stats; the trending
  narratives explorer (ranked list, plus the selected narrative's 7D hourly or 30D daily volume, "why it's
  moving" and the tokens carrying it); launchpad fees stacked by launchpad; trending tokens, sortable by
  most traded, top gainers or newest; and latest research. The moving lambo plays only in this route's
  footer.
- **Every other route:** the same page header, sections, bordered cards and tables, with a minimal
  shared footer.

## Rejected

- **Mono (tehcscreener):** too close to the reference, and a single mono face looked unprofessional.
  Kept from it: what to show and what to hide, and the lambo moved from the hero to the footer.
- **Components copied from Dune without a LAMBLE reason:** the "N chains" pill (Dune's datasets differ by
  chain; ours don't), the "Data via Frames" pill (Frames is already credited in the sidebar), and source
  chips under charts. The rule going forward: each component needs a reason in LAMBLE's terms.
- **Discovery as the whole home page:** its explorer and token list were kept, but with Dune's stats grid
  and section rhythm around them.
- **Hidden from the home page as noise:** the release ID line, the weekly edition panel, the "what
  changed" feed, the three hero CTAs and the launch-bot banner (it lives in the sidebar card instead).
- **A "trench index" gauge** like the reference's: LAMBLE has no such metric, and inventing one would
  mean new data.
