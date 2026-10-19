/**
 * Programmatic Frames collection for planned batches; replaces scraping agent transcripts (save.py).
 *
 *   npm run lambo -- collect research/lamble/<run> d1 [e1 ...] [--dry-run]
 *
 * Requires, for any paid call:
 *   LAMBO_FRAMES_BUDGET_ID, LAMBO_FRAMES_BUDGET_USD   owner-approved task budget (never inferred from a balance)
 *   FRAMES_MCP_URL, FRAMES_MCP_AUTHORIZATION          Frames MCP endpoint and its Authorization header value
 * Reservations and outcomes are recorded in data/collect/ledger.json (no secrets).
 */
import path from "node:path";

import { budgetFromEnv, collect } from "../../src/lib/lambo/frames/collect.ts";
import { McpClient } from "../../src/lib/lambo/frames/mcp.ts";
import { repoRoot } from "../../src/lib/lambo/server/io.ts";
import { withLockAsync } from "./lock.ts";

export async function main(argv: string[]): Promise<number> {
  const dryRun = argv.includes("--dry-run");
  const [runArg, ...batches] = argv.filter((a) => !a.startsWith("--"));
  if (!runArg || !batches.length) {
    console.error("usage: lambo collect <research/lamble/RUN> <batch> [batch...] [--dry-run]");
    return 2;
  }
  const runDir = path.resolve(repoRoot(), runArg);
  if (!runDir.startsWith(path.join(repoRoot(), "research", "lamble") + path.sep)) {
    console.error("The run directory must be under research/lamble/.");
    return 2;
  }
  const budget = budgetFromEnv(process.env);
  const url = process.env.FRAMES_MCP_URL;
  const client = url ? new McpClient({ url, authorization: process.env.FRAMES_MCP_AUTHORIZATION ?? null }) : null;
  const outcomes = await withLockAsync("collect", () =>
    collect({ runDir, batches, budget, ledgerFile: path.join(repoRoot(), "data", "collect", "ledger.json"), client, dryRun }),
  );
  for (const o of outcomes) console.log(`${o.batch}: ${o.status} — ${o.detail}${o.chargedCredits != null ? ` (${o.chargedCredits} credits)` : ""}`);
  return outcomes.some((o) => ["failed", "refused", "timeout", "requires_approval"].includes(o.status)) ? 1 : 0;
}
