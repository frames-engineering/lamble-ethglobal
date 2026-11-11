import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts/sparkline";
import { Container } from "@/components/layout/container";
import { Change } from "@/components/overview/format";
import { MeasureValue } from "@/components/research/measure";
import { LifecycleBadge, TrendBadge, shownChange } from "@/components/research/narrative-bits";
import { PageHeader, Section } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import type { Measure } from "@/lib/lamble/core/measure";
import type { NarrativePublic } from "@/lib/lamble/release/types";
import { loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Narratives",
  description: "Narratives in the crypto trenches: what each one is, which coins belong to it, how its trading activity is moving, and its full collection history.",
  alternates: { canonical: "/narratives" },
};

// Table idiom of the overview's trending tokens (components/overview/trending-tokens).
const TH = "h-9 px-2 text-xs font-normal whitespace-nowrap text-med first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const TD = "px-2 py-2.5 first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const LINK = "underline-offset-4 decoration-med/50 hover:underline";

/** The value MeasureValue prints, for sizing a bar: missing states draw no bar rather than a zero-length one. */
const shown = (m: Measure<number>) => (m.state === "observed" || m.state === "derived" || m.state === "stale" ? m.value : null);

/**
 * Title, then the first line of the summary as a hook on wider screens (the full text is on the narrative's
 * page). The cell takes the room the figures leave (w-full max-w-0) so the hook truncates instead of widening
 * the table.
 */
function NarrativeCell({ n, children }: { n: NarrativePublic; children?: ReactNode }) {
  return (
    <td className={`${TD} w-full max-w-0`}>
      <Link href={`/narratives/${n.slug}`} className={`font-medium text-high ${LINK}`}>
        {n.title}
      </Link>
      {n.summary && (
        <p className="mt-0.5 hidden truncate text-xs text-med md:block">
          {n.summary}
        </p>
      )}
      {children}
    </td>
  );
}

function Trends({ rows }: { rows: NarrativePublic[] }) {
  const max = Math.max(1, ...rows.map((n) => shown(n.activity.volume7d) ?? 0));
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={`${TH} hidden w-8 sm:table-cell`}>
              #
            </th>
            <th scope="col" className={TH}>
              Narrative
            </th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>
              Trend
            </th>
            <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>
              Coins
            </th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>
              Volume, 30d
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Volume, 7d
            </th>
            <th scope="col" className={`${TH} text-right`}>
              vs prior week
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => {
            const v = shown(n.activity.volume7d);
            return (
              <tr key={n.id} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-hover">
                <td className={`${TD} hidden font-mono text-xs text-med sm:table-cell`}>{n.featured.featured ? n.featured.rank : ""}</td>
                <NarrativeCell n={n}>
                  <p className="mt-1 text-xs text-med md:hidden">
                    <TrendBadge trend={n.trend} />
                  </p>
                </NarrativeCell>
                <td className={`${TD} hidden text-xs whitespace-nowrap text-med md:table-cell`}>
                  <TrendBadge trend={n.trend} />
                </td>
                <td className={`${TD} hidden text-right font-mono text-[13px] sm:table-cell`}>{n.memberCounts.open}</td>
                <td className={`${TD} hidden lg:table-cell`}>
                  <Sparkline id={`nr-${n.slug}`} points={n.activity.daily} width={96} height={20} strokeWidth={1.25} className="text-med" />
                </td>
                <td className={TD}>
                  <div className="relative ml-auto h-6 w-full max-w-40 sm:min-w-28">
                    <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar sm:block" style={{ width: `${((v ?? 0) / max) * 100}%` }} />
                    <span className="relative flex h-full items-center justify-end text-[13px] sm:pr-2">
                      <MeasureValue measure={n.activity.volume7d} format="usd" showState={false} />
                    </span>
                  </div>
                </td>
                <td className={`${TD} text-right font-mono text-[13px] whitespace-nowrap`}>
                  <Change value={shownChange(n)} empty={n.trend === "new" ? "new" : "—"} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Archive({ rows }: { rows: NarrativePublic[] }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={TH}>
              Narrative
            </th>
            <th scope="col" className={`${TH} hidden sm:table-cell`}>
              Status
            </th>
            <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>
              Coins
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              Window ends
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Volume, 7d
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-hover">
              <NarrativeCell n={n}>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-med sm:hidden">
                  <LifecycleBadge state={n.lifecycle.state} />
                  <span>window to {formatDate(n.activity.lastObservedAt)}</span>
                </p>
              </NarrativeCell>
              <td className={`${TD} hidden text-xs whitespace-nowrap text-med sm:table-cell`}>
                <LifecycleBadge state={n.lifecycle.state} />
                <span className="mt-0.5 block">since {formatDate(n.lifecycle.since)}</span>
              </td>
              <td className={`${TD} hidden text-right font-mono text-[13px] sm:table-cell`}>{n.memberCounts.open}</td>
              <td className={`${TD} hidden text-right text-xs whitespace-nowrap text-med md:table-cell`}>{formatDate(n.activity.lastObservedAt)}</td>
              <td className={`${TD} text-right text-[13px] whitespace-nowrap`}>
                <MeasureValue measure={n.activity.volume7d} format="usd" showState={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NarrativesPage() {
  const { data } = loadRelease();
  const collected = data.narratives.filter((n) => n.lifecycle.state === "collected").sort((a, b) => (a.featured.rank ?? 99) - (b.featured.rank ?? 99));
  const other = data.narratives.filter((n) => n.lifecycle.state !== "collected").sort((a, b) => b.lifecycle.since.localeCompare(a.lifecycle.since));
  return (
    <Container>
      <PageHeader
        title="Narratives"
        description="The themes drawing volume in the trenches and the coins carrying each one. A narrative is a classification of what coins are, kept with its full history."
        meta={
          <>
            <span>
              {collected.length} collected · {other.length} paused or retired
            </span>
            <span className="lg:hidden">Data through {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />

      <Section
        id="collected"
        title="Collected now"
        description="Measured daily, in featured order. Featured placement, collection and membership are separate: when a narrative leaves the featured six its coins stay members, and the record is never rewritten."
      >
        <Trends rows={collected} />
        <p className="mt-3 max-w-[72ch] text-xs leading-relaxed text-pretty text-med">
          Volume is the sum of identified member coins&apos; trading across all their indexed pools, not all-market coverage. Week change is not shown for narratives first observed in the last seven days (their prior week predates the
          narrative) or for narratives no longer collected.
        </p>
      </Section>

      <Section
        id="archive"
        title="Paused and retired"
        description="These narratives are no longer collected daily. Their histories, memberships and evidence remain published; a paused narrative can be collected again."
      >
        <Archive rows={other} />
        <p className="mt-3 max-w-[72ch] text-xs leading-relaxed text-pretty text-med">Volume is from each narrative&apos;s last observed seven days, ending on the date shown, so rows cover different weeks.</p>
      </Section>
    </Container>
  );
}
