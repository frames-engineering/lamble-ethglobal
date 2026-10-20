/**
 * The enabled Pump and FOMO routes against the responses retained on 2026-10-20 (research/lamble/samples/
 * x4o2-20261020, collected under an owner-approved budget). Production mode: the registered field maps must
 * normalize real bodies, and the daily planner must stay inside the catalog limits and the credit ceiling.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { adapterFor } from "../../src/lib/lamble/adapters/registry.ts";
import type { Catalog } from "../../src/lib/lamble/catalog/catalog.ts";
import { getCapability } from "../../src/lib/lamble/catalog/catalog.ts";
import { callsByCapability, catalogRefusals } from "../../src/lib/lamble/frames/collect.ts";

const root = new URL("../../", import.meta.url).pathname;
const catalog = JSON.parse(readFileSync(path.join(root, "docs/data/providers.json"), "utf8")) as Catalog;
const jobs = JSON.parse(readFileSync(path.join(root, "docs/data/jobs.json"), "utf8")) as { jobs: { id: string; budget: { maxCreditsPerRun: number } }[]; framesPricing: { feeRate: number; feeFloorUsdPerCall: number } };
const SAMPLES = path.join(root, "research/lamble/samples/x4o2-20261020/routes");
const ENABLED = ["pump.coin", "pump.trades", "pump.candles", "pump.holders", "fomo.token", "fomo.holders", "fomo.candles", "fomo.activity"];

function run(key: string) {
  const cap = getCapability(catalog, key);
  const sample = JSON.parse(readFileSync(path.join(SAMPLES, `${key}.json`), "utf8")) as { request: { id: string; args: Record<string, unknown> }; body: unknown };
  return adapterFor(cap.adapter)!.normalize({ body: sample.body, request: sample.request, capability: cap, fetchedAt: 1_792_460_000 });
}

test("every enabled Pump/FOMO route is verified against a retained response and normalizes it in production mode", () => {
  for (const key of ENABLED) {
    const cap = getCapability(catalog, key);
    assert.ok(cap.enabled && cap.validation.fieldMapVerified, key);
    assert.equal(cap.contract.fieldMap!.verifiedAgainst, `research/lamble/samples/x4o2-20261020/routes/${key}.json`);
    const out = run(key);
    assert.equal(out.refused, false, `${key}: ${out.warnings.join("; ")}`);
    assert.equal(out.meta!.observedAt! > 1_792_459_000 && out.meta!.observedAt! < 1_792_461_000, true, `${key}: observedAt read as milliseconds`);
  }
  const coin = run("pump.coin").observations;
  assert.deepEqual(
    coin.map((o) => [o.metric, o.value]),
    [
      ["token.holders_count_reported", 3890],
      ["token.top10_share_reported", 25.1984],
    ],
  );
  const trades = run("pump.trades").events;
  assert.equal(trades.length, 100);
  // baseAmount { raw: "15383767354", decimals: 6 } is 15,383.767354 tokens.
  const first = trades.find((t) => t.amount !== null && Math.abs(t.amount! - 15_383.767354) < 1e-6);
  assert.ok(first && first.side && first.wallet && first.usd !== null && first.population === "recent_trades_sample");
  assert.equal(new Set(trades.map((t) => t.sourceId)).size, 100, "ordinal keys are unique");
  const candles = run("pump.candles").candles;
  assert.deepEqual(candles.map((c) => c.start), [1_792_281_600, 1_792_368_000], "the open day (final: false) is skipped");
  const pumpHolders = run("pump.holders").panels[0]!;
  assert.equal(pumpHolders.population, "pump_users", "pump.fun account positions, not the largest on-chain holders");
  assert.equal(pumpHolders.rows.length, 50);
  const fomoHolders = run("fomo.holders").panels[0]!;
  assert.equal(fomoHolders.population, "fomo_users");
  assert.ok(fomoHolders.rows.every((r) => r.valueUsd !== null && r.amount !== null));
  const activity = run("fomo.activity").events;
  assert.ok(activity.length > 0 && activity.every((e) => e.class === "trade" && (e.side === "buy" || e.side === "sell")));
  // The sample was fetched at 01:31Z; its 01:00Z hour had not ended and FOMO marks no candle final.
  const fomoCandles = run("fomo.candles").candles;
  assert.equal(fomoCandles.length, 33);
  assert.ok(fomoCandles.every((c) => c.start + c.resolutionSeconds <= 1_792_460_000));
  assert.ok(!fomoCandles.some((c) => c.start === 1_792_458_000), "the open hour is not a candle");
});

test("the daily panels plan fits the credit ceiling, the catalog limits and Frames' billing, collected coins first", () => {
  const dir = path.join(mkdtempSync(path.join(os.tmpdir(), "lamble-plan-")), "20261020T060000Z");
  try {
    const out = JSON.parse(execFileSync("python3", [path.join(root, "scripts/frames-refresh/plan.py"), dir, "panels", "--prior", path.join(root, "research/lamble/20261019T055754Z")], { encoding: "utf8" })) as {
      batches: string[];
      calls: number;
      coins: { collected: number; other: number };
      plannedCredits: number;
      ceilingCredits: number;
    };
    const ceiling = jobs.jobs.find((j) => j.id === "x4o2-coin-panels")!.budget.maxCreditsPerRun;
    assert.equal(out.ceilingCredits, ceiling);
    assert.ok(out.plannedCredits <= ceiling);
    const registry = JSON.parse(readFileSync(path.join(root, "docs/prompts/refresh-market-data.sources.json"), "utf8")) as { poolUniverse: unknown[] };
    assert.equal(out.coins.collected, registry.poolUniverse.length, "every daily-collected coin is planned before any other");
    const prior = new Map<string, number>();
    let reserved = 0;
    const keys = new Set<string>();
    for (const f of readdirSync(path.join(dir, "raw")).sort((a, b) => a.localeCompare(b, "en", { numeric: true }))) {
      const req = JSON.parse(readFileSync(path.join(dir, "raw", f), "utf8"));
      assert.ok(req.calls.length >= 1 && req.calls.length <= 10);
      assert.deepEqual(catalogRefusals(catalog, req, prior), [], f);
      const billed = req.calls.reduce((a: number, c: { id: string }) => a + catalog.capabilities.find((x) => x.toolId === c.id)!.payment!.priceHintUsd! * (1 + jobs.framesPricing.feeRate) + jobs.framesPricing.feeFloorUsdPerCall, 0);
      assert.ok(req.max_usd >= billed - 1e-9 && req.max_usd - billed < 0.0001 + 1e-9, `${f}: max_usd covers exactly the planned bill`);
      for (const [k, n] of callsByCapability(catalog, req).counts) prior.set(k, (prior.get(k) ?? 0) + n);
      reserved += req.max_usd;
      keys.add(req.idempotency_key);
    }
    assert.equal(keys.size, out.batches.length, "one idempotency key per batch");
    assert.ok(reserved * 1000 <= ceiling + 1e-6, `reservations ${reserved} within the ceiling`);
  } finally {
    rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test("panels get only what the run's other batches leave of the daily ceiling, and are never re-planned after a call", () => {
  const dir = path.join(mkdtempSync(path.join(os.tmpdir(), "lamble-plan-")), "20261020T060000Z");
  const plan = () =>
    JSON.parse(execFileSync("python3", [path.join(root, "scripts/frames-refresh/plan.py"), dir, "panels", "--prior", path.join(root, "research/lamble/20261019T055754Z")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) as {
      batches: string[];
      plannedCredits: number;
      ceilingCredits: number;
      reservedByOtherBatchesCredits: number;
    };
  try {
    const daily = (JSON.parse(readFileSync(path.join(root, "docs/data/jobs.json"), "utf8")) as { dailyCreditCeiling: number }).dailyCreditCeiling;
    mkdirSync(path.join(dir, "raw"), { recursive: true });
    // Discover, evidence and collect batches already reserved $2.50 of the day.
    for (const b of ["d1", "f1", "c1"]) writeFileSync(path.join(dir, "raw", `${b}-request.json`), JSON.stringify({ calls: [], max_usd: 2.5 / 3 }));
    const out = plan();
    assert.equal(out.reservedByOtherBatchesCredits, 2500);
    assert.equal(out.ceilingCredits, daily - 2500);
    assert.ok(out.plannedCredits <= daily - 2500);
    const panelReserved = readdirSync(path.join(dir, "raw"))
      .filter((f) => /^p\d+-request\.json$/.test(f))
      .reduce((a, f) => a + JSON.parse(readFileSync(path.join(dir, "raw", f), "utf8")).max_usd, 0);
    assert.ok(2.5 + panelReserved <= daily / 1000 + 1e-6, "the run's reservations stay within the daily ceiling");
    // Re-planning replaces the unsent panel requests; once a panel batch was called it refuses.
    assert.equal(plan().batches.length, out.batches.length);
    writeFileSync(path.join(dir, "raw", "p1.json"), "{}");
    assert.throws(plan, /already called/);
  } finally {
    rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});
