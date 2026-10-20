/**
 * Budget-guarded Frames collection against an in-process fake MCP server on localhost. No Frames endpoint,
 * credential or credit is involved; every response below is SYNTHETIC.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { Catalog } from "../../src/lib/lamble/catalog/catalog.ts";
import { budgetFromEnv, callsByCapability, catalogRefusals, collect, readLedger } from "../../src/lib/lamble/frames/collect.ts";
import { McpClient, McpError, parseSse } from "../../src/lib/lamble/frames/mcp.ts";

interface Fake {
  url: string;
  calls: { name: string; args: Record<string, unknown> }[];
  runStatus: string[];
  close(): Promise<void>;
}

async function fakeFrames(opts: { runStatus?: string[] } = {}): Promise<Fake> {
  const calls: Fake["calls"] = [];
  const statuses = [...(opts.runStatus ?? ["running", "completed"])];
  const body = JSON.stringify({ data: { synthetic: true, rows: [1, 2, 3] } });
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const msg = JSON.parse(raw) as { id?: number; method: string; params: { name: string; arguments: Record<string, unknown> } };
    if (msg.method === "notifications/initialized") return void res.writeHead(202).end();
    if (msg.method === "initialize") {
      res.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "sess-1" });
      return void res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake" } } }));
    }
    assert.equal(req.headers["mcp-session-id"], "sess-1");
    assert.equal(req.headers.authorization, "Bearer synthetic-token");
    const { name, arguments: args } = msg.params;
    calls.push({ name, args });
    let result: unknown;
    if (name === "frames_invoke_tools") result = { run_id: "run_synthetic_1", status: "running" };
    else if (name === "frames_get_run") {
      const status = statuses.shift() ?? "completed";
      result =
        status === "completed"
          ? { run_id: "run_synthetic_1", status, billing: { charged_credits: 7, budget_credits: 10, balance_credits: 1, monthly_grant_credits: 1, percent_remaining: 1 }, result: { calls: [{ seq: 0, tool_id: TOOL, delivered: true, body_ref: { seq: 0 } }] } }
          : { run_id: "run_synthetic_1", status };
    } else if (name === "frames_get_tool_results") {
      const offset = Number(args.offset ?? 0);
      const half = Math.ceil(body.length / 2);
      result = offset === 0 ? { body: body.slice(0, half), next_offset: half } : { body: body.slice(offset), next_offset: null };
    } else result = { error: "unexpected tool" };
    const payload = JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
    if (name === "frames_invoke_tools") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      return void res.end(`event: message\ndata: ${payload}\n\n`);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(payload);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/mcp`, calls, runStatus: statuses, close: () => new Promise((r) => server.close(() => r())) };
}

function runDir(maxUsd = 0.05): { dir: string; ledger: string; cleanup(): void } {
  const root = mkdtempSync(path.join(os.tmpdir(), "lamble-collect-"));
  const dir = path.join(root, "20261020T060000Z");
  mkdirSync(path.join(dir, "raw"), { recursive: true });
  writeFileSync(path.join(dir, "raw", "d1-request.json"), JSON.stringify({ calls: [{ id: TOOL, args: { q: 1 } }], search_ids: ["srch_synthetic"], idempotency_key: "lamble-20261020T060000Z-d1", max_usd: maxUsd }));
  return { dir, ledger: path.join(root, "ledger.json"), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const noSleep = async () => {};
const catalog = JSON.parse(readFileSync(new URL("../../docs/data/providers.json", import.meta.url), "utf8")) as Catalog;
/** A registered, validated capability's tool (defillama.fees: at most 64 calls per run, $0.12 per batch). */
const TOOL = "bazaar.defillama-use-x402atlas-com-fee-summary";

test("no approved budget: refused before any call", async () => {
  const f = await fakeFrames();
  const r = runDir();
  try {
    assert.equal(budgetFromEnv({}), null);
    assert.equal(budgetFromEnv({ LAMBLE_FRAMES_BUDGET_ID: "x", LAMBLE_FRAMES_BUDGET_USD: "0" }), null);
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: null, ledgerFile: r.ledger, catalog, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
    assert.equal(out[0]!.status, "refused");
    assert.equal(f.calls.length, 0);
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("a reservation larger than the remaining budget is refused", async () => {
  const f = await fakeFrames();
  const r = runDir(0.1);
  try {
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-1", approvedUsd: 0.05 }, ledgerFile: r.ledger, catalog, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
    assert.equal(out[0]!.status, "refused");
    assert.match(out[0]!.detail, /exceeds/);
    assert.equal(f.calls.length, 0);
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("collects within budget: same idempotency key and cap, polls, inlines paged bodies, records the charge, never repeats", async () => {
  const f = await fakeFrames();
  const r = runDir(0.05);
  const client = new McpClient({ url: f.url, authorization: "Bearer synthetic-token" });
  try {
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-1", approvedUsd: 0.1 }, ledgerFile: r.ledger, catalog, client, sleep: noSleep });
    assert.equal(out[0]!.status, "completed", out[0]!.detail);
    const invoke = f.calls.find((c) => c.name === "frames_invoke_tools")!;
    assert.equal(invoke.args.idempotency_key, "lamble-20261020T060000Z-d1");
    assert.equal(invoke.args.max_usd, 0.05);
    assert.deepEqual(invoke.args.search_ids, ["srch_synthetic"]);
    const saved = JSON.parse(readFileSync(path.join(r.dir, "raw", "d1.json"), "utf8"));
    assert.equal(saved.status, "completed");
    assert.deepEqual(saved.result.calls[0].body, { data: { synthetic: true, rows: [1, 2, 3] } });
    const ledger = readLedger(r.ledger);
    assert.equal(ledger.budgets["task-1"]!.entries[0]!.status, "completed");
    assert.equal(ledger.budgets["task-1"]!.entries[0]!.chargedCredits, 7);
    const before = f.calls.length;
    const again = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-1", approvedUsd: 0.1 }, ledgerFile: r.ledger, catalog, client, sleep: noSleep });
    assert.equal(again[0]!.status, "skipped-complete");
    assert.equal(f.calls.length, before);
    // The reservation stays counted: a second batch of $0.06 no longer fits the $0.10 budget.
    writeFileSync(path.join(r.dir, "raw", "e1-request.json"), JSON.stringify({ calls: [{ id: TOOL, args: {} }], idempotency_key: "lamble-20261020T060000Z-e1", max_usd: 0.06 }));
    const third = await collect({ runDir: r.dir, batches: ["e1"], budget: { id: "task-1", approvedUsd: 0.1 }, ledgerFile: r.ledger, catalog, client, sleep: noSleep });
    assert.equal(third[0]!.status, "refused");
    // Changing the approved amount under the same id is refused: a new approval needs a new id.
    await assert.rejects(collect({ runDir: r.dir, batches: ["e1"], budget: { id: "task-1", approvedUsd: 1 }, ledgerFile: r.ledger, catalog, client, sleep: noSleep }), /new budget id/);
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("a run that needs approval is reported and left for a person", async () => {
  const f = await fakeFrames({ runStatus: ["requires_approval"] });
  const r = runDir();
  try {
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-2", approvedUsd: 1 }, ledgerFile: r.ledger, catalog, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
    assert.equal(out[0]!.status, "requires_approval");
    assert.ok(!f.calls.some((c) => /approve/.test(c.name)));
    assert.equal(readLedger(r.ledger).budgets["task-2"]!.entries[0]!.status, "requires_approval");
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("MCP transport: https only, no credentials in the URL, SSE parsed by request id", () => {
  assert.throws(() => new McpClient({ url: "http://frames.example/mcp" }), McpError);
  assert.throws(() => new McpClient({ url: "https://user:pass@frames.example/mcp" }), /Credentials/);
  assert.doesNotThrow(() => new McpClient({ url: "https://frames.example/mcp" }));
  const sse = `data: {"jsonrpc":"2.0","id":1,"result":{"a":1}}\n\nevent: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"b":2}}\n\n`;
  assert.deepEqual(parseSse(sse, 2)?.result, { b: 2 });
  assert.equal(parseSse(sse, 3), null);
});

test("malformed requests are rejected before spending", async () => {
  const r = runDir();
  try {
    writeFileSync(path.join(r.dir, "raw", "f1-request.json"), JSON.stringify({ calls: [{ id: "x", args: {} }], idempotency_key: "k" }));
    await assert.rejects(collect({ runDir: r.dir, batches: ["f1"], budget: { id: "t", approvedUsd: 1 }, ledgerFile: r.ledger, catalog, client: null }), /max_usd/);
    await assert.rejects(collect({ runDir: r.dir, batches: ["../x"], budget: null, ledgerFile: r.ledger, catalog, client: null }), /Not a batch name/);
  } finally {
    r.cleanup();
  }
});

test("catalog limits: unregistered, discovered and blocked tools, per-run call caps and per-batch USD caps refuse before any call", async () => {
  const req = (calls: { id: string; args: Record<string, unknown> }[], max = 0.01) => ({ calls, idempotency_key: "k", max_usd: max });
  assert.match(catalogRefusals(catalog, req([{ id: "bazaar.unknown-tool", args: {} }]), new Map()).join(), /no registered capability/);
  assert.match(catalogRefusals(catalog, req([{ id: "mpp.dune.post.api-v1-sql-execute", args: {} }]), new Map()).join(), /status blocked/);
  assert.match(catalogRefusals(catalog, req([{ id: "bazaar.fomo-x4o2-com-v1-search", args: {} }]), new Map()).join(), /status discovered/);
  assert.match(catalogRefusals(catalog, req([{ id: TOOL, args: {} }], 0.5), new Map()).join(), /exceeds the batch cap \$0\.12/);
  assert.match(catalogRefusals(catalog, req([{ id: TOOL, args: {} }]), new Map([["defillama.fees", 64]])).join(), /65 call\(s\) in this run exceed maxCallsPerRun 64/);
  assert.deepEqual(catalogRefusals(catalog, req([{ id: TOOL, args: {} }]), new Map([["defillama.fees", 63]])), []);

  const f = await fakeFrames();
  const r = runDir();
  try {
    writeFileSync(path.join(r.dir, "raw", "g1-request.json"), JSON.stringify(req([{ id: "bazaar.unknown-tool", args: {} }])));
    const out = await collect({ runDir: r.dir, batches: ["g1"], budget: { id: "task-3", approvedUsd: 1 }, ledgerFile: r.ledger, catalog, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
    assert.equal(out[0]!.status, "refused");
    assert.equal(f.calls.length, 0, "nothing reaches Frames");
    assert.deepEqual(readLedger(r.ledger), { budgets: {} }, "nothing is reserved");
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("every retained daily plan since getTokenBars passes the catalog limits", () => {
  const root = new URL("../../research/lamble/", import.meta.url).pathname;
  let checked = 0;
  for (const run of readdirSync(root).filter((d) => /^2026(100[3-9]|10[1-3]\d)T/.test(d))) {
    const raw = path.join(root, run, "raw");
    const prior = new Map<string, number>();
    for (const f of readdirSync(raw).filter((x) => /^[a-z]\d{1,2}-request\.json$/.test(x)).sort()) {
      const r = JSON.parse(readFileSync(path.join(raw, f), "utf8"));
      assert.deepEqual(catalogRefusals(catalog, r, prior), [], `${run}/${f}`);
      for (const [k, n] of callsByCapability(catalog, r).counts) prior.set(k, (prior.get(k) ?? 0) + n);
      checked++;
    }
  }
  assert.ok(checked > 50, `checked ${checked} batches`);
});

test("batches are paced at least minIntervalMs apart", async () => {
  const f = await fakeFrames({ runStatus: ["completed", "completed"] });
  const r = runDir();
  const waits: number[] = [];
  try {
    writeFileSync(path.join(r.dir, "raw", "d2-request.json"), JSON.stringify({ calls: [{ id: TOOL, args: { q: 2 } }], idempotency_key: "lamble-20261020T060000Z-d2", max_usd: 0.05 }));
    const out = await collect({ runDir: r.dir, batches: ["d1", "d2"], budget: { id: "task-4", approvedUsd: 1 }, ledgerFile: r.ledger, catalog, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), minIntervalMs: 60_000, sleep: async (ms) => void waits.push(ms) });
    assert.deepEqual(out.map((o) => o.status), ["completed", "completed"]);
    assert.ok(waits.some((w) => w > 50_000), `paced: ${waits.join(",")}`);
  } finally {
    r.cleanup();
    await f.close();
  }
});
