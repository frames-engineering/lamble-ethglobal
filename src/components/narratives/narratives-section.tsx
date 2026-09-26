"use client";

import { useMemo, useState } from "react";

import { Section } from "@/components/layout/section";
import { FeaturedNarrative } from "@/components/narratives/featured-narrative";
import { NarrativeCard } from "@/components/narratives/narrative-card";
import { useSearchParamValue } from "@/hooks/use-search-param";
import type { Launchpad, Narrative } from "@/lib/data/types";

interface NarrativesSectionProps {
  narratives: Narrative[];
  launchpads: Launchpad[];
}

export function NarrativesSection({ narratives, launchpads }: NarrativesSectionProps) {
  // ?narrative= selects the featured narrative on the client; the page stays static.
  const urlSlug = useSearchParamValue("narrative");
  const [picked, setPicked] = useState<string | null>(null);

  // Provider order is a curated selection, not a market-wide ranking.
  const visible = narratives.slice(0, 3);
  const slug = picked ?? urlSlug ?? visible[0]?.slug;
  const featured = visible.find((n) => n.slug === slug) ?? visible[0];
  const launchpadMap = useMemo(() => Object.fromEntries(launchpads.map((l) => [l.slug, l])), [launchpads]);

  const select = (next: string) => {
    setPicked(next);
    window.history.replaceState(null, "", `?narrative=${encodeURIComponent(next)}#narratives`);
  };

  return (
    <Section id="narratives" title="Trending narratives">
      {featured && (
        // Keyed remount + CSS fade keeps the swap instant; AnimatePresence's exit handshake made it lag.
        // The chart draws itself on mount (HistoryChart drawIn), which is the transition.
        <div key={featured.id} className="animate-in fade-in duration-200 motion-reduce:animate-none">
          <FeaturedNarrative narrative={featured} launchpads={launchpadMap} />
        </div>
      )}

      <div className="mt-3 -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
        {visible.map((n) => (
          <div key={n.id} className="w-[260px] shrink-0 md:w-auto">
            <NarrativeCard narrative={n} selected={n.slug === featured?.slug} onSelect={select} />
          </div>
        ))}
      </div>
    </Section>
  );
}
