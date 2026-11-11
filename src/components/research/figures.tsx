import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A page's three or four headline numbers in bordered cells (docs/design/system.md). Holds KeyFigure cells. */
export function KeyFigures({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-2 border-t border-l border-line md:grid-cols-4", className)}>{children}</dl>;
}

/** One cell: the figure first, then what it is, then one line of context (as-of time, basis, change). */
export function KeyFigure({ label, sub, children }: { label: ReactNode; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col border-r border-b border-line p-4 md:p-5">
      <dt className="order-2 mt-1 flex items-center gap-1.5 text-sm text-med">{label}</dt>
      {/* Long figures (sub-cent prices run to 15 characters) wrap rather than push the grid past a phone's width. */}
      <dd className="order-1 font-mono text-xl text-high [overflow-wrap:anywhere] md:text-2xl">{children}</dd>
      {sub && <dd className="order-3 mt-3 text-xs text-med">{sub}</dd>}
    </div>
  );
}

/**
 * A table figure with a bar behind it scaled to the column's largest value, so a ranked column scans at a
 * glance. The bar hides on phones, where the column is too narrow to compare lengths.
 */
export function BarFigure({ value, max, children, className }: { value: number | null; max: number; children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative ml-auto h-6 w-full max-w-40 sm:min-w-28", className)}>
      <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar sm:block" style={{ width: `${(Math.max(0, value ?? 0) / Math.max(max, 1)) * 100}%` }} />
      <span className="relative flex h-full items-center justify-end font-mono text-[13px] text-high sm:pr-2">{children}</span>
    </div>
  );
}
