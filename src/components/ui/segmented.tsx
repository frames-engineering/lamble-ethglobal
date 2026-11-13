"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A few views of the same data (7D/30D, sort orders, a category filter): a small pill group, pressed state on the
 * current one. With more than three options, put it in an `overflow-x-auto` row so it never widens a phone page.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly (readonly [T, ReactNode])[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-line p-0.5", className)}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          onClick={() => onChange(v)}
          className="relative inline-flex h-7 items-center gap-1.5 rounded-xs px-3 text-xs text-med transition-colors duration-150 ease-out before:absolute before:-inset-y-2 before:inset-x-0 hover:text-high aria-pressed:bg-active aria-pressed:text-high"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
