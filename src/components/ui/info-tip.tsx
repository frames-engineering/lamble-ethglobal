"use client";

import { Popover } from "@base-ui/react/popover";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The ⓘ beside a figure's label: scope notes live here instead of in the page. A popover rather than a
 * tooltip so a tap opens it on phones; hover opens it on desktop.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={120}
        aria-label={label}
        className="relative -m-1 inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full text-med transition-colors duration-150 before:absolute before:-inset-3 hover:text-high"
      >
        <InfoIcon aria-hidden className="size-3" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={6} className="z-50">
          <Popover.Popup className="max-w-72 rounded-lg border border-line bg-surface-1 px-3 py-2 text-xs leading-relaxed font-normal text-high shadow-lg outline-none">{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
