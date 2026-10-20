import { Badge } from "@/components/ui/badge";
import type { DataState, Measure } from "@/lib/lamble/core/measure";
import { compactUsd, percent, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

export const STATE_LABEL: Record<DataState, string> = {
  observed: "Observed",
  derived: "Derived",
  stale: "Stale",
  insufficient_data: "Insufficient data",
  unavailable: "Unavailable",
  not_applicable: "Not applicable",
};

const STATE_VARIANT: Record<DataState, "neutral" | "warning" | "outline" | "link"> = {
  observed: "link",
  derived: "link",
  stale: "warning",
  insufficient_data: "outline",
  unavailable: "outline",
  not_applicable: "neutral",
};

export function StateBadge({ state, className, title }: { state: DataState; className?: string; title?: string }) {
  return (
    <Badge variant={STATE_VARIANT[state]} className={className} title={title}>
      {STATE_LABEL[state]}
    </Badge>
  );
}

export type ValueFormat = "usd" | "usd-full" | "price" | "percent" | "signed-percent" | "ratio" | "ratio-percent" | "count";

/** Price with enough significant digits for sub-cent memecoins: $0.0₄1234 style is avoided for readability. */
export function formatPrice(v: number): string {
  if (v >= 1) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
  if (v === 0) return "$0";
  const digits = Math.min(12, Math.max(2, -Math.floor(Math.log10(v)) + 3));
  return `$${v.toFixed(digits)}`;
}

export function formatValue(v: number | null, format: ValueFormat): string {
  if (v === null || !Number.isFinite(v)) return "—";
  switch (format) {
    case "usd":
      return compactUsd(v);
    case "usd-full":
      return usd(v);
    case "price":
      return formatPrice(v);
    case "percent":
      return percent(v, { digits: 1 });
    case "signed-percent":
      return percent(v, { digits: 1, signed: true });
    case "ratio":
      return v.toFixed(3);
    case "ratio-percent":
      return percent(100 * v, { digits: 1, signed: true });
    case "count":
      return v.toLocaleString("en-US");
  }
}

/**
 * Renders a measure without ever turning a missing value into zero: missing states show an em dash and their
 * label; stale values keep their value with a stale badge. The note goes to the title for hover and to
 * screen readers.
 */
export function MeasureValue({
  measure,
  format,
  className,
  showState = true,
  tone = false,
}: {
  measure: Measure<number>;
  format: ValueFormat;
  className?: string;
  showState?: boolean;
  /** Color positive/negative values (for changes). */
  tone?: boolean;
}) {
  const has = measure.value !== null && (measure.state === "observed" || measure.state === "derived" || measure.state === "stale");
  const value = has ? measure.value : null;
  const toneClass = tone && value !== null ? (value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-med") : "";
  const title = [measure.note, measure.coverage?.scope].filter(Boolean).join(" ") || undefined;
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)} title={title}>
      <span className={cn("tabular-nums", has ? "text-high" : "text-med", toneClass)}>{formatValue(value, format)}</span>
      {showState && measure.state !== "observed" && measure.state !== "derived" && <StateBadge state={measure.state} title={title} />}
      {title && <span className="sr-only">{title}</span>}
    </span>
  );
}

export function Stat({ label, children, sub, className, title }: { label: string; children: React.ReactNode; sub?: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={cn("min-w-0", className)} title={title}>
      <dt className="text-2xs text-med">{label}</dt>
      <dd className="mt-1 text-sm text-high">{children}</dd>
      {sub !== undefined && <dd className="mt-0.5 text-2xs text-med">{sub}</dd>}
    </div>
  );
}
