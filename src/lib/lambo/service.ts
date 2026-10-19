/**
 * The one read path for published research. Pages and API route handlers both call these functions; the
 * website never calls its own API and never buys anything. Everything is read from immutable release files,
 * so serving makes no upstream calls of any kind.
 *
 * Server-only (node:fs). Identifiers from URLs are validated before they touch the filesystem.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { type Chain, IdentityError, isChain, tokenIdentity } from "./core/identity.ts";
import { isWeekId } from "./core/time.ts";
import type { ChangeEvent, CoinPublic, LaunchpadPublic, NarrativePublic, ReleaseManifest, ReleasePublic } from "./release/types.ts";
import { sha256 } from "./server/io.ts";

export const RELEASE_ID = /^rel-\d{8}T\d{6}Z-[0-9a-f]{8}$/;
const SLUG = /^[a-z0-9][a-z0-9.-]{0,63}$/;

export class NotFound extends Error {
  readonly code = "not_found";
}
export class BadRequest extends Error {
  readonly code = "bad_request";
}

export function dataRoot(): string {
  return process.env.LAMBO_DATA_DIR ?? path.join(process.env.LAMBO_ROOT ?? process.cwd(), "data");
}

export function contentRoot(): string {
  return path.join(process.env.LAMBO_ROOT ?? process.cwd(), "content");
}

export interface LoadedRelease {
  manifest: ReleaseManifest;
  data: ReleasePublic;
  coins: Map<string, CoinPublic>;
  narratives: Map<string, NarrativePublic>;
  launchpads: Map<string, LaunchpadPublic>;
  etag: string;
}

const releases = new Map<string, LoadedRelease>();
const bundles = new Map<string, Record<string, unknown>>();

/** Drops cached releases (tests, or an operator reload after publication on a long-running server). */
export function resetCaches(): void {
  releases.clear();
  bundles.clear();
}

export function publishedReleaseId(): string {
  const file = path.join(dataRoot(), "releases", "published.json");
  if (!existsSync(file)) throw new NotFound("No release has been published yet. Run `npm run lambo -- refresh`.");
  const { releaseId } = JSON.parse(readFileSync(file, "utf8")) as { releaseId: string };
  if (!RELEASE_ID.test(releaseId)) throw new Error("Corrupt published pointer");
  return releaseId;
}

export function releaseIndex(): { releaseId: string; dataCutoff: string; publishedAt: string; latestRun: string; pinned: boolean; removed?: boolean }[] {
  const file = path.join(dataRoot(), "releases", "index.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

/** Loads a release (the published one by default). The public file is verified against its manifest checksum. */
export function loadRelease(releaseId?: string): LoadedRelease {
  const id = releaseId ?? publishedReleaseId();
  if (!RELEASE_ID.test(id)) throw new BadRequest(`Not a release id: ${id}`);
  const cached = releases.get(id);
  if (cached) return cached;
  const dir = path.join(dataRoot(), "releases", id);
  if (!existsSync(path.join(dir, "manifest.json"))) throw new NotFound(`Release ${id} is not available on this server.`);
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as ReleaseManifest;
  const raw = readFileSync(path.join(dir, "public.json"));
  if (sha256(raw) !== manifest.files["public.json"]?.sha256) throw new Error(`Release ${id}: public.json does not match its manifest checksum`);
  const data = JSON.parse(raw.toString("utf8")) as ReleasePublic;
  const loaded: LoadedRelease = {
    manifest,
    data,
    coins: new Map(data.coins.map((c) => [c.id, c])),
    narratives: new Map(data.narratives.map((n) => [n.slug, n])),
    launchpads: new Map(data.launchpads.map((l) => [l.slug, l])),
    etag: `"${manifest.contentSha256.slice(0, 32)}"`,
  };
  releases.set(id, loaded);
  return loaded;
}

/** Paid bundle content. Only the API fulfillment path calls this; pages never do. */
export function loadBundles(releaseId: string): Record<string, unknown> {
  if (!RELEASE_ID.test(releaseId)) throw new BadRequest(`Not a release id: ${releaseId}`);
  const cached = bundles.get(releaseId);
  if (cached) return cached;
  const dir = path.join(dataRoot(), "releases", releaseId);
  const file = path.join(dir, "bundles.json.gz");
  if (!existsSync(file)) throw new NotFound(`Release ${releaseId} has no bundle file on this server.`);
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as ReleaseManifest;
  const bytes = readFileSync(file);
  if (sha256(bytes) !== manifest.files["bundles.json.gz"]?.sha256) throw new Error(`Release ${releaseId}: bundles do not match the manifest checksum`);
  const parsed = JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, unknown>;
  bundles.set(releaseId, parsed);
  return parsed;
}

// ---------------------------------------------------------------- coins

export function parseCoinRoute(chain: string, address: string): { chain: Chain; address: string; id: string } {
  if (!isChain(chain)) throw new NotFound(`Unknown chain: ${chain}`);
  try {
    const identity = tokenIdentity(chain, decodeURIComponent(address));
    return { chain: identity.chain, address: identity.address, id: identity.id };
  } catch (e) {
    if (e instanceof IdentityError) throw new BadRequest(e.message);
    throw e;
  }
}

export function getCoin(chain: string, address: string, releaseId?: string): CoinPublic | null {
  const { id } = parseCoinRoute(chain, address);
  return loadRelease(releaseId).coins.get(id) ?? null;
}

export interface CoinFilters {
  q?: string;
  chain?: string;
  narrative?: string;
  collection?: CoinPublic["collection"]["status"];
  bottoming?: CoinPublic["bottoming"]["state"];
  minLiquidity?: number;
  maxAgeDays?: number;
  minCoverage?: number;
  sort?: "volume" | "liquidity" | "marketCap" | "change7d" | "age" | "symbol";
  order?: "asc" | "desc";
}

/** Holder components with a value (observed/derived/stale) out of nine. */
export function holderCoverage(c: CoinPublic): number {
  return c.holders.components.filter((h) => h.measure.value !== null).length;
}

export function filterCoins(coins: CoinPublic[], f: CoinFilters, now: number): CoinPublic[] {
  const q = f.q?.trim().toLowerCase();
  let out = coins.filter((c) => {
    if (q && !`${c.symbol ?? ""} ${c.name ?? ""} ${c.address}`.toLowerCase().includes(q)) return false;
    if (f.chain && c.chain !== f.chain) return false;
    if (f.narrative && !c.memberships.some((m) => m.narrativeSlug === f.narrative && m.collection !== "ended")) return false;
    if (f.collection && c.collection.status !== f.collection) return false;
    if (f.bottoming && c.bottoming.state !== f.bottoming) return false;
    if (f.minLiquidity !== undefined && !((c.market.liquidity.value ?? -1) >= f.minLiquidity)) return false;
    if (f.minCoverage !== undefined && holderCoverage(c) < f.minCoverage) return false;
    if (f.maxAgeDays !== undefined) {
      const created = c.identity.tokenCreatedAt ? Date.parse(c.identity.tokenCreatedAt) / 1000 : null;
      if (created === null || now - created > f.maxAgeDays * 86_400) return false;
    }
    return true;
  });
  const key: Record<NonNullable<CoinFilters["sort"]>, (c: CoinPublic) => number | string | null> = {
    volume: (c) => c.market.volume24hRolling.value,
    liquidity: (c) => c.market.liquidity.value,
    marketCap: (c) => c.market.marketCap.value,
    change7d: (c) => c.market.change7d.value,
    age: (c) => (c.identity.tokenCreatedAt ? Date.parse(c.identity.tokenCreatedAt) : null),
    symbol: (c) => (c.symbol ?? "").toLowerCase(),
  };
  const k = key[f.sort ?? "volume"];
  const dir = (f.order ?? (f.sort === "symbol" ? "asc" : "desc")) === "asc" ? 1 : -1;
  out = [...out].sort((a, b) => {
    const av = k(a);
    const bv = k(b);
    if (av === null) return bv === null ? a.id.localeCompare(b.id) : 1;
    if (bv === null) return -1;
    if (av === bv) return a.id.localeCompare(b.id);
    return (av < bv ? -1 : 1) * dir;
  });
  return out;
}

// ---------------------------------------------------------------- narratives, launchpads

export function assertSlug(slug: string): string {
  if (!SLUG.test(slug)) throw new BadRequest(`Not a slug: ${slug}`);
  return slug;
}

export function getNarrative(slug: string, releaseId?: string): NarrativePublic | null {
  return loadRelease(releaseId).narratives.get(assertSlug(slug)) ?? null;
}

export function getLaunchpad(slug: string, releaseId?: string): LaunchpadPublic | null {
  return loadRelease(releaseId).launchpads.get(assertSlug(slug)) ?? null;
}

// ---------------------------------------------------------------- weekly editions

export interface EditionIndexEntry {
  id: string;
  title: string;
  interval: { start: string; end: string };
  status: string;
  latestRevision: number;
  provenance: string;
  revisions: { revision: number; dataCutoff: string; builtAt: string; reason: string[] | null }[];
}

export function editionIndex(): EditionIndexEntry[] {
  const file = path.join(dataRoot(), "editions", "index.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

export function getEdition(week: string, revision?: number): Record<string, unknown> & { revision: number } {
  if (!isWeekId(week)) throw new BadRequest(`Not an ISO week id: ${week}`);
  const entry = editionIndex().find((e) => e.id === week);
  if (!entry) throw new NotFound(`No edition for ${week}.`);
  const n = revision ?? entry.latestRevision;
  if (!Number.isInteger(n) || n < 1 || n > entry.latestRevision) throw new NotFound(`No revision ${revision} for ${week}.`);
  return JSON.parse(readFileSync(path.join(dataRoot(), "editions", week, `r${n}.json`), "utf8"));
}

// ---------------------------------------------------------------- changes

export function allChanges(): ChangeEvent[] {
  const file = path.join(dataRoot(), "changes", "events.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

export function changesSince(cursor: number, opts: { entityIds?: string[]; types?: string[]; limit?: number } = {}) {
  if (!Number.isInteger(cursor) || cursor < 0) throw new BadRequest("since must be a non-negative integer cursor");
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const events = allChanges();
  const ids = opts.entityIds?.length ? new Set(opts.entityIds) : null;
  const types = opts.types?.length ? new Set(opts.types) : null;
  const matching = events.filter((e) => e.seq > cursor && (!ids || ids.has(e.entityId)) && (!types || types.has(e.entityType)));
  const page = matching.slice(0, limit);
  const latestSeq = events.at(-1)?.seq ?? 0;
  return { events: page, nextCursor: page.length ? page.at(-1)!.seq : Math.max(cursor, latestSeq), latestSeq, hasMore: matching.length > page.length };
}

// ---------------------------------------------------------------- research articles

export interface ArticleSummary {
  slug: string;
  title: string;
  dek: string;
  format: "daily" | "weekly" | "coin-deep-dive" | "narrative-deep-dive";
  publishedAt: string;
  updatedAt: string;
  dataCutoff: string;
  releaseId: string;
  review: { status: "auto-published" | "pending-review" | "reviewed"; reviewer: string | null; reviewedAt: string | null; policy: string };
  entities: { coins: string[]; narratives: string[]; weeks: string[]; launchpads: string[] };
  confidence: "low" | "moderate" | "high";
}

export function listArticles(): ArticleSummary[] {
  const dir = path.join(contentRoot(), "research");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as ArticleSummary)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}

export function getArticle<T = Record<string, unknown>>(slug: string): (ArticleSummary & T) | null {
  assertSlug(slug);
  const file = path.join(contentRoot(), "research", `${slug}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ArticleSummary & T) : null;
}

export function articlesFor(entity: { coin?: string; narrative?: string; week?: string; launchpad?: string }): ArticleSummary[] {
  return listArticles().filter(
    (a) =>
      (entity.coin && a.entities.coins.includes(entity.coin)) ||
      (entity.narrative && a.entities.narratives.includes(entity.narrative)) ||
      (entity.week && a.entities.weeks.includes(entity.week)) ||
      (entity.launchpad && a.entities.launchpads.includes(entity.launchpad)),
  );
}
