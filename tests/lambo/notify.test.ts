/**
 * Change-event delivery with a stub fetch and stub DNS. Events, destinations and secrets are SYNTHETIC.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { type Destination, type DeliveryState, assertPublicHttpsUrl, deliver, eligibility, formatText, isPrivateAddress } from "../../src/lib/lambo/notify/deliver.ts";
import type { ChangeEvent } from "../../src/lib/lambo/release/types.ts";

const ev = (seq: number, over: Partial<ChangeEvent> = {}): ChangeEvent => ({
  seq,
  releaseId: "rel-20261020T000000Z-aaaaaaaa",
  at: "2026-10-20T00:00:00Z",
  entityType: "coin",
  entityId: "solana:SyntheticMint111",
  kind: "metric.price",
  summary: `Synthetic change ${seq}`,
  from: null,
  to: null,
  reconstructed: false,
  ...over,
});

const hook: Destination = {
  id: "ops-hook",
  kind: "webhook",
  url: "https://hooks.example.com/lambo",
  secretEnv: "LAMBO_HOOK_SECRET",
  verifiedAt: "2026-10-19T00:00:00Z",
  consentAt: "2026-10-19T00:00:00Z",
  revokedAt: null,
  filter: {},
};
const policy = { maxAttempts: 3, backoffSeconds: [60, 300], maxDeliveriesPerDestinationPerDay: 100 };
const publicDns = async () => [{ address: "93.184.216.34" }];
const env = { LAMBO_DELIVERY_ENABLED: "true", LAMBO_HOOK_SECRET: "synthetic-secret", LAMBO_TG_TOKEN: "123:synthetic" };

test("disabled by default: no request is made", async () => {
  let calls = 0;
  const r = await deliver({ config: { enabled: false, destinations: [hook] }, events: [ev(1)], state: { destinations: {} }, env, policy, siteUrl: "https://lamble.test", fetch: (async () => (calls++, new Response())) as typeof fetch, lookup: publicDns });
  assert.equal(r[0]!.status, "disabled");
  const r2 = await deliver({ config: { enabled: true, destinations: [hook] }, events: [ev(1)], state: { destinations: {} }, env: {}, policy, siteUrl: "https://lamble.test", fetch: (async () => (calls++, new Response())) as typeof fetch, lookup: publicDns });
  assert.equal(r2[0]!.status, "disabled");
  assert.equal(calls, 0);
});

test("only verified, consented, unrevoked destinations with a secret are eligible", () => {
  assert.equal(eligibility(hook), null);
  assert.match(eligibility({ ...hook, verifiedAt: null })!, /verified/);
  assert.match(eligibility({ ...hook, consentAt: null })!, /consent/);
  assert.match(eligibility({ ...hook, revokedAt: "2026-10-20T00:00:00Z" })!, /revoked/);
  assert.match(eligibility({ ...hook, kind: "telegram", url: undefined, chatId: "@channel" })!, /numeric/);
});

test("webhook targets must be public https names (SSRF guard)", async () => {
  for (const bad of ["http://hooks.example.com/x", "https://user:pw@hooks.example.com/x", "https://127.0.0.1/x", "https://[::1]/x", "https://localhost/x", "https://hooks.example.com:8443/x", "https://metadata.internal/x"]) {
    await assert.rejects(assertPublicHttpsUrl(bad, publicDns), Error, bad);
  }
  await assert.rejects(assertPublicHttpsUrl("https://rebind.example.com/x", async () => [{ address: "169.254.169.254" }]), /non-public/);
  await assert.rejects(assertPublicHttpsUrl("https://rebind.example.com/x", async () => [{ address: "93.184.216.34" }, { address: "10.0.0.5" }]), /non-public/);
  assert.ok(await assertPublicHttpsUrl("https://hooks.example.com/x", publicDns));
  for (const ip of ["10.1.2.3", "172.20.0.1", "192.168.1.1", "100.64.0.1", "::ffff:127.0.0.1", "fd00::1", "fe80::1"]) assert.ok(isPrivateAddress(ip), ip);
  assert.ok(!isPrivateAddress("8.8.8.8"));
});

test("webhook delivery is ordered, signed, deduplicable, and resumes from its cursor", async () => {
  const sent: { headers: Record<string, string>; body: string }[] = [];
  const fetchOk = (async (_u: URL, init: RequestInit) => {
    sent.push({ headers: init.headers as Record<string, string>, body: String(init.body) });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  const state: DeliveryState = { destinations: { "ops-hook": { cursor: 1, attempts: 0, nextAttemptAt: null, lastError: null, day: null, sentToday: 0 } } };
  const events = [ev(1), ev(2), ev(3, { entityType: "narrative", entityId: "synthetic-narrative" })];
  const r = await deliver({ config: { enabled: true, destinations: [hook] }, events, state, env, policy, siteUrl: "https://lamble.test", fetch: fetchOk, lookup: publicDns, now: () => 1_792_454_400_000 });
  assert.equal(r[0]!.status, "delivered");
  assert.deepEqual(sent.map((s) => s.headers["Lambo-Delivery-Id"]), ["ops-hook:2", "ops-hook:3"]);
  const sig = sent[0]!.headers["Lambo-Signature"]!;
  const [, t, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(sig)!;
  assert.equal(v1, createHmac("sha256", "synthetic-secret").update(`${t}.${sent[0]!.body}`).digest("hex"));
  assert.equal(state.destinations["ops-hook"]!.cursor, 3);
  const again = await deliver({ config: { enabled: true, destinations: [hook] }, events, state, env, policy, siteUrl: "https://lamble.test", fetch: fetchOk, lookup: publicDns });
  assert.equal(again[0]!.status, "idle");
  assert.equal(sent.length, 2);
});

test("a failure stops the queue, backs off, and never leaks the bot token", async () => {
  const tg: Destination = { ...hook, id: "tg-chat", kind: "telegram", url: undefined, chatId: "-1001", secretEnv: "LAMBO_TG_TOKEN" };
  let bodies: string[] = [];
  const failing = (async (u: string | URL, init: RequestInit) => {
    bodies.push(String(init.body));
    throw new Error(`connect failed ${String(u)}`);
  }) as unknown as typeof fetch;
  const state: DeliveryState = { destinations: { "tg-chat": { cursor: 0, attempts: 0, nextAttemptAt: null, lastError: null, day: null, sentToday: 0 } } };
  const now = 1_792_454_400_000;
  const r = await deliver({ config: { enabled: true, destinations: [tg] }, events: [ev(1), ev(2)], state, env, policy, siteUrl: "https://lamble.test", fetch: failing, now: () => now });
  assert.equal(r[0]!.status, "failed");
  assert.ok(!r[0]!.detail.includes("123:synthetic"));
  assert.equal(bodies.length, 1, "the second event waits behind the first");
  assert.equal(JSON.parse(bodies[0]!).parse_mode, undefined, "plain text: no markup parsing");
  assert.equal(state.destinations["tg-chat"]!.nextAttemptAt, now + 60_000);
  bodies = [];
  const waiting = await deliver({ config: { enabled: true, destinations: [tg] }, events: [ev(1), ev(2)], state, env, policy, siteUrl: "https://lamble.test", fetch: failing, now: () => now + 1000 });
  assert.equal(waiting[0]!.status, "waiting");
  assert.equal(bodies.length, 0);
});

test("message text strips control characters and links to the entity page", () => {
  const t = formatText(ev(9, { summary: "Line\nbreak\u0007 and <b>tags</b>" }), "https://lamble.test");
  assert.ok(!/[\u0000-\u0009\u000b-\u001f]/.test(t.split("\n")[0]!));
  assert.ok(t.includes("https://lamble.test/coins/solana/SyntheticMint111"));
});
