# Payments runbook: x402 and MPP for precomputed research

Status (2026-10-19): implemented and unit-tested offline only. **No live payment has been made**, against
any facilitator, chain or wallet. Prices in `docs/data/pricing.json` are test prices (`status: "test"`,
`approved: false`). They wait on a cost benchmark and owner approval.

Code: `src/lib/lambo/payments/` (`fulfillment.ts`, `store.ts`, `schema.ts`, `pricing.ts`, `x402.ts`,
`mpp.ts`, `index.ts`). Tests: `tests/lambo/payments.test.ts`.

## 1. Architecture

There are no reader accounts. Every purchase buys one precomputed resource, for one release, at a fixed price.

```
GET resource ──(no credential)──> Offer ──402──> client pays ──> Purchase ──settled──> Entitlement ──> capability token
                                  (quote)        (x402 | MPP)     (single-use          (access record)   (lambo_cap_..., shown once)
                                                                   payment_key)
```

- **Offer** (`offers`): a quote bound to resource kind, canonical params (sorted JSON, sha256 = `params_key`),
  a pinned concrete release id, amount (decimal USD), currency, the exact protocol terms (x402 network, payTo,
  asset and atomic amount; MPP method, realm and recipient), and an expiry (`offerTtlSeconds`, 600). A live offer
  with the same binding is reused while at least half its lifetime remains.
- **Purchase** (`purchases`): one row per protocol-level payment identity. `payment_key` is UNIQUE:
  - x402: `x402:<network>:<payer lowercased>:<EIP-3009 nonce>`
  - MPP: `mpp:<method>:<challenge id>` (the challenge id is an HMAC over the challenge, unique per issuance)
  The row is claimed inside `BEGIN IMMEDIATE` before any facilitator or mppx call. A second request with the
  same payment therefore sees the existing purchase and never settles again. States: `verifying → settling →
  fulfilled` (settled and entitled in one transaction), or `failed`, or `uncertain` (needs reconciliation).
- **Entitlement** (`entitlements`): created only after a successful settlement, atomically with marking the
  purchase fulfilled. It is bound to kind, params key and release. Only `sha256(token)` is stored.
- **Capability** (`lambo_cap_` + 32 random bytes, base64url): returned once, in `Lambo-Capability`. Sending it
  as `Authorization: Bearer <token>` redeems one download.
- **Audit** (`payment_events`): an append-only row for every branch, including rejections. Triggers refuse
  UPDATE and DELETE. Rows never contain capability tokens, signatures, credentials or full headers.
- **MPP replay store** (`mpp_store`): mppx's `Store` interface (`get/put/delete/update/tryClaim`)
  implemented on the same SQLite file. Replay claims survive restarts and are shared by every process that
  opens the file.

The commerce database is separate from the observation store: `data/commerce.sqlite`, override
`LAMBO_COMMERCE_DB_PATH`. It is gitignored and never rebuilt, so back it up as financial records.

## 2. Route handler contract

Route handlers are Next.js 16 route handlers (Web `Request` → `Response`, Node.js runtime because of
`node:sqlite`; `params` is a promise). The payments layer itself imports nothing from Next.

```ts
import { getPaymentRuntime, handlePaidRequest, resolvePinnedRelease } from "@/lib/lambo/payments/index.ts";

export async function GET(request: Request, { params }: { params: Promise<{ chain: string; address: string }> }) {
  const { chain, address } = await params;
  // 1. Validate and normalize the inputs; 400/404 here, before any offer exists.
  const coin = normalizeCoin(chain, address);            // throws -> 400
  const payments = getPaymentRuntime();

  // 2. Pin the release. A credential (x402, MPP or capability) is bound to the release it was quoted for.
  //    Serve THAT release. Resolve "latest" only when there is no credential.
  const pinned = resolvePinnedRelease(request, payments.store);
  const releaseId = pinned?.releaseId ?? resolveRelease(new URL(request.url).searchParams.get("release") ?? "latest");
  if (!bundleExists(releaseId, coin)) return Response.json({ error: "not_found" }, { status: pinned ? 410 : 404 });

  // 3. Hand over. render() runs only after access is established.
  return handlePaidRequest(request, {
    kind: "coin-bundle",
    params: { chain: coin.chain, address: coin.address },   // already normalized; sorted and hashed here
    releaseId,                                              // concrete id, never "latest"
    canonicalUrl: `${PUBLIC_BASE_URL}/api/v1/coins/${coin.chain}/${coin.address}`, // from config, never Host/Origin
    description: `Lamble research bundle for ${coin.symbol}`,
    render: () => loadCoinBundle(releaseId, coin),
  }, payments);
}
```

Rules:

- Validate first. `handlePaidRequest` assumes the resource exists. It never offers something the route cannot
  serve.
- Pin the release. If the route ignored `resolvePinnedRelease` and passed the new latest release R2 with a
  payment quoted for R1, `handlePaidRequest` answers `409 release_mismatch` (with `pinnedRelease`) and settles
  nothing. R2 is never sold silently. If the pinned release has been pruned, answer 410 before payment. No x402
  authorization is settled and no MPP transaction is broadcast.
- Build `canonicalUrl` from configuration, never from `Host`, `Origin` or `Referer`. Access never depends on
  those headers.
- `kind` must be one of `coin-bundle`, `coin-history`, `narrative-bundle`, `week-dataset`,
  `research-article`, `launchpads-dataset`. An unpriced kind returns 500 `unpriced_resource`.
- Browser clients on CORS routes need `Access-Control-Expose-Headers: ${PAYMENT_EXPOSED_HEADERS.join(", ")}`.
- `getPaymentRuntime()` is a per-process singleton built from `process.env`. Pass options on the first call
  (for example `{ x402: { createAuthHeaders } }`). `runtime.status()` (sync) and `runtime.check()` (contacts the
  facilitator once) back a health endpoint. They contain no secrets.

## 3. Wire protocol and headers

| Direction | Header | Meaning |
|---|---|---|
| 402 | `PAYMENT-REQUIRED` | x402 v2 challenge, base64 JSON from `createPaymentRequiredResponse`. `resource.url` = canonical URL plus `lambo_offer`, `lambo_release`, and a random per-challenge `lambo_n`. |
| 402 | `WWW-Authenticate: Payment ...` | MPP challenge(s) from `mppx.charge(...)`. `opaque` carries `lambo_offer` and the scope `lambo:<kind>:<paramsKey>:<release>`. `expires` is the offer expiry. |
| 402 | `Cache-Control: no-store` | All 402/409/503 and error responses. |
| request | `PAYMENT-SIGNATURE` | x402 payment payload (EIP-3009 `exact` only). |
| request | `Authorization: Payment <credential>` | MPP credential (Tempo pull mode: signed transaction). |
| request | `Authorization: Bearer lambo_cap_...` | Capability redemption. |
| 200 | `PAYMENT-RESPONSE` | x402 settlement receipt (the facilitator's `SettleResponse`). |
| 200 | `Payment-Receipt` | MPP receipt (`reference` = transaction hash from mppx). |
| 200 | `Lambo-Capability` | Plaintext capability, on the purchase response only (and in the 500 delivery-failure body). |
| 200 | `Lambo-Entitlement-Expires`, `Lambo-Downloads-Remaining`, `Lambo-Release`, `Lambo-Purchase` | Access facts. |
| 200/500 | `Cache-Control: private, no-store` | Every paid body. Never cache it in a shared cache. |

The 402 JSON body describes the offer: `offer.id`, `resource` (kind, params, paramsKey, releaseId, url),
`price`, `expiresAt`, `accepts` (one entry per protocol with its terms), `access`, `recovery`, `refundPolicy`,
and `pricing` (status, approved, note).

How each protocol binds the offer:

- **x402**: the client copies `resource` and the chosen `accepts[i]` verbatim into its payload. On retry, Lambo
  reads the offer id from `payload.resource.url`. It checks resource, params and release against the request,
  then rebuilds the requirements from the offer's own amount. `findMatchingRequirements` must deep-equal
  `accepted` against them (scheme, network, asset, amount, payTo, maxTimeoutSeconds). `authorization.to` and
  `authorization.value` must equal payTo and amount. The EIP-3009 signature does not cover `resource`, so a
  client could relabel a payment. It still pays the quoted amount for what it relabels to, and the nonce stays
  single-use.
- **MPP**: `scope`, `meta`, `amount` and `expires` are derived from the offer and passed identically on issue
  and on retry. mppx HMAC-binds them into the challenge id and re-checks scope/meta on the paid request.
  Lambo first verifies the HMAC itself (`Challenge.verify`), reads the offer id from `opaque`, and claims
  the purchase before mppx broadcasts anything.

Client-supplied transaction hashes are never trusted. x402 stores the facilitator's
`SettleResponse.transaction`. MPP runs Tempo charge with `supportedModes: ["pull"]`, which refuses hash
("push") credentials. Receipts sent by a client are ignored.

## 4. Configuration

Protocol configuration comes only from the environment. Pricing comes only from `docs/data/pricing.json`.
Misconfiguration never throws. The protocol shows as unavailable in `status()` with a reason. With no protocol
available every paid route answers `503 payments_unavailable`, never a fake challenge.

**Real-money guard:** a non-testnet x402 network (anything outside Base Sepolia, Ethereum Sepolia, Avalanche
Fuji and Polygon Amoy) or Tempo mainnet (`LAMBO_MPP_TESTNET=false`) stays unavailable until `pricing.json` has
`"status": "production"` and `"approved": true`.

### x402 on Base Sepolia (testnet, default)

```
LAMBO_X402_ENABLED=true
LAMBO_X402_NETWORK=eip155:84532            # default
LAMBO_X402_PAY_TO=0x...                    # your receiving address
LAMBO_X402_FACILITATOR_URL=https://x402.org/facilitator   # default, public testnet facilitator, no auth
```

The asset is Base Sepolia USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals). `$0.02` is `20000`.

### x402 on Base mainnet

```
LAMBO_X402_ENABLED=true
LAMBO_X402_NETWORK=eip155:8453
LAMBO_X402_PAY_TO=0x...
LAMBO_X402_FACILITATOR_URL=<authenticated mainnet facilitator, e.g. Coinbase CDP>
```

The asset is Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. The CDP facilitator needs a URL **and**
per-request auth headers. **The installed packages (`@x402/core`, `@x402/evm`, `@x402/extensions` 2.28.0)
contain no CDP auth helper and no CDP URL.** Take both from Coinbase's current CDP documentation. Supply the
signer in code on the first `getPaymentRuntime` call:

```ts
getPaymentRuntime({
  x402: {
    createAuthHeaders: async () => {
      const h = { Authorization: `Bearer ${await mintCdpJwt()}` }; // your implementation
      return { verify: h, settle: h, supported: h };               // keyed by path, not a flat object
    },
  },
});
```

Facilitator requests time out after 60 s by default. A settle that outlives that is recorded as `uncertain`
(section 7).

### MPP on Tempo testnet (Moderato, chain 42431; default)

```
LAMBO_MPP_ENABLED=true
LAMBO_MPP_RECIPIENT=0x...
LAMBO_MPP_TESTNET=true                     # default
MPP_SECRET_KEY=<openssl rand -base64 32>   # >= 32 bytes; HMAC key for challenge ids
MPP_REALM=lambo                            # optional, default "lambo"
```

### MPP on Tempo mainnet (chain 4217)

Same variables with `LAMBO_MPP_TESTNET=false`, plus approved production pricing.

mppx picks currencies itself: OUSD first, then USDC.e on mainnet or pathUSD on Moderato. Its default RPCs are
`https://rpc.tempo.xyz` and `https://rpc.moderato.tempo.xyz`. No fee sponsor is configured, so payers pay
their own transaction fees. Rotating `MPP_SECRET_KEY` invalidates outstanding challenges. Offers live 10
minutes, so rotate during a quiet period.

## 5. Access, expiry, downloads, refunds

From `pricing.json` `access`:

- `accessDurationSeconds` 2592000 (30 days) from purchase.
- `downloadsMax` 20 per entitlement. The purchase response is download 1. Refused redemptions (wrong resource
  or release) do not count. A body that fails to render is given back.
- `replayWindowSeconds` 600. `replayServesMax` 5 lost-response re-serves per purchase. These also count as
  downloads.
- `offerTtlSeconds` 600.

Refund policy (verbatim in every 402): there are no automatic refunds. Access exists only after a successful
settlement, as an entitlement for one resource and release held by a capability token. Failed delivery after
settlement is recoverable with the capability token or by operator review. Protocol receipts prove that a
payment happened. They never grant access. Manual refunds are an operator decision outside this code.

Revoke access with `store.revokeEntitlement(entitlementId, reason, Date.now())`.

## 6. Recovery after a lost response

- **Purchase response lost, client still has its payment:** retrying the *identical* `PAYMENT-SIGNATURE` or
  `Authorization: Payment` within 10 minutes of fulfilment re-serves the body. Nothing is settled again. The
  capability is not shown again, because only its hash exists. After the window, the retry gets
  `409 use_capability`. This holds even after the offer expired, because known payment identities are answered
  from their purchase before any expiry check.
- **Lost-response safety:** the window keys on the hash of the exact credential. For x402 it includes the
  random `lambo_n` from the challenge, which never goes on chain, so a third party cannot rebuild the payload
  from public calldata to get a free copy.
- **Rendering failed after settlement:** the response is `500 delivery_failed_after_payment`. It carries the
  capability in the body and in `Lambo-Capability`, plus the protocol receipt. The download is not counted.
- **Entitlement could not be recorded after settlement** (database error): the response is
  `500 fulfillment_failed_after_payment` with the purchase id and settlement reference. The purchase is left in
  `settled` if possible. The buyer's identical retry claims the entitlement and gets the capability.
- **Concurrent duplicates:** the first request claims the payment key. The others get
  `409 {status:"in_progress"}` with `Retry-After: 2`, or the re-served body once the first finishes.

## 7. Settlement uncertainty and reconciliation

A purchase becomes `uncertain` when the outcome is unknown: a `FacilitatorTimeoutError`, a 5xx or malformed
facilitator answer, `settlement_pending`, or an exception from mppx. The response is `202 {status:"uncertain"}`.
Definitive refusals (`success:false`, or a 4xx `SettleError`) are `failed`, and the buyer gets a fresh 402.

- **x402:** an identical retry while `uncertain` gets `409 settlement_uncertain` and is **never settled again**.
  The EIP-3009 nonce makes a double charge impossible on chain anyway.
- **MPP:** an identical retry while `failed` or `uncertain`, with the offer still live, reopens the purchase
  and runs mppx again. A signed Tempo transaction can be mined at most once, and mppx releases its replay claim
  on failure so that a retry recovers the receipt. After the offer expires, MPP follows the x402 rule.

Operator steps:

1. List work: `store.listNeedingReconciliation()`. This returns `uncertain` purchases and `settled` purchases
   with no entitlement. In SQL:
   `SELECT id, protocol, payment_key, payer, network, failure_reason, updated_at FROM purchases WHERE status='uncertain';`
   Context is in `SELECT * FROM payment_events WHERE purchase_id=? ORDER BY seq;`.
2. Check the chain.
   - x402: from `payment_key` take payer and nonce. On the USDC contract for that network, look for
     `AuthorizationUsed(authorizer=payer, nonce)` and the `transferWithAuthorization` transaction to `payTo`.
     If there is none, wait until the authorization's `validBefore` has passed (about 300 s after signing)
     before declaring failure. Until then the facilitator could still land it.
   - MPP: the challenge id is bound into the transfer memo. Look for the Tempo transfer to the recipient
     carrying it. `failure_reason` holds mppx's problem type.
3. Resolve:
   ```bash
   node --experimental-strip-types --no-warnings -e '
     import("./src/lib/lambo/payments/store.ts").then(({ CommerceStore }) => {
       const s = CommerceStore.open(process.env.LAMBO_COMMERCE_DB_PATH ?? "data/commerce.sqlite");
       console.log(s.resolveUncertain(process.argv[1], { outcome: "settled", settlementRef: process.argv[2] }, Date.now()));
     });' <purchaseId> <txHash>
   ```
   Use `{ outcome: "failed", reason: "..." }` when nothing landed. After `settled`, the buyer's identical
   retry claims the entitlement and receives the capability. A buyer who never retries needs a support
   channel. `createEntitlement(purchaseId, pricing.access, now)` mints a token you could hand over.

Housekeeping: `pruneMppStore(db, Date.now())` deletes expired replay markers. They cannot match again, because
challenges expire with their offers. Expired offers without purchases may be deleted. Never delete purchases,
entitlements or `payment_events`.

## 8. What is tested and what is not

Run `node --experimental-strip-types --no-warnings --test tests/lambo/payments.test.ts`. All tests are
offline. A `fetch` stub fails the suite on any network attempt, and the last test asserts zero attempts.

Unit-tested, with the real `@x402/core` server and `mppx` server code against in-process fakes:

- Offers: binding of kind, params key, release, amount, network, payTo, asset and expiry. Both challenge
  headers present. Offer reuse. 503 with no protocol, a misconfigured protocol, an unreachable facilitator, or
  mainnet with unapproved pricing.
- x402 with a fake `FacilitatorClient`: verify and settle exactly once. Entitlement and one-time capability.
  `PAYMENT-RESPONSE`. The stored settlement is the facilitator's, not a client header.
- Lost-response replay inside the window without settling; 409 after it.
- Three concurrent identical requests: one settle, one purchase, one capability.
- Cross-resource reuse, tampered amount, redirected recipient, and a nonce reused for another offer: all
  refused before the facilitator.
- Release pinning: R1 is served after latest moves to R2, and the naive R2 route gets 409. MPP and capability
  pinning too.
- Settle timeout leads to `uncertain`/202, then 409, then operator resolution, then claim. Still one settle
  call. Definitive settle failure and verify failure lead to 402 with no entitlement. A verify transport error
  gives 502.
- Capabilities: binding, other coin, other release, expiry, revocation, downloadsMax, unknown token. Delivery
  failure after settlement returns the capability and refunds the download.
- Client-supplied hashes, receipts, `X-PAYMENT`, Origin/Referer, hash-only x402 payloads, and forged MPP HMACs
  never grant access.
- MPP through real `mppx` with a deterministic in-process method (`test/charge`). This covers HMAC challenge
  issuance and verification, scope/meta pinning, the single-use payment key, replay re-serve, retry of a
  rejected credential, cross-resource refusal and offer expiry.
- The production Tempo method (pull only) issues a real challenge and refuses a hash credential, with no RPC.
- Durable replay store: claims visible across two `CommerceStore` connections to one file. A second
  "instance" (its own Mppx) re-serves from the purchase and its mppx refuses the credential through the shared
  store. Bigint round-trip. Pruning.
- Cache-Control on 200/500/402/409/503. `payment_events` is append-only and holds no secrets.

Not verified, needs a live environment:

- Any real facilitator (x402.org, CDP), real EIP-3009 signatures and USDC transfers. The fake facilitator
  accepts a dummy signature.
- Tempo pull-mode broadcast and confirmation, receipts, payer extraction (`onPaymentSuccess`), and mppx's
  confirmation-timeout behaviour on a real chain.
- Interop with real client libraries (an x402 fetch wrapper, the mppx client) and wallets.
- Concurrency across separate OS processes or hosts. It is covered by SQLite `BEGIN IMMEDIATE` and UNIQUE
  constraints, but tested only within one process (including two connections to one file). A multi-host
  deployment needs one shared database file or a port of `CommerceStore` to a shared database.
- Next.js route wiring and deployment. No route handler was written here.
- CDP auth headers and mainnet configuration.

## 9. Live acceptance test prerequisites

None of these exist yet. All are needed before a first live test on Base Sepolia and Tempo Moderato:

1. A `payTo` address for x402 (`LAMBO_X402_PAY_TO`) and a recipient for MPP (`LAMBO_MPP_RECIPIENT`), both
   controlled by the owner.
2. Facilitator access: the public `https://x402.org/facilitator` for Base Sepolia. For mainnet, CDP
   facilitator credentials and an auth-header signer (section 4).
3. `MPP_SECRET_KEY` (at least 32 random bytes) stored as a deployment secret.
4. A funded test wallet: Base Sepolia USDC and ETH for the payer, and Tempo Moderato stablecoin for the MPP
   payer, with client software for both protocols.
5. An approved purchase budget for the test (number of purchases × test price). For mainnet, also owner
   approval of production prices: `pricing.json` `"status": "production"`, `"approved": true`.
6. A deployed public HTTPS URL for the API, used as `canonicalUrl` base (`NEXT_PUBLIC_SITE_URL`), with
   persistent, writable storage for `data/commerce.sqlite` shared by every server process. A serverless
   filesystem is not enough: purchases, entitlements and replay claims would be lost or split between
   instances. Run the API as one long-running Node server with a volume, or replace the store with a shared
   database first.
7. Rights: the route layer (`src/lib/lambo/api/rights.ts`) answers 403 `export_not_permitted`, with no offer,
   for bundles whose primary content derives from capabilities without recorded redistribution rights. On
   2026-10-19 that is every coin, history, week and launchpads bundle (Codex and DefiLlama terms not reviewed);
   narrative and article bundles are sellable with market sections withheld.

Acceptance script outline: GET a narrative bundle (coin bundles stay 403 until market-data rights are
permitted) → 402 with both headers → pay with x402 → 200 with
`Lambo-Capability` and `PAYMENT-RESPONSE`. Confirm the transfer on BaseScan. Re-send the same payment → 200,
no second transfer. Redeem the capability → 200. Repeat with MPP. Then check `payment_events` and
`status()`.
