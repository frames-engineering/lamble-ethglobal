import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { AgentAccess } from "@/components/research/agent-access";
import { CoinLabel } from "@/components/research/links";
import { Stat, formatValue } from "@/components/research/measure";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiPaths } from "@/lib/lambo/api/paths";
import { isWeekId } from "@/lib/lambo/core/time";
import { BadRequest, type EditionDoc, NotFound, articlesFor, editionIndex, getEdition } from "@/lib/lambo/service";

type Params = { week: string };

export function generateStaticParams(): Params[] {
  return editionIndex().map((e) => ({ week: e.id }));
}

function load(week: string, revision?: number): EditionDoc | null {
  if (!isWeekId(week)) return null;
  try {
    return getEdition(week, revision);
  } catch (e) {
    if (e instanceof NotFound || e instanceof BadRequest) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const e = load((await params).week);
  if (!e) return { title: "Edition not found", robots: { index: false } };
  const description = `${e.title}, ${formatDate(e.interval.start)} to ${formatDate(Date.parse(e.interval.end) / 1000 - 1)}: launchpad fees, creator earnings, narrative volume and what to watch. Status: ${e.status}.`;
  return { title: e.title, description, alternates: { canonical: `/market/${e.id}` }, openGraph: { title: e.title, description, url: `/market/${e.id}` } };
}

const pct = (v: number | null) => formatValue(v, "signed-percent");

export default async function EditionPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { week } = await params;
  const sp = await searchParams;
  const revParam = typeof sp.revision === "string" && /^\d{1,4}$/.test(sp.revision) ? Number(sp.revision) : undefined;
  const e = load(week, revParam);
  if (!e) notFound();
  const entry = editionIndex().find((x) => x.id === e.id)!;
  const m = e.market;
  const articles = articlesFor({ week: e.id });
  const narratives = [...e.narratives].sort((a, b) => b.volume.observed - a.volume.observed);
  const lastDay = formatDate(Date.parse(e.interval.end) / 1000 - 1);

  return (
    <Container>
      <PageHeader
        eyebrow={
          <Link href="/market" className="hover:text-high">
            Market / Weekly editions
          </Link>
        }
        title={e.title}
        description={
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={e.status === "complete" ? "positive" : "warning"}>{e.status}</Badge>
              <Badge variant="outline">Revision {e.revision}</Badge>
              <Badge variant="neutral">As known then</Badge>
            </div>
            <p>
              {formatDate(e.interval.start)} 00:00 UTC to {lastDay} 24:00 UTC (end exclusive), compared with{" "}
              <Link href={`/market/${e.comparison.id}`} className="text-link hover:underline">
                {e.comparison.id}
              </Link>
              . {e.provenance}
            </p>
          </div>
        }
        meta={
          <>
            <span>Data cutoff {formatDateTime(e.dataCutoff)}</span>
            <span>Method {e.methodVersion}</span>
            {e.releaseId && (
              <span>
                Release <code className="font-mono">{e.releaseId}</code>
              </span>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-4 pb-8">
        {entry.revisions.length > 1 && (
          <Note>
            Revisions:{" "}
            {entry.revisions.map((r, i) => (
              <span key={r.revision}>
                {i > 0 && " · "}
                {r.revision === e.revision ? (
                  <span className="text-high">r{r.revision}</span>
                ) : (
                  <Link href={`/market/${e.id}?revision=${r.revision}`} className="text-link hover:underline">
                    r{r.revision}
                  </Link>
                )}{" "}
                ({formatDate(r.builtAt)})
              </span>
            ))}
            {e.revisionReason && <span className="mt-1 block">What changed in r{e.revision}: {e.revisionReason.join("; ")}</span>}
            {e.methodChange && (
              <span className="mt-1 block">
                Method {e.methodChange.from} → {e.methodChange.to}; see{" "}
                <Link href="/methodology#weekly" className="text-link hover:underline">
                  methodology
                </Link>
                .
              </span>
            )}
          </Note>
        )}

        <Panel title="Completeness" description="An edition is complete only when every check passes; otherwise it is published as partial with the failing checks listed.">
          <ul className="grid gap-2 md:grid-cols-3">
            {e.checks.map((c) => (
              <li key={c.id} className="rounded-lg bg-surface-2 p-3 text-xs">
                <span className="flex items-center gap-2">
                  <Badge variant={c.passed ? "positive" : "warning"}>{c.passed ? "Pass" : "Fail"}</Badge>
                  <span className="text-high">{c.id}</span>
                </span>
                <p className="mt-2 text-med">{c.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Launchpad fee subtotal" className="lg:col-span-2" description={m.feeSubtotal.scope}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="This week">{formatValue(m.feeSubtotal.value, "usd")}</Stat>
              <Stat label={e.comparison.id}>{formatValue(m.feeSubtotal.prior, "usd")}</Stat>
              <Stat label="Change" sub={m.feeSubtotal.scopeChanged ? `On the ${m.feeSubtotal.comparedOn.length} venues in both weeks` : "Same venues in both weeks"}>
                {pct(m.feeSubtotal.changePct)}
              </Stat>
              <Stat label="Creator earnings" sub={`${pct(m.creatorEarnings.changePct)} vs ${e.comparison.id}`}>
                {formatValue(m.creatorEarnings.value, "usd")}
              </Stat>
            </dl>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Prior</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Creator earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...m.venues]
                    .sort((a, b) => (b.fees ?? -1) - (a.fees ?? -1))
                    .map((v) => (
                      <TableRow key={v.slug}>
                        <TableCell>
                          <Link href={`/launchpads/${v.slug}`} className="text-high hover:underline">
                            {v.name}
                          </Link>
                          {!v.included && (
                            <span className="block max-w-64 truncate text-2xs text-low" title={v.excludedReason ?? undefined}>
                              not in subtotal: {v.excludedReason}
                            </span>
                          )}
                          {v.missingFeeDays > 0 && <span className="block text-2xs text-warning">{v.missingFeeDays} unsettled day(s)</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatValue(v.fees, "usd")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatValue(v.feesPrior, "usd")}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(v.feesChangePct)}</TableCell>
                        <TableCell className="text-right tabular-nums">{v.shareOfSubtotal === null ? "—" : formatValue(100 * v.shareOfSubtotal, "percent")}</TableCell>
                        <TableCell className="text-right tabular-nums" title={v.creatorEarningsDefinition ?? undefined}>
                          {formatValue(v.creatorEarnings, "usd")}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="Indexed launches" description={m.indexedActivity.scope}>
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Created (rolling 7d)">{formatValue(m.indexedActivity.created7d, "count")}</Stat>
                <Stat label="Completed (rolling 7d)">{formatValue(m.indexedActivity.completed7d, "count")}</Stat>
                <Stat label="Period ratio" sub="Not a graduation probability">
                  {m.indexedActivity.periodCompletionRatio === null ? "—" : formatValue(100 * m.indexedActivity.periodCompletionRatio, "percent")}
                </Stat>
              </dl>
            </Panel>
            <Panel title="Breadth" description={e.breadth.note}>
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Advancing coins">{`${e.breadth.advancing} of ${e.breadth.withPrices} priced`}</Stat>
                <Stat label="Tracked in narratives">{e.breadth.tracked}</Stat>
                <Stat label="Top-5 volume share">{e.breadth.top5VolumeShare === null ? "—" : formatValue(100 * e.breadth.top5VolumeShare, "percent")}</Stat>
                <Stat label="Deduplicated volume" sub={`Sum of narrative totals ${formatValue(e.dedup.sumOfNarrativeTotals, "usd")}`}>
                  {formatValue(e.dedup.totalVolume, "usd")}
                </Stat>
              </dl>
            </Panel>
          </div>
        </div>

        <Panel title="Narratives this week" description="As known at the edition's cutoff. Volume is the member coins' trading in the week; the change is computed on the comparable basket only and withheld when that basket is too small.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Narrative</TableHead>
                  <TableHead>At week end</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Comparable basket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {narratives.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Link href={`/narratives/${n.slug}`} className="text-high hover:underline">
                        {n.title}
                      </Link>
                      {n.emerging && <span className="ml-2 text-2xs text-violet">new this week</span>}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-med">{(n.stateAtWeekEnd ?? "—").replace("_", " ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{n.members}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {n.volume.coverage === 0 ? (
                        <span className="text-xs text-med">not observed</span>
                      ) : (
                        <>
                          {formatValue(n.volume.observed, "usd")}
                          {!n.volume.complete && <span className="ml-1 text-2xs text-warning">partial</span>}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n.volume.coverage === null ? "—" : formatValue(100 * n.volume.coverage, "percent")}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(n.volumeChangePct)}</TableCell>
                    <TableCell className="text-xs text-med">
                      {n.comparable.members} of {"ofMembersInBothWeeks" in n.comparable ? n.comparable.ofMembersInBothWeeks : "?"}
                      {"sufficient" in n.comparable && !n.comparable.sufficient && <span className="block text-low">too small for a change</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <details className="mt-3 text-xs text-med">
            <summary className="cursor-pointer text-high">Other historical views of this week</summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {(["same_cohort", "current_basket"] as const).map((mode) => (
                <div key={mode}>
                  <p className="text-high">{e.alternateModes[mode].label}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {e.alternateModes[mode].narratives.map((n) => (
                      <li key={n.id} className="flex justify-between gap-3">
                        <span>{n.title}</span>
                        <span className="tabular-nums">
                          {formatValue(n.volume.observed, "usd")}
                          {!n.volume.complete && " partial"} · {pct(n.volumeChangePct)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="What to watch next week" description="Generated from the published rule thresholds, not forecasts.">
            {e.watch.length ? (
              <ul className="flex flex-col gap-2">
                {e.watch.map((w, i) => (
                  <li key={`${w.subject}-${i}`} className="text-xs leading-relaxed">
                    {w.tokenId ? (
                      <CoinLabel chain={w.tokenId.split(":")[0]!} address={w.tokenId.split(":").slice(1).join(":")} symbol={w.subject} />
                    ) : (
                      <span className="text-high">{w.subject}</span>
                    )}
                    <p className="text-med">{w.condition}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No rule threshold is close for any collected narrative.</p>
            )}
          </Panel>
          <Panel title="Multi-label overlap" description={e.dedup.note}>
            {e.dedup.overlap.length ? (
              <ul className="flex flex-col gap-1">
                {e.dedup.overlap.map((o) => (
                  <li key={o.tokenId} className="flex items-center justify-between gap-3 text-xs">
                    <CoinLabel chain={o.tokenId.split(":")[0]!} address={o.tokenId.split(":").slice(1).join(":")} symbol={null} />
                    <span className="text-med tabular-nums">
                      {o.narratives} narratives · {formatValue(o.volume, "usd")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No coin is in more than one narrative this week.</p>
            )}
            {articles.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-divider pt-4">
                {articles.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/research/${a.slug}`} className="text-sm text-high hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <AgentAccess
          subject={`the ${e.id} weekly edition`}
          discoveryPath={apiPaths.week(e.id)}
          paidPath={apiPaths.weekDataset(e.id)}
          kind="week-dataset"
          contents="The paid week dataset adds every revision with its cutoff, per-token daily rows behind each narrative total, all three historical modes in full, and venue-day fee rows."
        />
      </div>
    </Container>
  );
}
