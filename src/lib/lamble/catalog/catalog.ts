/**
 * Provider capability catalog (docs/data/providers.json). Application code names capabilities by key;
 * tool IDs are resolved here and nowhere else.
 */
import type { Chain } from "../core/identity.ts";

export type ValidationStatus = "validated" | "candidate" | "discovered" | "blocked" | "deprecated";
export type RightsValue = "permitted" | "link-only" | "unknown" | "prohibited";
export type Population = "top_holders_sample" | "fomo_users" | "recent_trades_sample" | "top_traders_by_profit_sample" | "all_holders";

export interface Capability {
  key: string;
  provider: string;
  toolId: string | null;
  upstream: { host: string | null; method: string | null; path: string | null; operation?: string; source: string };
  contract: {
    inputSchema: Record<string, unknown>;
    argTypes: string;
    queryTemplate?: string;
    fields?: Record<string, unknown>;
    validatedRequest?: string;
    descriptorObservedAt?: string;
    fieldMap?: FieldMap | null;
  };
  attribution: { searchId: string | null };
  payment: { protocol: "x402" | "x402v2" | "mpp"; network: string; currency: string; priceHintUsd: number | null } | null;
  dataNetworks: Chain[];
  adapter: string | null;
  semantics: {
    units: Record<string, string>;
    coverage: string;
    population?: Population;
    timestamps: string;
    sourceReported: string[];
    revisions?: string;
  };
  pagination: { kind: string; limit?: number; note?: string };
  freshness: { maxAcceptedAgeSeconds: number; settleHours?: number };
  cost: { maxCallsPerRun: number; maxUsdPerBatch: number };
  validation: { status: ValidationStatus; lastVerifiedAt: string; fieldMapVerified: boolean; checks: string[]; evidence: string; reason?: string };
  rights: { storage: RightsValue; display: RightsValue; redistribution: RightsValue; notes: string };
  enabled: boolean;
  uses: string[];
}

/**
 * Field map for providers whose response shape has not been verified against a retained response.
 * Keys are semantic names the adapter needs; values are dot paths into one item (or the body for `items`).
 * `units` declares what a numeric time or amount means; nothing is inferred from magnitudes.
 */
export interface FieldMap {
  items?: string;
  fields: Record<string, string>;
  units?: Record<string, "seconds" | "milliseconds" | "iso8601" | "usd" | "sol" | "token_units" | "ratio" | "percent">;
  verifiedAgainst?: string;
}

export interface Catalog {
  catalogVersion: number;
  updatedAt: string;
  providers: { id: string; name: string; transport: string; homepage?: string | null; docs?: string | null; notes?: string }[];
  capabilities: Capability[];
  discovered: { toolId: string; note: string; observedAt: string; searchId?: string | null }[];
}

export class CatalogError extends Error {}

export function getCapability(catalog: Catalog, key: string): Capability {
  const cap = catalog.capabilities.find((c) => c.key === key);
  if (!cap) throw new CatalogError(`Unknown capability: ${key}`);
  return cap;
}

/** Tool id for a capability that a job may call. Candidates and blocked routes are refused. */
export function callableToolId(catalog: Catalog, key: string): string {
  const cap = getCapability(catalog, key);
  if (!cap.enabled) throw new CatalogError(`Capability ${key} is not enabled (status ${cap.validation.status})`);
  if (!cap.toolId) throw new CatalogError(`Capability ${key} has no Frames tool`);
  return cap.toolId;
}

/** Which capability produced a call: tool id plus, for the shared Codex GraphQL tool, the operation in the query. */
export function capabilityFor(catalog: Catalog, toolId: string, args: Record<string, unknown>): Capability | null {
  const candidates = catalog.capabilities.filter((c) => c.toolId === toolId);
  if (candidates.length <= 1) return candidates[0] ?? null;
  const q = typeof args.query === "string" ? args.query : "";
  const key = q.includes("filterLaunchpads")
    ? "codex.launchpad-activity"
    : q.includes("getTokenBars")
      ? "codex.token-bars"
      : /filterTokens\(tokens:/.test(q)
        ? "codex.token-snapshot"
        : q.includes("filterTokens(")
          ? "codex.token-discovery"
          : /tokens\(ids:/.test(q)
            ? "codex.token-metadata"
            : null;
  return key ? getCapability(catalog, key) : null; // getBars (single-pool, before 2026-10-02) has no capability
}

/** Paid API export of data derived from a capability needs explicit redistribution rights. */
export function exportPermitted(cap: Pick<Capability, "rights">): boolean {
  return cap.rights.redistribution === "permitted";
}

/**
 * Rule checks beyond the JSON schema. Returns human-readable violations; empty means valid.
 * `adapters` is the set of registered adapter keys (src/lib/lamble/adapters/registry.ts).
 */
export function checkCatalogRules(catalog: Catalog, adapters: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const providers = new Set(catalog.providers.map((p) => p.id));
  for (const cap of catalog.capabilities) {
    const at = `capability ${cap.key}`;
    if (keys.has(cap.key)) errors.push(`${at}: duplicate key`);
    keys.add(cap.key);
    if (!providers.has(cap.provider)) errors.push(`${at}: unknown provider ${cap.provider}`);
    if (cap.enabled) {
      if (cap.validation.status !== "validated") errors.push(`${at}: enabled but status is ${cap.validation.status}`);
      if (!cap.validation.fieldMapVerified) errors.push(`${at}: enabled without a verified field map`);
      if (!cap.adapter || !adapters.has(cap.adapter)) errors.push(`${at}: enabled without a registered adapter (${cap.adapter})`);
      if (cap.provider !== "lamble" && !cap.toolId) errors.push(`${at}: enabled without a tool id`);
    }
    if (cap.adapter && !adapters.has(cap.adapter) && cap.validation.status !== "blocked") errors.push(`${at}: adapter ${cap.adapter} is not registered`);
    if (cap.validation.status === "blocked" && !cap.validation.reason) errors.push(`${at}: blocked without a reason`);
    if (cap.semantics.population === "all_holders" && cap.provider.startsWith("x4o2")) errors.push(`${at}: x4o2 holder panels are never all-holder populations`);
    if (cap.contract.fieldMap && !cap.contract.fieldMap.verifiedAgainst && cap.validation.fieldMapVerified) errors.push(`${at}: fieldMapVerified without verifiedAgainst evidence`);
  }
  const discovered = new Set(catalog.discovered.map((d) => d.toolId));
  for (const cap of catalog.capabilities) if (cap.toolId && discovered.has(cap.toolId)) errors.push(`capability ${cap.key}: also listed as discovered`);
  return errors;
}

/** Capability keys whose data a paid export would need, grouped by permission. */
export function rightsSummary(catalog: Catalog, keys: readonly string[]): { permitted: string[]; blocked: string[] } {
  const permitted: string[] = [];
  const blocked: string[] = [];
  for (const key of keys) (exportPermitted(getCapability(catalog, key)) ? permitted : blocked).push(key);
  return { permitted, blocked };
}
