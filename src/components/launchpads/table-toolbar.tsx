"use client";

import { SearchIcon, XIcon } from "lucide-react";

import { ChainMark } from "@/components/brand/chain-mark";
import { TIMEFRAMES } from "@/components/launchpads/columns";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function TableToolbar({ query, onQuery, chains, onChains, availableChains, tf, onTf }: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-med" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search launchpads"
            aria-label="Search launchpads"
            className="w-48 pr-8 pl-8 sm:w-56"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-med hover:text-high"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <Tabs value={tf} onValueChange={(v) => onTf(v as Timeframe)}>
          <TabsList variant="chips" aria-label="Timeframe">
            {TIMEFRAMES.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="h-7 px-2.5 text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Phones: one row that scrolls sideways, bleeding into the card's padding (the -my/py keeps focus rings
          inside the clip). From md it wraps like before. */}
      <div className="-mx-4 -my-1 flex items-center gap-2 overflow-x-auto px-4 py-1 scrollbar-none md:mx-0 md:my-0 md:flex-wrap md:overflow-visible md:px-0 md:py-0">
        <Toggle pressed={chains.length === 0} onPressedChange={() => onChains([])}>
          All
        </Toggle>
        <ToggleGroup
          multiple
          value={chains}
          onValueChange={(v) => onChains(v as ChainId[])}
          aria-label="Filter by chain"
          className="flex-nowrap md:flex-wrap"
        >
          {availableChains.map((c) => (
            <ToggleGroupItem key={c} value={c} className="pl-1">
              <ChainMark chain={c} size={20} title={false} />
              {chainInfo(c).name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
