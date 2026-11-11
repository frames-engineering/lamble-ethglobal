import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChainMark } from "@/components/brand/chain-mark";
import { Container } from "@/components/layout/container";
import { Change, money } from "@/components/overview/format";
import { KeyFigure, KeyFigures } from "@/components/research/figures";
import { AgentAccess } from "@/components/research/agent-access";
import { SeriesChart } from "@/components/research/charts";
import { WatchButton } from "@/components/research/client";
import { SERIES } from "@/components/research/colors";
import { EvidenceItem, coinHref } from "@/components/research/links";
import { MeasureValue, Stat, formatValue } from "@/components/research/measure";
import { LIFECYCLE_LABEL, TrendBadge, shownChange } from "@/components/research/narrative-bits";
import { EmptyState, Note, PageHeader, Panel, Section } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { apiPaths } from "@/lib/lamble/api/paths";
import type { ChainId } from "@/lib/data/types";
import type { Evidence, NarrativeMemberPublic, NarrativePublic } from "@/lib/lamble/release/types";
import { BadRequest, articlesFor, editionIndex, getEdition, loadRelease } from "@/lib/lamble/service";

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

function EvidencePanel({ title, items, empty }: { title: string; items: Evidence[]; empty: string }) {
  return (
    <Panel title={title}>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.slice(0, 10).map((e) => (
            <EvidenceItem key={e.id} evidence={e} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-med">{empty}</p>
      )}
    </Panel>
  );
}

const COLLECTION_LABEL: Record<NarrativeMemberPublic["collection"], string> = {
  collected: "Collected",
  collection_paused: "Collection paused",
  inactive: "Inactive",
  ended: "Ended",
};

// Table idiom of the overview's trending tokens (components/overview/trending-tokens).
const TH = "h-9 px-2 text-xs font-normal whitespace-nowrap text-med first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const TD = "px-2 py-2.5 first:pl-3 last:pr-3 sm:px-3 sm:first:pl-4 sm:last:pr-4";
const LINK = "underline-offset-4 decoration-med/50 hover:underline";
const FIG = `${TD} text-right font-mono text-[13px] whitespace-nowrap`;

/**
 * The coins carrying the narrative, by 7-day volume, with bars to compare them at a glance. Members no longer
 * measured daily say so under their name, which is why their figures are empty. Phones keep the coin, its 7-day
 * volume and its return; the other columns join as the content column widens (sidebar from lg, so lg ≈ md).
 */
function MembersTable({ members }: { members: NarrativeMemberPublic[] }) {
  const max = Math.max(1, ...members.map((m) => m.volume7d ?? 0));
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={TH}>
              Coin
            </th>
            <th scope="col" className={`${TH} hidden xl:table-cell`}>
              Origin
            </th>
            <th scope="col" className={`${TH} hidden xl:table-cell`}>
              Member since
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Volume, 7d
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              Share, 7d
            </th>
            <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>
              Volume, 24h
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Return, 7d
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              Market cap
            </th>
            <th scope="col" className={`${TH} hidden text-right xl:table-cell`}>
              Liquidity
            </th>
            <th scope="col" className={`${TH} hidden text-right 2xl:table-cell`}>
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const [chain, ...rest] = m.tokenId.split(":");
            const address = rest.join(":");
            return (
              <tr key={m.intervalId} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-hover">
                <td className={TD}>
                  <span className="flex min-w-0 items-center gap-2">
                    <ChainMark chain={chain as ChainId} size={16} />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                        <Link href={coinHref(chain!, address)} className={`font-medium whitespace-nowrap text-high ${LINK}`}>
                          {m.symbol ?? `${address.slice(0, 6)}…`}
                        </Link>
                        {m.name && m.name !== m.symbol && (
                          <span title={m.name} className="max-w-24 truncate text-xs text-med xl:max-w-36">
                            {m.name}
                          </span>
                        )}
                      </span>
                      {m.collection !== "collected" && (
                        <span className="text-xs text-med">
                          {COLLECTION_LABEL[m.collection]}
                          {m.observedThrough && ` through ${formatDate(m.observedThrough)}`}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className={`${TD} hidden text-xs whitespace-nowrap text-med xl:table-cell`}>
                  {m.originVenue ? (
                    <Link href={`/launchpads/${m.originVenue}`} className={`hover:text-high ${LINK}`}>
                      {m.originVenue}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${TD} hidden text-xs whitespace-nowrap text-med xl:table-cell`}>{formatDate(m.effectiveFrom)}</td>
                <td className={TD}>
                  <div className="relative ml-auto h-6 w-full max-w-40 sm:min-w-28">
                    <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar sm:block" style={{ width: `${((m.volume7d ?? 0) / max) * 100}%` }} />
                    <span className="relative flex h-full items-center justify-end font-mono text-[13px] sm:pr-2">{money(m.volume7d)}</span>
                  </div>
                </td>
                <td className={`${FIG} hidden md:table-cell`}>{m.share7d === null ? "—" : formatValue(100 * m.share7d, "percent")}</td>
                <td className={`${FIG} hidden sm:table-cell`}>{money(m.volume24h)}</td>
                <td className={FIG}>
                  <Change value={m.return7d === null ? null : 100 * m.return7d} />
                </td>
                <td className={`${FIG} hidden md:table-cell`}>{money(m.marketCap)}</td>
                <td className={`${FIG} hidden xl:table-cell`}>{money(m.liquidity)}</td>
                <td className={`${FIG} hidden 2xl:table-cell`}>{formatValue(m.price, "price")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const titleOf = (slug: string) => data.narratives.find((x) => x.slug === slug)?.title ?? slug;

  return (
    <Container>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link href="/narratives" className="transition-colors duration-150 hover:text-high">
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
        actions={<WatchButton id={`narrative:${n.slug}`} label="narrative" />}
        meta={
          <>
            {/* "Not collected" would repeat the lifecycle line beside it. */}
            {n.trend !== "not_collected" && <TrendBadge trend={n.trend} />}
            {n.featured.featured && <span>Featured #{n.featured.rank}</span>}
            <span>First observed {formatDate(n.firstObservedAt)}</span>
            <span>
              {LIFECYCLE_LABEL[n.lifecycle.state]} since {formatDate(n.lifecycle.since)}
            </span>
            <span className="lg:hidden">Data through {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />

      {n.lifecycle.state !== "collected" && n.lifecycle.reason && (
        <Note tone="warning" className="mt-6">
          {n.lifecycle.reason}
        </Note>
      )}

      <KeyFigures className="mt-8">
        <KeyFigure label="Volume, 7d" sub="Last 7 days of data">
          <MeasureValue measure={a.volume7d} format="usd" className="flex-wrap" />
        </KeyFigure>
        <KeyFigure
          label="vs prior week"
          sub={change === null ? (n.trend === "new" ? "Not shown: first observed this week" : n.trend === "not_collected" ? "Not shown: not collected" : "Insufficient data") : "Last 7 complete days vs the 7 before"}
        >
          <Change value={change} />
        </KeyFigure>
        <KeyFigure label="Volume, 24h" sub="Last 24 hours of data">
          <MeasureValue measure={a.volume24h} format="usd" className="flex-wrap" />
        </KeyFigure>
        <KeyFigure label="Coins" sub={`${n.memberCounts.collected} measured daily`}>
          {n.memberCounts.open}
        </KeyFigure>
      </KeyFigures>
      <p className="mt-3 max-w-[72ch] text-xs leading-relaxed text-pretty text-med">{a.volumeScope}</p>
      {a.caveat && (
        <Note tone="warning" className="mt-3">
          {a.caveat}
        </Note>
      )}

      {n.story && (
        <Section id="story" title={n.lifecycle.state === "collected" ? "Why it’s moving" : "Latest reading"} description={n.story.observedAt ? `Observed ${formatDateTime(n.story.observedAt)}.` : undefined}>
          <div className="flex max-w-[72ch] flex-col gap-3 text-sm leading-relaxed text-pretty">
            {n.story.notice && <p className="text-high">{n.story.notice}</p>}
            {n.story.interpretation && <p className="text-med">{n.story.interpretation}</p>}
          </div>
          {n.story.evidence && data.evidence[n.story.evidence] && (
            <ul className="mt-4">
              <EvidenceItem evidence={data.evidence[n.story.evidence]!} />
            </ul>
          )}
        </Section>
      )}

      <Section
        id="members"
        title={`Members (${n.memberCounts.open} open${n.memberCounts.ended ? `, ${n.memberCounts.ended} ended` : ""})`}
        description="Membership is a classification of what a coin is. Collection status says whether it is still measured daily."
      >
        {members.length ? <MembersTable members={members} /> : <EmptyState title="No members recorded" />}
      </Section>

      <Section id="activity" title="Volume">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Hourly, last 7 days">
            <SeriesChart series={[{ id: "h", label: "Hourly volume", color: SERIES.accent, points: a.hourly }]} format="usd" tickFormat="hour" kind="area" summary={hourlySummary} />
          </Panel>
          <Panel
            title="Daily, last 30 days"
            aside={
              <span className="text-xs text-med">
                30-day total <MeasureValue measure={a.volume30d} format="usd" className="text-sm" />
              </span>
            }
          >
            <SeriesChart series={[{ id: "d", label: "Daily volume", color: SERIES.accent, points: a.daily }]} format="usd" kind="area" summary={dailySummary} />
          </Panel>
        </div>
      </Section>

      {n.summary && (
        <Section id="about" title="What it is">
          <p className="max-w-[72ch] text-sm leading-relaxed text-pretty text-high">{n.summary}</p>
        </Section>
      )}

      <Section id="breadth" title="Concentration and market" description="Whether a few coins carry the volume, and the members’ latest market snapshots.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Concentration">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat label="Largest member's share" sub="7-day volume">
                <span className="font-mono">{n.concentration.top1Share === null ? "—" : formatValue(100 * n.concentration.top1Share, "percent")}</span>
              </Stat>
              <Stat label="HHI" sub="0–10,000; higher is more concentrated">
                <span className="font-mono">{n.concentration.hhi === null ? "—" : formatValue(n.concentration.hhi, "count")}</span>
              </Stat>
              <Stat label="Advancing" sub="Members with a positive 7d return, of those with prices">
                {n.breadth.withPrices ? (
                  <span className="font-mono">
                    {n.breadth.advancing} of {n.breadth.withPrices}
                  </span>
                ) : (
                  "No priced members"
                )}
              </Stat>
              <Stat label="Shared members">
                {n.overlap.length ? (
                  <span className="flex flex-col gap-0.5">
                    {n.overlap.map((o) => (
                      <Link key={o.narrativeSlug} href={`/narratives/${o.narrativeSlug}`} className="text-xs text-link hover:underline">
                        {o.tokens} with {titleOf(o.narrativeSlug)}
                      </Link>
                    ))}
                  </span>
                ) : (
                  "None"
                )}
              </Stat>
            </dl>
          </Panel>
          <Panel title="Members’ market">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat label="Market cap (circulating)" sub={`${n.market.withMarketCap} of ${n.market.of} open members with a current value`}>
                <span className="font-mono">{formatValue(n.market.marketCap, "usd")}</span>
              </Stat>
              <Stat label="Liquidity (top pairs)" sub={`${n.market.withLiquidity} of ${n.market.of} members`}>
                <span className="font-mono">{formatValue(n.market.liquidity, "usd")}</span>
              </Stat>
              <Stat label="Median member return, 7d" sub="Snapshot to snapshot">
                <span className="font-mono">{formatValue(n.market.medianReturn7d, "ratio-percent")}</span>
              </Stat>
              <Stat label="Snapshots from" sub={n.market.newest ? `to ${formatDateTime(n.market.newest)}` : undefined}>
                {formatDateTime(n.market.oldest)}
              </Stat>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-med">{n.market.note}</p>
          </Panel>
        </div>
      </Section>

      <Section id="evidence" title="Evidence" description={n.evidence.note}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <EvidencePanel title="Project claims" items={n.evidence.projectClaims} empty="None recorded." />
          <EvidencePanel title="Independent sources" items={n.evidence.independent} empty="No independent reporting recorded." />
          <EvidencePanel title="Posts (sample)" items={n.evidence.posts} empty="No posts recorded." />
        </div>
      </Section>

      <Section id="history" title="History">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Lifecycle">
            <ol className="flex flex-col gap-3">
              {n.lifecycle.history.map((h) => (
                <li key={`${h.state}-${h.from}`} className="text-sm">
                  <span className="text-high">{LIFECYCLE_LABEL[h.state as NarrativePublic["lifecycle"]["state"]] ?? h.state}</span>
                  <span className="ml-2 text-xs text-med tabular-nums">
                    {formatDate(h.from)} → {h.to ? formatDate(h.to) : "now"}
                  </span>
                  {h.reason && <p className="mt-1 text-xs leading-relaxed text-med">{h.reason}</p>}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Weekly editions and research">
            {editions.length ? (
              <ul className="flex flex-col gap-2">
                {editions.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/market/${e.id}`} className={`font-mono text-high ${LINK}`}>
                      {e.id}
                    </Link>
                    <span className="text-xs text-med">
                      <span className="font-mono text-high">{formatValue(e.volume.observed, "usd")}</span>
                      {e.volume.complete ? "" : " partial"} · {e.trend.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">Not in a published weekly edition yet.</p>
            )}
            {articles.length > 0 && (
              <ul className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                {articles.map((x) => (
                  <li key={x.slug}>
                    <Link href={`/research/${x.slug}`} className={`text-sm text-high ${LINK}`}>
                      {x.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-med">{formatDate(x.publishedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Section>

      <AgentAccess
        subject={`the ${n.title} narrative (${n.slug})`}
        discoveryPath={apiPaths.narrative(n.slug)}
        paidPath={apiPaths.narrativeBundle(n.slug)}
        kind="narrative-bundle"
        contents="The paid narrative bundle adds every membership interval with evidence, per-member hourly and daily series, version history and lifecycle records, pinned to one release."
      />
    </Container>
  );
}
