import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { FORMAT_LABEL, REVIEW_LABEL } from "@/components/research/article-bits";
import { EmptyState, PageHeader } from "@/components/research/panel";
import { formatDate } from "@/components/research/time";
import { cn } from "@/lib/utils";
import type { ArticleFormat } from "@/lib/lamble/research/types";
import { listArticles } from "@/lib/lamble/service";

export const metadata: Metadata = {
  title: "Research",
  description: "Daily facts, the weekly State of the Trenches, and coin and narrative deep dives, generated from published LAMBLE releases with every number cited.",
  alternates: { canonical: "/research", types: { "application/rss+xml": "/research/feed.xml", "application/atom+xml": "/research/atom.xml" } },
};

const CONFIDENCE_LABEL = { low: "Low confidence", moderate: "Moderate confidence", high: "High confidence" } as const;

/** One format filter: a quiet tab, underlined when current. */
function FormatLink({ href, current, label, count }: { href: string; current: boolean; label: string; count: number }) {
  return (
    <li className="flex">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn("relative flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors duration-150", current ? "text-high" : "text-med hover:text-high")}
      >
        {label}
        <span className="font-mono text-xs text-low">{count}</span>
        {current && <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-high" />}
      </Link>
    </li>
  );
}

export default async function ResearchIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const format = typeof sp.format === "string" && Object.hasOwn(FORMAT_LABEL, sp.format) ? (sp.format as ArticleFormat) : null;
  const all = listArticles();
  const articles = format ? all.filter((a) => a.format === format) : all;
  return (
    <Container>
      <PageHeader
        title="Research"
        description={
          <p>
            Articles are generated from a published release: numbers are copied from the release by code and each paragraph cites where its figures come from. Each article states whether a person has reviewed it; none claims a review that did not happen.
          </p>
        }
        meta={
          <>
            <a href="/research/feed.xml" className="transition-colors duration-150 hover:text-high">
              RSS feed
            </a>
            <a href="/research/atom.xml" className="transition-colors duration-150 hover:text-high">
              Atom feed
            </a>
          </>
        }
      />

      <nav aria-label="Article formats" className="mt-8 border-b border-line">
        <ul className="flex h-12 items-stretch gap-6 overflow-x-auto scrollbar-none">
          <FormatLink href="/research" current={format === null} label="All" count={all.length} />
          {(Object.keys(FORMAT_LABEL) as ArticleFormat[]).map((f) => (
            <FormatLink key={f} href={`/research?format=${f}`} current={format === f} label={FORMAT_LABEL[f]} count={all.filter((a) => a.format === f).length} />
          ))}
        </ul>
      </nav>

      <div className="pt-8">
        {articles.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map((a) => {
              const kind = FORMAT_LABEL[a.format];
              // Daily notes are titled "Daily facts, Oct 27, 2026": the eyebrow already says the first half.
              const stripped = a.title.toLowerCase().startsWith(kind.toLowerCase()) ? a.title.slice(kind.length).replace(/^[\s,:–-]+/, "") : "";
              return (
                <li key={a.slug}>
                  <Link href={`/research/${a.slug}`} className="flex h-full flex-col rounded-lg bg-card p-5 transition-colors duration-150 hover:bg-surface-3">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-2xs font-medium tracking-[0.08em] text-med uppercase">{kind}</span>
                      <span className="shrink-0 text-xs text-med">{formatDate(a.publishedAt)}</span>
                    </span>
                    <span className="mt-2 text-base font-medium text-balance text-high">{stripped || a.title}</span>
                    {a.dek && <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-med">{a.dek}</span>}
                    <span className="mt-auto pt-4 text-xs text-low">
                      {REVIEW_LABEL[a.review.status]} · {CONFIDENCE_LABEL[a.confidence]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No articles yet">Articles appear after `npm run lamble -- research` runs against a published release.</EmptyState>
        )}
      </div>
    </Container>
  );
}
