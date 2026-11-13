/**
 * The hourly scout (scripts/frames-refresh/scout.py, docs/prompts/scout.md) and the site's Just spotted loader
 * (src/lib/lamble/site/spotted.ts). Offline: Frames responses are retained daily-run bodies or synthetic bodies
 * shaped like them. Imports nothing outside node built-ins and the repository, so the hourly routine can run it
 * without installing packages.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { compileBlocklist, scrubBlocked } from "../../src/lib/lamble/blocked.ts";
import { SPOTTED_STALE_SECONDS, loadSpotted, mergeTracked, parseSpotted, type SpottedLead } from "../../src/lib/lamble/site/spotted.ts";

const repo = process.cwd();
const SCOUT = path.join(repo, "scripts/frames-refresh/scout.py");
const PLAN = path.join(repo, "scripts/frames-refresh/plan.py");
const registry = JSON.parse(readFileSync(path.join(repo, "docs/prompts/refresh-market-data.sources.json"), "utf8"));
const jobs = JSON.parse(readFileSync(path.join(repo, "docs/data/jobs.json"), "utf8"));
const scoutJob = jobs.jobs.find((j: { id: string }) => j.id === "scout");
const blocked = JSON.parse(readFileSync(path.join(repo, "docs/data/blocked.json"), "utf8"));
const baseline = path.join(repo, registry.references.latestRefreshRun);
const tracked = new Set<string>(registry.poolUniverse.map((u: { tokenId: string }) => u.tokenId));

const runName = (t: number) => new Date(t * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const runTime = (name: string) => Date.UTC(+name.slice(0, 4), +name.slice(4, 6) - 1, +name.slice(6, 8), +name.slice(9, 11), +name.slice(11, 13), +name.slice(13, 15)) / 1000;
const BASE_T = runTime(path.basename(baseline));
const json = (f: string) => JSON.parse(readFileSync(f, "utf8"));

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), "lamble-scout-"));
  const env = { ...process.env, LAMBLE_LIVE_DIR: path.join(root, "live"), LAMBLE_SCOUT_DIR: path.join(root, "scout") };
  const py = (...args: string[]) => spawnSync("python3", [SCOUT, ...args], { encoding: "utf8", env });
  return { root, env, py, live: path.join(root, "live"), scouts: path.join(root, "scout"), done: () => rmSync(root, { recursive: true, force: true }) };
}

/** A completed Frames run answering raw/<batch>-request.json, one body per call. */
function answer(run: string, batch: string, body: (seq: number, call: { id: string; args: Record<string, unknown> }) => unknown, credits: number) {
  const req = json(path.join(run, `raw/${batch}-request.json`));
  writeFileSync(
    path.join(run, `raw/${batch}.json`),
    JSON.stringify({
      run_id: `run_test_${path.basename(run)}_${batch}`,
      status: "completed",
      billing: { charged_credits: credits },
      result: { calls: req.calls.map((c: { id: string; args: Record<string, unknown> }, seq: number) => ({ seq, tool_id: c.id, delivered: true, body: body(seq, c) })) },
    }),
  );
}

// Three Pump.fun coins sharing an invented theme word, two hours old, above the member bar: one cluster no daily decision covers.
const SOL = "So11111111111111111111111111111111111111112";
const coins = [1, 2, 3].map((i) => ({ address: `Zorb${i}LaXzorbLaXzorbLaXzorbLaXzorb${i}pump`, symbol: `ZBX${i}`, volume: 300_000 * i }));

function syntheticSweep(run: string) {
  const t = runTime(path.basename(run));
  answer(
    run,
    "d1",
    (_seq, call) => {
      const aliases = [...String(call.args.query).matchAll(/(\w+):filterTokens\(/g)].map((m) => m[1]!);
      const rows = coins.map((c) => ({ pair: { address: `pool${c.symbol}`, token0: c.address, token1: SOL, networkId: 1399811149, createdAt: t - 7200 }, priceUSD: "0.0004", circulatingMarketCap: "400000", change24: "2.5", volume24: String(c.volume), liquidity: "50000" }));
      return { data: Object.fromEntries((aliases.length ? aliases : ["filterTokens"]).map((a) => [a, { results: a === "solana_fresh" ? rows : [] }])) };
    },
    25,
  );
}

function syntheticNames(run: string) {
  answer(
    run,
    "d2",
    () => ({
      data: {
        t0: [
          ...coins.map((c) => ({ address: c.address, name: `Zorblax ${c.symbol}`, symbol: c.symbol, networkId: 1399811149, info: { description: "" }, launchpad: { launchpadName: "Pump.fun" } })),
          { address: SOL, name: "Wrapped SOL", symbol: "SOL", networkId: 1399811149, info: { description: "" }, launchpad: null },
        ],
      },
    }),
    7,
  );
}

const post = (id: string, text: string, t: number) => ({ id, text, created_at: new Date(t * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"), author: { screen_name: "zorb_news", name: "Zorb News" } });

function startRun(s: ReturnType<typeof sandbox>, t: number) {
  const r = s.py("start", "--at", runName(t));
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return path.join(s.scouts, runName(t));
}

test("plan.py scout adds a fresh-launch window to the sweep only for scout runs, with its own idempotency keys", () => {
  const s = sandbox();
  try {
    const daily = path.join(s.root, "lamble", "20261113T072600Z");
    assert.equal(spawnSync("python3", [PLAN, daily, "discover"], { encoding: "utf8" }).status, 0);
    const scout = path.join(s.root, "scout", "20261113T072600Z");
    assert.equal(spawnSync("python3", [PLAN, scout, "scout"], { encoding: "utf8" }).status, 0);
    const d = json(path.join(daily, "raw/d1-request.json"));
    const sc = json(path.join(scout, "raw/d1-request.json"));
    assert.equal(d.idempotency_key, "lamble-20261113T072600Z-d1");
    assert.equal(sc.idempotency_key, "lamble-scout-20261113T072600Z-d1");
    assert.equal(sc.calls.length, d.calls.length, "the scout sweep costs the same number of calls as the daily one");
    assert.equal(existsSync(path.join(scout, "raw/e1-request.json")), false, "no evidence batch: story checks are planned by scout.py");
    assert.ok(!JSON.stringify(d).includes("_fresh"), "the daily sweep is unchanged");
    const fresh = Number(registry.discovery.scout.freshWindowHours) * 3600;
    for (const group of Object.keys(registry.discovery.sweepGroups)) {
      const q = sc.calls.map((c: { args: { query: string } }) => c.args.query).find((x: string) => x.includes(`${group}_active:`));
      assert.match(q, new RegExp(`${group}_fresh:filterTokens\\(filters:\\{launchpadName:\\[[^\\]]*\\],liquidity:\\{gt:${registry.discovery.minLiquidityUsd}\\},volume24:\\{gt:${registry.narrativeRules.addMember.minVolume24Usd}\\},createdAt:\\{gt:${runTime("20261113T072600Z") - fresh}\\}`));
    }
    const misplaced = spawnSync("python3", [PLAN, path.join(s.root, "lamble", "20261113T082600Z"), "scout"], { encoding: "utf8" });
    assert.notEqual(misplaced.status, 0, "a scout run outside research/scout/ is refused");
  } finally {
    s.done();
  }
});

test("a new theme is checked once, published only with its sources, and remembered", () => {
  const s = sandbox();
  try {
    const t1 = BASE_T + 3600;
    const run = startRun(s, t1);
    syntheticSweep(run);
    assert.equal(s.py("names", run).status, 0);
    syntheticNames(run);
    const check = s.py("check", run);
    assert.equal(check.status, 0, check.stderr);
    const out = JSON.parse(check.stdout);
    const todo = out.toDecide.find((x: { clusterId: string }) => x.clusterId === "k-zorblax");
    assert.ok(todo, "the invented theme is escalated");
    const e1 = json(path.join(run, "raw/e1-request.json"));
    assert.ok(e1.calls.length <= scoutJob.pagination.maxStorySearchesPerRun);
    assert.equal(e1.idempotency_key, `lamble-scout-${runName(t1)}-e1`);
    assert.ok(e1.calls.some((c: { args: { words: string } }) => c.args.words === "zorblax $ZBX3"), "theme word next to the leading ticker");
    const seq = e1.calls.findIndex((c: { args: { words: string } }) => c.args.words === "zorblax $ZBX3");
    answer(run, "e1", (i) => ({ tweets: i === seq ? [post("1001", "Zorblax festival announced for Friday, coins named after it are trading.", t1 - 1800), post("1002", "CA: Zorb... 100x gem", t1 - 600)] : [] }), 11);

    const decide = (d: unknown) => writeFileSync(path.join(run, "decisions.json"), JSON.stringify(d));
    const others = Object.fromEntries(out.toDecide.filter((x: { clusterId: string }) => x.clusterId !== "k-zorblax").map((x: { clusterId: string }) => [x.clusterId, { decision: "deferred", reason: "Not part of this test's fixture." }]));
    assert.notEqual(s.py("publish", run).status, 0, "every escalated theme needs a decision");
    decide({ ...others, "k-zorblax": { decision: "confirmed", title: "Zorblax festival coins", sourceSays: "A post says a Zorblax festival was announced for Friday.", sources: [`e1:${seq}#9999`], reason: "One post about the festival itself." } });
    assert.match(s.py("publish", run).stderr, /not a post saved/, "a source must be a post this run saved");
    decide({ ...others, "k-zorblax": { decision: "confirmed", title: "Zorblax festival coins", sourceSays: "A post says a Zorblax festival was announced for Friday.", sources: [], reason: "One post about the festival itself." } });
    assert.notEqual(s.py("publish", run).status, 0, "confirmed needs a source");
    decide({ ...others, "k-unknown": { decision: "rejected", reason: "Not escalated in this run." } });
    assert.notEqual(s.py("publish", run).status, 0, "only escalated themes can be decided");
    decide({ ...others, "k-zorblax": { decision: "confirmed", title: "Zorblax festival coins", sourceSays: "A post says a Zorblax festival was announced for Friday.", sources: [`e1:${seq}#1001`], reason: "One post about the festival itself; the other is a shill." } });
    const pub = s.py("publish", run);
    assert.equal(pub.status, 0, pub.stderr);

    const spotted = json(path.join(s.live, "spotted.json"));
    const lead = spotted.leads.find((l: { id: string }) => l.id === "k-zorblax");
    assert.equal(lead.status, "confirmed");
    assert.equal(lead.sources[0].url, "https://x.com/zorb_news/status/1001");
    assert.equal(lead.size, 3);
    assert.deepEqual(
      spotted.coins.filter((c: { symbol: string }) => c.symbol.startsWith("ZBX")).map((c: { symbol: string; leadIds: string[] }) => [c.symbol, c.leadIds.includes("k-zorblax")]),
      [["ZBX3", true], ["ZBX2", true], ["ZBX1", true]],
      "new coins, largest volume first, linked to their theme",
    );
    const ledger = json(path.join(s.live, "scout-ledger.json"));
    assert.equal(ledger.days[new Date(t1 * 1000).toISOString().slice(0, 10)].runs[runName(t1)], 25 + 7 + 11);

    // The site shows it: confirmed with its post, and the three new coins.
    process.env.LAMBLE_LIVE_DIR = s.live;
    const site = loadSpotted(t1 + 600)!;
    assert.ok(site && !site.stale);
    assert.equal(site.leads.find((l) => l.id === "k-zorblax")?.sources[0]?.author, "zorb_news");
    assert.ok(site.leads.every((l) => l.status === "confirmed" || l.status === "tracked"), "unchecked, deferred and rejected themes are never shown");
    assert.equal(loadSpotted(t1 + SPOTTED_STALE_SECONDS + 1)!.stale, true, "three missed runs mark the file stale");

    // An hour later the same theme is not paid for again, and keeps its first-spotted time.
    const t2 = t1 + 3600;
    const run2 = startRun(s, t2);
    syntheticSweep(run2);
    assert.equal(s.py("names", run2).status, 0);
    syntheticNames(run2);
    const check2 = JSON.parse(s.py("check", run2).stdout);
    assert.ok(!check2.toDecide.some((x: { clusterId: string }) => x.clusterId === "k-zorblax"), "a confirmed theme is not searched again");
    assert.equal(existsSync(path.join(run2, "raw/e1-request.json")), false, "nothing to search, nothing to pay for");
    const pub2 = s.py("publish", run2);
    assert.equal(pub2.status, 0, pub2.stderr);
    const again = json(path.join(s.live, "spotted.json")).leads.find((l: { id: string }) => l.id === "k-zorblax");
    assert.equal(again.status, "confirmed");
    assert.equal(again.firstSpottedAt, lead.firstSpottedAt);
    assert.deepEqual(again.sources, lead.sources);
    assert.equal(json(path.join(s.live, "scout-ledger.json")).days[new Date(t2 * 1000).toISOString().slice(0, 10)].runs[runName(t2)], 25 + 7);
  } finally {
    delete process.env.LAMBLE_LIVE_DIR;
    s.done();
  }
});

test("a rejected theme is hidden and not paid for again within its re-check window", () => {
  const s = sandbox();
  try {
    const t1 = BASE_T + 3600;
    const run = startRun(s, t1);
    syntheticSweep(run);
    s.py("names", run);
    syntheticNames(run);
    const out = JSON.parse(s.py("check", run).stdout);
    answer(run, "e1", () => ({ tweets: [] }), 11);
    writeFileSync(path.join(run, "decisions.json"), JSON.stringify(Object.fromEntries(out.toDecide.map((x: { clusterId: string }) => [x.clusterId, { decision: "rejected", reason: "No post about a story, only tickers." }]))));
    assert.equal(s.py("publish", run).status, 0);
    process.env.LAMBLE_LIVE_DIR = s.live;
    assert.equal(loadSpotted(t1)!.leads.some((l) => l.id === "k-zorblax"), false);
    const later = startRun(s, t1 + 2 * 3600);
    syntheticSweep(later);
    s.py("names", later);
    syntheticNames(later);
    assert.ok(!JSON.parse(s.py("check", later).stdout).toDecide.some((x: { clusterId: string }) => x.clusterId === "k-zorblax"), "remembered, not searched again");
  } finally {
    delete process.env.LAMBLE_LIVE_DIR;
    s.done();
  }
});

test("the day's scout budget is enforced before any call", () => {
  const s = sandbox();
  try {
    const t = BASE_T + 3600;
    const day = new Date(t * 1000).toISOString().slice(0, 10);
    const cap = scoutJob.budget.maxCreditsPerDay;
    const ledger = (spent: number) => writeFileSync(path.join(s.live, "scout-ledger.json"), JSON.stringify({ schema: "lamble-scout-ledger-v1", maxCreditsPerDay: cap, days: { [day]: { runs: { "20000101T000000Z": spent } } } }));
    mkdirSync(s.live, { recursive: true });
    ledger(cap - 10);
    const refused = s.py("start", "--at", runName(t));
    assert.equal(refused.status, 1);
    assert.equal(JSON.parse(refused.stdout).reason, "scout day budget");
    assert.equal(existsSync(path.join(s.scouts, runName(t))), false, "nothing is created");
    ledger(0);
    assert.equal(s.py("start", "--at", runName(t)).status, 0);
    assert.ok(scoutJob.budget.maxCreditsPerRun >= 85 && scoutJob.budget.maxCreditsPerRun < cap);
  } finally {
    s.done();
  }
});

test("a source naming a blocked site is refused", { skip: blocked.hosts.length === 0 }, () => {
  const s = sandbox();
  try {
    const t1 = BASE_T + 3600;
    const run = startRun(s, t1);
    syntheticSweep(run);
    s.py("names", run);
    syntheticNames(run);
    const out = JSON.parse(s.py("check", run).stdout);
    const seq = json(path.join(run, "raw/e1-request.json")).calls.findIndex((c: { args: { words: string } }) => c.args.words === "zorblax $ZBX3");
    answer(run, "e1", (i) => ({ tweets: i === seq ? [post("2001", `Zorblax news at https://${blocked.hosts[0].host}/zorb`, t1 - 60)] : [] }), 11);
    const others = Object.fromEntries(out.toDecide.filter((x: { clusterId: string }) => x.clusterId !== "k-zorblax").map((x: { clusterId: string }) => [x.clusterId, { decision: "deferred", reason: "Not part of this test's fixture." }]));
    writeFileSync(path.join(run, "decisions.json"), JSON.stringify({ ...others, "k-zorblax": { decision: "confirmed", title: "Zorblax festival coins", sourceSays: "A post says a Zorblax festival was announced.", sources: [`e1:${seq}#2001`], reason: "The only post about the story." } }));
    assert.match(s.py("publish", run).stderr, /blocked/);
  } finally {
    s.done();
  }
});

test("on the latest daily run's own sweep, the scout lists only untracked new coins and pays for nothing the daily run just decided", () => {
  const s = sandbox();
  try {
    const t = BASE_T + 3600;
    const run = startRun(s, t);
    copyFileSync(path.join(baseline, "raw/d1.json"), path.join(run, "raw/d1.json"));
    assert.equal(s.py("names", run).status, 0);
    copyFileSync(path.join(baseline, "raw/d2.json"), path.join(run, "raw/d2.json"));
    const check = s.py("check", run);
    assert.equal(check.status, 0, check.stderr);
    const daily = json(path.join(baseline, "curation.json")).clusterDecisions ?? {};
    for (const x of JSON.parse(check.stdout).toDecide) assert.ok(!(x.clusterId in daily), `${x.clusterId} was decided an hour ago`);
    if (existsSync(path.join(run, "raw/e1-request.json"))) {
      answer(run, "e1", () => ({ tweets: [] }), 11);
      writeFileSync(path.join(run, "decisions.json"), JSON.stringify(Object.fromEntries(json(path.join(run, "escalated.json")).escalated.map((e: { clusterId: string }) => [e.clusterId, { decision: "deferred", reason: "Offline test: no posts." }]))));
    }
    const pub = s.py("publish", run);
    assert.equal(pub.status, 0, pub.stderr);
    const spotted = json(path.join(s.live, "spotted.json"));
    const vols = spotted.coins.map((c: { volume24Usd: number }) => c.volume24Usd);
    assert.deepEqual(vols, [...vols].sort((a, b) => b - a));
    const blockedIds = new Set(blocked.tokens.map((b: { tokenId: string }) => b.tokenId));
    for (const c of spotted.coins) {
      assert.ok(!tracked.has(c.tokenId), `${c.tokenId} is already tracked`);
      assert.ok(!blockedIds.has(c.tokenId));
      assert.ok(c.ageHours >= 0 && c.ageHours <= registry.discovery.scout.newCoinHours);
    }
    assert.ok(Buffer.byteLength(JSON.stringify(spotted)) < 200_000, "the hourly commit stays small");
  } finally {
    s.done();
  }
});

test("the loader rejects malformed files, merges a tracked narrative's themes and applies the blocklist", () => {
  const generatedAt = "2026-11-13T08:26:00Z";
  const now = Date.parse(generatedAt) / 1000 + 60;
  const lead = (id: string, status: string, extra: Record<string, unknown>) => ({
    id,
    keyword: id,
    status,
    size: 2,
    combinedVolume24Usd: 1,
    launchpads: ["pump.fun"],
    members: [
      { tokenId: `solana:${id}A`, symbol: `${id}A`, name: "", volume24Usd: 600_000 },
      { tokenId: "solana:shared", symbol: "SH", name: "", volume24Usd: 100_000 },
    ],
    firstSpottedAt: generatedAt,
    lastSeenAt: generatedAt,
    ...extra,
  });
  const doc = {
    schema: "lamble-spotted-v1",
    generatedAt,
    scoutRun: "20261113T082600Z",
    rules: { newCoinHours: 24, freshWindowHours: 6, memberBar: { minVolume24Usd: 50000, minMcapUsd: 100000 }, newNarrative: { minConstituents: 3, minCombinedVolume24Usd: 500000 } },
    coins: [
      { tokenId: "base:0xbad", chain: "base", address: "0xbad", name: "Bad", symbol: "BADX", launchpadSlug: "clanker", poolCreatedAt: null, ageHours: 2, volume24Usd: 9e6, mcapUsd: null, firstSpottedAt: generatedAt, leadIds: [] },
      { tokenId: "solana:good", chain: "solana", address: "good", name: "Good", symbol: "GOOD", launchpadSlug: "pump.fun", poolCreatedAt: null, ageHours: 2, volume24Usd: 1e5, mcapUsd: 2e5, firstSpottedAt: generatedAt, leadIds: [] },
      { tokenId: "solana:broken", chain: "solana", volume24Usd: -1 },
    ],
    leads: [
      lead("a", "tracked", { narrativeSlug: "n1", narrativeTitle: "N1" }),
      lead("b", "tracked", { narrativeSlug: "n1", narrativeTitle: "N1" }),
      lead("c", "confirmed", { title: "Story", sourceSays: "Posts say something happened.", sources: [{ postId: "1", url: "https://x.com/a/status/1", author: "a" }] }),
      lead("d", "confirmed", { title: "No sources", sourceSays: "Posts say.", sources: [] }),
      lead("e", "rejected", {}),
      lead("f", "spotted", {}),
    ],
  };
  assert.equal(parseSpotted({ ...doc, schema: "other" }, now), null);
  assert.equal(parseSpotted({ ...doc, coins: "x" }, now), null);
  const m = compileBlocklist({ hosts: [], tokens: [{ tokenId: "base:0xbad", symbol: "BADX", name: null, reason: "test", since: "2026-11-13" }] });
  const p = parseSpotted(scrubBlocked(doc, m), now)!;
  assert.deepEqual(p.coins.map((c) => c.symbol), ["GOOD"], "blocked and malformed coins are dropped");
  assert.deepEqual(p.leads.map((l) => [l.id, l.status]), [["a+b", "tracked"], ["c", "confirmed"]]);
  const merged = p.leads[0]!;
  assert.deepEqual(merged.members.map((x) => x.symbol), ["aA", "bA", "SH"], "members de-duplicated across the narrative's themes");
  assert.equal(merged.combinedVolume24Usd, 1_300_000);
  assert.equal(p.stale, false);
  assert.deepEqual(mergeTracked([] as SpottedLead[]), []);
});
