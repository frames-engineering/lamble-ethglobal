/**
 * Research articles (content/research) against the published release and editions in data/: every citation
 * resolves, figures come from the release, review status is recorded honestly, production hides unreviewed
 * deep dives. Read-only.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { articleCitations, validateArticle } from "../../src/lib/lamble/research/validate.ts";
import { compactUsd, percent } from "../../src/lib/format.ts";
import { coinArticle, narrativeArticle, weeklyArticle } from "../../src/lib/lamble/research/generate.ts";
import type { Article } from "../../src/lib/lamble/research/types.ts";
import { articleVisible, contentRoot, editionIndex, getEdition, loadRelease } from "../../src/lib/lamble/service.ts";

const articles = readdirSync(path.join(contentRoot(), "research"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(contentRoot(), "research", f), "utf8")) as Article);

test("the required formats exist: a weekly edition article, a coin deep dive, a narrative deep dive", () => {
  const formats = new Set(articles.map((a) => a.format));
  for (const f of ["weekly", "coin-deep-dive", "narrative-deep-dive"]) assert.ok(formats.has(f as Article["format"]), f);
});

test("every stored article passes the publishing gate: citations resolve, charts equal the release", () => {
  for (const a of articles) {
    assert.deepEqual(validateArticle(a), [], a.slug);
    assert.ok(articleCitations(a).length > 0, `${a.slug} cites nothing`);
  }
});

test("the gate rejects an unresolvable citation and a chart that differs from its cited value", () => {
  const a = articles.find((x) => x.body.some((b) => b.type === "chart"))!;
  const broken = structuredClone(a);
  const chart = broken.body.find((b) => b.type === "chart")!;
  assert.ok(chart.type === "chart");
  const point = chart.series[0]!.points.find((x) => x.value !== null && x.value > 0)!;
  point.value = point.value! * 2;
  broken.body.push({ type: "p", text: "Invented.", cites: [`release:${a.releaseId}#/coins/solana:nope/market/price`] });
  const problems = validateArticle(broken).map((x) => x.problem);
  assert.ok(problems.some((x) => /differs from the cited release value/.test(x)));
  assert.ok(problems.some((x) => x === "does not resolve"));
});

test("every article has charts where it has series, and a 'What cuts against this' section", () => {
  for (const a of articles) {
    const i = a.body.findIndex((b) => b.type === "h2" && b.text === "What cuts against this");
    assert.ok(i >= 0, `${a.slug}: no counter-evidence section`);
    const list = a.body[i + 1];
    assert.ok(list && list.type === "list" && list.items.length > 0 && list.items.every((x) => x.cites.length > 0), a.slug);
    if (a.format !== "weekly") assert.ok(a.body.some((b) => b.type === "chart"), `${a.slug}: no chart`);
  }
});

test("one coin and one narrative deep dive per ISO week; new picks avoid the last four weeks' subjects", async () => {
  const { weeklyPicks } = await import("../../scripts/lamble/research.ts");
  const r = loadRelease().data;
  const sel = { weeks: {} as Record<string, { coin: string | null; narrative: string | null; releaseId: string; chosenAt: string }> };
  const first = weeklyPicks(sel, "2026-W43", r, "2026-10-20T07:00:00Z");
  assert.equal(first.recorded, true);
  sel.weeks["2026-W43"] = first.pick;
  const again = weeklyPicks(sel, "2026-W43", r, "2026-10-21T07:00:00Z");
  assert.equal(again.recorded, false);
  assert.deepEqual(again.pick, first.pick, "every run in the week agrees");
  const next = weeklyPicks(sel, "2026-W44", r, "2026-10-27T07:00:00Z");
  if (first.pick.coin) assert.notEqual(next.pick.coin, first.pick.coin, "the next week's coin differs when another qualifies");
  if (first.pick.narrative && r.narratives.filter((n) => n.featured.featured).length > 1) assert.notEqual(next.pick.narrative, first.pick.narrative);
  const deepDives = articles.filter((a) => a.format === "coin-deep-dive" || a.format === "narrative-deep-dive");
  for (const a of deepDives) assert.match(a.slug, /-\d{4}-w\d{2}$/, `${a.slug} is pinned to a week`);
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
  const { mergeArticle } = await import("../../scripts/lamble/research.ts");
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
  assert.ok(next.article.changelog.at(-1)!.summary.includes(`previously release ${stored.releaseId}, reviewed by Synthetic Reviewer — that review does not cover this text`));
  // The stored article itself still names the release it was written from, and the API binds its offer to it.
  assert.equal(stored.releaseId, loadRelease(stored.releaseId).manifest.releaseId);
});
