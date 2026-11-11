import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { AgentAccess } from "@/components/research/agent-access";
import { SeriesChart } from "@/components/research/charts";
import { PALETTE } from "@/components/research/colors";
import { FORMAT_LABEL, REVIEW_LABEL } from "@/components/research/article-bits";
import { ExternalLink } from "@/components/research/links";
import { Note, PageHeader, Panel } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { apiPaths } from "@/lib/lamble/api/paths";
import type { Evidence } from "@/lib/lamble/release/types";
import { articleCitations, resolveReleaseValue } from "@/lib/lamble/research/validate";
import { resolveCitation } from "@/lib/lamble/research/cite";
import type { Article, ArticleBlock } from "@/lib/lamble/research/types";
import { BadRequest, NotFound, getArticle, listArticles, loadRelease } from "@/lib/lamble/service";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return listArticles().map((a) => ({ slug: a.slug }));
}

function find(slug: string): Article | null {
  try {
    return getArticle(slug);
  } catch (e) {
    if (e instanceof BadRequest) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const a = find((await params).slug);
  if (!a) return { title: "Article not found", robots: { index: false } };
  return {
    title: a.title,
    description: a.dek,
    alternates: { canonical: `/research/${a.slug}` },
    openGraph: { title: a.title, description: a.dek, type: "article", publishedTime: a.publishedAt, modifiedTime: a.updatedAt, url: `/research/${a.slug}` },
  };
}

/** The evidence index of the release the article was written from; falls back to the published one. */
function evidenceFor(a: Article): Record<string, Evidence> {
  try {
    return loadRelease(a.releaseId).data.evidence;
  } catch (e) {
    if (e instanceof NotFound) return loadRelease().data.evidence;
    throw e;
  }
}

function Cites({ cites, evidence, start }: { cites: string[]; evidence: Record<string, Evidence>; start: Map<string, number> }) {
  if (!cites.length) return null;
  return (
    <sup className="ml-0.5 font-mono text-xs">
      {cites.map((c, i) => (
        <span key={c}>
          {i > 0 && ","}
          <a href={`#cite-${start.get(c)}`} className="text-link hover:underline" aria-label={`Source ${start.get(c)}: ${resolveCitation(c, evidence).label}`}>
            {start.get(c)}
          </a>
        </span>
      ))}
    </sup>
  );
}

function Block({ b, evidence, numbers }: { b: ArticleBlock; evidence: Record<string, Evidence>; numbers: Map<string, number> }): ReactNode {
  switch (b.type) {
    case "h2":
      return <h2 className="mt-10 text-xl font-medium text-balance text-high">{b.text}</h2>;
    case "p":
      return (
        <p className="mt-4 text-base leading-relaxed text-pretty text-high/90">
          {b.text}
          <Cites cites={b.cites} evidence={evidence} start={numbers} />
        </p>
      );
    case "list":
      return (
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-high/90 marker:text-low">
          {b.items.map((it) => (
            <li key={it.text}>
              {it.text}
              <Cites cites={it.cites} evidence={evidence} start={numbers} />
            </li>
          ))}
        </ul>
      );
    case "facts":
      return (
        <figure className="mt-6 min-w-0 rounded-sm border border-line p-4 md:p-5">
          <figcaption className="text-base font-medium text-high">{b.caption}</figcaption>
          <Table className="mt-2">
            <TableBody>
              {/* Labels can repeat within one table (the same coin under two narratives): key by position too. */}
              {b.rows.map((r, i) => (
                <TableRow key={`${i}-${r.label}`}>
                  <th scope="row" className="py-2 pr-3 text-left align-top font-normal whitespace-normal text-med">
                    {r.label}
                    {r.note && <span className="mt-0.5 block text-xs text-low">{r.note}</span>}
                  </th>
                  <TableCell className="text-right align-top font-mono text-high">
                    {r.value}
                    <Cites cites={[r.cite]} evidence={evidence} start={numbers} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </figure>
      );
    case "callout":
      return (
        <Note tone={b.tone} className="mt-6">
          {b.text}
        </Note>
      );
    case "chart": {
      return (
        <Panel className="mt-6">
          <SeriesChart
            series={b.series.map((s, i) => ({ id: `s${i}`, label: s.label, color: PALETTE[i % PALETTE.length]!, points: s.points }))}
            format={b.format}
            kind={b.format === "usd" ? "area" : "line"}
            height={180}
            summary={`${b.caption} Unobserved points are gaps, not zero.`}
          />
          <p className="mt-1 text-xs text-med">
            Data
            <Cites cites={b.series.map((s) => s.cite)} evidence={evidence} start={numbers} />
          </p>
        </Panel>
      );
    }
  }
}

function citationsOf(body: ArticleBlock[]): string[] {
  return [...new Set(articleCitations({ body }))];
}

/** End-matter heading (limitations, sources, corrections): smaller than the body's section headings. */
function EndHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-base font-medium text-high">
      {children}
    </h2>
  );
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const a = find((await params).slug);
  if (!a) notFound();
  const evidence = evidenceFor(a);
  const cites = citationsOf(a.body);
  const numbers = new Map(cites.map((c, i) => [c, i + 1]));
  const coin = a.entities.coins[0];
  const narrative = a.entities.narratives[0];
  const week = a.entities.weeks[0];

  return (
    <Container>
      <article className="max-w-[65ch]">
        <PageHeader
          eyebrow={
            <Link href={`/research?format=${a.format}`} className="transition-colors duration-150 hover:text-high">
              {FORMAT_LABEL[a.format]}
            </Link>
          }
          title={a.title}
          description={<p>{a.dek}</p>}
          meta={
            <>
              <span>Published {formatDate(a.publishedAt)}</span>
              {a.updatedAt !== a.publishedAt && <span>Updated {formatDate(a.updatedAt)}</span>}
              <span>Data cutoff {formatDateTime(a.dataCutoff)}</span>
              <span>
                Release <code className="font-mono">{a.releaseId}</code>
              </span>
            </>
          }
        />

        {/* Who made this and how far to trust it, before the first figure; the review policy says why it carries this label. */}
        <div className="mt-6 flex flex-col gap-1.5 border-y border-line py-4 text-xs leading-relaxed text-med">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant={a.review.status === "reviewed" ? "neutral" : "warning"}>{REVIEW_LABEL[a.review.status]}</Badge>
            <span>
              Confidence: <span className="text-high">{a.confidence}</span> — {a.confidenceReason}
            </span>
          </p>
          <p>
            {a.attribution.producer}. {a.attribution.drafting}
            {a.review.status === "reviewed" && a.review.reviewer ? ` Reviewed by ${a.review.reviewer} on ${formatDate(a.review.reviewedAt)}.` : ""}
          </p>
          <p className="text-low">{a.review.policy}</p>
        </div>

        <div className="mt-4">
          {a.body.map((b, i) => (
            <Block key={i} b={b} evidence={evidence} numbers={numbers} />
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-8 border-t border-line pt-8">
          {a.limitations.length > 0 && (
            <section aria-labelledby="limits">
              <EndHeading id="limits">Limitations</EndHeading>
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-med marker:text-low">
                {a.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="sources">
            <EndHeading id="sources">Sources</EndHeading>
            <ol className="mt-3 flex flex-col gap-1.5 text-xs leading-relaxed text-med">
              {cites.map((c) => {
                const r = resolveCitation(c, evidence);
                // A release pointer to an evidence entry (curated sources) renders as that source's own link.
                const v = r.kind === "release" ? resolveReleaseValue(c).value : undefined;
                const ev = v && typeof v === "object" && "url" in v && "label" in v ? (v as { url: string | null; label: string }) : null;
                const n = numbers.get(c);
                return (
                  <li key={c} id={`cite-${n}`} className="grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] target:text-high">
                    <span className="font-mono text-low">{n}.</span>
                    {ev?.url ? (
                      <ExternalLink href={ev.url}>{ev.label}</ExternalLink>
                    ) : r.href && r.external ? (
                      <ExternalLink href={r.href}>{r.label}</ExternalLink>
                    ) : r.href ? (
                      <Link href={r.href} className="text-link hover:underline">
                        {r.label}
                      </Link>
                    ) : (
                      <span>{r.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {a.changelog.length > 0 && (
            <section aria-labelledby="changes">
              <EndHeading id="changes">Corrections and updates</EndHeading>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs leading-relaxed text-med">
                {a.changelog.map((c) => (
                  <li key={c.at}>
                    <span className="text-high">{formatDate(c.at)}</span>: {c.summary}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(coin || narrative || week) && (
            <nav aria-label="Related" className="flex flex-wrap gap-2">
              {coin && (
                <Link href={`/coins/${coin.slice(0, coin.indexOf(":"))}/${coin.slice(coin.indexOf(":") + 1)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Coin page
                </Link>
              )}
              {narrative && (
                <Link href={`/narratives/${narrative}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Narrative page
                </Link>
              )}
              {week && (
                <Link href={`/market/${week}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Weekly edition {week}
                </Link>
              )}
            </nav>
          )}
        </div>
      </article>

      <AgentAccess
        subject={`the article "${a.title}"`}
        discoveryPath={apiPaths.article(a.slug)}
        paidPath={apiPaths.articleBundle(a.slug)}
        kind="research-article"
        contents="The paid article bundle returns the article with its structured data: every cited value resolved from the release, plus the entities' bundles it draws on."
      />
    </Container>
  );
}
