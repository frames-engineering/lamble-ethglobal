/**
 * Paid-resource fulfilment: turns one HTTP request for a precomputed, fixed-price resource into exactly one of
 *
 *   Authorization: Bearer lambo_cap_...   capability redemption          200 | 401 | 403
 *   PAYMENT-SIGNATURE                     x402 v2 payment                200 | 202 | 402 | 409 | 500 | 502 | 503
 *   Authorization: Payment ...            MPP payment                    200 | 202 | 402 | 403 | 409 | 500
 *   (none)                                402 offer carrying every enabled protocol's challenge, or 503
 *
 * Contract with the route handler, in this order:
 *   1. Validate the query and confirm the resource exists BEFORE calling handlePaidRequest. Invalid or missing
 *      resources are 400/404 from the route; no offer is ever made for something that cannot be served.
 *   2. Pin the release. Call resolvePinnedRelease(request, store) first: when it returns a release id the
 *      request carries a payment or capability bound to that release, and the route must serve THAT release
 *      (or 404/410 if it no longer exists). Only otherwise resolve "latest" to a concrete id. A payment bound to
 *      release R1 presented with resource.releaseId R2 is refused with 409 release_mismatch and never settled.
 *   3. resource.render() runs only after access is established (settled payment, valid capability, or the
 *      identical credential inside the lost-response window), at most once per request.
 *
 * Access never depends on Origin/Referer, on client-supplied transaction hashes or receipts, or on anything but
 * a verified protocol credential or a capability token. Paid bodies are `Cache-Control: private, no-store`;
 * 402s are `no-store`. Every branch appends a payment_events row without secrets.
 */
import { sha256, stableStringify } from "../server/io.ts";
import { MppAdapter, mppOfferIdFromCredential, mppPaymentKey, paymentCredentialFrom } from "./mpp.ts";
import { type Pricing, priceFor } from "./pricing.ts";
import {
  type AccessDenial,
  type CommerceStore,
  type Entitlement,
  type Offer,
  type PaymentEventInput,
  type Protocol,
  type ProtocolTerms,
  type Purchase,
  type ResourceBinding,
  canonicalParams,
} from "./store.ts";
import { type X402Adapter, X402_HEADERS, decodeX402Header, x402PaymentKey, x402ReceiptHeader, x402ResourceUrl } from "./x402.ts";

/** A precomputed resource the route handler has already validated and pinned to a concrete release. */
export interface PaidResource {
  kind: string;
  params: Record<string, string>;
  releaseId: string;
  canonicalUrl: string;
  description: string;
  /** JSON body; only called after access is established. */
  render(): unknown;
}

export interface PaymentAdapters {
  x402?: X402Adapter | null;
  mpp?: MppAdapter | null;
}

export interface PaymentLogEntry extends PaymentEventInput {
  at: number;
}

export interface PaymentDeps {
  store: CommerceStore;
  pricing: Pricing;
  adapters: PaymentAdapters;
  /** Unix milliseconds. */
  now: () => number;
  log?: (entry: PaymentLogEntry) => void;
}

export const LAMBO_HEADERS = {
  capability: "Lambo-Capability",
  entitlementExpires: "Lambo-Entitlement-Expires",
  downloadsRemaining: "Lambo-Downloads-Remaining",
  release: "Lambo-Release",
  purchase: "Lambo-Purchase",
} as const;

/** Headers a browser client must be allowed to read (for Access-Control-Expose-Headers on CORS routes). */
export const PAYMENT_EXPOSED_HEADERS = [
  X402_HEADERS.required,
  X402_HEADERS.response,
  "WWW-Authenticate",
  "Payment-Receipt",
  LAMBO_HEADERS.capability,
  LAMBO_HEADERS.entitlementExpires,
  LAMBO_HEADERS.downloadsRemaining,
  LAMBO_HEADERS.release,
  LAMBO_HEADERS.purchase,
] as const;

const PAID_CACHE = "private, no-store";
const UNPAID_CACHE = "no-store";
const CAPABILITY_IN_AUTHORIZATION = /(?:^|,)\s*Bearer\s+(lambo_cap_[A-Za-z0-9_-]{16,128})\s*(?=,|$)/i;

interface Ctx {
  request: Request;
  resource: PaidResource;
  deps: PaymentDeps;
  price: string;
  paramsKey: string;
  binding: ResourceBinding;
}

interface Problem {
  error: string;
  message: string;
  status?: number;
  detail?: Record<string, unknown>;
}

export interface PinnedRelease {
  releaseId: string;
  via: "capability" | "x402" | "mpp";
  offerId: string | null;
}

/** The capability token in `Authorization: Bearer lambo_cap_...`, or null. */
export function capabilityFrom(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.match(CAPABILITY_IN_AUTHORIZATION)?.[1] ?? null;
}

/**
 * The release a request's credential is bound to, checked in the same precedence as handlePaidRequest
 * (capability, x402, MPP). Read-only; it validates nothing beyond finding the stored offer or entitlement, so
 * the route can load that release before calling handlePaidRequest, which then verifies everything.
 */
export function resolvePinnedRelease(request: Request, store: CommerceStore): PinnedRelease | null {
  const capability = capabilityFrom(request);
  if (capability) {
    const entitlement = store.findEntitlementByToken(capability);
    return entitlement ? { releaseId: entitlement.releaseId, via: "capability", offerId: null } : null;
  }
  const x402 = request.headers.get(X402_HEADERS.signature);
  if (x402) {
    const decoded = decodeX402Header(x402);
    const offer = decoded.ok && decoded.credential.offerId ? store.getOffer(decoded.credential.offerId) : null;
    return offer ? { releaseId: offer.releaseId, via: "x402", offerId: offer.id } : null;
  }
  const raw = paymentCredentialFrom(request);
  if (raw) {
    const offerId = mppOfferIdFromCredential(raw);
    const offer = offerId ? store.getOffer(offerId) : null;
    return offer ? { releaseId: offer.releaseId, via: "mpp", offerId: offer.id } : null;
  }
  return null;
}

/** Entry point for every paid route. See the module comment for the contract. */
export async function handlePaidRequest(request: Request, resource: PaidResource, deps: PaymentDeps): Promise<Response> {
  const price = priceFor(deps.pricing, resource.kind);
  const paramsKey = canonicalParams(resource.params).key;
  const ctx: Ctx = {
    request,
    resource,
    deps,
    price: price ?? "",
    paramsKey,
    binding: { kind: resource.kind, paramsKey, releaseId: resource.releaseId },
  };
  if (!price) {
    emit(ctx, { event: "request.unpriced", outcome: "error", httpStatus: 500, detail: { kind: resource.kind } });
    return json(500, { error: "unpriced_resource", message: `No price is configured for resource kind ${resource.kind}.` });
  }
  if (!resource.releaseId || resource.releaseId === "latest") {
    emit(ctx, { event: "request.unpinned", outcome: "error", httpStatus: 500, detail: { kind: resource.kind } });
    return json(500, { error: "release_not_pinned", message: "The route must resolve a concrete release id before selling it." });
  }

  const capability = capabilityFrom(request);
  if (capability) return redeemCapability(ctx, capability);
  const x402Header = request.headers.get(X402_HEADERS.signature);
  if (x402Header) return payWithX402(ctx, x402Header);
  if (paymentCredentialFrom(request)) return payWithMpp(ctx);
  return offerResponse(ctx);
}

// ---------------------------------------------------------------------------------------------------------------
// Offers

async function offerResponse(ctx: Ctx, problem?: Problem): Promise<Response> {
  const { deps, resource, request } = ctx;
  const { x402, mpp } = deps.adapters;
  const unavailable: Record<string, string> = {};
  const terms: ProtocolTerms = {};

  let requirements: Awaited<ReturnType<X402Adapter["requirementsFor"]>> | null = null;
  if (x402) {
    try {
      requirements = await x402.requirementsFor(ctx.price);
      const first = requirements[0];
      if (first) terms.x402 = x402.terms(first);
    } catch (error) {
      unavailable.x402 = errorText(error);
    }
  }
  if (mpp) terms.mpp = mpp.terms();
  if (!terms.x402 && !terms.mpp) return paymentsUnavailable(ctx, unavailable);

  const offer = deps.store.createOrReuseOffer(
    {
      kind: resource.kind,
      params: resource.params,
      releaseId: resource.releaseId,
      canonicalUrl: resource.canonicalUrl,
      amount: ctx.price,
      currency: deps.pricing.currency,
      protocols: terms,
      ttlSeconds: deps.pricing.access.offerTtlSeconds,
    },
    deps.now(),
  );

  const headers: Record<string, string> = {};
  const accepts: Record<string, unknown>[] = [];
  if (x402 && terms.x402 && requirements) {
    try {
      headers[X402_HEADERS.required] = await x402.paymentRequiredHeader(
        requirements,
        { url: x402ResourceUrl(resource.canonicalUrl, offer.id, offer.releaseId), description: resource.description },
        problem?.error,
      );
      accepts.push({
        protocol: "x402",
        x402Version: 2,
        scheme: "exact",
        ...terms.x402,
        challengeHeader: X402_HEADERS.required,
        credentialHeader: X402_HEADERS.signature,
        receiptHeader: X402_HEADERS.response,
      });
    } catch (error) {
      unavailable.x402 = errorText(error);
    }
  }
  if (mpp && terms.mpp) {
    try {
      const challenge = await mpp.challengeHeader(request.url, offer, resource.description);
      if (challenge) {
        headers["WWW-Authenticate"] = challenge;
        accepts.push({
          protocol: "mpp",
          intent: "charge",
          ...terms.mpp,
          challengeHeader: "WWW-Authenticate",
          credentialHeader: "Authorization: Payment",
          receiptHeader: "Payment-Receipt",
        });
      } else {
        unavailable.mpp = "mppx issued no challenge";
      }
    } catch (error) {
      unavailable.mpp = errorText(error);
    }
  }
  if (accepts.length === 0) return paymentsUnavailable(ctx, unavailable);

  const status = problem?.status ?? 402;
  emit(ctx, {
    event: problem ? "offer.reissued" : "offer.issued",
    outcome: problem ? "rejected" : "ok",
    offerId: offer.id,
    httpStatus: status,
    detail: { protocols: accepts.map((a) => a.protocol), ...(problem ? { error: problem.error, ...problem.detail } : {}), ...unavailableDetail(unavailable) },
  });
  return json(status, offerBody(ctx, offer, accepts, problem), headers);
}

function offerBody(ctx: Ctx, offer: Offer, accepts: Record<string, unknown>[], problem?: Problem): Record<string, unknown> {
  const { access, refundPolicy, status, approved, note } = ctx.deps.pricing;
  return {
    error: problem?.error ?? "payment_required",
    message: problem?.message ?? `Payment is required for ${ctx.resource.description}.`,
    ...(problem?.detail ? { detail: problem.detail } : {}),
    offer: {
      id: offer.id,
      expiresAt: iso(offer.expiresAt),
      resource: {
        kind: offer.kind,
        params: offer.params,
        paramsKey: offer.paramsKey,
        releaseId: offer.releaseId,
        url: offer.canonicalUrl,
        description: ctx.resource.description,
      },
      price: { amount: offer.amount, currency: offer.currency },
      releasePinning: `This offer is for release ${offer.releaseId}. Paying it buys that release even if a newer release is published before you pay.`,
    },
    accepts,
    access: {
      durationSeconds: access.accessDurationSeconds,
      downloadsMax: access.downloadsMax,
      lostResponseWindowSeconds: access.replayWindowSeconds,
    },
    recovery: {
      capability:
        "A successful payment response carries a Lambo-Capability header (lambo_cap_...). It is shown once and cannot be reissued. Send it as Authorization: Bearer <token> to download this exact resource and release again until Lambo-Entitlement-Expires, up to downloadsMax times in total.",
      lostResponse:
        "If the paid response is lost, retry the identical payment credential within lostResponseWindowSeconds. It is served again without a second charge, but the capability is not shown again.",
      receipts: "Protocol receipts (PAYMENT-RESPONSE, Payment-Receipt) are proof of payment only and are never accepted as access.",
    },
    refundPolicy,
    pricing: { status, approved, note },
  };
}

function paymentsUnavailable(ctx: Ctx, unavailable: Record<string, string>): Response {
  emit(ctx, { event: "offer.unavailable", outcome: "error", httpStatus: 503, detail: unavailableDetail(unavailable) });
  return json(
    503,
    {
      error: "payments_unavailable",
      message: "No payment protocol is configured and available, so this resource cannot be sold right now. Nothing was charged.",
      protocols: Object.keys(unavailable).length ? unavailable : { x402: "not configured", mpp: "not configured" },
    },
    { "Retry-After": "300" },
  );
}

function unavailableDetail(unavailable: Record<string, string>): Record<string, unknown> {
  return Object.keys(unavailable).length ? { unavailable } : {};
}

/**
 * Offer lookup and resource/release binding checks shared by both protocols. Expiry is deliberately not checked
 * here: a payment identity seen before is answered from its purchase first, so a buyer retrying after the offer
 * expired learns it already paid instead of being invited to pay again.
 */
async function boundOffer(ctx: Ctx, offerId: string | null, protocol: Protocol): Promise<{ offer: Offer } | { response: Response }> {
  if (!offerId) return { response: await offerResponse(ctx, problem("offer_missing", "The payment does not reference a Lambo offer.")) };
  const offer = ctx.deps.store.getOffer(offerId);
  if (!offer) return { response: await offerResponse(ctx, problem("offer_not_found", "The payment references an unknown offer.")) };
  if (offer.kind !== ctx.resource.kind || offer.paramsKey !== ctx.paramsKey) {
    return {
      response: conflict(ctx, protocol, offer, null, "offer_resource_mismatch", "This payment was made for a different resource; it was not used.", {
        offerResource: { kind: offer.kind, params: offer.params, releaseId: offer.releaseId },
      }),
    };
  }
  if (offer.releaseId !== ctx.resource.releaseId) {
    return {
      response: conflict(ctx, protocol, offer, null, "release_mismatch", `This payment is bound to release ${offer.releaseId}; it was not used for release ${ctx.resource.releaseId}.`, {
        pinnedRelease: offer.releaseId,
        requestedRelease: ctx.resource.releaseId,
      }),
    };
  }
  return { offer };
}

function offerExpired(ctx: Ctx, offer: Offer): boolean {
  return offer.expiresAt <= ctx.deps.now();
}

function expiredOffer(ctx: Ctx): Promise<Response> {
  return offerResponse(ctx, problem("offer_expired", "The offer expired before payment; nothing was charged. Pay the new offer."));
}

// ---------------------------------------------------------------------------------------------------------------
// Capability redemption

function redeemCapability(ctx: Ctx, token: string): Response {
  const result = ctx.deps.store.redeemCapability(token, ctx.binding, ctx.deps.now());
  if (!result.ok) {
    const [status, error, message] = CAPABILITY_DENIALS[result.error];
    emit(ctx, {
      event: "capability.rejected",
      outcome: "rejected",
      entitlementId: result.entitlement?.id ?? null,
      purchaseId: result.entitlement?.purchaseId ?? null,
      httpStatus: status,
      detail: { reason: result.error },
    });
    const headers: Record<string, string> = status === 401 ? { "WWW-Authenticate": `Bearer realm="lambo", error="invalid_token"` } : {};
    const boundTo = result.error === "mismatch" && result.entitlement ? { boundTo: { kind: result.entitlement.kind, releaseId: result.entitlement.releaseId } } : {};
    return json(status, { error, message, ...boundTo }, headers);
  }
  emit(ctx, {
    event: "capability.redeemed",
    outcome: "ok",
    entitlementId: result.entitlement.id,
    purchaseId: result.entitlement.purchaseId,
    httpStatus: 200,
    detail: { downloads: result.entitlement.downloads },
  });
  return deliver(ctx, { entitlement: result.entitlement, purchaseId: result.entitlement.purchaseId });
}

const CAPABILITY_DENIALS: Record<AccessDenial, [number, string, string]> = {
  invalid: [401, "invalid_capability", "The capability token is not recognized."],
  revoked: [401, "capability_revoked", "The capability token was revoked."],
  expired: [401, "capability_expired", "The capability token has expired. Request the resource without it to receive a new offer."],
  mismatch: [403, "capability_resource_mismatch", "The capability token is for a different resource or release."],
  exhausted: [403, "downloads_exhausted", "The capability token has reached its download limit."],
  replay_limit: [403, "downloads_exhausted", "The capability token has reached its download limit."],
  missing: [401, "invalid_capability", "The capability token is not recognized."],
};

// ---------------------------------------------------------------------------------------------------------------
// x402

async function payWithX402(ctx: Ctx, header: string): Promise<Response> {
  const { deps } = ctx;
  const x402 = deps.adapters.x402;
  if (!x402) {
    emit(ctx, { event: "x402.rejected", outcome: "rejected", protocol: "x402", detail: { reason: "x402_not_enabled" } });
    return offerResponse(ctx, problem("x402_not_enabled", "x402 payments are not enabled here; nothing was charged."));
  }
  const decoded = decodeX402Header(header);
  if (!decoded.ok) {
    emit(ctx, { event: "x402.rejected", outcome: "rejected", protocol: "x402", detail: { reason: decoded.reason } });
    return offerResponse(ctx, problem(decoded.reason, "The PAYMENT-SIGNATURE header is not a valid x402 v2 exact (EIP-3009) payment; nothing was charged."));
  }
  const credential = decoded.credential;
  const bound = await boundOffer(ctx, credential.offerId, "x402");
  if ("response" in bound) return bound.response;
  const { offer } = bound;
  const quoted = offer.protocols.x402;
  if (!quoted) return offerResponse(ctx, problem("offer_protocol_mismatch", "The offer was not quoted for x402."));

  // A payment identity seen before is answered from its purchase and never reaches the facilitator again.
  const paymentKey = x402PaymentKey(quoted.network, credential.from, credential.nonce);
  const credentialHash = sha256(stableStringify(credential.payload));
  const seen = deps.store.getPurchaseByKey(paymentKey);
  if (seen) return existingPurchase(ctx, seen, offer, credentialHash);
  if (offerExpired(ctx, offer)) return expiredOffer(ctx);

  let requirements: Awaited<ReturnType<X402Adapter["requirementsFor"]>>;
  try {
    requirements = await x402.requirementsFor(offer.amount);
  } catch (error) {
    emit(ctx, { event: "x402.unavailable", outcome: "error", protocol: "x402", offerId: offer.id, httpStatus: 503, detail: { reason: errorText(error) } });
    return json(503, { error: "facilitator_unavailable", message: "The x402 facilitator is unavailable; nothing was charged. Retry later." }, { "Retry-After": "30" });
  }
  const first = requirements[0];
  if (!first || stableStringify(x402.terms(first)) !== stableStringify(quoted)) {
    return offerResponse(ctx, problem("offer_stale", "Payment terms changed since this offer was made; nothing was charged. Pay the new offer."));
  }
  const matched = x402.match(requirements, credential.payload);
  if (!matched) return offerResponse(ctx, problem("requirements_mismatch", "The payment does not match the offer's requirements; nothing was charged."));
  if (credential.to !== matched.payTo.toLowerCase() || credential.value !== matched.amount) {
    return offerResponse(ctx, problem("authorization_mismatch", "The signed authorization does not pay the offered amount to the offered recipient."));
  }

  const { purchase, created } = deps.store.beginPurchase(
    { offerId: offer.id, protocol: "x402", paymentKey, credentialHash, payer: credential.from, network: matched.network, amount: offer.amount },
    deps.now(),
  );
  if (!created) return existingPurchase(ctx, purchase, offer, credentialHash); // lost a race with an identical request
  emit(ctx, { event: "purchase.begun", outcome: "ok", protocol: "x402", offerId: offer.id, purchaseId: purchase.id, detail: { payer: credential.from } });

  const verified = await x402.verify(credential.payload, matched);
  if (!verified.ok || verified.payer !== credential.from) {
    const reason = verified.ok ? "payer_mismatch" : verified.reason;
    deps.store.markFailed(purchase.id, reason, deps.now());
    const transport = !verified.ok && verified.transport;
    emit(ctx, {
      event: "x402.verify.failed",
      outcome: transport ? "error" : "rejected",
      protocol: "x402",
      offerId: offer.id,
      purchaseId: purchase.id,
      httpStatus: transport ? 502 : 402,
      detail: { reason },
    });
    if (transport) {
      return json(
        502,
        {
          error: "facilitator_unavailable",
          message: "The payment could not be verified, so it was not settled and no money moved. Request a new offer and sign a new payment.",
          purchaseId: purchase.id,
        },
        { "Retry-After": "30" },
      );
    }
    return offerResponse(ctx, problem("payment_invalid", "The facilitator rejected this payment; nothing was charged.", { reason }));
  }

  if (!deps.store.markSettling(purchase.id, deps.now())) return inProgress(ctx, purchase);
  const settled = await x402.settle(credential.payload, matched);
  if (settled.kind === "uncertain") {
    deps.store.markUncertain(purchase.id, settled.reason, deps.now());
    emit(ctx, { event: "x402.settle.uncertain", outcome: "uncertain", protocol: "x402", offerId: offer.id, purchaseId: purchase.id, httpStatus: 202, detail: { reason: settled.reason } });
    return uncertainResponse(purchase, offer);
  }
  if (settled.kind === "failed") {
    deps.store.markFailed(purchase.id, settled.reason, deps.now());
    emit(ctx, { event: "x402.settle.failed", outcome: "failed", protocol: "x402", offerId: offer.id, purchaseId: purchase.id, httpStatus: 402, detail: { reason: settled.reason } });
    return offerResponse(ctx, problem("settlement_failed", "Settlement was refused; nothing was charged.", { reason: settled.reason }));
  }

  const receipt = { [X402_HEADERS.response]: x402.encodeReceipt(settled.response) };
  return grantAndDeliver(ctx, purchase, offer, settled.response.transaction, credential.from, { headers: receipt });
}

// ---------------------------------------------------------------------------------------------------------------
// MPP

async function payWithMpp(ctx: Ctx): Promise<Response> {
  const { deps, request, resource } = ctx;
  const mpp = deps.adapters.mpp;
  if (!mpp) {
    emit(ctx, { event: "mpp.rejected", outcome: "rejected", protocol: "mpp", detail: { reason: "mpp_not_enabled" } });
    return offerResponse(ctx, problem("mpp_not_enabled", "MPP payments are not enabled here; nothing was charged."));
  }
  const peek = mpp.peek(request);
  if (!peek || !peek.ok) {
    const reason = peek && !peek.ok ? peek.reason : "missing_credential";
    emit(ctx, { event: "mpp.rejected", outcome: "rejected", protocol: "mpp", detail: { reason } });
    return offerResponse(ctx, problem("invalid_mpp_credential", "The Payment credential was not issued by this server for an offer; nothing was charged.", { reason }));
  }
  const bound = await boundOffer(ctx, peek.offerId, "mpp");
  if ("response" in bound) return bound.response;
  const { offer } = bound;

  const paymentKey = mppPaymentKey(peek.method, peek.challengeId);
  const credentialHash = sha256(peek.raw);
  let purchase = deps.store.getPurchaseByKey(paymentKey);
  if (purchase) {
    // The identical signed transaction can be mined at most once; while the offer (and so the challenge) is
    // live, mppx re-checks it and recovers the receipt if it already landed. Anything else is answered as seen.
    const retryable =
      (purchase.status === "failed" || purchase.status === "uncertain") &&
      purchase.offerId === offer.id &&
      purchase.credentialHash === credentialHash &&
      !offerExpired(ctx, offer);
    if (!retryable) return existingPurchase(ctx, purchase, offer, credentialHash);
    if (!deps.store.reopenPurchase(purchase.id, deps.now())) return inProgress(ctx, purchase);
    emit(ctx, { event: "purchase.reopened", outcome: "ok", protocol: "mpp", offerId: offer.id, purchaseId: purchase.id, detail: { previous: purchase.status } });
  } else {
    if (offerExpired(ctx, offer)) return expiredOffer(ctx);
    if (!offer.protocols.mpp || stableStringify(offer.protocols.mpp) !== stableStringify(mpp.terms())) {
      return offerResponse(ctx, problem("offer_stale", "Payment terms changed since this offer was made; nothing was charged. Pay the new offer."));
    }
    const begun = deps.store.beginPurchase(
      { offerId: offer.id, protocol: "mpp", paymentKey, credentialHash, payer: null, network: peek.method, amount: offer.amount },
      deps.now(),
    );
    purchase = begun.purchase;
    if (!begun.created) return existingPurchase(ctx, purchase, offer, credentialHash); // lost a race with an identical request
    emit(ctx, { event: "purchase.begun", outcome: "ok", protocol: "mpp", offerId: offer.id, purchaseId: purchase.id });
    deps.store.markSettling(purchase.id, deps.now());
  }

  let outcome: Awaited<ReturnType<MppAdapter["chargeFor"]>>;
  try {
    outcome = await mpp.chargeFor(request, offer, resource.description, peek.challengeId);
  } catch (error) {
    deps.store.markUncertain(purchase.id, errorText(error), deps.now());
    emit(ctx, { event: "mpp.charge.uncertain", outcome: "uncertain", protocol: "mpp", offerId: offer.id, purchaseId: purchase.id, httpStatus: 202, detail: { reason: errorText(error) } });
    return uncertainResponse(purchase, offer);
  }
  if (outcome.kind === "rejected") {
    deps.store.markFailed(purchase.id, outcome.reason, deps.now());
    const status = outcome.response.status === 403 ? 403 : 402;
    emit(ctx, { event: "mpp.charge.failed", outcome: "failed", protocol: "mpp", offerId: offer.id, purchaseId: purchase.id, httpStatus: status, detail: { reason: outcome.reason } });
    if (status === 403) {
      return json(403, { error: "payment_rejected", message: "The Payment credential cannot pay for this request; no access was granted.", detail: { reason: outcome.reason } });
    }
    return offerResponse(ctx, problem("payment_rejected", "The Payment credential was not accepted; no access was granted.", { reason: outcome.reason }));
  }
  return grantAndDeliver(ctx, purchase, offer, outcome.reference, outcome.payer, { wrap: outcome.withReceipt });
}

// ---------------------------------------------------------------------------------------------------------------
// Shared purchase handling

/**
 * A payment identity seen before. Never settles again: in-flight duplicates get 409, a fulfilled purchase is
 * re-served only for the identical credential inside the lost-response window, a purchase an operator marked
 * settled is claimed (entitlement created now), and a failed one needs a new payment.
 */
async function existingPurchase(ctx: Ctx, purchase: Purchase, offer: Offer, credentialHash: string): Promise<Response> {
  const { deps } = ctx;
  emit(ctx, { event: "purchase.duplicate", outcome: "ok", protocol: purchase.protocol, offerId: offer.id, purchaseId: purchase.id, detail: { status: purchase.status } });
  if (purchase.offerId !== offer.id) {
    return conflict(ctx, purchase.protocol, offer, purchase, "payment_already_used", "This payment identity was already used for a different offer; it will not be charged again.");
  }
  if (purchase.credentialHash !== credentialHash) {
    return conflict(ctx, purchase.protocol, offer, purchase, "credential_conflict", "A different credential with the same payment identity was already presented.");
  }
  switch (purchase.status) {
    case "verifying":
    case "settling":
      return inProgress(ctx, purchase);
    case "uncertain":
      return conflict(
        ctx,
        purchase.protocol,
        offer,
        purchase,
        "settlement_uncertain",
        "The settlement outcome of this payment is still being reconciled. It will not be settled again; do not sign a new payment for this offer.",
        { status: "uncertain" },
      );
    case "failed":
      return offerResponse(ctx, problem("payment_failed", "This payment previously failed and was not charged. Sign a new payment for this offer.", { reason: purchase.failureReason }));
    case "settled": {
      // Settled without an entitlement: after operator reconciliation of an uncertain settlement, or a crash.
      try {
        const grant = deps.store.createEntitlement(purchase.id, deps.pricing.access, deps.now());
        emit(ctx, { event: "purchase.claimed", outcome: "ok", protocol: purchase.protocol, offerId: offer.id, purchaseId: purchase.id, entitlementId: grant.entitlement.id, httpStatus: 200 });
        return deliver(ctx, { entitlement: grant.entitlement, token: grant.token, purchaseId: purchase.id, ...receiptFor(purchase) });
      } catch {
        return inProgress(ctx, purchase);
      }
    }
    case "fulfilled": {
      const windowMs = deps.pricing.access.replayWindowSeconds * 1000;
      if (purchase.fulfilledAt === null || deps.now() - purchase.fulfilledAt > windowMs) {
        return conflict(
          ctx,
          purchase.protocol,
          offer,
          purchase,
          "use_capability",
          "This payment was already fulfilled. Download again with Authorization: Bearer <Lambo-Capability token>; the payment will not be charged again.",
        );
      }
      const served = deps.store.replayServe(purchase.id, ctx.binding, deps.pricing.access.replayServesMax, deps.now());
      if (!served.ok) {
        const [status, error, message] = CAPABILITY_DENIALS[served.error];
        emit(ctx, { event: "purchase.replay.rejected", outcome: "rejected", protocol: purchase.protocol, offerId: offer.id, purchaseId: purchase.id, httpStatus: status, detail: { reason: served.error } });
        return json(status, { error, message, purchaseId: purchase.id });
      }
      emit(ctx, {
        event: "purchase.replayed",
        outcome: "ok",
        protocol: purchase.protocol,
        offerId: offer.id,
        purchaseId: purchase.id,
        entitlementId: served.entitlement.id,
        httpStatus: 200,
        detail: { downloads: served.entitlement.downloads },
      });
      return deliver(ctx, { entitlement: served.entitlement, purchaseId: purchase.id, ...receiptFor(purchase) });
    }
  }
}

/** Records settlement and the entitlement atomically, then delivers with the one-time capability. */
function grantAndDeliver(
  ctx: Ctx,
  purchase: Purchase,
  offer: Offer,
  settlementRef: string,
  payer: string | null,
  receipt: { headers?: Record<string, string>; wrap?: (response: Response) => Response },
): Response {
  const { deps } = ctx;
  let grant: { entitlement: Entitlement; token: string };
  try {
    grant = deps.store.settleAndEntitle(purchase.id, settlementRef, payer, deps.pricing.access, deps.now());
  } catch (error) {
    // Money moved but access could not be recorded. Keep the settlement if at all possible so an identical
    // retry claims it (status settled -> claim path) and the operator queue shows it.
    let recorded = false;
    try {
      recorded = deps.store.markSettled(purchase.id, settlementRef, payer, deps.now());
    } catch {
      recorded = false;
    }
    emit(ctx, {
      event: "purchase.entitlement.failed",
      outcome: "error",
      protocol: purchase.protocol,
      offerId: offer.id,
      purchaseId: purchase.id,
      httpStatus: 500,
      detail: { reason: errorText(error), settlementRecorded: recorded, settlementRef },
    });
    const response = json(
      500,
      {
        error: "fulfillment_failed_after_payment",
        message:
          "Your payment settled but access could not be recorded. Retry the identical request to claim access, or contact the operator with this purchase id. You will not be charged again.",
        purchaseId: purchase.id,
        settlementRef,
      },
      receipt.headers ?? {},
      PAID_CACHE,
    );
    return receipt.wrap ? receipt.wrap(response) : response;
  }
  emit(ctx, {
    event: "purchase.fulfilled",
    outcome: "ok",
    protocol: purchase.protocol,
    offerId: offer.id,
    purchaseId: purchase.id,
    entitlementId: grant.entitlement.id,
    httpStatus: 200,
    detail: { settlementRef, payer },
  });
  return deliver(ctx, { entitlement: grant.entitlement, token: grant.token, purchaseId: purchase.id, ...receipt });
}

/** Protocol receipt headers for re-serving an already settled purchase, rebuilt from stored facts. */
function receiptFor(purchase: Purchase): { headers?: Record<string, string> } {
  if (!purchase.settlementRef) return {};
  if (purchase.protocol === "x402") {
    return {
      headers: {
        [X402_HEADERS.response]: x402ReceiptHeader({
          success: true,
          transaction: purchase.settlementRef,
          network: (purchase.network ?? "") as `${string}:${string}`,
          ...(purchase.payer ? { payer: purchase.payer } : {}),
        }),
      },
    };
  }
  return { headers: { "Payment-Receipt": MppAdapter.receiptHeader(purchase.network ?? "unknown", purchase.settlementRef, purchase.settledAt ?? 0) } };
}

/**
 * Renders and sends the paid body. If rendering fails after access exists, the counted download is given back
 * and the response is a 500 that still carries the capability (when this is the purchase response) so the
 * buyer can recover without paying again.
 */
function deliver(
  ctx: Ctx,
  args: {
    entitlement: Entitlement;
    purchaseId: string;
    token?: string;
    headers?: Record<string, string>;
    wrap?: (response: Response) => Response;
  },
): Response {
  const { entitlement, token } = args;
  const remaining = Math.max(0, entitlement.downloadsMax - entitlement.downloads);
  const headers: Record<string, string> = {
    ...args.headers,
    [LAMBO_HEADERS.release]: entitlement.releaseId,
    [LAMBO_HEADERS.entitlementExpires]: iso(entitlement.expiresAt),
    [LAMBO_HEADERS.downloadsRemaining]: String(remaining),
    [LAMBO_HEADERS.purchase]: args.purchaseId,
    ...(token ? { [LAMBO_HEADERS.capability]: token } : {}),
  };
  const finish = (response: Response) => (args.wrap ? args.wrap(response) : response);

  let body: string;
  try {
    const value = ctx.resource.render();
    const encoded = JSON.stringify(value) as string | undefined;
    if (typeof encoded !== "string") throw new Error("render() returned a value JSON cannot represent");
    body = encoded;
  } catch (error) {
    ctx.deps.store.releaseDownload(entitlement.id);
    emit(ctx, {
      event: "delivery.failed",
      outcome: "error",
      purchaseId: args.purchaseId,
      entitlementId: entitlement.id,
      httpStatus: 500,
      detail: { reason: errorText(error), capabilityIssued: Boolean(token) },
    });
    const payload = token
      ? {
          error: "delivery_failed_after_payment",
          message:
            "Your payment settled and access was granted, but the resource could not be produced. This download was not counted. Retry with Authorization: Bearer <capability>. The capability is shown here and in Lambo-Capability, and it will not be shown again.",
          capability: token,
          entitlement: { id: entitlement.id, expiresAt: iso(entitlement.expiresAt), downloadsRemaining: remaining + 1 },
          purchaseId: args.purchaseId,
        }
      : {
          error: "delivery_failed",
          message: "The resource could not be produced. This download was not counted; retry later.",
          purchaseId: args.purchaseId,
        };
    return finish(json(500, payload, headers, PAID_CACHE));
  }
  headers["Content-Type"] = "application/json; charset=utf-8";
  headers["Cache-Control"] = PAID_CACHE;
  return finish(new Response(body, { status: 200, headers }));
}

function uncertainResponse(purchase: Purchase, offer: Offer): Response {
  const safety =
    purchase.protocol === "x402"
      ? "The EIP-3009 authorization nonce can be used on chain at most once, so this payment cannot be charged twice. Retrying the identical payment returns 409 until the purchase is reconciled; it is never settled a second time."
      : "A signed Tempo transaction can be mined at most once, so this payment cannot be charged twice. Retrying the identical credential re-checks the same transaction and recovers its receipt.";
  return json(202, {
    status: "uncertain",
    purchaseId: purchase.id,
    offerId: offer.id,
    message: "The settlement outcome is unknown, and access has not been granted yet. Do not sign a new payment for this offer.",
    safety,
    next: "An operator reconciles uncertain purchases against the chain. If the transfer landed, retry the identical payment to receive your capability token. If it did not, the authorization expires unused and you may pay a new offer.",
  });
}

function inProgress(ctx: Ctx, purchase: Purchase): Response {
  emit(ctx, { event: "purchase.in_progress", outcome: "rejected", protocol: purchase.protocol, offerId: purchase.offerId, purchaseId: purchase.id, httpStatus: 409 });
  return json(
    409,
    { error: "payment_in_progress", status: "in_progress", purchaseId: purchase.id, message: "This payment is already being processed. Retry shortly; it will not be charged twice." },
    { "Retry-After": "2" },
  );
}

function conflict(
  ctx: Ctx,
  protocol: Protocol,
  offer: Offer,
  purchase: Purchase | null,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  emit(ctx, { event: "payment.conflict", outcome: "rejected", protocol, offerId: offer.id, purchaseId: purchase?.id ?? null, httpStatus: 409, detail: { error } });
  return json(409, { error, message, offerId: offer.id, ...(purchase ? { purchaseId: purchase.id } : {}), ...extra });
}

function problem(error: string, message: string, detail?: Record<string, unknown>): Problem {
  return { error, message, ...(detail ? { detail } : {}) };
}

// ---------------------------------------------------------------------------------------------------------------
// Utilities

function emit(ctx: Ctx, input: PaymentEventInput): void {
  const at = ctx.deps.now();
  const entry: PaymentEventInput = {
    ...input,
    detail: { kind: ctx.resource.kind, paramsKey: ctx.paramsKey, releaseId: ctx.resource.releaseId, ...input.detail },
  };
  try {
    ctx.deps.store.appendEvent(entry, at);
  } catch (error) {
    // The audit log must never turn a settled payment into a failed delivery; surface it to the log instead.
    console.error("lambo payments: could not append payment event", input.event, errorText(error));
  }
  ctx.deps.log?.({ ...entry, at });
}

function json(status: number, body: unknown, headers: Record<string, string> = {}, cache: string = UNPAID_CACHE): Response {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", cache);
  return new Response(JSON.stringify(body), { status, headers: h });
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function errorText(error: unknown): string {
  return (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 300);
}
