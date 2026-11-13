import type { ComponentProps } from "react";

import { Spine, SpineLabel, type SpineTone } from "@/components/overview/spine";
import { TREND_LABEL } from "@/components/research/narrative-bits";
import type { NarrativePublic } from "@/lib/lamble/release/types";

type Trend = NarrativePublic["trend"];

/**
 * Narrative status in the overview's explorer (docs/design/narrative-status-2026-11.md), on the shared strip
 * (spine.tsx). New is the hot end of a temperature scale (a heat gradient with a beam lapping it), Rising is solid
 * green with chevrons flowing up, Cooling is a soft blue wash, Steady is a plain word. "Unknown" and "not collected"
 * say nothing about momentum, so they get an empty strip and no label.
 */

const STRIP: Partial<Record<Trend, Omit<ComponentProps<typeof Spine>, "label" | "index"> & { tone: SpineTone }>> = {
  new: { tone: "heat", enter: "drop", beam: true },
  rising: { tone: "positive", texture: "flow-up", enter: "climb" },
  fading: { tone: "cool", texture: "chevrons-down" },
  steady: { tone: "plain" },
};

/** Whether a trend describes momentum and so gets a label. */
export const hasTrendLabel = (trend: Trend) => trend in STRIP;

/** The strip. Its parent row must be `relative` and leave 32px of leading padding for it. `index` staggers the load entrance. */
export function TrendSpine({ trend, index = 0 }: { trend: Trend; index?: number }) {
  const s = STRIP[trend];
  return s ? <Spine {...s} label={TREND_LABEL[trend]} index={index} /> : <Spine index={index} />;
}

/** The same status laid flat, for a meta line. Renders nothing for trends without a label. */
export function TrendLabel({ trend }: { trend: Trend }) {
  const s = STRIP[trend];
  return s ? <SpineLabel tone={s.tone} label={TREND_LABEL[trend]} /> : null;
}
