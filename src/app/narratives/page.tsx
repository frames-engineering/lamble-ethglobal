import type { Metadata } from "next";
import Link from "next/link";

import { Sparkline } from "@/components/charts/sparkline";
import { Container } from "@/components/layout/container";
import { MeasureValue, formatValue } from "@/components/research/measure";
import { LifecycleBadge, TrendBadge, shownChange } from "@/components/research/narrative-bits";
import { Note, PageHeader } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import type { NarrativePublic } from "@/lib/lamble/release/types";
import { loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Narratives",
  description: "Narratives in the crypto trenches: what each one is, which coins belong to it, how its trading activity is moving, and its full collection history.",
  alternates: { canonical: "/narratives" },
};

function NarrativeCard({ n }: { n: NarrativePublic }) {
  const change = shownChange(n);
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm light:shadow-black/8">
      <div className="flex flex-wrap items-center gap-2">
        <LifecycleBadge state={n.lifecycle.state} />
        <TrendBadge trend={n.trend} />
        {n.featured.featured && <span className="text-2xs text-med">Featured #{n.featured.rank}</span>}
      </div>
      <div>
        <h3 className="text-base font-semibold text-high">
          <Link href={`/narratives/${n.slug}`} className="hover:underline focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none">
            {n.title}
          </Link>
        </h3>
        {n.summary && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-med">{n.summary}</p>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-med">Volume 7d</dt>
          <dd className="text-right">
            <MeasureValue measure={n.activity.volume7d} format="usd" showState={false} />
          </dd>
          <dt className="text-med">Week change</dt>
          <dd className="text-right tabular-nums text-high">{change === null ? "—" : formatValue(change, "signed-percent")}</dd>
          <dt className="text-med">Members</dt>
          <dd className="text-right tabular-nums text-high">{n.memberCounts.open}</dd>
        </dl>
        <Sparkline points={n.activity.daily} width={112} height={36} className="text-link" fill />
      </div>
      {n.lifecycle.state !== "collected" && (
        <p className="text-2xs leading-relaxed text-low">
          Not collected since {formatDate(n.lifecycle.since)}; figures are from its last observed window ({formatDate(n.activity.lastObservedAt)}).
        </p>
      )}
    </li>
  );
}

export default function NarrativesPage() {
  const { data } = loadRelease();
  const collected = data.narratives.filter((n) => n.lifecycle.state === "collected").sort((a, b) => (a.featured.rank ?? 99) - (b.featured.rank ?? 99));
  const other = data.narratives.filter((n) => n.lifecycle.state !== "collected").sort((a, b) => b.lifecycle.since.localeCompare(a.lifecycle.since));
  return (
    <Container>
      <PageHeader
        eyebrow="Research"
        title="Narratives"
        description={
          <p>
            A narrative is a classification of what coins are, kept with its full history. Featured placement, collection and membership are separate: when a narrative leaves the featured six its coins stay members, and the record is never rewritten.
          </p>
        }
        meta={
          <>
            <span>
              {collected.length} collected · {other.length} paused or retired
            </span>
            <span>Data cutoff {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />
      <section aria-labelledby="collected" className="pb-8">
        <h2 id="collected" className="mb-3 text-sm font-semibold text-high">
          Collected now
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collected.map((n) => (
            <NarrativeCard key={n.id} n={n} />
          ))}
        </ul>
      </section>
      <section aria-labelledby="archive" className="pb-8">
        <h2 id="archive" className="mb-1 text-sm font-semibold text-high">
          Paused and retired
        </h2>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-med">These narratives are no longer collected daily. Their histories, memberships and evidence remain published; a paused narrative can be collected again.</p>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {other.map((n) => (
            <NarrativeCard key={n.id} n={n} />
          ))}
        </ul>
      </section>
      <Note className="mb-8">
        Volume is the sum of identified member coins&apos; trading across all their indexed pools, not all-market coverage. Week change is not shown for narratives first observed in the last seven days (their prior week predates the narrative) or for narratives no longer collected.
      </Note>
    </Container>
  );
}
