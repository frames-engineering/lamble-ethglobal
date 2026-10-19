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
