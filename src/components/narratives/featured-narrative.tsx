"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

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
type Range = '24h' | '7d' | '30d';
const RANGE_NOTE: Record<Range, string> = { '24h': 'Hourly volume, last 24h', '7d': 'Hourly volume, last 7 days', '30d': 'Daily volume, last 30 complete UTC days; current coins applied to past days' };

export function FeaturedNarrative({ narrative: n, launchpads }: FeaturedNarrativeProps) {
  const [range, setRange] = useState<Range>('24h');
  const ranges = (['24h', '7d', '30d'] as const).filter((r) => r === '24h' || (r === '7d' ? n.extendedSeries : n.dailySeries));
  const chartSeries = (range === '30d' && n.dailySeries) || (range === '7d' && n.extendedSeries) || n.series;
  const total = range === '30d' ? n.volume30dUsd : range === '7d' ? n.volume7dUsd : n.volume24hUsd;
  const venues: ShareItem[] = (n.topLaunchpads ?? [])
    .flatMap((t) => {
      const lp = launchpads[t.slug];
      return lp ? [{ id: lp.slug, name: lp.name, color: lp.brandColor, src: lp.logoSrc, share: t.share }] : [];
    })
    .slice(0, 3);
  const origins = [...new Set(n.contenders.map((c) => c.launchpadSlug).filter(Boolean))]
    .flatMap((slug) => slug && launchpads[slug] ? [launchpads[slug]] : []);

  return (
    <article className="rounded-2xl bg-surface-1 p-5 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        {/* Info column */}
        <div className="flex min-w-0 flex-col">
          <h3 className="text-lg leading-tight font-bold tracking-tight text-high md:text-xl">{n.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-med">{n.summary}</p>
          {n.volumeCaveat && (
            <p role="note" title={`Flagged when a coin's 24h pool volume exceeds ${n.volumeCaveat.threshold}× its market cap.`} className="mt-3 flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-med">
              <span aria-hidden="true" className="font-semibold text-warning">!</span>
              <span><span className="font-medium text-warning">Volume caveat:</span> {n.volumeCaveat.text}</span>
            </p>
          )}

          {/* List headers match the screener's column headers (TableHead). */}
          <div className="mt-5">
            <p className="border-b border-line pb-1 text-2xs text-med">Top coins</p>
            <ShareList items={n.contenders.slice(0, 5).map((c) => ({ ...c, share: c.measuredVolumeShare ?? null, shareLabel: "Share of measured 24h volume across all pools" }))} />
          </div>

          <div className="mt-5">
            <p className="border-b border-line pb-1 text-2xs text-med">{venues.length ? 'Top launchpads' : 'Launchpads'}</p>
            {venues.length > 0 ? <ShareList items={venues} /> : origins.length ? <ul title="Verified origins of the identified coins; launch-share rankings are unavailable." className="mt-2 flex flex-wrap gap-2">{origins.map((lp) => <li key={lp.slug}><a href={lp.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border border-line px-3 py-2 text-sm text-high hover:bg-surface-2">{lp.name}</a></li>)}</ul> : <p className="mt-2 text-sm text-med">—</p>}
          </div>
        </div>

        {/* Chart column: hourly volume across the coins in this narrative, last 24h */}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-3">
            <div title={`${RANGE_NOTE[range]}. ${n.provenance?.volumeScope ?? ''}`}><p className="text-xs text-med">Total volume</p><p className="mt-1 text-xl font-semibold tabular-nums text-high">{compactUsd(total ?? null)}</p></div>
            {ranges.length > 1 && <div className="flex gap-1" role="group" aria-label="Narrative chart period">{ranges.map((period) => <button key={period} type="button" aria-pressed={range === period} onClick={() => setRange(period)} className={`rounded-md px-3 py-1 text-xs ${range === period ? 'bg-surface-2 text-high' : 'text-med'}`}>{period}</button>)}</div>}
          </div>
          <div className="mt-6 h-[240px] md:min-h-[300px] md:flex-1">
            <HistoryChart
              series={chartSeries}
              kind="line"
              height="100%"
              format={formatVolume}
              tickFormat={range === '24h' ? 'hour' : 'day'}
              floorZero
              tooltip
              drawIn
            />
          </div>
        </div>
      </div>
    </article>
  );
}
