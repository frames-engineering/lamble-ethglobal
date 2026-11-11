import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { Change, money } from "@/components/overview/format";
import { BarFigure, KeyFigure, KeyFigures } from "@/components/research/figures";
import { AgentAccess } from "@/components/research/agent-access";
import { FORMAT_LABEL } from "@/components/research/article-bits";
import { CoinLabel, EvidenceList } from "@/components/research/links";
import { formatValue } from "@/components/research/measure";
import { EmptyState, MoreLink, Note, PageHeader, Panel, Section } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compactUsd } from "@/lib/format";
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

const LINK = "underline-offset-4 decoration-med/50 hover:underline";
const FIG = "font-mono text-[13px] text-right";
const pct = (v: number | null) => formatValue(v, "signed-percent");
const share = (v: number | null) => (v === null ? "—" : formatValue(100 * v, "percent"));
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
const coin = (tokenId: string, symbol: string | null) => <CoinLabel chain={tokenId.split(":")[0]!} address={tokenId.split(":").slice(1).join(":")} symbol={symbol} />;

/** Evidence as recorded in the edition's release; the published release when that one is no longer retained. */
function evidenceIndex(releaseId: string | null): Record<string, Evidence> {
  try {
    return loadRelease(releaseId ?? undefined).data.evidence;
  } catch {
    return loadRelease().data.evidence;
  }
}

/** A small figure inside a Panel. */
function Figure({ label, value, sub }: { label: ReactNode; value: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-med">{label}</dt>
      <dd className="mt-1 font-mono text-xl text-high">{value}</dd>
      {sub && <dd className="mt-1 text-xs text-med">{sub}</dd>}
    </div>
  );
}

/** A column header with its scope note beside it. */
function HeadTip({ children, label, tip }: { children: ReactNode; label: string; tip: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <InfoTip label={label}>{tip}</InfoTip>
    </span>
  );
}

export default async function EditionPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { week } = await params;
  const sp = await searchParams;
  const revParam = typeof sp.revision === "string" && /^\d{1,4}$/.test(sp.revision) ? Number(sp.revision) : undefined;
  const e = load(week, revParam);
  if (!e) notFound();
  const index = editionIndex();
  const entry = index.find((x) => x.id === e.id)!;
  const m = e.market;
  const cmp = e.comparison.id;
  // The first edition's comparison week has no edition of its own; name it without a link that would 404.
  const cmpPublished = index.some((x) => x.id === cmp);
  const articles = articlesFor({ week: e.id });
  const writeUp = articles.find((a) => a.format === "weekly") ?? null;
  const otherArticles = articles.filter((a) => a !== writeUp);
  const narratives = [...e.narratives].sort((a, b) => b.volume.observed - a.volume.observed);
  const lastDay = formatDate(Date.parse(e.interval.end) / 1000 - 1);
  const moved = narratives.filter((n) => n.entrants.length || n.exits.length);
  const [weekStart, weekEnd] = [Date.parse(e.interval.start) / 1000, Date.parse(e.interval.end) / 1000];
  const storyInWeek = (n: (typeof narratives)[number]) => Boolean(n.story?.notice) && n.story!.at >= weekStart && n.story!.at < weekEnd;
  const stories = narratives.filter((n) => storyInWeek(n) || n.signalsInWeek.length);
  const evidence = stories.length ? evidenceIndex(e.releaseId) : {};
  const venues = [...m.venues].sort((a, b) => (b.fees ?? -1) - (a.fees ?? -1));
  const venueMax = Math.max(1, ...venues.map((v) => v.fees ?? 0));
  const narrativeMax = Math.max(1, ...narratives.map((n) => (n.volume.coverage === 0 ? 0 : n.volume.observed)));
  const failed = e.checks.filter((c) => !c.passed);

  return (
    <Container>
      <PageHeader
        eyebrow={
          <>
            <Link href="/market" className="transition-colors duration-150 hover:text-high">
              Market
            </Link>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            Weekly edition
          </>
        }
        title={e.title}
        description={
          <p>
            {formatDate(e.interval.start)} 00:00 UTC to {lastDay} 24:00 UTC (end exclusive), compared with{" "}
            {cmpPublished ? (
              <Link href={`/market/${cmp}`} className="text-link hover:underline">
                {cmp}
              </Link>
            ) : (
              cmp
            )}
            . {e.provenance}
          </p>
        }
        actions={
          writeUp && (
            // The edition's own write-up: the same week told in prose, with every figure cited.
            <Link href={`/research/${writeUp.slug}`} className={buttonVariants({ variant: "outline" })}>
              Read the write-up
              <ArrowRightIcon aria-hidden className="size-3.5 text-med" />
            </Link>
          )
        }
        meta={
          <>
            {e.status === "complete" ? (
              <span>Complete</span>
            ) : (
              <Badge variant="warning" className="capitalize">
                {e.status}
              </Badge>
            )}
            <span>
              Revision {e.revision}
              {entry.revisions.length > 1 && ` of ${entry.latestRevision}`}
            </span>
            <span>As known then</span>
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

      <KeyFigures className="mt-8">
        <KeyFigure
          label={
            <>
              Launchpad fee subtotal
              <InfoTip label="What the fee subtotal includes">{m.feeSubtotal.scope}</InfoTip>
            </>
          }
          sub={
            <>
              <Change value={m.feeSubtotal.changePct} /> vs {compactUsd(m.feeSubtotal.prior, 2)} in {cmp}
              <span className="mt-0.5 block">{m.feeSubtotal.scopeChanged ? `On the ${m.feeSubtotal.comparedOn.length} venues in both weeks` : "Same venues in both weeks"}</span>
            </>
          }
        >
          {compactUsd(m.feeSubtotal.value, 2)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Creator earnings
              <InfoTip label="What creator earnings include">{m.creatorEarnings.scope}</InfoTip>
            </>
          }
          sub={
            <>
              <Change value={m.creatorEarnings.changePct} /> vs {cmp}
            </>
          }
        >
          {compactUsd(m.creatorEarnings.value, 2)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Narrative volume
              <InfoTip label="How narrative volume is deduplicated">
                {e.dedup.note} Narrative totals sum to {formatValue(e.dedup.sumOfNarrativeTotals, "usd")} before deduplication.
              </InfoTip>
            </>
          }
          sub={`Top five coins: ${share(e.breadth.top5VolumeShare)}`}
        >
          {compactUsd(e.dedup.totalVolume, 2)}
        </KeyFigure>
        <KeyFigure
          label={
            <>
              Coins advancing
              <InfoTip label="How advancing coins are counted">{e.breadth.note}</InfoTip>
            </>
          }
          sub={`Priced coins, of ${e.breadth.tracked} tracked in narratives`}
        >
          {`${e.breadth.advancing} of ${e.breadth.withPrices}`}
        </KeyFigure>
      </KeyFigures>

      {(failed.length > 0 || entry.revisions.length > 1) && (
        <div className="mt-4 flex flex-col gap-2">
          {failed.length > 0 && (
            <Note tone="warning">
              Published as {e.status}: {failed.map((c) => c.detail).join(" ")}{" "}
              <a href="#completeness" className="text-link hover:underline">
                Completeness checks
              </a>
            </Note>
          )}
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
        </div>
      )}

      <Section
        id="launchpads"
        title="Launchpads"
        description={`Each venue's fees and creator earnings for the week against ${cmp}, largest first. Venues that overlap another venue's fee stream are listed but never added to the subtotal.`}
        aside={<MoreLink href="/launchpads">All launchpads</MoreLink>}
      >
        <Panel title="Fees by venue">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">{cmp}</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">Creator earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((v) => (
                <TableRow key={v.slug}>
                  <TableCell>
                    <Link href={`/launchpads/${v.slug}`} className={`text-high ${LINK}`}>
                      {v.name}
                    </Link>
                    {!v.included && (
                      <span className="flex items-center gap-1.5 text-xs text-med">
                        Not in subtotal
                        {v.excludedReason && <InfoTip label={`Why ${v.name} is not in the subtotal`}>{v.excludedReason}</InfoTip>}
                      </span>
                    )}
                    {v.missingFeeDays > 0 && <span className="block text-xs text-med">{plural(v.missingFeeDays, "unsettled day")}</span>}
                  </TableCell>
                  <TableCell>
                    <BarFigure value={v.fees} max={venueMax}>
                      {money(v.fees)}
                    </BarFigure>
                  </TableCell>
                  <TableCell className={`${FIG} text-med`}>{money(v.feesPrior)}</TableCell>
                  <TableCell className={FIG}>
                    <Change value={v.feesChangePct} />
                  </TableCell>
                  <TableCell className={FIG}>{share(v.shareOfSubtotal)}</TableCell>
                  <TableCell className={FIG} title={v.creatorEarningsDefinition ?? undefined}>
                    {money(v.creatorEarnings)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Indexed launches" description={m.indexedActivity.scope} className="mt-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Figure label="Created, rolling 7d" value={formatValue(m.indexedActivity.created7d, "count")} />
            <Figure label="Completed, rolling 7d" value={formatValue(m.indexedActivity.completed7d, "count")} />
            <Figure label="Period ratio" value={m.indexedActivity.periodCompletionRatio === null ? "—" : formatValue(100 * m.indexedActivity.periodCompletionRatio, "percent")} sub="Not a graduation probability" />
          </dl>
        </Panel>
      </Section>

      <Section id="narratives" title="Narratives" description="As known at the edition's cutoff: each narrative's member coins and their trading in the week, largest first." aside={<MoreLink href="/narratives">All narratives</MoreLink>}>
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Narrative</TableHead>
                <TableHead>At week end</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">
                  <HeadTip label="How the change is computed" tip="Computed on the comparable basket only, and withheld when that basket is too small.">
                    Change
                  </HeadTip>
                </TableHead>
                <TableHead>Comparable basket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {narratives.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Link href={`/narratives/${n.slug}`} className={`text-high ${LINK}`}>
                      {n.title}
                    </Link>
                    {n.emerging && <span className="ml-2 text-xs text-link">New this week</span>}
                  </TableCell>
                  <TableCell className="text-xs text-med">{(n.stateAtWeekEnd ?? "—").replace("_", " ")}</TableCell>
                  <TableCell className={FIG}>{n.members}</TableCell>
                  <TableCell>
                    {n.volume.coverage === 0 ? (
                      <span className="block text-right text-xs text-med">not observed</span>
                    ) : (
                      <BarFigure value={n.volume.observed} max={narrativeMax}>
                        {money(n.volume.observed)}
                        {!n.volume.complete && <span className="ml-1.5 font-sans text-xs text-med">partial</span>}
                      </BarFigure>
                    )}
                  </TableCell>
                  <TableCell className={FIG}>{n.volume.coverage === null ? "—" : formatValue(100 * n.volume.coverage, "percent")}</TableCell>
                  <TableCell className={FIG}>
                    <Change value={n.volumeChangePct} />
                  </TableCell>
                  <TableCell className="text-xs text-med">
                    {n.comparable.members} of {"ofMembersInBothWeeks" in n.comparable ? n.comparable.ofMembersInBothWeeks : "?"}
                    {"sufficient" in n.comparable && !n.comparable.sufficient && <span className="block">too small for a change</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <details className="mt-4 border-t border-line pt-3 text-xs text-med">
            <summary className="cursor-pointer text-sm text-high">Other historical views of this week</summary>
            <div className="mt-3 grid gap-6 md:grid-cols-2">
              {(["same_cohort", "current_basket"] as const).map((mode) => (
                <div key={mode} className="min-w-0">
                  <p className="text-high">{e.alternateModes[mode].label}</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {e.alternateModes[mode].narratives.map((n) => (
                      <li key={n.id} className="flex justify-between gap-3">
                        <span className="min-w-0">{n.title}</span>
                        <span className="shrink-0 text-right font-mono">
                          {money(n.volume.observed)}
                          {!n.volume.complete && <span className="font-sans"> partial</span>} · {pct(n.volumeChangePct)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </Panel>
      </Section>

      <Section id="inside" title="Inside each narrative" description="Which members carried each narrative through the week, which joined or left, and how concentrated its volume was.">
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Narrative</TableHead>
                <TableHead className="text-right">
                  <HeadTip label="What continuing members are" tip="Members open in both weeks; their change is computed on their own volume only.">
                    Continuing
                  </HeadTip>
                </TableHead>
                <TableHead className="text-right">Their change</TableHead>
                <TableHead className="text-right">
                  <HeadTip label="What entrants and exits are" tip="Membership intervals that opened (entrants) or closed (exits) during the week.">
                    Entrants
                  </HeadTip>
                </TableHead>
                <TableHead className="text-right">Exits</TableHead>
                <TableHead className="text-right">
                  <HeadTip label="How concentration is measured" tip="The top member's share of the narrative's volume, and the Herfindahl index (HHI) of member shares, from 0 to 10,000.">
                    Top member
                  </HeadTip>
                </TableHead>
                <TableHead className="text-right">HHI</TableHead>
                <TableHead className="text-right">Advancing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {narratives.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Link href={`/narratives/${n.slug}`} className={`text-high ${LINK}`}>
                      {n.title}
                    </Link>
                  </TableCell>
                  <TableCell className={FIG}>{n.continuing.members}</TableCell>
                  <TableCell className={FIG}>
                    <Change value={n.continuing.changePct} />
                  </TableCell>
                  <TableCell className={FIG}>
                    {n.entrants.length}
                    {n.entrants.some((x) => x.volume !== null) && (
                      <span className="block text-xs text-med">
                        {formatValue(
                          n.entrants.reduce((a, x) => a + (x.volume ?? 0), 0),
                          "usd",
                        )}
                        {n.entrants.some((x) => x.volume === null) && "+"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={FIG}>{n.exits.length}</TableCell>
                  <TableCell className={FIG}>{share(n.concentration.top1Share)}</TableCell>
                  <TableCell className={FIG}>{n.concentration.hhi === null ? "—" : Math.round(n.concentration.hhi).toLocaleString("en-US")}</TableCell>
                  <TableCell className={FIG}>{n.breadth.withPrices ? `${n.breadth.advancing} of ${n.breadth.withPrices}` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {moved.length > 0 && (
            <Panel title="Who joined and who left">
              <ul className="flex flex-col divide-y divide-line">
                {moved.map((n) => (
                  <li key={n.id} className="py-3 text-sm first:pt-0 last:pb-0">
                    <p className="font-medium text-high">{n.title}</p>
                    {n.entrants.length > 0 && (
                      <p className="mt-1 text-med">
                        Joined:{" "}
                        {n.entrants.map((x, i) => (
                          <span key={x.tokenId}>
                            {i > 0 && ", "}
                            {coin(x.tokenId, x.symbol)} <span className="font-mono text-xs">({formatValue(x.volume, "usd")})</span>
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
                            {coin(x.tokenId, x.symbol)} <span className="text-xs">(prior week <span className="font-mono">{formatValue(x.volumePrior, "usd")}</span>)</span>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Coins in more than one narrative" description={e.dedup.note}>
            {e.dedup.overlap.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {e.dedup.overlap.map((o) => (
                  <li key={o.tokenId} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                    <CoinLabel chain={o.tokenId.split(":")[0]!} address={o.tokenId.split(":").slice(1).join(":")} symbol={null} />
                    <span className="shrink-0 text-xs text-med">
                      {o.narratives} narratives · <span className="font-mono text-[13px] text-high">{money(o.volume)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-med">No coin is in more than one narrative this week.</p>
            )}
          </Panel>
        </div>
      </Section>

      <Section
        id="stories"
        title="Stories and evidence"
        description="Story notices and signals recorded for narratives during the week, with the sources behind them. Notices are quoted as recorded; they are not LAMBLE's claims."
      >
        {stories.length ? (
          <Panel>
            <ul className="flex flex-col divide-y divide-line">
              {stories.map((n) => (
                <li key={n.id} className="py-4 first:pt-0 last:pb-0">
                  <Link href={`/narratives/${n.slug}`} className={`text-sm font-medium text-high ${LINK}`}>
                    {n.title}
                  </Link>
                  {storyInWeek(n) && (
                    <p className="mt-1 text-sm text-med">
                      <span className="text-xs">{formatDate(n.story!.at)}:</span> {n.story!.notice}
                    </p>
                  )}
                  {n.signalsInWeek.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-sm text-med">
                      {n.signalsInWeek.map((x) => (
                        <li key={x.id}>
                          {x.at !== null && <span className="text-xs">{formatDate(x.at)}: </span>}
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
          </Panel>
        ) : (
          <EmptyState title="No story notice or signal was recorded for any narrative this week." />
        )}
      </Section>

      <Section id="watch" title="What to watch next week" description="Generated from the published rule thresholds, not forecasts.">
        {e.watch.length ? (
          <Panel>
            <ul className="flex flex-col divide-y divide-line">
              {e.watch.map((w, i) => (
                <li key={`${w.subject}-${i}`} className="py-3 text-sm first:pt-0 last:pb-0">
                  {w.tokenId ? <CoinLabel chain={w.tokenId.split(":")[0]!} address={w.tokenId.split(":").slice(1).join(":")} symbol={w.subject} /> : <span className="font-medium text-high">{w.subject}</span>}
                  <p className="mt-1 text-med">{w.condition}</p>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <EmptyState title="No rule threshold is close for any collected narrative." />
        )}
      </Section>

      <Section
        id="signals"
        title={
          <>
            Holder and bottoming changes
            {e.signals && (
              <InfoTip label="How bottoming changes are found">
                {e.signals.bottoming.note} Method {e.signals.bottoming.methodVersion}.
              </InfoTip>
            )}
          </>
        }
        description={
          e.signals
            ? `${plural(e.signals.bottoming.evaluated, "member coin")} evaluated at ${formatDateTime(e.signals.bottoming.from)} and ${formatDateTime(e.signals.bottoming.to)}. At the cutoff: ${Object.entries(e.signals.bottoming.atEnd)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${v} ${k.replaceAll("_", " ")}`)
                .join(", ")}.`
            : "Not part of this edition's method version."
        }
      >
        {e.signals ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="State changes during the week">
                {e.signals.bottoming.transitions.length ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Coin</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead className="text-right">Below peak</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {e.signals.bottoming.transitions.slice(0, 12).map((t) => (
                          <TableRow key={t.tokenId}>
                            <TableCell>{coin(t.tokenId, t.symbol)}</TableCell>
                            <TableCell className="text-xs">
                              <span className="text-med">{t.from.label}</span> → <span className="text-high">{t.to.label}</span>
                            </TableCell>
                            <TableCell className={FIG}>{t.drawdownCurrent === null ? "—" : formatValue(100 * t.drawdownCurrent, "percent")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {e.signals.bottoming.transitions.length > 12 && <p className="mt-3 text-xs text-med">+{e.signals.bottoming.transitions.length - 12} more in the week dataset.</p>}
                  </>
                ) : (
                  <p className="text-sm text-med">No member changed bottoming state, stage or label during the week.</p>
                )}
              </Panel>
              <Panel
                title="Liquidity to size"
                description={`Measured at both times for ${e.signals.liquidityToSize.measured} of ${e.signals.liquidityToSize.of} members: ${e.signals.liquidityToSize.rising} rising, ${e.signals.liquidityToSize.falling} falling. ${e.signals.liquidityToSize.note}`}
              >
                {e.signals.liquidityToSize.largestMoves.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Largest moves</TableHead>
                        <TableHead className="text-right">Start</TableHead>
                        <TableHead className="text-right">End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {e.signals.liquidityToSize.largestMoves.slice(0, 5).map((x) => (
                        <TableRow key={x.tokenId}>
                          <TableCell>{coin(x.tokenId, x.symbol)}</TableCell>
                          <TableCell className={`${FIG} text-med`}>{share(x.from)}</TableCell>
                          <TableCell className={FIG}>{share(x.to)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Panel>
            </div>
            <Note className="mt-4">{e.signals.holders.note}</Note>
          </>
        ) : (
          <EmptyState title="This revision predates the weekly holder and bottoming section." />
        )}
      </Section>

      {otherArticles.length > 0 && (
        <Section id="research" title="Research on this week" aside={<MoreLink href="/research">All research</MoreLink>}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {otherArticles.map((a) => (
              <li key={a.slug}>
                <Link href={`/research/${a.slug}`} className="flex h-full flex-col rounded-lg bg-card p-5 transition-colors duration-150 hover:bg-surface-3">
                  <span className="text-2xs font-medium tracking-[0.08em] text-med uppercase">{FORMAT_LABEL[a.format]}</span>
                  <span className="mt-2 text-base font-medium text-balance text-high">{a.title}</span>
                  {a.dek && <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-med">{a.dek}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="completeness" title="Completeness" description="An edition is complete only when every check passes; otherwise it is published as partial with the failing checks listed.">
        <Panel>
          <ul className="flex flex-col divide-y divide-line">
            {e.checks.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 py-3 text-sm first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex w-44 shrink-0 items-center gap-2">
                  <Badge variant={c.passed ? "neutral" : "warning"}>{c.passed ? "Pass" : "Fail"}</Badge>
                  <code className="font-mono text-xs text-med">{c.id}</code>
                </span>
                <span className="text-med">{c.detail}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Section>

      <AgentAccess
        subject={`the ${e.id} weekly edition`}
        discoveryPath={apiPaths.week(e.id)}
        paidPath={apiPaths.weekDataset(e.id)}
        kind="week-dataset"
        contents="The paid week dataset adds every revision with its cutoff, per-token daily rows behind each narrative total, all three historical modes in full, and venue-day fee rows."
      />
    </Container>
  );
}
