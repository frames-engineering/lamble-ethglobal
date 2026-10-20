/**
 * Change-event delivery with a stub fetch and stub DNS. Events, destinations and secrets are SYNTHETIC.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { type Destination, type DeliveryState, assertPublicHttpsUrl, deliver, eligibility, formatText, isPrivateAddress } from "../../src/lib/lamble/notify/deliver.ts";
import { type VerificationFile, confirmTelegram, startTelegram, verificationProblem, verifyWebhook } from "../../src/lib/lamble/notify/verify.ts";
import type { ChangeEvent } from "../../src/lib/lamble/release/types.ts";

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
  url: "https://hooks.example.com/lamble",
  secretEnv: "LAMBLE_HOOK_SECRET",
  consentAt: "2026-10-19T00:00:00Z",
  revokedAt: null,
  filter: {},
};
/** SYNTHETIC verification records, as `deliver verify` / `deliver confirm` would write them. */
const verified: VerificationFile = {
  destinations: {
    "ops-hook": { kind: "webhook", target: "https://hooks.example.com/lamble", method: "webhook-challenge", verifiedAt: "2026-10-19T00:00:00Z", pending: null },
    "tg-chat": { kind: "telegram", target: "-1001", method: "telegram-code", verifiedAt: "2026-10-19T00:00:00Z", pending: null },
  },
};
const policy = { maxAttempts: 3, backoffSeconds: [60, 300], maxDeliveriesPerDestinationPerDay: 100 };
const publicDns = async () => [{ address: "93.184.216.34" }];
const env = { LAMBLE_DELIVERY_ENABLED: "true", LAMBLE_HOOK_SECRET: "synthetic-secret", LAMBLE_TG_TOKEN: "123:synthetic" };

test("disabled by default: no request is made", async () => {
  let calls = 0;
  const r = await deliver({ verifications: verified, config: { enabled: false, destinations: [hook] }, events: [ev(1)], state: { destinations: {} }, env, policy, siteUrl: "https://lamble.test", fetch: (async () => (calls++, new Response())) as typeof fetch, lookup: publicDns });
  assert.equal(r[0]!.status, "disabled");
  const r2 = await deliver({ verifications: verified, config: { enabled: true, destinations: [hook] }, events: [ev(1)], state: { destinations: {} }, env: {}, policy, siteUrl: "https://lamble.test", fetch: (async () => (calls++, new Response())) as typeof fetch, lookup: publicDns });
  assert.equal(r2[0]!.status, "disabled");
  assert.equal(calls, 0);
});

test("only verified, consented, unrevoked destinations with a secret are eligible", () => {
  assert.equal(eligibility(hook, verified), null);
  assert.match(eligibility(hook, { destinations: {} })!, /not verified/);
  assert.match(eligibility({ ...hook, url: "https://other.example.com/x" }, verified)!, /target changed/);
  assert.match(eligibility({ ...hook, consentAt: null }, verified)!, /consent/);
  assert.match(eligibility({ ...hook, revokedAt: "2026-10-20T00:00:00Z" }, verified)!, /revoked/);
  const tgBad = { ...hook, id: "tg-chat", kind: "telegram" as const, url: undefined, chatId: "@channel" };
  assert.match(eligibility(tgBad, { destinations: { "tg-chat": { ...verified.destinations["tg-chat"]!, target: "@channel" } } })!, /numeric/);
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
  const r = await deliver({ verifications: verified, config: { enabled: true, destinations: [hook] }, events, state, env, policy, siteUrl: "https://lamble.test", fetch: fetchOk, lookup: publicDns, now: () => 1_792_454_400_000 });
  assert.equal(r[0]!.status, "delivered");
  assert.deepEqual(sent.map((s) => s.headers["Lamble-Delivery-Id"]), ["ops-hook:2", "ops-hook:3"]);
  const sig = sent[0]!.headers["Lamble-Signature"]!;
  const [, t, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(sig)!;
  assert.equal(v1, createHmac("sha256", "synthetic-secret").update(`${t}.${sent[0]!.body}`).digest("hex"));
  assert.equal(state.destinations["ops-hook"]!.cursor, 3);
  const again = await deliver({ verifications: verified, config: { enabled: true, destinations: [hook] }, events, state, env, policy, siteUrl: "https://lamble.test", fetch: fetchOk, lookup: publicDns });
  assert.equal(again[0]!.status, "idle");
  assert.equal(sent.length, 2);
});

test("a failure stops the queue, backs off, and never leaks the bot token", async () => {
  const tg: Destination = { ...hook, id: "tg-chat", kind: "telegram", url: undefined, chatId: "-1001", secretEnv: "LAMBLE_TG_TOKEN" };
  let bodies: string[] = [];
  const failing = (async (u: string | URL, init: RequestInit) => {
    bodies.push(String(init.body));
    throw new Error(`connect failed ${String(u)}`);
  }) as unknown as typeof fetch;
  const state: DeliveryState = { destinations: { "tg-chat": { cursor: 0, attempts: 0, nextAttemptAt: null, lastError: null, day: null, sentToday: 0 } } };
  const now = 1_792_454_400_000;
  const r = await deliver({ verifications: verified, config: { enabled: true, destinations: [tg] }, events: [ev(1), ev(2)], state, env, policy, siteUrl: "https://lamble.test", fetch: failing, now: () => now });
  assert.equal(r[0]!.status, "failed");
  assert.ok(!r[0]!.detail.includes("123:synthetic"));
  assert.equal(bodies.length, 1, "the second event waits behind the first");
  assert.equal(JSON.parse(bodies[0]!).parse_mode, undefined, "plain text: no markup parsing");
  assert.equal(state.destinations["tg-chat"]!.nextAttemptAt, now + 60_000);
  bodies = [];
  const waiting = await deliver({ verifications: verified, config: { enabled: true, destinations: [tg] }, events: [ev(1), ev(2)], state, env, policy, siteUrl: "https://lamble.test", fetch: failing, now: () => now + 1000 });
  assert.equal(waiting[0]!.status, "waiting");
  assert.equal(bodies.length, 0);
});

test("message text strips control characters and links to the entity page", () => {
  const t = formatText(ev(9, { summary: "Line\nbreak\u0007 and <b>tags</b>" }), "https://lamble.test");
  assert.ok(!/[\u0000-\u0009\u000b-\u001f]/.test(t.split("\n")[0]!));
  assert.ok(t.includes("https://lamble.test/coins/solana/SyntheticMint111"));
});

test("webhook verification records a target only when the endpoint echoes the signed challenge", async () => {
  let seen: { body: string; sig: string } | null = null;
  const echo = (async (_u: URL, init: RequestInit) => {
    seen = { body: String(init.body), sig: (init.headers as Record<string, string>)["Lamble-Signature"]! };
    return Response.json({ challenge: JSON.parse(String(init.body)).challenge });
  }) as unknown as typeof fetch;
  const v = await verifyWebhook(hook, "synthetic-secret", { fetch: echo, lookup: publicDns, now: () => Date.parse("2026-10-20T09:00:00Z") });
  assert.deepEqual(v, { kind: "webhook", target: hook.url, method: "webhook-challenge", verifiedAt: "2026-10-20T09:00:00Z", pending: null });
  const [, t, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(seen!.sig)!;
  assert.equal(v1, createHmac("sha256", "synthetic-secret").update(`${t}.${seen!.body}`).digest("hex"), "the challenge is signed");
  const wrong = (async () => Response.json({ challenge: "not-it" })) as unknown as typeof fetch;
  await assert.rejects(verifyWebhook(hook, "synthetic-secret", { fetch: wrong, lookup: publicDns }), /did not echo/);
  const ok200 = (async () => new Response("ok")) as unknown as typeof fetch;
  await assert.rejects(verifyWebhook(hook, "synthetic-secret", { fetch: ok200, lookup: publicDns }), /did not echo/, "a plain 200 is not a verification");
  await assert.rejects(verifyWebhook({ ...hook, url: "https://metadata.internal/x" }, "s", { fetch: echo, lookup: publicDns }), /public/);
});

test("Telegram verification: a one-time code, stored only as a hash, expiring, with limited attempts", async () => {
  const tg: Destination = { ...hook, id: "tg-chat", kind: "telegram", url: undefined, chatId: "-1001", secretEnv: "LAMBLE_TG_TOKEN" };
  let text = "";
  const send = (async (_u: string, init: RequestInit) => {
    text = JSON.parse(String(init.body)).text;
    return new Response("{}");
  }) as unknown as typeof fetch;
  const t0 = Date.parse("2026-10-20T09:00:00Z");
  const pending = await startTelegram(tg, "123:synthetic", { fetch: send, now: () => t0 });
  const code = /code: (\d{8})/.exec(text)![1]!;
  assert.ok(!JSON.stringify(pending).includes(code), "the code itself is never stored");
  assert.match(verificationProblem(tg, { destinations: { "tg-chat": pending } })!, /pending/);
  const wrongCode = code === "00000000" ? "00000001" : "00000000";
  assert.throws(() => confirmTelegram(pending, wrongCode, t0 + 1000), /wrong code \(4 attempt/);
  assert.throws(() => confirmTelegram(pending, code, t0 + 31 * 60_000), /expired/);
  const done = confirmTelegram(pending, code, t0 + 60_000);
  assert.equal(done.verifiedAt, "2026-10-20T09:01:00Z");
  assert.equal(verificationProblem(tg, { destinations: { "tg-chat": done } }), null);
  assert.equal(verificationProblem({ ...tg, chatId: "-1002" }, { destinations: { "tg-chat": done } }), "target changed since verification; verify again");
  const locked = { ...pending, pending: { ...pending.pending!, attempts: 5 } };
  assert.throws(() => confirmTelegram(locked, code, t0 + 1000), /too many attempts/);
});
