# Data table — Backpack `/lend`

Extracted 2026-09-26 from <https://backpack.exchange/lend> ("Borrow Lend Markets" and "Vault" tables), measured from computed styles in a browser.
Viewports tested: **1440×900** and **800×900** (desktop), **375×812** (phone, touch).
Token names refer to [`../tokens.css`](../tokens.css).

---

## Anatomy

```
Card ─┬─ Header row            "Borrow Lend Markets"
      └─ Scroll wrapper        overflow-x: auto
           └─ <table>
                ├─ <thead>     11px labels, 1px bottom rule, sort arrow
                └─ <tbody>     57px rows, 1px dividers, whole-row hover
```

It is a real `<table>` at every size. There's no card or stacked layout on mobile; the table scrolls sideways instead.

---

## Typography

Everything is Inter (`--font-sans`, loaded from `https://rsms.me/inter/inter.css`) with the site's feature settings `"calt", "cv01", "cv03", "cv04", "cv09", "liga"`. These are set once on `body` and every text element inherits them. No uppercase and no letter-spacing anywhere in the table.

| Element | Size / line-height | Weight (dark · light) | Colour | Numerals |
|---|---|---|---|---|
| Card title | 16px / 24px | 400 · 400 (no weight class) | `high-emphasis` | — |
| Column header | 11px / 16.5px | 300 · 400 (`font-normal`) | `med-emphasis` | — |
| Cell (default) | 13px / 19.5px | 300 · 400 (`font-normal`) | `high-emphasis` | tabular |
| Asset name | 14px / 20px | 300 · 400 (`font-normal`) | `high-emphasis` | tabular |
| Asset symbol | 12px / 20px | 400 · 450 (`font-medium`) | `med-emphasis` | tabular |
| Secondary value (USD) | 11px / 16.5px | 300 · 400 (inherited) | `med-emphasis` | tabular |
| Earn / cost rate | 13px / 19.5px | 300 · 400 | `green-text` / `red-text` | tabular |
| Row text button, vault link | 14px / 20px | 500 · 500 (`font-semibold`) | `accent-blue` | — |
| Menu item | 14px / 20px | 500 · 500 (`font-semibold`) | `med-emphasis` | — |

Measured values are the dark-theme weights. The light-theme weights follow from the site's token remap: `font-normal` is 300 in dark and 400 in light, `font-medium` is 400 in dark and 450 in light. Use the weight variables (`--font-weight-normal` etc.) rather than hard-coded numbers so this switches automatically.

The weights are one step lighter than their Tailwind names suggest (`font-semibold` renders 500). Light text on a dark background looks heavier, and the site compensates for that.

---

## Container

| Part | Spec |
|---|---|
| Card | `card-bg` background · 1px `card-border` · radius `xl` (12px) · padding 16px · `shadow-sm` · 16px gap between header and table |
| Card title | 16px / 24px · weight 400 · `high-emphasis` · left-aligned in a `justify-between` row (space for right-side controls) |
| Scroll wrapper | `width: 100%; overflow-x: auto` · no fade, mask or scroll shadow |
| Table | `min-width: 100%` · `border-collapse: collapse` · transparent background |

In dark mode `card-border` equals `card-bg` (#14151b), so the border is invisible. In light mode it becomes a faint #0f172a14 outline.

---

## Header row (`th`)

| Property | Value |
|---|---|
| Font | 11px (`text-2xs`) / 16.5px line-height · weight 300 (`font-normal`) |
| Colour | `med-emphasis` (#969faf) |
| Padding | bottom 4px only; label has 4px right padding, 0 left |
| Height | 21px |
| Rule | 1px bottom border `base-border-light` (#202127) |
| Wrap | `white-space: nowrap` |
| Alignment | first column left; every numeric and action column right |
| Widths | set as percentages on `th`: lend table 14% × 6 data columns + 16% actions; vault table 28% first column |
| Sorting | whole label is the hit area (`cursor: pointer; user-select: none`); action column isn't sortable |
| Active sort | 16px Lucide `arrow-down` icon, 4px right margin, **before** the label. Label colour doesn't change. Default: Lend APY descending |

Not observed: ascending state, hover state on headers.

---

## Body rows (`tr`)

| Property | Value |
|---|---|
| Height | 57px (48px content + 4px top/bottom cell padding + 1px divider) |
| Divider | 1px `base-border-light` between rows (`tbody` uses `divide-y`) — no outer border, no zebra striping |
| Hover | entire row background → `row-hover` (#202127 dark · `base-background-l1` light). Wrapped in `@media (hover: hover)`, so it never sticks on touch |
| Interaction | whole row is clickable (`cursor: pointer`); the asset cell contains the actual `<a>` link |
| Radius | none — rows are square, the card provides the rounding |

## Body cells (`td`)

| Property | Value |
|---|---|
| Font | 13px / 19.5px · weight 300 · `font-variant-numeric: tabular-nums` |
| Colour | `high-emphasis` unless the content says otherwise |
| Padding | 4px 8px; last cell 4px right |

`text-table-cell-primary` in Backpack's markup is a custom utility that only sets `font-size: 13px`, not a colour.

### Cell types

| Type | Structure | Example |
|---|---|---|
| **Asset** | flex row, 12px gap, 4px vertical padding → 34×34 round icon (1px `base-border-med` ring, i.e. white 15%; vault table has no ring) + stacked text: name 14px/20 weight 300 `high-emphasis` nowrap, symbol 12px/20 weight 400 `med-emphasis` | Monad / MON |
| **Amount + USD** | right-aligned column, 2px gap → primary 13px `high-emphasis` in compact notation, secondary 11px `med-emphasis` in USD | 32.2M / $858.7K |
| **Percent** | 13px `high-emphasis` | 21.62% |
| **Earn rate** | 13px `green-text`; may show a range; optional 14px Lucide `zap` icon in `yellow-text` as a tooltip trigger (`cursor: help`), 4px from the value — marks an incentive rate | 7.24% · 3.50% - 6.50% |
| **Cost rate** | 13px `red-text` | 2.52% |
| **Currency** | 13px `high-emphasis`; full figures with separators where precision matters | $529,733 · $1.0594 |
| **Empty** | em dash `—` in the default cell colour | — |
| **Actions** (lend) | right-aligned flex, 24px gap → text buttons **Lend**, **Borrow** + a 24px Lucide `ellipsis-vertical` icon button (−10px left margin to tighten it) | Lend Borrow ⋮ |
| **Actions** (vault) | `accent-blue` 14px/500 link with trailing icon, 4px gap | View vault → |

**Text buttons in rows:** `accent-blue`, 14px, weight 500, height 32px, no padding, transparent background, radius 8px, hover `opacity: .9`, disabled `opacity: .8`.

### Row overflow menu (⋮)

| Part | Spec |
|---|---|
| Motion | fade-in + zoom-in from 95% + slide-in 4px from top · 150ms `ease-out` · origin top-right |
| Panel | `card-bg` · 1px `card-border` · radius 8px · padding 4px · 4px gap between items · min-width 160px · `shadow-lg` tinted with `base-shadow` · text `med-emphasis` |
| Item | full width · ~38px tall · 16px horizontal padding · 14px weight 500 · radius 8px · hover background `base-background-l3` · 12px gap between icon and label |
| Icons | 20px: "Transfer in" = `arrow-down-to-line` in `green-icon`; "Transfer out" = `arrow-up-to-line` in `accent-blue` |

---

## Responsive behaviour

| | Desktop (1440px, 800px) | Phone (375px) |
|---|---|---|
| Layout | same table | same table — no cards |
| Card placement | inside the content column next to the sidebar; 16px page gutter (`xs:px-4`) | **full-bleed**: gutter drops to 0 below 540px, card spans the screen edge to edge but keeps its 12px radius and 16px inner padding |
| Overflow | table min width ≈ 691px; at 1440 it stretches to fill (1142px); at 800 the card is 536px wide and the table scrolls inside it | scrolls horizontally inside the card (341px visible of 691px) |
| Column order | Asset · Market Supply · Market Borrowed · Utilization · Lend APY · Borrow APY · actions | **Asset · Lend APY · Borrow APY** · Market Supply · Market Borrowed · Utilization · actions |
| Row height, fonts, icons | 57px · 13px · 34px | unchanged |
| Sticky first column | no | no |
| Row hover | yes | disabled (`hover: hover` media query) |

**Why the reorder matters:** on phones the two numbers people actually compare (the rates) move up next to the asset name, so they're visible without scrolling; the volume columns go behind the scroll.

The order is decided when the page loads: resizing an open page doesn't reorder the columns. It appeared only with phone emulation (under 768px with a touch user agent); an 800px desktop load kept the desktop order.

---

## Reference implementation

Plain CSS using the variables from `tokens.css`:

```html
<section class="bp-card">
  <div class="bp-card__header"><p class="bp-card__title">Borrow Lend Markets</p></div>
  <div class="bp-table-scroll">
    <table class="bp-table">
      <thead>
        <tr>
          <th style="width:14%"><div class="bp-th">Asset</div></th>
          <th style="width:14%"><div class="bp-th bp-th--num">Market Supply</div></th>
          <th style="width:14%"><div class="bp-th bp-th--num"><svg class="bp-sort" aria-hidden="true"><!-- lucide arrow-down --></svg>Lend APY</div></th>
          <th style="width:16%"><div class="bp-th bp-th--num"></div></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <a class="bp-asset" href="#">
              <img class="bp-asset__icon" src="mon.svg" alt="" width="34" height="34">
              <span class="bp-asset__text">
                <span class="bp-asset__name">Monad</span>
                <span class="bp-asset__symbol">MON</span>
              </span>
            </a>
          </td>
          <td class="bp-num">
            <div class="bp-stack"><p>32.2M</p><p class="bp-sub">$858.7K</p></div>
          </td>
          <td class="bp-num"><span class="bp-pos">7.24%</span></td>
          <td class="bp-num">
            <div class="bp-actions">
              <button class="bp-text-btn">Lend</button>
              <button class="bp-text-btn">Borrow</button>
              <button class="bp-text-btn bp-more" aria-label="More"><!-- lucide ellipsis-vertical --></button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

```css
/* Base (Backpack gets this from Tailwind's reset): inherit the font into controls, drop default margins */
.bp-card { font-family:var(--font-sans); font-feature-settings:var(--font-feature-settings); }
.bp-card :where(p) { margin:0; }
.bp-card :where(button) { font:inherit; font-feature-settings:inherit; color:inherit; }

.bp-card { display:flex; flex-direction:column; gap:16px; padding:16px;
  background:var(--color-card-bg); border:1px solid var(--color-card-border);
  border-radius:var(--radius-xl); box-shadow:var(--shadow-sm); }
.bp-card__header { display:flex; align-items:center; justify-content:space-between; }
.bp-card__title { color:var(--color-high-emphasis); font-size:16px; line-height:24px; }

.bp-table-scroll { width:100%; overflow-x:auto; }
.bp-table { min-width:100%; border-collapse:collapse; }

.bp-table th { padding:0 0 4px; border-bottom:1px solid var(--color-base-border-light);
  color:var(--color-med-emphasis); font-size:var(--text-2xs); line-height:1.5;
  font-weight:var(--font-weight-normal); white-space:nowrap; }
.bp-th { display:flex; align-items:center; padding-right:4px; cursor:pointer; user-select:none;
  justify-content:flex-start; text-align:left; }
.bp-th--num { justify-content:flex-end; text-align:right; }
.bp-sort { width:16px; height:16px; margin-right:4px; }

.bp-table tbody tr { cursor:pointer; }
.bp-table tbody tr:not(:last-child) { border-bottom:1px solid var(--color-base-border-light); }
@media (hover:hover) { .bp-table tbody tr:hover { background:var(--color-row-hover); } }

.bp-table td { padding:4px 8px; font-size:13px; line-height:1.5; font-weight:var(--font-weight-normal);
  font-variant-numeric:tabular-nums; color:var(--color-high-emphasis); }
.bp-table td:last-child { padding-right:4px; }
.bp-num { text-align:right; }

.bp-asset { display:flex; align-items:center; gap:12px; padding:4px 0; color:inherit; text-decoration:none; }
.bp-asset__icon { width:34px; height:34px; border-radius:9999px; border:1px solid var(--color-base-border-med); flex:none; }
.bp-asset__text { display:flex; flex-direction:column; }
.bp-asset__name { font-size:14px; line-height:20px; white-space:nowrap; }
.bp-asset__symbol { font-size:12px; line-height:20px; font-weight:var(--font-weight-medium); color:var(--color-med-emphasis); }

.bp-stack { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.bp-sub { font-size:var(--text-2xs); color:var(--color-med-emphasis); }
.bp-pos { color:var(--color-green-text); }
.bp-neg { color:var(--color-red-text); }

.bp-actions { display:flex; justify-content:flex-end; gap:24px; }
.bp-text-btn { height:32px; padding:0; background:transparent; border:0; border-radius:var(--radius-lg);
  color:var(--color-accent-blue); font-size:14px; line-height:20px; font-weight:var(--font-weight-semibold); cursor:pointer; }
.bp-text-btn:hover { opacity:.9; }
.bp-text-btn:disabled { opacity:.8; }
.bp-more { margin-left:-10px; }

/* Page gutter around the card: 16px, dropping to 0 on phones so the card is full-bleed */
.bp-page { padding-inline:16px; }
@media (max-width: 539px) { .bp-page { padding-inline:0; } }
```

Column reordering on phones isn't CSS. Render the column array in a different order when the page loads on a phone.

---

## Not captured

- Ascending-sort icon, header hover, and how clicking a header toggles direction
- Loading, empty-table and error states
- Tooltip content and styling for the `zap` incentive icon
- On my first reading (1024px, taken right after navigation) the action cell showed only "⋮". Every later reading after the page finished loading (375, 800, 1440px) showed Lend · Borrow · ⋮.
