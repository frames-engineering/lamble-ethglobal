import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { Change, TrendTag, money } from "@/components/overview/format";
import { BarFigure, KeyFigure } from "@/components/research/figures";
import { ChangeList } from "@/components/research/changes";
import { SeriesChart } from "@/components/research/charts";
import { SERIES } from "@/components/research/colors";
import { CoinLabel } from "@/components/research/links";
import { formatValue } from "@/components/research/measure";
import { TREND_LABEL } from "@/components/research/narrative-bits";
import { MoreLink, Note, PageHeader, Panel, Section } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compactUsd } from "@/lib/format";
import type { NarrativePublic } from "@/lib/lamble/release/types";
import { type EditionDoc, editionIndex, getEdition, latestChanges, listArticles, loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Market",
  description: "The state of the trenches: launchpad fee subtotal, creator earnings, indexed launch activity, narrative volume, and the archive of weekly State of the Trenches editions.",
  alternates: { canonical: "/market" },
};

const LINK = "underline-offset-4 decoration-med/50 hover:underline";
const FIG = "font-mono text-[13px]";
const EDITION_COLS = "md:grid-cols-[minmax(0,1fr)_repeat(3,8rem)] md:gap-6";
const TAGGED = new Set<string>(["rising", "new", "fading", "steady"]);

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
const range = (interval: { start: string; end: string }) => `${formatDate(interval.start)} – ${formatDate(Date.parse(interval.end) / 1000 - 1)}`;

/** The latest revision of an edition, for its figures in the list; an unreadable file shows dashes instead of failing the index. */
function latestRevision(id: string): EditionDoc | null {
  try {
    return getEdition(id);
  } catch {
    return null;
  }
}

/**
 * One figure of an edition row. On phones each figure carries its label; from md up the row lines up under a
 * shared header and the label is kept for screen readers only.
 */
function EditionFigure({ label, value, sub, bar }: { label: string; value: string; sub?: ReactNode; bar?: number }) {
  return (
    <div className="min-w-0 md:text-right">
      <dt className="text-xs text-med md:sr-only">{label}</dt>
      <dd className="relative mt-1 md:mt-0 md:h-7">
        {bar !== undefined && <span aria-hidden className="absolute inset-y-0 left-0 hidden bg-chart-bar md:block" style={{ width: `${bar * 100}%` }} />}
        <span className="relative font-mono text-base text-high md:flex md:h-full md:items-center md:justify-end md:pr-2">{value}</span>
      </dd>
      {sub && <dd className="mt-1 text-xs text-med">{sub}</dd>}
    </div>
  );
}

export default function MarketPage() {
  const { data } = loadRelease();
  const m = data.market;
  const dev = m.developingWeek;
  const editions = editionIndex().map((entry) => ({ entry, doc: latestRevision(entry.id) }));
  const feeMax = Math.max(1, ...editions.map(({ doc }) => doc?.market.feeSubtotal.value ?? 0));
  const days = m.feeSubtotal.history30d.filter((p) => p.value !== null);
  const [dayBefore, lastDay] = [days.at(-2) ?? null, days.at(-1) ?? null];
  const dayChange = lastDay && dayBefore && dayBefore.value ? (100 * (lastDay.value! - dayBefore.value)) / dayBefore.value : null;
  const venuesDay = [...data.launchpads].filter((l) => l.metrics.h24.fees !== null).sort((a, b) => (b.metrics.h24.fees ?? 0) - (a.metrics.h24.fees ?? 0)).slice(0, 8);
  const coinsDay = [...data.coins].filter((c) => c.market.volume24hRolling.value !== null && c.market.volume24hRolling.state !== "stale").sort((a, b) => b.market.volume24hRolling.value! - a.market.volume24hRolling.value!).slice(0, 6);
  const venueMax = Math.max(1, ...venuesDay.map((l) => l.metrics.h24.fees ?? 0));
  const coinMax = Math.max(1, ...coinsDay.map((c) => c.market.volume24hRolling.value ?? 0));
  const narrativeMax = Math.max(1, ...m.narratives.map((n) => n.volume7d ?? 0));
  const changes = latestChanges(10);
  const daily = listArticles().find((a) => a.format === "daily") ?? null;
  const excluded = Object.entries(m.feeSubtotal.excluded);
  const feeSummary = `Daily fee subtotal of the included venues for 30 settled UTC days to ${formatDate(m.feeSubtotal.anchor)}. A day is drawn only when every included venue reported it.`;

  return (
    <Container>
      <PageHeader
        title="Market"
        description={<p>Four views that never mix: settled calendar weeks (the editions), the developing week so far, the latest settled day, and a rolling seven days ending at the latest cutoff.</p>}
      />
      <p className="mt-4 text-xs text-med lg:hidden">Data through {formatDateTime(data.dataCutoff)}</p>

      <Section
        id="editions"
        title="Weekly editions"
        description="State of the Trenches: one edition per ISO week (Monday 00:00 UTC, end exclusive), frozen when complete. Corrections are new revisions; earlier revisions stay readable."
      >
        <div className="rounded-sm border border-dashed border-line-med p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-base font-medium text-high">{dev.id} so far</h3>
            <Badge variant="warning">Partial</Badge>
            <span className="text-xs text-med">Since {formatDate(dev.start)}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="min-w-0">
              <dt className="text-xs text-med">Fee subtotal</dt>
              <dd className="mt-1 font-mono text-base text-high">{formatValue(dev.fees, "usd")}</dd>
              <dd className="mt-1 text-xs text-med">{plural(dev.feeDays, "settled day")}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-med">Narrative volume</dt>
              <dd className="mt-1 font-mono text-base text-high">{formatValue(dev.narrativeVolume, "usd")}</dd>
              <dd className="mt-1 text-xs text-med">{plural(dev.volumeDays, "day")}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-med">Partial by definition; never compared with a complete week.</p>
        </div>

        {editions.length ? (
          <div className="mt-3 rounded-sm border border-line">
            <div aria-hidden className={`hidden h-9 items-center border-b border-line px-5 text-xs text-med md:grid ${EDITION_COLS}`}>
              <span>Edition</span>
              <span className="text-right">Fee subtotal</span>
              <span className="text-right">Creator earnings</span>
              <span className="text-right">Narrative volume</span>
            </div>
            <ol className="divide-y divide-line">
              {editions.map(({ entry, doc }) => (
                <li key={entry.id} className={`grid gap-4 p-4 md:items-start md:px-5 ${EDITION_COLS}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/market/${entry.id}`} className={`text-base font-medium text-high ${LINK}`}>
                        {entry.id}
                      </Link>
                      {entry.status !== "complete" && (
                        <Badge variant="warning" className="capitalize">
                          {entry.status}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-med">
                      {range(entry.interval)}
                      {entry.status === "complete" && " · Complete"} · Revision {entry.latestRevision}
                    </p>
                    <p className="mt-1 text-xs text-med">{entry.provenance}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:contents">
                    <EditionFigure
                      label="Fee subtotal"
                      value={money(doc?.market.feeSubtotal.value ?? null)}
                      bar={(doc?.market.feeSubtotal.value ?? 0) / feeMax}
                      sub={
                        doc && (
                          <>
                            <Change value={doc.market.feeSubtotal.changePct} /> vs {doc.comparison.id}
                          </>
                        )
                      }
                    />
                    <EditionFigure
                      label="Creator earnings"
                      value={money(doc?.market.creatorEarnings.value ?? null)}
                      sub={
                        doc && (
                          <>
                            <Change value={doc.market.creatorEarnings.changePct} /> vs {doc.comparison.id}
                          </>
                        )
                      }
                    />
                    <EditionFigure label="Narrative volume" value={money(doc?.dedup.totalVolume ?? null)} sub={doc && "Deduplicated"} />
                  </dl>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="mt-3 text-sm text-med">No edition published yet.</p>
        )}
      </Section>

      <Section
        id="day"
        title="Latest settled day"
        description={`Fees for the last settled UTC day (to ${formatDate(m.feeSubtotal.anchor)}), and trading and launches over the rolling 24 hours to each coin's latest snapshot.`}
        aside={daily ? <MoreLink href={`/research/${daily.slug}`}>Daily facts</MoreLink> : undefined}
      >
        <dl className="grid grid-cols-2 border-t border-l border-line md:grid-cols-4">
          <KeyFigure
            label={
              <>
                Fee subtotal, day ending {formatDate(m.feeSubtotal.anchor)}
                <InfoTip label="What the fee subtotal includes">{m.feeSubtotal.scope}</InfoTip>
              </>
            }
            sub={
              <>
                <Change value={dayChange} /> vs the day before
              </>
            }
          >
            {compactUsd(m.feeSubtotal.value, 2)}
          </KeyFigure>
          <KeyFigure label="Venues in the subtotal" sub={excluded.length > 0 && `${plural(excluded.length, "overlapping venue")} shown, never added`}>{String(m.feeSubtotal.included.length)}</KeyFigure>
          <KeyFigure
            label={
              <>
                Coins created, rolling 24h
                <InfoTip label="What the launch counts cover">
                  {m.indexed.scope} As of {formatDateTime(m.indexed.asOf)}.
                </InfoTip>
              </>
            }
            sub={`${m.indexed.creationVenues} venues reporting`}
          >
            {formatValue(m.indexed.created24, "count")}
          </KeyFigure>
          <KeyFigure label="Completions, rolling 24h" sub={`${m.indexed.completionVenues} venues report completions`}>{formatValue(m.indexed.completed24, "count")}</KeyFigure>
        </dl>

        <Panel
          title="Fee subtotal, 30 settled days"
          description={
            <>
              The last 7 settled days against the prior 7: <Change value={m.feeSubtotal.change7dPct} />
            </>
          }
          className="mt-4"
        >
          <SeriesChart series={[{ id: "fees", label: "Fee subtotal", color: SERIES.accent, points: m.feeSubtotal.history30d }]} format="usd" kind="area" summary={feeSummary} />
          {excluded.length > 0 && (
            <details className="mt-4 border-t border-line pt-3 text-xs text-med">
              <summary className="cursor-pointer text-sm text-high">Overlapping venues ({excluded.length}): shown individually, never added</summary>
              <ul className="mt-2 flex flex-col gap-1.5">
                {excluded.map(([slug, reason]) => (
                  <li key={slug}>
                    <Link href={`/launchpads/${slug}`} className="text-link hover:underline">
                      {slug}
                    </Link>
                    : {reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Panel>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Fees by venue, last settled day">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venuesDay.map((l) => (
                  <TableRow key={l.slug}>
                    <TableCell>
                      <Link href={`/launchpads/${l.slug}`} className={`text-high ${LINK}`}>
                        {l.name}
                      </Link>
                      {!l.feeSubtotal.included && <span className="block text-xs text-med">Overlaps, not added</span>}
                    </TableCell>
                    <TableCell>
                      <BarFigure value={l.metrics.h24.fees} max={venueMax}>
                        {money(l.metrics.h24.fees)}
                      </BarFigure>
                    </TableCell>
                    <TableCell className={`${FIG} text-right`}>
                      <Change value={l.metrics.h24.change} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel title="Most traded tracked coins, rolling 24h">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coin</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coinsDay.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <CoinLabel chain={c.chain} address={c.address} symbol={c.symbol} />
                    </TableCell>
                    <TableCell>
                      <BarFigure value={c.market.volume24hRolling.value} max={coinMax}>
                        {money(c.market.volume24hRolling.value)}
                      </BarFigure>
                    </TableCell>
                    <TableCell className={`${FIG} text-right`}>
                      <Change value={c.market.priceChange24hRolling.value} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>

        <Note className="mt-4">
          Fees are DefiLlama daily values for settled UTC days; venues that overlap another venue&apos;s fee stream are excluded from the subtotal and listed. Launch counts are Codex beta, provider-indexed rolling windows: never summed into calendar weeks, and a missing venue is unknown, not zero.
        </Note>
      </Section>

      <Section
        id="rolling"
        title={
          <>
            Rolling seven days
            <InfoTip label="How the rolling window is counted">{m.rolling7d.note}</InfoTip>
          </>
        }
        description={`${formatDateTime(m.rolling7d.start)} to ${formatDateTime(m.rolling7d.end)}.`}
        aside={<MoreLink href="/narratives">All narratives</MoreLink>}
      >
        <dl className="grid grid-cols-2 border-t border-l border-line md:grid-cols-3">
          <KeyFigure label="Narrative volume" sub="Collected coins, each counted once">{compactUsd(m.rolling7d.narrativeVolume, 2)}</KeyFigure>
          <KeyFigure label="Fee subtotal, 7 settled days">{compactUsd(m.rolling7d.fees, 2)}</KeyFigure>
          <KeyFigure
            label={
              <>
                Creator earnings, 7 settled days
                <InfoTip label="What creator earnings include">{m.creatorEarnings.scope}</InfoTip>
              </>
            }
          >
            {compactUsd(m.creatorEarnings.value7d, 2)}
          </KeyFigure>
        </dl>

        <Panel title="Narratives by 7-day volume" description="Collected narratives. Volume overlaps where a coin is in more than one narrative; the weekly editions show the deduplicated total." className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Narrative</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-right">Volume, 7d</TableHead>
                <TableHead className="text-right">Week change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.narratives.map((n) => (
                <TableRow key={n.slug}>
                  <TableCell>
                    <Link href={`/narratives/${n.slug}`} className={`text-high ${LINK}`}>
                      {n.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-med">{TAGGED.has(n.trend) ? <TrendTag trend={n.trend as NarrativePublic["trend"]} /> : TREND_LABEL[n.trend as NarrativePublic["trend"]]}</TableCell>
                  <TableCell>
                    <BarFigure value={n.volume7d} max={narrativeMax}>
                      {money(n.volume7d)}
                    </BarFigure>
                  </TableCell>
                  <TableCell className={`${FIG} text-right`}>{n.trend === "new" ? <span className="text-link">new</span> : <Change value={n.change7dPct} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </Section>

      <Section id="changes" title="What changed" description={`${plural(changes.total, "event")} recorded in the latest release${changes.total > changes.events.length ? `; the ${changes.events.length} most relevant are shown` : ""}.`}>
        <Panel>
          <ChangeList events={changes.events} />
        </Panel>
      </Section>
    </Container>
  );
}
