/**
 * DefiLlama fee summaries via Atlas (bazaar.defillama-use-x402atlas-com-fee-summary).
 * totalDataChart holds [UTC-midnight seconds, USD] pairs. Only complete, settled days are observations:
 * the current partial day (and any day that ended less than settleHours before the fetch) is skipped.
 */
import { DAY, HOUR } from "../core/time.ts";
import type { MetricKey } from "../core/metrics.ts";
import { type Adapter, emptyOutput, num } from "./types.ts";

const METRIC: Record<string, MetricKey> = {
  dailyFees: "venue.fees_usd",
  dailyRevenue: "venue.revenue_usd",
  dailySupplySideRevenue: "venue.supply_side_usd",
};

export const defillamaFees: Adapter = {
  key: "defillama.fees",
  normalize(input) {
    const out = emptyOutput();
    const protocol = input.request.args.protocol;
    const dataType = input.request.args.dataType;
    const metric = typeof dataType === "string" ? METRIC[dataType] : undefined;
    if (typeof protocol !== "string" || !metric) {
      out.warnings.push(`unsupported request ${JSON.stringify(input.request.args)}`);
      out.refused = true;
      return out;
    }
    const data = (input.body as { data?: { slug?: string; totalDataChart?: unknown[] } } | null)?.data;
    if (!data || !Array.isArray(data.totalDataChart)) {
      out.warnings.push("no totalDataChart");
      return out;
    }
    if (data.slug !== protocol) {
      out.warnings.push(`slug ${data.slug} != requested ${protocol}`);
      out.refused = true;
      return out;
    }
    const settle = (input.capability.freshness.settleHours ?? 4) * HOUR;
    const seen = new Set<number>();
    data.totalDataChart.forEach((pair, i) => {
      if (!Array.isArray(pair) || pair.length < 2) return;
      const t = num(pair[0]);
      const value = num(pair[1]);
      if (t === null || t % DAY !== 0) {
        out.warnings.push(`point ${i}: not a UTC midnight`);
        return;
      }
      if (seen.has(t)) {
        out.warnings.push(`point ${i}: duplicate day ${t}`);
        return;
      }
      seen.add(t);
      if (t + DAY + settle > input.fetchedAt) return; // partial or unsettled day
      if (value === null || value < 0) {
        out.warnings.push(`point ${i}: invalid value`);
        return;
      }
      out.observations.push({
        entityType: "venue_provider",
        entityId: protocol,
        metric,
        value,
        windowStart: t,
        windowEnd: t + DAY,
        eventTime: t,
        extraction: `$.data.totalDataChart[${i}][1]`,
      });
    });
    return out;
  },
};
