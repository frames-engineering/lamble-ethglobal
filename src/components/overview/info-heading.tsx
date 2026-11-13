"use client";

import { InfoIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A subheading with its scope note folded away: the ⓘ beside the title opens the note below it. For notes too long
 * for an InfoTip popover (how a list is picked, what it leaves out). Closed by default.
 */
export function InfoHeading({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-medium text-high">{title}</h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150 outline-none before:absolute before:-inset-2.5 hover:text-high focus-visible:ring-1 focus-visible:ring-focus",
            open ? "bg-active text-high" : "text-med",
          )}
        >
          <InfoIcon aria-hidden className="size-4" />
        </button>
      </div>
      <div id={id} inert={!open} className={cn("grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <p className="max-w-[72ch] pt-2 text-sm text-pretty text-med">{children}</p>
        </div>
      </div>
    </div>
  );
}
