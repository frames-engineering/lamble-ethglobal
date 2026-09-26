import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Button, tuned to the token system:
 * primary = white on ink (dark) / ink on white (light), secondary = surface-3,
 * sizes 32 / 40 / 44px, radius 8 / 12 / 8, weight 500, hover opacity .9.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border border-transparent text-sm font-semibold transition-[background-color,color,opacity,border-color,box-shadow] duration-150 outline-none select-none focus-visible:ring-1 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-80 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-surface-4/60",
        positive: "bg-positive-solid text-[#14151b] hover:opacity-90",
        outline: "border-line-med bg-transparent text-high hover:bg-surface-3",
        ghost:
          "text-med hover:bg-surface-3 hover:text-high aria-expanded:bg-surface-3 aria-expanded:text-high data-popup-open:bg-surface-3 data-popup-open:text-high",
        text: "text-link hover:opacity-90",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded-lg px-3",
        default: "h-10 rounded-xl px-4",
        lg: "h-11 rounded-lg px-5",
        icon: "size-8 rounded-lg",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    compoundVariants: [
      { variant: ["text", "link"], size: ["sm", "default", "lg"], class: "h-8 rounded-lg px-0" },
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
