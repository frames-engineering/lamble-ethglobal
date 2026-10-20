/**
 * Commerce store over the commerce database: offers, purchases, entitlements and the append-only audit log.
 * Every state change that decides who gets access runs in one SQLite transaction (BEGIN IMMEDIATE), so two
 * requests carrying the same payment can never both create a purchase or both receive an entitlement, whether
 * they race inside one process or across several processes sharing the file.
 *
 * Purchase lifecycle:
 *   verifying -> settling -> settled -> fulfilled        (normal path; settled -> fulfilled is atomic with the entitlement)
 *   verifying | settling -> failed                       (definitive rejection; no money moved)
 *   settling -> uncertain -> settled | failed            (indeterminate settlement, resolved by an operator)
 *
 * Server-only (node:sqlite).
 */
import { randomBytes } from "node:crypto";

import { sha256, stableStringify } from "../server/io.ts";
import { type Db, all, one, tx } from "../store/sqlite.ts";
import type { AccessPolicy } from "./pricing.ts";
import { openCommerceDb } from "./schema.ts";

export type Protocol = "x402" | "mpp";
export type PurchaseStatus = "verifying" | "settling" | "settled" | "fulfilled" | "failed" | "uncertain";

/** x402 terms an offer was quoted with; a retry must match them exactly (amount is in atomic units). */
export interface X402Terms {
  network: string;
  payTo: string;
  asset: string;
  amount: string;
  maxTimeoutSeconds: number;
}

/** MPP terms an offer was quoted with. */
export interface MppTerms {
  method: string;
  realm: string;
  recipient: string;
  testnet: boolean;
}

export interface ProtocolTerms {
  x402?: X402Terms;
  mpp?: MppTerms;
}

export interface OfferInput {
  kind: string;
  /** Already validated and normalized by the route handler; canonicalized here by sorting keys. */
  params: Record<string, string>;
  /** A concrete release id, never "latest": the caller pins it before quoting. */
  releaseId: string;
  canonicalUrl: string;
  /** Decimal USD string, e.g. "0.02". */
  amount: string;
  currency: string;
  protocols: ProtocolTerms;
  ttlSeconds: number;
}

export interface Offer {
  id: string;
  kind: string;
  params: Record<string, string>;
  paramsKey: string;
  releaseId: string;
  canonicalUrl: string;
  amount: string;
  currency: string;
  protocols: ProtocolTerms;
  createdAt: number;
  expiresAt: number;
}

export interface Purchase {
  id: string;
  offerId: string;
  protocol: Protocol;
  paymentKey: string;
  credentialHash: string;
  payer: string | null;
  network: string | null;
  amount: string;
  status: PurchaseStatus;
  settlementRef: string | null;
  failureReason: string | null;
  settleAttempts: number;
  replayServes: number;
  createdAt: number;
  updatedAt: number;
  settledAt: number | null;
  fulfilledAt: number | null;
}

export interface Entitlement {
  id: string;
  purchaseId: string;
  kind: string;
  paramsKey: string;
  releaseId: string;
  createdAt: number;
  expiresAt: number;
  downloads: number;
  downloadsMax: number;
  revokedAt: number | null;
  revokedReason: string | null;
}

export interface BeginPurchaseInput {
  offerId: string;
  protocol: Protocol;
  /** Protocol-level single-use identity, e.g. x402:<network>:<payer>:<eip3009 nonce> or mpp:<method>:<challenge id>. */
  paymentKey: string;
  /** sha256 of the exact credential presented; only an identical credential may use the lost-response path. */
  credentialHash: string;
  payer: string | null;
  network: string | null;
  amount: string;
}

/** The binding a capability must match: resource kind, canonical params key and release. */
export interface ResourceBinding {
  kind: string;
  paramsKey: string;
  releaseId: string;
}

export type AccessDenial = "invalid" | "mismatch" | "revoked" | "expired" | "exhausted" | "replay_limit" | "missing";
export type AccessResult = { ok: true; entitlement: Entitlement } | { ok: false; error: AccessDenial; entitlement?: Entitlement };

export type EventOutcome = "ok" | "rejected" | "failed" | "uncertain" | "error";

/** One audit row. Never put secrets here: no capability tokens, signatures, credentials or full headers. */
export interface PaymentEventInput {
  event: string;
  outcome: EventOutcome;
  protocol?: Protocol | null;
  offerId?: string | null;
  purchaseId?: string | null;
  entitlementId?: string | null;
  httpStatus?: number | null;
  detail?: Record<string, unknown> | null;
}

export interface PaymentEvent extends Required<Omit<PaymentEventInput, "detail">> {
  seq: number;
  at: number;
  detail: Record<string, unknown> | null;
}

export type UncertainResolution = { outcome: "settled"; settlementRef: string } | { outcome: "failed"; reason: string };

export const CAPABILITY_PREFIX = "lamble_cap_";

/** Raised when a state transition is attempted from the wrong state (a programming or operator error). */
export class CommerceStateError extends Error {}

/** Sorted, stable JSON of the params and its sha256: the identity a capability and an offer are bound to. */
export function canonicalParams(params: Record<string, string>): { json: string; key: string } {
  const json = stableStringify(params);
  return { json, key: sha256(json) };
}

export function newCapabilityToken(): string {
  return `${CAPABILITY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function capabilityTokenHash(token: string): string {
  return sha256(token);
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

interface OfferRow {
  id: string;
  resource_kind: string;
  params_json: string;
  params_key: string;
  release_id: string;
  canonical_url: string;
  amount: string;
  currency: string;
  protocols_json: string;
  created_at: number;
  expires_at: number;
}

interface PurchaseRow {
  id: string;
  offer_id: string;
  protocol: Protocol;
  payment_key: string;
  credential_hash: string;
  payer: string | null;
  network: string | null;
  amount: string;
  status: PurchaseStatus;
  settlement_ref: string | null;
  failure_reason: string | null;
  settle_attempts: number;
  replay_serves: number;
  created_at: number;
  updated_at: number;
  settled_at: number | null;
  fulfilled_at: number | null;
}

interface EntitlementRow {
  id: string;
  purchase_id: string;
  token_hash: string;
  resource_kind: string;
  params_key: string;
  release_id: string;
  created_at: number;
  expires_at: number;
  downloads: number;
  downloads_max: number;
  revoked_at: number | null;
  revoked_reason: string | null;
}

interface EventRow {
  seq: number;
  at: number;
  event: string;
  outcome: EventOutcome;
  protocol: Protocol | null;
  offer_id: string | null;
  purchase_id: string | null;
  entitlement_id: string | null;
  http_status: number | null;
  detail_json: string | null;
}

const toOffer = (r: OfferRow): Offer => ({
  id: r.id,
  kind: r.resource_kind,
  params: JSON.parse(r.params_json) as Record<string, string>,
  paramsKey: r.params_key,
  releaseId: r.release_id,
  canonicalUrl: r.canonical_url,
  amount: r.amount,
  currency: r.currency,
  protocols: JSON.parse(r.protocols_json) as ProtocolTerms,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

const toPurchase = (r: PurchaseRow): Purchase => ({
  id: r.id,
  offerId: r.offer_id,
  protocol: r.protocol,
  paymentKey: r.payment_key,
  credentialHash: r.credential_hash,
  payer: r.payer,
  network: r.network,
  amount: r.amount,
  status: r.status,
  settlementRef: r.settlement_ref,
  failureReason: r.failure_reason,
  settleAttempts: r.settle_attempts,
  replayServes: r.replay_serves,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  settledAt: r.settled_at,
  fulfilledAt: r.fulfilled_at,
});

const toEntitlement = (r: EntitlementRow): Entitlement => ({
  id: r.id,
  purchaseId: r.purchase_id,
  kind: r.resource_kind,
  paramsKey: r.params_key,
  releaseId: r.release_id,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  downloads: r.downloads,
  downloadsMax: r.downloads_max,
  revokedAt: r.revoked_at,
  revokedReason: r.revoked_reason,
});

export class CommerceStore {
  readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** Opens and migrates the commerce database at `file` (":memory:" for tests). */
  static open(file: string): CommerceStore {
    return new CommerceStore(openCommerceDb(file));
  }

  close(): void {
    this.db.close();
  }

  /**
   * Returns a live offer with the same binding (kind, params, release, canonical URL, price, protocol terms)
   * when one has at least half its lifetime left, else creates one. Reuse keeps 402s for the same resource
   * stable and the table small; the half-life floor leaves a client time to pay before the offer expires.
   */
  createOrReuseOffer(input: OfferInput, now: number): Offer {
    const params = canonicalParams(input.params);
    const ttlMs = input.ttlSeconds * 1000;
    const bindingKey = sha256(
      stableStringify({
        kind: input.kind,
        paramsKey: params.key,
        releaseId: input.releaseId,
        canonicalUrl: input.canonicalUrl,
        amount: input.amount,
        currency: input.currency,
        protocols: input.protocols,
      }),
    );
    return tx(this.db, () => {
      const existing = one<OfferRow>(
        this.db,
        "SELECT * FROM offers WHERE binding_key = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
        bindingKey,
        now + Math.floor(ttlMs / 2),
      );
      if (existing) return toOffer(existing);
      const id = newId("off");
      this.db
        .prepare(
          `INSERT INTO offers (id, binding_key, resource_kind, params_json, params_key, release_id, canonical_url, amount,
             currency, protocols_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          bindingKey,
          input.kind,
          params.json,
          params.key,
          input.releaseId,
          input.canonicalUrl,
          input.amount,
          input.currency,
          stableStringify(input.protocols),
          now,
          now + ttlMs,
        );
      return toOffer(one<OfferRow>(this.db, "SELECT * FROM offers WHERE id = ?", id) as OfferRow);
    });
  }

  getOffer(id: string): Offer | null {
    const row = one<OfferRow>(this.db, "SELECT * FROM offers WHERE id = ?", id);
    return row ? toOffer(row) : null;
  }

  /**
   * Claims a payment identity. Inside one write transaction: if payment_key exists the existing purchase is
   * returned (created=false) and nothing is written, otherwise a purchase is inserted in `verifying`. The
   * UNIQUE constraint on payment_key backs this up across processes.
   */
  beginPurchase(input: BeginPurchaseInput, now: number): { purchase: Purchase; created: boolean } {
    return tx(this.db, () => {
      const existing = one<PurchaseRow>(this.db, "SELECT * FROM purchases WHERE payment_key = ?", input.paymentKey);
      if (existing) return { purchase: toPurchase(existing), created: false };
      const id = newId("pur");
      this.db
        .prepare(
          `INSERT INTO purchases (id, offer_id, protocol, payment_key, credential_hash, payer, network, amount, status,
             created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verifying', ?, ?)`,
        )
        .run(id, input.offerId, input.protocol, input.paymentKey, input.credentialHash, input.payer, input.network, input.amount, now, now);
      return { purchase: this.requirePurchase(id), created: true };
    });
  }

  getPurchase(id: string): Purchase | null {
    const row = one<PurchaseRow>(this.db, "SELECT * FROM purchases WHERE id = ?", id);
    return row ? toPurchase(row) : null;
  }

  getPurchaseByKey(paymentKey: string): Purchase | null {
    const row = one<PurchaseRow>(this.db, "SELECT * FROM purchases WHERE payment_key = ?", paymentKey);
    return row ? toPurchase(row) : null;
  }

  /** verifying -> settling, counting the attempt. False when another request already moved it. */
  markSettling(id: string, now: number): boolean {
    return this.change(
      "UPDATE purchases SET status = 'settling', settle_attempts = settle_attempts + 1, updated_at = ? WHERE id = ? AND status = 'verifying'",
      now,
      id,
    );
  }

  /**
   * MPP only: failed | uncertain -> settling for the identical credential. Safe because a Tempo pull credential
   * is one signed transaction that can be mined at most once, and mppx releases its replay claim on failure
   * precisely so a retry recovers the receipt. x402 never reopens (see fulfillment.ts).
   */
  reopenPurchase(id: string, now: number): boolean {
    return this.change(
      `UPDATE purchases SET status = 'settling', settle_attempts = settle_attempts + 1, failure_reason = NULL, updated_at = ?
         WHERE id = ? AND status IN ('failed', 'uncertain')`,
      now,
      id,
    );
  }

  /** Records a successful settlement. `settlementRef` must come from the facilitator or mppx, never the client. */
  markSettled(id: string, settlementRef: string, payer: string | null, now: number): boolean {
    return tx(this.db, () => this.settleInTx(id, settlementRef, payer, now));
  }

  markFailed(id: string, reason: string, now: number): boolean {
    return this.change(
      "UPDATE purchases SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ? AND status IN ('verifying', 'settling')",
      reason.slice(0, 500),
      now,
      id,
    );
  }

  /** Settlement outcome unknown (timeout, 5xx, malformed answer): never retried automatically. */
  markUncertain(id: string, reason: string, now: number): boolean {
    return this.change(
      "UPDATE purchases SET status = 'uncertain', failure_reason = ?, updated_at = ? WHERE id = ? AND status = 'settling'",
      reason.slice(0, 500),
      now,
      id,
    );
  }

  /**
   * Operator reconciliation of an `uncertain` purchase after checking the chain. `settled` lets the buyer's
   * next identical retry claim the entitlement (and its one-time capability); `failed` closes it.
   */
  resolveUncertain(id: string, resolution: UncertainResolution, now: number): boolean {
    return tx(this.db, () => {
      const purchase = this.requirePurchase(id);
      if (purchase.status !== "uncertain") return false;
      if (resolution.outcome === "failed") {
        this.db
          .prepare("UPDATE purchases SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?")
          .run(`reconciled: ${resolution.reason}`.slice(0, 500), now, id);
        return true;
      }
      return this.settleInTx(id, resolution.settlementRef, null, now);
    });
  }

  /**
   * Creates the entitlement for a settled purchase and marks it fulfilled, atomically. Returns the plaintext
   * capability token exactly once; only its sha256 is stored. The purchase response counts as download 1.
   */
  createEntitlement(purchaseId: string, policy: AccessPolicy, now: number): { entitlement: Entitlement; token: string } {
    return tx(this.db, () => this.entitleInTx(purchaseId, policy, now));
  }

  /** markSettled + createEntitlement in one transaction, so a crash cannot leave money without access. */
  settleAndEntitle(
    purchaseId: string,
    settlementRef: string,
    payer: string | null,
    policy: AccessPolicy,
    now: number,
  ): { entitlement: Entitlement; token: string } {
    return tx(this.db, () => {
      if (!this.settleInTx(purchaseId, settlementRef, payer, now)) {
        throw new CommerceStateError(`purchase ${purchaseId} is not settling`);
      }
      return this.entitleInTx(purchaseId, policy, now);
    });
  }

  getEntitlement(id: string): Entitlement | null {
    const row = one<EntitlementRow>(this.db, "SELECT * FROM entitlements WHERE id = ?", id);
    return row ? toEntitlement(row) : null;
  }

  getEntitlementForPurchase(purchaseId: string): Entitlement | null {
    const row = one<EntitlementRow>(this.db, "SELECT * FROM entitlements WHERE purchase_id = ?", purchaseId);
    return row ? toEntitlement(row) : null;
  }

  /** Read-only lookup by plaintext capability (for release pinning); does not count a download. */
  findEntitlementByToken(token: string): Entitlement | null {
    if (!token.startsWith(CAPABILITY_PREFIX)) return null;
    const row = one<EntitlementRow>(this.db, "SELECT * FROM entitlements WHERE token_hash = ?", capabilityTokenHash(token));
    return row ? toEntitlement(row) : null;
  }

  /**
   * Redeems a capability for one delivery: the token must be bound to exactly this resource kind, params key
   * and release, unrevoked, unexpired and under downloadsMax. The download is counted atomically with the
   * checks, so concurrent redemptions cannot exceed the limit.
   */
  redeemCapability(token: string, binding: ResourceBinding, now: number): AccessResult {
    if (!token.startsWith(CAPABILITY_PREFIX)) return { ok: false, error: "invalid" };
    return tx(this.db, () => {
      const row = one<EntitlementRow>(this.db, "SELECT * FROM entitlements WHERE token_hash = ?", capabilityTokenHash(token));
      if (!row) return { ok: false, error: "invalid" } as const;
      return this.countDownload(row, binding, now);
    });
  }

  /**
   * Lost-response recovery for a fulfilled purchase: counts one download on its entitlement and one replay
   * serve, both capped. The caller has already checked the credential is identical and inside the window.
   */
  replayServe(purchaseId: string, binding: ResourceBinding, maxServes: number, now: number): AccessResult {
    return tx(this.db, () => {
      const purchase = this.requirePurchase(purchaseId);
      const row = one<EntitlementRow>(this.db, "SELECT * FROM entitlements WHERE purchase_id = ?", purchaseId);
      if (!row) return { ok: false, error: "missing" } as const;
      if (purchase.replayServes >= maxServes) return { ok: false, error: "replay_limit", entitlement: toEntitlement(row) } as const;
      const result = this.countDownload(row, binding, now);
      if (result.ok) {
        this.db.prepare("UPDATE purchases SET replay_serves = replay_serves + 1, updated_at = ? WHERE id = ?").run(now, purchaseId);
      }
      return result;
    });
  }

  /** Gives back a counted download whose body could not be produced. */
  releaseDownload(entitlementId: string): void {
    this.db.prepare("UPDATE entitlements SET downloads = downloads - 1 WHERE id = ? AND downloads > 0").run(entitlementId);
  }

  revokeEntitlement(id: string, reason: string, now: number): boolean {
    return this.change(
      "UPDATE entitlements SET revoked_at = ?, revoked_reason = ? WHERE id = ? AND revoked_at IS NULL",
      now,
      reason.slice(0, 500),
      id,
    );
  }

  appendEvent(input: PaymentEventInput, now: number): void {
    this.db
      .prepare(
        `INSERT INTO payment_events (at, event, outcome, protocol, offer_id, purchase_id, entitlement_id, http_status, detail_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        now,
        input.event,
        input.outcome,
        input.protocol ?? null,
        input.offerId ?? null,
        input.purchaseId ?? null,
        input.entitlementId ?? null,
        input.httpStatus ?? null,
        input.detail ? stableStringify(input.detail) : null,
      );
  }

  /** Audit rows in order, optionally for one purchase or offer (operator tooling and tests). */
  listEvents(filter: { purchaseId?: string; offerId?: string; limit?: number } = {}): PaymentEvent[] {
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (filter.purchaseId) {
      where.push("purchase_id = ?");
      args.push(filter.purchaseId);
    }
    if (filter.offerId) {
      where.push("offer_id = ?");
      args.push(filter.offerId);
    }
    const sql = `SELECT * FROM payment_events ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY seq LIMIT ?`;
    return all<EventRow>(this.db, sql, ...args, filter.limit ?? 10_000).map((r) => ({
      seq: r.seq,
      at: r.at,
      event: r.event,
      outcome: r.outcome,
      protocol: r.protocol,
      offerId: r.offer_id,
      purchaseId: r.purchase_id,
      entitlementId: r.entitlement_id,
      httpStatus: r.http_status,
      detail: r.detail_json ? (JSON.parse(r.detail_json) as Record<string, unknown>) : null,
    }));
  }

  /** Purchases needing an operator: uncertain ones, and settled ones whose entitlement was never created. */
  listNeedingReconciliation(): Purchase[] {
    return all<PurchaseRow>(
      this.db,
      `SELECT p.* FROM purchases p LEFT JOIN entitlements e ON e.purchase_id = p.id
         WHERE p.status = 'uncertain' OR (p.status = 'settled' AND e.id IS NULL) ORDER BY p.updated_at`,
    ).map(toPurchase);
  }

  private requirePurchase(id: string): Purchase {
    const purchase = this.getPurchase(id);
    if (!purchase) throw new CommerceStateError(`unknown purchase ${id}`);
    return purchase;
  }

  private change(sql: string, ...args: (string | number | null)[]): boolean {
    return Number(this.db.prepare(sql).run(...args).changes) === 1;
  }

  private settleInTx(id: string, settlementRef: string, payer: string | null, now: number): boolean {
    if (!settlementRef) throw new CommerceStateError("settlement reference is required");
    return this.change(
      `UPDATE purchases SET status = 'settled', settlement_ref = ?, payer = COALESCE(?, payer), settled_at = ?, updated_at = ?,
         failure_reason = NULL WHERE id = ? AND status IN ('settling', 'uncertain')`,
      settlementRef,
      payer,
      now,
      now,
      id,
    );
  }

  private entitleInTx(purchaseId: string, policy: AccessPolicy, now: number): { entitlement: Entitlement; token: string } {
    const purchase = this.requirePurchase(purchaseId);
    if (purchase.status !== "settled") throw new CommerceStateError(`purchase ${purchaseId} is ${purchase.status}, not settled`);
    const offer = this.getOffer(purchase.offerId);
    if (!offer) throw new CommerceStateError(`purchase ${purchaseId} has no offer`);
    const token = newCapabilityToken();
    const id = newId("ent");
    this.db
      .prepare(
        `INSERT INTO entitlements (id, purchase_id, token_hash, resource_kind, params_key, release_id, created_at, expires_at,
           downloads, downloads_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      )
      .run(
        id,
        purchaseId,
        capabilityTokenHash(token),
        offer.kind,
        offer.paramsKey,
        offer.releaseId,
        now,
        now + policy.accessDurationSeconds * 1000,
        policy.downloadsMax,
      );
    this.db
      .prepare("UPDATE purchases SET status = 'fulfilled', fulfilled_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, purchaseId);
    return { entitlement: this.getEntitlement(id) as Entitlement, token };
  }

  private countDownload(row: EntitlementRow, binding: ResourceBinding, now: number): AccessResult {
    const entitlement = toEntitlement(row);
    if (row.resource_kind !== binding.kind || row.params_key !== binding.paramsKey || row.release_id !== binding.releaseId) {
      return { ok: false, error: "mismatch", entitlement };
    }
    if (row.revoked_at !== null) return { ok: false, error: "revoked", entitlement };
    if (row.expires_at <= now) return { ok: false, error: "expired", entitlement };
    if (row.downloads >= row.downloads_max) return { ok: false, error: "exhausted", entitlement };
    this.db.prepare("UPDATE entitlements SET downloads = downloads + 1 WHERE id = ?").run(row.id);
    return { ok: true, entitlement: { ...entitlement, downloads: entitlement.downloads + 1 } };
  }
}
