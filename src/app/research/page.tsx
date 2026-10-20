import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { FORMAT_LABEL, REVIEW_LABEL } from "@/components/research/article-bits";
import { EmptyState, PageHeader } from "@/components/research/panel";
import { formatDate } from "@/components/research/time";
import { Badge } from "@/components/ui/badge";
import type { ArticleFormat } from "@/lib/lamble/research/types";
import { listArticles } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Research",
  description: "Daily facts, the weekly State of the Trenches, and coin and narrative deep dives, generated from published LAMBLE releases with every number cited.",
  alternates: { canonical: "/research", types: { "application/rss+xml": "/research/feed.xml", "application/atom+xml": "/research/atom.xml" } },
};

export default async function ResearchIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const format = typeof sp.format === "string" && Object.hasOwn(FORMAT_LABEL, sp.format) ? (sp.format as ArticleFormat) : null;
  const all = listArticles();
  const articles = format ? all.filter((a) => a.format === format) : all;
  return (
    <Container>
      <PageHeader
        eyebrow="Research"
        title="Research"
        description={
          <p>
            Articles are generated from a published release: numbers are copied from the release by code and each paragraph cites where its figures come from. Each article states whether a person has reviewed it; none claims a review that did not happen.
          </p>
        }
        meta={
          <>
            <a href="/research/feed.xml" className="hover:text-high">
              RSS
            </a>
            <a href="/research/atom.xml" className="hover:text-high">
              Atom
            </a>
          </>
        }
      />
      <nav aria-label="Article formats" className="mb-4 flex flex-wrap gap-2">
        <Link href="/research" aria-current={format === null ? "page" : undefined} className="rounded-full border border-line-med px-3 py-1 text-xs text-med hover:text-high aria-[current=page]:bg-surface-3 aria-[current=page]:text-high">
          All ({all.length})
        </Link>
        {(Object.keys(FORMAT_LABEL) as ArticleFormat[]).map((f) => (
          <Link
            key={f}
            href={`/research?format=${f}`}
            aria-current={format === f ? "page" : undefined}
            className="rounded-full border border-line-med px-3 py-1 text-xs text-med hover:text-high aria-[current=page]:bg-surface-3 aria-[current=page]:text-high"
          >
            {FORMAT_LABEL[f]} ({all.filter((a) => a.format === f).length})
          </Link>
        ))}
      </nav>
      <div className="pb-8">
        {articles.length ? (
          <ul className="flex flex-col gap-3">
            {articles.map((a) => (
              <li key={a.slug} className="rounded-xl bg-card p-4 shadow-sm light:shadow-black/8">
                <div className="flex flex-wrap items-center gap-2 text-2xs text-med">
                  <Badge variant="neutral">{FORMAT_LABEL[a.format]}</Badge>
                  <Badge variant={a.review.status === "reviewed" ? "positive" : "outline"}>{REVIEW_LABEL[a.review.status]}</Badge>
                  <span>{formatDate(a.publishedAt)}</span>
                  <span>Confidence: {a.confidence}</span>
                </div>
                <h2 className="mt-2 text-base font-semibold text-high">
                  <Link href={`/research/${a.slug}`} className="hover:underline">
                    {a.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-med">{a.dek}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No articles yet">Articles appear after `npm run lamble -- research` runs against a published release.</EmptyState>
        )}
      </div>
    </Container>
  );
}
