/**
 * MPP adapter (HTTP Payment authentication) over mppx. Production uses the Tempo `charge` intent in pull
 * mode only: the client signs a transaction and mppx broadcasts and confirms it before returning 200, so a
 * client-supplied transaction hash ("push" mode) is never accepted as payment.
 *
 * Offer binding: every challenge for an offer is issued with the same `scope` and `meta` (derived from the
 * offer), an `expires` equal to the offer's, and the offer's amount. mppx HMAC-binds all of them into the
 * challenge id and re-checks scope/meta on the paid retry, so a credential can only pay for the offer it was
 * issued for. The challenge id (unique per issuance) is the purchase's single-use payment key.
 *
 * Replay protection is mppx's own Store; here it is backed by the commerce database (mpp_store table) so
 * claims survive restarts and are shared by every instance using the file. Methods are injectable so tests
 * run a deterministic in-process method instead of a chain.
 */
import { Challenge, Credential, type Method, PaymentRequest, Receipt } from "mppx";
import { Mppx, Store, tempo } from "mppx/server";

import { type Db, one, tx } from "../store/sqlite.ts";
import type { MppTerms, Offer } from "./store.ts";

export const MPP_HEADERS = {
  challenge: "WWW-Authenticate",
  credential: "Authorization",
  receipt: "Payment-Receipt",
} as const;

/** Key of the offer id in challenge meta (opaque); the route scope rides in mppx's reserved `_mppx_scope`. */
export const MPP_OFFER_META = "lamble_offer";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** What `mppx.charge(options)(request)` resolves to on the HTTP transport. */
export type MppChargeResult =
  | { status: 402; challenge: Response }
  | { status: 200; withReceipt: (response?: Response) => Response };

export interface MppChargeOptions {
  amount: string;
  description: string;
  expires: string;
  meta: Record<string, string>;
  scope: string;
}

type ChargeHandler = (options: MppChargeOptions) => (request: Request) => Promise<MppChargeResult>;

export interface MppAdapterOptions {
  /** HMAC key for challenge ids, at least 32 bytes (MPP_SECRET_KEY). */
  secretKey: string;
  realm: string;
  recipient: string;
  testnet: boolean;
  /** Durable replay store (createSqliteMppStore). Store.memory() is for tests only. */
  store: Store.AtomicStore;
  /** Injected server methods (tests). Default: tempo.charge pull-only with `store`. */
  methods?: readonly Method.AnyServer[];
}

/** Parsed `Authorization: Payment` credential, HMAC-verified against our secret; nothing is consumed. */
export type MppPeek =
  | { ok: true; raw: string; challengeId: string; method: string; offerId: string | null; expires: string | null }
  | { ok: false; reason: string };

export type MppChargeOutcome =
  | { kind: "rejected"; response: Response; reason: string }
  | { kind: "paid"; reference: string; method: string; payer: string | null; withReceipt: (response: Response) => Response };

/** The scope and meta an offer's challenges carry; identical on issue and on the paid retry. */
export function mppChargeOptions(offer: Offer, description: string): MppChargeOptions {
  return {
    amount: offer.amount,
    description: description.slice(0, 200),
    expires: new Date(offer.expiresAt).toISOString(),
    meta: { [MPP_OFFER_META]: offer.id },
    scope: `lamble:${offer.kind}:${offer.paramsKey}:${offer.releaseId}`,
  };
}

/** Single-use identity of an MPP payment: the HMAC-bound challenge id it answers. */
export function mppPaymentKey(method: string, challengeId: string): string {
  return `mpp:${method}:${challengeId}`;
}

/** Extracts the `Payment ...` credential from an Authorization header (which may list several schemes). */
export function paymentCredentialFrom(request: Request): string | null {
  const header = request.headers.get(MPP_HEADERS.credential);
  return header ? Credential.extractPaymentScheme(header) : null;
}

/**
 * Offer id a Payment credential's challenge was issued for, read without verifying the HMAC (release pinning
 * only; handlePaidRequest verifies everything before anything is charged).
 */
export function mppOfferIdFromCredential(raw: string): string | null {
  try {
    const { challenge } = Credential.deserialize(raw);
    const meta = challenge.opaque ? (PaymentRequest.deserialize(challenge.opaque) as Record<string, unknown>) : {};
    const offerId = meta[MPP_OFFER_META];
    return typeof offerId === "string" ? offerId : null;
  } catch {
    return null;
  }
}

const BIGINT_SUFFIX = "#__bigint";
const BIGINT_VALUE = /^-?\d+#__bigint$/;

/** JSON that round-trips bigint the way mppx's own stores do (ox Json's "<digits>#__bigint" encoding). */
function encodeValue(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => (typeof v === "bigint" ? `${v.toString()}${BIGINT_SUFFIX}` : v));
}

function decodeValue(raw: string): unknown {
  return JSON.parse(raw, (_key, v: unknown) =>
    typeof v === "string" && BIGINT_VALUE.test(v) ? BigInt(v.slice(0, -BIGINT_SUFFIX.length)) : v,
  );
}

function expiresOf(value: unknown): number | null {
  const expires = value && typeof value === "object" ? (value as { expires?: unknown }).expires : undefined;
  return typeof expires === "number" ? expires : null;
}

/** Same rule as mppx's Store.tryClaim fallback: a key is taken unless it holds an expired replay marker. */
function keyTaken(current: unknown, nowMs: number): boolean {
  if (current === null) return false;
  const isMarker = typeof current === "object" && (current as { type?: unknown }).type === "mppx:replay";
  const expires = expiresOf(current);
  return !isMarker || expires === null || expires > nowMs;
}

/**
 * mppx AtomicStore backed by the commerce database's mpp_store table. `update` and `tryClaim` run inside
 * BEGIN IMMEDIATE, so a replay key is claimed exactly once across processes sharing the file. Replay markers
 * keep their expiry in expires_at for pruning; mppx itself compares marker expiry with the wall clock.
 */
export function createSqliteMppStore(db: Db): Store.AtomicStore {
  const read = (key: string): unknown => {
    const row = one<{ value: string }>(db, "SELECT value FROM mpp_store WHERE key = ?", key);
    return row ? decodeValue(row.value) : null;
  };
  const write = (key: string, value: unknown): void => {
    db.prepare(
      "INSERT INTO mpp_store (key, value, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at",
    ).run(key, encodeValue(value), expiresOf(value));
  };
  const remove = (key: string): void => {
    db.prepare("DELETE FROM mpp_store WHERE key = ?").run(key);
  };
  return Store.from({
    async get(key: string) {
      return read(key);
    },
    async put(key: string, value: unknown) {
      write(key, value);
    },
    async delete(key: string) {
      remove(key);
    },
    async update<R>(key: string, fn: (current: unknown) => Store.Change<unknown, R>): Promise<R> {
      return tx(db, () => {
        const change = fn(read(key));
        if (change.op === "set") write(key, change.value);
        if (change.op === "delete") remove(key);
        return change.result;
      });
    },
    tryClaim(key: string, expires: number): boolean {
      return tx(db, () => {
        if (keyTaken(read(key), Date.now())) return false;
        write(key, { expires, type: "mppx:replay" });
        return true;
      });
    },
  });
}

/** Deletes replay markers whose challenge has expired (they can never match again). */
export function pruneMppStore(db: Db, nowMs: number): number {
  return Number(db.prepare("DELETE FROM mpp_store WHERE expires_at IS NOT NULL AND expires_at <= ?").run(nowMs).changes);
}

export class MppAdapter {
  readonly protocol = "mpp" as const;
  readonly realm: string;
  readonly recipient: string;
  readonly testnet: boolean;
  readonly methodName: string;
  private readonly secretKey: string;
  private readonly charge: ChargeHandler;
  private readonly payers = new Map<string, string>();

  constructor(options: MppAdapterOptions) {
    if (new TextEncoder().encode(options.secretKey).byteLength < 32) throw new Error("MPP secret key must be at least 32 bytes");
    if (!ADDRESS.test(options.recipient)) throw new Error("MPP recipient must be a 0x-prefixed 20-byte address");
    this.secretKey = options.secretKey;
    this.realm = options.realm;
    this.recipient = options.recipient;
    this.testnet = options.testnet;
    const methods =
      options.methods ??
      tempo.charge({ recipient: options.recipient as `0x${string}`, testnet: options.testnet, store: options.store, supportedModes: ["pull"] });
    const first = methods[0];
    if (!first) throw new Error("MPP adapter needs at least one method");
    this.methodName = first.name;
    const mppx = Mppx.create({ methods: [...methods], secretKey: options.secretKey, realm: options.realm });
    mppx.onPaymentSuccess((context: { challenge: { id: string }; payer?: string | undefined }) => {
      if (context.payer) this.payers.set(context.challenge.id, context.payer.toLowerCase());
    });
    const handler = (mppx as unknown as { charge?: ChargeHandler }).charge;
    if (typeof handler !== "function") throw new Error("MPP methods must provide a charge intent");
    this.charge = handler;
  }

  terms(): MppTerms {
    return { method: this.methodName, realm: this.realm, recipient: this.recipient.toLowerCase(), testnet: this.testnet };
  }

  /**
   * WWW-Authenticate value for an offer. Uses a clean request so a credential on the incoming request is never
   * processed (and never charged) while we are only issuing a challenge.
   */
  async challengeHeader(requestUrl: string, offer: Offer, description: string): Promise<string | null> {
    const result = await this.charge(mppChargeOptions(offer, description))(new Request(requestUrl, { method: "GET" }));
    if (result.status !== 402) return null;
    return result.challenge.headers.get(MPP_HEADERS.challenge);
  }

  /** Parses and HMAC-verifies the credential without consuming it; reads the offer id the challenge was bound to. */
  peek(request: Request): MppPeek | null {
    const raw = paymentCredentialFrom(request);
    if (!raw) return null;
    let credential: Credential.Credential;
    try {
      credential = Credential.deserialize(raw);
    } catch {
      return { ok: false, reason: "malformed_credential" };
    }
    const challenge = credential.challenge;
    if (challenge.realm !== this.realm) return { ok: false, reason: "foreign_realm" };
    if (!Challenge.verify(challenge, { secretKey: this.secretKey })) return { ok: false, reason: "challenge_not_issued_here" };
    const offerId = mppOfferIdFromCredential(raw);
    return { ok: true, raw, challengeId: challenge.id, method: challenge.method, offerId, expires: challenge.expires ?? null };
  }

  /**
   * Runs mppx's charge for the offer against the real request (credential attached). mppx re-verifies the HMAC,
   * the pinned scope/meta/amount/recipient, expiry and payload, then verifies/broadcasts and waits for
   * confirmation before returning 200. Anything else comes back as `rejected` with mppx's response.
   */
  async chargeFor(request: Request, offer: Offer, description: string, challengeId: string): Promise<MppChargeOutcome> {
    const result = await this.charge(mppChargeOptions(offer, description))(request);
    if (result.status !== 200) {
      return { kind: "rejected", response: result.challenge, reason: await problemReason(result.challenge) };
    }
    const probe = result.withReceipt(new Response(null));
    const header = probe.headers.get(MPP_HEADERS.receipt);
    if (!header) throw new Error("mppx returned 200 without a Payment-Receipt");
    const receipt = Receipt.deserialize(header);
    const payer = this.payers.get(challengeId) ?? null;
    this.payers.delete(challengeId);
    return { kind: "paid", reference: receipt.reference, method: receipt.method, payer, withReceipt: (response) => result.withReceipt(response) };
  }

  /** Payment-Receipt for a re-serve of an already settled purchase (rebuilt from stored facts). */
  static receiptHeader(method: string, reference: string, settledAt: number): string {
    return Receipt.serialize(Receipt.from({ method, reference, status: "success", timestamp: new Date(settledAt).toISOString() }));
  }
}

async function problemReason(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { type?: unknown; detail?: unknown; title?: unknown };
    const type = typeof body.type === "string" ? body.type.replace(/^https:\/\/paymentauth\.org\/problems\//, "") : "rejected";
    const detail = typeof body.detail === "string" ? body.detail : typeof body.title === "string" ? body.title : "";
    return `${type}${detail ? `: ${detail}` : ""}`.slice(0, 300);
  } catch {
    return `mpp_rejected_${response.status}`;
  }
}
