/**
 * Publication safety: staged releases, atomic pointer moves, rejection, checksums, change cursors and
 * ingestion rollback. Uses temporary data directories; never touches data/ in the repository.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { codexTokenSnapshot } from "../../src/lib/lamble/adapters/codex.ts";
import { getCapability, type Catalog } from "../../src/lib/lamble/catalog/catalog.ts";
import { correctionChanges, diffReleases } from "../../src/lib/lamble/release/changes.ts";

const root = new URL("../../", import.meta.url).pathname;
const catalog = JSON.parse(readFileSync(path.join(root, "docs/data/providers.json"), "utf8")) as Catalog;

function tempData() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "lamble-test-"));
  process.env.LAMBLE_DATA_DIR = dir;
  return dir;
}

async function publishModule() {
  return import("../../scripts/lamble/release/publish.ts");
}

const minimalPublic = (marker: number) => ({
  coins: [],
  narratives: [],
  launchpads: [],
  market: { feeSubtotal: { anchor: `2026-10-${10 + marker}T00:00:00Z`, value: marker } } as never,
  evidence: {},
  coverage: [],
  evaluation: null,
  methods: { holderComponents: [], providerPanels: [], bottomingEvaluationTimes: [] },
});

function stageInput(marker: number, checks: { id: string; passed: boolean; detail: string }[]) {
  return {
    latestRun: "20261019T055754Z",
    sourceRuns: ["20261019T055754Z"],
    dataCutoff: "2026-10-19T06:21:26Z",
    dataThrough: { financial: null, hourlyVolume: null, dailyVolume: null, prices: null, membership: "2026-10-19T05:57:54Z" },
    methodVersions: {},
    counts: {},
    publicContent: minimalPublic(marker),
    bundles: { coins: {} },
    checks,
    changes: [{ entityType: "market" as const, entityId: "fees", kind: "market.financial-day", summary: `day ${marker}`, from: null, to: marker }],
    reconstructedChanges: false,
    limitations: [],
  };
}

test("a rejected or partial release never replaces the last valid release; changes keep one cursor", async () => {
  const dir = tempData();
  try {
    const { stageAndPublish, readPointer, readChanges } = await publishModule();
    const ok = stageAndPublish(stageInput(1, [{ id: "all", passed: true, detail: "" }]));
    assert.equal(ok.status, "published");
    const first = readPointer()!.releaseId;
    // Same content again: nothing moves.
    assert.equal(stageAndPublish(stageInput(1, [{ id: "all", passed: true, detail: "" }])).status, "unchanged");
    // A build that fails validation (for example a provider schema change caught by the normalizer cross-check) is rejected.
    const bad = stageAndPublish(stageInput(2, [{ id: "fees-match-normalizer", passed: false, detail: "7-day fees differ" }]));
    assert.equal(bad.status, "rejected");
    assert.equal(readPointer()!.releaseId, first);
    assert.ok(existsSync(path.join(dir, "staging", `rejected-${bad.releaseId}`)));
    assert.ok(!existsSync(path.join(dir, "releases", bad.releaseId)));
    assert.equal(readChanges().length, 1, "rejected builds add no change events");
    // The next valid release moves the pointer and continues the cursor.
    const next = stageAndPublish(stageInput(3, [{ id: "all", passed: true, detail: "" }]));
    assert.equal(next.status, "published");
    assert.equal(readPointer()!.previousReleaseId, first);
    assert.deepEqual(readChanges().map((c) => c.seq), [1, 2]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.LAMBLE_DATA_DIR;
  }
});

test("the service refuses tampered release files and invalid identifiers", async () => {
  const dir = tempData();
  try {
    const { stageAndPublish } = await publishModule();
    const r = stageAndPublish(stageInput(4, [{ id: "all", passed: true, detail: "" }]));
    const service = await import("../../src/lib/lamble/service.ts");
    assert.throws(() => service.loadRelease("../../etc/passwd"), service.BadRequest);
    assert.throws(() => service.getNarrative("../x"), service.BadRequest);
    assert.throws(() => service.getEdition("2026-42"), service.BadRequest);
    assert.throws(() => service.parseCoinRoute("solana", "not-an-address"), service.BadRequest);
    assert.throws(() => service.parseCoinRoute("polygon", "0x183ffbed812202a4dea1ef8a86b52f3b09f6ffff"), service.NotFound);
    service.resetCaches();
    const file = path.join(dir, "releases", r.releaseId, "public.json");
    writeFileSync(file, readFileSync(file, "utf8").replace('"value":4', '"value":5'));
    assert.throws(() => service.loadRelease(r.releaseId), /checksum/);
    // Change cursors: paging and filtering.
    const page = service.changesSince(0, { limit: 1 });
    assert.equal(page.events.length, 1);
    assert.equal(page.nextCursor, 1);
    assert.equal(service.changesSince(page.nextCursor).events.length, 0);
    assert.throws(() => service.changesSince(-1), service.BadRequest);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.LAMBLE_DATA_DIR;
  }
});

test("malformed provider data produces no observations", () => {
  const cap = getCapability(catalog, "codex.token-snapshot");
  const q = '{filterTokens(tokens:["DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP:1399811149"],limit:2){results{pair{address}}}}';
  for (const body of [null, { errors: [{ message: "field renamed" }] }, { data: { filterTokens: { results: [{ pair: { token0: "x" }, priceUSD: "abc" }] } } }]) {
    const out = codexTokenSnapshot.normalize({ body, request: { id: "mpp.codex.post.graphql", args: { query: q } }, capability: cap, fetchedAt: 0 });
    assert.equal(out.observations.length, 0, JSON.stringify(body));
  }
});

test("a failed ingest rolls back the whole run and stops before later runs", async () => {
  const research = mkdtempSync(path.join(os.tmpdir(), "lamble-research-"));
  const data = mkdtempSync(path.join(os.tmpdir(), "lamble-db-"));
  process.env.LAMBLE_RESEARCH_DIR = research;
  process.env.LAMBLE_DB_PATH = path.join(data, "lamble.sqlite");
  try {
    for (const run of ["20261017T055714Z", "20261018T055734Z", "20261019T055754Z"]) cpSync(path.join(root, "research/lamble", run), path.join(research, run), { recursive: true });
    // Truncate a raw response of the middle run: its transaction must roll back and the later run must wait.
    const raw = path.join(research, "20261018T055734Z", "raw", "c2.json");
    writeFileSync(raw, readFileSync(raw, "utf8").slice(0, 5000));
    const { ingest } = await import("../../scripts/lamble/ingest.ts");
    const result = ingest({ rebuild: true });
    assert.deepEqual(result.ingested, ["20261017T055714Z"]);
    assert.equal(result.failed[0]?.run, "20261018T055734Z");
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(process.env.LAMBLE_DB_PATH);
    const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    assert.equal(count("SELECT count(*) n FROM runs WHERE run_id = '20261018T055734Z'"), 0);
    assert.equal(count("SELECT count(*) n FROM observations WHERE run_id = '20261018T055734Z'"), 0);
    assert.equal(count("SELECT count(*) n FROM frames_calls WHERE run_id = '20261018T055734Z'"), 0);
    assert.equal(count("SELECT count(*) n FROM runs WHERE run_id = '20261019T055754Z'"), 0);
    assert.ok(count("SELECT count(*) n FROM observations WHERE run_id = '20261017T055714Z'") > 0);
    db.close();
  } finally {
    rmSync(research, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
    delete process.env.LAMBLE_RESEARCH_DIR;
    delete process.env.LAMBLE_DB_PATH;
  }
});

test("change events: featured removal is announced without ending membership", () => {
  const base = { coins: [], market: { feeSubtotal: { anchor: "x", value: 1 } } } as never;
  const n = (featured: boolean, state: "collected" | "collection_paused") => ({ id: "n1", slug: "n1", title: "N1", featured: { featured, rank: null }, lifecycle: { state }, trend: "steady" }) as never;
  const changes = diffReleases({ ...(base as object), narratives: [n(true, "collected")] } as never, { ...(base as object), narratives: [n(false, "collection_paused")] } as never);
  assert.ok(changes.some((c) => c.kind === "narrative.featured" && /membership unchanged/.test(c.summary)));
  assert.ok(changes.some((c) => c.kind === "narrative.lifecycle"));
});

test("corrections: each restated coin or launchpad gets one event, plus a release summary; unmapped rows count only there", () => {
  const rows = [
    { entity_type: "token", entity_id: "solana:aaa", metric: "token.volume_usd", n: 3, first_window: Date.UTC(2026, 9, 10) / 1000, last_window: Date.UTC(2026, 9, 12) / 1000 },
    { entity_type: "token", entity_id: "solana:aaa", metric: "token.price_close_usd", n: 1, first_window: Date.UTC(2026, 9, 12) / 1000, last_window: Date.UTC(2026, 9, 12) / 1000 },
    { entity_type: "venue_provider", entity_id: "pump.fun", metric: "venue.fees_usd", n: 2, first_window: Date.UTC(2026, 9, 1) / 1000, last_window: Date.UTC(2026, 9, 2) / 1000 },
    { entity_type: "token", entity_id: "solana:untracked", metric: "token.volume_usd", n: 5, first_window: null, last_window: null },
  ];
  const out = correctionChanges(rows, { coin: new Map([["solana:aaa", "AAA"]]), venue: new Map([["pump.fun", "pumpfun"]]) });
  assert.deepEqual(
    out.map((e) => [e.entityType, e.entityId, e.kind]),
    [
      ["coin", "solana:aaa", "correction.restated"],
      ["launchpad", "pumpfun", "correction.restated"],
      ["release", "observations", "release.corrections"],
    ],
  );
  assert.match(out[0]!.summary, /AAA: the source restated 4 earlier value\(s\).*2026-10-10 to 2026-10-12\. Originals are kept\./);
  assert.equal((out[2]!.to as { revised: number }).revised, 11);
  assert.deepEqual(correctionChanges([], { coin: new Map(), venue: new Map() }), []);
});

test("events recorded after a release (research, editions) continue the same cursor", async () => {
  const dir = tempData();
  try {
    const { stageAndPublish, appendChangeEvents, readChanges } = await publishModule();
    const ok = stageAndPublish(stageInput(1, [{ id: "all", passed: true, detail: "" }]));
    assert.equal(ok.status, "published");
    const added = appendChangeEvents(
      [
        { entityType: "edition", entityId: "2026-W42", kind: "edition.published", summary: "W42 published.", from: null, to: { revision: 1 } },
        { entityType: "research", entityId: "daily-2026-10-19", kind: "research.published", summary: "New research.", from: null, to: {} },
      ],
      ok.releaseId,
    );
    const all = readChanges();
    assert.deepEqual(all.map((e) => e.seq), [1, 2, 3]);
    assert.deepEqual(added.map((e) => [e.seq, e.releaseId, e.reconstructed]), [
      [2, ok.releaseId, false],
      [3, ok.releaseId, false],
    ]);
    assert.deepEqual(appendChangeEvents([], ok.releaseId), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.LAMBLE_DATA_DIR;
  }
});
