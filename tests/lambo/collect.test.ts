/**
 * Budget-guarded Frames collection against an in-process fake MCP server on localhost. No Frames endpoint,
 * credential or credit is involved; every response below is SYNTHETIC.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { budgetFromEnv, collect, readLedger } from "../../src/lib/lambo/frames/collect.ts";
import { McpClient, McpError, parseSse } from "../../src/lib/lambo/frames/mcp.ts";

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
          ? { run_id: "run_synthetic_1", status, billing: { charged_credits: 7, budget_credits: 10, balance_credits: 1, monthly_grant_credits: 1, percent_remaining: 1 }, result: { calls: [{ seq: 0, tool_id: "synthetic.tool", delivered: true, body_ref: { seq: 0 } }] } }
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
  const root = mkdtempSync(path.join(os.tmpdir(), "lambo-collect-"));
  const dir = path.join(root, "20261020T060000Z");
  mkdirSync(path.join(dir, "raw"), { recursive: true });
  writeFileSync(path.join(dir, "raw", "d1-request.json"), JSON.stringify({ calls: [{ id: "synthetic.tool", args: { q: 1 } }], search_ids: ["srch_synthetic"], idempotency_key: "lamble-20261020T060000Z-d1", max_usd: maxUsd }));
  return { dir, ledger: path.join(root, "ledger.json"), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const noSleep = async () => {};

test("no approved budget: refused before any call", async () => {
  const f = await fakeFrames();
  const r = runDir();
  try {
    assert.equal(budgetFromEnv({}), null);
    assert.equal(budgetFromEnv({ LAMBO_FRAMES_BUDGET_ID: "x", LAMBO_FRAMES_BUDGET_USD: "0" }), null);
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: null, ledgerFile: r.ledger, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
    assert.equal(out[0]!.status, "refused");
    assert.equal(f.calls.length, 0);
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("a reservation larger than the remaining budget is refused", async () => {
  const f = await fakeFrames();
  const r = runDir(0.5);
  try {
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-1", approvedUsd: 0.25 }, ledgerFile: r.ledger, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
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
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-1", approvedUsd: 0.1 }, ledgerFile: r.ledger, client, sleep: noSleep });
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
    const again = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-1", approvedUsd: 0.1 }, ledgerFile: r.ledger, client, sleep: noSleep });
    assert.equal(again[0]!.status, "skipped-complete");
    assert.equal(f.calls.length, before);
    // The reservation stays counted: a second batch of $0.06 no longer fits the $0.10 budget.
    writeFileSync(path.join(r.dir, "raw", "e1-request.json"), JSON.stringify({ calls: [{ id: "synthetic.tool", args: {} }], idempotency_key: "lamble-20261020T060000Z-e1", max_usd: 0.06 }));
    const third = await collect({ runDir: r.dir, batches: ["e1"], budget: { id: "task-1", approvedUsd: 0.1 }, ledgerFile: r.ledger, client, sleep: noSleep });
    assert.equal(third[0]!.status, "refused");
    // Changing the approved amount under the same id is refused: a new approval needs a new id.
    await assert.rejects(collect({ runDir: r.dir, batches: ["e1"], budget: { id: "task-1", approvedUsd: 1 }, ledgerFile: r.ledger, client, sleep: noSleep }), /new budget id/);
  } finally {
    r.cleanup();
    await f.close();
  }
});

test("a run that needs approval is reported and left for a person", async () => {
  const f = await fakeFrames({ runStatus: ["requires_approval"] });
  const r = runDir();
  try {
    const out = await collect({ runDir: r.dir, batches: ["d1"], budget: { id: "task-2", approvedUsd: 1 }, ledgerFile: r.ledger, client: new McpClient({ url: f.url, authorization: "Bearer synthetic-token" }), sleep: noSleep });
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
    await assert.rejects(collect({ runDir: r.dir, batches: ["f1"], budget: { id: "t", approvedUsd: 1 }, ledgerFile: r.ledger, client: null }), /max_usd/);
    await assert.rejects(collect({ runDir: r.dir, batches: ["../x"], budget: null, ledgerFile: r.ledger, client: null }), /Not a batch name/);
  } finally {
    r.cleanup();
  }
});
