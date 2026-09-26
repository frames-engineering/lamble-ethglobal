"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/** Chip toggle (Backpack range-tab look): rounded, 12px, med → high, pressed = surface-3. */
const toggleVariants = cva(
  "group/toggle inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent text-xs font-medium text-med transition-colors outline-none select-none hover:bg-surface-3 hover:text-high focus-visible:ring-1 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-surface-3 aria-pressed:text-high data-pressed:bg-surface-3 data-pressed:text-high [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-line-med bg-transparent aria-pressed:border-transparent data-pressed:border-transparent",
      },
      size: {
        default: "h-7 px-2.5",
        sm: "h-6 px-2 text-2xs",
        lg: "h-8 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
