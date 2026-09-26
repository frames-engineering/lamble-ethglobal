"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

/** Pen "Toggle": 42×24 track, green when on, 18px white knob. */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-1 focus-visible:ring-focus data-[size=default]:h-6 data-[size=default]:w-[42px] data-[size=sm]:h-[18px] data-[size=sm]:w-8 data-checked:bg-positive-solid data-unchecked:bg-surface-4 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-sm transition-transform group-data-[size=default]/switch:size-[18px] group-data-[size=sm]/switch:size-3.5 group-data-[size=default]/switch:data-checked:translate-x-[21px] group-data-[size=default]/switch:data-unchecked:translate-x-[3px] group-data-[size=sm]/switch:data-checked:translate-x-[15px] group-data-[size=sm]/switch:data-unchecked:translate-x-[2px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
