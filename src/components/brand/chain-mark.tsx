import { Avatar, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";
import { chainInfo } from "@/lib/data/chains";
import type { ChainId } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Size = 13 | 16 | 20;

interface ChainMarkProps {
  chain: ChainId;
  size?: Size;
  className?: string;
  title?: boolean;
}

const BOX: Record<Size, string> = { 13: "size-[13px]", 16: "size-4", 20: "size-5" };
const FONT: Record<Size, string> = { 13: "text-[7px]", 16: "text-[8px]", 20: "text-[10px]" };

/** Round chain icon from `public/chains/<chain>.svg`. */
export function ChainMark({ chain, size = 16, className, title = true }: ChainMarkProps) {
  const c = chainInfo(chain);
  return (
    <Avatar className={cn(BOX[size], className)} title={title ? c.name : undefined} aria-label={c.name} role="img">
      {/* keepMounted puts the <img> in the server HTML, so icons paint before hydration. */}
      <AvatarImage src={`/chains/${chain}.svg`} alt="" keepMounted />
    </Avatar>
  );
}

interface ChainStackProps {
  chains: ChainId[];
  max?: number;
  size?: Size;
  className?: string;
}

/** Overlapping stack of chain marks with a "+n" overflow. */
export function ChainStack({ chains, max = 4, size = 16, className }: ChainStackProps) {
  const shown = chains.slice(0, max);
  const rest = chains.length - shown.length;
  return (
    <AvatarGroup
      className={cn("-space-x-1.5 *:data-[slot=avatar]:ring-card", className)}
      aria-label={chains.map((c) => chainInfo(c).name).join(", ")}
    >
      {shown.map((c) => (
        <ChainMark key={c} chain={c} size={size} title={false} />
      ))}
      {rest > 0 && (
        <AvatarGroupCount className={cn(BOX[size], FONT[size], "ring-card tabular-nums")} aria-hidden>
          +{rest}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}
