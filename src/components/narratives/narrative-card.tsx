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
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const up = first != null && last != null ? last >= first : null;

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
            <p className="text-lg font-medium tabular-nums text-high">{compactNumber(n.launches24h ?? n.contenders.length)}</p>
            <p className="text-2xs text-med">{n.launches24h === null ? 'tracked coins' : 'launches 24h'}</p>
          </div>
          <div>
            <p className="text-lg font-medium tabular-nums text-high">{compactUsd(n.volume24hUsd)}</p>
            <p className="text-2xs text-med" title={n.provenance?.volumeScope}>volume 24h</p>
          </div>
        </div>
        {points.length > 1 && (
          <Sparkline
            points={points}
            width={80}
            height={26}
            className={cn("h-[26px] w-20", up === null ? "text-med" : up ? "text-positive" : "text-negative")}
            id={n.slug}
          />
        )}
      </div>
    </button>
  );
}
