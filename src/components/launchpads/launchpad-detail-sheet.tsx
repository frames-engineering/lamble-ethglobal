"use client";

import { ArrowUpRightIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

import { ChainStack } from "@/components/brand/chain-mark";
import { LetterMark } from "@/components/brand/letter-mark";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { hasCurve } from "@/components/launchpads/columns";
import { Delta } from "@/components/shared/delta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Launchpad } from "@/lib/data/types";
import { bps, compactNumber, compactUsd, int, percent, usd } from "@/lib/format";

const HistoryChart = dynamic(() => import("@/components/charts/history-chart").then((m) => m.HistoryChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={180} />,
});

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <dt className="text-2xs text-med">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-2 text-sm tabular-nums text-high">
        {value}
        {sub !== undefined && <span className="text-xs text-med">{sub}</span>}
      </dd>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-2xs font-medium tracking-widest text-med uppercase">{children}</p>;
}

interface LaunchpadDetailSheetProps {
  launchpad: Launchpad | null;
  onClose: () => void;
}

export function LaunchpadDetailSheet({ launchpad, onClose }: LaunchpadDetailSheetProps) {
  // Keep the last launchpad mounted while the sheet animates closed.
  const [last, setLast] = useState<Launchpad | null>(launchpad);
  if (launchpad && launchpad !== last) setLast(launchpad);
  const lp = launchpad ?? last;
  const fm = lp?.feeModel;

  return (
    <Sheet
      open={Boolean(launchpad)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="gap-0 overflow-y-auto">
        {lp && fm && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3 pr-8">
                <LetterMark name={lp.name} color={lp.brandColor} size={40} src={lp.logoSrc} />
                <div className="min-w-0">
                  <SheetTitle>{lp.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <ChainStack chains={lp.chains} size={13} max={6} />
                    <a
                      href={lp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate transition-colors hover:text-link"
                    >
                      {lp.domain}
                    </a>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-5">
              <p className="text-sm leading-relaxed text-med">{lp.description}</p>

              {lp.bestFor.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lp.bestFor.map((t) => (
                    <Badge key={t} variant="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Daily fees · 30 days</Label>
                  <Delta value={lp.metrics.d30.change} className="text-xs" />
                </div>
                <HistoryChart
                  series={[{ id: lp.slug, label: "Fees", color: lp.brandColor, points: lp.metrics.history30d }]}
                  kind="area"
                  range="ALL"
                  height={180}
                  format={(v) => compactUsd(v)}
                  tickFormat="day"
                />
              </div>

              <div>
                <Label>Activity</Label>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Stat label="Fees 24h" value={compactUsd(lp.metrics.h24.fees)} sub={<Delta value={lp.metrics.h24.change} />} />
                  <Stat label="Fees 7d" value={compactUsd(lp.metrics.d7.fees)} sub={<Delta value={lp.metrics.d7.change} />} />
                  <Stat label="Fees 30d" value={compactUsd(lp.metrics.d30.fees)} />
                  <Stat
                    label="Revenue 7d"
                    value={compactUsd(lp.metrics.d7.revenue)}
                    sub={`${percent(lp.metrics.d7.fees !== null && lp.metrics.d7.fees > 0 && lp.metrics.d7.revenue !== null ? (lp.metrics.d7.revenue / lp.metrics.d7.fees) * 100 : null, { digits: 0 })} of fees`}
                  />
                  <Stat label={lp.activityObservation ? 'Indexed launches 24h' : 'Launched 24h'} value={int(lp.metrics.launched24h ?? lp.activityObservation?.indexedCreated24 ?? null)} sub={`7d avg ${compactNumber(lp.metrics.launched7dAvg ?? lp.activityObservation?.indexed7dAvg ?? null)}`} />
                  {hasCurve(lp) !== false ? (
                    <Stat label={lp.activityObservation ? 'Indexed completions 24h' : 'Graduated 24h'} value={int(lp.metrics.graduated24h ?? lp.activityObservation?.indexedCompleted24 ?? null)} sub={`${percent(lp.metrics.graduationRate7d ?? lp.activityObservation?.indexed7dCompletionRate ?? null)} rate`} />
                  ) : (
                    <Stat label="Graduated 24h" value="—" sub="no bonding curve" />
                  )}
                </dl>
              </div>

              <div>
                <Label>Fee model</Label>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Stat label="Bonding curve" value={hasCurve(lp) === null ? "Unknown / version dependent" : hasCurve(lp) ? "Yes" : "No"} />
                  <Stat label="Swap fee" value={bps(fm.tradingFeeBps)} />
                  <Stat label="Creator share" value={percent(fm.creatorShareBps === null ? null : fm.creatorShareBps / 100, { digits: 0 })} sub="of fees" />
                  <Stat label="Launch cost" value={fm.launchCostUsd === 0 ? "Free" : usd(fm.launchCostUsd)} />
                  <Stat label="Graduation" value={hasCurve(lp) === false ? "Not applicable" : usd(fm.graduationTargetUsd)} sub={hasCurve(lp) ? "mcap" : undefined} />
                  <Stat label="Graduates to" value={<span className="normal-nums">{lp.graduatesTo ?? "Unknown"}</span>} />
                </dl>
                {fm.note && <p className="mt-3 text-xs leading-relaxed text-med">{fm.note}</p>}
              </div>

              {lp.routingNotes.length > 0 && <div>
                <Label>Why LAMBLE would route here</Label>
                <ul className="flex flex-col gap-1.5 text-sm leading-snug text-med">
                  {lp.routingNotes.map((n) => (
                    <li key={n} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-med" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>}
            </div>

            <SheetFooter className="flex-row">
              <Button type="button" disabled className="flex-1">Launch here</Button>
              <Button variant="secondary" nativeButton={false} render={<a href={lp.url} target="_blank" rel="noopener noreferrer" />}>
                Website
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
