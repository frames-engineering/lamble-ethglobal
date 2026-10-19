/**
 * Research articles (content/research) against the published release and editions in data/: every citation
 * resolves, figures come from the release, review status is recorded honestly, production hides unreviewed
 * deep dives. Read-only.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { resolveReleaseValue } from "../../src/lib/lambo/api/resources.ts";
import { compactUsd, percent } from "../../src/lib/format.ts";
import { coinArticle, narrativeArticle, weeklyArticle } from "../../src/lib/lambo/research/generate.ts";
import type { Article } from "../../src/lib/lambo/research/types.ts";
import { allChanges, articleVisible, contentRoot, editionIndex, getEdition, loadRelease } from "../../src/lib/lambo/service.ts";

const articles = readdirSync(path.join(contentRoot(), "research"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(contentRoot(), "research", f), "utf8")) as Article);

function citations(a: Article): string[] {
  const out: string[] = [];
  for (const b of a.body) {
    if (b.type === "p") out.push(...b.cites);
    if (b.type === "list") for (const i of b.items) out.push(...i.cites);
    if (b.type === "facts") for (const r of b.rows) out.push(r.cite);
  }
  return out;
}

function resolveEdition(c: string): boolean {
  const m = /^edition:(\d{4}-W\d{2})\/r(\d+)#\/(.*)$/.exec(c);
  if (!m) return false;
  let cur: unknown = getEdition(m[1]!, Number(m[2]));
  for (const p of m[3]!.split("/").map((s) => s.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (cur === null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur !== undefined;
}

test("the required formats exist: a weekly edition article, a coin deep dive, a narrative deep dive", () => {
  const formats = new Set(articles.map((a) => a.format));
  for (const f of ["weekly", "coin-deep-dive", "narrative-deep-dive"]) assert.ok(formats.has(f as Article["format"]), f);
});

test("every citation in every article resolves", () => {
  const changes = new Set(allChanges().map((e) => `change:${e.seq}`));
  for (const a of articles) {
    const evidence = loadRelease(a.releaseId).data.evidence;
    for (const c of citations(a)) {
      if (c.startsWith("release:")) assert.ok(resolveReleaseValue(c).found, `${a.slug}: ${c}`);
      else if (c.startsWith("edition:")) assert.ok(resolveEdition(c), `${a.slug}: ${c}`);
      else if (c.startsWith("change:")) assert.ok(changes.has(c), `${a.slug}: ${c}`);
      else assert.ok(evidence[c], `${a.slug}: unknown evidence ${c}`);
    }
    assert.ok(citations(a).length > 0, `${a.slug} cites nothing`);
  }
});

test("review status is a recorded fact, with no invented byline or reviewer", () => {
  for (const a of articles) {
    assert.equal(a.attribution.byline, null, a.slug);
    if (a.review.status === "reviewed") assert.ok(a.review.reviewer && a.review.reviewedAt, a.slug);
    else assert.equal(a.review.reviewer, null, a.slug);
    if (a.format === "coin-deep-dive" || a.format === "narrative-deep-dive") assert.notEqual(a.review.status, "auto-published", a.slug);
  }
});

test("production hides deep dives pending review; preview shows them", () => {
  const pending = articles.find((a) => a.review.status === "pending-review")!;
  const saved = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    assert.equal(articleVisible(pending), true);
    process.env.VERCEL_ENV = "production";
    assert.equal(articleVisible(pending), false);
    assert.equal(articleVisible({ review: { status: "auto-published", reviewer: null, reviewedAt: null, policy: "" } }), true);
  } finally {
    if (saved === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved;
  }
});

test("article figures are the release's figures", () => {
  const r = loadRelease();
  const latest = editionIndex()[0]!;
  const e = getEdition(latest.id);
  const w = weeklyArticle(e, r.data.releaseId);
  assert.ok(w.dek.includes(compactUsd(e.market.feeSubtotal.value, 2)));
  assert.ok(w.title.includes(percent(e.market.feeSubtotal.changePct, { digits: 1, signed: true })));
  const facts = w.body.find((b) => b.type === "facts");
  assert.ok(facts && facts.type === "facts");
  for (const row of facts.rows) {
    const venue = e.market.venues.find((v) => v.name === row.label)!;
    assert.ok(row.value.startsWith(compactUsd(venue.fees, 2)), `${row.label}: ${row.value}`);
  }
  const coin = r.data.coins.find((c) => c.id.startsWith("solana:DEW9dSN6"))!;
  const ca = coinArticle(r.data, coin);
  const mcap = ca.body.flatMap((b) => (b.type === "facts" ? b.rows : [])).find((x) => x.label.startsWith("Market cap"))!;
  assert.equal(mcap.value, compactUsd(coin.market.marketCap.value, 2));
  // Fractional returns are rendered as percents of the fraction, never as the raw fraction.
  const peers = ca.body.find((b) => b.type === "p" && b.text.startsWith("Peers are"));
  const firstPriced = coin.peers.find((p) => p.return7d !== null)!;
  assert.ok(peers && peers.type === "p" && peers.text.includes(percent(100 * firstPriced.return7d!, { digits: 1, signed: true })));
  const n = r.data.narratives.find((x) => x.slug === "super-intelligence")!;
  const na = narrativeArticle(r.data, n, [e]);
  assert.ok(na.dek.startsWith(compactUsd(n.activity.volume7d.value, 2)));
});

test("generation is deterministic for the same inputs", () => {
  const r = loadRelease();
  const coin = r.data.coins[0]!;
  assert.deepEqual(coinArticle(r.data, coin), coinArticle(r.data, coin));
});

test("historical articles stay pinned to their release; regeneration records the correction and drops a stale review", async () => {
  const { mergeArticle } = await import("../../scripts/lambo/research.ts");
  const stored = articles.find((a) => a.format === "weekly")!;
  const draft = Object.fromEntries(Object.entries(stored).filter(([k]) => !["schemaVersion", "publishedAt", "updatedAt", "generator", "changelog"].includes(k))) as Parameters<typeof mergeArticle>[1];
  assert.equal(mergeArticle(stored, draft, "2026-10-26T07:00:00Z").status, "unchanged");
  const reviewed = { ...stored, review: { ...stored.review, status: "reviewed" as const, reviewer: "Synthetic Reviewer", reviewedAt: "2026-10-20T00:00:00Z" } };
  const changed = { ...draft, releaseId: "rel-20261026T060000Z-bbbbbbbb", dek: `${draft.dek} (corrected)` };
  const next = mergeArticle(reviewed, changed, "2026-10-26T07:00:00Z");
  assert.equal(next.status, "updated");
  assert.equal(next.article.publishedAt, stored.publishedAt, "publication date is kept");
  assert.equal(next.article.releaseId, "rel-20261026T060000Z-bbbbbbbb");
  assert.equal(next.article.review.status, "auto-published", "a review does not carry over to new text");
  assert.match(next.article.changelog.at(-1)!.summary, /previously release rel-20261019T055754Z-[0-9a-f]{8}, reviewed by Synthetic Reviewer — that review does not cover this text/);
  // The stored article itself still names the release it was written from, and the API binds its offer to it.
  assert.equal(stored.releaseId, loadRelease(stored.releaseId).manifest.releaseId);
});
