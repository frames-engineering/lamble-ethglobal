import { FRAMES_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

/** Attribution chip for pages that explain where the data comes from (sources, API). */
export function PoweredByFrames({ className }: { className?: string }) {
  return (
    <a
      href={FRAMES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex h-8 items-center gap-2 rounded-sm border border-line px-3 text-sm text-high transition-colors duration-150 hover:bg-hover", className)}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-positive" />
      Powered by Frames
    </a>
  );
}
