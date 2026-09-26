"use client";

import { Sparkline } from "@/components/charts/sparkline";
import type { Narrative } from "@/lib/data/types";
import { compactNumber, compactUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NarrativeCardProps {
  narrative: Narrative;
  selected: boolean;
  onSelect: (slug: string) => void;
}

export function NarrativeCard({ narrative: n, selected, onSelect }: NarrativeCardProps) {
  const points = n.series[0]?.points ?? [];
  // Tone follows the 24h volume line the sparkline draws.
  const up = (points[points.length - 1]?.value ?? 0) >= (points[0]?.value ?? 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(n.slug)}
      aria-pressed={selected}
      className={cn(
        "flex w-full snap-start flex-col rounded-xl border bg-surface-1 p-4 text-left transition-colors outline-none hover:border-line-med focus-visible:ring-1 focus-visible:ring-focus",
        selected ? "border-line-med" : "border-transparent",
      )}
    >
      <p className="line-clamp-1 text-sm font-semibold text-high">{n.title}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex gap-5">
          <div>
            <p className="text-lg font-medium tabular-nums text-high">{compactNumber(n.launches24h)}</p>
            <p className="text-2xs text-med">launches 24h</p>
          </div>
          <div>
            <p className="text-lg font-medium tabular-nums text-high">{compactUsd(n.volume24hUsd)}</p>
            <p className="text-2xs text-med">volume 24h</p>
          </div>
        </div>
        {points.length > 1 && (
          <Sparkline
            points={points}
            width={80}
            height={26}
            className={cn("h-[26px] w-20", up ? "text-positive" : "text-negative")}
            id={n.slug}
          />
        )}
      </div>
    </button>
  );
}
