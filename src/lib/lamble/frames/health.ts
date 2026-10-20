/**
 * Provider health: free Frames calls only. frames_probe_tools (up to 5 ids per call) reports whether each route
 * is live, its quoted price and its live input schema; frames_get_tool returns the catalog descriptor. Nothing
 * else can be called from here, so a health run never spends.
 *
 * Drift is reported, never applied: a live input schema whose argument names differ from the catalog contract,
 * a quoted price that moved, or a descriptor that changed since the previous health file.
 */
import { createHash } from "node:crypto";

import type { Catalog } from "../catalog/catalog.ts";

export const FREE_TOOLS: ReadonlySet<string> = new Set(["frames_probe_tools", "frames_get_tool"]);

export interface ToolCaller {
  callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T>;
}

export interface HealthResult {
  toolId: string;
  capabilities: string[];
  live: boolean | null;
  payable: boolean | null;
  quotePriceUsd: number | null;
  liveInputSchema: unknown;
  descriptorSha256: string | null;
  drift: string[];
  error: string | null;
}

export interface HealthReport {
  date: string;
  probedAt: string;
  method: string;
  credits: 0;
  results: HealthResult[];
}

/** Refuses every tool that is not free, whatever the caller asks for. */
export function freeOnly(client: ToolCaller): ToolCaller {
  return {
    callTool<T>(name: string, args: Record<string, unknown>) {
      if (!FREE_TOOLS.has(name)) return Promise.reject(new Error(`${name} is not a free Frames tool; provider health never calls it`));
      return client.callTool<T>(name, args);
    },
  };
}

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
const props = (schema: unknown) => Object.keys(((schema as { properties?: Record<string, unknown> } | null)?.properties ?? {}) as object).sort();

/** Accepts the probe result as an array, { results: [...] } or an object keyed by tool id. */
export function parseProbe(raw: unknown, ids: string[]): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  const items: [string | undefined, unknown][] = Array.isArray(raw)
    ? raw.map((x) => [undefined, x])
    : raw && typeof raw === "object" && Array.isArray((raw as { results?: unknown }).results)
      ? ((raw as { results: unknown[] }).results.map((x) => [undefined, x]) as [undefined, unknown][])
      : raw && typeof raw === "object"
        ? Object.entries(raw as Record<string, unknown>)
        : [];
  for (const [key, item] of items) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : typeof r.tool_id === "string" ? r.tool_id : key;
    if (id && ids.includes(id)) out.set(id, r);
  }
  return out;
}

export async function runHealthProbes(client: ToolCaller, catalog: Catalog, at: Date, previous: HealthReport | null = null): Promise<HealthReport> {
  const free = freeOnly(client);
  const byTool = new Map<string, string[]>();
  for (const c of catalog.capabilities) {
    if (!c.toolId || !(c.enabled || c.validation.status === "candidate")) continue;
    byTool.set(c.toolId, [...(byTool.get(c.toolId) ?? []), c.key]);
  }
  const ids = [...byTool.keys()].sort();
  const prev = new Map((previous?.results ?? []).map((r) => [r.toolId, r]));
  const results: HealthResult[] = [];
  for (let i = 0; i < ids.length; i += 5) {
    const group = ids.slice(i, i + 5);
    let probed = new Map<string, Record<string, unknown>>();
    let groupError: string | null = null;
    try {
      probed = parseProbe(await free.callTool("frames_probe_tools", { ids: group }), group);
    } catch (e) {
      groupError = (e as Error).message.slice(0, 300);
    }
    for (const id of group) {
      const p = probed.get(id);
      const drift: string[] = [];
      let descriptorSha256: string | null = null;
      let error = groupError ?? (p ? null : "no probe result for this id");
      try {
        const d = await free.callTool("frames_get_tool", { id });
        descriptorSha256 = createHash("sha256").update(JSON.stringify(d)).digest("hex");
      } catch (e) {
        error ??= (e as Error).message.slice(0, 300);
      }
      const schema = p?.input_schema ?? p?.inputSchema ?? null;
      const price = num(p?.price_usd ?? p?.priceUsd ?? p?.quote_price_usd);
      for (const key of byTool.get(id)!) {
        const cap = catalog.capabilities.find((c) => c.key === key)!;
        const expected = props(cap.contract.inputSchema);
        const live = props(schema);
        const missing = expected.filter((x) => !live.includes(x));
        const added = live.filter((x) => !expected.includes(x));
        if (schema && expected.length && (missing.length || added.length)) {
          drift.push(`${key}: live input schema ${[missing.length ? `lacks ${missing.join(", ")}` : null, added.length ? `adds ${added.join(", ")}` : null].filter(Boolean).join(" and ")} against the catalog contract`);
        }
        const hint = cap.payment?.priceHintUsd ?? null;
        if (price !== null && hint !== null && Math.abs(price - hint) > 1e-9) drift.push(`${key}: quoted $${price} vs catalog price hint $${hint}`);
      }
      const before = prev.get(id);
      if (before?.descriptorSha256 && descriptorSha256 && before.descriptorSha256 !== descriptorSha256) drift.push("descriptor changed since the previous health run");
      results.push({ toolId: id, capabilities: byTool.get(id)!, live: bool(p?.live), payable: bool(p?.payable), quotePriceUsd: price, liveInputSchema: schema, descriptorSha256, drift, error });
    }
  }
  const iso = at.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { date: iso.slice(0, 10), probedAt: iso, method: "frames_probe_tools and frames_get_tool only (free; the probe sees the unpaid 402 challenge)", credits: 0, results };
}
