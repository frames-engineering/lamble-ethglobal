/**
 * The owner's blocklist (docs/data/blocked.json, src/lib/lamble/blocked.ts): blocked sites and coins never reach a
 * page or API response, from the published release or any retained one, and the daily planner never requests them.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { REMOVED_NOTE, type Blocklist, blocklistPath, compileBlocklist, deployedBlocklist, parseBlocklist, scrubBlocked, scrubText } from "../../src/lib/lamble/blocked.ts";
import * as service from "../../src/lib/lamble/service.ts";

const BAD = "base:0xabc0000000000000000000000000000000000001";
const m = compileBlocklist({
  hosts: [{ host: "bad.example", reason: "test", since: "2026-10-30" }],
  tokens: [{ tokenId: BAD, symbol: "BADX", name: "bad.example", reason: "test", since: "2026-10-30" }],
});

test("prose loses only the sentences that name a blocked site or coin, and says so", () => {
  const text = 'Good (GOOD): "Fine." Its site (good.example) is up. bad.example (BADX): "Cheap inference." Its site (bad.example, e3:0) says so. The rest stays.';
  assert.equal(scrubText(text, m), `Good (GOOD): "Fine." Its site (good.example) is up. The rest stays. ${REMOVED_NOTE}`);
  assert.equal(scrubText("Nothing here.", m), "Nothing here.");
  assert.equal(scrubText("$BADX price +200%.", m), "");
  assert.equal(scrubText("BADXY and xBADX are other tickers.", m), "BADXY and xBADX are other tickers.");
  assert.ok(m.mentions("curl https://api.bad.example/v1"), "a host blocks its subdomains");
});

test("entries about a blocked coin or site are dropped; everything else is kept as it was", () => {
  const doc = {
    coins: [{ id: BAD, symbol: "BADX" }, { id: "base:0x2", symbol: "GOOD" }],
    peers: [{ tokenId: BAD, symbol: "BADX" }, { tokenId: "base:0x2", symbol: "GOOD" }],
    claims: [{ id: "src:https://bad.example/", label: "official page", url: "https://bad.example/" }, { id: "src:https://good.example/", label: "official page", url: "https://good.example/" }],
    posts: [{ id: "x1", label: "@someone: BADX is building a marketplace", url: "https://x.com/someone/status/1" }],
    lines: [{ text: "BADX price +227% since the previous release.", cite: "change:1" }, { text: "GOOD price -3%.", cite: "change:2" }],
    entities: { coins: [BAD, "base:0x2"] },
    bundles: { [BAD]: { v: 1 }, "base:0x2": { v: 2 } },
    lifecycle: { reason: "Paused. BADX had the least volume." },
    count: 2,
  };
  assert.deepEqual(scrubBlocked(doc, m), {
    coins: [{ id: "base:0x2", symbol: "GOOD" }],
    peers: [{ tokenId: "base:0x2", symbol: "GOOD" }],
    claims: [{ id: "src:https://good.example/", label: "official page", url: "https://good.example/" }],
    posts: [],
    lines: [{ text: "GOOD price -3%.", cite: "change:2" }],
    entities: { coins: ["base:0x2"] },
    bundles: { "base:0x2": { v: 2 } },
    lifecycle: { reason: `Paused. ${REMOVED_NOTE}` },
    count: 2,
  });
  const clean = { a: [{ b: "nothing blocked" }] };
  assert.equal(scrubBlocked(clean, m), clean, "an unaffected document is returned as is");
});

test("the blocklist file is validated: a URL for a host, a missing reason or a malformed token id is refused", () => {
  assert.throws(() => parseBlocklist({ hosts: [{ host: "https://bad.example/", reason: "x", since: "2026-10-30" }], tokens: [] }));
  assert.throws(() => parseBlocklist({ hosts: [{ host: "bad.example", since: "2026-10-30" }], tokens: [] }));
  assert.throws(() => parseBlocklist({ hosts: [], tokens: [{ tokenId: "nope", reason: "x", since: "2026-10-30" }] }));
  assert.equal(deployedBlocklist().matcher.empty, false);
});

const deployed = JSON.parse(readFileSync(blocklistPath(), "utf8")) as Blocklist;

test("no read of any retained release, bundle, edition, article or change names a blocked site or coin", () => {
  const { matcher } = deployedBlocklist();
  const clean = (what: string, v: unknown) => assert.equal(matcher.mentions(JSON.stringify(v)), false, `${what} names a blocked site or coin`);
  for (const r of service.releaseIndex().filter((x) => !x.removed)) {
    clean(r.releaseId, service.loadRelease(r.releaseId).data);
    clean(`${r.releaseId} bundles`, service.loadBundles(r.releaseId));
  }
  for (const e of service.editionIndex()) clean(e.id, service.getEdition(e.id));
  clean("changes", service.allChanges());
  for (const a of service.listArticles()) clean(a.slug, service.getArticle(a.slug));
});

test("a blocked coin has no page; a release the blocklist changed gets a new ETag", () => {
  for (const t of deployed.tokens) {
    const [chain, address] = [t.tokenId.slice(0, t.tokenId.indexOf(":")), t.tokenId.slice(t.tokenId.indexOf(":") + 1)];
    assert.equal(service.getCoin(chain, address), null, t.tokenId);
  }
  const r = service.loadRelease();
  const raw = readFileSync(path.join(service.dataRoot(), "releases", r.manifest.releaseId, "public.json"), "utf8");
  const { matcher, tag } = deployedBlocklist();
  assert.equal(r.etag.endsWith(`-${tag}"`), matcher.mentions(raw));
});

test("the planner never requests a blocked page or coin, and collect refuses a blocked coin left in poolUniverse", () => {
  const repo = process.cwd();
  const root = mkdtempSync(path.join(os.tmpdir(), "lamble-blocked-"));
  try {
    cpSync(path.join(repo, "scripts/frames-refresh"), path.join(root, "scripts/frames-refresh"), { recursive: true });
    cpSync(path.join(repo, "docs/data"), path.join(root, "docs/data"), { recursive: true });
    mkdirSync(path.join(root, "docs/prompts"), { recursive: true });
    const reg = JSON.parse(readFileSync(path.join(repo, "docs/prompts/refresh-market-data.sources.json"), "utf8"));
    const run = path.join(root, "research/lamble/20261031T065600Z");
    const plan = (registry: unknown, stage: string) => {
      writeFileSync(path.join(root, "docs/prompts/refresh-market-data.sources.json"), JSON.stringify(registry));
      return spawnSync("python3", [path.join(root, "scripts/frames-refresh/plan.py"), run, stage], { encoding: "utf8" });
    };
    const t = deployed.tokens[0]!;
    const withCoin = { ...reg, poolUniverse: [...reg.poolUniverse, { ...reg.poolUniverse[0], tokenId: t.tokenId, address: t.tokenId.slice(t.tokenId.indexOf(":") + 1) }] };
    const page = plan({ ...withCoin, dailyEvidence: { ...reg.dailyEvidence, pages: [...reg.dailyEvidence.pages, `https://${deployed.hosts[0]!.host}/`] } }, "discover");
    assert.notEqual(page.status, 0);
    assert.match(page.stderr, /dailyEvidence\.pages holds blocked sites/);
    assert.equal(existsSync(path.join(run, "raw/d1-request.json")), false, "nothing was planned");
    const collect = plan(withCoin, "collect");
    assert.notEqual(collect.status, 0);
    assert.match(collect.stderr, /poolUniverse holds blocked coins/);
    assert.equal(existsSync(path.join(run, "raw/c1-request.json")), false, "nothing was planned");
    const discover = plan(withCoin, "discover");
    assert.equal(discover.status, 0, discover.stderr);
    for (const batch of ["d1", "e1"]) assert.equal(deployedBlocklist().matcher.mentions(readFileSync(path.join(run, `raw/${batch}-request.json`), "utf8")), false, batch);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
