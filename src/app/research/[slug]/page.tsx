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
import { Note, PageHeader } from "@/components/research/panel";
import { formatDate, formatDateTime } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
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
    <sup className="ml-0.5 text-2xs">
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
      return <h2 className="mt-8 text-lg font-semibold text-high">{b.text}</h2>;
    case "p":
      return (
        <p className="mt-3 text-sm leading-relaxed text-high/90">
          {b.text}
          <Cites cites={b.cites} evidence={evidence} start={numbers} />
        </p>
      );
    case "list":
      return (
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-high/90">
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
        <figure className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-3">
          <figcaption className="mb-2 text-2xs text-med">{b.caption}</figcaption>
          <table className="w-full text-xs">
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.label} className="border-t border-divider first:border-t-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-med">
                    {r.label}
                    {r.note && <span className="block text-2xs text-low">{r.note}</span>}
                  </th>
                  <td className="py-1.5 text-right text-high tabular-nums">
                    {r.value}
                    <Cites cites={[r.cite]} evidence={evidence} start={numbers} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );
    case "callout":
      return (
        <Note tone={b.tone} className="mt-4">
          {b.text}
        </Note>
      );
    case "chart": {
      return (
        <div className="mt-4 rounded-lg bg-surface-2 p-3">
          <SeriesChart
            series={b.series.map((s, i) => ({ id: `s${i}`, label: s.label, color: PALETTE[i % PALETTE.length]!, points: s.points }))}
            format={b.format}
            kind={b.format === "usd" ? "area" : "line"}
            height={180}
            summary={`${b.caption} Unobserved points are gaps, not zero.`}
          />
          <p className="mt-1 text-2xs text-med">
            Data
            <Cites cites={b.series.map((s) => s.cite)} evidence={evidence} start={numbers} />
          </p>
        </div>
      );
    }
  }
}

function citationsOf(body: ArticleBlock[]): string[] {
  return [...new Set(articleCitations({ body }))];
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
      <article className="mx-auto max-w-3xl pb-8">
        <PageHeader
          eyebrow={
            <Link href={`/research?format=${a.format}`} className="hover:text-high">
              {FORMAT_LABEL[a.format]}
            </Link>
          }
          title={a.title}
          description={<p className="text-base">{a.dek}</p>}
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
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-med">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={a.review.status === "reviewed" ? "positive" : "warning"}>{REVIEW_LABEL[a.review.status]}</Badge>
            <span>
              Confidence: <span className="text-high">{a.confidence}</span> — {a.confidenceReason}
            </span>
          </div>
          <p>
            {a.attribution.producer}. {a.attribution.drafting}
            {a.review.status === "reviewed" && a.review.reviewer ? ` Reviewed by ${a.review.reviewer} on ${formatDate(a.review.reviewedAt)}.` : ""}
          </p>
          <p className="text-low">{a.review.policy}</p>
        </div>

        <div className="mt-2">
          {a.body.map((b, i) => (
            <Block key={i} b={b} evidence={evidence} numbers={numbers} />
          ))}
        </div>

        {a.limitations.length > 0 && (
          <section aria-labelledby="limits" className="mt-8">
            <h2 id="limits" className="text-sm font-semibold text-high">
              Limitations
            </h2>
            <ul className="mt-2 list-disc pl-5 text-xs leading-relaxed text-med">
              {a.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="sources" className="mt-8">
          <h2 id="sources" className="text-sm font-semibold text-high">
            Sources
          </h2>
          <ol className="mt-2 flex flex-col gap-1 text-2xs leading-relaxed text-med">
            {cites.map((c) => {
              const r = resolveCitation(c, evidence);
              // A release pointer to an evidence entry (curated sources) renders as that source's own link.
              const v = r.kind === "release" ? resolveReleaseValue(c).value : undefined;
              const ev = v && typeof v === "object" && "url" in v && "label" in v ? (v as { url: string | null; label: string }) : null;
              if (ev?.url) {
                return (
                  <li key={c} id={`cite-${numbers.get(c)}`} className="scroll-mt-24">
                    <span className="mr-1 text-low tabular-nums">{numbers.get(c)}.</span>
                    <ExternalLink href={ev.url}>{ev.label}</ExternalLink>
                  </li>
                );
              }
              return (
                <li key={c} id={`cite-${numbers.get(c)}`} className="scroll-mt-24">
                  <span className="mr-1 text-low tabular-nums">{numbers.get(c)}.</span>
                  {r.href && r.external ? (
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
          <section aria-labelledby="changes" className="mt-8">
            <h2 id="changes" className="text-sm font-semibold text-high">
              Corrections and updates
            </h2>
            <ul className="mt-2 text-xs text-med">
              {a.changelog.map((c) => (
                <li key={c.at}>
                  {formatDate(c.at)}: {c.summary}
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label="Related" className="mt-8 flex flex-wrap gap-2 text-xs">
          {coin && (
            <Link href={`/coins/${coin.slice(0, coin.indexOf(":"))}/${coin.slice(coin.indexOf(":") + 1)}`} className="rounded-full border border-line-med px-3 py-1 text-med hover:text-high">
              Coin page
            </Link>
          )}
          {narrative && (
            <Link href={`/narratives/${narrative}`} className="rounded-full border border-line-med px-3 py-1 text-med hover:text-high">
              Narrative page
            </Link>
          )}
          {week && (
            <Link href={`/market/${week}`} className="rounded-full border border-line-med px-3 py-1 text-med hover:text-high">
              Weekly edition {week}
            </Link>
          )}
        </nav>
      </article>
      <div className="pb-8">
        <AgentAccess
          subject={`the article "${a.title}"`}
          discoveryPath={apiPaths.article(a.slug)}
          paidPath={apiPaths.articleBundle(a.slug)}
          kind="research-article"
          contents="The paid article bundle returns the article with its structured data: every cited value resolved from the release, plus the entities' bundles it draws on."
        />
      </div>
    </Container>
  );
}
