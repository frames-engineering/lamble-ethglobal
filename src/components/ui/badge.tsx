import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/** Pill badge (pen "Status Badge"): soft background + accent text, 12px/500. */
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2 text-xs font-semibold leading-none transition-colors focus-visible:ring-1 focus-visible:ring-focus [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-surface-3 text-med",
        positive: "bg-positive-soft text-positive",
        negative: "bg-negative-soft text-negative",
        warning: "bg-warning-soft text-warning",
        link: "bg-link-soft text-link",
        violet: "bg-violet-soft text-violet",
        outline: "border-line-med bg-transparent text-med",
        solid: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  dot = false,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Leading live dot with a soft ping. */
    dot?: boolean
  }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {dot && (
              <span aria-hidden className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-current" />
              </span>
            )}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
