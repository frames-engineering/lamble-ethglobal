import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChainStack } from "@/components/brand/chain-mark";
import { Container } from "@/components/layout/container";
import { AgentAccess } from "@/components/research/agent-access";
import { SeriesChart } from "@/components/research/charts";
import { SERIES } from "@/components/research/colors";
import { CoinLabel, ExternalLink } from "@/components/research/links";
import { Stat, formatValue } from "@/components/research/measure";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import type { ChainId, Launchpad } from "@/lib/data/types";
import { apiPaths } from "@/lib/lambo/api/paths";
import type { LaunchpadPublic } from "@/lib/lambo/release/types";
import { BadRequest, articlesFor, loadRelease } from "@/lib/lambo/service";
import { bps } from "@/lib/format";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return loadRelease().data.launchpads.map((l) => ({ slug: l.slug }));
}

function find(slug: string): LaunchpadPublic | null {
  try {
    return loadRelease().launchpads.get(decodeURIComponent(slug)) ?? null;
  } catch (e) {
    if (e instanceof BadRequest) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const l = find((await params).slug);
  if (!l) return { title: "Launchpad not found", robots: { index: false } };
  const description = `${l.name}: fees, revenue, creator earnings, indexed launch activity, fee model and the coins it originated.`;
  return { title: l.name, description, alternates: { canonical: `/launchpads/${l.slug}` }, openGraph: { title: l.name, description, url: `/launchpads/${l.slug}` } };
}

const PERIODS = [
  ["h24", "Last settled day"],
  ["d7", "7 settled days"],
  ["d30", "30 settled days"],
] as const;

export default async function LaunchpadPage({ params }: { params: Promise<Params> }) {
  const l = find((await params).slug);
  if (!l) notFound();
  const { data } = loadRelease();
  const p = l.presentation as Partial<Launchpad> & { provenance?: { methodology?: Record<string, string>; sourceUrl?: string; scope?: string } };
  const fm = p.feeModel;
  const articles = articlesFor({ launchpad: l.slug });
  const coinsById = data.coins.filter((c) => l.coins.some((x) => x.tokenId === c.id));
  const historySummary = `Daily fees for the 30 settled UTC days to ${formatDate(l.financialAnchor)}; missing days are gaps.`;
  const ixHistory = (l.indexed?.history ?? []).map((h) => ({ time: Math.floor(Date.parse(h.asOf) / 1000), value: h.created24 }));

  return (
    <Container>
      <PageHeader
        eyebrow={
          <Link href="/launchpads" className="hover:text-high">
            Launchpads
          </Link>
        }
        title={l.name}
        description={
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {p.chains && <ChainStack chains={p.chains as ChainId[]} />}
              <Badge variant={l.feeSubtotal.included ? "positive" : "neutral"}>{l.feeSubtotal.included ? "In the market fee subtotal" : "Shown separately"}</Badge>
            </div>
            {p.description && <p>{p.description}</p>}
            {!l.feeSubtotal.included && l.feeSubtotal.excludedReason && <p className="text-xs">Excluded from the subtotal: {l.feeSubtotal.excludedReason}</p>}
          </div>
        }
        actions={p.url ? <ExternalLink href={p.url} className="inline-flex h-8 items-center rounded-lg border border-line-med px-3 text-sm">Website</ExternalLink> : undefined}
        meta={
          <>
            <span>Financial data through {formatDate(l.financialAnchor)}</span>
            <span>Data cutoff {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />
      <div className="flex flex-col gap-4 pb-8">
        <Panel title="Fees, revenue and creator earnings" description={p.provenance?.scope ? `DefiLlama: ${p.provenance.scope}.` : "DefiLlama daily values."}>
          <dl className="grid gap-4 sm:grid-cols-3">
            {PERIODS.map(([k, label]) => {
              const x = l.metrics[k];
              return (
                <div key={k} className="rounded-lg bg-surface-2 p-3">
                  <p className="text-2xs text-med">{label}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-3">
                    <Stat label="Fees" sub={x.change === null ? undefined : `${formatValue(x.change, "signed-percent")} vs prior`}>
                      {formatValue(x.fees, "usd")}
                    </Stat>
                    <Stat label="Revenue">{formatValue(x.revenue, "usd")}</Stat>
                    <Stat label="Creator earnings" className="col-span-2">
                      {formatValue(x.supplySide, "usd")}
                    </Stat>
                  </dl>
                </div>
              );
            })}
          </dl>
          <div className="mt-4">
            <SeriesChart series={[{ id: "fees", label: "Fees", color: SERIES.positive, points: l.metrics.history30d }]} format="usd" kind="area" summary={historySummary} />
          </div>
          {p.provenance?.methodology && (
            <details className="mt-3 text-xs text-med">
              <summary className="cursor-pointer text-high">Source definitions</summary>
              <dl className="mt-2 grid gap-2">
                {Object.entries(p.provenance.methodology).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-high">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {p.provenance.sourceUrl && (
                <p className="mt-2">
                  <ExternalLink href={p.provenance.sourceUrl}>Adapter source</ExternalLink>
                </p>
              )}
            </details>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Indexed launch activity" description="Codex beta, provider-indexed rolling windows. Completeness of creation events and window cutoffs are not independently established.">
            {l.indexed ? (
              <>
                <dl className="grid grid-cols-2 gap-4">
                  <Stat label="Created, rolling 24h">{formatValue(l.indexed.created24, "count")}</Stat>
                  <Stat label="Created, rolling 7d">{formatValue(l.indexed.created7d, "count")}</Stat>
                  <Stat label="Completed, rolling 24h">{formatValue(l.indexed.completed24, "count")}</Stat>
                  <Stat label="Completed, rolling 7d" sub="Completions / creations is a period ratio">
                    {formatValue(l.indexed.completed7d, "count")}
                  </Stat>
                </dl>
                <div className="mt-4">
                  <SeriesChart series={[{ id: "created", label: "Created (rolling 24h)", color: SERIES.link, points: ixHistory }]} format="count" summary={`Rolling-24h creation counts at each daily run (${ixHistory.length} observations); each point is its own window, not a daily total.`} />
                </div>
              </>
            ) : (
              <p className="text-xs text-med">No indexed activity is mapped for this venue: unknown, not zero.</p>
            )}
          </Panel>
          <Panel title="Fee model" description="From venue documentation; contract state is not read.">
            {fm ? (
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Swap fee">{bps(fm.tradingFeeBps)}</Stat>
                <Stat label="Creator share">{fm.creatorShareBps === null ? "—" : `${(fm.creatorShareBps / 100).toFixed(0)}% of fees`}</Stat>
                <Stat label="Launch cost">{fm.launchCostUsd === 0 ? "Free" : formatValue(fm.launchCostUsd, "usd")}</Stat>
                <Stat label="Graduates to">{p.graduatesTo ?? "Unknown"}</Stat>
              </dl>
            ) : (
              <p className="text-xs text-med">No fee model recorded.</p>
            )}
            {fm?.note && <Note className="mt-3">{fm.note}</Note>}
            {l.supplySideDefinition && <p className="mt-3 text-xs leading-relaxed text-med">Creator earnings, as this venue&apos;s source defines them: {l.supplySideDefinition}</p>}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={`Tracked coins from ${l.name} (${l.coins.length})`} description="Coins in the tracked universe whose origin is attributed to this venue. Attribution comes from Codex launchpad data unless stated on the coin page.">
            {coinsById.length ? (
              <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {coinsById
                  .sort((a, b) => (b.market.volume24hRolling.value ?? -1) - (a.market.volume24hRolling.value ?? -1))
                  .slice(0, 30)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <CoinLabel chain={c.chain} address={c.address} symbol={c.symbol} />
                      <span className="text-2xs text-med tabular-nums">{formatValue(c.market.volume24hRolling.value, "usd")}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No tracked coin is attributed to this venue.</p>
            )}
            {coinsById.length > 30 && (
              <p className="mt-2 text-2xs text-med">
                {coinsById.length - 30} more on the{" "}
                <Link href="/coins" className="text-link hover:underline">
                  coins page
                </Link>
                .
              </p>
            )}
          </Panel>
          <Panel title="Narratives with coins from here">
            {l.narratives.length ? (
              <ul className="flex flex-col gap-2">
                {[...l.narratives]
                  .sort((a, b) => b.coins - a.coins)
                  .map((n) => (
                    <li key={n.slug} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/narratives/${n.slug}`} className="text-high hover:underline">
                        {n.title}
                      </Link>
                      <span className="text-2xs text-med">{n.coins} coin(s)</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-med">None.</p>
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
          subject="launchpad economics across all tracked venues"
          discoveryPath={apiPaths.launchpads()}
          paidPath={apiPaths.launchpadsDataset()}
          kind="launchpads-dataset"
          contents="The paid launchpads dataset covers every venue: daily fee, revenue and supply-side rows, the fee policy with exclusion reasons, every indexed-activity observation with its window, and fee-model sources."
        />
      </div>
    </Container>
  );
}
