/**
 * Payment runtime: wires pricing (docs/data/pricing.json), the commerce database and the protocol adapters
 * from the environment, and reports what is configured for a health endpoint. Route handlers use
 * getPaymentRuntime() (one per process) with resolvePinnedRelease + handlePaidRequest.
 *
 * Environment (protocol configuration never comes from pricing.json):
 *   LAMBO_COMMERCE_DB_PATH      commerce SQLite file (default data/commerce.sqlite)
 *   LAMBO_X402_ENABLED          "true" to offer x402
 *   LAMBO_X402_NETWORK          CAIP-2, default eip155:84532 (Base Sepolia); eip155:8453 is Base mainnet
 *   LAMBO_X402_PAY_TO           recipient address (required when enabled)
 *   LAMBO_X402_FACILITATOR_URL  default https://x402.org/facilitator (testnet); mainnet needs an authenticated one
 *   LAMBO_MPP_ENABLED           "true" to offer MPP (Tempo charge, pull mode)
 *   LAMBO_MPP_RECIPIENT         recipient address (required when enabled)
 *   LAMBO_MPP_TESTNET           default true (Tempo Moderato); "false" is Tempo mainnet
 *   MPP_SECRET_KEY              >= 32 bytes, HMAC key for challenge ids (required when enabled)
 *   MPP_REALM                   optional challenge realm (default "lambo")
 * Real-money networks additionally require pricing.json status "production" with approved true.
 */
import type { Method } from "mppx";
import type { Store } from "mppx/server";
import type { FacilitatorClient, FacilitatorConfig } from "@x402/core/server";

import { type PaymentAdapters, type PaymentDeps, type PaymentLogEntry } from "./fulfillment.ts";
import { MppAdapter, createSqliteMppStore } from "./mpp.ts";
import { type Pricing, loadPricing, pricingApprovedForMainnet } from "./pricing.ts";
import { commerceDbPath } from "./schema.ts";
import { CommerceStore } from "./store.ts";
import { DEFAULT_FACILITATOR_URL, DEFAULT_X402_NETWORK, X402Adapter } from "./x402.ts";

export * from "./fulfillment.ts";
export * from "./mpp.ts";
export * from "./pricing.ts";
export * from "./schema.ts";
export * from "./store.ts";
export * from "./x402.ts";

/** EVM networks treated as test networks; anything else is real money and needs approved pricing. */
export const TESTNET_NETWORKS: ReadonlySet<string> = new Set([
  "eip155:84532", // Base Sepolia
  "eip155:11155111", // Ethereum Sepolia
  "eip155:43113", // Avalanche Fuji
  "eip155:80002", // Polygon Amoy
]);

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export interface ProtocolStatus {
  /** The enable flag is set. */
  enabled: boolean;
  /** Enabled and every required setting is valid. */
  configured: boolean;
  /** Configured and currently able to issue challenges (x402: facilitator /supported loaded). */
  available: boolean;
  /** Why it is not available, in plain words; null when available. */
  reason: string | null;
  testnet: boolean | null;
  details: Record<string, string | number | boolean | null>;
}

export interface PaymentStatus {
  available: boolean;
  pricing: { status: Pricing["status"]; approved: boolean; note: string };
  commerceDb: string;
  protocols: { x402: ProtocolStatus; mpp: ProtocolStatus };
}

export interface PaymentRuntime extends PaymentDeps {
  /** Configuration and availability per protocol, for a health endpoint; contains no secrets. */
  status(): PaymentStatus;
  /** status() after trying to reach the x402 facilitator once (GET /supported); for a deep health check. */
  check(): Promise<PaymentStatus>;
  close(): void;
}

export interface PaymentRuntimeOptions {
  dbPath?: string;
  pricing?: Pricing;
  now?: () => number;
  log?: (entry: PaymentLogEntry) => void;
  x402?: {
    /** In-process facilitator (tests) instead of HTTP. */
    facilitator?: FacilitatorClient;
    /** Auth headers per facilitator path, e.g. a CDP JWT signer you provide; none ships with the packages. */
    createAuthHeaders?: FacilitatorConfig["createAuthHeaders"];
    timeoutMs?: number;
  };
  mpp?: {
    /** Injected mppx server methods (tests). Default: tempo.charge pull-only on the durable store. */
    methods?: readonly Method.AnyServer[];
    /** Replay store override (tests). Default: the commerce database's mpp_store table. */
    store?: Store.AtomicStore;
  };
}

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function blankStatus(enabled: boolean, reason: string | null): ProtocolStatus {
  return { enabled, configured: false, available: false, reason, testnet: null, details: {} };
}

/**
 * Builds the payment runtime from `env`. Misconfiguration never throws: the protocol is reported unavailable
 * with a reason, and if no protocol is available every paid route answers 503 payments_unavailable instead of
 * a challenge nobody could pay.
 */
/** Environment variables as a plain record (process.env, or a literal in tests). */
export type PaymentEnv = Readonly<Record<string, string | undefined>>;

export function createPaymentRuntime(env: PaymentEnv = process.env, options: PaymentRuntimeOptions = {}): PaymentRuntime {
  const pricing = options.pricing ?? loadPricing();
  const dbPath = options.dbPath ?? commerceDbPath(env);
  const store = CommerceStore.open(dbPath);
  const adapters: PaymentAdapters = {};

  // x402
  const x402Enabled = flag(env.LAMBO_X402_ENABLED, false);
  let x402Status = blankStatus(x402Enabled, x402Enabled ? null : "LAMBO_X402_ENABLED is not set");
  if (x402Enabled) {
    const network = env.LAMBO_X402_NETWORK?.trim() || DEFAULT_X402_NETWORK;
    const payTo = env.LAMBO_X402_PAY_TO?.trim() ?? "";
    const facilitatorUrl = env.LAMBO_X402_FACILITATOR_URL?.trim() || DEFAULT_FACILITATOR_URL;
    const testnet = TESTNET_NETWORKS.has(network);
    const problems: string[] = [];
    if (!/^eip155:\d+$/.test(network)) problems.push(`LAMBO_X402_NETWORK must be eip155:<chainId>, got ${network}`);
    if (!ADDRESS.test(payTo)) problems.push("LAMBO_X402_PAY_TO must be a 0x address");
    if (!options.x402?.facilitator && !/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(facilitatorUrl)) {
      problems.push("LAMBO_X402_FACILITATOR_URL must be https");
    }
    if (!testnet && !pricingApprovedForMainnet(pricing)) {
      problems.push(`${network} is a real-money network and pricing.json is not approved for production`);
    }
    x402Status = {
      enabled: true,
      configured: problems.length === 0,
      available: false,
      reason: problems.length ? problems.join("; ") : null,
      testnet,
      details: { network, payTo: ADDRESS.test(payTo) ? payTo : null, facilitator: options.x402?.facilitator ? "injected" : hostOf(facilitatorUrl) },
    };
    if (problems.length === 0) {
      adapters.x402 = new X402Adapter({
        network,
        payTo,
        facilitator: options.x402?.facilitator,
        facilitatorUrl,
        createAuthHeaders: options.x402?.createAuthHeaders,
        timeoutMs: options.x402?.timeoutMs,
      });
    }
  }

  // MPP
  const mppEnabled = flag(env.LAMBO_MPP_ENABLED, false);
  let mppStatus = blankStatus(mppEnabled, mppEnabled ? null : "LAMBO_MPP_ENABLED is not set");
  if (mppEnabled) {
    const recipient = env.LAMBO_MPP_RECIPIENT?.trim() ?? "";
    const testnet = flag(env.LAMBO_MPP_TESTNET, true);
    const secretKey = env.MPP_SECRET_KEY ?? "";
    const realm = env.MPP_REALM?.trim() || "lambo";
    const problems: string[] = [];
    if (!ADDRESS.test(recipient)) problems.push("LAMBO_MPP_RECIPIENT must be a 0x address");
    if (new TextEncoder().encode(secretKey).byteLength < 32) problems.push("MPP_SECRET_KEY must be set to at least 32 bytes");
    if (!testnet && !pricingApprovedForMainnet(pricing)) problems.push("Tempo mainnet is real money and pricing.json is not approved for production");
    mppStatus = {
      enabled: true,
      configured: problems.length === 0,
      available: false,
      reason: problems.length ? problems.join("; ") : null,
      testnet,
      details: { method: "tempo", intent: "charge", mode: "pull", recipient: ADDRESS.test(recipient) ? recipient : null, realm },
    };
    if (problems.length === 0) {
      try {
        adapters.mpp = new MppAdapter({
          secretKey,
          realm,
          recipient,
          testnet,
          store: options.mpp?.store ?? createSqliteMppStore(store.db),
          methods: options.mpp?.methods,
        });
        mppStatus = { ...mppStatus, available: true };
      } catch (error) {
        mppStatus = { ...mppStatus, configured: false, reason: error instanceof Error ? error.message : String(error) };
      }
    }
  }

  const status = (): PaymentStatus => {
    let x402 = x402Status;
    if (adapters.x402) {
      const s = adapters.x402.status();
      x402 = {
        ...x402Status,
        available: s.initialized,
        reason: s.initialized ? null : s.lastError ? `facilitator: ${s.lastError}` : "facilitator not contacted yet (first 402 initializes it)",
      };
    }
    return {
      available: x402.available || mppStatus.available,
      pricing: { status: pricing.status, approved: pricing.approved, note: pricing.note },
      commerceDb: dbPath,
      protocols: { x402, mpp: mppStatus },
    };
  };

  return {
    store,
    pricing,
    adapters,
    now: options.now ?? Date.now,
    log: options.log,
    status,
    check: async () => {
      await adapters.x402?.ready();
      return status();
    },
    close: () => store.close(),
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

const RUNTIME_KEY = Symbol.for("lambo.payments.runtime");

/**
 * One runtime per process (survives Next.js dev module reloads), built from process.env on first use. `options`
 * apply only to that first call, e.g. { x402: { createAuthHeaders } } for an authenticated facilitator.
 */
export function getPaymentRuntime(options?: PaymentRuntimeOptions): PaymentRuntime {
  const holder = globalThis as unknown as Record<symbol, PaymentRuntime | undefined>;
  holder[RUNTIME_KEY] ??= createPaymentRuntime(process.env, options);
  return holder[RUNTIME_KEY];
}
