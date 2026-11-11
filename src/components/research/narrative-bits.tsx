import type { NarrativePublic } from "@/lib/lamble/release/types";
import { cn } from "@/lib/utils";

export const LIFECYCLE_LABEL: Record<NarrativePublic["lifecycle"]["state"], string> = {
  collected: "Collected",
  collection_paused: "Collection paused",
  retired: "Retired",
};

export const TREND_LABEL: Record<NarrativePublic["trend"], string> = {
  new: "New",
  rising: "Rising",
  steady: "Steady",
  // The data says "fading"; the site says Cooling, the blue end of the status scale (docs/design/narrative-status-2026-11.md).
  fading: "Cooling",
  unknown: "Trend unknown",
  not_collected: "Not collected",
};

/** Filled while measured daily, a ring while paused, faint once retired. Not colored: lifecycle is not up or down. */
const LIFECYCLE_DOT: Record<NarrativePublic["lifecycle"]["state"], string> = {
  collected: "bg-high",
  collection_paused: "border border-med",
  retired: "bg-low",
};

/**
 * The one definition of trend dots, for tables and meta lines (TrendTag in components/overview/format renders
 * these too). Same temperature scale as the overview's status spine: hot for new, green for rising, blue for cooling.
 */
const TREND_DOT: Record<NarrativePublic["trend"], string> = {
  rising: "bg-positive",
  new: "bg-hot",
  fading: "bg-link",
  steady: "bg-med",
  unknown: "border border-med",
  not_collected: "bg-low",
};

/** A dot and a word: quiet enough for a table cell, a page's meta line or a list row. Inherits size and color. */
function DotLabel({ dot, children }: { dot: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      {children}
    </span>
  );
}

export function LifecycleBadge({ state }: { state: NarrativePublic["lifecycle"]["state"] }) {
  return <DotLabel dot={LIFECYCLE_DOT[state]}>{LIFECYCLE_LABEL[state]}</DotLabel>;
}

export function TrendBadge({ trend }: { trend: NarrativePublic["trend"] }) {
  return <DotLabel dot={TREND_DOT[trend]}>{TREND_LABEL[trend]}</DotLabel>;
}

/**
 * Week-over-week change text. For a narrative first observed in the last week the prior window measures coins
 * before the narrative existed, so the change is not shown as momentum.
 */
export function shownChange(n: Pick<NarrativePublic, "trend" | "activity">): number | null {
  if (n.trend === "new" || n.trend === "not_collected") return null;
  return n.activity.change7dPct;
}
