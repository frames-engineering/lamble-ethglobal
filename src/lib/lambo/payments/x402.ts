/**
 * x402 v2 adapter (exact scheme, EIP-3009 USDC) over @x402/core's x402ResourceServer. It only speaks the
 * protocol: building requirements, encoding challenges, decoding and matching payloads, and calling the
 * facilitator. Access decisions live in fulfillment.ts; nothing here grants anything.
 *
 * The facilitator is injectable so tests run against an in-process fake implementing FacilitatorClient.
 * Settlement outcomes are classified conservatively: anything that could have moved money without a clear
 * success (timeouts, 5xx, malformed answers, transport errors) is `uncertain`, never `failed`.
 */
import { randomBytes } from "node:crypto";

import { decodePaymentSignatureHeader, encodePaymentRequiredHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { parsePaymentPayload } from "@x402/core/schemas";
import { type FacilitatorClient, type FacilitatorConfig, HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { type Network, type PaymentPayload, type PaymentRequirements, type SettleResponse, SettleError } from "@x402/core/types";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";

import type { X402Terms } from "./store.ts";

export const X402_HEADERS = {
  required: "PAYMENT-REQUIRED",
  signature: "PAYMENT-SIGNATURE",
  response: "PAYMENT-RESPONSE",
} as const;

export const DEFAULT_X402_NETWORK = "eip155:84532";
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

/** Query parameters added to ResourceInfo.url; the client copies `resource` verbatim into its payload. */
export const OFFER_PARAM = "lambo_offer";
export const RELEASE_PARAM = "lambo_release";
export const NONCE_PARAM = "lambo_n";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const NONCE = /^0x[0-9a-fA-F]{64}$/;
const UINT = /^\d{1,78}$/;

export interface X402AdapterOptions {
  /** CAIP-2 EVM network, e.g. eip155:84532 (Base Sepolia) or eip155:8453 (Base). */
  network: string;
  payTo: string;
  /** Injected facilitator (tests, or a custom client). When absent an HTTPFacilitatorClient is built. */
  facilitator?: FacilitatorClient;
  facilitatorUrl?: string;
  /** Per-path auth headers, required by authenticated facilitators such as CDP; see docs/runbooks/payments.md. */
  createAuthHeaders?: FacilitatorConfig["createAuthHeaders"];
  /** Per facilitator request. A settle that outlives it is recorded as uncertain, so keep it generous. Default 60s. */
  timeoutMs?: number;
  /** After a failed GET /supported, wait this long before trying again (so 402s stay fast). Default 30s. */
  initRetryAfterMs?: number;
  /** Validity the client should give its EIP-3009 authorization; the x402 default is 300 seconds. */
  maxTimeoutSeconds?: number;
  /** ResourceInfo.serviceName (<= 32 printable ASCII). */
  serviceName?: string;
}

/** A decoded, schema-valid x402 v2 EIP-3009 payload and the identity fields Lambo binds to. */
export interface X402Credential {
  payload: PaymentPayload;
  offerId: string | null;
  from: string;
  to: string;
  value: string;
  nonce: string;
}

export type X402Decode = { ok: true; credential: X402Credential } | { ok: false; reason: string };

export type X402VerifyOutcome = { ok: true; payer: string } | { ok: false; reason: string; transport: boolean };

export type X402SettleOutcome =
  | { kind: "settled"; response: SettleResponse }
  | { kind: "failed"; reason: string }
  | { kind: "uncertain"; reason: string };

/** Builds the ResourceInfo.url for an offer: the canonical URL plus offer, release and a per-challenge nonce. */
export function x402ResourceUrl(canonicalUrl: string, offerId: string, releaseId: string): string {
  const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(canonicalUrl);
  const url = new URL(canonicalUrl, "http://lambo.invalid");
  url.searchParams.set(OFFER_PARAM, offerId);
  url.searchParams.set(RELEASE_PARAM, releaseId);
  // Per-challenge entropy, copied verbatim into the payload by x402 clients. It is never on chain, so the exact
  // payload (and therefore the lost-response path keyed on its hash) cannot be rebuilt from public calldata.
  url.searchParams.set(NONCE_PARAM, randomBytes(16).toString("hex"));
  return absolute ? url.toString() : `${url.pathname}${url.search}`;
}

/** Offer id carried in a payload's resource URL, or null. */
export function offerIdFromResourceUrl(resourceUrl: string | undefined): string | null {
  if (!resourceUrl) return null;
  try {
    return new URL(resourceUrl, "http://lambo.invalid").searchParams.get(OFFER_PARAM);
  } catch {
    return null;
  }
}

/** Decodes and schema-validates a PAYMENT-SIGNATURE header into an EIP-3009 credential (pure, no I/O). */
export function decodeX402Header(header: string): X402Decode {
  let raw: unknown;
  try {
    raw = decodePaymentSignatureHeader(header.trim());
  } catch {
    return { ok: false, reason: "malformed_payment_signature" };
  }
  const parsed = parsePaymentPayload(raw);
  if (!parsed.success) return { ok: false, reason: "invalid_payment_payload" };
  if (parsed.data.x402Version !== 2) return { ok: false, reason: "unsupported_x402_version" };
  // Forward the client's exact object to the facilitator (the schema strips unknown keys); it is now known valid.
  const payload = raw as PaymentPayload;
  const authorization = (payload.payload as { authorization?: Record<string, unknown> }).authorization;
  const signature = (payload.payload as { signature?: unknown }).signature;
  if (!authorization || typeof signature !== "string") return { ok: false, reason: "unsupported_payload_not_eip3009" };
  const { from, to, value, nonce } = authorization;
  if (typeof from !== "string" || !ADDRESS.test(from)) return { ok: false, reason: "invalid_authorization_from" };
  if (typeof to !== "string" || !ADDRESS.test(to)) return { ok: false, reason: "invalid_authorization_to" };
  if (typeof value !== "string" || !UINT.test(value)) return { ok: false, reason: "invalid_authorization_value" };
  if (typeof nonce !== "string" || !NONCE.test(nonce)) return { ok: false, reason: "invalid_authorization_nonce" };
  return {
    ok: true,
    credential: {
      payload,
      offerId: offerIdFromResourceUrl(payload.resource?.url),
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      value,
      nonce: nonce.toLowerCase(),
    },
  };
}

/** PAYMENT-RESPONSE header value for a settlement reported by the facilitator (never one sent by a client). */
export function x402ReceiptHeader(response: SettleResponse): string {
  return encodePaymentResponseHeader(response);
}

/** Protocol-level single-use identity of an EIP-3009 authorization. */
export function x402PaymentKey(network: string, from: string, nonce: string): string {
  return `x402:${network}:${from.toLowerCase()}:${nonce.toLowerCase()}`;
}

/** Error text including its cause chain (x402 wraps facilitator failures), without stack traces. */
function message(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current !== undefined && current !== null && depth < 4; depth++) {
    parts.push(current instanceof Error ? `${current.name}: ${current.message}` : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.join(" <- ");
}

/** Bazaar discovery description of a paid GET resource. */
export interface ResourceDiscovery {
  /** Concrete request path, e.g. /api/v1/coins/solana/<mint>/bundle. */
  path: string;
  /** Route pattern with :params, e.g. /api/v1/coins/:chain/:address/bundle. */
  routePattern: string;
  outputSchema?: Record<string, unknown>;
  outputExample?: unknown;
}

export class X402Adapter {
  readonly protocol = "x402" as const;
  readonly network: Network;
  readonly payTo: string;
  readonly facilitatorUrl: string | null;
  readonly maxTimeoutSeconds: number;
  readonly serviceName: string;
  private readonly server: x402ResourceServer;
  private initializing: Promise<void> | null = null;
  private initialized = false;
  private lastError: string | null = null;
  private lastFailureAt = 0;
  private readonly retryAfterMs: number;

  constructor(options: X402AdapterOptions) {
    if (!/^eip155:\d+$/.test(options.network)) throw new Error(`x402 network must be CAIP-2 eip155:<chainId>, got ${options.network}`);
    if (!ADDRESS.test(options.payTo)) throw new Error("x402 payTo must be a 0x-prefixed 20-byte address");
    this.network = options.network as Network;
    this.payTo = options.payTo;
    this.maxTimeoutSeconds = options.maxTimeoutSeconds ?? 300;
    this.serviceName = options.serviceName ?? "Lamble research";
    this.retryAfterMs = options.initRetryAfterMs ?? 30_000;
    this.facilitatorUrl = options.facilitator ? null : (options.facilitatorUrl ?? DEFAULT_FACILITATOR_URL);
    const facilitator =
      options.facilitator ??
      new HTTPFacilitatorClient({
        url: this.facilitatorUrl ?? DEFAULT_FACILITATOR_URL,
        timeoutMs: options.timeoutMs ?? 60_000,
        createAuthHeaders: options.createAuthHeaders,
      });
    this.server = new x402ResourceServer(facilitator);
    registerExactEvmScheme(this.server, { networks: [this.network] });
    this.server.registerExtension(bazaarResourceServerExtension);
  }

  /**
   * Loads the facilitator's supported kinds once (GET /supported). After a failure it reports unavailable
   * without calling again until initRetryAfterMs has passed.
   */
  async ready(): Promise<boolean> {
    if (this.initialized) return true;
    if (!this.initializing && this.lastError && Date.now() - this.lastFailureAt < this.retryAfterMs) return false;
    this.initializing ??= this.server.initialize().then(
      () => {
        this.initialized = true;
        this.lastError = null;
      },
      (error: unknown) => {
        this.lastError = message(error);
        this.lastFailureAt = Date.now();
        this.initializing = null;
      },
    );
    await this.initializing;
    return this.initialized;
  }

  status(): { initialized: boolean; lastError: string | null } {
    return { initialized: this.initialized, lastError: this.lastError };
  }

  /** Requirements for a decimal USD price; deterministic, so a retry rebuilds exactly what was offered. */
  async requirementsFor(amountUsd: string): Promise<PaymentRequirements[]> {
    if (!(await this.ready())) throw new Error(`x402 facilitator unavailable: ${this.lastError ?? "not initialized"}`);
    return this.server.buildPaymentRequirements({
      scheme: "exact",
      network: this.network,
      payTo: this.payTo,
      price: `$${amountUsd}`,
      maxTimeoutSeconds: this.maxTimeoutSeconds,
    });
  }

  terms(requirements: PaymentRequirements): X402Terms {
    return {
      network: requirements.network,
      payTo: requirements.payTo,
      asset: requirements.asset,
      amount: requirements.amount,
      maxTimeoutSeconds: requirements.maxTimeoutSeconds,
    };
  }

  /** Base64 PAYMENT-REQUIRED header value for these requirements and resource. */
  async paymentRequiredHeader(
    requirements: PaymentRequirements[],
    resource: { url: string; description: string },
    error?: string,
    discovery?: ResourceDiscovery,
  ): Promise<string> {
    // Bazaar discovery metadata describes how to call the endpoint (GET, path parameters, output schema) so a
    // facilitator that catalogues Bazaar extensions can list it. Declaring it does not list anything by itself.
    const transport = discovery ? { method: "GET", adapter: { getPath: () => discovery.path }, routePattern: discovery.routePattern } : undefined;
    // The manual flow must run declarations through the registered extensions itself: the Bazaar enricher adds
    // the HTTP method and turns the route pattern into a routeTemplate with path parameters.
    const extensions =
      discovery && transport
        ? this.server.enrichExtensions(declareDiscoveryExtension({ output: { example: discovery.outputExample, schema: discovery.outputSchema } }), transport)
        : undefined;
    const required = await this.server.createPaymentRequiredResponse(
      requirements,
      { url: resource.url, description: resource.description, mimeType: "application/json", serviceName: this.serviceName.slice(0, 32) },
      error,
      extensions,
      transport,
    );
    return encodePaymentRequiredHeader(required);
  }

  /** The advertised requirement the payload's `accepted` deep-equals, or undefined. */
  match(requirements: PaymentRequirements[], payload: PaymentPayload): PaymentRequirements | undefined {
    return this.server.findMatchingRequirements(requirements, payload);
  }

  /** Facilitator /verify. A thrown error is a transport failure: nothing was settled. */
  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<X402VerifyOutcome> {
    try {
      const result = await this.server.verifyPayment(payload, requirements);
      if (!result.isValid) return { ok: false, reason: result.invalidReason ?? "invalid_payment", transport: false };
      if (!result.payer) return { ok: false, reason: "verify_missing_payer", transport: false };
      return { ok: true, payer: result.payer.toLowerCase() };
    } catch (error) {
      return { ok: false, reason: `verify_error: ${message(error)}`, transport: true };
    }
  }

  /**
   * Facilitator /settle, classified. Only `success: true` with a transaction counts as settled. A definitive
   * refusal (success:false, or a 4xx SettleError) is `failed`. Everything else, including FacilitatorTimeoutError
   * and `settlement_pending`, is `uncertain` because the facilitator may have broadcast the transfer.
   */
  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<X402SettleOutcome> {
    let response: SettleResponse;
    try {
      response = await this.server.settlePayment(payload, requirements);
    } catch (error) {
      if (error instanceof SettleError && error.statusCode >= 400 && error.statusCode < 500 && error.errorReason !== "settlement_pending") {
        return { kind: "failed", reason: `settle_rejected: ${error.errorReason ?? error.statusCode}` };
      }
      return { kind: "uncertain", reason: `settle_indeterminate: ${message(error)}` };
    }
    if (response.success && typeof response.transaction === "string" && response.transaction.length > 0) {
      return { kind: "settled", response };
    }
    if (response.success) return { kind: "uncertain", reason: "settle_success_without_transaction" };
    if (response.errorReason === "settlement_pending") return { kind: "uncertain", reason: "settlement_pending" };
    return { kind: "failed", reason: `settle_failed: ${response.errorReason ?? "unknown"}` };
  }

  /** PAYMENT-RESPONSE header value: the facilitator's settlement, never anything the client sent. */
  encodeReceipt(response: SettleResponse): string {
    return x402ReceiptHeader(response);
  }
}
