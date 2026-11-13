/**
 * Just spotted's status rules (src/lib/lamble/site/spotted-status.ts). Kept out of scout.test.ts, which the hourly
 * Scout routine runs before merging.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { AGEING_OUT_HOURS, CHURN_TURNOVER, RUN_PACE_USD_PER_HOUR, coinStatus, leadStatus } from "../../src/lib/lamble/site/spotted-status.ts";

const SCAN = "2026-11-13T19:17:39Z";
const EARLIER = "2026-11-13T18:17:00Z";
const coin = (o: Partial<{ firstSpottedAt: string; volume24Usd: number; mcapUsd: number | null; ageHours: number }>) => ({ firstSpottedAt: EARLIER, volume24Usd: 100_000, mcapUsd: 500_000, ageHours: 5, ...o });

test("a coin first seen in the latest scan is Just in, whatever else it is", () => {
  assert.equal(coinStatus(coin({ firstSpottedAt: SCAN, volume24Usd: 50e6, mcapUsd: 1e6 }), SCAN), "just-in");
});

test("Churning is checked before Running, and needs a known market cap", () => {
  const hot = { volume24Usd: 30e6, ageHours: 4 };
  assert.equal(coinStatus(coin({ ...hot, mcapUsd: hot.volume24Usd / CHURN_TURNOVER }), SCAN), "churning");
  assert.equal(coinStatus(coin({ ...hot, mcapUsd: hot.volume24Usd / (CHURN_TURNOVER - 1) }), SCAN), "running");
  assert.equal(coinStatus(coin({ ...hot, mcapUsd: null }), SCAN), "running");
});

test("Running is a pace over at least one hour; Ageing out is the age bar; the rest has no status", () => {
  assert.equal(coinStatus(coin({ volume24Usd: RUN_PACE_USD_PER_HOUR * 0.9, ageHours: 0.2, mcapUsd: null }), SCAN), null);
  assert.equal(coinStatus(coin({ volume24Usd: RUN_PACE_USD_PER_HOUR * 6, ageHours: 6, mcapUsd: 1e7 }), SCAN), "running");
  assert.equal(coinStatus(coin({ ageHours: AGEING_OUT_HOURS }), SCAN), "ageing-out");
  assert.equal(coinStatus(coin({}), SCAN), null);
});

test("the data's tracked lead is shown as confirmed; its confirmed lead as potential", () => {
  assert.equal(leadStatus({ status: "tracked" }), "confirmed");
  assert.equal(leadStatus({ status: "confirmed" }), "potential");
});
