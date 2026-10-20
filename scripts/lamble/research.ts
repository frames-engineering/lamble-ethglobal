/**
 * Research preparation: writes articles for the published release into content/research/.
 *
 *   npm run lamble -- research [--dry-run]
 *
 * Offline: reads the published release and weekly editions only; never calls a provider. An article whose
 * content is unchanged keeps its file untouched; a changed article keeps its publication date, gets a new
 * updatedAt and a changelog line. A recorded review is preserved only while the reviewed text is unchanged.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { ARTICLE_SCHEMA, type Article } from "../../src/lib/lamble/research/types.ts";
import { GENERATOR, coinArticle, dailyArticle, narrativeArticle, weeklyArticle } from "../../src/lib/lamble/research/generate.ts";
import { readJsonIfExists, sha256, stableStringify, writeJsonAtomic } from "../../src/lib/lamble/server/io.ts";
import { parseRunId, weekId } from "../../src/lib/lamble/core/time.ts";
import { validateArticle } from "../../src/lib/lamble/research/validate.ts";
import { allChanges, contentRoot, editionIndex, getEdition, loadRelease, releaseIndex } from "../../src/lib/lamble/service.ts";
import type { DraftChange } from "../../src/lib/lamble/release/changes.ts";
import type { CoinPublic, NarrativePublic } from "../../src/lib/lamble/release/types.ts";
import { withLock } from "./lock.ts";
import { appendChangeEvents } from "./release/publish.ts";

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

/** The coin with the longest observed record among collected coins in an open narrative; ties by 7-day volume. */
export function pickCoin(coins: CoinPublic[], exclude: ReadonlySet<string> = new Set()): CoinPublic | null {
  return (
    coins
      .filter((c) => c.collection.status === "collected" && c.memberships.some((m) => m.effectiveTo === null) && !exclude.has(c.id))
      .sort((a, b) => b.charts.price.length - a.charts.price.length || (b.market.volume7d.value ?? -1) - (a.market.volume7d.value ?? -1) || a.id.localeCompare(b.id))[0] ?? null
  );
}

/** The featured narrative observed longest; ties by 7-day volume. */
export function pickNarrative(narratives: NarrativePublic[], exclude: ReadonlySet<string> = new Set()): NarrativePublic | null {
  return (
    narratives
      .filter((n) => n.featured.featured && !exclude.has(n.slug))
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
  return withLock("releases", () => prepareResearch(argv));
}

/** One coin and one narrative deep dive per ISO week, recorded so every run in the week agrees. */
export interface Selection {
  weeks: Record<string, { coin: string | null; narrative: string | null; releaseId: string; chosenAt: string }>;
}

const RECENT_WEEKS = 4;

/** This week's picks: recorded ones win; new picks avoid the subjects of the previous four weeks when possible. */
export function weeklyPicks(selection: Selection, week: string, r: { coins: CoinPublic[]; narratives: NarrativePublic[]; releaseId: string }, at: string) {
  const existing = selection.weeks[week];
  if (existing) return { pick: existing, recorded: false };
  const recent = Object.entries(selection.weeks)
    .filter(([w]) => w < week)
    .sort(([x], [y]) => x.localeCompare(y))
    .slice(-RECENT_WEEKS)
    .map(([, v]) => v);
  const coin = pickCoin(r.coins, new Set(recent.map((x) => x.coin).filter((x): x is string => x !== null))) ?? pickCoin(r.coins);
  const narrative = pickNarrative(r.narratives, new Set(recent.map((x) => x.narrative).filter((x): x is string => x !== null))) ?? pickNarrative(r.narratives);
  return { pick: { coin: coin?.id ?? null, narrative: narrative?.slug ?? null, releaseId: r.releaseId, chosenAt: at }, recorded: true };
}

type Status = "written" | "updated" | "unchanged" | "pinned" | "rejected";

function prepareResearch(argv: string[]) {
  const release = loadRelease();
  const r = release.data;
  const at = nowIso();
  const editions = editionIndex()
    .map((e) => getEdition(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const latestEdition = editions.at(-1) ?? null;
  const runDate = `${release.manifest.latestRun.slice(0, 4)}-${release.manifest.latestRun.slice(4, 6)}-${release.manifest.latestRun.slice(6, 8)}`;
  const sameRun = new Set(releaseIndex().filter((x) => x.latestRun === release.manifest.latestRun).map((x) => x.releaseId));
  // Research events are about these articles; an article never cites its own publication.
  const changes = allChanges().filter((e) => sameRun.has(e.releaseId) && e.entityType !== "research");

  const dir = path.join(contentRoot(), "research");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // Kept beside the articles directory, not in it: everything in content/research is an article.
  const selectionFile = path.join(contentRoot(), "research-selection.json");
  const selection = readJsonIfExists<Selection>(selectionFile) ?? { weeks: {} };
  const week = weekId(parseRunId(release.manifest.latestRun));
  const { pick, recorded } = weeklyPicks(selection, week, r, at);
  const coin = pick.coin ? r.coins.find((c) => c.id === pick.coin) : undefined;
  const narrative = pick.narrative ? r.narratives.find((n) => n.slug === pick.narrative) : undefined;
  const perWeek = (d: Draft): Draft => ({ ...d, slug: `${d.slug}-${week.toLowerCase()}`, title: `${d.title} (${week})` });

  const drafts: { draft: Draft; deepDive: boolean }[] = [
    { draft: dailyArticle(r, runDate, changes), deepDive: false },
    ...(latestEdition ? [{ draft: weeklyArticle(latestEdition, r.releaseId), deepDive: false }] : []),
    ...(coin ? [{ draft: perWeek(coinArticle(r, coin, editions)), deepDive: true }] : []),
    ...(narrative ? [{ draft: perWeek(narrativeArticle(r, narrative, editions)), deepDive: true }] : []),
  ];

  const dryRun = argv.includes("--dry-run");
  const results: { slug: string; status: Status; problems?: string[] }[] = [];
  const events: DraftChange[] = [];
  for (const { draft: d, deepDive } of drafts) {
    const file = path.join(dir, `${d.slug}.json`);
    const prev = readJsonIfExists<Article>(file);
    // A week's deep dive is written once and stays pinned to its release; --revise-deep-dives records a correction.
    if (deepDive && prev && !argv.includes("--revise-deep-dives")) {
      results.push({ slug: d.slug, status: "pinned" });
      continue;
    }
    const next = mergeArticle(prev, d, at);
    if (next.status === "unchanged") {
      results.push({ slug: d.slug, status: "unchanged" });
      continue;
    }
    // Publishing gate: every citation resolves and every chart equals the release value it cites.
    const problems = validateArticle(next.article);
    if (problems.length) {
      results.push({ slug: d.slug, status: "rejected", problems: problems.map((x) => `${x.cite}: ${x.problem}`) });
      continue;
    }
    if (!dryRun) {
      writeJsonAtomic(file, next.article);
      events.push(
        next.status === "written"
          ? { entityType: "research", entityId: d.slug, kind: "research.published", summary: `New research: ${d.title}.`, from: null, to: { updatedAt: next.article.updatedAt, releaseId: d.releaseId, review: d.review.status } }
          : { entityType: "research", entityId: d.slug, kind: "research.updated", summary: `${d.title}: ${next.article.changelog.at(-1)!.summary}`, from: { updatedAt: prev!.updatedAt, releaseId: prev!.releaseId }, to: { updatedAt: next.article.updatedAt, releaseId: d.releaseId } },
      );
    }
    results.push({ slug: d.slug, status: next.status });
  }
  if (!dryRun) {
    if (recorded) writeJsonAtomic(selectionFile, { weeks: { ...selection.weeks, [week]: pick } } satisfies Selection);
    appendChangeEvents(events, release.manifest.releaseId);
  }
  return results;
}

export function main(argv: string[]): number {
  const results = runResearch(argv);
  console.log(JSON.stringify(results, null, 1));
  return results.some((x) => x.status === "rejected") ? 1 : 0;
}
