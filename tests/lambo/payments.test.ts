/**
 * Payment and entitlement layer: offers, x402 and MPP fulfilment, capabilities, idempotency and recovery.
 * Entirely offline: an in-process fake x402 facilitator, a deterministic in-process MPP method (plus the real
 * Tempo method for the paths that need no chain), ":memory:" or temporary SQLite files, and a fetch stub that
 * fails the suite if anything reaches for the network. No payment, facilitator, RPC or Frames call is made.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { decodePaymentRequiredHeader, decodePaymentResponseHeader, encodePaymentResponseHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import type { FacilitatorClient } from "@x402/core/server";
import {
  FacilitatorTimeoutError,
  type PaymentPayload,
  type PaymentRequirements,
  type SettleResponse,
  type SupportedResponse,
  type VerifyResponse,
} from "@x402/core/types";
import { Challenge, Credential, Errors, Method, PaymentRequest, Receipt, z } from "mppx";
import { Store } from "mppx/server";

import {
  type AccessPolicy,
  type PaidResource,
  type PaymentAdapters,
  type PaymentDeps,
  type Pricing,
  CommerceStore,
  MppAdapter,
  X402Adapter,
  canonicalParams,
  capabilityTokenHash,
  createPaymentRuntime,
  createSqliteMppStore,
  handlePaidRequest,
  loadPricing,
  pruneMppStore,
  resolvePinnedRelease,
} from "../../src/lib/lambo/payments/index.ts";

// ---------------------------------------------------------------------------------------------------------------
// Offline guard: any network attempt is counted and fails; the last test asserts there were none.

let networkAttempts = 0;
globalThis.fetch = (async (input: unknown) => {
  networkAttempts++;
  throw new Error(`network disabled in payments tests: ${String(input)}`);
}) as typeof fetch;

const NETWORK = "eip155:84532";
const PAY_TO = "0x1111111111111111111111111111111111111111";
const MPP_RECIPIENT = "0x2222222222222222222222222222222222222222";
const PAYER = "0x3333333333333333333333333333333333333333";
const SECRET = "lambo-test-secret-key-at-least-32-bytes-long";
const REALM = "lambo-test";
const R1 = "rel-20261019T000000Z-aaaaaaaa";
const R2 = "rel-20261020T000000Z-bbbbbbbb";
const COIN_A = `0x${"a1".repeat(20)}`;
const COIN_B = `0x${"b2".repeat(20)}`;
const BASE = "https://lamble.test";
const DAY_MS = 86_400_000;

function must<T>(value: T | null | undefined, what: string): T {
  assert.ok(value !== null && value !== undefined, `missing ${what}`);
  return value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------------------------------------------
// Fakes

function authorizationOf(payload: PaymentPayload): { from: string; nonce: string } {
  return (payload.payload as { authorization: { from: string; nonce: string } }).authorization;
}

/** In-process FacilitatorClient: counts calls; verify/settle behaviour is swappable per test. */
class FakeFacilitator implements FacilitatorClient {
  verifyCalls = 0;
  settleCalls = 0;
  supportedCalls = 0;
  supportedFails = false;
  verifyImpl: (payload: PaymentPayload, requirements: PaymentRequirements) => Promise<VerifyResponse> = async (payload) => ({
    isValid: true,
    payer: authorizationOf(payload).from,
  });
  settleImpl: (payload: PaymentPayload, requirements: PaymentRequirements) => Promise<SettleResponse> = async (payload, requirements) => ({
    success: true,
    transaction: `0x${capabilityTokenHash(authorizationOf(payload).nonce)}`,
    network: requirements.network,
    payer: authorizationOf(payload).from,
  });

  async getSupported(): Promise<SupportedResponse> {
    this.supportedCalls++;
    if (this.supportedFails) throw new Error("facilitator down");
    return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} };
  }
  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse> {
    this.verifyCalls++;
    return this.verifyImpl(payload, requirements);
  }
  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse> {
    this.settleCalls++;
    return this.settleImpl(payload, requirements);
  }
}

/**
 * Deterministic MPP method "test/charge": accepts payload {token: "good"}, claims the challenge id in the
 * shared replay store (as tempo.charge claims transaction hashes) and returns a receipt. No chain involved.
 */
function fakeMppMethod(store: Store.AtomicStore, counter: { verifies: number }) {
  const method = Method.from({
    name: "test",
    intent: "charge",
    schema: {
      credential: { payload: z.object({ token: z.string() }) },
      request: z.object({ amount: z.string(), currency: z.string(), recipient: z.string() }),
    },
  });
  return Method.toServer(method, {
    defaults: { currency: "usd", recipient: MPP_RECIPIENT },
    async verify({ credential }) {
      counter.verifies++;
      if (credential.payload.token !== "good") throw new Errors.VerificationFailedError({ reason: "test method refused the token" });
      const expires = Date.parse(credential.challenge.expires ?? "");
      if (!(await Store.tryClaim(store, `test:charge:${credential.challenge.id}`, expires))) {
        throw new Errors.CredentialReplayedError({ reason: "credential already used" });
      }
      return Receipt.from({
        method: "test",
        reference: `0xtest${credential.challenge.id.slice(0, 24)}`,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    },
  });
}

interface Fixture {
  deps: PaymentDeps;
  store: CommerceStore;
  facilitator: FakeFacilitator;
  mpp: { verifies: number };
  mppStore: Store.AtomicStore;
  clock: { t: number };
}

function testPricing(access: Partial<AccessPolicy> = {}): Pricing {
  const pricing = loadPricing(); // the real docs/data/pricing.json, validated
  return { ...pricing, access: { ...pricing.access, ...access } };
}

function fixture(options: { x402?: boolean; mpp?: boolean; access?: Partial<AccessPolicy>; store?: CommerceStore } = {}): Fixture {
  const store = options.store ?? CommerceStore.open(":memory:");
  const facilitator = new FakeFacilitator();
  const counter = { verifies: 0 };
  const clock = { t: Date.now() };
  const mppStore = createSqliteMppStore(store.db);
  const adapters: PaymentAdapters = {};
  if (options.x402 !== false) adapters.x402 = new X402Adapter({ network: NETWORK, payTo: PAY_TO, facilitator });
  if (options.mpp !== false) {
    adapters.mpp = new MppAdapter({
      secretKey: SECRET,
      realm: REALM,
      recipient: MPP_RECIPIENT,
      testnet: true,
      store: mppStore,
      methods: [fakeMppMethod(mppStore, counter)],
    });
  }
  return { deps: { store, pricing: testPricing(options.access), adapters, now: () => clock.t }, store, facilitator, mpp: counter, mppStore, clock };
}

function coin(address: string, releaseId = R1, renders?: { count: number }): PaidResource {
  return {
    kind: "coin-bundle",
    params: { chain: "base", address },
    releaseId,
    canonicalUrl: `${BASE}/api/v1/coins/base/${address}`,
    description: `Coin research bundle base/${address}`,
    render: () => {
      if (renders) renders.count++;
      return { coin: address, release: releaseId };
    },
  };
}

function get(resource: PaidResource, headers: Record<string, string> = {}): Request {
  return new Request(resource.canonicalUrl, { headers });
}

/** What an x402 client does with a 402: copy resource and the accepted requirement, sign an EIP-3009 authorization. */
function x402Pay(offerResponse: Response, overrides: { nonce?: string; from?: string; mutate?: (p: PaymentPayload) => void } = {}) {
  const required = decodePaymentRequiredHeader(must(offerResponse.headers.get("PAYMENT-REQUIRED"), "PAYMENT-REQUIRED"));
  const accepted = must(required.accepts[0], "accepts[0]");
  const payload: PaymentPayload = {
    x402Version: 2,
    resource: required.resource,
    accepted,
    payload: {
      signature: `0x${"5a".repeat(65)}`,
      authorization: {
        from: overrides.from ?? PAYER,
        to: accepted.payTo,
        value: accepted.amount,
        validAfter: "0",
        validBefore: String(Math.floor(Date.now() / 1000) + 600),
        nonce: overrides.nonce ?? `0x${randomBytes(32).toString("hex")}`,
      },
    },
  };
  overrides.mutate?.(payload);
  return { header: encodePaymentSignatureHeader(payload), payload, nonce: authorizationOf(payload).nonce };
}

async function buyX402(f: Fixture, resource: PaidResource) {
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  assert.equal(offer.status, 402);
  const pay = x402Pay(offer);
  const paid = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(paid.status, 200, await paid.clone().text());
  return { offer, pay, paid, token: must(paid.headers.get("Lambo-Capability"), "Lambo-Capability") };
}

/** What an MPP client does with a 402: answer the (single) Payment challenge with a credential. */
function mppCredential(offerResponse: Response, token = "good"): { header: string; challenge: Challenge.Challenge } {
  const challenge = Challenge.fromResponse(offerResponse);
  return { header: Credential.serialize({ challenge, payload: { token } }), challenge };
}

function count(store: CommerceStore, table: "purchases" | "entitlements" | "offers"): number {
  return (store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

function onlyPurchase(store: CommerceStore) {
  const rows = store.db.prepare("SELECT id FROM purchases").all() as { id: string }[];
  assert.equal(rows.length, 1);
  return must(store.getPurchase(must(rows[0], "row").id), "purchase");
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function assertPaidCache(response: Response) {
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
}

// ---------------------------------------------------------------------------------------------------------------
// 1. Offers

test("a 402 offer binds resource, params key, release, amount, network and expiry, with both protocol challenges", async () => {
  const f = fixture();
  const resource = coin(COIN_A);
  const response = await handlePaidRequest(get(resource), resource, f.deps);
  assert.equal(response.status, 402);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const json = await body(response);
  const offer = json.offer as Record<string, unknown>;
  const offerId = offer.id as string;
  const described = offer.resource as Record<string, unknown>;
  assert.equal(described.kind, "coin-bundle");
  assert.deepEqual(described.params, { address: COIN_A, chain: "base" });
  assert.equal(described.paramsKey, canonicalParams({ chain: "base", address: COIN_A }).key);
  assert.equal(described.releaseId, R1);
  assert.deepEqual(offer.price, { amount: "0.02", currency: "USD" });
  assert.equal(offer.expiresAt, new Date(f.clock.t + 600_000).toISOString());
  assert.deepEqual(
    (json.accepts as { protocol: string }[]).map((a) => a.protocol),
    ["x402", "mpp"],
  );
  assert.equal((json.pricing as { status: string }).status, "test");
  assert.equal((json.pricing as { approved: boolean }).approved, false);

  // x402 challenge: the offer and release ride in the resource URL the client copies into its payload.
  const required = decodePaymentRequiredHeader(must(response.headers.get("PAYMENT-REQUIRED"), "PAYMENT-REQUIRED"));
  assert.equal(required.x402Version, 2);
  const accepted = must(required.accepts[0], "accepts[0]");
  assert.equal(accepted.network, NETWORK);
  assert.equal(accepted.amount, "20000"); // $0.02 in 6-decimal USDC
  assert.equal(accepted.payTo, PAY_TO);
  const resourceUrl = new URL(required.resource.url);
  assert.equal(resourceUrl.searchParams.get("lambo_offer"), offerId);
  assert.equal(resourceUrl.searchParams.get("lambo_release"), R1);
  assert.match(must(resourceUrl.searchParams.get("lambo_n"), "nonce"), /^[0-9a-f]{32}$/);

  // MPP challenge: amount, expiry and HMAC-bound meta/scope derived from the offer.
  const challenge = Challenge.fromResponse(response);
  assert.equal(challenge.method, "test");
  assert.equal(challenge.realm, REALM);
  assert.equal(challenge.request.amount, "0.02");
  assert.equal(challenge.expires, offer.expiresAt);
  const meta = PaymentRequest.deserialize(must(challenge.opaque, "opaque")) as Record<string, string>;
  assert.equal(meta.lambo_offer, offerId);
  assert.equal(meta._mppx_scope, `lambo:coin-bundle:${described.paramsKey as string}:${R1}`);

  // Stored offer carries the exact protocol terms a retry must match.
  const stored = must(f.store.getOffer(offerId), "offer");
  assert.equal(stored.releaseId, R1);
  assert.equal(stored.amount, "0.02");
  assert.deepEqual(stored.protocols.x402, {
    network: NETWORK,
    payTo: PAY_TO,
    asset: accepted.asset,
    amount: "20000",
    maxTimeoutSeconds: 300,
  });
  assert.deepEqual(stored.protocols.mpp, { method: "test", realm: REALM, recipient: MPP_RECIPIENT, testnet: true });

  // Reuse: same binding -> same offer; another coin -> another offer; past half its life -> a fresh one.
  const again = await body(await handlePaidRequest(get(resource), resource, f.deps));
  assert.equal((again.offer as { id: string }).id, offerId);
  const other = await body(await handlePaidRequest(get(coin(COIN_B)), coin(COIN_B), f.deps));
  assert.notEqual((other.offer as { id: string }).id, offerId);
  f.clock.t += 301_000;
  const later = await body(await handlePaidRequest(get(resource), resource, f.deps));
  assert.notEqual((later.offer as { id: string }).id, offerId);
  assert.ok(f.store.listEvents().some((e) => e.event === "offer.issued" && e.offerId === offerId));
});

test("with no protocol available the answer is 503 payments_unavailable, never a challenge", async () => {
  const none = fixture({ x402: false, mpp: false });
  const resource = coin(COIN_A);
  const response = await handlePaidRequest(get(resource), resource, none.deps);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("PAYMENT-REQUIRED"), null);
  assert.equal(response.headers.get("WWW-Authenticate"), null);
  assert.equal((await body(response)).error, "payments_unavailable");
  assert.equal(count(none.store, "offers"), 0);

  // x402 configured but its facilitator unreachable, MPP off: still 503, not a half challenge.
  const down = fixture({ mpp: false });
  down.facilitator.supportedFails = true;
  const unreachable = await handlePaidRequest(get(resource), resource, down.deps);
  assert.equal(unreachable.status, 503);
  assert.match(JSON.stringify(await body(unreachable)), /facilitator down/);
  assert.equal((await handlePaidRequest(get(resource), resource, down.deps)).status, 503);
  assert.equal(down.facilitator.supportedCalls, 1, "a failed /supported is not retried on every request");

  // The runtime built from an empty environment reports why and serves 503.
  const runtime = createPaymentRuntime({}, { dbPath: ":memory:" });
  const status = runtime.status();
  assert.equal(status.available, false);
  assert.equal(status.protocols.x402.reason, "LAMBO_X402_ENABLED is not set");
  assert.equal(status.protocols.mpp.reason, "LAMBO_MPP_ENABLED is not set");
  assert.equal(status.pricing.status, "test");
  assert.equal((await handlePaidRequest(get(resource), resource, runtime)).status, 503);
  runtime.close();

  const partial = createPaymentRuntime({ LAMBO_X402_ENABLED: "true", LAMBO_MPP_ENABLED: "1" }, { dbPath: ":memory:" });
  assert.match(must(partial.status().protocols.x402.reason, "reason"), /LAMBO_X402_PAY_TO/);
  assert.match(must(partial.status().protocols.mpp.reason, "reason"), /LAMBO_MPP_RECIPIENT.*MPP_SECRET_KEY/);
  partial.close();

  // Real-money networks stay unavailable while pricing.json is test/unapproved.
  const mainnet = createPaymentRuntime(
    {
      LAMBO_X402_ENABLED: "true",
      LAMBO_X402_NETWORK: "eip155:8453",
      LAMBO_X402_PAY_TO: PAY_TO,
      LAMBO_MPP_ENABLED: "true",
      LAMBO_MPP_TESTNET: "false",
      LAMBO_MPP_RECIPIENT: MPP_RECIPIENT,
      MPP_SECRET_KEY: SECRET,
    },
    { dbPath: ":memory:" },
  );
  assert.equal(mainnet.status().protocols.x402.configured, false);
  assert.match(must(mainnet.status().protocols.x402.reason, "reason"), /real-money/);
  assert.equal(mainnet.status().protocols.mpp.configured, false);
  assert.match(must(mainnet.status().protocols.mpp.reason, "reason"), /real money/);
  assert.equal((await handlePaidRequest(get(resource), resource, mainnet)).status, 503);
  mainnet.close();

  // A testnet runtime with an injected facilitator becomes available once /supported loads.
  const ok = createPaymentRuntime(
    { LAMBO_X402_ENABLED: "true", LAMBO_X402_PAY_TO: PAY_TO },
    { dbPath: ":memory:", x402: { facilitator: new FakeFacilitator() } },
  );
  assert.equal(ok.status().protocols.x402.available, false);
  assert.equal((await ok.check()).protocols.x402.available, true);
  assert.equal((await handlePaidRequest(get(resource), resource, ok)).status, 402);
  ok.close();
});

// ---------------------------------------------------------------------------------------------------------------
// 2. x402 happy path

test("x402 happy path: verify and settle once, entitlement created, capability returned once, body served", async () => {
  const f = fixture();
  const renders = { count: 0 };
  const resource = coin(COIN_A, R1, renders);
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  assert.equal(renders.count, 0, "nothing is rendered before payment");
  const pay = x402Pay(offer);
  const fakeHash = `0x${"de".repeat(32)}`;
  const paid = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header, "X-Transaction-Hash": fakeHash }), resource, f.deps);

  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.clone().json(), { coin: COIN_A, release: R1 });
  assert.equal(renders.count, 1);
  assert.equal(f.facilitator.verifyCalls, 1);
  assert.equal(f.facilitator.settleCalls, 1);
  assertPaidCache(paid);
  assert.equal(paid.headers.get("Lambo-Release"), R1);
  assert.equal(paid.headers.get("Lambo-Entitlement-Expires"), new Date(f.clock.t + 30 * DAY_MS).toISOString());
  assert.equal(paid.headers.get("Lambo-Downloads-Remaining"), "19");
  const token = must(paid.headers.get("Lambo-Capability"), "capability");
  assert.match(token, /^lambo_cap_[A-Za-z0-9_-]{43}$/);
  const receipt = decodePaymentResponseHeader(must(paid.headers.get("PAYMENT-RESPONSE"), "PAYMENT-RESPONSE"));
  assert.equal(receipt.success, true);
  const facilitatorTx = `0x${capabilityTokenHash(pay.nonce)}`;
  assert.equal(receipt.transaction, facilitatorTx);

  const purchase = onlyPurchase(f.store);
  assert.equal(purchase.status, "fulfilled");
  assert.equal(purchase.paymentKey, `x402:${NETWORK}:${PAYER}:${pay.nonce}`);
  assert.equal(purchase.settlementRef, facilitatorTx, "the stored settlement is the facilitator's, never the client's header");
  assert.notEqual(purchase.settlementRef, fakeHash);
  assert.equal(purchase.settleAttempts, 1);
  const entitlement = must(f.store.getEntitlementForPurchase(purchase.id), "entitlement");
  assert.equal(entitlement.downloads, 1);
  assert.equal(entitlement.releaseId, R1);

  // Only the hash of the capability is stored anywhere.
  const dump = JSON.stringify([
    f.store.db.prepare("SELECT * FROM entitlements").all(),
    f.store.db.prepare("SELECT * FROM purchases").all(),
    f.store.db.prepare("SELECT * FROM payment_events").all(),
  ]);
  assert.ok(!dump.includes(token));
  assert.ok(dump.includes(capabilityTokenHash(token)));
  const events = f.store.listEvents({ purchaseId: purchase.id }).map((e) => e.event);
  assert.deepEqual(events, ["purchase.begun", "purchase.fulfilled"]);
});

// ---------------------------------------------------------------------------------------------------------------
// 3. Lost-response recovery

test("the identical x402 payload is re-served inside the replay window without settling again, then refused", async () => {
  const f = fixture();
  const resource = coin(COIN_A);
  const { pay, token } = await buyX402(f, resource);

  const replay = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.clone().json(), { coin: COIN_A, release: R1 });
  assert.equal(replay.headers.get("Lambo-Capability"), null, "the capability is shown once only");
  assert.ok(replay.headers.get("PAYMENT-RESPONSE"));
  assertPaidCache(replay);
  assert.equal(f.facilitator.settleCalls, 1);
  assert.equal(f.facilitator.verifyCalls, 1);
  const purchase = onlyPurchase(f.store);
  assert.equal(must(f.store.getEntitlementForPurchase(purchase.id), "entitlement").downloads, 2);
  assert.equal(purchase.replayServes, 1);

  f.clock.t += 601_000;
  const late = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(late.status, 409);
  assert.equal((await body(late)).error, "use_capability");
  assert.equal(f.facilitator.settleCalls, 1);

  const viaCapability = await handlePaidRequest(get(resource, { Authorization: `Bearer ${token}` }), resource, f.deps);
  assert.equal(viaCapability.status, 200);
});

// ---------------------------------------------------------------------------------------------------------------
// 4. Concurrency

test("concurrent duplicates of one payload settle exactly once and create one purchase", async () => {
  const f = fixture();
  const resource = coin(COIN_A);
  const settle = f.facilitator.settleImpl;
  f.facilitator.settleImpl = async (payload, requirements) => {
    await sleep(40);
    return settle(payload, requirements);
  };
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  const pay = x402Pay(offer);
  const responses = await Promise.all([1, 2, 3].map(() => handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps)));
  const statuses = responses.map((r) => r.status).sort();
  assert.equal(f.facilitator.settleCalls, 1);
  assert.equal(f.facilitator.verifyCalls, 1);
  assert.equal(count(f.store, "purchases"), 1);
  assert.equal(count(f.store, "entitlements"), 1);
  assert.equal(statuses.filter((s) => s === 200).length >= 1, true);
  for (const r of responses) {
    if (r.status === 409) {
      const json = await body(r);
      assert.equal(json.status, "in_progress");
      assert.equal(r.headers.get("Retry-After"), "2");
    } else {
      assert.equal(r.status, 200);
    }
  }
  assert.equal(responses.filter((r) => r.headers.get("Lambo-Capability")).length, 1, "one capability for one payment");
});

// ---------------------------------------------------------------------------------------------------------------
// 5. Cross-resource reuse

test("a payment bound to one resource's offer is refused for another resource before any facilitator call", async () => {
  const f = fixture();
  const a = coin(COIN_A);
  const b = coin(COIN_B);
  const offerA = await handlePaidRequest(get(a), a, f.deps);
  const pay = x402Pay(offerA);

  const cross = await handlePaidRequest(get(b, { "PAYMENT-SIGNATURE": pay.header }), b, f.deps);
  assert.equal(cross.status, 409);
  assert.equal((await body(cross)).error, "offer_resource_mismatch");
  assert.equal(f.facilitator.verifyCalls, 0);
  assert.equal(f.facilitator.settleCalls, 0);
  assert.equal(count(f.store, "purchases"), 0);

  // Tampering with the accepted amount no longer matches the offer's requirements.
  const cheap = x402Pay(offerA, {
    mutate: (p) => {
      p.accepted = { ...p.accepted, amount: "1" };
      (p.payload as { authorization: { value: string } }).authorization.value = "1";
    },
  });
  const tampered = await handlePaidRequest(get(a, { "PAYMENT-SIGNATURE": cheap.header }), a, f.deps);
  assert.equal(tampered.status, 402);
  assert.equal((await body(tampered)).error, "requirements_mismatch");

  // An authorization that pays someone else is refused locally too.
  const elsewhere = x402Pay(offerA, { mutate: (p) => ((p.payload as { authorization: { to: string } }).authorization.to = PAYER) });
  const redirected = await handlePaidRequest(get(a, { "PAYMENT-SIGNATURE": elsewhere.header }), a, f.deps);
  assert.equal(redirected.status, 402);
  assert.equal((await body(redirected)).error, "authorization_mismatch");
  assert.equal(f.facilitator.verifyCalls, 0);
  assert.equal(count(f.store, "purchases"), 0);

  // The genuine payment still works for the resource it was made for.
  const ok = await handlePaidRequest(get(a, { "PAYMENT-SIGNATURE": pay.header }), a, f.deps);
  assert.equal(ok.status, 200);
  // ...and once used, the same authorization cannot be redirected to another offer.
  const offerB = await handlePaidRequest(get(b), b, f.deps);
  const offerBId = ((await body(offerB)).offer as { id: string }).id;
  const reused = x402Pay(offerB, { nonce: pay.nonce });
  const second = await handlePaidRequest(get(b, { "PAYMENT-SIGNATURE": reused.header }), b, f.deps);
  assert.equal(second.status, 409);
  assert.equal((await body(second)).error, "payment_already_used");
  assert.equal(f.facilitator.settleCalls, 1);
  assert.ok(offerBId);
});

// ---------------------------------------------------------------------------------------------------------------
// 6. Release pinning

test("release pinning: an offer made when latest = R1 is fulfilled for R1 after latest moves to R2", async () => {
  const f = fixture();
  const releases = { latest: R1 };
  // The route handler contract: pin from the credential first, else resolve "latest".
  const route = (request: Request) => {
    const pinned = resolvePinnedRelease(request, f.store);
    return handlePaidRequest(request, coin(COIN_A, pinned?.releaseId ?? releases.latest), f.deps);
  };
  const url = coin(COIN_A).canonicalUrl;

  const offer = await route(new Request(url));
  assert.equal(((await body(offer.clone())).offer as { resource: { releaseId: string } }).resource.releaseId, R1);
  const pay = x402Pay(offer);
  releases.latest = R2;

  // A route that forgot to pin would ask for R2: refused, nothing settled, R2 is not silently sold.
  const naive = await handlePaidRequest(new Request(url, { headers: { "PAYMENT-SIGNATURE": pay.header } }), coin(COIN_A, R2), f.deps);
  assert.equal(naive.status, 409);
  const naiveBody = await body(naive);
  assert.equal(naiveBody.error, "release_mismatch");
  assert.equal(naiveBody.pinnedRelease, R1);
  assert.equal(f.facilitator.settleCalls, 0);

  const pinned = resolvePinnedRelease(new Request(url, { headers: { "PAYMENT-SIGNATURE": pay.header } }), f.store);
  assert.deepEqual(pinned && { releaseId: pinned.releaseId, via: pinned.via }, { releaseId: R1, via: "x402" });
  const paid = await route(new Request(url, { headers: { "PAYMENT-SIGNATURE": pay.header } }));
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.clone().json(), { coin: COIN_A, release: R1 });
  assert.equal(paid.headers.get("Lambo-Release"), R1);
  assert.equal(f.facilitator.settleCalls, 1);

  // The capability is pinned to R1 as well, and a fresh buyer is offered R2.
  const token = must(paid.headers.get("Lambo-Capability"), "capability");
  const again = await route(new Request(url, { headers: { Authorization: `Bearer ${token}` } }));
  assert.equal(again.status, 200);
  assert.deepEqual(await again.json(), { coin: COIN_A, release: R1 });
  const fresh = await body(await route(new Request(url)));
  assert.equal((fresh.offer as { resource: { releaseId: string } }).resource.releaseId, R2);

  // MPP credentials pin the same way.
  const mppOffer = await route(new Request(url));
  const credential = mppCredential(mppOffer);
  const mppPinned = resolvePinnedRelease(new Request(url, { headers: { Authorization: credential.header } }), f.store);
  assert.equal(mppPinned?.releaseId, R2);
  assert.equal(mppPinned?.via, "mpp");
});

// ---------------------------------------------------------------------------------------------------------------
// 7. Settlement uncertainty

test("a settlement timeout leaves the purchase uncertain (202); the same payload never settles twice", async () => {
  const f = fixture();
  const resource = coin(COIN_A);
  f.facilitator.settleImpl = async () => {
    throw new FacilitatorTimeoutError("settle", 1_000);
  };
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  const pay = x402Pay(offer);
  const first = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(first.status, 202);
  const json = await body(first);
  assert.equal(json.status, "uncertain");
  assert.match(json.safety as string, /nonce can be used on chain at most once/);
  const purchase = onlyPurchase(f.store);
  assert.equal(purchase.status, "uncertain");
  assert.equal(count(f.store, "entitlements"), 0);
  assert.deepEqual(
    f.store.listNeedingReconciliation().map((p) => p.id),
    [purchase.id],
  );

  const retry = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(retry.status, 409);
  assert.equal((await body(retry)).error, "settlement_uncertain");
  assert.equal(f.facilitator.settleCalls, 1);

  // An operator confirms the transfer on chain; the buyer's identical retry claims access, still one settlement.
  const chainTx = `0x${"c0".repeat(32)}`;
  assert.equal(f.store.resolveUncertain(purchase.id, { outcome: "settled", settlementRef: chainTx }, f.clock.t), true);
  const claimed = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(claimed.status, 200);
  assert.match(must(claimed.headers.get("Lambo-Capability"), "capability"), /^lambo_cap_/);
  assert.equal(decodePaymentResponseHeader(must(claimed.headers.get("PAYMENT-RESPONSE"), "receipt")).transaction, chainTx);
  assert.equal(f.facilitator.settleCalls, 1);
  assert.equal(f.store.listNeedingReconciliation().length, 0);

  // A 5xx from the facilitator is also indeterminate; a definitive refusal is a plain failure.
  const g = fixture();
  g.facilitator.settleImpl = async (_payload, requirements) => ({ success: false, errorReason: "insufficient_funds", transaction: "", network: requirements.network });
  const gOffer = await handlePaidRequest(get(resource), resource, g.deps);
  const gPay = x402Pay(gOffer);
  const refused = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": gPay.header }), resource, g.deps);
  assert.equal(refused.status, 402);
  assert.equal((await body(refused)).error, "settlement_failed");
  assert.equal(onlyPurchase(g.store).status, "failed");
  const refusedAgain = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": gPay.header }), resource, g.deps);
  assert.equal(refusedAgain.status, 402);
  assert.equal((await body(refusedAgain)).error, "payment_failed");
  assert.equal(g.facilitator.settleCalls, 1);
});

// ---------------------------------------------------------------------------------------------------------------
// 8. Facilitator rejects

test("a payment the facilitator calls invalid gets 402 and no entitlement, and is never settled", async () => {
  const f = fixture();
  const resource = coin(COIN_A);
  f.facilitator.verifyImpl = async () => ({ isValid: false, invalidReason: "invalid_exact_evm_payload_signature" });
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  const pay = x402Pay(offer);
  const rejected = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(rejected.status, 402);
  assert.ok(rejected.headers.get("PAYMENT-REQUIRED"), "a fresh challenge comes back");
  const json = await body(rejected);
  assert.equal(json.error, "payment_invalid");
  assert.deepEqual(json.detail, { reason: "invalid_exact_evm_payload_signature" });
  assert.equal(f.facilitator.settleCalls, 0);
  assert.equal(count(f.store, "entitlements"), 0);
  assert.equal(onlyPurchase(f.store).status, "failed");
  const again = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(again.status, 402);
  assert.equal(f.facilitator.verifyCalls, 1, "a failed payment identity is not re-verified");

  // Valid signature but for a different payer than the authorization claims.
  const g = fixture();
  g.facilitator.verifyImpl = async () => ({ isValid: true, payer: "0x9999999999999999999999999999999999999999" });
  const gPay = x402Pay(await handlePaidRequest(get(resource), resource, g.deps));
  const mismatch = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": gPay.header }), resource, g.deps);
  assert.equal(mismatch.status, 402);
  assert.deepEqual((await body(mismatch)).detail, { reason: "payer_mismatch" });
  assert.equal(g.facilitator.settleCalls, 0);

  // The facilitator is unreachable during verify: 502, nothing settled.
  const h = fixture();
  h.facilitator.verifyImpl = async () => {
    throw new Error("connect ECONNREFUSED");
  };
  const hPay = x402Pay(await handlePaidRequest(get(resource), resource, h.deps));
  const unreachable = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": hPay.header }), resource, h.deps);
  assert.equal(unreachable.status, 502);
  assert.equal(h.facilitator.settleCalls, 0);
  assert.equal(count(h.store, "entitlements"), 0);
});

// ---------------------------------------------------------------------------------------------------------------
// 9. Capabilities

test("a capability unlocks only its resource and release, and stops at expiry, revocation and downloadsMax", async () => {
  const f = fixture({ access: { downloadsMax: 3 } });
  const a = coin(COIN_A);
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const { token } = await buyX402(f, a); // download 1

  const ok = await handlePaidRequest(get(a, bearer(token)), a, f.deps); // 2
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.clone().json(), { coin: COIN_A, release: R1 });
  assertPaidCache(ok);
  assert.equal(ok.headers.get("Lambo-Capability"), null);
  assert.equal(ok.headers.get("Lambo-Downloads-Remaining"), "1");

  const otherCoin = await handlePaidRequest(get(coin(COIN_B), bearer(token)), coin(COIN_B), f.deps);
  assert.equal(otherCoin.status, 403);
  assert.equal((await body(otherCoin)).error, "capability_resource_mismatch");
  const otherRelease = await handlePaidRequest(get(coin(COIN_A, R2), bearer(token)), coin(COIN_A, R2), f.deps);
  assert.equal(otherRelease.status, 403);
  const entitlement = must(f.store.findEntitlementByToken(token), "entitlement");
  assert.equal(entitlement.downloads, 2, "refused redemptions do not consume downloads");

  assert.equal((await handlePaidRequest(get(a, bearer(token)), a, f.deps)).status, 200); // 3
  const exhausted = await handlePaidRequest(get(a, bearer(token)), a, f.deps);
  assert.equal(exhausted.status, 403);
  assert.equal((await body(exhausted)).error, "downloads_exhausted");

  const unknown = await handlePaidRequest(get(a, bearer(`lambo_cap_${"x".repeat(43)}`)), a, f.deps);
  assert.equal(unknown.status, 401);
  assert.equal((await body(unknown)).error, "invalid_capability");
  assert.match(must(unknown.headers.get("WWW-Authenticate"), "WWW-Authenticate"), /^Bearer /);

  const revocable = await buyX402(f, a);
  const revokedEntitlement = must(f.store.findEntitlementByToken(revocable.token), "entitlement");
  assert.equal(f.store.revokeEntitlement(revokedEntitlement.id, "chargeback review", f.clock.t), true);
  const revoked = await handlePaidRequest(get(a, bearer(revocable.token)), a, f.deps);
  assert.equal(revoked.status, 401);
  assert.equal((await body(revoked)).error, "capability_revoked");

  const expiring = await buyX402(f, a);
  assert.equal((await handlePaidRequest(get(a, bearer(expiring.token)), a, f.deps)).status, 200);
  f.clock.t += 30 * DAY_MS + 1_000;
  const expired = await handlePaidRequest(get(a, bearer(expiring.token)), a, f.deps);
  assert.equal(expired.status, 401);
  assert.equal((await body(expired)).error, "capability_expired");

  const events = f.store.listEvents().filter((e) => e.event === "capability.rejected").map((e) => e.detail?.reason);
  assert.deepEqual(events, ["mismatch", "mismatch", "exhausted", "invalid", "revoked", "expired"]);
});

test("a delivery failure after settlement still hands over the capability, and the download is not counted", async () => {
  const f = fixture();
  let broken = true;
  const resource: PaidResource = {
    ...coin(COIN_A),
    render: () => {
      if (broken) throw new Error("bundle file unreadable");
      return { coin: COIN_A, release: R1 };
    },
  };
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  const pay = x402Pay(offer);
  const failed = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": pay.header }), resource, f.deps);
  assert.equal(failed.status, 500);
  assertPaidCache(failed);
  const json = await body(failed);
  assert.equal(json.error, "delivery_failed_after_payment");
  const token = must(failed.headers.get("Lambo-Capability"), "capability");
  assert.equal(json.capability, token);
  assert.ok(failed.headers.get("PAYMENT-RESPONSE"), "the settlement receipt is still returned");
  assert.equal(f.facilitator.settleCalls, 1);
  assert.equal(must(f.store.findEntitlementByToken(token), "entitlement").downloads, 0);

  broken = false;
  const recovered = await handlePaidRequest(get(resource, { Authorization: `Bearer ${token}` }), resource, f.deps);
  assert.equal(recovered.status, 200);
  assert.deepEqual(await recovered.json(), { coin: COIN_A, release: R1 });
  assert.equal(f.facilitator.settleCalls, 1);
});

// ---------------------------------------------------------------------------------------------------------------
// 10. Client-supplied hashes and receipts

test("client-supplied transaction hashes, receipts and forged credentials never grant access", async () => {
  const f = fixture();
  const renders = { count: 0 };
  const resource = coin(COIN_A, R1, renders);
  const offer = await handlePaidRequest(get(resource), resource, f.deps);
  const fakeTx = `0x${"fa".repeat(32)}`;
  const forgedReceipt = encodePaymentResponseHeader({ success: true, transaction: fakeTx, network: NETWORK, payer: PAYER });
  const forgedMppReceipt = Receipt.serialize(Receipt.from({ method: "test", reference: fakeTx, status: "success", timestamp: new Date().toISOString() }));
  const attempts: Record<string, string>[] = [
    { "X-Transaction-Hash": fakeTx },
    { "X-PAYMENT": fakeTx },
    { "PAYMENT-RESPONSE": forgedReceipt },
    { "Payment-Receipt": forgedMppReceipt },
    { Authorization: `Bearer ${fakeTx}` },
    { Origin: BASE, Referer: `${BASE}/coins` },
  ];
  for (const headers of attempts) {
    const response = await handlePaidRequest(get(resource, headers), resource, f.deps);
    assert.equal(response.status, 402, JSON.stringify(headers));
  }

  // A PAYMENT-SIGNATURE carrying only a transaction hash is not an EIP-3009 payment.
  const required = decodePaymentRequiredHeader(must(offer.headers.get("PAYMENT-REQUIRED"), "PAYMENT-REQUIRED"));
  const hashOnly = encodePaymentSignatureHeader({
    x402Version: 2,
    resource: required.resource,
    accepted: must(required.accepts[0], "accepts[0]"),
    payload: { transaction: fakeTx },
  });
  const hashPayment = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": hashOnly }), resource, f.deps);
  assert.equal(hashPayment.status, 402);
  assert.equal((await body(hashPayment)).error, "unsupported_payload_not_eip3009");
  const garbage = await handlePaidRequest(get(resource, { "PAYMENT-SIGNATURE": "not base64 at all!" }), resource, f.deps);
  assert.equal(garbage.status, 402);
  assert.equal((await body(garbage)).error, "malformed_payment_signature");

  // An MPP credential whose challenge id was not issued here (HMAC mismatch) is refused before mppx runs.
  const { challenge } = mppCredential(offer);
  const forged = Credential.serialize({ challenge: { ...challenge, id: `${challenge.id.slice(0, -2)}AA` }, payload: { token: "good" } });
  const forgedResponse = await handlePaidRequest(get(resource, { Authorization: forged }), resource, f.deps);
  assert.equal(forgedResponse.status, 402);
  assert.equal((await body(forgedResponse)).error, "invalid_mpp_credential");

  assert.equal(renders.count, 0);
  assert.equal(count(f.store, "purchases"), 0);
  assert.equal(count(f.store, "entitlements"), 0);
  assert.equal(f.facilitator.verifyCalls + f.facilitator.settleCalls, 0);
  assert.equal(f.mpp.verifies, 0);
});

test("the production Tempo method (pull only) refuses a client-supplied transaction hash, offline", async () => {
  const store = CommerceStore.open(":memory:");
  const mpp = new MppAdapter({ secretKey: SECRET, realm: REALM, recipient: MPP_RECIPIENT, testnet: true, store: createSqliteMppStore(store.db) });
  const deps: PaymentDeps = { store, pricing: testPricing(), adapters: { mpp }, now: Date.now };
  const resource = coin(COIN_A);
  const offer = await handlePaidRequest(get(resource), resource, deps);
  assert.equal(offer.status, 402);
  const challenges = Challenge.fromResponseList(offer);
  assert.ok(challenges.length >= 1);
  const challenge = must(challenges[0], "challenge");
  assert.equal(challenge.method, "tempo");
  assert.equal(challenge.request.amount, "20000");
  assert.deepEqual((challenge.request.methodDetails as { supportedModes: string[] }).supportedModes, ["pull"]);

  const pushed = Credential.serialize({ challenge, payload: { type: "hash", hash: `0x${"11".repeat(32)}` } });
  const refused = await handlePaidRequest(get(resource, { Authorization: pushed }), resource, deps);
  assert.equal(refused.status, 402);
  const json = await body(refused);
  assert.equal(json.error, "payment_rejected");
  assert.match(JSON.stringify(json.detail), /Hash credentials are not supported/);
  assert.equal(count(store, "entitlements"), 0);
  assert.equal(onlyPurchase(store).status, "failed");
  assert.equal(networkAttempts, 0, "challenge issuance and the pull-only refusal need no RPC");
  store.close();
});

// ---------------------------------------------------------------------------------------------------------------
// 11. MPP

test("MPP: a credential pays exactly its offer once; identical replays re-serve without charging", async () => {
  const f = fixture({ x402: false });
  const a = coin(COIN_A);
  const offer = await handlePaidRequest(get(a), a, f.deps);
  assert.equal(offer.status, 402);
  const offerId = ((await body(offer.clone())).offer as { id: string }).id;
  const credential = mppCredential(offer);

  const paid = await handlePaidRequest(get(a, { Authorization: credential.header }), a, f.deps);
  assert.equal(paid.status, 200, await paid.clone().text());
  assert.deepEqual(await paid.clone().json(), { coin: COIN_A, release: R1 });
  assertPaidCache(paid);
  assert.match(must(paid.headers.get("Lambo-Capability"), "capability"), /^lambo_cap_/);
  const receipt = Receipt.fromResponse(paid);
  assert.equal(receipt.method, "test");
  assert.equal(f.mpp.verifies, 1);
  const purchase = onlyPurchase(f.store);
  assert.equal(purchase.paymentKey, `mpp:test:${credential.challenge.id}`);
  assert.equal(purchase.offerId, offerId);
  assert.equal(purchase.settlementRef, receipt.reference);
  assert.equal(purchase.status, "fulfilled");

  const replay = await handlePaidRequest(get(a, { Authorization: credential.header }), a, f.deps);
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get("Lambo-Capability"), null);
  assert.equal(Receipt.fromResponse(replay).reference, receipt.reference);
  assert.equal(f.mpp.verifies, 1, "a replay is served from the purchase, mppx is not asked to charge again");
  assert.equal(must(f.store.getEntitlementForPurchase(purchase.id), "entitlement").downloads, 2);

  // The same credential presented for another coin: refused before mppx.
  const cross = await handlePaidRequest(get(coin(COIN_B), { Authorization: credential.header }), coin(COIN_B), f.deps);
  assert.equal(cross.status, 409);
  assert.equal((await body(cross)).error, "offer_resource_mismatch");
  assert.equal(f.mpp.verifies, 1);

  // A rejected credential fails the purchase; the identical credential may retry (a signed transaction is
  // single-use on chain), and it is checked again rather than served.
  const bad = mppCredential(await handlePaidRequest(get(coin(COIN_B)), coin(COIN_B), f.deps), "bad");
  const rejected = await handlePaidRequest(get(coin(COIN_B), { Authorization: bad.header }), coin(COIN_B), f.deps);
  assert.equal(rejected.status, 402);
  assert.equal((await body(rejected)).error, "payment_rejected");
  assert.equal(must(f.store.getPurchaseByKey(`mpp:test:${bad.challenge.id}`), "purchase").status, "failed");
  const retried = await handlePaidRequest(get(coin(COIN_B), { Authorization: bad.header }), coin(COIN_B), f.deps);
  assert.equal(retried.status, 402);
  assert.equal(f.mpp.verifies, 3);
  assert.equal(must(f.store.getPurchaseByKey(`mpp:test:${bad.challenge.id}`), "purchase").settleAttempts, 2);

  // An expired offer is refused before mppx runs.
  const stale = mppCredential(await handlePaidRequest(get(coin(COIN_B)), coin(COIN_B), f.deps));
  f.clock.t += 601_000;
  const expired = await handlePaidRequest(get(coin(COIN_B), { Authorization: stale.header }), coin(COIN_B), f.deps);
  assert.equal(expired.status, 402);
  assert.equal((await body(expired)).error, "offer_expired");
  assert.equal(f.mpp.verifies, 3);
});

test("MPP replay protection is durable across store instances that share one database file", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "lambo-commerce-"));
  const file = path.join(dir, "commerce.sqlite");
  try {
    const storeA = CommerceStore.open(file);
    const storeB = CommerceStore.open(file);
    const replayA = createSqliteMppStore(storeA.db);
    const replayB = createSqliteMppStore(storeB.db);

    assert.equal(await Store.tryClaim(replayA, "mppx:charge:0xabc", Date.now() + 60_000), true);
    assert.equal(await Store.tryClaim(replayB, "mppx:charge:0xabc", Date.now() + 60_000), false, "a claim on A is visible to B");
    assert.equal(await Store.tryClaim(replayA, "mppx:charge:0xold", Date.now() - 1), true);
    assert.equal(await Store.tryClaim(replayB, "mppx:charge:0xold", Date.now() + 60_000), true, "an expired marker can be reclaimed");
    assert.equal(await replayA.update("budget", () => ({ op: "set", value: { reserved: BigInt(5) }, result: "ok" })), "ok");
    assert.deepEqual(await replayB.get("budget"), { reserved: BigInt(5) });
    await replayB.delete("budget");
    assert.equal(await replayA.get("budget"), null);

    // Two "instances" (own Mppx, own method, own CommerceStore) over the same file.
    const fA = fixture({ x402: false, store: storeA });
    const fB = fixture({ x402: false, store: storeB });
    const a = coin(COIN_A);
    const offer = await handlePaidRequest(get(a), a, fA.deps);
    const credential = mppCredential(offer);
    assert.equal((await handlePaidRequest(get(a, { Authorization: credential.header }), a, fA.deps)).status, 200);
    assert.equal(fA.mpp.verifies, 1);

    // Instance B sees the purchase and never charges.
    const onB = await handlePaidRequest(get(a, { Authorization: credential.header }), a, fB.deps);
    assert.equal(onB.status, 200);
    assert.equal(onB.headers.get("Lambo-Capability"), null);
    assert.equal(fB.mpp.verifies, 0);
    // Even bypassing the purchases table, B's mppx refuses the credential through the shared replay store.
    assert.ok(await replayB.get(`test:charge:${credential.challenge.id}`));
    const offerRecord = must(storeB.getOffer(must(credential.challenge.opaque && (PaymentRequest.deserialize(credential.challenge.opaque) as Record<string, string>).lambo_offer, "offer id")), "offer");
    const direct = await must(fB.deps.adapters.mpp, "mpp").chargeFor(get(a, { Authorization: credential.header }), offerRecord, a.description, credential.challenge.id);
    assert.equal(direct.kind, "rejected");
    assert.match(direct.kind === "rejected" ? direct.reason : "", /already used/);
    assert.equal(count(storeB, "purchases"), 1);

    assert.equal(pruneMppStore(storeA.db, Date.now() + 3_600_000) >= 1, true);
    storeA.close();
    storeB.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 12. Caching, audit, and the offline guarantee

test("paid responses are private, no-store; 402, 409 and 503 are no-store", async () => {
  const f = fixture();
  const a = coin(COIN_A);
  const { paid, pay, token } = await buyX402(f, a);
  assertPaidCache(paid);
  assertPaidCache(await handlePaidRequest(get(a, { "PAYMENT-SIGNATURE": pay.header }), a, f.deps));
  assertPaidCache(await handlePaidRequest(get(a, { Authorization: `Bearer ${token}` }), a, f.deps));
  const mppPaid = await handlePaidRequest(get(a, { Authorization: mppCredential(await handlePaidRequest(get(a), a, f.deps)).header }), a, f.deps);
  assert.equal(mppPaid.status, 200);
  assertPaidCache(mppPaid);
  assert.equal((await handlePaidRequest(get(a), a, f.deps)).headers.get("Cache-Control"), "no-store");
  const conflict = await handlePaidRequest(get(coin(COIN_B), { "PAYMENT-SIGNATURE": pay.header }), coin(COIN_B), f.deps);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.headers.get("Cache-Control"), "no-store");
  const none = fixture({ x402: false, mpp: false });
  assert.equal((await handlePaidRequest(get(a), a, none.deps)).headers.get("Cache-Control"), "no-store");
});

test("payment_events is append-only and never stores tokens, signatures or credentials", async () => {
  const f = fixture();
  const a = coin(COIN_A);
  const { pay, token } = await buyX402(f, a);
  const credential = mppCredential(await handlePaidRequest(get(a), a, f.deps));
  await handlePaidRequest(get(a, { Authorization: credential.header }), a, f.deps);
  await handlePaidRequest(get(coin(COIN_B), { "PAYMENT-SIGNATURE": pay.header }), coin(COIN_B), f.deps);

  const rows = JSON.stringify(f.store.db.prepare("SELECT * FROM payment_events").all());
  assert.ok(rows.length > 0);
  for (const secret of [token, pay.header, (pay.payload.payload as { signature: string }).signature, credential.header]) {
    assert.ok(!rows.includes(secret));
  }
  assert.throws(() => f.store.db.prepare("UPDATE payment_events SET event = 'x'").run(), /append-only/);
  assert.throws(() => f.store.db.prepare("DELETE FROM payment_events").run(), /append-only/);
});

test("no test touched the network", () => {
  assert.equal(networkAttempts, 0);
});
