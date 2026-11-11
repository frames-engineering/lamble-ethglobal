"use client";

import { SearchIcon, XIcon } from "lucide-react";

import { ChainMark } from "@/components/brand/chain-mark";
import { TIMEFRAMES } from "@/components/launchpads/columns";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chainInfo } from "@/lib/data/chains";
import type { ChainId, Timeframe } from "@/lib/data/types";

interface TableToolbarProps {
  query: string;
  onQuery: (q: string) => void;
  chains: ChainId[];
  onChains: (c: ChainId[]) => void;
  availableChains: ChainId[];
  tf: Timeframe;
  onTf: (tf: Timeframe) => void;
}

/** Chain chips as pills, pressed on the active background like Segmented. */
const CHIP = "h-7 rounded-full border-line px-3 font-normal aria-pressed:border-transparent aria-pressed:bg-active data-pressed:border-transparent data-pressed:bg-active hover:bg-hover";

export function TableToolbar({ query, onQuery, chains, onChains, availableChains, tf, onTf }: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-64">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-med" />
          <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search launchpads" aria-label="Search launchpads" className="pr-8 pl-9" />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-med transition-colors duration-150 before:absolute before:-inset-2 hover:text-high"
            >
              <XIcon aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
        <Segmented label="Timeframe" options={TIMEFRAMES} value={tf} onChange={onTf} />
      </div>

      {/* Phones: one row that scrolls sideways to the screen edge (the -my/py keeps focus rings inside the clip). */}
      <div className="-mx-5 -my-1 flex items-center gap-1.5 overflow-x-auto px-5 py-1 scrollbar-none md:mx-0 md:my-0 md:flex-wrap md:overflow-visible md:px-0 md:py-0">
        <Toggle variant="outline" pressed={chains.length === 0} onPressedChange={() => onChains([])} className={CHIP}>
          All chains
        </Toggle>
        <ToggleGroup variant="outline" multiple value={chains} onValueChange={(v) => onChains(v as ChainId[])} aria-label="Filter by chain" className="flex-nowrap gap-1.5 md:flex-wrap">
          {availableChains.map((c) => (
            <ToggleGroupItem key={c} value={c} className={`${CHIP} pl-1.5`}>
              <ChainMark chain={c} size={16} title={false} />
              {chainInfo(c).name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
