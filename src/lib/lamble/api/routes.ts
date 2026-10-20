/**
 * Route bodies for /api/v1, kept out of the app directory so they can be tested without Next.js. Each takes a
 * Web Request (and route params) and returns a Response. Inputs are validated before any lookup.
 */
import { loadCatalog } from "../catalog/load.ts";
import { type Pricing, loadPricing } from "../payments/pricing.ts";
import { RESOURCE_KINDS } from "../payments/pricing.ts";
import {
  type CoinFilters,
  NotFound,
  articleVisible,
  assertSlug,
  changesSince,
  editionIndex,
  filterCoins,
  getArticle,
  getEdition,
  listArticles,
  loadRelease,
  parseCoinRoute,
  releaseIndex,
} from "../service.ts";
import { isWeekId } from "../core/time.ts";
import { type ResponseMeta, apiError, editionMeta, envelope, intParam, json, releaseMeta, releaseParam, releaseRef, route } from "./http.ts";
import { publicPaymentStatus, servePaid } from "./paid.ts";
import { apiPaths } from "./paths.ts";
import {
  articleBundle,
  articleDiscovery,
  articleListItem,
  coinBundle,
  coinDiscovery,
  coinHistory,
  coinListItem,
  launchpadListItem,
  launchpadsDataset,
  narrativeBundle,
  narrativeDiscovery,
  narrativeListItem,
  weekDataset,
  weekDiscovery,
  weekListItem,
} from "./resources.ts";
import { exportPlan } from "./rights.ts";

function pricingOrNull(): Pricing | null {
  try {
    return loadPricing();
  } catch {
    return null;
  }
}

function page<T>(items: T[], url: URL) {
  const limit = intParam(url, "limit", 100, 1, 500);
  const offset = intParam(url, "offset", 0, 0, 1_000_000);
  const slice = items.slice(offset, offset + limit);
  return { items: slice, total: items.length, offset, limit, nextOffset: offset + slice.length < items.length ? offset + slice.length : null };
}

// ---------------------------------------------------------------- index, health, changes

export function index(request: Request, siteUrl: string) {
  return route(() => {
    const r = loadRelease();
    const pricing = pricingOrNull();
    const catalog = loadCatalog();
    return json(
      envelope("index", releaseRef(r), {
        name: "LAMBLE trenches research API",
        description: "Structured research on crypto-trenches coins, narratives, launchpads and weekly editions. Free discovery; fixed-price research bundles paid per request with x402 or MPP. Powered by Frames.",
        releases: releaseIndex()
          .filter((x) => !x.removed)
          .map((x) => ({ id: x.releaseId, dataCutoff: x.dataCutoff, publishedAt: x.publishedAt, pinned: x.pinned })),
        pricing: pricing && { status: pricing.status, approved: pricing.approved, note: pricing.note, currency: pricing.currency, resources: pricing.resources, access: pricing.access, refundPolicy: pricing.refundPolicy },
        exports: Object.fromEntries(RESOURCE_KINDS.map((k) => [k, exportPlan(k, catalog)])),
        payments: publicPaymentStatus(),
        endpoints: {
          coins: apiPaths.coins(),
          coin: "/api/v1/coins/{chain}/{address}",
          coinBundle: "/api/v1/coins/{chain}/{address}/bundle",
          coinHistory: "/api/v1/coins/{chain}/{address}/history",
          narratives: apiPaths.narratives(),
          narrative: "/api/v1/narratives/{slug}",
          narrativeBundle: "/api/v1/narratives/{slug}/bundle",
          weeks: apiPaths.weeks(),
          week: "/api/v1/market/weeks/{week}",
          weekDataset: "/api/v1/market/weeks/{week}/dataset",
          launchpads: apiPaths.launchpads(),
          launchpadsDataset: apiPaths.launchpadsDataset(),
          research: apiPaths.research(),
          article: "/api/v1/research/{slug}",
          articleBundle: "/api/v1/research/{slug}/bundle",
          changes: "/api/v1/changes?since={cursor}",
          health: apiPaths.health(),
          openapi: apiPaths.openapi(),
        },
      }, { site: siteUrl, docs: "/api", sources: "/sources", methodology: "/methodology", llms: "/llms.txt" }, releaseMeta(r)),
      { etag: r.etag },
      request,
    );
  });
}

export function health() {
  return route(() => {
    const r = loadRelease();
    return json({ ok: true, release: { id: r.manifest.releaseId, dataCutoff: r.manifest.dataCutoff, checksumVerified: true, validation: r.manifest.validation.passed }, payments: publicPaymentStatus() }, { cache: "no-store" });
  });
}

export function changes(request: Request) {
  return route(() => {
    const url = new URL(request.url);
    const since = intParam(url, "since", 0, 0, Number.MAX_SAFE_INTEGER);
    const entity = url.searchParams.getAll("entity").flatMap((e) => e.split(",")).filter(Boolean).slice(0, 50);
    const type = url.searchParams.getAll("type").flatMap((e) => e.split(",")).filter(Boolean).slice(0, 10);
    for (const t of type) if (!["coin", "narrative", "launchpad", "market", "research", "edition", "release"].includes(t)) return apiError(400, "bad_request", `Unknown type: ${t}`);
    const limit = intParam(url, "limit", 100, 1, 500);
    const r = loadRelease();
    return json(envelope("changes", releaseRef(r), changesSince(since, { entityIds: entity, types: type, limit }), { self: "/api/v1/changes" }, releaseMeta(r)), { cache: "public, max-age=30" });
  });
}

// ---------------------------------------------------------------- coins

const SORTS = new Set(["volume", "liquidity", "marketCap", "change7d", "age", "symbol"]);

export function coins(request: Request) {
  return route(() => {
    const url = new URL(request.url);
    const r = loadRelease(releaseParam(url));
    const sp = url.searchParams;
    const sort = sp.get("sort") ?? "symbol";
    if (!SORTS.has(sort)) return apiError(400, "bad_request", `sort must be one of ${[...SORTS].join(", ")}`);
    const collection = sp.get("collection");
    if (collection && !["collected", "collection_paused", "inactive"].includes(collection)) return apiError(400, "bad_request", "unknown collection status");
    const f: CoinFilters = {
      q: sp.get("q")?.slice(0, 100) || undefined,
      chain: sp.get("chain") || undefined,
      narrative: sp.get("narrative") || undefined,
      collection: (collection || undefined) as CoinFilters["collection"],
      sort: sort as CoinFilters["sort"],
      order: sp.get("order") === "desc" ? "desc" : sp.get("order") === "asc" ? "asc" : undefined,
    };
    const list = filterCoins(r.data.coins, f, Math.floor(Date.parse(r.data.dataCutoff) / 1000)).map(coinListItem);
    return json(envelope("coins", releaseRef(r), page(list, url), { self: apiPaths.coins() }, releaseMeta(r)), { etag: `${r.etag.slice(0, -1)}-${url.search}"` }, request);
  });
}

export function coin(request: Request, params: { chain: string; address: string }) {
  return route(() => {
    const url = new URL(request.url);
    const id = parseCoinRoute(params.chain, params.address);
    const r = loadRelease(releaseParam(url));
    const c = r.coins.get(id.id);
    if (!c) {
      return apiError(404, "not_covered", `${id.id} is not covered in release ${r.manifest.releaseId}.`, { canonicalId: id.id, page: `/coins/${id.chain}/${id.address}` });
    }
    return json(envelope("coin", releaseRef(r), coinDiscovery(r, c, pricingOrNull()), { page: `/coins/${c.chain}/${c.address}`, self: apiPaths.coin(c.chain, c.address) }, releaseMeta(r)), { etag: r.etag }, request);
  });
}

export function coinPaid(request: Request, params: { chain: string; address: string }, which: "bundle" | "history", siteUrl: string) {
  return route(() => {
    const id = parseCoinRoute(params.chain, params.address);
    const path = which === "bundle" ? apiPaths.coinBundle(id.chain, id.address) : apiPaths.coinHistory(id.chain, id.address);
    return servePaid(
      request,
      {
        kind: which === "bundle" ? "coin-bundle" : "coin-history",
        params: { chain: id.chain, address: id.address },
        path,
        routePattern: `/api/v1/coins/:chain/:address/${which}`,
        description: `LAMBLE ${which === "bundle" ? "research bundle" : "observation history"} for ${id.id}`,
        exists: (releaseId) => loadRelease(releaseId).coins.has(id.id),
        render: (releaseId) => (which === "bundle" ? coinBundle(releaseId, id.id) : coinHistory(releaseId, id.id)),
      },
      siteUrl,
    );
  });
}

// ---------------------------------------------------------------- narratives

export function narratives(request: Request) {
  return route(() => {
    const url = new URL(request.url);
    const r = loadRelease(releaseParam(url));
    return json(envelope("narratives", releaseRef(r), page(r.data.narratives.map(narrativeListItem), url), { self: apiPaths.narratives() }, releaseMeta(r)), { etag: r.etag }, request);
  });
}

export function narrative(request: Request, params: { slug: string }) {
  return route(() => {
    const url = new URL(request.url);
    const slug = assertSlug(params.slug);
    const r = loadRelease(releaseParam(url));
    const n = r.narratives.get(slug);
    if (!n) throw new NotFound(`No narrative ${slug} in release ${r.manifest.releaseId}.`);
    return json(envelope("narrative", releaseRef(r), narrativeDiscovery(r, n, pricingOrNull()), { page: `/narratives/${slug}`, self: apiPaths.narrative(slug) }, releaseMeta(r)), { etag: r.etag }, request);
  });
}

export function narrativePaid(request: Request, params: { slug: string }, siteUrl: string) {
  return route(() => {
    const slug = assertSlug(params.slug);
    return servePaid(
      request,
      {
        kind: "narrative-bundle",
        params: { slug },
        path: apiPaths.narrativeBundle(slug),
        routePattern: "/api/v1/narratives/:slug/bundle",
        description: `LAMBLE narrative bundle for ${slug}`,
        exists: (releaseId) => loadRelease(releaseId).narratives.has(slug),
        render: (releaseId) => narrativeBundle(releaseId, slug),
      },
      siteUrl,
    );
  });
}

// ---------------------------------------------------------------- weeks

function weekId(raw: string): string {
  if (!isWeekId(raw)) throw new NotFound(`Not an ISO week id: ${raw}`);
  return raw;
}

function revisionParam(url: URL): number | undefined {
  const raw = url.searchParams.get("revision");
  if (raw === null) return undefined;
  if (!/^\d{1,4}$/.test(raw)) throw new NotFound("revision must be a positive integer");
  return Number(raw);
}

export function weeks(request: Request) {
  return route(() => {
    const url = new URL(request.url);
    const idx = editionIndex();
    const latest = (xs: string[]) => [...xs].sort().at(-1) ?? null;
    const meta: ResponseMeta = {
      generatedAt: latest(idx.flatMap((e) => e.revisions.map((r) => r.builtAt))),
      dataThrough: { edition: latest(idx.flatMap((e) => e.revisions.map((r) => r.dataCutoff))) },
      interval: idx.length ? { cadence: "weekly", start: [...idx.map((e) => e.interval.start)].sort()[0]!, end: latest(idx.map((e) => e.interval.end))!, endExclusive: true } : null,
    };
    return json(envelope("weeks", null, page(idx.map(weekListItem), url), { self: apiPaths.weeks() }, meta), {}, request);
  });
}

export function week(request: Request, params: { week: string }) {
  return route(() => {
    const id = weekId(params.week);
    const entry = editionIndex().find((e) => e.id === id);
    if (!entry) throw new NotFound(`No edition for ${id}.`);
    const e = getEdition(id, revisionParam(new URL(request.url)));
    return json(envelope("week", null, weekDiscovery(e, entry, pricingOrNull()), { page: `/market/${id}`, self: apiPaths.week(id) }, editionMeta(e)), {}, request);
  });
}

export function weekPaid(request: Request, params: { week: string }, siteUrl: string) {
  return route(() => {
    const id = weekId(params.week);
    const entry = editionIndex().find((e) => e.id === id);
    if (!entry) throw new NotFound(`No edition for ${id}.`);
    const revision = revisionParam(new URL(request.url)) ?? entry.latestRevision;
    const e = getEdition(id, revision);
    return servePaid(
      request,
      {
        kind: "week-dataset",
        params: { week: id, revision: String(revision) },
        path: `${apiPaths.weekDataset(id)}?revision=${revision}`,
        routePattern: "/api/v1/market/weeks/:week/dataset",
        description: `LAMBLE weekly dataset ${id} revision ${revision}`,
        exists: () => true,
        render: () => weekDataset(e),
        fixedRelease: e.releaseId,
        meta: editionMeta(e),
      },
      siteUrl,
    );
  });
}

// ---------------------------------------------------------------- launchpads

export function launchpads(request: Request) {
  return route(() => {
    const url = new URL(request.url);
    const r = loadRelease(releaseParam(url));
    return json(
      envelope("launchpads", releaseRef(r), { items: r.data.launchpads.map(launchpadListItem), offers: [{ kind: "launchpads-dataset", path: apiPaths.launchpadsDataset() }] }, { self: apiPaths.launchpads(), page: "/launchpads" }, releaseMeta(r)),
      { etag: r.etag },
      request,
    );
  });
}

export function launchpadsPaid(request: Request, siteUrl: string) {
  return route(() =>
    servePaid(
      request,
      {
        kind: "launchpads-dataset",
        params: { scope: "all" },
        path: apiPaths.launchpadsDataset(),
        routePattern: "/api/v1/launchpads/dataset",
        description: "LAMBLE launchpads dataset",
        exists: (releaseId) => loadRelease(releaseId).data.launchpads.length > 0,
        render: (releaseId) => launchpadsDataset(releaseId),
      },
      siteUrl,
    ),
  );
}

// ---------------------------------------------------------------- research

/** An article is a snapshot at its data cutoff. */
function articleMeta(a: { updatedAt: string; dataCutoff: string }): ResponseMeta {
  return { generatedAt: a.updatedAt, dataThrough: { article: a.dataCutoff }, interval: { cadence: "snapshot", start: null, end: a.dataCutoff, endExclusive: false } };
}

export function research(request: Request) {
  return route(() => {
    const url = new URL(request.url);
    const list = listArticles();
    const latest = (xs: string[]) => [...xs].sort().at(-1) ?? null;
    const meta: ResponseMeta = { generatedAt: latest(list.map((a) => a.updatedAt)), dataThrough: { articles: latest(list.map((a) => a.dataCutoff)) }, interval: null };
    return json(envelope("research", null, page(list.map(articleListItem), url), { self: apiPaths.research(), feed: "/research/feed.xml" }, meta), {}, request);
  });
}

export function article(request: Request, params: { slug: string }) {
  return route(() => {
    const a = getArticle(assertSlug(params.slug));
    if (!a) throw new NotFound(`No article ${params.slug}.`);
    return json(envelope("article", null, articleDiscovery(a, pricingOrNull()), { page: `/research/${a.slug}`, self: apiPaths.article(a.slug) }, articleMeta(a)), {}, request);
  });
}

export function articlePaid(request: Request, params: { slug: string }, siteUrl: string) {
  return route(() => {
    const slug = assertSlug(params.slug);
    const a = getArticle(slug);
    if (!a || !articleVisible(a)) throw new NotFound(`No article ${slug}.`);
    return servePaid(
      request,
      {
        kind: "research-article",
        params: { slug },
        path: apiPaths.articleBundle(slug),
        routePattern: "/api/v1/research/:slug/bundle",
        description: `LAMBLE research article ${slug}`,
        // Only the current article file is kept, and it was written from one release. A credential pinned to an
        // earlier release (the article has been regenerated since) is told the resource is gone rather than handed
        // newer content under the older release's name.
        exists: (releaseId) => releaseId === a.releaseId,
        render: () => articleBundle(a),
        fixedRelease: a.releaseId,
        meta: articleMeta(a),
      },
      siteUrl,
    );
  });
}
