"use client";

import { Liveline } from "liveline";

import { useMockTicker } from "@/hooks/use-mock-ticker";
import { useThemeColors } from "@/hooks/use-theme-colors";

interface LivePulseProps {
  /** Long-run mean of the metric (e.g. launches per minute). */
  mean: number;
  paused?: boolean;
  height?: number;
  seed?: string;
  unit?: string;
}

/**
 * liveline strip fed by a seeded mock ticker. Renders to a canvas at 60fps and
 * pauses when the parent says so (hidden tab, off-screen, reduced motion).
 * Load with next/dynamic({ ssr: false }).
 */
export function LivePulse({ mean, paused = false, height = 72, seed = "launches", unit = "/min" }: LivePulseProps) {
  const colors = useThemeColors();
  const [s] = useMockTicker({
    series: [{ id: "all", mean, sigma: 0.05 }],
    seed,
    tickMs: 1000,
    keep: 900,
    paused,
  });

  return (
    <div style={{ height }} className="w-full">
      <Liveline
        data={s?.data ?? []}
        value={s?.value ?? mean}
        color={colors.positive}
        theme={colors.theme}
        window={120}
        grid={false}
        badge
        badgeTail={false}
        fill
        pulse={!paused}
        momentum
        scrub={false}
        lineWidth={2}
        formatValue={(v) => `${v.toFixed(1)}${unit}`}
        paused={paused}
        loading={!s}
        padding={{ top: 10, right: 64, bottom: 8, left: 4 }}
      />
    </div>
  );
}
