import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { AgentAccess } from "@/components/research/agent-access";
import { CoinLabel, EvidenceList } from "@/components/research/links";
import { Stat, formatValue } from "@/components/research/measure";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiPaths } from "@/lib/lamble/api/paths";
import { isWeekId } from "@/lib/lamble/core/time";
import { BadRequest, type EditionDoc, NotFound, articlesFor, editionIndex, getEdition, loadRelease } from "@/lib/lamble/service";
import type { Evidence } from "@/lib/lamble/release/types";

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
const share = (v: number | null) => (v === null ? "—" : formatValue(100 * v, "percent"));
const coin = (tokenId: string, symbol: string | null) => <CoinLabel chain={tokenId.split(":")[0]!} address={tokenId.split(":").slice(1).join(":")} symbol={symbol} />;

/** Evidence as recorded in the edition's release; the published release when that one is no longer retained. */
function evidenceIndex(releaseId: string | null): Record<string, Evidence> {
  try {
    return loadRelease(releaseId ?? undefined).data.evidence;
  } catch {
    return loadRelease().data.evidence;
  }
}

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
  const moved = narratives.filter((n) => n.entrants.length || n.exits.length);
  const [weekStart, weekEnd] = [Date.parse(e.interval.start) / 1000, Date.parse(e.interval.end) / 1000];
  const storyInWeek = (n: (typeof narratives)[number]) => Boolean(n.story?.notice) && n.story!.at >= weekStart && n.story!.at < weekEnd;
  const stories = narratives.filter((n) => storyInWeek(n) || n.signalsInWeek.length);
  const evidence = stories.length ? evidenceIndex(e.releaseId) : {};

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

        <Panel title="Inside each narrative" description="Continuing members are those open in both weeks; their change is computed on their own volume only. Entrants and exits are membership intervals that opened or closed during the week. Concentration is the top member's share of the narrative's volume and the Herfindahl index (0–10,000).">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Narrative</TableHead>
                  <TableHead className="text-right">Continuing</TableHead>
                  <TableHead className="text-right">Their change</TableHead>
                  <TableHead className="text-right">Entrants</TableHead>
                  <TableHead className="text-right">Exits</TableHead>
                  <TableHead className="text-right">Top member</TableHead>
                  <TableHead className="text-right">HHI</TableHead>
                  <TableHead className="text-right">Advancing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {narratives.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Link href={`/narratives/${n.slug}`} className="text-high hover:underline">
                        {n.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n.continuing.members}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(n.continuing.changePct)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {n.entrants.length}
                      {n.entrants.some((x) => x.volume !== null) && <span className="block text-2xs text-med">{formatValue(n.entrants.reduce((a, x) => a + (x.volume ?? 0), 0), "usd")}{n.entrants.some((x) => x.volume === null) && "+"}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n.exits.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{share(n.concentration.top1Share)}</TableCell>
                    <TableCell className="text-right tabular-nums">{n.concentration.hhi === null ? "—" : Math.round(n.concentration.hhi).toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {n.breadth.withPrices ? `${n.breadth.advancing} of ${n.breadth.withPrices}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {moved.length > 0 && (
            <div className="mt-4 grid gap-4 border-t border-divider pt-4 md:grid-cols-2">
              {moved.map((n) => (
                <div key={n.id} className="text-xs">
                  <p className="text-high">{n.title}</p>
                  {n.entrants.length > 0 && (
                    <p className="mt-1 text-med">
                      Joined:{" "}
                      {n.entrants.map((x, i) => (
                        <span key={x.tokenId}>
                          {i > 0 && ", "}
                          {coin(x.tokenId, x.symbol)} ({formatValue(x.volume, "usd")})
                        </span>
                      ))}
                    </p>
                  )}
                  {n.exits.length > 0 && (
                    <p className="mt-1 text-med">
                      Left:{" "}
                      {n.exits.map((x, i) => (
                        <span key={x.tokenId}>
                          {i > 0 && ", "}
                          {coin(x.tokenId, x.symbol)} (prior week {formatValue(x.volumePrior, "usd")})
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Holder and bottoming changes" description={e.signals ? `${e.signals.bottoming.note} Method ${e.signals.bottoming.methodVersion}.` : "Not part of this edition's method version."}>
            {e.signals ? (
              <div className="flex flex-col gap-3 text-xs">
                <p className="text-med">
                  {e.signals.bottoming.evaluated} member coin(s) evaluated at {formatDateTime(e.signals.bottoming.from)} and {formatDateTime(e.signals.bottoming.to)}. At the cutoff:{" "}
                  {Object.entries(e.signals.bottoming.atEnd)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => `${v} ${k.replaceAll("_", " ")}`)
                    .join(", ")}
                  .
                </p>
                {e.signals.bottoming.transitions.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {e.signals.bottoming.transitions.slice(0, 12).map((t) => (
                      <li key={t.tokenId}>
                        {coin(t.tokenId, t.symbol)}: <span className="text-med">{t.from.label}</span> → <span className="text-high">{t.to.label}</span>
                        {t.drawdownCurrent !== null && <span className="text-low"> ({formatValue(100 * t.drawdownCurrent, "percent")} below peak)</span>}
                      </li>
                    ))}
                    {e.signals.bottoming.transitions.length > 12 && <li className="text-low">+{e.signals.bottoming.transitions.length - 12} more in the week dataset.</li>}
                  </ul>
                ) : (
                  <p className="text-med">No member changed bottoming state, stage or label during the week.</p>
                )}
                <p className="border-t border-divider pt-3 text-med">
                  Liquidity-to-size measured at both times for {e.signals.liquidityToSize.measured} of {e.signals.liquidityToSize.of} members: {e.signals.liquidityToSize.rising} rising, {e.signals.liquidityToSize.falling} falling. {e.signals.liquidityToSize.note}
                </p>
                {e.signals.liquidityToSize.largestMoves.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {e.signals.liquidityToSize.largestMoves.slice(0, 5).map((x) => (
                      <li key={x.tokenId} className="flex justify-between gap-3">
                        {coin(x.tokenId, x.symbol)}
                        <span className="tabular-nums text-med">
                          {share(x.from)} → {share(x.to)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-low">{e.signals.holders.note}</p>
              </div>
            ) : (
              <p className="text-xs text-med">This revision predates the weekly holder and bottoming section.</p>
            )}
          </Panel>
          <Panel title="Stories and evidence" description="Story notices and signals recorded for narratives during the week, with the sources behind them. Notices are quoted as recorded; they are not LAMBLE's claims.">
            {stories.length ? (
              <ul className="flex flex-col gap-4">
                {stories.map((n) => (
                  <li key={n.id} className="text-xs">
                    <Link href={`/narratives/${n.slug}`} className="text-high hover:underline">
                      {n.title}
                    </Link>
                    {storyInWeek(n) && (
                      <p className="mt-1 text-med">
                        {formatDate(n.story!.at)}: {n.story!.notice}
                      </p>
                    )}
                    {n.signalsInWeek.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-med">
                        {n.signalsInWeek.map((x) => (
                          <li key={x.id}>
                            {x.at !== null && `${formatDate(x.at)}: `}
                            {x.title}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2">
                      <EvidenceList ids={[...(storyInWeek(n) && n.story?.evidenceId ? [n.story.evidenceId] : []), ...n.signalsInWeek.map((x) => x.id)]} index={evidence} limit={4} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No story notice or signal was recorded for any narrative this week.</p>
            )}
          </Panel>
        </div>

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
