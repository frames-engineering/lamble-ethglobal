import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SeriesChart } from "@/components/research/charts";
import { SERIES } from "@/components/research/colors";
import { ChangeList } from "@/components/research/changes";
import { CoinLabel } from "@/components/research/links";
import { Stat, formatValue } from "@/components/research/measure";
import { TrendBadge } from "@/components/research/narrative-bits";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NarrativePublic } from "@/lib/lamble/release/types";
import { editionIndex, latestChanges, listArticles, loadRelease } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Market",
  description: "The state of the trenches: launchpad fee subtotal, creator earnings, indexed launch activity, narrative volume, and the archive of weekly State of the Trenches editions.",
  alternates: { canonical: "/market" },
};

export default function MarketPage() {
  const { data } = loadRelease();
  const m = data.market;
  const editions = editionIndex();
  const days = m.feeSubtotal.history30d.filter((p) => p.value !== null);
  const [dayBefore, lastDay] = [days.at(-2) ?? null, days.at(-1) ?? null];
  const dayChange = lastDay && dayBefore && dayBefore.value ? (100 * (lastDay.value! - dayBefore.value)) / dayBefore.value : null;
  const venuesDay = [...data.launchpads].filter((l) => l.metrics.h24.fees !== null).sort((a, b) => (b.metrics.h24.fees ?? 0) - (a.metrics.h24.fees ?? 0)).slice(0, 8);
  const coinsDay = [...data.coins].filter((c) => c.market.volume24hRolling.value !== null && c.market.volume24hRolling.state !== "stale").sort((a, b) => b.market.volume24hRolling.value! - a.market.volume24hRolling.value!).slice(0, 6);
  const changes = latestChanges(10);
  const daily = listArticles().find((a) => a.format === "daily") ?? null;
  const feeSummary = `Daily fee subtotal of the included venues for 30 settled UTC days to ${formatDate(m.feeSubtotal.anchor)}. A day is drawn only when every included venue reported it.`;
  return (
    <Container>
      <PageHeader
        eyebrow="Research"
        title="Market"
        description={<p>Four views that never mix: the latest settled day, settled calendar weeks (the editions), the developing week so far, and a rolling seven days ending at the latest cutoff.</p>}
        meta={<span>Data cutoff {formatDateTime(data.dataCutoff)}</span>}
      />
      <div className="flex flex-col gap-4 pb-8">
        <Panel
          id="daily"
          title="Daily view"
          description={`The last settled UTC day of fees (to ${formatDate(m.feeSubtotal.anchor)}), rolling 24-hour trading as of each coin's latest snapshot, and what changed in release ${data.releaseId}.`}
          aside={
            daily ? (
              <Link href={`/research/${daily.slug}`} className="text-xs text-link hover:underline">
                {daily.title}
              </Link>
            ) : undefined
          }
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Fee subtotal, last settled day">{formatValue(lastDay?.value ?? null, "usd")}</Stat>
                <Stat label="Versus the day before">{formatValue(dayChange, "signed-percent")}</Stat>
              </dl>
              <ul className="flex flex-col gap-1.5">
                {venuesDay.map((l) => (
                  <li key={l.slug} className="flex items-center justify-between gap-3 text-xs">
                    <Link href={`/launchpads/${l.slug}`} className="text-high hover:underline">
                      {l.name}
                    </Link>
                    <span className="text-med tabular-nums">
                      {formatValue(l.metrics.h24.fees, "usd")}
                      <span className="ml-2">{formatValue(l.metrics.h24.change, "signed-percent")}</span>
                      {!l.feeSubtotal.included && <span className="ml-2 text-low">overlaps</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2xs text-med">Most traded tracked coins, rolling 24h</p>
              <ul className="flex flex-col gap-1.5">
                {coinsDay.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-xs">
                    <CoinLabel chain={c.chain} address={c.address} symbol={c.symbol} />
                    <span className="text-med tabular-nums">
                      {formatValue(c.market.volume24hRolling.value, "usd")}
                      <span className="ml-2">{formatValue(c.market.priceChange24hRolling.value, "signed-percent")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-2xs text-med">
                What changed ({changes.total} event{changes.total === 1 ? "" : "s"})
              </p>
              <ChangeList events={changes.events} />
            </div>
          </div>
        </Panel>

        <Panel title="Weekly editions" description="State of the Trenches: one edition per ISO week (Monday 00:00 UTC, end exclusive), frozen when complete. Corrections are new revisions; earlier revisions stay readable.">
          {editions.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {editions.map((e) => (
                <li key={e.id}>
                  <Link href={`/market/${e.id}`} className="flex h-full flex-col gap-2 rounded-lg bg-surface-2 p-4 hover:bg-surface-3 focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-high">{e.title}</span>
                      <Badge variant={e.status === "complete" ? "positive" : "warning"}>{e.status}</Badge>
                    </span>
                    <span className="text-xs text-med">
                      {formatDate(e.interval.start)} – {formatDate(Date.parse(e.interval.end) / 1000 - 1)} · revision {e.latestRevision}
                    </span>
                    <span className="text-2xs leading-relaxed text-low">{e.provenance}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-med">No edition published yet.</p>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Fee subtotal, last settled day" className="lg:col-span-2" description={m.feeSubtotal.scope}>
            <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label={`Day ending ${formatDate(m.feeSubtotal.anchor)}`}>{formatValue(m.feeSubtotal.value, "usd")}</Stat>
              <Stat label="Last 7 settled days vs prior 7">{formatValue(m.feeSubtotal.change7dPct, "signed-percent")}</Stat>
              <Stat label="Included venues">{m.feeSubtotal.included.length}</Stat>
            </dl>
            <SeriesChart series={[{ id: "fees", label: "Fee subtotal", color: SERIES.positive, points: m.feeSubtotal.history30d }]} format="usd" kind="area" summary={feeSummary} />
            {Object.keys(m.feeSubtotal.excluded).length > 0 && (
              <details className="mt-3 text-xs text-med">
                <summary className="cursor-pointer text-high">Excluded venues ({Object.keys(m.feeSubtotal.excluded).length}) — shown individually, never added</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {Object.entries(m.feeSubtotal.excluded).map(([slug, reason]) => (
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
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="Rolling 7 days" description={m.rolling7d.note}>
              <dl className="grid gap-4">
                <Stat label="Narrative volume" sub={`${formatDateTime(m.rolling7d.start)} – ${formatDateTime(m.rolling7d.end)}`}>
                  {formatValue(m.rolling7d.narrativeVolume, "usd")}
                </Stat>
                <Stat label="Fees, 7 settled days">{formatValue(m.rolling7d.fees, "usd")}</Stat>
                <Stat label="Creator earnings, 7 settled days" sub={m.creatorEarnings.scope}>
                  {formatValue(m.creatorEarnings.value7d, "usd")}
                </Stat>
              </dl>
            </Panel>
            <Panel title={`Developing week ${m.developingWeek.id}`} description="Partial by definition; never compared with a complete week.">
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Fees" sub={`${m.developingWeek.feeDays} settled day(s)`}>
                  {formatValue(m.developingWeek.fees, "usd")}
                </Stat>
                <Stat label="Narrative volume" sub={`${m.developingWeek.volumeDays} day(s)`}>
                  {formatValue(m.developingWeek.narrativeVolume, "usd")}
                </Stat>
              </dl>
            </Panel>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Narratives by 7-day volume" className="lg:col-span-2" description="Collected narratives. Volume overlaps where a coin is in more than one narrative; the weekly editions show the deduplicated total.">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Narrative</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead className="text-right">Volume 7d</TableHead>
                    <TableHead className="text-right">Week change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.narratives.map((n) => (
                    <TableRow key={n.slug}>
                      <TableCell>
                        <Link href={`/narratives/${n.slug}`} className="text-high hover:underline">
                          {n.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TrendBadge trend={n.trend as NarrativePublic["trend"]} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatValue(n.volume7d, "usd")}</TableCell>
                      <TableCell className="text-right tabular-nums">{n.trend === "new" ? "new" : formatValue(n.change7dPct, "signed-percent")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
          <Panel title="Indexed launch activity" description={m.indexed.scope}>
            <dl className="grid gap-4">
              <Stat label="Coins created, rolling 24h" sub={`${m.indexed.creationVenues} venues reporting`}>
                {formatValue(m.indexed.created24, "count")}
              </Stat>
              <Stat label="Completions, rolling 24h" sub={`${m.indexed.completionVenues} venues report completions`}>
                {formatValue(m.indexed.completed24, "count")}
              </Stat>
              <Stat label="As of">{formatDateTime(m.indexed.asOf)}</Stat>
            </dl>
          </Panel>
        </div>
        <Note>
          Fees are DefiLlama daily values for settled UTC days; venues that overlap another venue&apos;s fee stream are excluded from the subtotal and listed. Launch counts are Codex beta, provider-indexed rolling windows: never summed into calendar weeks, and a missing venue is unknown, not zero.
        </Note>
      </div>
    </Container>
  );
}
