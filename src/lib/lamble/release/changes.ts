/**
 * Change events between two releases' public content. Deterministic; numbered later on the global cursor.
 * An agent polls /api/v1/changes?since=<cursor> and only buys a bundle when something it watches changed.
 */
import type { ChangeEvent, CoinPublic, NarrativePublic, ReleasePublic } from "./types.ts";

export type DraftChange = Omit<ChangeEvent, "seq" | "releaseId" | "at" | "reconstructed">;

const PRICE_MOVE = 0.2;

function coinChanges(prev: CoinPublic | undefined, next: CoinPublic): DraftChange[] {
  const out: DraftChange[] = [];
  const label = next.symbol ?? next.id;
  if (!prev) {
    out.push({ entityType: "coin", entityId: next.id, kind: "coin.tracked", summary: `${label} is now tracked.`, from: null, to: { collection: next.collection.status } });
    return out;
  }
  if (prev.collection.status !== next.collection.status) {
    out.push({ entityType: "coin", entityId: next.id, kind: "coin.collection", summary: `${label}: collection ${prev.collection.status} → ${next.collection.status}.`, from: prev.collection.status, to: next.collection.status });
  }
  const pb = prev.bottoming;
  const nb = next.bottoming;
  if (pb.state !== nb.state || pb.stage !== nb.stage) {
    out.push({ entityType: "coin", entityId: next.id, kind: "bottoming.transition", summary: `${label}: bottoming ${pb.label} → ${nb.label}.`, from: { state: pb.state, stage: pb.stage }, to: { state: nb.state, stage: nb.stage, episode: nb.episodeId } });
  }
  const pInv = pb.episodes.find((e) => e.id === nb.episodeId)?.invalidations ?? 0;
  const nInv = nb.episodes.find((e) => e.id === nb.episodeId)?.invalidations ?? 0;
  if (nb.episodeId && nInv > pInv) {
    out.push({ entityType: "coin", entityId: next.id, kind: "bottoming.invalidation", summary: `${label}: new lower low in episode ${nb.episodeId}; low-holding and absorption conditions reset.`, from: pInv, to: nInv });
  }
  for (const c of nb.conditions) {
    const before = pb.conditions.find((x) => x.id === c.id)?.state;
    if (before && before !== c.state && pb.episodeId === nb.episodeId && nb.episodeId) {
      out.push({ entityType: "coin", entityId: next.id, kind: "bottoming.condition", summary: `${label}: ${c.label} ${before} → ${c.state}.`, from: before, to: c.state });
    }
  }
  const prevIntervals = new Set(prev.memberships.map((m) => m.intervalId));
  for (const m of next.memberships) {
    if (!prevIntervals.has(m.intervalId)) out.push({ entityType: "coin", entityId: next.id, kind: "membership.added", summary: `${label} joined ${m.narrativeTitle}.`, from: null, to: { narrative: m.narrativeSlug, interval: m.intervalId } });
    else {
      const was = prev.memberships.find((x) => x.intervalId === m.intervalId)!;
      if (was.collection !== m.collection) out.push({ entityType: "coin", entityId: next.id, kind: "membership.collection", summary: `${label} in ${m.narrativeTitle}: ${was.collection} → ${m.collection}.`, from: was.collection, to: m.collection });
    }
  }
  const p0 = prev.market.price.value;
  const p1 = next.market.price.value;
  if (p0 && p1 && next.market.price.asOf !== prev.market.price.asOf && Math.abs(p1 / p0 - 1) >= PRICE_MOVE) {
    out.push({ entityType: "coin", entityId: next.id, kind: "metric.price", summary: `${label} price ${p1 > p0 ? "+" : ""}${(100 * (p1 / p0 - 1)).toFixed(0)}% since the previous release.`, from: p0, to: p1 });
  }
  return out;
}

function narrativeChanges(prev: NarrativePublic | undefined, next: NarrativePublic): DraftChange[] {
  const out: DraftChange[] = [];
  if (!prev) {
    out.push({ entityType: "narrative", entityId: next.slug, kind: "narrative.created", summary: `New narrative: ${next.title}.`, from: null, to: { state: next.lifecycle.state } });
    return out;
  }
  if (prev.lifecycle.state !== next.lifecycle.state) {
    out.push({ entityType: "narrative", entityId: next.slug, kind: "narrative.lifecycle", summary: `${next.title}: ${prev.lifecycle.state} → ${next.lifecycle.state}.`, from: prev.lifecycle.state, to: next.lifecycle.state });
  }
  if (prev.featured.featured !== next.featured.featured) {
    out.push({ entityType: "narrative", entityId: next.slug, kind: "narrative.featured", summary: `${next.title} ${next.featured.featured ? "is featured" : "left featured placement (membership unchanged)"}.`, from: prev.featured.featured, to: next.featured.featured });
  }
  if (prev.trend !== next.trend && next.lifecycle.state === "collected") {
    out.push({ entityType: "narrative", entityId: next.slug, kind: "narrative.trend", summary: `${next.title}: ${prev.trend} → ${next.trend}.`, from: prev.trend, to: next.trend });
  }
  return out;
}

export function diffReleases(prev: Pick<ReleasePublic, "coins" | "narratives" | "market"> | null, next: Pick<ReleasePublic, "coins" | "narratives" | "market">): DraftChange[] {
  const out: DraftChange[] = [];
  const prevCoins = new Map((prev?.coins ?? []).map((c) => [c.id, c]));
  for (const c of next.coins) out.push(...coinChanges(prev ? prevCoins.get(c.id) : undefined, c));
  const prevNarratives = new Map((prev?.narratives ?? []).map((n) => [n.id, n]));
  for (const n of next.narratives) out.push(...narrativeChanges(prev ? prevNarratives.get(n.id) : undefined, n));
  if (prev && prev.market.feeSubtotal.anchor !== next.market.feeSubtotal.anchor) {
    out.push({ entityType: "market", entityId: "fees", kind: "market.financial-day", summary: `Covered fee subtotal for the day before ${next.market.feeSubtotal.anchor?.slice(0, 10)}: ${next.market.feeSubtotal.value === null ? "unknown (a component is missing)" : `$${Math.round(next.market.feeSubtotal.value).toLocaleString("en-US")}`}.`, from: prev.market.feeSubtotal.value, to: next.market.feeSubtotal.value });
  }
  return out;
}

export interface RevisionRow {
  entity_type: string;
  entity_id: string;
  metric: string;
  n: number;
  first_window: number | null;
  last_window: number | null;
}

const day = (t: number | null) => (t === null ? "?" : new Date(t * 1000).toISOString().slice(0, 10));

/**
 * Corrections: values a source restated after LAMBLE had stored them. The original stays in the store and
 * the restated value points at it (revisionOf); each affected coin or launchpad gets one event, plus one
 * release-level summary. Unmapped entities count only in the summary.
 */
export function correctionChanges(rows: RevisionRow[], names: { coin: Map<string, string>; venue: Map<string, string> }): DraftChange[] {
  if (!rows.length) return [];
  const out: DraftChange[] = [];
  const group = new Map<string, { entityType: "coin" | "launchpad"; entityId: string; label: string; rows: RevisionRow[] }>();
  for (const r of rows) {
    const coin = r.entity_type === "token" ? names.coin.get(r.entity_id) : undefined;
    const venue = r.entity_type === "venue_provider" ? names.venue.get(r.entity_id) : undefined;
    if (coin === undefined && venue === undefined) continue;
    const key = `${r.entity_type}|${r.entity_id}`;
    const g = group.get(key) ?? { entityType: coin !== undefined ? ("coin" as const) : ("launchpad" as const), entityId: coin !== undefined ? r.entity_id : venue!, label: coin ?? venue!, rows: [] };
    g.rows.push(r);
    group.set(key, g);
  }
  for (const g of [...group.values()].sort((a, b) => a.entityType.localeCompare(b.entityType) || a.entityId.localeCompare(b.entityId))) {
    const n = g.rows.reduce((a, r) => a + r.n, 0);
    const first = Math.min(...g.rows.map((r) => r.first_window ?? Infinity));
    const last = Math.max(...g.rows.map((r) => r.last_window ?? -Infinity));
    out.push({
      entityType: g.entityType,
      entityId: g.entityId,
      kind: "correction.restated",
      summary: `${g.label}: the source restated ${n} earlier value(s) (${[...new Set(g.rows.map((r) => r.metric))].join(", ")}) for windows ${day(Number.isFinite(first) ? first : null)} to ${day(Number.isFinite(last) ? last : null)}. Originals are kept.`,
      from: null,
      to: { revised: n, metrics: [...new Set(g.rows.map((r) => r.metric))], firstWindow: Number.isFinite(first) ? first : null, lastWindow: Number.isFinite(last) ? last : null },
    });
  }
  const total = rows.reduce((a, r) => a + r.n, 0);
  out.push({
    entityType: "release",
    entityId: "observations",
    kind: "release.corrections",
    summary: `${total} stored value(s) restated by sources since the previous release, across ${new Set(rows.map((r) => `${r.entity_type}|${r.entity_id}`)).size} entities. Each restatement keeps the original and points at it.`,
    from: null,
    to: { revised: total, byEntityType: Object.fromEntries([...new Set(rows.map((r) => r.entity_type))].sort().map((t) => [t, rows.filter((r) => r.entity_type === t).reduce((a, r) => a + r.n, 0)])) },
  });
  return out;
}

/**
 * Whether a feed event belongs to a completed publication. Publishing writes the feed, then the index, then the
 * pointer; a release is committed once the pointer reaches it, so committed releases are the index entries up to and
 * including the published one. Events of a publication interrupted before its pointer moved are not served, and the
 * next publication replaces them. Before any publication nothing is committed; a pointer missing from the index (an
 * index older than the pointer) gives nothing to judge by, and every event counts.
 */
export function committedEvents(index: readonly { releaseId: string }[], published: string | null | undefined): (e: { releaseId: string }) => boolean {
  if (!published) return () => false;
  const at = index.findIndex((e) => e.releaseId === published);
  if (at < 0) return () => true;
  const committed = new Set(index.slice(0, at + 1).map((e) => e.releaseId));
  return (e) => committed.has(e.releaseId);
}
