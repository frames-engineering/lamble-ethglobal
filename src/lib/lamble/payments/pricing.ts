/**
 * Configuration-driven prices for precomputed research resources (docs/data/pricing.json). Prices and access
 * policy live in data so an owner can approve them without a code change; protocol configuration (networks,
 * recipients, facilitators, secrets) comes only from the environment and never from this file.
 */
import { readFileSync } from "node:fs";

import { resolveFromRoot } from "../server/io.ts";

export const RESOURCE_KINDS = [
  "coin-bundle",
  "coin-history",
  "narrative-bundle",
  "week-dataset",
  "research-article",
  "launchpads-dataset",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export interface AccessPolicy {
  /** How long a capability token unlocks its resource after purchase. */
  accessDurationSeconds: number;
  /** Total deliveries per entitlement, including the purchase response itself. */
  downloadsMax: number;
  /** How long after fulfilment an identical payment credential is served again (lost-response recovery). */
  replayWindowSeconds: number;
  /** Cap on lost-response re-serves per purchase, on top of downloadsMax. */
  replayServesMax: number;
  /** Lifetime of a 402 offer; protocol challenges expire with it. */
  offerTtlSeconds: number;
}

export interface Pricing {
  version: number;
  status: "test" | "production";
  approved: boolean;
  note: string;
  currency: "USD";
  resources: Record<ResourceKind, { price: string; description: string }>;
  access: AccessPolicy;
  refundPolicy: string;
}

export class PricingError extends Error {}

/** Decimal USD with at most 6 places (USDC and Tempo stablecoins have 6 decimals), strictly positive. */
const PRICE = /^(0|[1-9]\d{0,5})(\.\d{1,6})?$/;

export function isResourceKind(kind: string): kind is ResourceKind {
  return (RESOURCE_KINDS as readonly string[]).includes(kind);
}

/** Validates raw pricing JSON; throws PricingError naming the first problem so a bad file fails loudly. */
export function parsePricing(raw: unknown): Pricing {
  function fail(message: string): never {
    throw new PricingError(`pricing.json: ${message}`);
  }
  if (!raw || typeof raw !== "object") fail("not an object");
  const value = raw as Record<string, unknown>;
  const { status, approved, note, refundPolicy } = value;
  if (status !== "test" && status !== "production") fail('status must be "test" or "production"');
  if (typeof approved !== "boolean") fail("approved must be a boolean");
  if (status === "test" && approved) fail('test prices cannot be approved; set status "production" first');
  if (typeof note !== "string" || !note.trim()) fail("note is required");
  if (value.currency !== "USD") fail('currency must be "USD"');
  if (typeof refundPolicy !== "string" || !refundPolicy.trim()) fail("refundPolicy is required");

  const resources = value.resources;
  if (!resources || typeof resources !== "object") fail("resources is required");
  const table = resources as Record<string, unknown>;
  for (const kind of Object.keys(table)) if (!isResourceKind(kind)) fail(`unknown resource kind ${kind}`);
  const out = {} as Pricing["resources"];
  for (const kind of RESOURCE_KINDS) {
    const entry = table[kind] as { price?: unknown; description?: unknown } | undefined;
    const price = entry?.price;
    if (typeof price !== "string" || !PRICE.test(price) || Number(price) <= 0) {
      fail(`resources.${kind}.price must be a positive decimal USD string such as "0.02"`);
    }
    out[kind] = { price, description: typeof entry?.description === "string" ? entry.description : kind };
  }

  const access = value.access;
  if (!access || typeof access !== "object") fail("access is required");
  const policy = access as Record<string, unknown>;
  function int(key: keyof AccessPolicy): number {
    const n = policy[key];
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0) fail(`access.${key} must be a positive integer`);
    return n;
  }
  return {
    version: typeof value.version === "number" ? value.version : 1,
    status,
    approved,
    note,
    currency: "USD",
    resources: out,
    access: {
      accessDurationSeconds: int("accessDurationSeconds"),
      downloadsMax: int("downloadsMax"),
      replayWindowSeconds: int("replayWindowSeconds"),
      replayServesMax: int("replayServesMax"),
      offerTtlSeconds: int("offerTtlSeconds"),
    },
    refundPolicy,
  };
}

export function pricingPath(): string {
  return resolveFromRoot("docs", "data", "pricing.json");
}

export function loadPricing(file: string = pricingPath()): Pricing {
  return parsePricing(JSON.parse(readFileSync(file, "utf8")));
}

/** Price for a resource kind as a decimal USD string, or null when the kind is not sold. */
export function priceFor(pricing: Pricing, kind: string): string | null {
  return isResourceKind(kind) ? pricing.resources[kind].price : null;
}

/** True only for owner-approved production prices; real-money networks require it. */
export function pricingApprovedForMainnet(pricing: Pricing): boolean {
  return pricing.status === "production" && pricing.approved;
}
