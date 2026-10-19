import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { AgentAccess } from "@/components/research/agent-access";
import { SeriesChart } from "@/components/research/charts";
import { WatchButton } from "@/components/research/client";
import { SERIES } from "@/components/research/colors";
import { CoinLabel, EvidenceItem } from "@/components/research/links";
import { MeasureValue, Stat, formatValue } from "@/components/research/measure";
import { LIFECYCLE_LABEL, LifecycleBadge, TrendBadge, shownChange } from "@/components/research/narrative-bits";
import { EmptyState, Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiPaths } from "@/lib/lambo/api/paths";
import { displayPrice } from "@/lib/lambo/api/prices";
import type { Evidence, NarrativePublic } from "@/lib/lambo/release/types";
import { BadRequest, articlesFor, editionIndex, getEdition, loadRelease } from "@/lib/lambo/service";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return loadRelease().data.narratives.map((n) => ({ slug: n.slug }));
}

function find(slug: string): NarrativePublic | null {
  try {
    return loadRelease().narratives.get(slug) ?? null;
  } catch (e) {
    if (e instanceof BadRequest) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const n = find((await params).slug);
  if (!n) return { title: "Narrative not found", robots: { index: false } };
  const description = n.summary ?? `${n.title}: members, activity and history.`;
  return { title: n.title, description, alternates: { canonical: `/narratives/${n.slug}` }, openGraph: { title: n.title, description, url: `/narratives/${n.slug}` } };
}

/** Weekly editions in which this narrative appears (any revision's latest). */
function editionsWith(slug: string) {
  return editionIndex()
    .map((e) => {
      const ed = getEdition(e.id) as { narratives?: { slug: string; trend: string; volume: { observed: number; complete: boolean } }[] };
      const row = ed.narratives?.find((x) => x.slug === slug);
      return row ? { id: e.id, title: e.title, trend: row.trend, volume: row.volume } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .reverse();
}

function EvidenceGroup({ title, items, empty }: { title: string; items: Evidence[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-2xs font-medium tracking-wide text-med uppercase">{title}</p>
      {items.length ? (
        <ul className="flex flex-col gap-1.5">
          {items.slice(0, 10).map((e) => (
            <EvidenceItem key={e.id} evidence={e} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-low">{empty}</p>
      )}
    </div>
  );
}

export default async function NarrativePage({ params }: { params: Promise<Params> }) {
  const n = find((await params).slug);
  if (!n) notFound();
  const { data } = loadRelease();
  const change = shownChange(n);
  const editions = editionsWith(n.slug);
  const articles = articlesFor({ narrative: n.slug });
  const members = [...n.members].sort((a, b) => (b.volume7d ?? -1) - (a.volume7d ?? -1));
  const a = n.activity;
  const hourlySummary = `Hourly member volume for the 7 days ending ${formatDateTime(a.lastObservedAt)}; hours with any member unobserved are gaps.`;
  const dailySummary = `Daily member volume for 30 UTC days; the current basket is applied to earlier days (reconstructed), so this is not what was known on each day.`;

  return (
    <Container>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link href="/narratives" className="hover:text-high">
              Narratives
            </Link>
            {n.category && (
              <>
                <span aria-hidden>/</span>
                {n.category}
              </>
            )}
          </span>
        }
        title={n.title}
        description={
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <LifecycleBadge state={n.lifecycle.state} />
              <TrendBadge trend={n.trend} />
              {n.featured.featured && <Badge variant="link">Featured #{n.featured.rank}</Badge>}
            </div>
            {n.summary && <p>{n.summary}</p>}
          </div>
        }
        actions={<WatchButton id={`narrative:${n.slug}`} label="narrative" />}
        meta={
          <>
            <span>First observed {formatDate(n.firstObservedAt)}</span>
            <span>
              {LIFECYCLE_LABEL[n.lifecycle.state]} since {formatDate(n.lifecycle.since)}
            </span>
            <span>Data cutoff {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />
      <div className="flex flex-col gap-4 pb-8">
        {n.lifecycle.state !== "collected" && n.lifecycle.reason && <Note tone="warning">{n.lifecycle.reason}</Note>}

        <Panel id="activity" title="Activity" description={a.volumeScope}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Volume, last 24h of data">
              <MeasureValue measure={a.volume24h} format="usd" />
            </Stat>
            <Stat label="Volume, last 7 days of data">
              <MeasureValue measure={a.volume7d} format="usd" />
            </Stat>
            <Stat label="Volume, 30 days">
              <MeasureValue measure={a.volume30d} format="usd" />
            </Stat>
            <Stat label="Week over week" sub={change === null ? (n.trend === "new" ? "Not shown: first observed this week" : n.trend === "not_collected" ? "Not shown: not collected" : "Insufficient data") : "Last 7 complete days vs the 7 before"}>
              <span className="tabular-nums">{change === null ? "—" : formatValue(change, "signed-percent")}</span>
            </Stat>
          </dl>
          {a.caveat && (
            <Note tone="warning" className="mt-4">
              {a.caveat}
            </Note>
          )}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SeriesChart series={[{ id: "h", label: "Hourly volume", color: SERIES.link, points: a.hourly }]} format="usd" tickFormat="hour" kind="area" summary={hourlySummary} />
            <SeriesChart series={[{ id: "d", label: "Daily volume", color: SERIES.positive, points: a.daily }]} format="usd" kind="area" summary={dailySummary} />
          </div>
        </Panel>

        {n.story && (
          <Panel title="What it is now" description={n.story.observedAt ? `Observed ${formatDateTime(n.story.observedAt)}.` : undefined}>
            {n.story.notice && <p className="text-sm leading-relaxed text-high">{n.story.notice}</p>}
            {n.story.interpretation && <p className="mt-2 text-xs leading-relaxed text-med">{n.story.interpretation}</p>}
            {n.story.evidence && data.evidence[n.story.evidence] && (
              <ul className="mt-3">
                <EvidenceItem evidence={data.evidence[n.story.evidence]!} />
              </ul>
            )}
          </Panel>
        )}

        <Panel id="members" title={`Members (${n.memberCounts.open} open${n.memberCounts.ended ? `, ${n.memberCounts.ended} ended` : ""})`} description="Membership is a classification of what a coin is. Collection status says whether it is still measured daily.">
          {members.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coin</TableHead>
                    <TableHead>Member since</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead className="text-right">Vol 24h</TableHead>
                    <TableHead className="text-right">Vol 7d</TableHead>
                    <TableHead className="text-right">Share 7d</TableHead>
                    <TableHead className="text-right">Return 7d</TableHead>
                    <TableHead>Origin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const [chain, ...rest] = m.tokenId.split(":");
                    return (
                      <TableRow key={m.intervalId}>
                        <TableCell>
                          <CoinLabel chain={chain!} address={rest.join(":")} symbol={m.symbol} name={m.name} />
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDate(m.effectiveFrom)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-med">
                          {m.collection.replace("_", " ")}
                          {m.observedThrough && <span className="block text-low">through {formatDate(m.observedThrough)}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatValue(m.volume24h, "usd")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatValue(m.volume7d, "usd")}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.share7d === null ? "—" : formatValue(100 * m.share7d, "percent")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatValue(m.return7d, "ratio-percent")}</TableCell>
                        <TableCell className="text-xs text-med">{m.originVenue ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No members recorded" />
          )}
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Largest member's share" sub="7-day volume">
              {n.concentration.top1Share === null ? "—" : formatValue(100 * n.concentration.top1Share, "percent")}
            </Stat>
            <Stat label="HHI" sub="0–10,000; higher is more concentrated">
              {n.concentration.hhi === null ? "—" : formatValue(n.concentration.hhi, "count")}
            </Stat>
            <Stat label="Advancing" sub="Members with a positive 7d return, of those with prices">
              {n.breadth.withPrices ? `${n.breadth.advancing} of ${n.breadth.withPrices}` : "No priced members"}
            </Stat>
            <Stat label="Shared members">
              {n.overlap.length ? (
                <span className="flex flex-col gap-0.5">
                  {n.overlap.map((o) => (
                    <Link key={o.narrativeSlug} href={`/narratives/${o.narrativeSlug}`} className="text-xs text-link hover:underline">
                      {o.tokens} with {o.narrativeSlug}
                    </Link>
                  ))}
                </span>
              ) : (
                "None"
              )}
            </Stat>
          </dl>
        </Panel>

        <Panel title="Evidence" description={n.evidence.note}>
          <div className="grid gap-6 lg:grid-cols-3">
            <EvidenceGroup title="Project claims" items={n.evidence.projectClaims} empty="None recorded." />
            <EvidenceGroup title="Independent sources" items={n.evidence.independent} empty="No independent reporting recorded." />
            <EvidenceGroup title="Posts (sample)" items={n.evidence.posts} empty="No posts recorded." />
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Lifecycle">
            <ol className="flex flex-col gap-3">
              {n.lifecycle.history.map((h) => (
                <li key={`${h.state}-${h.from}`} className="text-xs leading-relaxed">
                  <span className="text-high">{LIFECYCLE_LABEL[h.state as NarrativePublic["lifecycle"]["state"]] ?? h.state}</span>
                  <span className="ml-2 text-low tabular-nums">
                    {formatDate(h.from)} → {h.to ? formatDate(h.to) : "now"}
                  </span>
                  {h.reason && <p className="mt-1 text-med">{h.reason}</p>}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="In the weekly editions and research">
            {editions.length ? (
              <ul className="flex flex-col gap-2">
                {editions.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/market/${e.id}`} className="text-high hover:underline">
                      {e.id}
                    </Link>
                    <span className="text-xs text-med tabular-nums">
                      {formatValue(e.volume.observed, "usd")}
                      {e.volume.complete ? "" : " partial"} · {e.trend.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">Not in a published weekly edition yet.</p>
            )}
            {articles.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-divider pt-4">
                {articles.map((x) => (
                  <li key={x.slug}>
                    <Link href={`/research/${x.slug}`} className="text-sm text-high hover:underline">
                      {x.title}
                    </Link>
                    <p className="text-2xs text-med">{formatDate(x.publishedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <AgentAccess
          subject={`the ${n.title} narrative (${n.slug})`}
          discoveryPath={apiPaths.narrative(n.slug)}
          paidPath={apiPaths.narrativeBundle(n.slug)}
          price={displayPrice("narrative-bundle")}
          contents="The paid narrative bundle adds every membership interval with evidence, per-member hourly and daily series, version history and lifecycle records, pinned to one release."
        />
      </div>
    </Container>
  );
}
