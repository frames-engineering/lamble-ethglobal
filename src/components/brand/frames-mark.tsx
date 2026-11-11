import { cn } from "@/lib/utils";

const LOGO = "/brand/frames-symbol.svg";

/**
 * The Frames symbol on a quiet tile (one surface step up), drawn in high ink. The SVG ships with black fills,
 * so it is used as a mask and takes its color from the theme instead. The mask fills the tile: the symbol's own
 * margin inside its viewBox gives the padding. Size it with `className` (the sidebar uses it favicon-sized).
 * Decorative: it always sits beside the name "Frames.ag", which names it for assistive tech.
 */
export function FramesMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-sm bg-surface-3", className)}>
      <span
        className="size-full bg-high"
        style={{
          maskImage: `url(${LOGO})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: `url(${LOGO})`,
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      />
    </span>
  );
}
