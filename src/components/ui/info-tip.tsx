"use client";

import { Popover } from "@base-ui/react/popover";
import { InfoIcon } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

const ICON_TRIGGER =
  "relative -m-1 inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full text-med transition-colors duration-150 before:absolute before:-inset-3 hover:text-high";
const CUSTOM_TRIGGER = "relative inline-flex shrink-0 cursor-help items-center rounded-sm before:absolute before:-inset-x-1 before:-inset-y-3";

// The tip can sit inside a clickable row: a tap on it, or in its (portalled) popup, stays with the tip.
const stop = (e: MouseEvent) => e.stopPropagation();

/**
 * The ⓘ beside a figure's label: scope notes live here instead of in the page. A popover rather than a
 * tooltip so a tap opens it on phones; hover opens it on desktop. Pass `trigger` to open it from something
 * other than the ⓘ (chain icons, say); `label` stays its accessible name.
 */
export function InfoTip({ label, trigger, children }: { label: string; trigger?: ReactNode; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger openOnHover delay={120} aria-label={label} onClick={stop} className={trigger ? CUSTOM_TRIGGER : ICON_TRIGGER}>
        {trigger ?? <InfoIcon aria-hidden className="size-3" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={6} className="z-50">
          <Popover.Popup onClick={stop} className="max-w-72 rounded-lg border border-line bg-surface-1 px-3 py-2 text-xs leading-relaxed font-normal text-high shadow-lg outline-none">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
