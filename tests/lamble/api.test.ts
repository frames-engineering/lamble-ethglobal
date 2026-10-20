/**
 * /api/v1 behaviour through the real route bodies (src/lib/lamble/api/routes.ts) against the published release in
 * data/. Payments use an in-process fake x402 facilitator and an in-memory commerce database; a fetch stub fails
 * the suite on any network attempt. Nothing is written to data/.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { decodePaymentRequiredHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import type { FacilitatorClient } from "@x402/core/server";
import type { PaymentPayload, SettleResponse, SupportedResponse, VerifyResponse } from "@x402/core/types";

import * as routes from "../../src/lib/lamble/api/routes.ts";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { apiExamples } from "../../src/lib/lamble/api/examples.ts";
import { articleBundle } from "../../src/lib/lamble/api/resources.ts";
import { openapi } from "../../src/lib/lamble/api/openapi.ts";
import { BUNDLE_SECTIONS, applyPlan, exportPlan } from "../../src/lib/lamble/api/rights.ts";
import { loadCatalog } from "../../src/lib/lamble/catalog/load.ts";
import { createPaymentRuntime, loadPricing } from "../../src/lib/lamble/payments/index.ts";
import { RESOURCE_KINDS } from "../../src/lib/lamble/payments/pricing.ts";
import { getArticle, listArticles, loadRelease, publishedReleaseId, releaseIndex } from "../../src/lib/lamble/service.ts";
import { escapeXml, rss } from "../../src/lib/lamble/site/feeds.ts";

let networkAttempts = 0;
globalThis.fetch = (async (input: unknown) => {
  networkAttempts++;
  throw new Error(`network disabled in api tests: ${String(input)}`);
}) as typeof fetch;

const SITE = "https://lamble.test";
const RUNTIME_KEY = Symbol.for("lamble.payments.runtime");
const holder = globalThis as unknown as Record<symbol, unknown>;

class FakeFacilitator implements FacilitatorClient {
  settleCalls = 0;
  async getSupported(): Promise<SupportedResponse> {
    return { kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:84532" }], extensions: [], signers: {} };
  }
  async verify(payload: PaymentPayload): Promise<VerifyResponse> {
    return { isValid: true, payer: (payload.payload as { authorization: { from: string } }).authorization.from };
  }
  async settle(payload: PaymentPayload): Promise<SettleResponse> {
    this.settleCalls++;
    return { success: true, transaction: `0x${"ab".repeat(32)}`, network: "eip155:84532", payer: (payload.payload as { authorization: { from: string } }).authorization.from };
  }
}

const get = (p: string, headers: Record<string, string> = {}) => new Request(`${SITE}${p}`, { headers });
const body = async (r: Response) => JSON.parse(await r.text()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function x402Pay(offer: Response): string {
  const required = decodePaymentRequiredHeader(offer.headers.get("PAYMENT-REQUIRED")!);
  const accepted = required.accepts[0]!;
  const payload: PaymentPayload = {
    x402Version: 2,
    resource: required.resource,
    accepted,
    payload: {
      signature: `0x${"5a".repeat(65)}`,
      authorization: {
        from: "0x3333333333333333333333333333333333333333",
        to: accepted.payTo,
        value: accepted.amount,
        validAfter: "0",
        validBefore: String(Math.floor(Date.now() / 1000) + 600),
        nonce: `0x${randomBytes(32).toString("hex")}`,
      },
    },
  };
  return encodePaymentSignatureHeader(payload);
}

function withPayments(fn: (fac: FakeFacilitator) => Promise<void>) {
  return async () => {
    const fac = new FakeFacilitator();
    const before = { x: process.env.LAMBLE_X402_ENABLED };
    process.env.LAMBLE_X402_ENABLED = "true";
    holder[RUNTIME_KEY] = createPaymentRuntime(
      { LAMBLE_X402_ENABLED: "true", LAMBLE_X402_PAY_TO: "0x1111111111111111111111111111111111111111", LAMBLE_X402_NETWORK: "eip155:84532" },
      { dbPath: ":memory:", x402: { facilitator: fac } },
    );
    try {
      await fn(fac);
    } finally {
      (holder[RUNTIME_KEY] as { close(): void }).close();
      delete holder[RUNTIME_KEY];
      if (before.x === undefined) delete process.env.LAMBLE_X402_ENABLED;
      else process.env.LAMBLE_X402_ENABLED = before.x;
    }
  };
}

const release = loadRelease();
const si = release.data.coins.find((c) => c.id.startsWith("solana:DEW9dSN6"))!;
const narrative = release.data.narratives.find((n) => n.slug === "super-intelligence")!;

test("payments disabled: paid routes answer 503 without creating the commerce database", async () => {
  delete holder[RUNTIME_KEY];
  delete process.env.LAMBLE_X402_ENABLED;
  delete process.env.LAMBLE_MPP_ENABLED;
  const r = await routes.narrativePaid(get(`/api/v1/narratives/${narrative.slug}/bundle`), { slug: narrative.slug }, SITE);
  assert.equal(r.status, 503);
  assert.equal((await body(r)).error, "payments_unavailable");
  assert.equal(r.headers.get("PAYMENT-REQUIRED"), null);
  assert.equal(holder[RUNTIME_KEY], undefined, "no payment runtime (and no database) was created");
});

test("free discovery describes coverage and price but carries no market values", async () => {
  const r = await routes.coin(get(`/api/v1/coins/solana/${si.address}`), { chain: "solana", address: si.address });
  assert.equal(r.status, 200);
  const text = await r.clone().text();
  const doc = await body(r);
  assert.equal(doc.schemaVersion, "lamble.api.v1");
  assert.equal(doc.release.id, publishedReleaseId());
  assert.equal(doc.data.identity.id, si.id);
  assert.equal(doc.data.coverage.market.price.state, si.market.price.state);
  for (const v of [si.market.price.value, si.market.marketCap.value, si.market.liquidity.value, si.market.volume24hRolling.value]) {
    assert.ok(v !== null && !text.includes(String(v)), `free discovery leaked market value ${v}`);
  }
  const offer = doc.data.offers.find((o: { kind: string }) => o.kind === "coin-bundle");
  assert.equal(offer.price, loadPricing().resources["coin-bundle"].price);
  assert.equal(offer.pricing.approved, false);
});

test("a bundle whose primary content is rights-blocked is never offered", withPayments(async (fac) => {
  const r = await routes.coinPaid(get(`/api/v1/coins/solana/${si.address}/bundle`), { chain: "solana", address: si.address }, "bundle", SITE);
  assert.equal(r.status, 403);
  const doc = await body(r);
  assert.equal(doc.error, "export_not_permitted");
  assert.ok(doc.export.blockedBy.includes("codex.token-snapshot"));
  assert.equal(r.headers.get("PAYMENT-REQUIRED"), null);
  assert.equal(r.headers.get("WWW-Authenticate"), null);
  const store = (holder[RUNTIME_KEY] as { store: { db: { prepare(s: string): { get(): { n: number } } } } }).store;
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM offers").get().n, 0);
  assert.equal(fac.settleCalls, 0);
}));

test("rights gate: a section opens only when every source permits redistribution; withheld sections are marked", () => {
  const catalog = structuredClone(loadCatalog());
  assert.equal(exportPlan("coin-bundle", catalog).sellable, false);
  for (const c of catalog.capabilities) if (c.key.startsWith("codex.")) c.rights.redistribution = "permitted";
  const open = exportPlan("coin-bundle", catalog);
  assert.equal(open.sellable, true);
  assert.equal(open.sections.memberships!.exportable, true);
  const narrativePlan = exportPlan("narrative-bundle", loadCatalog());
  assert.equal(narrativePlan.sellable, true);
  const out = applyPlan(narrativePlan, { memberships: 1, versions: 2, lifecycle: 3, memberSeries: 4, activity: 5 });
  assert.deepEqual(out.memberSeries, { withheld: true, reason: "redistribution_rights_not_permitted", blockedBy: [{ capability: "codex.token-bars", redistribution: "unknown" }] });
  assert.throws(() => applyPlan(narrativePlan, { memberships: 1 }), /not rendered/);
  for (const kind of RESOURCE_KINDS) assert.ok(Object.keys(BUNDLE_SECTIONS[kind]).length > 0);
});

test("narrative bundle: offer pinned to a release, Bazaar metadata, one settlement, capability re-download, same data as the website", withPayments(async (fac) => {
  const p = `/api/v1/narratives/${narrative.slug}/bundle`;
  const offer = await routes.narrativePaid(get(p), { slug: narrative.slug }, SITE);
  assert.equal(offer.status, 402);
  const o = await body(offer.clone());
  assert.equal(o.offer.resource.releaseId, publishedReleaseId());
  assert.equal(o.offer.resource.kind, "narrative-bundle");
  const required = decodePaymentRequiredHeader(offer.headers.get("PAYMENT-REQUIRED")!);
  assert.ok(required.resource.url.startsWith(`${SITE}${p}`), "canonical URL from configuration, not the Host header");
  const bazaar = (required.extensions as Record<string, { info?: { input?: { method?: string } }; routeTemplate?: string }> | undefined)?.bazaar;
  assert.equal(bazaar?.info?.input?.method, "GET");
  assert.equal(bazaar?.routeTemplate, "/api/v1/narratives/:slug/bundle");
  assert.match(offer.headers.get("Access-Control-Expose-Headers") ?? "", /PAYMENT-REQUIRED/);

  const paid = await routes.narrativePaid(get(p, { "PAYMENT-SIGNATURE": x402Pay(offer) }), { slug: narrative.slug }, SITE);
  assert.equal(paid.status, 200, await paid.clone().text());
  assert.equal(fac.settleCalls, 1);
  assert.equal(paid.headers.get("Cache-Control"), "private, no-store");
  const token = paid.headers.get("Lamble-Capability")!;
  const doc = await body(paid);
  assert.equal(doc.release.id, publishedReleaseId());
  // Website/API agreement: the bundle's members are the members the narrative page renders.
  assert.deepEqual(
    doc.data.sections.memberships.members.map((m: { intervalId: string }) => m.intervalId),
    narrative.members.map((m) => m.intervalId),
  );
  assert.equal(doc.data.identity.title, narrative.title);
  assert.equal(doc.data.sections.memberSeries.withheld, true);
  assert.equal(doc.data.sections.activity.withheld, true);

  const again = await routes.narrativePaid(get(p, { Authorization: `Bearer ${token}` }), { slug: narrative.slug }, SITE);
  assert.equal(again.status, 200);
  assert.equal(fac.settleCalls, 1, "re-download never settles again");
  const other = release.data.narratives.find((n) => n.slug !== narrative.slug)!;
  const wrong = await routes.narrativePaid(get(`/api/v1/narratives/${other.slug}/bundle`, { Authorization: `Bearer ${token}` }), { slug: other.slug }, SITE);
  assert.ok(wrong.status === 401 || wrong.status === 403, `capability for one narrative opened another (${wrong.status})`);
}));

test("article bundles bind to the release the article was written from and resolve edition citations", withPayments(async () => {
  const a = listArticles().find((x) => x.format === "weekly")!;
  const p = `/api/v1/research/${a.slug}/bundle`;
  const r = await routes.articlePaid(get(p), { slug: a.slug }, SITE);
  assert.equal(r.status, 402);
  assert.equal((await body(r.clone())).offer.resource.releaseId, getArticle(a.slug)!.releaseId);
  const paid = await routes.articlePaid(get(p, { "PAYMENT-SIGNATURE": x402Pay(r) }), { slug: a.slug }, SITE);
  assert.equal(paid.status, 200, await paid.clone().text());
  const token = paid.headers.get("Lamble-Capability")!;
  // Cited values open only when every source permits redistribution (all unknown today); with rights in place, an
  // edition citation carries the value from its exact revision, not just a link.
  const open = structuredClone(loadCatalog());
  for (const c of open.capabilities) c.rights.redistribution = "permitted";
  const cited = articleBundle(getArticle(a.slug)!, open).sections.citedValues as Record<string, { found: boolean; value?: unknown; reference?: unknown }>;
  const editions = Object.entries(cited).filter(([c]) => c.startsWith("edition:"));
  assert.ok(editions.length > 0, "the weekly article cites its edition");
  for (const [c, v] of editions) assert.ok(v.found && v.value !== undefined && v.reference === undefined, `${c} resolves to the cited value`);
  // The article was regenerated after the purchase: its credential pins an earlier release, which no longer has this
  // version of the article. The buyer is told so, never handed the newer text under the older release's name.
  const runtime = holder[RUNTIME_KEY] as { store: { db: { prepare(sql: string): { run(...a: unknown[]): unknown } } } };
  const previous = releaseIndex().find((e) => e.releaseId !== getArticle(a.slug)!.releaseId && !e.removed)!.releaseId;
  runtime.store.db.prepare("UPDATE entitlements SET release_id = ?").run(previous);
  const stale = await routes.articlePaid(get(p, { Authorization: `Bearer ${token}` }), { slug: a.slug }, SITE);
  assert.equal(stale.status, 410);
  assert.equal((await body(stale)).error, "resource_gone");
}));

test("identifiers are validated before any lookup; EVM case folds to one canonical id", async () => {
  assert.equal((await routes.coin(get("/api/v1/coins/notachain/x"), { chain: "notachain", address: "x" })).status, 404);
  assert.equal((await routes.coin(get("/api/v1/coins/base/zzz"), { chain: "base", address: "zzz" })).status, 400);
  assert.equal((await routes.narrative(get("/api/v1/narratives/..%2Fetc"), { slug: "../etc" })).status, 400);
  assert.equal((await routes.week(get("/api/v1/market/weeks/2026-42"), { week: "2026-42" })).status, 404);
  const sol = "So11111111111111111111111111111111111111112";
  const nc = await routes.coin(get(`/api/v1/coins/solana/${sol}`), { chain: "solana", address: sol });
  assert.equal(nc.status, 404);
  assert.equal((await body(nc)).error, "not_covered");
  const evm = release.data.coins.find((c) => c.chain === "base")!;
  const upper = `0x${evm.address.slice(2).toUpperCase()}`;
  const r = await routes.coin(get(`/api/v1/coins/base/${upper}`), { chain: "base", address: upper });
  assert.equal((await body(r)).data.identity.id, evm.id);
  const bad = await routes.coins(get("/api/v1/coins?sort=drop%20table"));
  assert.equal(bad.status, 400);
});

test("changes feed pages forward on a monotonic cursor", async () => {
  const first = await body(await routes.changes(get("/api/v1/changes?since=0&limit=10")));
  assert.equal(first.data.events.length, 10);
  assert.equal(first.data.nextCursor, first.data.events.at(-1).seq);
  const second = await body(await routes.changes(get(`/api/v1/changes?since=${first.data.nextCursor}&limit=10`)));
  assert.ok(second.data.events[0].seq > first.data.nextCursor);
  assert.equal((await routes.changes(get("/api/v1/changes?since=-1"))).status, 400);
  assert.equal((await routes.changes(get("/api/v1/changes?type=bogus"))).status, 400);
});

test("free list responses support conditional requests", async () => {
  const r = await routes.narratives(get("/api/v1/narratives"));
  const etag = r.headers.get("ETag")!;
  assert.ok(etag);
  assert.equal((await routes.narratives(get("/api/v1/narratives", { "If-None-Match": etag }))).status, 304);
});

test("OpenAPI documents every paid route with its price, 402, 403 and 503", () => {
  const pricing = loadPricing();
  const doc = openapi(SITE, pricing);
  const paid = Object.entries(doc.paths).filter(([, v]) => (v as { get: { tags: string[] } }).get.tags.includes("paid"));
  assert.equal(paid.length, 6);
  for (const [, v] of paid) {
    const op = (v as { get: Record<string, unknown> }).get as { responses: Record<string, unknown>; "x-lamble-resource-kind": keyof typeof pricing.resources; "x-lamble-price": { amount: string } };
    for (const code of ["200", "402", "403", "503"]) assert.ok(op.responses[code], code);
    assert.equal(op["x-lamble-price"].amount, pricing.resources[op["x-lamble-resource-kind"]].price);
  }
});

test("every free response and every example validates against the OpenAPI schemas, with its times stated", async () => {
  const examples = await apiExamples(SITE);
  const doc = openapi(SITE, loadPricing(), examples) as unknown as { paths: Record<string, { get: { operationId: string; responses: Record<string, { content?: Record<string, { schema: unknown; examples?: Record<string, { value: unknown }> }> }> } }>; components: unknown };
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  (addFormats as unknown as (a: unknown) => void)(ajv);
  ajv.addSchema({ $id: "lamble-openapi", components: doc.components, paths: doc.paths });
  const pointer = (p: string, code: string) => `lamble-openapi#/paths/${p.replaceAll("~", "~0").replaceAll("/", "~1")}/get/responses/${code}/content/application~1json/schema`;
  const check = (p: string, code: string, value: unknown, what: string) => {
    const validate = ajv.compile({ $ref: pointer(p, code) });
    assert.ok(validate(value), `${what}: ${ajv.errorsText(validate.errors, { separator: "\n" })}`);
  };
  let counted = 0;
  for (const [p, item] of Object.entries(doc.paths)) {
    for (const [code, res] of Object.entries(item.get.responses)) {
      const ex = res.content?.["application/json"]?.examples?.published?.value;
      if (ex === undefined) continue;
      check(p, code, ex, `example ${item.get.operationId} ${code}`);
      counted++;
    }
  }
  assert.ok(counted >= 18, `only ${counted} examples`);
  // Live responses, beyond the examples: the full coin list, a coin of every chain present, every narrative, week and article.
  const live = async (p: string, res: Promise<Response>, pathKey: string) => {
    const r = await res;
    const b = await body(r);
    check(pathKey, String(r.status), b, p);
    if (r.status === 200 && pathKey !== "/api/v1/health") {
      assert.ok(b.generatedAt === null || !Number.isNaN(Date.parse(b.generatedAt)), `${p} generatedAt`);
      assert.ok("dataThrough" in b && "interval" in b, `${p} times`);
    }
    return b;
  };
  const coins = await live("/api/v1/coins?limit=500", routes.coins(get("/api/v1/coins?limit=500")), "/api/v1/coins");
  const seen = new Set<string>();
  for (const c of coins.data.items as { chain: string; address: string }[]) {
    if (seen.has(c.chain)) continue;
    seen.add(c.chain);
    const b = await live(`coin ${c.chain}`, routes.coin(get(`/api/v1/coins/${c.chain}/${c.address}`), c), "/api/v1/coins/{chain}/{address}");
    assert.equal(b.interval.cadence, "daily");
    assert.equal(b.generatedAt, loadRelease().manifest.generatedAt);
  }
  for (const n of (await live("narratives", routes.narratives(get("/api/v1/narratives?limit=500")), "/api/v1/narratives")).data.items as { slug: string }[]) {
    await live(`narrative ${n.slug}`, routes.narrative(get(`/api/v1/narratives/${n.slug}`), { slug: n.slug }), "/api/v1/narratives/{slug}");
  }
  for (const w of (await live("weeks", routes.weeks(get("/api/v1/market/weeks")), "/api/v1/market/weeks")).data.items as { id: string }[]) {
    const b = await live(`week ${w.id}`, routes.week(get(`/api/v1/market/weeks/${w.id}`), { week: w.id }), "/api/v1/market/weeks/{week}");
    assert.equal(b.interval.cadence, "weekly");
    assert.equal(b.interval.endExclusive, true);
  }
  for (const a of (await live("research", routes.research(get("/api/v1/research?limit=500")), "/api/v1/research")).data.items as { slug: string }[]) {
    await live(`article ${a.slug}`, routes.article(get(`/api/v1/research/${a.slug}`), { slug: a.slug }), "/api/v1/research/{slug}");
  }
  await live("changes", routes.changes(get("/api/v1/changes?since=0&limit=500")), "/api/v1/changes");
  await live("launchpads", routes.launchpads(get("/api/v1/launchpads")), "/api/v1/launchpads");
  await live("index", routes.index(get("/api/v1"), SITE), "/api/v1");
  await live("health", routes.health(), "/api/v1/health");
});

test("feeds escape article text", () => {
  assert.equal(escapeXml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&apos;");
  const xml = rss(SITE, [{ ...listArticles()[0]!, title: "<script>alert(1)</script>" }]);
  assert.ok(!xml.includes("<script>"));
});

test("serving makes no provider or network calls; pages and API never import collection code", async () => {
  await routes.index(get("/api/v1"), SITE);
  await routes.coins(get("/api/v1/coins?limit=500"));
  await routes.launchpads(get("/api/v1/launchpads"));
  await routes.weeks(get("/api/v1/market/weeks"));
  await routes.research(get("/api/v1/research"));
  assert.equal(networkAttempts, 0);
  const root = path.resolve(import.meta.dirname, "../..");
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  };
  for (const d of ["src/app", "src/components", "src/lib/lamble/api", "src/lib/lamble/site", "src/lib/lamble/research"]) walk(path.join(root, d));
  files.push(path.join(root, "src/lib/lamble/service.ts"));
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/from\s+["'][^"']*(lamble\/adapters|scripts\/|frames-refresh)/.test(src), `${path.relative(root, f)} imports collection code`);
    assert.ok(!/\bfetch\(/.test(src), `${path.relative(root, f)} calls fetch`);
    assert.ok(!/loadBundles/.test(src) || /src\/lib\/lamble\/(api|service)/.test(f), `${path.relative(root, f)} reads paid bundles`);
  }
});
