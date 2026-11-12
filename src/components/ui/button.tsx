import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Button, tuned to the token system (docs/design/overhaul-2026-11.md):
 * primary = white on the dark page (ink in light), outline = hairline border, ghost for icons; all 3px corners,
 * sizes 32 / 36 / 40px, weight 500, hover opacity .9, a 0.96 press. On touch screens a 44px-tall pseudo-element
 * extends the hit area without changing the look.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border border-transparent text-sm font-medium transition-[background-color,color,opacity,border-color,box-shadow,scale] duration-150 ease-out outline-none select-none focus-visible:ring-1 focus-visible:ring-focus active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-80 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:top-1/2 pointer-coarse:before:h-11 pointer-coarse:before:-translate-y-1/2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-surface-4/60",
        positive: "bg-positive-solid text-primary-foreground hover:opacity-90",
        outline: "border-line bg-transparent text-high hover:bg-hover",
        ghost:
          "text-med hover:bg-hover hover:text-high aria-expanded:bg-hover aria-expanded:text-high data-popup-open:bg-hover data-popup-open:text-high",
        text: "text-link hover:opacity-90",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded-sm px-3",
        default: "h-9 rounded-sm px-4",
        lg: "h-10 rounded-sm px-5",
        icon: "size-8 rounded-sm",
        "icon-sm": "size-7 rounded-sm",
        "icon-lg": "size-10 rounded-sm",
      },
    },
    compoundVariants: [
      { variant: ["text", "link"], size: ["sm", "default", "lg"], class: "h-8 rounded-sm px-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
