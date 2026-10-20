/**
 * Provider health runs only free Frames tools, against an in-process fake MCP server. Every response is
 * SYNTHETIC; no Frames endpoint or credential is involved.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Catalog } from "../../src/lib/lamble/catalog/catalog.ts";
import { FREE_TOOLS, freeOnly, parseProbe, runHealthProbes } from "../../src/lib/lamble/frames/health.ts";
import { McpClient } from "../../src/lib/lamble/frames/mcp.ts";

const catalog = JSON.parse(readFileSync(new URL("../../docs/data/providers.json", import.meta.url), "utf8")) as Catalog;
const PUMP_HOLDERS = "bazaar.pump-x4o2-com-v1-coin-mint-holders";

async function fakeFrames() {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const msg = JSON.parse(raw) as { id?: number; method: string; params: { name: string; arguments: Record<string, unknown> } };
    if (msg.method === "notifications/initialized") return void res.writeHead(202).end();
    if (msg.method === "initialize") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return void res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake" } } }));
    }
    const { name, arguments: args } = msg.params;
    calls.push({ name, args });
    let result: unknown;
    if (name === "frames_probe_tools") {
      result = {
        results: (args.ids as string[]).map((id) => ({
          id,
          live: id !== PUMP_HOLDERS,
          payable: true,
          price_usd: 0.001,
          // The holders route renames its argument: drift the run must report.
          input_schema: id === PUMP_HOLDERS ? { type: "object", properties: { address: { type: "string" } } } : (catalog.capabilities.find((c) => c.toolId === id)?.contract.inputSchema ?? {}),
        })),
      };
    } else if (name === "frames_get_tool") result = { id: args.id, description: "synthetic descriptor" };
    else result = { error: "unexpected" };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/mcp`, calls, close: () => new Promise<void>((r) => server.close(() => r())) };
}

test("health probes use only free tools, five ids per probe, and report drift without applying it", async () => {
  const f = await fakeFrames();
  try {
    const report = await runHealthProbes(new McpClient({ url: f.url }), catalog, new Date("2026-10-20T08:00:00Z"));
    assert.ok(f.calls.every((c) => FREE_TOOLS.has(c.name)), "only frames_probe_tools and frames_get_tool");
    const probes = f.calls.filter((c) => c.name === "frames_probe_tools");
    assert.ok(probes.every((c) => (c.args.ids as string[]).length <= 5));
    const ids = new Set(catalog.capabilities.filter((c) => c.toolId && (c.enabled || c.validation.status === "candidate")).map((c) => c.toolId));
    assert.equal(report.results.length, ids.size);
    assert.equal(report.credits, 0);
    const holders = report.results.find((r) => r.toolId === PUMP_HOLDERS)!;
    assert.equal(holders.live, false);
    assert.match(holders.drift.join(), /pump.holders: live input schema lacks limit, maxAge, mint, stale and adds address/);
    const before = JSON.stringify(catalog);
    assert.equal(JSON.stringify(catalog), before, "the catalog is not modified");
    // A changed descriptor since the previous run is drift too.
    const previous = { ...report, results: report.results.map((r) => ({ ...r, descriptorSha256: "0".repeat(64) })) };
    const again = await runHealthProbes(new McpClient({ url: f.url }), catalog, new Date("2026-10-21T08:00:00Z"), previous);
    assert.ok(again.results.every((r) => r.drift.includes("descriptor changed since the previous health run")));
  } finally {
    await f.close();
  }
});

test("the health runner's client refuses every non-free tool before it reaches Frames", async () => {
  const asked: string[] = [];
  const client = {
    callTool: async <T>(name: string): Promise<T> => {
      asked.push(name);
      return {} as T;
    },
  };
  await assert.rejects(freeOnly(client).callTool("frames_invoke_tools", { calls: [] }), /not a free Frames tool/);
  await assert.rejects(freeOnly(client).callTool("frames_run_capability", {}), /not a free Frames tool/);
  assert.deepEqual(asked, []);
  await freeOnly(client).callTool("frames_get_tool", { id: "x" });
  assert.deepEqual(asked, ["frames_get_tool"]);
  assert.deepEqual(parseProbe({ "a.b": { live: true } }, ["a.b"]).get("a.b"), { live: true });
  assert.deepEqual([...parseProbe([{ tool_id: "a.b", live: false }, { id: "other" }], ["a.b"]).keys()], ["a.b"]);
});
