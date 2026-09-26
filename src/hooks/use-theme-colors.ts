"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export interface ThemeColors {
  theme: "dark" | "light";
  high: string;
  med: string;
  low: string;
  line: string;
  lineMed: string;
  divider: string;
  positive: string;
  negative: string;
  warning: string;
  link: string;
  violet: string;
  surface1: string;
  font: string;
}

const FALLBACK: ThemeColors = {
  theme: "dark",
  high: "#f4f4f6",
  med: "#969faf",
  low: "#75798a",
  line: "#202127",
  lineMed: "#ffffff26",
  divider: "#ffffff1a",
  positive: "#00c278",
  negative: "#fd4b4e",
  warning: "#efa411",
  link: "#4c94ff",
  violet: "#e17aff",
  surface1: "#14151b",
  font: "Inter, ui-sans-serif, system-ui, sans-serif",
};

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  const theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  return {
    theme,
    high: v("--color-high-emphasis", FALLBACK.high),
    med: v("--color-med-emphasis", FALLBACK.med),
    low: v("--color-low-emphasis", FALLBACK.low),
    line: v("--color-base-border-light", FALLBACK.line),
    lineMed: v("--color-base-border-med", FALLBACK.lineMed),
    divider: v("--color-base-divider", FALLBACK.divider),
    positive: v("--color-green-text", FALLBACK.positive),
    negative: v("--color-red-text", FALLBACK.negative),
    warning: v("--color-yellow-text", FALLBACK.warning),
    link: v("--color-accent-blue", FALLBACK.link),
    violet: v("--color-accent-purple", FALLBACK.violet),
    surface1: v("--color-base-background-l1", FALLBACK.surface1),
    font: v("--font-sans", FALLBACK.font),
  };
}

/**
 * Resolves the design tokens to concrete colors for canvas-based charts.
 * Re-reads whenever the theme changes.
 */
export function useThemeColors(): ThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);
  useEffect(() => {
    // Let the data-theme attribute land before reading computed styles.
    const id = window.requestAnimationFrame(() => setColors(read()));
    return () => window.cancelAnimationFrame(id);
  }, [resolvedTheme]);
  return colors;
}
