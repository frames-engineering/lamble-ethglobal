import { TrendBadge } from "@/components/research/narrative-bits";
import { percent } from "@/lib/format";
import type { NarrativePublic } from "@/lib/lamble/release/types";

/** Column figures keep one decimal at M and none at K, so a column never mixes "$5M" with "$5.1M". */
export function money(v: number | null): string {
  if (v === null) return "—";
  if (v >= 999_500) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

/** Token age from creation to the data cutoff: 7h, 2d, 3mo. */
export function age(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  if (days < 60) return `${Math.round(days)}d`;
  return `${Math.round(days / 30)}mo`;
}

/** Younger than three days: launch-day trading, worth flagging when hunting for new tokens. */
export const isNew = (days: number | null) => days !== null && days < 3;

export function Change({ value, empty = "—" }: { value: number | null; empty?: string }) {
  if (value === null) return <span className="text-med">{empty}</span>;
  return <span className={value >= 0 ? "text-positive" : "text-negative"}>{percent(value, { digits: 1, signed: true })}</span>;
}

/** Trends worth a tag in a ranked list; "unknown" and "not collected" say nothing about momentum there. */
const TAGGED = new Set<NarrativePublic["trend"]>(["rising", "new", "fading", "steady"]);

/** The narrative trend dot and word (TrendBadge), only for trends that describe momentum. */
export function TrendTag({ trend }: { trend: NarrativePublic["trend"] }) {
  return TAGGED.has(trend) ? <TrendBadge trend={trend} /> : null;
}
