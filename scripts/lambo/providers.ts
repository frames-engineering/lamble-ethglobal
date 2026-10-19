/**
 * Provider catalog commands. Offline; never spends.
 *
 *   validate                         JSON schema + rule checks for docs/data/providers.json, jobs.json references
 *   matrix [--out <file>]            machine-readable coverage matrix (default docs/data/provider-coverage.json)
 *   inspect <capability> <sample>    print a retained response's paths and suggest field-map entries
 *   smoke <capability> <sample> --map <fieldmap.json>
 *                                    run the capability's adapter on the sample with a proposed map (validation mode)
 *   register <capability> --map <fieldmap.json> --sample <retained sample>
 *                                    write a smoke-tested field map (verifiedAgainst = sample); status stays candidate
 *   enable <capability>              validated + enabled, only when every enable rule holds
 *   health --plan                    the free probe list (frames_get_tool / frames_probe_tools), 5 ids per call
 *
 * Onboarding a new Frames tool: discover (frames_search_tools, free) -> inspect descriptor (frames_get_tool, free)
 * -> probe (frames_probe_tools, free) -> add a candidate entry here -> one bounded paid smoke call under an
 * approved budget, saved under research/lamble/<run>/raw/ -> inspect -> smoke -> register -> enable.
 * See docs/runbooks/provider-onboarding.md.
 */
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { existsSync } from "node:fs";
import path from "node:path";

import { ADAPTER_KEYS, adapterFor } from "../../src/lib/lambo/adapters/registry.ts";
import type { AdapterOutput } from "../../src/lib/lambo/adapters/types.ts";
import { type Catalog, type Capability, type FieldMap, checkCatalogRules, getCapability } from "../../src/lib/lambo/catalog/catalog.ts";
import { CATALOG_PATH, loadJobs } from "../../src/lib/lambo/catalog/load.ts";
import { CHAINS } from "../../src/lib/lambo/core/identity.ts";
import { readJson, resolveFromRoot, writeJsonAtomic } from "../../src/lib/lambo/server/io.ts";

function catalog(): Catalog {
  return readJson<Catalog>(resolveFromRoot(CATALOG_PATH));
}

export function schemaErrors(value: unknown): string[] {
  const schema = readJson<Record<string, unknown>>(resolveFromRoot("docs/data/providers.schema.json"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  (addFormats as unknown as (a: unknown) => void)(ajv);
  const validate = ajv.compile(schema);
  if (validate(value)) return [];
  return (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`);
}

export function validateAll(): string[] {
  const cat = catalog();
  const errors = [...schemaErrors(cat), ...checkCatalogRules(cat, ADAPTER_KEYS)];
  const keys = new Set(cat.capabilities.map((c) => c.key));
  for (const job of loadJobs().jobs) {
    for (const key of job.capabilities) if (key !== "*" && !keys.has(key)) errors.push(`job ${job.id}: unknown capability ${key}`);
    if (job.kind === "paid-collection") {
      for (const key of job.capabilities) {
        if (key === "*") continue;
        const cap = getCapability(cat, key);
        if (job.scheduleStatus === "active-external" && !cap.enabled) errors.push(`job ${job.id}: active job uses non-enabled capability ${key}`);
      }
    }
  }
  const registry = readJson<{ capabilities?: Record<string, string> }>(resolveFromRoot("docs/prompts/refresh-market-data.sources.json"));
  for (const [role, key] of Object.entries(registry.capabilities ?? {})) if (!keys.has(key)) errors.push(`registry capabilities.${role}: unknown capability ${key}`);
  return errors;
}

const METRIC_GROUPS: Record<string, string[]> = {
  "price & market cap": ["codex.token-snapshot", "pump.coin", "fomo.token"],
  "price candles": ["codex.token-bars", "pump.candles", "fomo.candles"],
  "token volume": ["codex.token-bars"],
  "launchpad fees & creator earnings": ["defillama.fees"],
  "indexed launches": ["codex.launchpad-activity"],
  "holder panels (samples)": ["pump.holders", "fomo.holders"],
  "wallet-resolved trades (samples)": ["pump.trades", "fomo.activity"],
  "trader theses (FOMO users)": ["fomo.theses"],
  "developer wallets": ["fomo.developers"],
  "social evidence": ["x.search", "firecrawl.scrape"],
};

export function coverageMatrix(cat: Catalog) {
  const byKey = new Map(cat.capabilities.map((c) => [c.key, c]));
  const cell = (keys: string[], chain: string) =>
    keys
      .map((k) => byKey.get(k))
      .filter((c): c is Capability => Boolean(c) && (c!.dataNetworks.length === 0 || c!.dataNetworks.includes(chain as never)))
      .map((c) => ({ capability: c.key, status: c.validation.status, enabled: c.enabled, population: c.semantics.population ?? null }));
  return {
    generatedFrom: CATALOG_PATH,
    catalogUpdatedAt: cat.updatedAt,
    note: "Coverage a capability could provide by its descriptor. 'enabled' capabilities feed releases; candidates do not until validated. Holder panels are samples (top positions or FOMO users), never all-holder coverage.",
    capabilities: cat.capabilities.map((c) => ({
      key: c.key,
      provider: c.provider,
      toolId: c.toolId,
      status: c.validation.status,
      enabled: c.enabled,
      dataNetworks: c.dataNetworks,
      population: c.semantics.population ?? null,
      coverage: c.semantics.coverage,
      freshnessMaxAgeSeconds: c.freshness.maxAcceptedAgeSeconds,
      rights: c.rights,
      lastVerifiedAt: c.validation.lastVerifiedAt,
      blockedReason: c.validation.reason ?? null,
      uses: c.uses,
    })),
    matrix: Object.fromEntries(
      Object.entries(METRIC_GROUPS).map(([group, keys]) => [group, Object.fromEntries(CHAINS.map((chain) => [chain, cell(keys, chain)]))]),
    ),
    discovered: cat.discovered,
  };
}

/** Lists every path in a JSON value with its type and a short sample (first array element only). */
export function describePaths(value: unknown, prefix = "", out: { path: string; type: string; sample: string }[] = [], depth = 0): typeof out {
  if (depth > 8) return out;
  if (Array.isArray(value)) {
    out.push({ path: prefix || "(root)", type: `array(${value.length})`, sample: "" });
    if (value.length) describePaths(value[0], `${prefix}[0]`, out, depth + 1);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) describePaths(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
    return out;
  }
  out.push({ path: prefix, type: value === null ? "null" : typeof value, sample: JSON.stringify(value)?.slice(0, 60) ?? "" });
  return out;
}

const HINTS: Record<string, RegExp> = {
  id: /(^|\.)(id|eventId|uuid)$/i,
  type: /(^|\.)(type|kind|eventType)$/i,
  time: /(time|timestamp|createdAt|created_at|\.t)$/i,
  wallet: /(wallet|owner|address|trader)$/i,
  tokenAddress: /(mint|tokenAddress|contract)$/i,
  tokenChain: /(chain|network)$/i,
  amount: /(amount|balance|tokens?)$/i,
  valueUsd: /(valueUsd|usdValue|value_usd)$/i,
  costBasisUsd: /(costBasis|cost_basis)/i,
  isDeveloper: /(isDev|developer)/i,
  pinned: /(pinned|isPinned)/i,
  open: /\.o$|open$/i,
  high: /\.h$|high$/i,
  low: /\.l$|low$/i,
  close: /\.c$|close$/i,
  holderCount: /holder(s)?(Count)?$/i,
};

/** Name-based suggestions only. Every suggestion must be confirmed against the sample before registering. */
export function suggestFieldMap(paths: { path: string }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [field, re] of Object.entries(HINTS)) {
    const hits = paths.map((p) => p.path.replace(/^.*\[0\]\./, "")).filter((p) => re.test(p));
    if (hits.length) out[field] = [...new Set(hits)].slice(0, 4);
  }
  return out;
}

export function smoke(cap: Capability, sample: unknown, map: FieldMap): AdapterOutput {
  const adapter = adapterFor(cap.adapter);
  if (!adapter) throw new Error(`No registered adapter for ${cap.key}`);
  const body = (sample as { body?: unknown }).body ?? sample;
  const args = ((sample as { request?: { args?: Record<string, unknown> } }).request?.args ?? {}) as Record<string, unknown>;
  return adapter.normalize({
    body,
    request: { id: cap.toolId ?? cap.key, args },
    capability: { ...cap, contract: { ...cap.contract, fieldMap: map } },
    fetchedAt: Math.floor(Date.now() / 1000),
    mode: "validation",
  } as Parameters<typeof adapter.normalize>[0]);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function summarize(out: AdapterOutput) {
  return {
    refused: out.refused,
    observations: out.observations.length,
    events: out.events.length,
    eventClasses: out.events.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.class]: (acc[e.class] ?? 0) + 1 }), {}),
    panels: out.panels.map((p) => ({ tokenId: p.tokenId, population: p.population, rows: p.rows.length, complete: p.complete })),
    candles: out.candles.length,
    meta: out.meta,
    warnings: out.warnings.slice(0, 20),
  };
}

export function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  if (cmd === "validate") {
    const errors = validateAll();
    if (errors.length) {
      for (const e of errors) console.error(`x ${e}`);
      return 1;
    }
    const cat = catalog();
    console.log(`ok: ${cat.capabilities.length} capabilities (${cat.capabilities.filter((c) => c.enabled).length} enabled), ${cat.discovered.length} discovered`);
    return 0;
  }
  if (cmd === "matrix") {
    const out = arg("--out") ?? "docs/data/provider-coverage.json";
    writeJsonAtomic(resolveFromRoot(out), coverageMatrix(catalog()), 2);
    console.log(`wrote ${out}`);
    return 0;
  }
  if (cmd === "inspect") {
    const [key, file] = rest;
    if (!key || !file) throw new Error("usage: inspect <capability> <sample.json>");
    const cap = getCapability(catalog(), key);
    const sample = readJson<unknown>(path.resolve(file));
    const body = (sample as { body?: unknown }).body ?? sample;
    const paths = describePaths(body);
    console.log(JSON.stringify({ capability: cap.key, adapter: cap.adapter, paths: paths.slice(0, 200), suggestions: suggestFieldMap(paths) }, null, 1));
    return 0;
  }
  if (cmd === "smoke" || cmd === "register") {
    const key = rest[0];
    const sampleFile = cmd === "smoke" ? rest[1] : arg("--sample");
    const mapFile = arg("--map");
    if (!key || !sampleFile || !mapFile) throw new Error(`usage: ${cmd} <capability> ${cmd === "smoke" ? "<sample>" : "--sample <retained sample>"} --map <fieldmap.json>`);
    const cat = catalog();
    const cap = getCapability(cat, key);
    const map = readJson<FieldMap>(path.resolve(mapFile));
    const result = smoke(cap, readJson<unknown>(path.resolve(sampleFile)), map);
    console.log(JSON.stringify(summarize(result), null, 1));
    if (cmd === "smoke") return result.refused ? 1 : 0;
    const rel = path.relative(resolveFromRoot(), path.resolve(sampleFile));
    if (!rel.startsWith("research/lamble/")) throw new Error("register needs a sample retained under research/lamble/<run>/raw/");
    if (result.refused) throw new Error("smoke test refused; fix the map before registering");
    cap.contract.fieldMap = { ...map, verifiedAgainst: rel };
    cap.validation.fieldMapVerified = true;
    cap.validation.lastVerifiedAt = new Date().toISOString();
    cap.validation.checks = [...new Set([...cap.validation.checks, "field-map-smoke"])];
    writeJsonAtomic(resolveFromRoot(CATALOG_PATH), cat, 2);
    console.log(`registered field map for ${key}; status stays ${cap.validation.status} until 'enable'`);
    return 0;
  }
  if (cmd === "enable") {
    const key = rest[0];
    if (!key) throw new Error("usage: enable <capability>");
    const cat = catalog();
    const cap = getCapability(cat, key);
    const evidence = cap.contract.fieldMap?.verifiedAgainst;
    if (!cap.validation.fieldMapVerified || !evidence || !existsSync(resolveFromRoot(evidence))) throw new Error(`${key}: register a smoke-tested field map against a retained sample first`);
    if (!cap.adapter || !ADAPTER_KEYS.has(cap.adapter)) throw new Error(`${key}: adapter ${cap.adapter} is not registered`);
    cap.validation.status = "validated";
    cap.validation.evidence = evidence;
    cap.enabled = true;
    const errors = [...schemaErrors(cat), ...checkCatalogRules(cat, ADAPTER_KEYS)];
    if (errors.length) throw new Error(errors.join("\n"));
    writeJsonAtomic(resolveFromRoot(CATALOG_PATH), cat, 2);
    console.log(`${key} enabled`);
    return 0;
  }
  if (cmd === "health") {
    const cat = catalog();
    const ids = cat.capabilities.filter((c) => c.toolId && (c.enabled || c.validation.status === "candidate")).map((c) => c.toolId!);
    const unique = [...new Set(ids)];
    const groups: string[][] = [];
    for (let i = 0; i < unique.length; i += 5) groups.push(unique.slice(i, i + 5));
    console.log(JSON.stringify({ note: "Free calls only: frames_get_tool per id (descriptor drift) and frames_probe_tools per group (liveness, live quote). Save results to data/provider-health/<date>.json.", probeGroups: groups }, null, 1));
    return 0;
  }
  console.error("usage: providers.ts validate|matrix|inspect|smoke|register|enable|health");
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
