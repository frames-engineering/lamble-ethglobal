"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChainStack } from "@/components/brand/chain-mark";
import { LetterMark } from "@/components/brand/letter-mark";
import { hasCurve } from "@/components/launchpads/columns";
import { Change } from "@/components/overview/format";
import { SeriesChart } from "@/components/research/charts";
import { launchpadColor } from "@/components/research/colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Launchpad } from "@/lib/data/types";
import { bps, compactNumber, compactUsd, int, percent, usd } from "@/lib/format";

const LINK = "transition-colors duration-150 hover:text-high";

function Stat({ label, value, sub, mono = true }: { label: ReactNode; value: ReactNode; sub?: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-med">{label}</dt>
      <dd className={`mt-1 text-base text-high ${mono ? "font-mono" : ""}`}>{value}</dd>
      {sub !== undefined && <dd className="mt-0.5 text-xs text-med">{sub}</dd>}
    </div>
  );
}

function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-high">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const share = (part: number | null | undefined, fees: number | null) => percent(fees !== null && fees > 0 && part != null ? (part / fees) * 100 : null, { digits: 0 });

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
      <SheetContent side="right" className="gap-0">
        {lp && fm && (
          <>
            {/* The header and footer stay put; only the body between them scrolls. */}
            <SheetHeader className="border-b border-divider pb-4">
              <div className="flex items-center gap-3 pr-8">
                <LetterMark name={lp.name} color={lp.brandColor} size={40} src={lp.logoSrc} />
                <div className="min-w-0">
                  <SheetTitle>{lp.name}</SheetTitle>
                  <SheetDescription className="mt-0.5 flex items-center gap-2 text-xs">
                    {lp.chains.length > 0 && <ChainStack chains={lp.chains} size={13} max={6} className="*:data-[slot=avatar]:ring-surface-1" />}
                    <a href={lp.url} target="_blank" rel="noopener noreferrer" className={`min-w-0 truncate ${LINK}`}>
                      {lp.domain}
                    </a>
                    {lp.twitter && (
                      <a href={`https://x.com/${lp.twitter}`} target="_blank" rel="noopener noreferrer" className={`min-w-0 truncate ${LINK}`}>
                        @{lp.twitter}
                      </a>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-6 p-5">
              {(lp.description || lp.bestFor.length > 0) && (
                <div className="flex flex-col gap-3">
                  {lp.description && <p className="text-sm leading-relaxed text-pretty text-med">{lp.description}</p>}
                  {lp.bestFor.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lp.bestFor.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Block
                title="Daily fees, 30 days"
                aside={
                  <span className="font-mono text-xs">
                    <Change value={lp.metrics.d30.change} />
                  </span>
                }
              >
                <SeriesChart
                  series={[{ id: lp.slug, label: "Fees", color: launchpadColor(lp.slug), points: lp.metrics.history30d }]}
                  kind="area"
                  height={180}
                  format="usd"
                  summary={`Daily fees for ${lp.name} over the last 30 settled UTC days.`}
                />
              </Block>

              <Block title="Activity">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Stat label="Fees 24h" value={compactUsd(lp.metrics.h24.fees)} sub={<><Change value={lp.metrics.h24.change} /> vs prior</>} />
                  <Stat label="Fees 7d" value={compactUsd(lp.metrics.d7.fees)} sub={<><Change value={lp.metrics.d7.change} /> vs prior</>} />
                  <Stat label="Fees 30d" value={compactUsd(lp.metrics.d30.fees)} />
                  <Stat label="Revenue 7d" value={compactUsd(lp.metrics.d7.revenue)} sub={`${share(lp.metrics.d7.revenue, lp.metrics.d7.fees)} of fees`} />
                  {(["d7", "d30"] as const).map((tf) => {
                    const m = lp.metrics[tf];
                    const label = `Creator earnings ${tf === "d7" ? "7d" : "30d"}`;
                    return (
                      <Stat
                        key={tf}
                        label={
                          <>
                            {label}
                            {tf === "d7" && <InfoTip label="How this venue defines creator earnings">{lp.provenance?.methodology?.SupplySideRevenue ?? "Supply-side revenue under the source methodology."}</InfoTip>}
                          </>
                        }
                        value={compactUsd(m.supplySide ?? null)}
                        sub={`${share(m.supplySide, m.fees)} of fees`}
                      />
                    );
                  })}
                  <Stat
                    label={
                      <>
                        {lp.activityObservation ? "Indexed launches 24h" : "Launched 24h"}
                        {lp.activityObservation && <InfoTip label="About indexed launch counts">{lp.activityObservation.coverage}</InfoTip>}
                      </>
                    }
                    value={int(lp.metrics.launched24h ?? lp.activityObservation?.indexedCreated24 ?? null)}
                    sub={`7d avg ${compactNumber(lp.metrics.launched7dAvg ?? lp.activityObservation?.indexed7dAvg ?? null)}`}
                  />
                  {hasCurve(lp) !== false ? (
                    <Stat
                      label={lp.activityObservation ? "Indexed completions 24h" : "Graduated 24h"}
                      value={int(lp.metrics.graduated24h ?? lp.activityObservation?.indexedCompleted24 ?? null)}
                      sub={`${percent(lp.metrics.graduationRate7d ?? lp.activityObservation?.indexed7dCompletionRate ?? null)} completions / launches, 7d`}
                    />
                  ) : (
                    <Stat label="Graduated 24h" value="—" sub="no bonding curve" />
                  )}
                </dl>
              </Block>

              <Block title="Fee model">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Stat label="Bonding curve" mono={false} value={hasCurve(lp) === null ? "Unknown / version dependent" : hasCurve(lp) ? "Yes" : "No"} />
                  <Stat label="Swap fee" value={bps(fm.tradingFeeBps)} />
                  <Stat label="Creator share" value={percent(fm.creatorShareBps === null ? null : fm.creatorShareBps / 100, { digits: 0 })} sub="of fees" />
                  <Stat label="Launch cost" mono={fm.launchCostUsd !== 0} value={fm.launchCostUsd === 0 ? "Free" : usd(fm.launchCostUsd)} />
                  <Stat label="Graduation" mono={hasCurve(lp) !== false} value={hasCurve(lp) === false ? "Not applicable" : usd(fm.graduationTargetUsd)} sub={hasCurve(lp) ? "mcap" : undefined} />
                  <Stat label="Graduates to" mono={false} value={lp.graduatesTo ?? "Unknown"} />
                </dl>
                {fm.note && <p className="mt-4 text-xs leading-relaxed text-med">{fm.note}</p>}
              </Block>

              {lp.routingNotes.length > 0 && (
                <Block title="Why LAMBLE would route here">
                  <ul className="flex flex-col gap-1.5 text-sm leading-snug text-med">
                    {lp.routingNotes.map((n) => (
                      <li key={n} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-med" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}
            </SheetBody>

            <SheetFooter className="flex-row">
              <Button nativeButton={false} render={<Link href={`/launchpads/${lp.slug}`} />} className="flex-1">
                Research page
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href={lp.url} target="_blank" rel="noopener noreferrer" />}>
                Website
                <ArrowUpRightIcon aria-hidden className="text-med" />
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
