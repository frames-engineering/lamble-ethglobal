import { Badge } from "@/components/ui/badge";
import type { NarrativePublic } from "@/lib/lambo/release/types";

export const LIFECYCLE_LABEL: Record<NarrativePublic["lifecycle"]["state"], string> = {
  collected: "Collected",
  collection_paused: "Collection paused",
  retired: "Retired",
};

export const TREND_LABEL: Record<NarrativePublic["trend"], string> = {
  new: "New",
  rising: "Rising",
  steady: "Steady",
  fading: "Fading",
  unknown: "Trend unknown",
  not_collected: "Not collected",
};

export function LifecycleBadge({ state }: { state: NarrativePublic["lifecycle"]["state"] }) {
  return <Badge variant={state === "collected" ? "positive" : "neutral"}>{LIFECYCLE_LABEL[state]}</Badge>;
}

export function TrendBadge({ trend }: { trend: NarrativePublic["trend"] }) {
  const variant = trend === "rising" ? "positive" : trend === "fading" ? "negative" : trend === "new" ? "violet" : "outline";
  return <Badge variant={variant}>{TREND_LABEL[trend]}</Badge>;
}

/**
 * Week-over-week change text. For a narrative first observed in the last week the prior window measures coins
 * before the narrative existed, so the change is not shown as momentum.
 */
export function shownChange(n: Pick<NarrativePublic, "trend" | "activity">): number | null {
  if (n.trend === "new" || n.trend === "not_collected") return null;
  return n.activity.change7dPct;
}
