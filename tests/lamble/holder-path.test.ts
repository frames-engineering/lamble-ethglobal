/**
 * The holder and bottoming data path end to end: provider adapter output -> ingest -> store -> method inputs ->
 * components. SYNTHETIC bodies, field maps, wallets and prices; no x4o2 response has been retained, so the
 * field maps here are test fixtures, not verified provider contracts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { pumpCandles, pumpHolders, pumpTrades } from "../../src/lib/lamble/adapters/x4o2.ts";
import { type Capability, type Catalog, type FieldMap, getCapability } from "../../src/lib/lamble/catalog/catalog.ts";
import { DAY, HOUR, parseIso } from "../../src/lib/lamble/core/time.ts";
import { BOTTOMING_DEFAULTS, evaluateBottoming } from "../../src/lib/lamble/methods/bottoming.ts";
import { COMPONENT_IDS, type ComponentId, holderComponents } from "../../src/lib/lamble/methods/holders.ts";
import { coveredFraction, fifoSales, mergeSpans } from "../../src/lib/lamble/methods/inputs.ts";
import { migrate, openDb } from "../../src/lib/lamble/store/sqlite.ts";
import { PIPELINE_MIGRATIONS } from "../../src/lib/lamble/store/schema.ts";
import { type RunCtx, writeOutput } from "../../scripts/lamble/ingest.ts";
import { tokenMethodInputs } from "../../scripts/lamble/release/holder-inputs.ts";
import { Store } from "../../scripts/lamble/release/store.ts";

const root = new URL("../../", import.meta.url).pathname;
const catalog = JSON.parse(readFileSync(path.join(root, "docs/data/providers.json"), "utf8")) as Catalog;
const method = JSON.parse(readFileSync(path.join(root, "docs/methods/holder-analysis.v1.json"), "utf8")) as {
  components: { id: ComponentId; label: string; requires: string[]; maxAgeSeconds: number; minCoverage: number; parameters?: Record<string, number> }[];
};

const MINT = "SynthMint1111111111111111111111111111111111";
const TOKEN = `solana:${MINT}`;
const POOL = "Poo1Synth111111111111111111111111111111111";
const RUN = "20261020T055800Z";
const C = parseIso("2026-10-20T06:00:00Z"); // release cutoff
const D = Math.floor(C / DAY) * DAY;
const T0 = C - 7 * DAY; // first holder panel
const T1 = C - HOUR; // second holder panel
const iso = (t: number) => new Date(t * 1000).toISOString();

/** A capability as it would look once its field map is verified and it is enabled (test fixture). */
function enabled(key: string, fieldMap: FieldMap): Capability {
  const cap = getCapability(catalog, key);
  return {
    ...cap,
    enabled: true,
    contract: { ...cap.contract, fieldMap: { ...fieldMap, verifiedAgainst: "SYNTHETIC test fixture" } },
    validation: { ...cap.validation, status: "validated", fieldMapVerified: true },
  };
}

const holdersCap = enabled("pump.holders", { items: "data", fields: { wallet: "owner", amount: "balance" }, units: { amount: "token_units", observedAt: "iso8601" } });
const tradesCap = enabled("pump.trades", {
  items: "data",
  fields: { signature: "sig", side: "side", wallet: "user", amount: "tokens", usd: "usd", time: "ts" },
  units: { amount: "token_units", usd: "usd", time: "seconds", observedAt: "iso8601" },
});
const candlesCap = enabled("pump.candles", {
  items: "data",
  fields: { time: "t", open: "o", high: "h", low: "l", close: "c", volumeUsd: "v" },
  units: { time: "seconds", volumeUsd: "usd", observedAt: "iso8601" },
});

const WHALES = Array.from({ length: 24 }, (_, i) => `Wha1e${String(i + 1).padStart(2, "0")}`);
const panelBody = (at: number, shift: Record<string, number>) => ({
  data: [{ owner: POOL, balance: 300_000 }, ...WHALES.map((w, i) => ({ owner: w, balance: 40_000 - 1_500 * i + (shift[w] ?? 0) }))],
  meta: { observedAt: iso(at), source: "synthetic" },
});

// Daily closes: a peak, a 70% fall, a small rebound. Dips (>= 5% below the prior close) on D-7..D-3.
const CLOSES = [1.0, 1.0, 1.0, 0.8, 0.6, 0.45, 0.35, 0.3, 0.31, 0.32];
const candleBody = { data: CLOSES.map((c, i) => ({ t: D - (10 - i) * DAY, o: c, h: c * 1.02, l: c * 0.97, c, v: 5_000 })), meta: { observedAt: iso(C - 30 * 60) } };

// The tape: its oldest trade is an hour after the first panel, so D-7 is only partly covered (17h of 24h).
const tradeRows: { sig: string; side: "buy" | "sell"; user: string; tokens: number; usd: number; ts: number }[] = [
  { sig: "s0", side: "buy", user: "Fresh00", tokens: 1_000, usd: 800, ts: T0 + HOUR },
  ...[6, 5, 4, 3].flatMap((k) => [
    { sig: `b${k}`, side: "buy" as const, user: `Fresh${k}`, tokens: 2_000, usd: 300, ts: D - k * DAY + 3 * HOUR },
    { sig: `s${k}`, side: "sell" as const, user: "Wha1e05", tokens: 1_000, usd: 200, ts: D - k * DAY + 5 * HOUR },
  ]),
  { sig: "w1", side: "buy", user: "Wha1e01", tokens: 10_000, usd: 3_100, ts: D - 2 * DAY },
  { sig: "w2", side: "sell", user: "Wha1e02", tokens: 4_000, usd: 1_250, ts: D - DAY },
];
const tradeBody = { data: [...tradeRows].reverse(), meta: { observedAt: iso(C - 30 * 60) } };

function storeWithData() {
  const db = openDb(":memory:");
  migrate(db, PIPELINE_MIGRATIONS);
  db.prepare(
    `INSERT INTO runs (run_id, version, kind, runtime_at, available_at, available_basis, passed, manifest_sha256, ingested_at, ingest_version) VALUES (?, 'synthetic', 'daily-refresh', ?, ?, 'first-ingest', 1, 'x', ?, 'test')`,
  ).run(RUN, C - 2 * HOUR, C - 20 * 60, C);
  db.prepare("INSERT INTO tokens (token_id, chain, address, display_address, origin_venue, token_created_at, first_observed_at, first_observed_run, first_available_at) VALUES (?, 'solana', ?, ?, 'pump.fun', ?, ?, ?, ?)").run(
    TOKEN,
    MINT,
    MINT,
    D - 40 * DAY,
    D - 30 * DAY,
    RUN,
    D - 30 * DAY,
  );
  db.prepare("INSERT INTO pools (pool_id, token_id, chain, address, kind, pool_created_at, first_observed_at, first_observed_run) VALUES (?, ?, 'solana', ?, 'solana-account', NULL, ?, ?)").run(`solana:${POOL}`, TOKEN, POOL, D - 30 * DAY, RUN);
  const ctx: RunCtx = {
    db,
    catalog,
    runId: RUN,
    runtime: C - 2 * HOUR,
    available: C - 20 * 60,
    latest: new Map(),
    knownTokens: new Set([TOKEN]),
    warnings: [],
    stats: { observations: 0, revisions: 0, unchanged: 0, calls: 0, refused: 0 },
  };
  const feed = (adapter: typeof pumpHolders, cap: Capability, body: unknown, args: Record<string, unknown>, ev: string) => {
    const out = adapter.normalize({ body, request: { id: cap.toolId!, args }, capability: cap, fetchedAt: C - 25 * 60 });
    assert.equal(out.refused, false, `${cap.key}: ${out.warnings.join("; ")}`);
    writeOutput(ctx, out, cap, ev, C - 25 * 60, "delivered");
  };
  feed(pumpHolders, holdersCap, panelBody(T0, {}), { mint: MINT }, "ev-holders-0");
  feed(pumpHolders, holdersCap, panelBody(T1, { Wha1e01: 10_000, Wha1e02: -4_000, Wha1e05: -4_000 }), { mint: MINT }, "ev-holders-1");
  feed(pumpTrades, tradesCap, tradeBody, { mint: MINT }, "ev-trades");
  feed(pumpCandles, candlesCap, candleBody, { mint: MINT, res: "1d", measure: "price_usd" }, "ev-candles");
  return { db, store: new Store(db) };
}

const cfg = <T>(f: (c: (typeof method.components)[number]) => T) => Object.fromEntries(method.components.map((c) => [c.id, f(c)])) as Record<ComponentId, T>;

test("ingest keeps panels, trades, tape coverage and candles with their population", () => {
  const { db } = storeWithData();
  const panels = (db.prepare("SELECT population, complete, row_count FROM holder_panels ORDER BY observed_at").all() as { population: string; complete: number; row_count: number }[]).map((r) => ({ ...r }));
  assert.deepEqual(panels, [
    { population: "top_holders_sample", complete: 0, row_count: 25 },
    { population: "top_holders_sample", complete: 0, row_count: 25 },
  ]);
  assert.equal((db.prepare("SELECT count(*) n FROM token_events WHERE class = 'trade' AND amount IS NOT NULL").get() as { n: number }).n, tradeRows.length);
  const span = { ...(db.prepare("SELECT from_time, to_time FROM trade_coverage").get() as { from_time: number; to_time: number }) };
  assert.deepEqual(span, { from_time: T0 + HOUR, to_time: C - 30 * 60 });
  assert.equal((db.prepare("SELECT count(*) n FROM candles WHERE resolution_seconds = 86400").get() as { n: number }).n, CLOSES.length);
  db.close();
});

test("stored inputs populate concentration, whale accumulation and dip absorption; all-holder measures stay unpopulated", () => {
  const { db, store } = storeWithData();
  const price = (t: number, v: number, ev: string) => ({ observed_at: t, value: v, run_id: RUN, evidence_id: ev, available_at: C - 20 * 60 });
  const prices = [price(T0, 1.0, "codex-0"), price(T1, 0.32, "codex-1")];
  const caps = [price(T0, 1_000_000, "codex-0"), price(T1, 320_000, "codex-1")];
  const tok = { token_id: TOKEN, chain: "solana", token_created_at: D - 40 * DAY };
  const mi = tokenMethodInputs(store, tok, C, { codexCandles: [], volumeByDay: new Map(), prices, caps }, []);
  assert.equal(mi.tape, "pump.trades");
  assert.equal(mi.candles.length, CLOSES.length, "provider daily candles used when Codex has none");
  assert.equal(mi.costHistoryFromStart, false, "a recent-trades tape never reaches back to the token's start");
  assert.ok(mi.sales!.length > 0 && mi.sales!.every((s) => s.costUsd === null), "sample sales carry unknown cost, never zero");

  const bottoming = evaluateBottoming({ tokenId: TOKEN, candles: mi.candles, samples: [], flows: mi.flows, sales: mi.sales, marketCaps: [] }, C, BOTTOMING_DEFAULTS);
  assert.equal(bottoming.priceBasis, "candles");
  assert.ok(bottoming.episode, "a 70% fall opens an episode");
  assert.equal(bottoming.conditions.capitulation.state, "insufficient_data");
  assert.match(bottoming.conditions.capitulation.detail, /known for no|known for 0%/);
  assert.equal(bottoming.stage, null);

  const components = holderComponents({
    asOf: C,
    liquiditySnapshots: [],
    ownReturn7d: null,
    peers: [],
    sources: { allHolders: false, topHolders: true, walletTrades: true, portfolio: false },
    panels: mi.panels,
    supply: mi.supply,
    prices: prices.map((p) => ({ time: p.observed_at, value: p.value })),
    addressClasses: mi.addressClasses,
    trades: mi.trades,
    tradeCoverage: mi.tradeCoverage,
    dailyCloses: mi.candles.map((c) => ({ start: c.start, close: c.close! })),
    flows: mi.flows ?? [],
    episode: bottoming.episode ? { peakTime: bottoming.episode.peakTime, lowTime: bottoming.episode.lowTime } : null,
    labels: cfg((c) => c.label),
    requires: cfg((c) => c.requires),
    maxAgeSeconds: cfg((c) => c.maxAgeSeconds),
    minCoverage: cfg((c) => c.minCoverage),
    parameters: cfg((c) => c.parameters ?? {}),
    minPeers: 3,
  });
  const byId = new Map(components.map((c) => [c.id, c]));
  assert.equal(components.length, COMPONENT_IDS.length);

  // Concentration: supply = 320,000 / 0.32 = 1,000,000; the tracked pool is excluded, and the sensitivity shows its effect.
  const conc = byId.get("health.concentration")!;
  assert.equal(conc.measure.state, "derived");
  assert.equal(conc.measure.coverage?.population, "top_holders_sample");
  const sens = conc.inputs.sensitivity as Record<string, number>;
  assert.ok(Math.abs(sens.none! - sens.without_pool!) > 0.25, "excluding the pool changes the share");
  assert.equal(conc.measure.value, sens.without_pool);
  assert.match(conc.measure.coverage!.scope, /pool/);

  // Whale accumulation: fixed cohort from the T0 panel; trades only; 10,000 bought - 4,000 sold - 4 x 1,000 sold by Wha1e05.
  const whale = byId.get("demand.whale_accumulation")!;
  assert.equal(whale.measure.state, "derived");
  assert.equal(whale.inputs.netPurchases, 10_000 - 4_000 - 4_000);
  assert.ok((whale.inputs.tradeCoverage as number) >= 0.8);
  assert.equal(whale.measure.value, (whale.inputs.netPurchases as number) / (whale.inputs.cohortStartBalance as number));

  // Dip absorption: D-7 is only partly covered, so 4 of 5 dip days count; buys 4 x 300 against sells 4 x 200.
  const dip = byId.get("demand.dip_absorption")!;
  assert.equal(dip.measure.state, "derived");
  assert.deepEqual([dip.inputs.dipDays, dip.inputs.coveredDipDays], [5, 4]);
  assert.equal(dip.measure.value, 1200 / 800);

  // All-holder measures: a top-holder sample never stands in for all holders.
  for (const id of ["persistence.drawdown_retention", "persistence.balance_retention", "demand.meaningful_holder_growth"] as const) {
    const m = byId.get(id)!.measure;
    assert.equal(m.value, null, id);
    assert.equal(m.state, "unavailable", id);
    assert.match(m.note ?? "", /top_holders_sample; a sample never stands in for all holders/, id);
  }
  assert.equal(byId.get("persistence.portfolio_allocation")!.measure.state, "unavailable");
  db.close();
});

test("less than the required trade coverage leaves whale accumulation unpopulated with the measured coverage", () => {
  const { db, store } = storeWithData();
  db.prepare("UPDATE trade_coverage SET from_time = ?").run(C - 2 * DAY);
  const mi = tokenMethodInputs(store, { token_id: TOKEN, chain: "solana", token_created_at: null }, C, { codexCandles: [], volumeByDay: new Map(), prices: [], caps: [] }, []);
  const comps = holderComponents({
    asOf: C,
    liquiditySnapshots: [],
    ownReturn7d: null,
    peers: [],
    sources: { allHolders: false, topHolders: true, walletTrades: true, portfolio: false },
    panels: mi.panels,
    supply: [],
    prices: [],
    addressClasses: mi.addressClasses,
    trades: mi.trades,
    tradeCoverage: mi.tradeCoverage,
    dailyCloses: [],
    flows: [],
    episode: null,
    labels: cfg((c) => c.label),
    requires: cfg((c) => c.requires),
    maxAgeSeconds: cfg((c) => c.maxAgeSeconds),
    minCoverage: cfg((c) => c.minCoverage),
    parameters: cfg((c) => c.parameters ?? {}),
    minPeers: 3,
  });
  const whale = comps.find((c) => c.id === "demand.whale_accumulation")!.measure;
  assert.equal(whale.state, "insufficient_data");
  assert.match(whale.note!, /cover 2\d% of/);
  const conc = comps.find((c) => c.id === "health.concentration")!.measure;
  assert.equal(conc.state, "insufficient_data", "no circulating supply, no concentration");
  db.close();
});

test("FIFO cost: known only with history from the token's start; unknown inventory is split out, never zero", () => {
  const trades = [
    { time: 1, side: "buy" as const, usd: 100, amount: 100, wallet: "a", availableAt: 0 },
    { time: 2, side: "sell" as const, usd: 30, amount: 50, wallet: "a", availableAt: 0 },
    { time: 3, side: "sell" as const, usd: 60, amount: 100, wallet: "a", availableAt: 0 },
  ];
  const full = fifoSales(trades, true).sales;
  assert.deepEqual(
    full.map((s) => [s.soldValueUsd, s.costUsd]),
    [
      [30, 50],
      [30, 50],
      [30, null],
    ],
  );
  assert.ok(fifoSales(trades, false).sales.every((s) => s.costUsd === null));
  const merged = mergeSpans([{ from: 0, to: 10, availableAt: 0 }, { from: 5, to: 20, availableAt: 0 }, { from: 30, to: 40, availableAt: 99 }], 50);
  assert.deepEqual(merged, [[0, 20]], "a span not yet available at asOf is not coverage");
  const visible = mergeSpans([{ from: 0, to: 10, availableAt: 0 }, { from: 5, to: 20, availableAt: 0 }, { from: 30, to: 40, availableAt: 0 }], 50);
  assert.deepEqual(visible, [
    [0, 20],
    [30, 40],
  ]);
  assert.equal(coveredFraction(visible, 0, 40), 0.75);
});
