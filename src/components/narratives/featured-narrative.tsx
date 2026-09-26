"use client";

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { ShareList, type ShareItem } from "@/components/narratives/share-list";
import type { Launchpad, Narrative } from "@/lib/data/types";
import { compactUsd } from "@/lib/format";

const HistoryChart = dynamic(() => import("@/components/charts/history-chart").then((m) => m.HistoryChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={280} />,
});

interface FeaturedNarrativeProps {
  narrative: Narrative;
  launchpads: Record<string, Launchpad>;
}

const formatVolume = (v: number) => compactUsd(v);

export function FeaturedNarrative({ narrative: n, launchpads }: FeaturedNarrativeProps) {
  const venues: ShareItem[] = n.topLaunchpads
    .flatMap((t) => {
      const lp = launchpads[t.slug];
      return lp ? [{ id: lp.slug, name: lp.name, color: lp.brandColor, src: lp.logoSrc, share: t.share }] : [];
    })
    .slice(0, 3);

  return (
    <article className="rounded-2xl bg-surface-1 p-5 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        {/* Info column */}
        <div className="flex min-w-0 flex-col">
          <h3 className="text-2xl leading-tight font-bold tracking-tight text-high md:text-3xl">{n.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-med">{n.summary}</p>

          <div className="mt-5">
            <p className="text-2xs font-medium tracking-widest text-med uppercase">Top coins</p>
            <ShareList items={n.contenders} />
          </div>

          <div className="mt-5">
            <p className="text-2xs font-medium tracking-widest text-med uppercase">Top launchpads</p>
            <ShareList items={venues} />
          </div>
        </div>

        {/* Chart column: hourly volume across the coins in this narrative, last 24h */}
        <div className="flex min-w-0 flex-col">
          <p className="text-xs text-med">Total volume</p>
          <div className="mt-6 h-[240px] md:min-h-[300px] md:flex-1">
            <HistoryChart
              series={n.series}
              kind="line"
              height="100%"
              format={formatVolume}
              tickFormat="hour"
              floorZero
              tooltip
            />
          </div>
        </div>
      </div>
    </article>
  );
}
