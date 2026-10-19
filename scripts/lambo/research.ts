/**
 * Research preparation: writes articles for the published release into content/research/.
 *
 *   npm run lambo -- research [--dry-run]
 *
 * Offline: reads the published release and weekly editions only; never calls a provider. An article whose
 * content is unchanged keeps its file untouched; a changed article keeps its publication date, gets a new
 * updatedAt and a changelog line. A recorded review is preserved only while the reviewed text is unchanged.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { ARTICLE_SCHEMA, type Article } from "../../src/lib/lambo/research/types.ts";
import { GENERATOR, coinArticle, dailyArticle, narrativeArticle, weeklyArticle } from "../../src/lib/lambo/research/generate.ts";
import { readJsonIfExists, sha256, stableStringify, writeJsonAtomic } from "../../src/lib/lambo/server/io.ts";
import { allChanges, contentRoot, editionIndex, getEdition, loadRelease, releaseIndex } from "../../src/lib/lambo/service.ts";
import type { CoinPublic, NarrativePublic } from "../../src/lib/lambo/release/types.ts";

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

/** The coin with the longest observed record among collected coins in an open narrative; ties by 7-day volume. */
export function pickCoin(coins: CoinPublic[]): CoinPublic | null {
  return (
    coins
      .filter((c) => c.collection.status === "collected" && c.memberships.some((m) => m.effectiveTo === null))
      .sort((a, b) => b.charts.price.length - a.charts.price.length || (b.market.volume7d.value ?? -1) - (a.market.volume7d.value ?? -1) || a.id.localeCompare(b.id))[0] ?? null
  );
}

/** The featured narrative observed longest; ties by 7-day volume. */
export function pickNarrative(narratives: NarrativePublic[]): NarrativePublic | null {
  return (
    narratives
      .filter((n) => n.featured.featured)
      .sort((a, b) => a.firstObservedAt.localeCompare(b.firstObservedAt) || (b.activity.volume7d.value ?? -1) - (a.activity.volume7d.value ?? -1) || a.slug.localeCompare(b.slug))[0] ?? null
  );
}

type Draft = Omit<Article, "publishedAt" | "updatedAt" | "generator" | "changelog" | "schemaVersion">;

/**
 * How a regenerated draft replaces a stored article. Unchanged inputs keep the file as is. Changed inputs keep
 * the publication date, set updatedAt, append a changelog line naming the release it now reads, and reset the
 * review to the format's default: a recorded review covers the text that was reviewed, not the new text. The
 * article stays pinned to the release it states; nothing rewrites an old article silently.
 */
export function mergeArticle(prev: Article | null, d: Draft, at: string): { article: Article; status: "written" | "updated" | "unchanged" } {
  const inputSha256 = sha256(stableStringify({ body: d.body, title: d.title, dek: d.dek, limitations: d.limitations }));
  if (prev && prev.generator.inputSha256 === inputSha256) return { article: prev, status: "unchanged" };
  const article: Article = {
    schemaVersion: ARTICLE_SCHEMA,
    ...d,
    review: d.review,
    publishedAt: prev?.publishedAt ?? at,
    updatedAt: at,
    generator: { ...GENERATOR, inputSha256 },
    changelog: prev
      ? [...prev.changelog, { at, summary: `Regenerated from release ${d.releaseId} (data cutoff ${d.dataCutoff}); previously release ${prev.releaseId}${prev.review.status === "reviewed" ? `, reviewed by ${prev.review.reviewer} — that review does not cover this text` : ""}.` }]
      : [],
  };
  return { article, status: prev ? "updated" : "written" };
}

export function runResearch(argv: string[] = []) {
  const release = loadRelease();
  const r = release.data;
  const editions = editionIndex()
    .map((e) => getEdition(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const latestEdition = editions.at(-1) ?? null;
  const runDate = `${release.manifest.latestRun.slice(0, 4)}-${release.manifest.latestRun.slice(4, 6)}-${release.manifest.latestRun.slice(6, 8)}`;
  const sameRun = new Set(releaseIndex().filter((x) => x.latestRun === release.manifest.latestRun).map((x) => x.releaseId));
  const changes = allChanges().filter((e) => sameRun.has(e.releaseId));

  const drafts = [
    dailyArticle(r, runDate, changes),
    ...(latestEdition ? [weeklyArticle(latestEdition, r.releaseId)] : []),
    ...(() => {
      const coin = pickCoin(r.coins);
      return coin ? [coinArticle(r, coin)] : [];
    })(),
    ...(() => {
      const n = pickNarrative(r.narratives);
      return n ? [narrativeArticle(r, n, editions)] : [];
    })(),
  ];

  const dir = path.join(contentRoot(), "research");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const results: { slug: string; status: "written" | "updated" | "unchanged" }[] = [];
  for (const d of drafts) {
    const file = path.join(dir, `${d.slug}.json`);
    const next = mergeArticle(readJsonIfExists<Article>(file), d, nowIso());
    if (next.status !== "unchanged" && !argv.includes("--dry-run")) writeJsonAtomic(file, next.article);
    results.push({ slug: d.slug, status: next.status });
  }
  return results;
}

export function main(argv: string[]): number {
  console.log(JSON.stringify(runResearch(argv), null, 1));
  return 0;
}
