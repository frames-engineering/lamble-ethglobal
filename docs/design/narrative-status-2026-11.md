# Narrative status, November 2026: decided from /proto/narrative-status

How a narrative's trend is shown in the overview's explorer. Decided with Marcelo on 2026-11-11 over four
prototype rounds; the prototype route is deleted, and this file is what remains of it. Usage rules are in
[system.md](system.md).

## What shipped

**Spine**: the status is a labelled strip down the leading edge of each row in the explorer's list, 20px wide,
lettered bottom to top (11px, weight 550, 0.1em tracking, uppercase). The meta line under the title keeps only
the volume, and the selected row's 2px bar sits on the edge that meets the panel.

| Trend | Label | Strip | Motion |
| --- | --- | --- | --- |
| `new` | New | Heat: pink-500 → orange-500 → yellow-400, interpolated in oklch, dark ink (base-900) | The colors drift up, 180px in 9s. A white beam laps the strip's edge: 3s a lap, 44px long, 1.5px thick. Drops in from the top on load. |
| `rising` | Rising | Solid green (`bg-positive-solid`), page-color ink | Chevrons flow up, 10px a second. Climbs in from the bottom on load. |
| `fading` | Cooling | Soft blue wash (`bg-link-soft`), blue ink, still chevrons pointing down | None |
| `steady` | Steady | No fill, `text-low` | None |
| `unknown`, `not_collected` | — | Empty strip | None |

- The open narrative's header repeats the status as the same label laid flat (18px tall), with the same fills
  and no motion.
- Load entrances are 320ms `--ease-decelerate` clip wipes, 50ms apart by row, starting as the section rises in.
- Reduced motion stills the textures and entrances and removes the beam (a beam that doesn't travel is a stray
  dash). Browsers without `offset-path: rect()` get no beam either.
- The label for `fading` is **Cooling** everywhere (`TREND_LABEL`), and the dots used in tables and meta lines
  follow the same colors: orange for New (`bg-hot`), green for Rising, blue for Cooling. The data and the API
  still say `fading`.

Code: `components/overview/trend-spine.tsx` (strip and flat label) and the `spine-*` utilities in
`app/globals.css`.

## Rejected

- **Dot and word** (the previous treatment): "a boring indicator with a subtle text".
- **Livery** (slanted solid badges in the meta line, with a spark or climbing chevrons in a leading cell) and
  **Marker** (the title itself highlighted: a solid block for New, a green ramp for Rising). Spine was picked
  over both: the strip gives the status more room and more color than a badge or a highlight.
- **New in the accent blue** (Spine as first picked): "simple blue" was not attention-grabbing enough. The blue
  moved to Fading, renamed Cooling, so the list reads as a temperature scale.
- **Hazard** (caution-tape yellow with sliding stripes) and **Magenta** (solid pink with a blinking pip) as
  New's fill: Heat was preferred. Yellow also already means "warning" on the research and sources pages.
- **A beam around the whole New row** (6s a lap, 120px, comet in the heat colors): the beam on the strip alone
  was chosen.
- Earlier the same day, at `/proto/narrative-signals` (deleted): looping sweeps, a ticking "spotted … ago"
  clock, a heat fill sized by the change, rank arrows and streaks, hero cards with a border beam, and four
  tinted-badge treatments with five motions. Don't re-offer these.

## Not decided

- Cooling shipped as a soft wash so that New and Rising stay the loudest rows; a solid blue strip was not
  compared side by side.
- The beam's numbers are the prototype's defaults. They were on sliders but no other values were chosen. They
  are the `--beam-*` variables on the `spine-beam` utility.
