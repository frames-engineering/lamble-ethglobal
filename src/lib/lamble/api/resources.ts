/**
 * API resource documents. Free documents describe a resource (identity, coverage, availability, schema, price,
 * export status) without market values; paid bundles carry the values with provenance, filtered by the
 * rights gate. Both read only published release files through the service layer.
 */
import type { Catalog } from "../catalog/catalog.ts";
import { loadCatalog } from "../catalog/load.ts";
import { type Pricing, priceFor } from "../payments/pricing.ts";
import type { ResourceKind } from "../payments/pricing.ts";
import type { CoinPublic, Evidence, NarrativePublic, ReleasePublic } from "../release/types.ts";
import { resolveCitation } from "../research/cite.ts";
import { articleCitations, resolveEditionValue, resolveReleaseValue } from "../research/validate.ts";
import type { Article } from "../research/types.ts";
import {
  type ArticleSummary,
  type EditionDoc,
  type LoadedRelease,
  allChanges,
  editionIndex,
  getEdition,
  holderCoverage,
  loadBundles,
  loadRelease,
  releaseIndex,
} from "../service.ts";
import { apiPaths } from "./paths.ts";
import { type ExportPlan, applyPlan, exportPlan } from "./rights.ts";

export interface OfferSummary {
  kind: ResourceKind;
  path: string;
  price: string | null;
  currency: string;
  pricing: { status: string; approved: boolean };
  sellable: boolean;
  export: ExportPlan;
}

export function offerSummary(kind: ResourceKind, path: string, pricing: Pricing | null): OfferSummary {
  return {
    kind,
    path,
    price: pricing ? priceFor(pricing, kind) : null,
    currency: pricing?.currency ?? "USD",
    pricing: { status: pricing?.status ?? "unconfigured", approved: pricing?.approved ?? false },
    sellable: exportPlan(kind, loadCatalog()).sellable,
    export: exportPlan(kind, loadCatalog()),
  };
}

function evidenceFor(ids: string[], index: Record<string, Evidence>): Evidence[] {
  return [...new Set(ids)].map((id) => index[id]).filter((e): e is Evidence => Boolean(e));
}

/** Releases still retained on this server that contain the entity. */
function retainedWith(test: (r: LoadedRelease) => boolean): string[] {
  const out: string[] = [];
  for (const r of releaseIndex()) {
    if (r.removed) continue;
    try {
      if (test(loadRelease(r.releaseId))) out.push(r.releaseId);
    } catch {
      // A pruned release directory: not available here.
    }
  }
  return out;
}

// ---------------------------------------------------------------- coins

export function coinListItem(c: CoinPublic) {
  return {
    id: c.id,
    chain: c.chain,
    address: c.address,
    symbol: c.symbol,
    name: c.name,
    collection: c.collection.status,
    narratives: [...new Set(c.memberships.filter((m) => m.effectiveTo === null).map((m) => m.narrativeSlug))],
    coverage: { holderComponentsWithValue: holderCoverage(c), bottoming: c.bottoming.state, priceSamples: c.charts.price.length },
    links: { page: `/coins/${c.chain}/${c.address}`, discovery: apiPaths.coin(c.chain, c.address) },
  };
}

export function coinDiscovery(r: LoadedRelease, c: CoinPublic, pricing: Pricing | null) {
  const states = Object.fromEntries(Object.entries(c.market).map(([k, m]) => [k, { state: m.state, asOf: m.asOf }]));
  const methods = new Map(r.data.methods.holderComponents.map((m) => [m.id, m]));
  return {
    identity: { id: c.id, chain: c.chain, address: c.address, symbol: c.symbol, name: c.name, explorerUrl: c.explorerUrl },
    coverage: {
      collection: c.collection,
      market: states,
      holders: {
        withValue: holderCoverage(c),
        of: c.holders.components.length,
        components: c.holders.components.map((h) => ({ id: h.id, state: h.measure.state, requires: methods.get(h.id)?.requires ?? [] })),
        composite: c.holders.composite.state,
      },
      bottoming: { state: c.bottoming.state, priceBasis: c.bottoming.priceBasis, methodVersion: c.bottoming.methodVersion },
      memberships: { open: c.memberships.filter((m) => m.effectiveTo === null).length, total: c.memberships.length },
      series: { priceSamples: c.charts.price.length, priceBasis: c.charts.priceBasis, dailyVolumeDays: c.charts.volumeDaily.length, dailyVolumeEnd: c.charts.volumeDailyEnd },
      providerPanels: c.providerPanels.map((p) => ({ capability: p.capability, applicable: p.applicable, state: p.state })),
    },
    availability: { firstObservedAt: c.identity.firstObservedAt, firstAvailableAt: c.identity.firstAvailableAt, releases: retainedWith((x) => x.coins.has(c.id)) },
    offers: [offerSummary("coin-bundle", apiPaths.coinBundle(c.chain, c.address), pricing), offerSummary("coin-history", apiPaths.coinHistory(c.chain, c.address), pricing)],
    schema: { openapi: apiPaths.openapi(), bundle: "#/components/schemas/CoinBundle", history: "#/components/schemas/CoinHistory" },
  };
}

interface CoinBundleRaw {
  columns: unknown;
  series: Record<string, unknown>;
  evidence: string[];
  memberships: unknown[];
  bottoming: unknown;
  holders: unknown;
  peers: unknown;
}

function coinRaw(releaseId: string, id: string): CoinBundleRaw {
  const b = loadBundles(releaseId) as { coins: Record<string, CoinBundleRaw> };
  const raw = b.coins[id];
  if (!raw) throw new Error(`Release ${releaseId} has no bundle for ${id}`);
  return raw;
}

export function coinBundle(releaseId: string, id: string) {
  const r = loadRelease(releaseId);
  const c = r.coins.get(id)!;
  const raw = coinRaw(releaseId, id);
  const plan = exportPlan("coin-bundle", loadCatalog());
  const evidenceIds = [...c.evidence, ...c.memberships.flatMap((m) => m.evidence)];
  return {
    identity: { id: c.id, chain: c.chain, address: c.address, explorerUrl: c.explorerUrl, firstObservedAt: c.identity.firstObservedAt, firstAvailableAt: c.identity.firstAvailableAt },
    sections: applyPlan(plan, {
      market: c.market,
      series: { charts: c.charts, latest: { columns: raw.columns, series: raw.series } },
      holders: { components: c.holders.components, composite: c.holders.composite, inputs: raw.holders, methodVersion: c.holders.methodVersion },
      bottoming: { current: c.bottoming, evaluations: raw.bottoming },
      peers: { peers: c.peers, raw: raw.peers },
      metadata: { symbol: c.symbol, name: c.name, names: c.names, tokenCreatedAt: c.identity.tokenCreatedAt, tokenCreatedBasis: c.identity.tokenCreatedBasis, originVenue: c.identity.originVenue, originStatus: c.identity.originStatus, pools: c.identity.pools },
      memberships: { intervals: c.memberships, records: raw.memberships },
    }),
    evidence: evidenceFor(evidenceIds, r.data.evidence),
    export: plan,
  };
}

export function coinHistory(releaseId: string, id: string) {
  const r = loadRelease(releaseId);
  const c = r.coins.get(id)!;
  const raw = coinRaw(releaseId, id);
  const plan = exportPlan("coin-history", loadCatalog());
  return {
    identity: { id: c.id, chain: c.chain, address: c.address },
    sections: applyPlan(plan, {
      series: { columns: raw.columns, series: raw.series, note: "Every retained observation; revisions keep the original with revisionOf set." },
      memberships: { intervals: c.memberships, records: raw.memberships },
    }),
    evidence: evidenceFor(raw.evidence, r.data.evidence),
    export: plan,
  };
}

// ---------------------------------------------------------------- narratives

export function narrativeListItem(n: NarrativePublic) {
  return {
    id: n.id,
    slug: n.slug,
    title: n.title,
    category: n.category,
    lifecycle: n.lifecycle.state,
    featured: n.featured,
    trend: n.trend,
    members: n.memberCounts,
    firstObservedAt: n.firstObservedAt,
    links: { page: `/narratives/${n.slug}`, discovery: apiPaths.narrative(n.slug) },
  };
}

export function narrativeDiscovery(r: LoadedRelease, n: NarrativePublic, pricing: Pricing | null) {
  return {
    identity: { id: n.id, slug: n.slug, title: n.title, category: n.category, summary: n.summary },
    coverage: {
      lifecycle: { state: n.lifecycle.state, since: n.lifecycle.since },
      members: n.memberCounts,
      activity: { volume24h: n.activity.volume24h.state, volume7d: n.activity.volume7d.state, volume30d: n.activity.volume30d.state, lastObservedAt: n.activity.lastObservedAt, scope: n.activity.volumeScope },
      evidence: { projectClaims: n.evidence.projectClaims.length, independent: n.evidence.independent.length, posts: n.evidence.posts.length },
    },
    availability: { firstObservedAt: n.firstObservedAt, releases: retainedWith((x) => x.narratives.has(n.slug)), editions: editionIndex().filter((e) => safeEdition(e.id)?.narratives.some((x) => x.slug === n.slug)).map((e) => e.id) },
    offers: [offerSummary("narrative-bundle", apiPaths.narrativeBundle(n.slug), pricing)],
    schema: { openapi: apiPaths.openapi(), bundle: "#/components/schemas/NarrativeBundle" },
  };
}

export function narrativeBundle(releaseId: string, slug: string) {
  const r = loadRelease(releaseId);
  const n = r.narratives.get(slug)!;
  const raw = (loadBundles(releaseId) as { narratives: Record<string, { memberships: unknown; versions: unknown; lifecycle: unknown; memberSeries: unknown }> }).narratives[n.id];
  if (!raw) throw new Error(`Release ${releaseId} has no bundle for narrative ${n.id}`);
  const plan = exportPlan("narrative-bundle", loadCatalog());
  const evidence = [...n.evidence.projectClaims, ...n.evidence.independent, ...n.evidence.posts];
  return {
    identity: { id: n.id, slug: n.slug, title: n.title, category: n.category, summary: n.summary, firstObservedAt: n.firstObservedAt },
    sections: applyPlan(plan, {
      memberships: { members: n.members.map((m) => ({ tokenId: m.tokenId, symbol: m.symbol, chain: m.chain, intervalId: m.intervalId, effectiveFrom: m.effectiveFrom, collection: m.collection, observedThrough: m.observedThrough, originVenue: m.originVenue })), records: raw.memberships, counts: n.memberCounts },
      versions: { current: { title: n.title, summary: n.summary, story: n.story }, records: raw.versions },
      lifecycle: { current: n.lifecycle, records: raw.lifecycle, featured: n.featured },
      memberSeries: raw.memberSeries,
      activity: { ...n.activity, concentration: n.concentration, breadth: n.breadth, overlap: n.overlap, trend: n.trend, market: n.market },
    }),
    evidence: { items: evidence.map((e) => ({ id: e.id, kind: e.kind, label: e.label, url: e.url, at: e.at })), note: n.evidence.note },
    export: plan,
  };
}

// ---------------------------------------------------------------- weeks

function safeEdition(id: string): EditionDoc | null {
  try {
    return getEdition(id);
  } catch {
    return null;
  }
}

export function weekListItem(e: ReturnType<typeof editionIndex>[number]) {
  return { id: e.id, title: e.title, interval: e.interval, status: e.status, latestRevision: e.latestRevision, provenance: e.provenance, links: { page: `/market/${e.id}`, discovery: apiPaths.week(e.id) } };
}

export function weekDiscovery(e: EditionDoc, entry: ReturnType<typeof editionIndex>[number], pricing: Pricing | null) {
  return {
    identity: { id: e.id, title: e.title, interval: e.interval, comparison: e.comparison },
    coverage: {
      status: e.status,
      checks: e.checks,
      narratives: e.narratives.length,
      venues: e.market.venues.length,
      feeSubtotalComplete: e.market.feeSubtotal.complete,
      modes: ["as_known_then", ...Object.keys(e.alternateModes)],
    },
    availability: { revisions: entry.revisions, latestRevision: entry.latestRevision, provenance: e.provenance, methodVersion: e.methodVersion },
    offers: [offerSummary("week-dataset", apiPaths.weekDataset(e.id), pricing)],
    schema: { openapi: apiPaths.openapi(), dataset: "#/components/schemas/WeekDataset" },
  };
}

export function weekDataset(e: EditionDoc) {
  const plan = exportPlan("week-dataset", loadCatalog());
  return {
    identity: { id: e.id, title: e.title, interval: e.interval, comparison: e.comparison, revision: e.revision, dataCutoff: e.dataCutoff, methodVersion: e.methodVersion },
    sections: applyPlan(plan, {
      fees: { feeSubtotal: e.market.feeSubtotal, creatorEarnings: e.market.creatorEarnings, venues: e.market.venues, excluded: e.market.excluded, venueChanges: e.venueChanges },
      narratives: { asKnownThen: e.narratives, alternateModes: e.alternateModes, dedup: e.dedup, breadth: e.breadth },
      indexedActivity: e.market.indexedActivity,
      editorial: { status: e.status, checks: e.checks, watch: e.watch, revisionOf: e.revisionOf, revisionReason: e.revisionReason, provenance: e.provenance, releaseId: e.releaseId, contentSha256: e.contentSha256 },
      signals: e.signals ?? null,
    }),
    export: plan,
  };
}

// ---------------------------------------------------------------- launchpads

export function launchpadListItem(l: ReleasePublic["launchpads"][number]) {
  const p = l.presentation as { chains?: string[]; url?: string; domain?: string };
  return {
    slug: l.slug,
    name: l.name,
    chains: p.chains ?? [],
    url: p.url ?? null,
    feeSubtotal: l.feeSubtotal,
    financialAnchor: l.financialAnchor,
    indexedActivityMapped: l.indexed !== null,
    trackedCoins: l.coins.length,
    links: { page: `/launchpads/${l.slug}` },
  };
}

export function launchpadsDataset(releaseId: string) {
  const r = loadRelease(releaseId);
  const raw = (loadBundles(releaseId) as { launchpads: Record<string, Record<string, unknown>> }).launchpads;
  const plan = exportPlan("launchpads-dataset", loadCatalog());
  return {
    identity: { venues: r.data.launchpads.map((l) => l.slug), financialAnchor: r.data.market.feeSubtotal.anchor },
    sections: applyPlan(plan, {
      fees: Object.fromEntries(r.data.launchpads.map((l) => [l.slug, { metrics: l.metrics, columns: raw[l.slug]?.columns ?? null, fees: raw[l.slug]?.fees ?? [], revenue: raw[l.slug]?.revenue ?? [], supplySide: raw[l.slug]?.supplySide ?? [] }])),
      indexedActivity: Object.fromEntries(r.data.launchpads.map((l) => [l.slug, { latest: l.indexed, history: raw[l.slug]?.indexedHistory ?? [] }])),
      policy: {
        feeSubtotal: { included: r.data.market.feeSubtotal.included, excluded: r.data.market.feeSubtotal.excluded, scope: r.data.market.feeSubtotal.scope },
        venues: Object.fromEntries(r.data.launchpads.map((l) => [l.slug, { feeModel: (l.presentation as { feeModel?: unknown }).feeModel ?? null, supplySideDefinition: l.supplySideDefinition }])),
      },
    }),
    export: plan,
  };
}

// ---------------------------------------------------------------- research

export function articleListItem(a: ArticleSummary) {
  return { ...a, links: { page: `/research/${a.slug}`, discovery: apiPaths.article(a.slug) } };
}

export function articleDiscovery(a: Article, pricing: Pricing | null) {
  return {
    identity: { slug: a.slug, title: a.title, dek: a.dek, format: a.format, publishedAt: a.publishedAt, updatedAt: a.updatedAt, releaseId: a.releaseId, dataCutoff: a.dataCutoff },
    review: a.review,
    attribution: a.attribution,
    entities: a.entities,
    confidence: { level: a.confidence, reason: a.confidenceReason },
    offers: [offerSummary("research-article", apiPaths.articleBundle(a.slug), pricing)],
    schema: { openapi: apiPaths.openapi(), bundle: "#/components/schemas/ArticleBundle" },
  };
}

export function articleBundle(a: Article, catalog: Catalog = loadCatalog()) {
  const plan = exportPlan("research-article", catalog);
  let evidence: Record<string, Evidence> = {};
  try {
    evidence = loadRelease(a.releaseId).data.evidence;
  } catch {
    evidence = {};
  }
  const cites = new Set(articleCitations(a));
  return {
    identity: { slug: a.slug, releaseId: a.releaseId, dataCutoff: a.dataCutoff },
    sections: applyPlan(plan, {
      article: a,
      citedValues: Object.fromEntries(
        [...cites].map((c) => {
          const label = resolveCitation(c, evidence);
          if (label.kind === "release") return [c, resolveReleaseValue(c)];
          if (label.kind === "edition") return [c, resolveEditionValue(c)];
          if (label.kind === "change") {
            const event = allChanges().find((x) => `change:${x.seq}` === c);
            return [c, event ? { found: true, value: event } : { found: false }];
          }
          return [c, { found: label.kind !== "unknown", reference: { kind: label.kind, label: label.label, href: label.href } }];
        }),
      ),
    }),
    export: plan,
  };
}
