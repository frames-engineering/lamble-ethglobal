import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * The status strip (docs/design/narrative-status-2026-11.md): a labelled 20px strip down the leading edge of a row or
 * card, and the same label laid flat for meta lines and table cells. The explorer's narrative trends (trend-spine)
 * and Just spotted's leads and coins all speak through it. The moving parts are the spine-* utilities in globals.css;
 * every class here stays a literal string so Tailwind emits it.
 */

export type SpineTone = "heat" | "violet" | "positive" | "cool" | "warning" | "plain";

const LETTERING = "text-2xs leading-none font-semibold tracking-widest whitespace-nowrap uppercase";

const STRIP: Record<SpineTone, string> = {
  heat: "spine-heat border-r-transparent",
  violet: "spine-violet border-r-transparent",
  positive: "border-r-transparent bg-positive-solid text-background",
  cool: "bg-link-soft text-link",
  warning: "bg-warning-soft text-warning",
  plain: "text-low",
};

const FLAT: Record<SpineTone, string> = {
  heat: "spine-heat-flat px-1.5",
  violet: "spine-violet-flat px-1.5",
  positive: "bg-positive-solid px-1.5 text-background",
  cool: "bg-link-soft px-1.5 text-link",
  warning: "bg-warning-soft px-1.5 text-warning",
  plain: "text-low",
};

const TEXTURE = { "flow-up": "spine-flow-up", "chevrons-down": "spine-chevrons-down" } as const;
const ENTER = { drop: "spine-drop", climb: "spine-climb" } as const;

/**
 * The strip. Its parent must be `relative` and leave 32px of leading padding for it (more on a card). `tone` without
 * `label` is a colored strip with no word; neither is an empty strip. `index` staggers the load entrance; `beamLap`
 * slows the beam on a strip much taller than an explorer row, so it travels at the same speed.
 */
export function Spine({
  tone,
  label,
  texture,
  enter,
  beam = false,
  beamLap,
  index = 0,
}: {
  tone?: SpineTone;
  label?: string;
  texture?: keyof typeof TEXTURE;
  enter?: keyof typeof ENTER;
  beam?: boolean;
  beamLap?: string;
  index?: number;
}) {
  return (
    <span
      className={cn("absolute inset-y-0 left-0 flex w-5 items-center justify-center overflow-hidden border-r border-line", tone && STRIP[tone], texture && TEXTURE[texture], enter && ENTER[enter])}
      style={{ "--i": index } as CSSProperties}
    >
      {label && <span className={cn("spine-label relative", LETTERING)}>{label}</span>}
      {beam && <span aria-hidden className="spine-beam" style={beamLap ? ({ "--beam-lap": beamLap } as CSSProperties) : undefined} />}
    </span>
  );
}

/** The same status laid flat, for a meta line or a table cell. */
export function SpineLabel({ tone, label, className }: { tone: SpineTone; label: string; className?: string }) {
  return <span className={cn("inline-flex h-4.5 items-center", LETTERING, FLAT[tone], className)}>{label}</span>;
}
