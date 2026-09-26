import { chainInfo } from "@/lib/data/chains";
import type { ChainId } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface ChainMarkProps {
  chain: ChainId;
  size?: 13 | 16 | 20;
  className?: string;
  title?: boolean;
}

const FONT = { 13: "text-[7px]", 16: "text-[8px]", 20: "text-[10px]" } as const;

/** Small chain glyph: brand color circle + short code. */
export function ChainMark({ chain, size = 16, className, title = true }: ChainMarkProps) {
  const c = chainInfo(chain);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-line-med font-bold leading-none",
        FONT[size],
        className,
      )}
      style={{ width: size, height: size, backgroundColor: c.color, color: c.fg }}
      title={title ? c.name : undefined}
      aria-label={c.name}
      role="img"
    >
      {c.short.length > 2 ? c.short.charAt(0) : c.short}
    </span>
  );
}

interface ChainStackProps {
  chains: ChainId[];
  max?: number;
  size?: 13 | 16 | 20;
  className?: string;
}

/** Overlapping stack of chain marks with a "+n" overflow. */
export function ChainStack({ chains, max = 4, size = 16, className }: ChainStackProps) {
  const shown = chains.slice(0, max);
  const rest = chains.length - shown.length;
  return (
    <span className={cn("inline-flex items-center", className)} aria-label={chains.map((c) => chainInfo(c).name).join(", ")}>
      {shown.map((c, i) => (
        <ChainMark
          key={c}
          chain={c}
          size={size}
          title={false}
          className={cn("ring-2 ring-card", i > 0 && "-ml-1.5")}
        />
      ))}
      {rest > 0 && (
        <span className="ml-1 text-2xs text-med tabular-nums" aria-hidden>
          +{rest}
        </span>
      )}
    </span>
  );
}
