/**
 * Method tests. Every case uses SYNTHETIC inputs constructed here (see tests/fixtures/synthetic/README.md):
 * none of these wallets, prices or tokens are research data.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { BOTTOMING_DEFAULTS, type BottomingInputs, type Candle, bottomingHistory, evaluateBottoming } from "../../src/lib/lamble/methods/bottoming.ts";
import { evaluate, outcomes } from "../../src/lib/lamble/methods/evaluation.ts";
import { COMPONENT_IDS, type ComponentResult, composite, concentration, meaningfulHolders, retention, whaleAccumulation } from "../../src/lib/lamble/methods/holders.ts";
import { type MembershipRow, type NarrativeRow, type VenueRow, type WeeklySource, basket, buildEdition } from "../../src/lib/lamble/methods/weekly.ts";
import { DAY, HOUR, parseWeekId } from "../../src/lib/lamble/core/time.ts";

const T0 = Date.UTC(2026, 9, 1) / 1000; // 2026-10-01, a synthetic origin

test("buy 100, sell 100, buy 100 is endpoint-retained but not uninterrupted holding", () => {
  const r = retention(
    [{ wallet: "w1", balance: 100 }],
    [{ wallet: "w1", balance: 100 }],
    [
      { wallet: "w1", time: T0 + 1, delta: -100, kind: "sell" },
      { wallet: "w1", time: T0 + 2, delta: 100, kind: "buy" },
    ],
    T0,
    T0 + DAY,
  );
  assert.equal(r.endpointRetention, 1);
  assert.equal(r.uninterruptedShare, 0);
  // Without event history continuity is unknown, not assumed.
  const blind = retention([{ wallet: "w1", balance: 100 }], [{ wallet: "w1", balance: 100 }], null, T0, T0 + DAY);
  assert.equal(blind.uninterruptedShare, null);
  assert.equal(blind.continuityKnown, false);
});

test("price doubling with unchanged balances does not create new wallets", () => {
  const wallets = Array.from({ length: 10 }, (_, i) => ({ wallet: `w${i}`, balance: 60 }));
  // At $1 each wallet holds $60 (< $100); at $2 each holds $120 (>= $100) with the same balance.
  const r = meaningfulHolders(wallets, wallets, 1, 2, 100);
  assert.equal(r.entrants, 0);
  assert.equal(r.priceCrossers, 10);
  assert.equal(r.before, 0);
  assert.equal(r.after, 10);
  // A wallet that actually bought counts as an entrant.
  const bought = meaningfulHolders(wallets, [...wallets.slice(1), { wallet: "w0", balance: 200 }], 1, 1, 100);
  assert.equal(bought.entrants, 1);
});

test("transfers and rebases do not become whale purchases", () => {
  const cohort = ["whale-a", "whale-b"];
  const r = whaleAccumulation(
    cohort,
    [
      { wallet: "whale-a", time: T0 + 1, delta: 1000, kind: "transfer_in" },
      { wallet: "whale-b", time: T0 + 2, delta: 50, kind: "rebase" },
      { wallet: "whale-b", time: T0 + 3, delta: 10, kind: "buy" },
      { wallet: "not-in-cohort", time: T0 + 4, delta: 5000, kind: "buy" },
    ],
    T0,
    T0 + DAY,
  );
  assert.equal(r.netPurchases, 10);
  assert.equal(r.otherBalanceChange, 1050);
});

test("concentration keeps contracts unless classified, and reports exclusion sensitivity", () => {
  const holders = [
    { wallet: "pool", balance: 500 },
    { wallet: "smart-wallet", balance: 200 },
    ...Array.from({ length: 12 }, (_, i) => ({ wallet: `h${i}`, balance: 10 })),
  ];
  const r = concentration(holders, 1000, [{ wallet: "pool", class: "pool", verified: true }, { wallet: "smart-wallet", class: "contract", verified: true }], "top_holders_sample");
  assert.equal(r.top10Share, (200 + 9 * 10) / 1000); // pool excluded, the contract (smart wallet) kept
  assert.equal(r.sensitivity.none, (500 + 200 + 8 * 10) / 1000);
  assert.equal(r.population, "top_holders_sample");
});

function dailyCandles(prices: (number | null)[], volume = 5000): Candle[] {
  return prices.map((p, i) => ({
    start: T0 + i * DAY,
    high: p === null ? null : p * 1.02,
    low: p === null ? null : p * 0.98,
    close: p,
    volumeUsd: p === null ? null : volume,
    availableAt: T0 + (i + 1) * DAY + HOUR,
  }));
}

const crash = [10, 10, 10, 9, 8, 6, 4, 3, 2.5, 2.4, 2.45, 2.5, 2.6, 2.55];
const goodSales = (n: number) => Array.from({ length: n }, (_, i) => ({ time: T0 + (4 + i) * DAY, soldValueUsd: 20_000, costUsd: 60_000, availableAt: T0 + (5 + i) * DAY }));

function inputs(prices: (number | null)[], extra: Partial<BottomingInputs> = {}): BottomingInputs {
  return { tokenId: "synthetic:t", candles: dailyCandles(prices), samples: [], flows: null, sales: null, marketCaps: [], ...extra };
}

test("inadequate acquisition-cost coverage blocks capitulation; missing evidence is insufficient_data, not 0/3", () => {
  const asOf = T0 + crash.length * DAY + 2 * HOUR;
  const unknownCost = goodSales(6).map((s, i) => (i < 3 ? { ...s, costUsd: null } : s)); // 50% of sold value has no known cost
  const blocked = evaluateBottoming(inputs(crash, { sales: unknownCost }), asOf);
  assert.equal(blocked.conditions.capitulation.state, "insufficient_data");
  assert.equal(blocked.stage, null);
  assert.equal(blocked.state, "insufficient_data");
  const none = evaluateBottoming(inputs(crash), asOf); // no sales source at all
  assert.equal(none.state, "insufficient_data");
  assert.notEqual(none.stage, 0);
  const covered = evaluateBottoming(inputs(crash, { sales: goodSales(6) }), asOf);
  assert.equal(covered.conditions.capitulation.state, "met");
  assert.ok(covered.stage !== null && covered.stage >= 1);
  // Later conditions never advance the stage while an earlier one is unmet.
  const gains = goodSales(6).map((s) => ({ ...s, costUsd: 1000 }));
  const unmet = evaluateBottoming(inputs(crash, { sales: gains }), asOf);
  assert.equal(unmet.conditions.capitulation.state, "unmet");
  assert.equal(unmet.stage, 0);
});

test("a new lower low resets the low-holding condition; missing bars never establish stabilization", () => {
  const asOf = (n: number) => T0 + n * DAY + 2 * HOUR;
  // Low at day 9 (2.4), then three held days: condition 2 met at day 13.
  const held = evaluateBottoming(inputs(crash, { sales: goodSales(6) }), asOf(crash.length));
  assert.equal(held.conditions.lowHolds.state, "met");
  assert.equal(held.stage, 2);
  // A new lower low on day 14 resets it and is recorded as an invalidation.
  const lower = [...crash, 2.0, 2.1];
  const reset = evaluateBottoming(inputs(lower, { sales: goodSales(6) }), asOf(lower.length));
  assert.equal(reset.conditions.lowHolds.state, "unmet");
  assert.ok(reset.episode!.invalidations.some((i) => i.reason === "new lower low"));
  // The same held days with a missing candle in the middle do not count.
  const gappy = [...crash.slice(0, 11), null, 2.6, 2.55];
  const gap = evaluateBottoming(inputs(gappy, { sales: goodSales(6) }), asOf(gappy.length));
  assert.equal(gap.conditions.lowHolds.state, "unmet");
  // Thin trading does not count either.
  const thin = { ...inputs(crash, { sales: goodSales(6) }), candles: dailyCandles(crash, 10) };
  assert.equal(evaluateBottoming(thin, asOf(crash.length)).conditions.lowHolds.state, "unmet");
});

test("no look-ahead: an earlier evaluation is unchanged by a later lower low", () => {
  const later = [...crash, 2.0, 1.5, 1.2];
  const early = evaluateBottoming(inputs(later, { sales: goodSales(6) }), T0 + crash.length * DAY + 2 * HOUR);
  const alone = evaluateBottoming(inputs(crash, { sales: goodSales(6) }), T0 + crash.length * DAY + 2 * HOUR);
  assert.deepEqual(early, alone);
  const history = bottomingHistory(inputs(later, { sales: goodSales(6) }), [T0 + crash.length * DAY + 2 * HOUR, T0 + later.length * DAY + 2 * HOUR]);
  assert.equal(history.evaluations[0]!.stage, 2);
  assert.equal(history.evaluations[1]!.conditions.lowHolds.state, "unmet");
});

test("outside a drawdown the test is not_applicable; snapshot samples never hold a low", () => {
  const flat = Array.from({ length: 12 }, () => 10);
  const r = evaluateBottoming(inputs(flat), T0 + 12 * DAY + HOUR);
  assert.equal(r.state, "not_applicable");
  const short = evaluateBottoming(inputs([10, 4]), T0 + 2 * DAY + HOUR);
  assert.equal(short.state, "insufficient_data");
  const samples = crash.map((p, i) => ({ time: T0 + i * DAY + 6 * HOUR, price: p, availableAt: T0 + i * DAY + 7 * HOUR }));
  const s = evaluateBottoming({ tokenId: "synthetic:s", candles: [], samples, flows: null, sales: goodSales(6), marketCaps: [] }, T0 + crash.length * DAY);
  assert.equal(s.priceBasis, "samples");
  assert.equal(s.conditions.lowHolds.state, "insufficient_data");
  assert.ok(s.stage === null || s.stage <= 1);
  // A low sampled in the interval that is still open: elapsed time is zero, never negative.
  const fresh = [...crash.slice(0, -1), crash.at(-1)! * 0.5].map((p, i) => ({ time: T0 + i * DAY + 6 * HOUR, price: p, availableAt: T0 + i * DAY + 6 * HOUR }));
  const open = evaluateBottoming({ tokenId: "synthetic:s", candles: [], samples: fresh, flows: null, sales: null, marketCaps: [] }, T0 + (crash.length - 1) * DAY + 7 * HOUR);
  assert.equal(open.secondsSinceLow, 0);
});

test("composite: disabled by config; gated; missing components never raise a score", () => {
  const comp = (id: (typeof COMPONENT_IDS)[number], value: number | null): ComponentResult => ({
    id,
    area: id.startsWith("persistence") ? "persistence" : id.startsWith("demand") ? "demand" : id.startsWith("health") ? "market_health" : "relative_strength",
    label: id,
    requires: [],
    inputs: {},
    history: [],
    measure: value === null ? { state: "unavailable", value: null, unit: "ratio", asOf: null, note: "x" } : { state: "derived", value, unit: "ratio", asOf: 0 },
  });
  const cfg = {
    enabled: true,
    normalization: Object.fromEntries(COMPONENT_IDS.map((id) => [id, { zeroAt: 0, hundredAt: 1 }])),
    weights: Object.fromEntries(COMPONENT_IDS.map((id) => [id, 1 / 9])),
    gate: { minComponents: 7, requiredAreas: ["persistence", "demand", "market_health", "relative_strength"] as const, maxBoundWidth: 15 },
  };
  assert.equal(composite([], { ...cfg, enabled: false, disabledReason: "off" }).state, "disabled");
  const two = COMPONENT_IDS.map((id) => comp(id, id.startsWith("health.liq") || id.startsWith("relative") ? 0.9 : null));
  assert.equal(composite(two, { ...cfg, gate: { ...cfg.gate, requiredAreas: [...cfg.gate.requiredAreas] } }).state, "insufficient_data");
  const seven = COMPONENT_IDS.map((id, i) => comp(id, i < 7 ? 0.5 : null));
  const withMissing = composite(seven, { ...cfg, gate: { ...cfg.gate, minComponents: 7, requiredAreas: ["persistence", "demand", "market_health"] } });
  const allLow = composite(COMPONENT_IDS.map((id, i) => comp(id, i < 7 ? 0.5 : 0)), { ...cfg, gate: { ...cfg.gate, requiredAreas: ["persistence", "demand", "market_health"] } });
  assert.ok(withMissing.bound![0] <= allLow.bound![0] + 1e-9, "missing components cannot score above observed zeros");
  assert.ok(withMissing.bound![1] > withMissing.bound![0]);
});

// ---------------------------------------------------------------- weekly editions

const W42 = parseWeekId("2026-W42");
const W41 = { ...parseWeekId("2026-W41"), id: "2026-W41" };

function weeklySource(over: Partial<WeeklySource> = {}, data?: { memberships?: MembershipRow[]; volumes?: Record<string, number | null>; fees?: Record<string, number | null> }): WeeklySource {
  const venues: VenueRow[] = [
    { slug: "alpha", name: "Alpha", providerSlug: "alpha", supplySideDefinition: "Creator fees" },
    { slug: "beta", name: "Beta", providerSlug: "beta", supplySideDefinition: null },
    { slug: "gamma", name: "Gamma (overlaps alpha)", providerSlug: "gamma", supplySideDefinition: null },
  ];
  const memberships = data?.memberships ?? [
    { intervalId: "n1:a@0", narrativeId: "n1", tokenId: "solana:A", effectiveFrom: W41.start, recordedAt: W41.start, effectiveTo: null, closeKind: null, observedThrough: null, closeRecordedAt: null, basis: "recorded" },
    { intervalId: "n2:a@0", narrativeId: "n2", tokenId: "solana:A", effectiveFrom: W41.start, recordedAt: W41.start, effectiveTo: null, closeKind: null, observedThrough: null, closeRecordedAt: null, basis: "recorded" },
    { intervalId: "n2:b@0", narrativeId: "n2", tokenId: "solana:B", effectiveFrom: W41.start, recordedAt: W41.start, effectiveTo: null, closeKind: null, observedThrough: null, closeRecordedAt: null, basis: "recorded" },
  ];
  const narratives: NarrativeRow[] = ["n1", "n2"].map((id) => ({ id, slug: id, title: id.toUpperCase(), firstObservedAt: W41.start - 30 * DAY, lifecycle: [{ state: "collected", from: W41.start - 30 * DAY, to: null, reason: null }], story: null, signals: [] }));
  return {
    venueDaily: (p, m, d) => (data?.fees && `${p}|${m}|${d}` in data.fees ? data.fees[`${p}|${m}|${d}`]! : m === "venue.fees_usd" ? (p === "alpha" ? 100 : p === "beta" ? 50 : 30) : m === "venue.supply_side_usd" ? 10 : 20),
    tokenDailyVolume: (t, d) => (data?.volumes && `${t}|${d}` in data.volumes ? data.volumes[`${t}|${d}`]! : t === "solana:A" ? 1000 : 500),
    tokenPrice: (t, time) => ({ price: time >= W42.end ? 2 : 1, time }),
    indexedNear: () => ({ created7d: 700, completed7d: 7, asOf: W42.end + 6 * HOUR }),
    feePolicy: () => ({ included: ["alpha", "beta"], excluded: { gamma: "overlaps alpha" }, runId: "synthetic" }),
    priorFeePolicy: () => ({ included: ["alpha", "beta"], excluded: { gamma: "overlaps alpha" }, runId: "synthetic" }),
    venues: () => venues,
    narratives: () => narratives,
    memberships: () => memberships,
    tokenLabel: (t) => ({ symbol: t.slice(-1), name: null, createdAt: null }),
    runsIn: () => ({ dailyRuns: 7, financialAnchorReachesEnd: true }),
    ...over,
  };
}

const rules = { retireMaxVolume24Usd: 100_000, archiveMaxVolume24Usd: 1000, minDailyRuns: 5 };

test("multi-tag tokens and overlapping venue fees are not double-counted", () => {
  const e = buildEdition(weeklySource(), { id: "2026-W42", week: W42, prior: W41, cutoff: W42.end + 6 * HOUR, mode: "as_known_then", rules });
  assert.equal(e.market.feeSubtotal.value, 7 * 100 + 7 * 50); // gamma excluded, never added
  assert.ok(e.market.excluded.some((x) => x.slug === "gamma"));
  const n1 = e.narratives.find((n) => n.id === "n1")!;
  const n2 = e.narratives.find((n) => n.id === "n2")!;
  assert.equal(n1.volume.observed, 7000);
  assert.equal(n2.volume.observed, 7000 + 3500);
  assert.equal(e.dedup.totalVolume, 7000 + 3500); // token A counted once
  assert.equal(e.dedup.sumOfNarrativeTotals, 17500);
  assert.deepEqual(e.dedup.overlap.map((o) => o.tokenId), ["solana:A"]);
  // One comparable member is not a basket: the change is withheld and the basket is still disclosed.
  assert.equal(n1.comparable.members, 1);
  assert.equal(n1.comparable.sufficient, false);
  assert.equal(n1.volumeChangePct, null);
  // Rolling indexed counts are reported in their own window with the ratio labelled.
  assert.equal(e.market.indexedActivity.periodCompletionRatio, 0.01);
  assert.match(e.market.indexedActivity.scope, /not a graduation probability/);
});

test("weekly boundaries: seven whole UTC days, end exclusive; partial weeks and scope changes are explicit", () => {
  const seen: number[] = [];
  const src = weeklySource({ tokenDailyVolume: (t, d) => (seen.push(d), t === "solana:A" ? 1 : 1) });
  buildEdition(src, { id: "2026-W42", week: W42, prior: W41, cutoff: W42.end + HOUR, mode: "as_known_then", rules });
  const inWeek = seen.filter((d) => d >= W42.start && d < W42.end);
  assert.equal(new Set(inWeek).size, 7);
  assert.ok(!seen.includes(W42.end), "the next Monday is not part of the week");
  // A missing settled day makes the fee total partial and lists the venue.
  const missing = weeklySource({}, { fees: { [`beta|venue.fees_usd|${W42.end - DAY}`]: null } });
  const partial = buildEdition(missing, { id: "2026-W42", week: W42, prior: W41, cutoff: W42.end + HOUR, mode: "as_known_then", rules });
  assert.equal(partial.status, "partial");
  assert.equal(partial.market.feeSubtotal.value, null);
  assert.ok(partial.checks.find((c) => c.id === "fees")!.detail.includes("beta (1)"));
  // A venue added to the policy this week: the change is computed on the intersection and flagged.
  const widened = weeklySource({ feePolicy: () => ({ included: ["alpha", "beta", "gamma"], excluded: {}, runId: "new" }) });
  const sc = buildEdition(widened, { id: "2026-W42", week: W42, prior: W41, cutoff: W42.end + HOUR, mode: "as_known_then", rules });
  assert.equal(sc.market.feeSubtotal.scopeChanged, true);
  assert.deepEqual(sc.market.feeSubtotal.comparedOn, ["alpha", "beta"]);
  assert.equal(sc.market.feeSubtotal.changePct, 0);
  // Year transition: 2026-W53 spans into January 2027.
  const w53 = parseWeekId("2026-W53");
  assert.equal(new Date(w53.end * 1000).toISOString(), "2027-01-04T00:00:00.000Z");
});

test("as known then: a Thursday classification cannot appear in Monday's view", () => {
  const monday = W42.start;
  const thursday = W42.start + 3 * DAY;
  const rows: MembershipRow[] = [
    { intervalId: "n1:c@thu", narrativeId: "n1", tokenId: "solana:C", effectiveFrom: thursday, recordedAt: thursday, effectiveTo: null, closeKind: null, observedThrough: null, closeRecordedAt: null, basis: "recorded" },
  ];
  assert.equal(basket(rows, "n1", { start: W41.start, end: monday }, monday, "as_known_then").length, 0);
  assert.equal(basket(rows, "n1", W42, W42.end, "as_known_then").length, 1);
  // A backfill recorded later is excluded from views cut before it was recorded, even for earlier weeks.
  const backfill: MembershipRow[] = [{ ...rows[0]!, effectiveFrom: W41.start, recordedAt: thursday }];
  assert.equal(basket(backfill, "n1", W41, W41.end + HOUR, "as_known_then").length, 0);
  assert.equal(basket(backfill, "n1", W41, W42.end, "current_basket").length, 1);
});

test("leaving featured placement (collection paused) keeps factual membership and history", () => {
  const paused: MembershipRow = {
    intervalId: "n1:a@0",
    narrativeId: "n1",
    tokenId: "solana:A",
    effectiveFrom: W41.start,
    recordedAt: W41.start,
    effectiveTo: null,
    closeKind: "collection_paused",
    observedThrough: W42.start + 2 * DAY,
    closeRecordedAt: W42.start + 2 * DAY,
    basis: "recorded",
  };
  const asKnown = basket([paused], "n1", W42, W42.end, "as_known_then");
  assert.equal(asKnown.length, 1, "membership stays open for the week");
  // Volume after the pause is not collected: the narrative total is partial, never zero-filled.
  const src = weeklySource({}, { memberships: [paused], volumes: Object.fromEntries([3, 4, 5, 6].map((i) => [`solana:A|${W42.start + i * DAY}`, null])) });
  const e = buildEdition(src, { id: "2026-W42", week: W42, prior: W41, cutoff: W42.end, mode: "as_known_then", rules });
  const n1 = e.narratives.find((n) => n.id === "n1")!;
  assert.equal(n1.volume.complete, false);
  assert.equal(n1.volume.observed, 3000);
  assert.ok(Math.abs(n1.volume.coverage! - 3 / 7) < 1e-9);
  assert.equal(n1.volumeChangePct, null, "no change is computed from an incomplete week");
});

test("evaluation: small samples make no claim; returns are net of costs", () => {
  const prices = [{ tokenId: "x", samples: [{ time: 0, price: 1 }, { time: DAY, price: 1.1 }, { time: 7 * DAY, price: 0.5 }] }];
  const o = outcomes([{ tokenId: "x", time: 0, label: "s" }], prices);
  assert.ok(Math.abs(o.find((r) => r.horizon === DAY)!.netReturn - (0.1 - 0.03)) < 1e-9);
  assert.equal(o.find((r) => r.horizon === 7 * DAY)!.failed, true);
  const r = evaluate([{ tokenId: "x", time: 0, label: "s" }], { all: [{ tokenId: "x", time: 0, label: "b" }] }, prices);
  assert.equal(r.horizons[0]!.all.confidence, "insufficient");
  assert.match(r.horizons[0]!.claim, /No performance claim/);
  void BOTTOMING_DEFAULTS;
});
