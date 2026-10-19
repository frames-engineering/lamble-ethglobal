import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentAccess } from "@/components/research/agent-access";
import { SeriesChart } from "@/components/research/charts";
import { SERIES } from "@/components/research/colors";
import { CopyBlock, WatchButton } from "@/components/research/client";
import { Address, CoinLabel, EvidenceList, ExternalLink } from "@/components/research/links";
import { MeasureValue, Stat, StateBadge, formatPrice, formatValue } from "@/components/research/measure";
import { EmptyState, Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime, formatDuration } from "@/components/research/time";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiPaths } from "@/lib/lambo/api/paths";
import { displayPrice } from "@/lib/lambo/api/prices";
import { CHAIN_NAME, type Chain } from "@/lib/lambo/core/identity";
import type { DataState } from "@/lib/lambo/core/measure";
import type { BottomingPublic, CoinPublic, ReleasePublic } from "@/lib/lambo/release/types";
import { BadRequest, NotFound, allChanges, articlesFor, loadRelease, parseCoinRoute } from "@/lib/lambo/service";
import { COVERAGE_REQUEST_URL } from "@/lib/links";

type Params = { chain: string; address: string };

export function generateStaticParams(): Params[] {
  return loadRelease().data.coins.map((c) => ({ chain: c.chain, address: c.address }));
}

/** Resolves the route to a canonical identity; malformed chains or addresses are a 404, never a lookup. */
function resolve(params: Params) {
  try {
    return parseCoinRoute(params.chain, params.address);
  } catch (e) {
    if (e instanceof BadRequest || e instanceof NotFound) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const id = resolve(p);
  if (!id) return { title: "Coin not found", robots: { index: false } };
  const coin = loadRelease().coins.get(id.id);
  if (!coin) return { title: `${CHAIN_NAME[id.chain]} coin not covered`, robots: { index: false } };
  const title = `${coin.symbol ?? coin.address.slice(0, 8)}${coin.name && coin.name !== coin.symbol ? ` (${coin.name})` : ""} on ${CHAIN_NAME[coin.chain]}`;
  const description = `${title}: market data, holder analysis coverage, bottoming test and narrative history from LAMBLE trenches research. ${coin.collection.note}`;
  const path = `/coins/${coin.chain}/${coin.address}`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path } };
}

export default async function CoinPage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const id = resolve(p);
  if (!id) notFound();
  // A non-canonical spelling of a covered address (EVM case) redirects nowhere; it renders the canonical page.
  const release = loadRelease();
  const coin = release.coins.get(id.id);
  if (!coin) return <NotCovered chain={id.chain} address={id.address} release={release.data} />;
  return <CoinResearch coin={coin} release={release.data} />;
}

// ---------------------------------------------------------------- not covered

function NotCovered({ chain, address, release }: { chain: Chain; address: string; release: ReleasePublic }) {
  const request = `Coverage request for LAMBLE trenches research
Chain: ${chain}
Address: ${address}
Why this coin: <one line: narrative, launchpad, or the question you want answered>`;
  return (
    <Container>
      <PageHeader eyebrow={`Coin · ${CHAIN_NAME[chain]}`} title="This coin is not covered" description={<p>LAMBLE has no research on this address in the current release ({release.releaseId}). Nothing below is a statement about the coin itself.</p>} />
      <div className="grid gap-4 pb-8 lg:grid-cols-2">
        <Panel title="What coverage means">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-med">
            <li>Coins enter the tracked universe through a narrative membership or launchpad discovery, under the published universe rules.</li>
            <li>Once tracked, a coin keeps its history; coverage never silently disappears.</li>
            <li>
              The address is shown as LAMBLE stores it: <Address value={address} />
            </li>
          </ul>
          <p className="mt-4 text-xs text-med">
            See <Link href="/sources" className="text-link hover:underline">sources and coverage</Link> and the{" "}
            <Link href="/coins" className="text-link hover:underline">list of covered coins</Link>.
          </p>
        </Panel>
        <Panel title="Request coverage" description="Requests are reviewed against the universe rules; a request is not a promise of coverage.">
          <CopyBlock label="Request text" text={request} />
          {COVERAGE_REQUEST_URL ? (
            <p className="mt-3 text-xs">
              <ExternalLink href={COVERAGE_REQUEST_URL}>Submit the request</ExternalLink>
            </p>
          ) : (
            <p className="mt-3 text-xs text-med">This deployment has no request intake configured; send the text to the LAMBLE team through whatever channel you already use.</p>
          )}
        </Panel>
      </div>
    </Container>
  );
}

// ---------------------------------------------------------------- research page

const COLLECTION_LABEL: Record<CoinPublic["collection"]["status"], string> = {
  collected: "Collected daily",
  collection_paused: "Collection paused",
  inactive: "Inactive",
};

function CoinResearch({ coin, release }: { coin: CoinPublic; release: ReleasePublic }) {
  const label = coin.symbol ?? coin.address.slice(0, 8);
  const changes = allChanges()
    .filter((e) => e.entityId === coin.id)
    .reverse()
    .slice(0, 12);
  const articles = articlesFor({ coin: coin.id });
  const methods = new Map(release.methods.holderComponents.map((m) => [m.id, m]));
  const panels = new Map(release.methods.providerPanels.map((m) => [m.capability, m]));
  const covered = coin.holders.components.filter((h) => h.measure.value !== null).length;
  const priceSummary = coin.charts.price.length
    ? `${coin.charts.price.length} price samples from ${formatDate(coin.charts.price[0]!.time)} to ${formatDate(coin.charts.price.at(-1)!.time)}; latest ${formatPrice(coin.charts.price.at(-1)!.value ?? 0)}. Samples are point snapshots from daily runs, not candles: moves between samples are not shown.`
    : "No price samples.";
  const volumeKnown = coin.charts.volumeDaily.filter((p) => p.value !== null);
  const volumeSummary = `Daily volume across all indexed pools for ${coin.charts.volumeDaily.length} UTC days ending ${formatDate(coin.charts.volumeDailyEnd)} (end exclusive); ${coin.charts.volumeDaily.length - volumeKnown.length} day(s) unknown and drawn as gaps. Days before the token existed are zero by construction.`;

  return (
    <Container>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link href="/coins" className="hover:text-high">
              Coins
            </Link>
            <span aria-hidden>/</span>
            {CHAIN_NAME[coin.chain]}
          </span>
        }
        title={
          <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>{label}</span>
            {coin.name && coin.name !== coin.symbol && <span className="text-lg font-normal text-med md:text-xl">{coin.name}</span>}
          </span>
        }
        description={
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={coin.collection.status === "collected" ? "positive" : "neutral"}>{COLLECTION_LABEL[coin.collection.status]}</Badge>
              {coin.identity.originVenue && <Badge variant="outline">Origin: {coin.identity.originVenue}</Badge>}
              {coin.memberships
                .filter((m) => m.effectiveTo === null)
                .map((m) => (
                  <Link key={m.intervalId} href={`/narratives/${m.narrativeSlug}`}>
                    <Badge variant="link">{m.narrativeTitle}</Badge>
                  </Link>
                ))}
            </div>
            <p>{coin.collection.note}</p>
          </div>
        }
        actions={
          <>
            <WatchButton id={coin.id} label={label} />
            {coin.explorerUrl && (
              <a href={coin.explorerUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center rounded-lg border border-line-med px-3 text-sm text-med hover:text-high">
                Explorer
              </a>
            )}
          </>
        }
        meta={
          <>
            <span>
              Release <code className="font-mono">{release.releaseId}</code>
            </span>
            <span>Data cutoff {formatDateTime(release.dataCutoff)}</span>
            <span>Last collected {formatDateTime(coin.collection.lastCollectedAt)}</span>
          </>
        }
      />

      <div className="flex flex-col gap-4 pb-8">
        <Panel id="market" title="Market" description="Latest snapshot from the daily run. Each value carries its own as-of time; values older than their maximum age are marked stale rather than hidden.">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Price" sub={asOf(coin.market.price.asOf)}>
              <MeasureValue measure={coin.market.price} format="price" />
            </Stat>
            <Stat label="Market cap (circulating)" sub={asOf(coin.market.marketCap.asOf)}>
              <MeasureValue measure={coin.market.marketCap} format="usd" />
            </Stat>
            <Stat label="FDV" sub={coin.market.fdv.note}>
              <MeasureValue measure={coin.market.fdv} format="usd" />
            </Stat>
            <Stat label="Liquidity (top pair)" sub={asOf(coin.market.liquidity.asOf)}>
              <MeasureValue measure={coin.market.liquidity} format="usd" />
            </Stat>
            <Stat label="Volume, rolling 24h" sub="All pools, as reported">
              <MeasureValue measure={coin.market.volume24hRolling} format="usd" />
            </Stat>
            <Stat label="Price change, rolling 24h">
              <MeasureValue measure={coin.market.priceChange24hRolling} format="signed-percent" tone />
            </Stat>
            <Stat label="Change vs 1 day earlier" sub={coin.market.change1d.note}>
              <MeasureValue measure={coin.market.change1d} format="signed-percent" tone />
            </Stat>
            <Stat label="Change vs 7 days earlier" sub={coin.market.change7d.note}>
              <MeasureValue measure={coin.market.change7d} format="signed-percent" tone />
            </Stat>
            <Stat label="Change vs 30 days earlier" sub={coin.market.change30d.note}>
              <MeasureValue measure={coin.market.change30d} format="signed-percent" tone />
            </Stat>
            <Stat label="Volume, 7 complete days" sub={coin.market.volume7d.method}>
              <MeasureValue measure={coin.market.volume7d} format="usd" />
            </Stat>
          </dl>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Price samples" description="One point per daily run where the coin was collected.">
            <SeriesChart series={[{ id: "price", label: "Price", color: SERIES.link, points: coin.charts.price }]} format="price" summary={priceSummary} />
          </Panel>
          <Panel title="Daily volume" description="Codex daily bars, all indexed pools.">
            <SeriesChart series={[{ id: "volume", label: "Volume", color: SERIES.positive, points: coin.charts.volumeDaily }]} format="usd" kind="area" summary={volumeSummary} />
          </Panel>
        </div>

        <Bottoming b={coin.bottoming} />

        <Panel
          id="holders"
          title="Holder analysis"
          description={`${covered} of 9 components have a value. Missing components stay missing: they are never scored as zero and never fill a composite.`}
          aside={<Link href="/methodology#holders" className="text-xs text-link hover:underline">Method</Link>}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Basis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coin.holders.components.map((h) => {
                  const m = methods.get(h.id);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="max-w-72 whitespace-normal">
                        <span className="text-high">{m?.label ?? h.id}</span>
                        <span className="block text-2xs text-low">{h.id}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <MeasureValue measure={h.measure} format={h.id === "relative.peer_performance" ? "ratio-percent" : "ratio"} />
                      </TableCell>
                      <TableCell className="max-w-md text-xs whitespace-normal text-med">
                        {h.measure.value === null ? (m?.unavailableNote ?? h.measure.note) : (h.measure.coverage?.scope ?? h.measure.note ?? `Requires ${m?.requires.join("; ")}`)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Note className="mt-3">
            Composite: <span className="text-high">{coin.holders.composite.state}</span>. {coin.holders.composite.note}
          </Note>
        </Panel>

        <Panel id="narratives" title="Narrative membership" description="Every interval this coin has been classified into a narrative. A paused collection keeps the membership factual; only an observed exit ends it.">
          {coin.memberships.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Narrative</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Basis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coin.memberships.map((m) => (
                    <TableRow key={m.intervalId}>
                      <TableCell>
                        <Link href={`/narratives/${m.narrativeSlug}`} className="text-high hover:underline">
                          {m.narrativeTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDate(m.effectiveFrom)}</TableCell>
                      <TableCell className="tabular-nums">{m.effectiveTo ? formatDate(m.effectiveTo) : "open"}</TableCell>
                      <TableCell>
                        <Badge variant={m.collection === "collected" ? "positive" : "neutral"}>{m.collection.replace("_", " ")}</Badge>
                        {m.observedThrough && <span className="ml-2 text-2xs text-med">through {formatDate(m.observedThrough)}</span>}
                      </TableCell>
                      <TableCell className="max-w-md text-xs whitespace-normal text-med">
                        {m.rationale ?? m.basis}
                        {m.closeReason && <span className="mt-1 block text-low">{m.closeReason}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No narrative memberships">This coin is tracked through launchpad discovery only.</EmptyState>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="What changed" description="Changes the published releases recorded for this coin. Reconstructed events come from comparing retained runs.">
            {changes.length ? (
              <ul className="flex flex-col gap-2">
                {changes.map((e) => (
                  <li key={e.seq} className="text-xs leading-relaxed">
                    <span className="text-high">{e.summary}</span>
                    <span className="ml-2 text-low">
                      #{e.seq}
                      {e.reconstructed ? " · reconstructed" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No recorded changes.</p>
            )}
          </Panel>
          <Panel title="Peers" description="Members of the same narratives, compared on 7-day snapshot return where both prices exist.">
            {coin.peers.length ? (
              <ul className="flex flex-col gap-2">
                {coin.peers.slice(0, 10).map((peer) => {
                  const [chain, ...rest] = peer.tokenId.split(":");
                  return (
                    <li key={`${peer.tokenId}-${peer.narrativeSlug}`} className="flex items-center justify-between gap-3 text-sm">
                      <CoinLabel chain={chain!} address={rest.join(":")} symbol={peer.symbol} />
                      <span className="text-xs text-med tabular-nums">{peer.return7d === null ? "no 7d return" : formatValue(peer.return7d, "ratio-percent")}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-med">No peers defined.</p>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel id="identity" title="Identity and provenance">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Stat label="Canonical address" className="sm:col-span-2">
                <Address value={coin.address} />
              </Stat>
              <Stat label="Token created" sub={coin.identity.tokenCreatedBasis ?? undefined}>
                {formatDateTime(coin.identity.tokenCreatedAt)}
              </Stat>
              <Stat label="First observed by LAMBLE" sub={`Run ${coin.identity.firstObservedRun}`}>
                {formatDateTime(coin.identity.firstObservedAt)}
              </Stat>
              <Stat label="First available" sub="When the observation was committed; historical views never use data before this.">
                {formatDateTime(coin.identity.firstAvailableAt)}
              </Stat>
              <Stat label="Origin venue" sub={coin.identity.originStatus ?? undefined}>
                {coin.identity.originVenue ?? "Unknown"}
              </Stat>
              {coin.names.length > 1 && (
                <Stat label="Names seen" className="sm:col-span-2">
                  {coin.names.map((n) => `${n.symbol} (${n.name})`).join(", ")}
                </Stat>
              )}
            </dl>
            {coin.identity.pools.length > 0 && (
              <div className="mt-4">
                <p className="text-2xs text-med">Pools</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {coin.identity.pools.map((pool) => (
                    <li key={pool.poolId} className="flex flex-wrap items-center gap-2 text-2xs text-med">
                      <Address value={pool.address} />
                      <span>{pool.kind}</span>
                      {pool.createdAt && <span>created {formatDate(pool.createdAt)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
          <Panel title="Provider panels" description="Venue-specific data (pump.fun, FOMO). Shown only when a capability is validated, enabled and collected under an approved budget.">
            <ul className="flex flex-col gap-3">
              {coin.providerPanels.map((pp) => {
                const m = panels.get(pp.capability);
                return (
                  <li key={pp.capability} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-high">{pp.capability}</code>
                      <StateBadge state={pp.state as DataState} />
                    </div>
                    <p className="text-2xs leading-relaxed text-med">{pp.applicable ? (m?.note ?? pp.note) : pp.note}</p>
                    {pp.applicable && m?.coverage && <p className="text-2xs leading-relaxed text-low">Coverage when enabled: {m.coverage}</p>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Research">
            {articles.length ? (
              <ul className="flex flex-col gap-2">
                {articles.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/research/${a.slug}`} className="text-sm text-high hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-2xs text-med">
                      {formatDate(a.publishedAt)} · {a.format.replaceAll("-", " ")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-med">No articles cover this coin yet.</p>
            )}
          </Panel>
          <Panel title="Evidence" description="Sources behind the values and classifications on this page.">
            <EvidenceList ids={coin.evidence} index={release.evidence} />
          </Panel>
        </div>

        <AgentAccess
          subject={`${label} (${coin.chain}:${coin.address})`}
          discoveryPath={apiPaths.coin(coin.chain, coin.address)}
          paidPath={apiPaths.coinBundle(coin.chain, coin.address)}
          price={displayPrice("coin-bundle")}
          contents="The paid coin bundle adds what this page summarises: full provenance per value, observation-level series, the holder inputs and histories, every bottoming evaluation and the evidence graph, pinned to one release."
        />
      </div>
    </Container>
  );
}

function asOf(t: number | null): string | undefined {
  return t === null ? undefined : `as of ${formatDateTime(t)}`;
}

const CONDITION_STATE: Record<string, { label: string; variant: "positive" | "negative" | "neutral" | "outline" }> = {
  met: { label: "Met", variant: "positive" },
  unmet: { label: "Not met", variant: "negative" },
  insufficient_data: { label: "Insufficient data", variant: "outline" },
  not_applicable: { label: "Not applicable", variant: "neutral" },
};

function Bottoming({ b }: { b: BottomingPublic }) {
  return (
    <Panel
      id="bottoming"
      title="Bottoming test"
      description="Three conditions counted in order: realized loss-taking, a low that holds, and absorption by new buyers. Evaluated only with data available at each evaluation time."
      aside={<Link href="/methodology#bottoming" className="text-xs text-link hover:underline">Method · {b.methodVersion}</Link>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={b.state === "evaluated" ? "link" : "outline"}>{b.state === "evaluated" ? `Stage ${b.stage} of 3` : b.state === "not_applicable" ? "Not applicable" : "Insufficient data"}</Badge>
          <p className="text-sm text-high">{b.label}</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Current drawdown">{b.drawdownCurrent === null ? "—" : formatValue(100 * b.drawdownCurrent, "percent")}</Stat>
          <Stat label="Max in episode">{b.drawdownMax === null ? "—" : formatValue(100 * b.drawdownMax, "percent")}</Stat>
          <Stat label="Episode low" sub={b.low ? `UTC day of ${formatDate(b.low.time)}` : undefined}>
            {b.low ? formatPrice(b.low.price) : "—"}
          </Stat>
          <Stat label="Since the low's interval closed">{formatDuration(b.secondsSinceLow)}</Stat>
        </dl>
        <ol className="grid gap-3 md:grid-cols-3">
          {b.conditions.map((c, i) => {
            const s = CONDITION_STATE[c.state] ?? { label: c.state, variant: "outline" as const };
            return (
              <li key={c.id} className="rounded-lg bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-high">
                    {i + 1}. {c.label}
                  </span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
                <p className="mt-2 text-2xs leading-relaxed text-med">{c.detail}</p>
              </li>
            );
          })}
        </ol>
        <p className="text-xs leading-relaxed text-med">
          {b.explanation} Price basis: {b.priceBasis === "candles" ? "daily candles" : b.priceBasis === "samples" ? "daily-run snapshot samples (cannot establish a held low)" : "none"}.
        </p>
        {b.invalidatesIf.length > 0 && (
          <div>
            <p className="text-2xs text-med">What would change this reading</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-med">
              {b.invalidatesIf.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
        {b.history.length > 0 && (
          <div>
            <p className="text-2xs text-med">Recorded transitions</p>
            <ul className="mt-1 flex flex-col gap-1">
              {b.history.map((h) => (
                <li key={h.asOf} className="text-xs text-med">
                  <span className="tabular-nums text-low">{formatDate(h.asOf)}</span> · {h.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {b.episodes.length > 0 && (
          <p className="text-2xs text-low">
            {b.episodes.length} drawdown episode(s) on record; the bundle carries each with its peak, low, invalidations and close reason.
          </p>
        )}
      </div>
    </Panel>
  );
}
