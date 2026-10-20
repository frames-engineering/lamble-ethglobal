/**
 * Public price display for pages, read through the payment layer's own pricing loader so a page can never show
 * a price the offer would not make. The payment layer remains the authority when an offer is issued.
 */
import { type Pricing, loadPricing, priceFor } from "../payments/pricing.ts";
import type { ResourceKind } from "./paths.ts";

let cached: Pricing | null | undefined;

function pricing(): Pricing | null {
  if (cached === undefined) {
    try {
      cached = loadPricing();
    } catch {
      cached = null;
    }
  }
  return cached;
}

export function displayPrice(kind: ResourceKind): { usd: string; approved: boolean } | null {
  const p = pricing();
  const usd = p ? priceFor(p, kind) : null;
  return p && usd ? { usd, approved: p.status === "production" && p.approved } : null;
}
