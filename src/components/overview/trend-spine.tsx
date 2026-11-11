import type { CSSProperties } from "react";

import { TREND_LABEL } from "@/components/research/narrative-bits";
import type { NarrativePublic } from "@/lib/lamble/release/types";
import { cn } from "@/lib/utils";

type Trend = NarrativePublic["trend"];

/**
 * Narrative status in the overview's explorer (docs/design/narrative-status-2026-11.md): a labelled strip down
 * the row's leading edge, and the same label laid flat for the open narrative's header. New is the hot end of
 * a temperature scale (a heat gradient with a beam lapping it), Rising is solid green with chevrons flowing
 * up, Cooling is a soft blue wash, Steady is a plain word. "Unknown" and "not collected" say nothing about
 * momentum, so they get an empty strip and no label. The moving parts are the spine-* utilities in globals.css.
 */

const LETTERING = "text-2xs leading-none font-semibold tracking-widest whitespace-nowrap uppercase";

const STRIP: Partial<Record<Trend, string>> = {
  new: "spine-heat spine-drop border-r-transparent",
  rising: "spine-flow-up spine-climb border-r-transparent bg-positive-solid text-background",
  fading: "spine-chevrons-down bg-link-soft text-link",
  steady: "text-low",
};

const FLAT: Partial<Record<Trend, string>> = {
  new: "spine-heat-flat px-1.5",
  rising: "bg-positive-solid px-1.5 text-background",
  fading: "bg-link-soft px-1.5 text-link",
  steady: "text-low",
};

/** Whether a trend describes momentum and so gets a label. */
export const hasTrendLabel = (trend: Trend) => trend in STRIP;

/** The strip. Its parent row must be `relative` and leave 32px of leading padding for it. `index` staggers the load entrance. */
export function TrendSpine({ trend, index = 0 }: { trend: Trend; index?: number }) {
  return (
    <span className={cn("absolute inset-y-0 left-0 flex w-5 items-center justify-center overflow-hidden border-r border-line", STRIP[trend])} style={{ "--i": index } as CSSProperties}>
      {hasTrendLabel(trend) && <span className={cn("spine-label relative", LETTERING)}>{TREND_LABEL[trend]}</span>}
      {trend === "new" && <span aria-hidden className="spine-beam" />}
    </span>
  );
}

/** The same status laid flat, for a meta line. Renders nothing for trends without a label. */
export function TrendLabel({ trend }: { trend: Trend }) {
  if (!hasTrendLabel(trend)) return null;
  return <span className={cn("inline-flex h-4.5 items-center", LETTERING, FLAT[trend])}>{TREND_LABEL[trend]}</span>;
}
