/**
 * Chart colors as theme tokens (--color-viz-* in tokens.css; rules in docs/design/charts.md). evilcharts
 * resolves CSS variables itself, so these follow light and dark.
 */

/** The hue families in tokens.css. Each has one step per theme, all of even visual weight. */
export type VizHue = "green" | "gold" | "orange" | "coral" | "pink" | "violet" | "blue" | "sky" | "teal";

export const hue = (h: VizHue) => `var(--color-viz-${h})`;

/**
 * A single series that isn't a brand (narrative volume, a coin's price) wears `accent`. `others` is the rest of
 * a whole. positive and negative are for series that mean up and down, never for "the second series".
 */
export const SERIES = {
  accent: hue("blue"),
  others: "var(--color-viz-0)",
  positive: "var(--color-positive)",
  negative: "var(--color-negative)",
} as const;

/** Generic categorical order for series that aren't brands (a research article's chart), validated in order. */
export const PALETTE = [1, 2, 3, 4, 5, 6, 7].map((n) => `var(--color-viz-${n})`);

/**
 * Brand hue per launchpad, so a launchpad wears the same color on every chart: pump.fun is always green. Hues
 * come from each launchpad's logo in public/launchpads; Flap.sh's lime maps to gold so it stays apart from
 * pump.fun's green. Launchpads whose logo has no color get a fixed hue marked "assigned".
 *
 * Listed in stack order, bottom first: the largest venues sit at the base of a stacked chart and keep their
 * place from day to day. The fees stack (green, gold, pink, blue, coral) was validated in this order.
 */
export const LAUNCHPAD_HUE: Record<string, VizHue> = {
  "pump.fun": "green",
  "flap-sh": "gold",
  pons: "pink", // assigned
  launchlab: "blue", // Raydium
  "meteora-dbc": "coral",
  clanker: "violet",
  "argus-world": "violet",
  "genius.fun": "pink",
  "o1-launchpad": "sky", // assigned
  "four.meme": "teal",
  "bonk.fun": "orange",
  "binance-alpha": "gold",
  bags: "green",
  basestonk: "blue",
  stonkfun: "sky",
  stonkbrokers: "orange",
  "rapid-launch": "teal", // assigned
  "graphite-protocol": "violet", // assigned
  foci: "orange", // assigned
};

/** Generic order the shared-hue fallback walks. */
const FALLBACK: VizHue[] = ["blue", "coral", "violet", "green", "gold", "sky", "pink", "teal", "orange"];

/** One launchpad on its own (its fee history): always its brand hue. */
export const launchpadColor = (slug: string) => hue(LAUNCHPAD_HUE[slug] ?? "blue");

/** Stack position: brand order first, unknown launchpads after them in the order given. */
export const launchpadRank = (slug: string) => {
  const i = Object.keys(LAUNCHPAD_HUE).indexOf(slug);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

/**
 * Colors for launchpads shown together, in the order given (largest first). Each wears its brand hue; when two
 * share a hue (clanker and Argus World are both violet), the smaller takes the first hue nobody on the chart
 * uses, so no two series ever match.
 */
export function launchpadColors(slugs: string[]): string[] {
  const used = new Set<VizHue>();
  const own = slugs.map((s) => {
    const h = LAUNCHPAD_HUE[s];
    if (!h || used.has(h)) return null;
    used.add(h);
    return h;
  });
  return own.map((h) => {
    if (h) return hue(h);
    const free = FALLBACK.find((x) => !used.has(x)) ?? "blue";
    used.add(free);
    return hue(free);
  });
}
