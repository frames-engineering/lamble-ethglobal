/**
 * The one paid-route flow, in the order the payment contract requires:
 *   1. the route validated its inputs and the resource exists (before calling this);
 *   2. the rights gate: a bundle whose primary content cannot be exported is never offered;
 *   3. payments configured at all, without opening the commerce database otherwise;
 *   4. release pinning: a credential's release wins over ?release= and over "latest";
 *   5. the payment layer (offer, verify, settle, entitle, deliver).
 */
import { loadCatalog } from "../catalog/load.ts";
import { type ResourceDiscovery, getPaymentRuntime, handlePaidRequest, loadPricing, PAYMENT_EXPOSED_HEADERS, resolvePinnedRelease } from "../payments/index.ts";
import type { ResourceKind } from "../payments/pricing.ts";
import { BadRequest, NotFound, RELEASE_ID, loadRelease, publishedReleaseId, releaseIndex } from "../service.ts";
import { CORS_HEADERS, apiError, envelope, releaseRef } from "./http.ts";
import { exportPlan } from "./rights.ts";

export interface PaidSpec {
  kind: ResourceKind;
  /** Normalized parameters identifying the resource (sorted and hashed by the payment layer). */
  params: Record<string, string>;
  /** Path under the site origin, e.g. /api/v1/coins/solana/<mint>/bundle. */
  path: string;
  /** Route pattern for discovery metadata, e.g. /api/v1/coins/:chain/:address/bundle. */
  routePattern: string;
  description: string;
  /** Whether the resource exists in a release; false gives 404 (410 when a credential pinned that release). */
  exists(releaseId: string): boolean;
  /** Bundle body for a release; called only after access is established. */
  render(releaseId: string): unknown;
  /**
   * For resources built from one fixed release (an edition revision, an article), the release they were built
   * with. Offers bind to it instead of the published release.
   */
  fixedRelease?: string | null;
}

export function paymentsEnabledInEnv(env: Record<string, string | undefined> = process.env): boolean {
  const on = (v: string | undefined) => /^(1|true|yes|on)$/i.test(v?.trim() ?? "");
  return on(env.LAMBO_X402_ENABLED) || on(env.LAMBO_MPP_ENABLED);
}

/** Public payment status without opening the commerce database when nothing is enabled. Contains no secrets. */
export function publicPaymentStatus() {
  let pricing: { status: string; approved: boolean; note: string } | null = null;
  try {
    const p = loadPricing();
    pricing = { status: p.status, approved: p.approved, note: p.note };
  } catch {
    pricing = null;
  }
  if (!paymentsEnabledInEnv()) {
    return { available: false, reason: "No payment protocol is enabled on this deployment (LAMBO_X402_ENABLED, LAMBO_MPP_ENABLED).", pricing, protocols: null };
  }
  const s = getPaymentRuntime().status();
  return { available: s.available, reason: s.available ? null : "Enabled protocols are not available; see protocols.", pricing, protocols: s.protocols };
}

function retained(releaseId: string): boolean {
  if (!RELEASE_ID.test(releaseId)) return false;
  if (releaseIndex().some((r) => r.releaseId === releaseId && r.removed)) return false;
  try {
    loadRelease(releaseId);
    return true;
  } catch (e) {
    if (e instanceof NotFound || e instanceof BadRequest) return false;
    throw e;
  }
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  headers.set("Access-Control-Expose-Headers", PAYMENT_EXPOSED_HEADERS.join(", "));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function servePaid(request: Request, spec: PaidSpec, siteUrl: string): Promise<Response> {
  const plan = exportPlan(spec.kind, loadCatalog());
  if (!plan.sellable) {
    return withCors(apiError(403, "export_not_permitted", plan.note, { export: plan }));
  }
  if (!paymentsEnabledInEnv()) {
    return withCors(apiError(503, "payments_unavailable", "No payment protocol is enabled on this deployment; nothing can be bought here yet.", { export: plan }));
  }
  const runtime = getPaymentRuntime();
  const pinned = resolvePinnedRelease(request, runtime.store);
  let releaseId: string;
  if (pinned) {
    releaseId = pinned.releaseId;
  } else {
    const asked = new URL(request.url).searchParams.get("release");
    releaseId = spec.fixedRelease ?? (asked && asked !== "latest" ? asked : publishedReleaseId());
    if (!RELEASE_ID.test(releaseId)) return withCors(apiError(400, "bad_request", "release must be a release id or 'latest'"));
  }
  if (!retained(releaseId)) {
    return withCors(pinned ? apiError(410, "release_gone", `Release ${releaseId} is no longer retained on this server.`, { releaseId }) : apiError(404, "not_found", `Release ${releaseId} is not available on this server.`));
  }
  if (!spec.exists(releaseId)) {
    return withCors(pinned ? apiError(410, "resource_gone", `The resource is not in release ${releaseId}.`, { releaseId }) : apiError(404, "not_found", `The resource is not in release ${releaseId}.`));
  }
  const discovery: ResourceDiscovery = { path: spec.path, routePattern: spec.routePattern, outputSchema: { type: "object", description: `${spec.kind} (see ${siteUrl}/api/v1/openapi.json)` } };
  const res = await handlePaidRequest(
    request,
    {
      kind: spec.kind,
      params: spec.params,
      releaseId,
      canonicalUrl: `${siteUrl}${spec.path}`,
      description: spec.description,
      render: () => envelope(spec.kind, releaseRef(loadRelease(releaseId)), spec.render(releaseId), { self: spec.path, openapi: "/api/v1/openapi.json" }),
      discovery,
    },
    runtime,
  );
  return withCors(res);
}
