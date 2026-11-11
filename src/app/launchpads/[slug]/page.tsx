import { ArrowUpRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ChainStack } from "@/components/brand/chain-mark";
import { LetterMark } from "@/components/brand/letter-mark";
import { Container } from "@/components/layout/container";
import { Change, money } from "@/components/overview/format";
import { KeyFigure, KeyFigures } from "@/components/research/figures";
import { FORMAT_LABEL } from "@/components/research/article-bits";
import { AgentAccess } from "@/components/research/agent-access";
import { SeriesChart } from "@/components/research/charts";
import { launchpadColor } from "@/components/research/colors";
import { CoinLabel, ExternalLink } from "@/components/research/links";
import { formatValue } from "@/components/research/measure";
import { EmptyState, MoreLink, PageHeader, Panel, Section } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { buttonVariants } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chainInfo } from "@/lib/data/chains";
import type { ChainId, Launchpad } from "@/lib/data/types";
import { apiPaths } from "@/lib/lamble/api/paths";
import type { LaunchpadPublic } from "@/lib/lamble/release/types";
import { BadRequest, articlesFor, editionsFor, loadRelease } from "@/lib/lamble/service";
import { bps, compactUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

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

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const LINK = "underline-offset-4 decoration-med/50 hover:underline";
const INDEXED_SCOPE = "Codex beta, provider-indexed rolling windows. Completeness of creation events and window cutoffs are not independently established.";

/** "+40.8% vs prior day"; a missing change says so instead of printing a dash before the comparison. */
function vsPrior(change: number | null, period: string): ReactNode {
  if (change === null) return "No change figure";
  return (
    <>
      <Change value={change} /> vs prior {period}
    </>
  );
}

function Stat({ label, value, sub, mono = true }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-med">{label}</dt>
      <dd className={cn("mt-1 text-base text-high", mono && "font-mono")}>{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-med">{sub}</dd>}
    </div>
  );
}

export default async function LaunchpadPage({ params }: { params: Promise<Params> }) {
  const l = find((await params).slug);
  if (!l) notFound();
  const { data } = loadRelease();
  const p = l.presentation as Partial<Launchpad> & { provenance?: { methodology?: Record<string, string>; sourceUrl?: string; scope?: string } };
  const fm = p.feeModel;
  const chains = (p.chains ?? []) as ChainId[];
  const articles = articlesFor({ launchpad: l.slug });
  const editions = editionsFor({ launchpad: l.slug });
  const coinsById = data.coins.filter((c) => l.coins.some((x) => x.tokenId === c.id));
  const topCoins = coinsById.sort((a, b) => (b.market.volume24hRolling.value ?? -1) - (a.market.volume24hRolling.value ?? -1)).slice(0, 30);
  const narratives = [...l.narratives].sort((a, b) => b.coins - a.coins);
  const historySummary = `Daily fees for the 30 settled UTC days to ${formatDate(l.financialAnchor)}; missing days are gaps.`;
  const ixHistory = (l.indexed?.history ?? []).map((h) => ({ time: Math.floor(Date.parse(h.asOf) / 1000), value: h.created24 }));
  const lastDay = l.metrics.history30d[l.metrics.history30d.length - 1];
  const reading = [
    ...editions.map((e) => ({ key: `e-${e.id}`, href: `/market/${e.id}`, kind: "Market week", title: e.title, dek: e.detail })),
    ...articles.map((a) => {
      const kind = FORMAT_LABEL[a.format];
      // Weekly notes are titled "State of the Trenches, 2026-W43: …": the eyebrow already says the first half.
      const title = a.title.toLowerCase().startsWith(kind.toLowerCase()) ? a.title.slice(kind.length).replace(/^[\s,:–-]+/, "") : "";
      return { key: `a-${a.slug}`, href: `/research/${a.slug}`, kind, title: title || a.title, dek: a.dek };
    }),
  ];

  return (
    <Container>
      <PageHeader
        eyebrow={
          <Link href="/launchpads" className="transition-colors duration-150 hover:text-high">
            Launchpads
          </Link>
        }
        title={
          <span className="inline-flex items-center gap-3">
            <LetterMark name={l.name} color={p.brandColor ?? ""} size={40} src={p.logoSrc} />
            {l.name}
          </span>
        }
        description={p.description}
        actions={
          p.url ? (
            <ExternalLink href={p.url} className={cn(buttonVariants({ variant: "outline" }), "hover:no-underline")}>
              Website
              <ArrowUpRightIcon aria-hidden className="size-3.5 text-med" />
            </ExternalLink>
          ) : undefined
        }
        meta={
          <>
            {chains.length > 0 && (
              <span className="inline-flex items-center gap-2">
                <ChainStack chains={chains} size={16} max={6} className="*:data-[slot=avatar]:ring-background" />
                {chains.map((c) => chainInfo(c).name).join(", ")}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              {l.feeSubtotal.included ? "In the market fee subtotal" : "Not in the market fee subtotal"}
              {!l.feeSubtotal.included && l.feeSubtotal.excludedReason && <InfoTip label="Why it is left out of the subtotal">Excluded from the subtotal: {l.feeSubtotal.excludedReason}. Its own figures on this page are unchanged.</InfoTip>}
            </span>
            <span>Fees for settled UTC days to {formatDate(l.financialAnchor)}</span>
            <span className="lg:hidden">Data through {formatDateTime(data.dataCutoff)}</span>
          </>
        }
      />

      <KeyFigures className="mt-8">
        <KeyFigure
          label={`Fees, ${lastDay ? DAY.format(new Date(lastDay.time * 1000)) : "last settled day"}`}
          sub={vsPrior(l.metrics.h24.change, "day")}
        >
          {compactUsd(l.metrics.h24.fees, 2)}
        </KeyFigure>
        <KeyFigure
          label="Fees, 7 settled days"
          sub={vsPrior(l.metrics.d7.change, "7 days")}
        >
          {compactUsd(l.metrics.d7.fees, 2)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Coins created, 24h
              <InfoTip label="About indexed launch counts">{INDEXED_SCOPE}</InfoTip>
            </>
          }
          sub={!l.indexed ? "Not indexed: unknown, not zero" : l.indexed.completed24 === null ? "Graduations not indexed" : `${formatValue(l.indexed.completed24, "count")} graduated`}
        >
          {l.indexed ? formatValue(l.indexed.created24, "count") : "—"}
        </KeyFigure>
        <KeyFigure label="Tracked coins from it" sub={narratives.length ? `in ${narratives.length} narrative${narratives.length === 1 ? "" : "s"}` : "in no tracked narrative"}>{String(l.coins.length)}</KeyFigure>
      </KeyFigures>

      <Section id="fees" title="Daily fees" description={`What traders and launchers paid on ${l.name} each settled UTC day, and how much of it the venue kept or paid creators. ${p.provenance?.scope ? `DefiLlama: ${p.provenance.scope}.` : "DefiLlama daily values."}`}>
        <Panel>
          <SeriesChart series={[{ id: "fees", label: "Fees", color: launchpadColor(l.slug), points: l.metrics.history30d }]} format="usd" kind="area" summary={historySummary} />
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow className="h-auto hover:bg-transparent">
                  <TableHead scope="col">Period</TableHead>
                  <TableHead scope="col" className="text-right">
                    Fees
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    vs prior
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Revenue
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      Creator earnings
                      {l.supplySideDefinition && <InfoTip label="How this venue defines creator earnings">Creator earnings, as this venue&apos;s source defines them: {l.supplySideDefinition}</InfoTip>}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERIODS.map(([k, label]) => {
                  const x = l.metrics[k];
                  return (
                    <TableRow key={k}>
                      <TableCell className="text-med">{label}</TableCell>
                      <TableCell className="text-right font-mono text-[13px]">{money(x.fees)}</TableCell>
                      <TableCell className="text-right font-mono text-[13px]">
                        <Change value={x.change} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-[13px]">{money(x.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-[13px]">{money(x.supplySide)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {p.provenance?.methodology && (
            <details className="mt-4 border-t border-line pt-4 text-xs text-med">
              <summary className="cursor-pointer transition-colors duration-150 hover:text-high">Source definitions</summary>
              <dl className="mt-3 grid gap-3 md:grid-cols-2">
                {Object.entries(p.provenance.methodology).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-high">{k}</dt>
                    <dd className="mt-0.5 leading-relaxed">{v}</dd>
                  </div>
                ))}
              </dl>
              {p.provenance.sourceUrl && (
                <p className="mt-3">
                  <ExternalLink href={p.provenance.sourceUrl}>Adapter source</ExternalLink>
                </p>
              )}
            </details>
          )}
        </Panel>
      </Section>

      <Section id="launches" title="Coins created" description={`How many coins Codex’s beta index saw created on ${l.name}, and how many completed the bonding curve, in rolling windows. Completeness of creation events and window cutoffs are not independently established.`}>
        {l.indexed ? (
          <Panel>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Created, rolling 24h" value={formatValue(l.indexed.created24, "count")} />
              <Stat label="Created, rolling 7d" value={formatValue(l.indexed.created7d, "count")} />
              <Stat label="Completed, rolling 24h" value={formatValue(l.indexed.completed24, "count")} />
              <Stat label="Completed, rolling 7d" value={formatValue(l.indexed.completed7d, "count")} sub="Completions / creations is a period ratio" />
            </dl>
            <div className="mt-6">
              <SeriesChart series={[{ id: "created", label: "Created (rolling 24h)", color: launchpadColor(l.slug), points: ixHistory }]} format="count" summary={`Rolling-24h creation counts at each daily run (${ixHistory.length} observations); each point is its own window, not a daily total.`} />
            </div>
          </Panel>
        ) : (
          <EmptyState title="Not indexed">No indexed activity is mapped for this venue: unknown, not zero.</EmptyState>
        )}
      </Section>

      <Section
        id="coins"
        title={`Coins from ${l.name}`}
        description="Coins in the tracked universe whose origin is attributed to this venue, and the narratives they trade under. Attribution comes from Codex launchpad data unless stated on the coin page."
        aside={coinsById.length > topCoins.length ? <MoreLink href="/coins">All coins</MoreLink> : undefined}
      >
        {topCoins.length || narratives.length ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Panel title="Narratives" description="With the number of its coins in each.">
              {narratives.length ? (
                <ul>
                  {narratives.map((n) => (
                    <li key={n.slug} className="flex h-10 items-center justify-between gap-3 border-b border-line text-sm last:border-0">
                      <Link href={`/narratives/${n.slug}`} title={n.title} className={cn("min-w-0 truncate text-high", LINK)}>
                        {n.title}
                      </Link>
                      <span className="shrink-0 font-mono text-xs text-med">{n.coins}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-med">None.</p>
              )}
            </Panel>
            <Panel
              title="Most traded coins"
              description={coinsById.length > topCoins.length ? `The ${topCoins.length} most traded of ${coinsById.length}, by 24h volume.` : "By 24h volume."}
            >
              {topCoins.length ? (
                <ul className="grid gap-x-6 sm:grid-cols-2">
                  {topCoins.map((c) => (
                    <li key={c.id} className="flex h-10 min-w-0 items-center justify-between gap-3 border-b border-line text-sm last:border-0 sm:nth-last-2:border-0">
                      <CoinLabel chain={c.chain} address={c.address} symbol={c.symbol} />
                      <span className="shrink-0 font-mono text-xs text-med">{formatValue(c.market.volume24hRolling.value, "usd")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-med">No tracked coin is attributed to this venue.</p>
              )}
            </Panel>
          </div>
        ) : (
          <EmptyState title="No tracked coins">No tracked coin is attributed to this venue.</EmptyState>
        )}
      </Section>

      <Section id="fee-model" title="Fee model" description="From venue documentation; contract state is not read.">
        <Panel>
          {fm ? (
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Swap fee" value={bps(fm.tradingFeeBps)} />
              <Stat label="Creator share" value={fm.creatorShareBps === null ? "—" : `${(fm.creatorShareBps / 100).toFixed(0)}%`} sub={fm.creatorShareBps === null ? undefined : "of fees"} />
              <Stat label="Launch cost" mono={fm.launchCostUsd !== 0} value={fm.launchCostUsd === 0 ? "Free" : formatValue(fm.launchCostUsd, "usd")} />
              <Stat label="Graduates to" mono={false} value={p.graduatesTo ?? "Unknown"} />
            </dl>
          ) : (
            <p className="text-xs text-med">No fee model recorded.</p>
          )}
          {fm?.note && <p className="mt-4 max-w-[72ch] border-t border-line pt-4 text-xs leading-relaxed text-med">{fm.note}</p>}
        </Panel>
      </Section>

      {reading.length > 0 && (
        <Section id="reading" title="In editions and research">
          <ul className="grid gap-3 sm:grid-cols-2">
            {reading.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="flex h-full flex-col rounded-lg bg-card p-5 transition-colors duration-150 hover:bg-surface-3">
                  <span className="text-2xs font-medium tracking-[0.08em] text-med uppercase">{r.kind}</span>
                  <span className="mt-2 text-base font-medium text-balance text-high">{r.title}</span>
                  {r.dek && <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-med">{r.dek}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <AgentAccess
        subject="launchpad economics across all tracked venues"
        discoveryPath={apiPaths.launchpads()}
        paidPath={apiPaths.launchpadsDataset()}
        kind="launchpads-dataset"
        contents="The paid launchpads dataset covers every venue: daily fee, revenue and supply-side rows, the fee policy with exclusion reasons, every indexed-activity observation with its window, and fee-model sources."
      />
    </Container>
  );
}
