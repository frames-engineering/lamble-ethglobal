"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "cn"

/**
 * Tabs in two flavours from the design system:
 * - segmented (pen "Segmented Tabs"): surface-3 track, active tab = surface-4 (one step up, no fill color).
 * - chips (Backpack range tabs 1d / 1w / 1m): transparent track, active = surface-3.
 */
type TabsListVariant = "segmented" | "chips"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  variant = "segmented",
  ...props
}: TabsPrimitive.List.Props & { variant?: TabsListVariant }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list inline-flex w-fit items-center text-med",
        variant === "segmented"
          ? "h-10 gap-0.5 rounded-lg bg-surface-3 p-1"
          : "h-8 gap-1 rounded-lg bg-transparent p-0",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 text-[13px] font-semibold text-med transition-colors outline-none select-none hover:text-high focus-visible:ring-1 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50 data-active:text-high [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=segmented]/tabs-list:data-active:bg-surface-4",
        "group-data-[variant=chips]/tabs-list:text-xs group-data-[variant=chips]/tabs-list:font-medium group-data-[variant=chips]/tabs-list:text-med/70 group-data-[variant=chips]/tabs-list:hover:bg-surface-3 group-data-[variant=chips]/tabs-list:hover:text-high group-data-[variant=chips]/tabs-list:data-active:bg-surface-3 group-data-[variant=chips]/tabs-list:data-active:text-high",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
