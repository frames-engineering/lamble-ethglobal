/**
 * Budget-guarded Frames collection: runs planned batches (raw/<batch>-request.json written by
 * scripts/frames-refresh/plan.py and discover.py) and saves each completed run as raw/<batch>.json in the same
 * shape the transcript-scraping save.py produced, so normalize.py reads it unchanged.
 *
 * Spending rules, enforced before any paid call:
 * - An owner-approved budget must be supplied (budget id + USD amount). No budget, no paid call.
 * - Each batch reserves its request's max_usd; a batch runs only if the reservation fits what is left of the
 *   budget after every earlier reservation under the same budget id. max_usd is also passed to Frames, which
 *   never bills a batch above it.
 * - The request's idempotency key is passed unchanged, so a retried batch returns the same Frames run and
 *   never pays twice. A batch already saved as completed is skipped.
 * - A run that needs approval is reported, never approved here.
 * - Every call must belong to a registered capability that may be called (validated or candidate; never discovered,
 *   blocked or deprecated). A run never exceeds a capability's cost.maxCallsPerRun, and a batch's max_usd never
 *   exceeds the sum of its capabilities' cost.maxUsdPerBatch (docs/data/providers.json).
 * - Batches are paced: at least minIntervalMs between invocations.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { type Capability, type Catalog, capabilityFor } from "../catalog/catalog.ts";
import { writeJsonAtomic } from "../server/io.ts";
import type { McpClient } from "./mcp.ts";

export interface BatchRequest {
  calls: { id: string; args: Record<string, unknown> }[];
  search_ids?: string[];
  idempotency_key: string;
  max_usd: number;
}

export interface LedgerEntry {
  run: string;
  batch: string;
  idempotencyKey: string;
  reservedUsd: number;
  framesRunId: string | null;
  status: "reserved" | "completed" | "failed" | "requires_approval" | "timeout";
  chargedCredits: number | null;
  at: string;
}

export interface Ledger {
  budgets: Record<string, { approvedUsd: number; entries: LedgerEntry[] }>;
}

export interface Budget {
  id: string;
  approvedUsd: number;
}

export class BudgetError extends Error {}

/** Reads the owner-approved budget from the environment. Both values are required. */
export function budgetFromEnv(env: Record<string, string | undefined>): Budget | null {
  const id = env.LAMBLE_FRAMES_BUDGET_ID?.trim();
  const usd = Number(env.LAMBLE_FRAMES_BUDGET_USD);
  if (!id || !/^[A-Za-z0-9._-]{1,80}$/.test(id) || !Number.isFinite(usd) || usd <= 0) return null;
  return { id, approvedUsd: usd };
}

export function readLedger(file: string): Ledger {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Ledger) : { budgets: {} };
}

/** USD already reserved under a budget: every entry except failed ones whose Frames run never started. */
export function reservedUsd(ledger: Ledger, budgetId: string): number {
  return (ledger.budgets[budgetId]?.entries ?? []).filter((e) => !(e.status === "failed" && e.framesRunId === null)).reduce((s, e) => s + e.reservedUsd, 0);
}

export function validateRequest(raw: unknown, batch: string): BatchRequest {
  const r = raw as Partial<BatchRequest>;
  if (!r || !Array.isArray(r.calls) || r.calls.length < 1 || r.calls.length > 10) throw new Error(`${batch}: 1 to 10 calls required`);
  for (const c of r.calls) if (!c || typeof c.id !== "string" || typeof c.args !== "object" || c.args === null) throw new Error(`${batch}: malformed call`);
  if (typeof r.idempotency_key !== "string" || !r.idempotency_key) throw new Error(`${batch}: idempotency_key required`);
  if (typeof r.max_usd !== "number" || !(r.max_usd > 0)) throw new Error(`${batch}: max_usd must be a positive number (it caps the bill)`);
  return r as BatchRequest;
}

const NOT_CALLABLE = new Set(["discovered", "blocked", "deprecated"]);

/** Calls per capability in one batch request; calls without a registered capability are listed by tool id. */
export function callsByCapability(catalog: Catalog, req: Pick<BatchRequest, "calls">): { counts: Map<string, number>; caps: Map<string, Capability>; unregistered: string[] } {
  const counts = new Map<string, number>();
  const caps = new Map<string, Capability>();
  const unregistered: string[] = [];
  for (const call of req.calls) {
    const cap = capabilityFor(catalog, call.id, call.args);
    if (!cap) {
      unregistered.push(call.id);
      continue;
    }
    counts.set(cap.key, (counts.get(cap.key) ?? 0) + 1);
    caps.set(cap.key, cap);
  }
  return { counts, caps, unregistered };
}

/** Catalog refusals for a batch, given the calls the run already made per capability. Empty means allowed. */
export function catalogRefusals(catalog: Catalog, req: BatchRequest, priorCalls: ReadonlyMap<string, number>): string[] {
  const problems: string[] = [];
  const { counts, caps, unregistered } = callsByCapability(catalog, req);
  for (const id of unregistered) problems.push(`${id}: no registered capability for this tool and request`);
  for (const [key, n] of counts) {
    const cap = caps.get(key)!;
    if (NOT_CALLABLE.has(cap.validation.status)) problems.push(`${key}: status ${cap.validation.status}; never called`);
    const total = n + (priorCalls.get(key) ?? 0);
    if (total > cap.cost.maxCallsPerRun) problems.push(`${key}: ${total} call(s) in this run exceed maxCallsPerRun ${cap.cost.maxCallsPerRun}`);
  }
  const cap = [...caps.values()].reduce((a, c) => a + c.cost.maxUsdPerBatch, 0);
  if (req.max_usd > cap + 1e-9) problems.push(`max_usd $${req.max_usd} exceeds the batch cap $${cap.toFixed(2)} (sum of its capabilities' maxUsdPerBatch)`);
  return problems;
}

interface FramesRun {
  run_id: string;
  status: string;
  billing?: { charged_credits?: number };
  result?: { calls?: Record<string, unknown>[] };
  [k: string]: unknown;
}

/** Inlines body_ref rows with the free frames_get_tool_results, following pages to the end. */
async function resolveBodies(client: McpClient, run: FramesRun): Promise<void> {
  for (const row of run.result?.calls ?? []) {
    if (row.body !== undefined || typeof row.seq !== "number" || !("body_ref" in row)) continue;
    let offset = 0;
    let text = "";
    for (let page = 0; page < 200; page++) {
      const r = await client.callTool<{ body?: unknown; text?: string; next_offset?: number | null }>("frames_get_tool_results", { run_id: run.run_id, seq: row.seq, offset, limit: 60_000 });
      if (typeof r.body !== "undefined" && typeof r.body !== "string") {
        row.body = r.body;
        break;
      }
      text += typeof r.body === "string" ? r.body : (r.text ?? "");
      if (r.next_offset === null || r.next_offset === undefined) {
        try {
          row.body = JSON.parse(text);
        } catch {
          row.body = text;
        }
        break;
      }
      offset = r.next_offset;
    }
  }
}

export interface CollectOptions {
  runDir: string;
  batches: string[];
  budget: Budget | null;
  ledgerFile: string;
  client: McpClient | null;
  catalog: Catalog;
  /** Minimum time between two batch invocations (default 2000 ms). */
  minIntervalMs?: number;
  dryRun?: boolean;
  pollMs?: number;
  timeoutMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface BatchOutcome {
  batch: string;
  status: "skipped-complete" | "planned" | "completed" | "failed" | "requires_approval" | "timeout" | "refused";
  detail: string;
  framesRunId?: string;
  chargedCredits?: number | null;
}

export async function collect(o: CollectOptions): Promise<BatchOutcome[]> {
  const now = o.now ?? (() => new Date());
  const sleep = o.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const run = path.basename(o.runDir);
  const out: BatchOutcome[] = [];
  const requests = o.batches.map((batch) => {
    if (!/^[a-z][0-9]{1,2}$/.test(batch)) throw new Error(`Not a batch name: ${batch}`);
    const file = path.join(o.runDir, "raw", `${batch}-request.json`);
    if (!existsSync(file)) throw new Error(`${batch}: no request file ${file}; run plan.py first`);
    return { batch, req: validateRequest(JSON.parse(readFileSync(file, "utf8")), batch), saved: path.join(o.runDir, "raw", `${batch}.json`) };
  });

  // Calls the run already made: batches saved by an earlier collection of this run (any outcome that reached Frames).
  const priorCalls = new Map<string, number>();
  const count = (req: BatchRequest) => {
    for (const [k, n] of callsByCapability(o.catalog, req).counts) priorCalls.set(k, (priorCalls.get(k) ?? 0) + n);
  };
  const listed = new Set(requests.map((r) => r.batch));
  const rawDir = path.join(o.runDir, "raw");
  for (const f of existsSync(rawDir) ? readdirSync(rawDir) : []) {
    const m = /^([a-z][0-9]{1,2})-request\.json$/.exec(f);
    if (!m || listed.has(m[1]!) || !existsSync(path.join(rawDir, `${m[1]}.json`))) continue;
    count(validateRequest(JSON.parse(readFileSync(path.join(rawDir, f), "utf8")), m[1]!));
  }
  let lastInvoke = -Infinity;

  for (const { batch, req, saved } of requests) {
    if (existsSync(saved) && (JSON.parse(readFileSync(saved, "utf8")) as FramesRun).status === "completed") {
      count(req);
      out.push({ batch, status: "skipped-complete", detail: `${saved} already holds a completed run` });
      continue;
    }
    const refusals = catalogRefusals(o.catalog, req, priorCalls);
    if (refusals.length) {
      out.push({ batch, status: "refused", detail: `Catalog limits: ${refusals.join("; ")}. No call made.` });
      continue;
    }
    if (o.dryRun) {
      count(req);
      out.push({ batch, status: "planned", detail: `${req.calls.length} call(s), reserve $${req.max_usd}, key ${req.idempotency_key}` });
      continue;
    }
    if (!o.budget) {
      out.push({ batch, status: "refused", detail: "No owner-approved budget (LAMBLE_FRAMES_BUDGET_ID and LAMBLE_FRAMES_BUDGET_USD); no paid call made." });
      continue;
    }
    if (!o.client) {
      out.push({ batch, status: "refused", detail: "No Frames MCP endpoint configured (FRAMES_MCP_URL); no call made." });
      continue;
    }
    const ledger = readLedger(o.ledgerFile);
    const book = (ledger.budgets[o.budget.id] ??= { approvedUsd: o.budget.approvedUsd, entries: [] });
    if (book.approvedUsd !== o.budget.approvedUsd) {
      throw new BudgetError(`Budget ${o.budget.id} was recorded as $${book.approvedUsd}, now $${o.budget.approvedUsd}; use a new budget id for a new approval.`);
    }
    const prior = book.entries.find((e) => e.idempotencyKey === req.idempotency_key && e.framesRunId);
    const remaining = o.budget.approvedUsd - reservedUsd(ledger, o.budget.id);
    if (!prior && req.max_usd > remaining + 1e-9) {
      out.push({ batch, status: "refused", detail: `Reservation $${req.max_usd} exceeds the $${remaining.toFixed(4)} left of budget ${o.budget.id}; no paid call made.` });
      continue;
    }
    // Reserve before calling, so a crash between invoke and save still counts against the budget.
    const entry: LedgerEntry = prior ?? { run, batch, idempotencyKey: req.idempotency_key, reservedUsd: req.max_usd, framesRunId: null, status: "reserved", chargedCredits: null, at: now().toISOString() };
    if (!prior) book.entries.push(entry);
    writeJsonAtomic(o.ledgerFile, ledger);

    const wait = lastInvoke + (o.minIntervalMs ?? 2000) - Date.now();
    if (wait > 0) await sleep(wait);
    lastInvoke = Date.now();
    count(req);
    let started: FramesRun;
    try {
      started = await o.client.callTool<FramesRun>("frames_invoke_tools", {
        calls: req.calls,
        idempotency_key: req.idempotency_key,
        max_usd: req.max_usd,
        ...(req.search_ids?.length ? { search_ids: req.search_ids } : {}),
      });
    } catch (e) {
      entry.status = "failed";
      writeJsonAtomic(o.ledgerFile, ledger);
      out.push({ batch, status: "failed", detail: `invoke failed: ${(e as Error).message}` });
      continue;
    }
    entry.framesRunId = started.run_id;
    writeJsonAtomic(o.ledgerFile, ledger);

    let current = started;
    const deadline = Date.now() + (o.timeoutMs ?? 15 * 60_000);
    while (!(current.status === "completed" && current.billing) && !["failed", "cancelled", "requires_approval"].includes(current.status)) {
      if (Date.now() > deadline) break;
      await sleep(o.pollMs ?? 5000);
      current = await o.client.callTool<FramesRun>("frames_get_run", { run_id: started.run_id });
    }
    if (current.status === "requires_approval") {
      entry.status = "requires_approval";
      writeJsonAtomic(o.ledgerFile, ledger);
      out.push({ batch, status: "requires_approval", detail: `Frames run ${current.run_id} requires approval; approve or cancel it in Frames, then rerun.`, framesRunId: current.run_id });
      continue;
    }
    if (current.status !== "completed" || !current.billing) {
      entry.status = current.status === "failed" || current.status === "cancelled" ? "failed" : "timeout";
      writeJsonAtomic(o.ledgerFile, ledger);
      out.push({ batch, status: entry.status === "failed" ? "failed" : "timeout", detail: `Frames run ${current.run_id} ended ${current.status}`, framesRunId: current.run_id });
      continue;
    }
    await resolveBodies(o.client, current);
    writeJsonAtomic(saved, current);
    entry.status = "completed";
    entry.chargedCredits = current.billing.charged_credits ?? null;
    writeJsonAtomic(o.ledgerFile, ledger);
    out.push({ batch, status: "completed", detail: `saved ${saved}`, framesRunId: current.run_id, chargedCredits: entry.chargedCredits });
  }
  return out;
}
