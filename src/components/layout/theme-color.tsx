"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Keeps the browser bar (`theme-color`) on the page background after a theme switch. The color is read from
 * the body, so it always follows the tokens. Renders nothing.
 */
export function ThemeColor() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
  }, [resolvedTheme]);
  return null;
}
