import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import type { ComponentType, ReactNode } from "react";
import * as echarts from "echarts/core";

export const ECHARTS_RENDERERS = {
  canvas: "canvas",
  svg: "svg",
} as const;

export type EChartsRenderer = (typeof ECHARTS_RENDERERS)[keyof typeof ECHARTS_RENDERERS];

export const DEFAULT_ECHARTS_RENDERER = ECHARTS_RENDERERS.canvas;

// Renderer registration is shared by every modular ECharts chart. Individual
// chart modules only register the series and components they use.
echarts.use([CanvasRenderer, SVGRenderer]);

// ─────────────────────────────────────────────────────────────────────────────
// Theme keys + config — replicated from the repo's <ChartStyle> so the ECharts
// charts stay self-contained (no recharts ui imports). Shared by every ECharts
// chart and the tooltip/legend/brush ui modules.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// LAMBLE chart standard (docs/design/charts.md). Every chart's defaults read
// from here instead of evilcharts' own: square marks, no gaps inside a stack,
// solid lines and hairlines, no tick dots, mono axis figures, no intro motion.
// Re-apply the `LAMBLE_CHART` references when updating a chart from the registry.
// ─────────────────────────────────────────────────────────────────────────────
export const LAMBLE_CHART = {
  strokeWidth: 1.5, // line and area strokes, in pixels
  strokeVariant: "solid", // dashes are reserved for projections; LAMBLE has none
  areaFillAlpha: 0.16, // top of an area's vertical gradient, × the series color
  barRadius: 0, // bars, stacked segments and sectors are square
  stackGap: 0, // stacked segments touch: color parts them, not a spacer
  gridLine: "solid" as const, // horizontal hairlines in the border token
  tickDots: false, // no dots beside axis labels
  axisFontSize: 11,
  tooltipRoundness: "sm" as const,
  legendVariant: "square" as const,
  animation: false, // charts render in place; no wipes or staggered grow-ins
  legendInFlow: true, // a top legend sits above the canvas and wraps, instead of overlaying the plot
  axisHideOverlap: true, // category labels that would collide are dropped, even with an explicit interval
} as const;

// Theme selectors mirror the repo's <ChartStyle>: light is the bare root, dark is `.dark`.
export const THEMES = { light: "", dark: ".dark" } as const;
export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

// Require at least one theme key — identical constraint to the repo's ChartConfig.
export type AtLeastOneThemeColor =
  | { light: string[]; dark?: string[] }
  | { light?: string[]; dark: string[] };

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: ComponentType;
    colors?: AtLeastOneThemeColor;
  }
>;

// ─────────────────────────────────────────────────────────────────────────────
// Color plumbing — replicated from the repo's <ChartStyle> so the charts stay
// self-contained (no @/registry/ui/recharts imports).
// ─────────────────────────────────────────────────────────────────────────────

// Max slots a key needs = longest color array across themes (min 1). Both themes
// always emit the same number of `--color-{key}-{n}` vars.
export function getColorsCount(item: ChartConfig[string]): number {
  if (!item.colors) return 1;
  const counts = THEME_KEYS.map((theme) => item.colors?.[theme]?.length ?? 0);
  return Math.max(...counts, 1);
}

// Distribute colors evenly across slots; extra slots go to the LAST color(s).
// 2 colors / 4 slots → [c0, c0, c1, c1]; 3 colors / 4 slots → [c0, c1, c2, c2].
export function distributeColors(colors: string[], maxCount: number): string[] {
  const available = colors.length;
  if (available >= maxCount) return colors.slice(0, maxCount);

  const result: string[] = [];
  const baseSlots = Math.floor(maxCount / available);
  const extraSlots = maxCount % available;

  for (let i = 0; i < available; i++) {
    const isExtra = i >= available - extraSlots;
    const slots = baseSlots + (isExtra ? 1 : 0);
    for (let j = 0; j < slots; j++) result.push(colors[i]!);
  }

  return result;
}

// Emits the same CSS <ChartStyle> would: `--color-{key}-{n}` scoped to
// `[data-chart={id}]` (light) and `.dark [data-chart={id}]` (dark).
export function buildChartCss(id: string, config: ChartConfig): string {
  const colorConfig = Object.entries(config).filter(([, item]) => item.colors);
  if (!colorConfig.length) return "";

  const varsFor = (theme: ThemeKey) =>
    colorConfig
      .flatMap(([key, item]) => {
        const authored = item.colors?.[theme];
        if (!authored || authored.length === 0) return [];
        return distributeColors(authored, getColorsCount(item)).map(
          (color, index) => `  --color-${key}-${index}: ${color};`,
        );
      })
      .join("\n");

  return Object.entries(THEMES)
    .map(([theme, prefix]) => `${prefix} [data-chart=${id}] {\n${varsFor(theme as ThemeKey)}\n}`)
    .join("\n");
}

// A single reusable 1×1 canvas normalizes ANY CSS color (hex, named, oklch, …)
// to a concrete rgba string by painting it and reading the pixel back.
let normalizerCtx: CanvasRenderingContext2D | null = null;
export function normalizeColor(value: string): string {
  const raw = value.trim();
  if (!raw || typeof document === "undefined") return raw;

  if (!normalizerCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    normalizerCtx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!normalizerCtx) return raw;

  normalizerCtx.clearRect(0, 0, 1, 1);
  normalizerCtx.fillStyle = "#000";
  normalizerCtx.fillStyle = raw; // invalid values leave the sentinel in place
  normalizerCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = normalizerCtx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${((a ?? 255) / 255).toFixed(3)})`;
}

// Scales the alpha of a normalized `rgba(r, g, b, a)` string. Multiplying (not
// replacing) keeps translucent theme tokens honest: a border that is 10%-white
// at `withAlpha(border, 0.5)` lands at 5%, matching Tailwind's `border/50`.
export function withAlpha(color: string, alpha: number): string {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return color;
  const [r, g, b, a] = (match[1] ?? "").split(",").map((p) => p.trim());
  const base = a === undefined ? 1 : Number.parseFloat(a) || 0;
  return `rgba(${r}, ${g}, ${b}, ${(base * alpha).toFixed(3)})`;
}

export type ResolvedColors = {
  series: Record<string, string[]>; // normalized `--color-{key}-{n}` slots per key
  tokens: {
    mutedForeground: string;
    border: string;
    foreground: string;
    background: string;
    fontMono: string; // LAMBLE: the resolved `font-mono` family, for canvas axis labels
  };
};

// Reads the injected CSS vars + theme tokens from the live DOM. Series slots come
// from `getComputedStyle` on the container; tokens are read off a throwaway probe
// carrying the matching Tailwind class (robust to the var naming a theme uses).
export function resolveColors(
  container: HTMLElement,
  config: ChartConfig,
  seriesKeys: string[],
): ResolvedColors {
  const computed = getComputedStyle(container);
  const series: Record<string, string[]> = {};

  for (const key of seriesKeys) {
    const count = getColorsCount(config[key] ?? {});
    const slots: string[] = [];
    for (let n = 0; n < count; n++) {
      const raw = computed.getPropertyValue(`--color-${key}-${n}`).trim();
      slots.push(raw ? normalizeColor(raw) : "rgba(120, 120, 120, 1)");
    }
    series[key] = slots;
  }

  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;";
  container.appendChild(probe);
  const readToken = (className: string) => {
    probe.className = className;
    return normalizeColor(getComputedStyle(probe).color);
  };
  const tokens = {
    mutedForeground: readToken("text-muted-foreground"),
    border: readToken("text-border"),
    foreground: readToken("text-foreground"),
    background: readToken("text-background"),
    fontMono: "monospace",
  };
  // LAMBLE: canvas text can't read CSS variables, so resolve the family next/font generated.
  probe.className = "font-mono";
  tokens.fontMono = getComputedStyle(probe).fontFamily || "monospace";
  container.removeChild(probe);

  return { series, tokens };
}

// Horizontal multi-stop color for a series — a solid string when there is only
// one color, else an evenly-distributed left→right LinearGradient. Reused for the
// stroke, symbol fills, and as the base tint for the area fill.
export function seriesPaint(slots: string[]): string | echarts.graphic.LinearGradient {
  if (slots.length <= 1) return slots[0] ?? "rgba(120, 120, 120, 1)";
  const stops = slots.map((color, i) => ({ offset: i / (slots.length - 1), color }));
  return new echarts.graphic.LinearGradient(0, 0, 1, 0, stops);
}

// Solid var / gradient of vars for a series indicator — mirrors getIndicatorColorStyle.
// Used by BOTH the tooltip rows and the legend indicators.
export function indicatorBackground(key: string, colorsCount: number): string {
  if (colorsCount <= 1) return `var(--color-${key}-0)`;
  const stops = Array.from({ length: colorsCount }, (_, i) => {
    const offset = (i / (colorsCount - 1)) * 100;
    return `var(--color-${key}-${i}) ${offset}%`;
  }).join(", ");
  return `linear-gradient(to right, ${stops})`;
}

// Composites a translucent color over an opaque base into a FLAT color. The
// tick dots need this: a translucent stroke double-paints where its round caps
// overlap the line body, which reads as two stacked colors.
export function flattenColor(color: string, base: string): string {
  const parse = (value: string) =>
    value
      .match(/rgba?\(([^)]+)\)/)?.[1]
      ?.split(",")
      .map((part) => Number.parseFloat(part)) ?? [0, 0, 0, 1];
  const [r = 0, g = 0, b = 0, a = 1] = parse(color);
  const [baseR = 0, baseG = 0, baseB = 0] = parse(base);
  const mix = (channel: number, baseChannel: number) =>
    Math.round(channel * a + baseChannel * (1 - a));
  return `rgb(${mix(r, baseR)}, ${mix(g, baseG)}, ${mix(b, baseB)})`;
}
