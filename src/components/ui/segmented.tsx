"use client";

import { cn } from "@/lib/utils";

/** Two or three views of the same data (7D/30D, sort orders): a small pill group, pressed state on the current one. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
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
          className="relative h-7 rounded-xs px-3 text-xs text-med transition-colors duration-150 ease-out before:absolute before:-inset-y-2 before:inset-x-0 hover:text-high aria-pressed:bg-active aria-pressed:text-high"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
