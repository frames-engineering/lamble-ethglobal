import Link from "next/link";

import { Sparkline } from "@/components/charts/sparkline";
import { type HeroStat, ResearchHero } from "@/components/hero/research-hero";
import { Container } from "@/components/layout/container";
import { FORMAT_LABEL, REVIEW_LABEL } from "@/components/research/article-bits";
import { CoinLabel } from "@/components/research/links";
import { formatValue } from "@/components/research/measure";
import { LifecycleBadge, TrendBadge, shownChange } from "@/components/research/narrative-bits";
import { Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { editionIndex, getEdition, listArticles, loadRelease } from "@/lib/lambo/service";
import { LAUNCH_BOT_URL } from "@/lib/links";

export default function HomePage() {
  const { data } = loadRelease();
  const m = data.market;
  const latest = editionIndex()[0] ?? null;
  const edition = latest ? getEdition(latest.id) : null;
  const featured = data.narratives.filter((n) => n.featured.featured).sort((a, b) => (a.featured.rank ?? 99) - (b.featured.rank ?? 99));
  const movers = data.coins
    .filter((c) => c.collection.status === "collected" && c.market.volume24hRolling.value !== null)
    .sort((a, b) => b.market.volume24hRolling.value! - a.market.volume24hRolling.value!)
    .slice(0, 8);
  const venues = [...data.launchpads].sort((a, b) => (b.metrics.d7.fees ?? -1) - (a.metrics.d7.fees ?? -1)).slice(0, 6);
  const articles = listArticles().slice(0, 4);

  const stats: HeroStat[] = [
    { label: "Fee subtotal, last settled day", value: formatValue(m.feeSubtotal.value, "usd"), sub: `${m.feeSubtotal.included.length} non-overlapping venues · ${formatDate(m.feeSubtotal.anchor)}` },
    { label: "Coins created, rolling 24h", value: formatValue(m.indexed.created24, "count"), sub: `Codex beta, ${m.indexed.creationVenues} venues` },
    { label: "Narrative volume, 7 days", value: formatValue(m.rolling7d.narrativeVolume, "usd"), sub: `${m.tracked.collectedNarratives} collected narratives` },
    { label: "Coins tracked", value: formatValue(m.tracked.coins, "count"), sub: `${m.tracked.collected} collected in the latest run` },
  ];

  return (
    <>
      <ResearchHero stats={stats} edition={latest ? { id: latest.id, href: `/market/${latest.id}` } : null} />
      <Container>
        <div className="flex flex-col gap-4 py-8">
          <p className="text-2xs text-med">
            Release <code className="font-mono">{data.releaseId}</code> · data cutoff {formatDateTime(data.dataCutoff)}
          </p>

          {edition && (
            <Panel
              title={edition.title}
              description={`${formatDate(edition.interval.start)} – ${formatDate(Date.parse(edition.interval.end) / 1000 - 1)}, as known at ${formatDateTime(edition.dataCutoff)}.`}
              aside={
                <Link href={`/market/${edition.id}`} className="text-xs text-link hover:underline">
                  Read the edition
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <dt className="text-2xs text-med">Fee subtotal</dt>
                  <dd className="mt-1 text-lg text-high tabular-nums">{formatValue(edition.market.feeSubtotal.value, "usd")}</dd>
                  <dd className="text-2xs text-med">{formatValue(edition.market.feeSubtotal.changePct, "signed-percent")} vs {edition.comparison.id}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-med">Creator earnings</dt>
                  <dd className="mt-1 text-lg text-high tabular-nums">{formatValue(edition.market.creatorEarnings.value, "usd")}</dd>
                  <dd className="text-2xs text-med">{formatValue(edition.market.creatorEarnings.changePct, "signed-percent")}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-med">Narrative volume (deduplicated)</dt>
                  <dd className="mt-1 text-lg text-high tabular-nums">{formatValue(edition.dedup.totalVolume, "usd")}</dd>
                  <dd className="text-2xs text-med">{edition.narratives.length} narratives</dd>
                </div>
                <div>
                  <dt className="text-2xs text-med">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={edition.status === "complete" ? "positive" : "warning"}>{edition.status}</Badge>
                  </dd>
                  <dd className="mt-1 text-2xs text-med">revision {edition.revision}</dd>
                </div>
              </dl>
            </Panel>
          )}

          <section aria-labelledby="featured">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="featured" className="text-base font-semibold text-high">
                Featured narratives
              </h2>
              <Link href="/narratives" className="text-xs text-link hover:underline">
                All narratives
              </Link>
            </div>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((n) => {
                const change = shownChange(n);
                return (
                  <li key={n.id} className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm light:shadow-black/8">
                    <div className="flex items-center gap-2">
                      <LifecycleBadge state={n.lifecycle.state} />
                      <TrendBadge trend={n.trend} />
                    </div>
                    <h3 className="text-sm font-semibold text-high">
                      <Link href={`/narratives/${n.slug}`} className="hover:underline">
                        {n.title}
                      </Link>
                    </h3>
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-xs text-med">
                        <span className="block text-base text-high tabular-nums">{formatValue(n.activity.volume7d.value, "usd")}</span>7-day volume · {n.memberCounts.open} coins
                        {change !== null && <span className="block">{formatValue(change, "signed-percent")} week over week</span>}
                      </div>
                      <Sparkline points={n.activity.daily} width={112} height={36} className="text-link" fill />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Most traded tracked coins, rolling 24h"
              aside={
                <Link href="/coins" className="text-xs text-link hover:underline">
                  All coins
                </Link>
              }
            >
              <ul className="flex flex-col gap-2">
                {movers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <CoinLabel chain={c.chain} address={c.address} symbol={c.symbol} name={c.name} />
                    <span className="shrink-0 text-xs text-med tabular-nums">
                      {formatValue(c.market.volume24hRolling.value, "usd")}
                      <span className={c.market.priceChange24hRolling.value === null ? "" : c.market.priceChange24hRolling.value >= 0 ? "ml-2 text-positive" : "ml-2 text-negative"}>{formatValue(c.market.priceChange24hRolling.value, "signed-percent")}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-2xs text-med">Volume as reported across all pools; very high turnover relative to market cap can include wash or bot trading.</p>
            </Panel>
            <Panel
              title="Launchpads by 7-day fees"
              aside={
                <Link href="/launchpads" className="text-xs text-link hover:underline">
                  All launchpads
                </Link>
              }
            >
              <ul className="flex flex-col gap-2">
                {venues.map((l) => (
                  <li key={l.slug} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/launchpads/${l.slug}`} className="text-high hover:underline">
                      {l.name}
                    </Link>
                    <span className="text-xs text-med tabular-nums">
                      {formatValue(l.metrics.d7.fees, "usd")}
                      <span className="ml-2">{formatValue(l.metrics.d7.change, "signed-percent")}</span>
                      {!l.feeSubtotal.included && <span className="ml-2 text-low">overlaps</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Panel
            title="Latest research"
            aside={
              <Link href="/research" className="text-xs text-link hover:underline">
                All research
              </Link>
            }
          >
            {articles.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {articles.map((a) => (
                  <li key={a.slug} className="rounded-lg bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-2xs text-med">
                      <span>{FORMAT_LABEL[a.format]}</span>
                      <span>·</span>
                      <span>{formatDate(a.publishedAt)}</span>
                      <span>·</span>
                      <span>{REVIEW_LABEL[a.review.status]}</span>
                    </div>
                    <Link href={`/research/${a.slug}`} className="mt-1 block text-sm font-semibold text-high hover:underline">
                      {a.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-med">{a.dek}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No articles published yet.</p>
            )}
          </Panel>

          <div className="flex flex-col items-start gap-2 rounded-xl border border-line-med p-4 text-sm text-med md:flex-row md:items-center md:justify-between">
            <span>Launching a token? The LAMBLE launch bot compares venues for your launch in Telegram.</span>
            <a href={LAUNCH_BOT_URL} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
              Open the launch bot
            </a>
          </div>
        </div>
      </Container>
    </>
  );
}
