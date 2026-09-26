import { percent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DeltaProps {
  value: number | null;
  /** Append "pp" instead of "%" for percentage-point changes. */
  unit?: "%" | "pp";
  digits?: number;
  className?: string;
  /** Neutral band: |value| below this renders in the muted tone. */
  flatBelow?: number;
}

/** Signed change with the positive / negative tone from the design system. */
export function Delta({ value, unit = "%", digits = 1, className, flatBelow = 0.05 }: DeltaProps) {
  if (value === null) return <span className={cn("text-med", className)} aria-label="Change unavailable">—</span>;
  const tone = Math.abs(value) < flatBelow ? "text-med" : value > 0 ? "text-positive" : "text-negative";
  const text = unit === "%" ? percent(value, { signed: true, digits }) : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}pp`;
  return (
    <span className={cn("tabular-nums", tone, className)}>
      {text}
    </span>
  );
}
