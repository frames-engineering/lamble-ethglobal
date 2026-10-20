/**
 * Response helpers shared by every /api/v1 route: one envelope, explicit cache policy, CORS for agents, and
 * errors that never leak internals.
 */
import { iso, parseRunId } from "../core/time.ts";
import type { EditionDoc, LoadedRelease } from "../service.ts";
import { BadRequest, NotFound } from "../service.ts";

export const API_SCHEMA = "lamble.api.v1";

/** Free responses are public and cacheable per release; paid responses are set by the payment layer. */
const FREE_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, PAYMENT-SIGNATURE, Content-Type",
  "Access-Control-Max-Age": "600",
} as const;

export interface ReleaseRef {
  id: string;
  dataCutoff: string;
  methodVersions: Record<string, string>;
  latestRun: string;
}

export function releaseRef(r: LoadedRelease): ReleaseRef {
  return { id: r.manifest.releaseId, dataCutoff: r.manifest.dataCutoff, methodVersions: r.manifest.methodVersions, latestRun: r.manifest.latestRun };
}

/** The period the data describes: daily runs up to a release cutoff, an ISO week, or a single snapshot. */
export interface DataInterval {
  cadence: "daily" | "weekly" | "snapshot";
  start: string | null;
  end: string;
  endExclusive: boolean;
}

/**
 * Times every response states. generatedAt: when the content was built (release, edition revision, article
 * update). dataThrough: the last source time per series the content includes. interval: the period it covers.
 */
export interface ResponseMeta {
  generatedAt: string | null;
  dataThrough: Record<string, string | null> | null;
  interval: DataInterval | null;
}

export function releaseMeta(r: LoadedRelease): ResponseMeta {
  const first = r.manifest.sourceRuns[0];
  return {
    generatedAt: r.manifest.generatedAt,
    dataThrough: { ...r.manifest.dataThrough },
    interval: { cadence: "daily", start: first ? iso(parseRunId(first)) : null, end: r.manifest.dataCutoff, endExclusive: false },
  };
}

export function editionMeta(e: Pick<EditionDoc, "builtAt" | "dataCutoff" | "interval">): ResponseMeta {
  return { generatedAt: e.builtAt, dataThrough: { edition: e.dataCutoff }, interval: { cadence: "weekly", start: e.interval.start, end: e.interval.end, endExclusive: true } };
}

/** The response envelope: schema version, the release the data comes from, its times, the data, and links. */
export function envelope(resource: string, release: ReleaseRef | null, data: unknown, links: Record<string, string>, meta: ResponseMeta) {
  return { schemaVersion: API_SCHEMA, resource, release, generatedAt: meta.generatedAt, dataThrough: meta.dataThrough, interval: meta.interval, data, links };
}

export function json(body: unknown, init: { status?: number; headers?: Record<string, string>; etag?: string; cache?: string } = {}, request?: Request): Response {
  const headers: Record<string, string> = { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": init.cache ?? FREE_CACHE, ...init.headers };
  if (init.etag) {
    headers.ETag = init.etag;
    if (request?.headers.get("if-none-match") === init.etag) return new Response(null, { status: 304, headers });
  }
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

export function apiError(status: number, error: string, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ schemaVersion: API_SCHEMA, error, message, ...extra }, { status, cache: "no-store" });
}

/** Maps service errors to HTTP; anything else is a 500 without details. */
export function handleError(e: unknown): Response {
  if (e instanceof BadRequest) return apiError(400, "bad_request", e.message);
  if (e instanceof NotFound) return apiError(404, "not_found", e.message);
  console.error("lamble api error", e);
  return apiError(500, "internal_error", "The request could not be completed.");
}

/** Wraps a route body so thrown service errors become JSON errors. */
export async function route(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    return handleError(e);
  }
}

export function options(): Response {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
}

/** Optional ?release=<id>; "latest" or absent means the published release. */
export function releaseParam(url: URL): string | undefined {
  const r = url.searchParams.get("release");
  return r && r !== "latest" ? r : undefined;
}

export function intParam(url: URL, name: string, def: number, min: number, max: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return def;
  if (!/^\d{1,9}$/.test(raw)) throw new BadRequest(`${name} must be a non-negative integer`);
  return Math.min(Math.max(Number(raw), min), max);
}
