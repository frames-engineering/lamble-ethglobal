/**
 * Foundation tests: identity, time conventions, measure states, catalog rules, adapters.
 * x4o2 cases use SYNTHETIC fixtures (tests/fixtures/synthetic) because no x4o2 response has been retained.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { codexTokenBars, codexTokenSnapshot } from "../../src/lib/lambo/adapters/codex.ts";
import { defillamaFees } from "../../src/lib/lambo/adapters/defillama.ts";
import { ADAPTER_KEYS } from "../../src/lib/lambo/adapters/registry.ts";
import type { EventRecord } from "../../src/lib/lambo/adapters/types.ts";
import { fomoCandles, fomoFeed, fomoHolders, mergeEventPages, newestTrade, pumpHolders, sourceTime } from "../../src/lib/lambo/adapters/x4o2.ts";
import { type Catalog, type Capability, checkCatalogRules, getCapability } from "../../src/lib/lambo/catalog/catalog.ts";
import { IdentityError, parseTokenId, poolIdentity, tokenIdentity } from "../../src/lib/lambo/core/identity.ts";
import { assertMeasure, hasValue, missing, observed, sumOrNull, withFreshness } from "../../src/lib/lambo/core/measure.ts";
import { DAY, HOUR, WEEK, calendarWeek, daysIn, developingWeek, lastCompleteWeek, parseWeekId, parseWeekIdOrNull, rollingSevenDays, weekId, weekStart } from "../../src/lib/lambo/core/time.ts";

const catalog = JSON.parse(readFileSync(new URL("../../docs/data/providers.json", import.meta.url), "utf8")) as Catalog;
const synthetic = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/synthetic/${name}`, import.meta.url), "utf8"));
const at = (s: string) => Date.parse(s) / 1000;

test("same ticker, different contracts stay distinct; Solana case survives; EVM canonical is lowercase", () => {
  // Two real constituents share the ticker SI: Super Inu and Super Intelligence (registry poolUniverse).
  const a = tokenIdentity("solana", "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP");
  const b = tokenIdentity("solana", "9aqmJjCnnMQv42TXLk921ceUkN35nea2QP969n1caqjj");
  assert.notEqual(a.id, b.id);
  assert.equal(a.address, "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP");
  // Changing one character's case is a different Solana address, not the same token.
  const lower = tokenIdentity("solana", "dEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP");
  assert.notEqual(lower.id, a.id);
  const evm = tokenIdentity("bsc", "0x183FFBED812202A4DEA1EF8A86B52F3B09F6FFFF");
  assert.equal(evm.id, "bsc:0x183ffbed812202a4dea1ef8a86b52f3b09f6ffff");
  assert.equal(evm.displayAddress, "0x183FFBED812202A4DEA1EF8A86B52F3B09F6FFFF");
  assert.equal(parseTokenId(evm.id).id, evm.id);
  // Same address on two chains is two tokens.
  assert.notEqual(tokenIdentity("base", evm.address).id, evm.id);
  assert.throws(() => tokenIdentity("solana", "0x183ffbed812202a4dea1ef8a86b52f3b09f6ffff"), IdentityError);
  assert.throws(() => tokenIdentity("polygon", evm.address), IdentityError);
  // Pool ids that are not contract addresses (v4 bytes32) are accepted as pools, not tokens.
  const v4 = poolIdentity("base", `0x${"ab".repeat(32)}`);
  assert.equal(v4.kind, "evm-pool-id");
  assert.throws(() => tokenIdentity("base", `0x${"ab".repeat(32)}`), IdentityError);
});

test("weekly boundaries: Monday 00:00 UTC, end exclusive, ISO week-years across New Year", () => {
  const w42 = parseWeekId("2026-W42");
  assert.equal(w42.start, at("2026-10-12T00:00:00Z"));
  assert.equal(w42.end, at("2026-10-19T00:00:00Z"));
  assert.equal(weekId(at("2026-10-18T23:59:59Z")), "2026-W42");
  assert.equal(weekId(at("2026-10-19T00:00:00Z")), "2026-W43"); // end exclusive
  assert.equal(weekStart(at("2026-10-14T13:00:00Z")), w42.start);
  // 2026 starts on a Thursday, so it has 53 ISO weeks; W53 runs into 2027.
  assert.equal(parseWeekId("2026-W53").start, at("2026-12-28T00:00:00Z"));
  assert.equal(weekId(at("2027-01-03T12:00:00Z")), "2026-W53");
  assert.equal(weekId(at("2027-01-04T00:00:00Z")), "2027-W01");
  assert.equal(parseWeekIdOrNull("2027-W53"), null); // 2027 has 52 weeks
  assert.equal(parseWeekIdOrNull("2026-W00"), null);
  assert.equal(parseWeekIdOrNull("2026-42"), null);
  // 2020-12-31 (Thursday) belongs to 2020-W53; 2021-01-01 to 2020-W53 as well.
  assert.equal(weekId(at("2021-01-01T00:00:00Z")), "2020-W53");
  // Rolling seven days and the developing week are different intervals.
  const now = at("2026-10-21T09:00:00Z");
  assert.deepEqual(rollingSevenDays(now), { start: now - WEEK, end: now });
  const dev = developingWeek(now);
  assert.equal(dev.start, at("2026-10-19T00:00:00Z"));
  assert.equal(dev.elapsedSeconds, 2 * DAY + 9 * HOUR);
  assert.deepEqual(lastCompleteWeek(now), calendarWeek(at("2026-10-12T00:00:00Z")));
  assert.equal(daysIn(w42).length, 7);
});

test("missing and stale observations stay distinct from zero", () => {
  const zero = observed(0, "usd", at("2026-10-19T00:00:00Z"));
  assert.ok(hasValue(zero));
  assert.equal(zero.value, 0);
  const none = missing("insufficient_data", "usd", "No bars");
  assert.equal(none.value, null);
  assert.ok(!hasValue(none));
  assertMeasure(zero, "zero");
  assertMeasure(none, "none");
  assert.throws(() => assertMeasure({ state: "observed", value: null, unit: "usd", asOf: 0 }, "bad"));
  assert.throws(() => assertMeasure({ state: "unavailable", value: 0, unit: "usd", asOf: 0, note: "x" }, "bad"));
  assert.equal(sumOrNull([1, null, 2]), null);
  assert.equal(sumOrNull([0, 0]), 0);
  // Freshness labels a value stale but never moves its own timestamp.
  const old = observed(5, "count", at("2026-10-10T00:00:00Z"));
  const labelled = withFreshness(old, at("2026-10-19T00:00:00Z"), 6 * HOUR);
  assert.equal(labelled.state, "stale");
  assert.equal(labelled.asOf, old.asOf);
  assert.equal(withFreshness(observed(5, "count", at("2026-10-18T23:00:00Z")), at("2026-10-19T00:00:00Z"), 6 * HOUR).state, "observed");
});

test("units and timestamp conversions are declared, never guessed", () => {
  assert.equal(sourceTime(1792368000000, "milliseconds"), 1792368000);
  assert.equal(sourceTime(1792368000, "seconds"), 1792368000);
  assert.equal(sourceTime(1792368000000, undefined), null); // a bare number has no unit
  assert.equal(sourceTime("2026-10-19T00:00:00Z", undefined), at("2026-10-19T00:00:00Z"));
  // Codex change24 is a ratio and becomes percent; a zero market cap is the provider's unknown, liquidity 0 is measured.
  const cap = getCapability(catalog, "codex.token-snapshot");
  const out = codexTokenSnapshot.normalize({
    body: { data: { filterTokens: { results: [{ pair: { address: "AG1EhPjsBrkxQWkViuLXF6pQnHwfr9f9sdNneeoykcEJ", token0: "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP", token1: "So11111111111111111111111111111111111111112", networkId: 1399811149, createdAt: 1 }, priceUSD: "0.5", circulatingMarketCap: "0", change24: "-0.047", volume24: "0", liquidity: "0" }] } } },
    request: { id: "mpp.codex.post.graphql", args: { query: '{filterTokens(tokens:["DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP:1399811149"],limit:2){results{pair{address}}}}' } },
    capability: cap,
    fetchedAt: at("2026-10-19T06:00:00Z"),
  });
  const metric = (m: string) => out.observations.find((o) => o.metric === m);
  assert.equal(metric("token.market_cap_circulating_usd"), undefined);
  assert.equal(metric("token.liquidity_usd")?.value, 0);
  assert.equal(metric("token.volume_rolling24h_usd")?.value, 0);
  assert.ok(Math.abs(metric("token.price_change_rolling24h_pct")!.value - -4.7) < 1e-9);
  assert.equal(metric("token.price_usd")?.eventTime, null); // no source time in the body
});

test("Codex bars: missing buckets stay missing; buckets outside the request are rejected", () => {
  const cap = getCapability(catalog, "codex.token-bars");
  const T = at("2026-10-19T04:00:00Z");
  const out = codexTokenBars.normalize({
    body: { data: { p0: { t: [T - 3 * HOUR, T - 2 * HOUR, T - HOUR, T + HOUR], volume: ["10", null, "0", "5"], o: [1, 1, 1, 1], h: [2, 2, 2, 2], l: [0.5, 0.5, 0.5, 0.5], c: [1.5, 1.5, 1.5, 1.5] } } },
    request: { id: "mpp.codex.post.graphql", args: { query: `{ p0:getTokenBars(symbol:"DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP:1399811149",from:${T - 3 * HOUR},to:${T - 1},resolution:"60",currencyCode:USD,removeEmptyBars:false){t volume o h l c} }` } },
    capability: cap,
    fetchedAt: T + 2 * HOUR,
  });
  const volumes = out.observations.filter((o) => o.metric === "token.volume_usd");
  assert.deepEqual(volumes.map((o) => [o.windowStart, o.value]), [[T - 3 * HOUR, 10], [T - HOUR, 0]]);
  assert.equal(out.observations.filter((o) => o.metric === "token.price_low_usd").length, 3);
  assert.ok(out.warnings.some((w) => w.includes("outside the requested grid")));
});

test("DefiLlama: the current partial day and unsettled days are not observations", () => {
  const cap = getCapability(catalog, "defillama.fees");
  const D = at("2026-10-19T00:00:00Z");
  const out = defillamaFees.normalize({
    body: { data: { slug: "pump.fun", totalDataChart: [[D - 2 * DAY, 100], [D - DAY, 0], [D, 50]] } },
    request: { id: "x", args: { protocol: "pump.fun", dataType: "dailyFees" } },
    capability: cap,
    fetchedAt: D + 5 * HOUR,
  });
  assert.deepEqual(out.observations.map((o) => [o.windowStart, o.value]), [[D - 2 * DAY, 100], [D - DAY, 0]]);
  const early = defillamaFees.normalize({ body: { data: { slug: "pump.fun", totalDataChart: [[D - DAY, 7]] } }, request: { id: "x", args: { protocol: "pump.fun", dataType: "dailyFees" } }, capability: cap, fetchedAt: D + 3 * HOUR });
  assert.equal(early.observations.length, 0, "a day that closed less than settleHours ago is not settled");
  const wrong = defillamaFees.normalize({ body: { data: { slug: "bags", totalDataChart: [] } }, request: { id: "x", args: { protocol: "pump.fun", dataType: "dailyFees" } }, capability: cap, fetchedAt: D });
  assert.ok(wrong.refused);
});

test("a pinned FOMO post is never the newest trade; repeated pagination does not duplicate events", () => {
  const fx = synthetic("fomo-feed-pages.json");
  const cap: Capability = { ...getCapability(catalog, "fomo.feed") };
  cap.contract = { ...cap.contract, fieldMap: fx.fieldMap };
  // Production mode refuses an unverified map; validation mode runs it.
  const refused = fomoFeed.normalize({ body: fx.pages[0].body, request: { id: cap.toolId!, args: fx.pages[0].request.args }, capability: cap, fetchedAt: at("2026-10-19T12:00:00Z") });
  assert.ok(refused.refused);
  assert.equal(refused.events.length, 0);
  const pages: EventRecord[][] = fx.pages.map((p: { body: unknown; request: { args: Record<string, unknown> } }) =>
    fomoFeed.normalize({ body: p.body, request: { id: cap.toolId!, args: p.request.args }, capability: cap, fetchedAt: at("2026-10-19T12:00:00Z"), mode: "validation" } as never).events,
  );
  // The pinned manual post comes back on both pages even though types= excluded it.
  assert.equal(pages[0]![0]!.class, "pinned_post");
  assert.equal(pages[1]![0]!.class, "pinned_post");
  const merged = mergeEventPages(pages);
  assert.deepEqual(merged.map((e) => e.sourceId).sort(), ["e-1", "e-2", "e-3", "pin-1"]);
  assert.equal(merged.filter((e) => e.sourceId === "e-2").length, 1);
  // The pinned post has the latest timestamp, but the newest trade is e-3; the transfer e-1 is not a trade.
  assert.equal(merged[0]!.sourceId, "pin-1");
  assert.equal(newestTrade(merged)?.sourceId, "e-3");
  assert.equal(merged.find((e) => e.sourceId === "e-1")?.class, "transfer");
  assert.ok(merged.every((e) => e.population === "fomo_users"));
});

test("sampled FOMO and Pump holder panels never masquerade as complete holder coverage", () => {
  const map = { items: "data.holders", fields: { wallet: "wallet", amount: "amount", valueUsd: "value", costBasisUsd: "costBasis", isDeveloper: "dev" }, units: { amount: "token_units" as const, value: "usd" as const } };
  const body = { meta: { observedAt: "2026-10-19T12:00:00Z" }, data: { holders: [{ wallet: "SyntheticWallet1111111111111111111111111111", amount: 10, value: 5, costBasis: 3, dev: false }] } };
  for (const [adapter, key, args] of [
    [fomoHolders, "fomo.holders", { chain: "solana", address: "So11111111111111111111111111111111111111112" }],
    [pumpHolders, "pump.holders", { mint: "So11111111111111111111111111111111111111112" }],
  ] as const) {
    const cap = getCapability(catalog, key);
    const out = adapter.normalize({ body, request: { id: cap.toolId!, args }, capability: { ...cap, contract: { ...cap.contract, fieldMap: map } }, fetchedAt: 0, mode: "validation" } as never);
    assert.equal(out.panels.length, 1);
    const panel = out.panels[0]!;
    assert.equal(panel.complete, false);
    assert.notEqual(panel.population, "all_holders");
    assert.equal(panel.population, key === "fomo.holders" ? "fomo_users" : "top_holders_sample");
    // valueUsd has a declared USD unit only under the key "value", so the map's valueUsd (unit missing) is not read as USD.
    assert.equal(panel.rows[0]!.valueUsd, null);
    assert.equal(panel.rows[0]!.costBasisUsd, null);
    // A capability relabelled as all_holders is refused by the adapter and by the catalog rules.
    const forged = { ...cap, semantics: { ...cap.semantics, population: "all_holders" as const }, contract: { ...cap.contract, fieldMap: map } };
    assert.ok(adapter.normalize({ body, request: { id: cap.toolId!, args }, capability: forged, fetchedAt: 0, mode: "validation" } as never).refused);
    assert.ok(checkCatalogRules({ ...catalog, capabilities: catalog.capabilities.map((c) => (c.key === key ? forged : c)) }, ADAPTER_KEYS).some((e) => e.includes("never all-holder")));
  }
});

test("FOMO candle times are milliseconds by descriptor and convert to seconds; undeclared units are refused", () => {
  const cap = getCapability(catalog, "fomo.candles");
  const body = { data: [{ t: 1792368000000, o: 1, h: 2, l: 0.5, c: 1.5, v: 10 }] };
  const map = { items: "data", fields: { time: "t", open: "o", high: "h", low: "l", close: "c", volumeUsd: "v" }, units: { time: "milliseconds" as const, volumeUsd: "usd" as const } };
  const ok = fomoCandles.normalize({ body, request: { id: cap.toolId!, args: { chain: "solana", address: "So11111111111111111111111111111111111111112", period: "1h" } }, capability: { ...cap, contract: { ...cap.contract, fieldMap: map } }, fetchedAt: 0, mode: "validation" } as never);
  assert.equal(ok.candles[0]!.start, 1792368000);
  assert.equal(ok.candles[0]!.volumeUsd, 10);
  const noUnit = fomoCandles.normalize({ body, request: { id: cap.toolId!, args: { chain: "solana", address: "So11111111111111111111111111111111111111112", period: "1h" } }, capability: { ...cap, contract: { ...cap.contract, fieldMap: { ...map, units: {} } } }, fetchedAt: 0, mode: "validation" } as never);
  assert.ok(noUnit.refused);
});

test("catalog: candidates cannot be enabled, and an unregistered adapter blocks enabling", () => {
  assert.deepEqual(checkCatalogRules(catalog, ADAPTER_KEYS), []);
  const flip = (key: string, patch: (c: Capability) => Capability) => ({ ...catalog, capabilities: catalog.capabilities.map((c) => (c.key === key ? patch(c) : c)) });
  const enabledCandidate = flip("pump.holders", (c) => ({ ...c, enabled: true }));
  const errors = checkCatalogRules(enabledCandidate, ADAPTER_KEYS);
  assert.ok(errors.some((e) => e.includes("enabled but status is candidate")));
  assert.ok(errors.some((e) => e.includes("without a verified field map")));
  const noAdapter = flip("pump.holders", (c) => ({ ...c, adapter: "x4o2.pump.new-route" }));
  assert.ok(checkCatalogRules(noAdapter, ADAPTER_KEYS).some((e) => e.includes("is not registered")));
  // Argument types follow the live seller schema (402 probe); the descriptor that disagreed is kept for the record.
  type Props = { properties: { limit: { type: string } } };
  const holders = getCapability(catalog, "pump.holders").contract as unknown as { inputSchema: Props; descriptorInputSchema: Props };
  assert.equal(holders.inputSchema.properties.limit.type, "integer");
  assert.equal(holders.descriptorInputSchema.properties.limit.type, "string");
  assert.equal((getCapability(catalog, "pump.trending").contract.inputSchema as unknown as Props).properties.limit.type, "integer");
  // Payment network is not the data network.
  const fomo = getCapability(catalog, "fomo.candles");
  assert.equal(fomo.payment?.network, "base");
  assert.ok(fomo.dataNetworks.includes("robinhood"));
  // Pump is paid in USDC on Base, but its data network is Solana only.
  const pump = getCapability(catalog, "pump.holders");
  assert.equal(pump.payment?.network, "base");
  assert.deepEqual(pump.dataNetworks, ["solana"]);
});
