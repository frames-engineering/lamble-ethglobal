/**
 * Holder analysis (docs/methods/holder-analysis.v1.json): nine components in four areas, plus a gated
 * composite framework. Every number is computed here; nothing is estimated by a model.
 */
import type { Population } from "../catalog/catalog.ts";
import { type Measure, derived, missing } from "../core/measure.ts";

export const HOLDERS_VERSION = "holder-analysis-v1.0.0";
export const COMPOSITE_VERSION = "holder-composite-v0.1.0-experimental";

export const COMPONENT_IDS = [
  "persistence.drawdown_retention",
  "persistence.balance_retention",
  "persistence.portfolio_allocation",
  "demand.meaningful_holder_growth",
  "demand.whale_accumulation",
  "demand.dip_absorption",
  "health.concentration",
  "health.liquidity_to_size",
  "relative.peer_performance",
] as const;
export type ComponentId = (typeof COMPONENT_IDS)[number];
export type Area = "persistence" | "demand" | "market_health" | "relative_strength";

export const AREA: Record<ComponentId, Area> = {
  "persistence.drawdown_retention": "persistence",
  "persistence.balance_retention": "persistence",
  "persistence.portfolio_allocation": "persistence",
  "demand.meaningful_holder_growth": "demand",
  "demand.whale_accumulation": "demand",
  "demand.dip_absorption": "demand",
  "health.concentration": "market_health",
  "health.liquidity_to_size": "market_health",
  "relative.peer_performance": "relative_strength",
};

// ---------------------------------------------------------------- pure component calculations

export interface BalanceCheckpoint {
  wallet: string;
  balance: number;
}

export interface WalletEvent {
  wallet: string;
  time: number;
  /** Signed token amount: + increases the wallet's balance, - decreases it. */
  delta: number;
  kind: "buy" | "sell" | "transfer_in" | "transfer_out" | "rebase" | "airdrop";
}

/**
 * Endpoint retention versus uninterrupted holding. Endpoint retention compares two checkpoints only.
 * Uninterrupted holding needs the wallet's full event history between them: a balance that touched zero
 * (complete exit) breaks continuity even if the wallet bought back before t1.
 */
export function retention(t0: BalanceCheckpoint[], t1: BalanceCheckpoint[], events: WalletEvent[] | null, from: number, to: number) {
  const b1 = new Map(t1.map((c) => [c.wallet, c.balance]));
  const cohort = t0.filter((c) => c.balance > 0);
  const total = cohort.reduce((a, c) => a + c.balance, 0);
  const endpoint = total > 0 ? cohort.reduce((a, c) => a + Math.min(b1.get(c.wallet) ?? 0, c.balance), 0) / total : null;
  if (events === null) return { endpointRetention: endpoint, uninterruptedShare: null as number | null, continuityKnown: false };
  let uninterrupted = 0;
  for (const c of cohort) {
    let bal = c.balance;
    let exited = false;
    for (const e of events.filter((x) => x.wallet === c.wallet && x.time >= from && x.time < to).sort((a, b) => a.time - b.time)) {
      bal += e.delta;
      if (bal <= 1e-12) exited = true;
    }
    if (!exited && bal > 0) uninterrupted += c.balance;
  }
  return { endpointRetention: endpoint, uninterruptedShare: total > 0 ? uninterrupted / total : null, continuityKnown: true };
}

/**
 * Meaningful-holder growth: entrants must cross the USD threshold AND have increased their token balance.
 * A wallet whose USD value crossed only because the price rose is a price-crosser, never an entrant.
 */
export function meaningfulHolders(t0: BalanceCheckpoint[], t1: BalanceCheckpoint[], price0: number, price1: number, usdThreshold: number) {
  const b0 = new Map(t0.map((c) => [c.wallet, c.balance]));
  let before = 0;
  let after = 0;
  const entrants: string[] = [];
  const priceCrossers: string[] = [];
  for (const c of t0) if (c.balance * price0 >= usdThreshold) before++;
  for (const c of t1) {
    if (c.balance * price1 < usdThreshold) continue;
    after++;
    const prev = b0.get(c.wallet) ?? 0;
    if (prev * price0 >= usdThreshold) continue;
    if (c.balance > prev) entrants.push(c.wallet);
    else priceCrossers.push(c.wallet);
  }
  return { before, after, entrants: entrants.length, priceCrossers: priceCrossers.length, growth: before > 0 ? (after - before) / before : null };
}

/** Net purchases by a fixed cohort from trades only; transfers, airdrops and rebases are balance changes, not purchases. */
export function whaleAccumulation(cohort: readonly string[], events: WalletEvent[], from: number, to: number) {
  const set = new Set(cohort);
  let bought = 0;
  let sold = 0;
  let otherBalanceChange = 0;
  for (const e of events) {
    if (!set.has(e.wallet) || e.time < from || e.time >= to) continue;
    if (e.kind === "buy") bought += e.delta;
    else if (e.kind === "sell") sold += -e.delta;
    else otherBalanceChange += e.delta;
  }
  return { netPurchases: bought - sold, bought, sold, otherBalanceChange, cohortSize: set.size };
}

export interface AddressClass {
  wallet: string;
  class: "pool" | "burn" | "custody" | "lockup" | "program" | "contract" | "cluster_heuristic";
  verified: boolean;
}

/** Top-10 share of circulating supply with each exclusion class toggled; contracts are not excluded by default. */
export function concentration(holders: BalanceCheckpoint[], supply: number, classes: AddressClass[], population: Population) {
  const excludedByDefault = new Set(["pool", "burn", "custody", "lockup", "program"]);
  const classOf = new Map(classes.filter((c) => c.verified).map((c) => [c.wallet, c.class]));
  const share = (exclude: Set<string>) => {
    const kept = holders.filter((h) => !exclude.has(classOf.get(h.wallet) ?? "")).sort((a, b) => b.balance - a.balance);
    return supply > 0 ? kept.slice(0, 10).reduce((a, h) => a + h.balance, 0) / supply : null;
  };
  const sensitivity: Record<string, number | null> = { none: share(new Set()) };
  for (const cls of excludedByDefault) sensitivity[`without_${cls}`] = share(new Set([cls]));
  return { top10Share: share(excludedByDefault), sensitivity, population, heuristicClusters: classes.filter((c) => !c.verified).length };
}

export function liquidityToSize(liquidityUsd: number | null, marketCapUsd: number | null): number | null {
  if (liquidityUsd === null || marketCapUsd === null || marketCapUsd <= 0) return null;
  return liquidityUsd / marketCapUsd;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export interface PeerReturn {
  tokenId: string;
  return7d: number | null;
}

export function peerPerformance(own: number | null, peers: PeerReturn[], minPeers: number) {
  const usable = peers.filter((p) => p.return7d !== null);
  const med = median(usable.map((p) => p.return7d!));
  return {
    excessReturn: own === null || med === null || usable.length < minPeers ? null : own - med,
    peerMedian: med,
    peersWithData: usable.length,
    peersListed: peers.length,
  };
}

// ---------------------------------------------------------------- component assembly for a release

export interface ComponentResult {
  id: ComponentId;
  area: Area;
  label: string;
  measure: Measure<number>;
  /** Supporting raw values (for example both legs of a ratio, or peer lists). */
  inputs: Record<string, unknown>;
  history: { time: number; value: number | null }[];
  requires: string[];
}

export interface HolderInputs {
  asOf: number;
  /** Snapshot liquidity and circulating market cap pairs from the same observation. */
  liquiditySnapshots: { time: number; liquidityUsd: number | null; marketCapUsd: number | null; evidenceId: string }[];
  ownReturn7d: number | null;
  peers: PeerReturn[];
  /** Capability keys that are enabled for this token's chain; none of the holder-panel capabilities are enabled today. */
  enabledCapabilities: ReadonlySet<string>;
  labels: Record<ComponentId, string>;
  requires: Record<ComponentId, string[]>;
  maxAgeSeconds: Record<ComponentId, number>;
  minPeers: number;
}

const NEEDS: Partial<Record<ComponentId, string[]>> = {
  "persistence.drawdown_retention": ["pump.holders (top-holder sample only) or an all-holder balance source"],
  "persistence.balance_retention": ["an all-holder balance source", "wallet-resolved transfers"],
  "persistence.portfolio_allocation": ["wallet balances across measured assets"],
  "demand.meaningful_holder_growth": ["an all-holder balance source"],
  "demand.whale_accumulation": ["pump.trades / fomo.activity (samples) or full wallet-resolved trades"],
  "demand.dip_absorption": ["buy/sell volume split per interval"],
  "health.concentration": ["pump.holders or fomo.holders with supply and address classes"],
};

export function holderComponents(inp: HolderInputs): ComponentResult[] {
  return COMPONENT_IDS.map((id) => {
    const base = { id, area: AREA[id], label: inp.labels[id], requires: inp.requires[id], inputs: {} as Record<string, unknown>, history: [] as { time: number; value: number | null }[] };
    if (id === "health.liquidity_to_size") {
      const history = inp.liquiditySnapshots.map((s) => ({ time: s.time, value: liquidityToSize(s.liquidityUsd, s.marketCapUsd) }));
      const latest = [...inp.liquiditySnapshots].filter((s) => s.time <= inp.asOf).sort((a, b) => b.time - a.time)[0];
      const value = latest ? liquidityToSize(latest.liquidityUsd, latest.marketCapUsd) : null;
      if (!latest || value === null) {
        return { ...base, history, measure: missing("insufficient_data", "ratio", "No snapshot with both liquidity and a non-zero circulating market cap.") };
      }
      const stale = inp.asOf - latest.time > inp.maxAgeSeconds[id];
      return {
        ...base,
        history,
        inputs: { liquidityUsd: latest.liquidityUsd, marketCapUsd: latest.marketCapUsd },
        measure: {
          ...derived(value, "ratio", latest.time, {
            evidence: [latest.evidenceId],
            coverage: { scope: "Top pair as reported by Codex; circulating market cap, not FDV.", fraction: 1 },
            method: HOLDERS_VERSION,
          }),
          ...(stale ? { state: "stale" as const, note: "Snapshot older than the component's accepted age." } : {}),
        },
      };
    }
    if (id === "relative.peer_performance") {
      const p = peerPerformance(inp.ownReturn7d, inp.peers, inp.minPeers);
      const inputs = { ownReturn7d: inp.ownReturn7d, peerMedian7d: p.peerMedian, peersWithData: p.peersWithData, peersListed: p.peersListed, peers: inp.peers };
      if (p.excessReturn === null) {
        const why = inp.ownReturn7d === null ? "No price 7 days earlier (within 12 hours) for this coin." : `Only ${p.peersWithData} peer(s) with 7-day prices; ${inp.minPeers} required.`;
        return { ...base, inputs, measure: missing("insufficient_data", "ratio", why) };
      }
      return {
        ...base,
        inputs,
        measure: derived(p.excessReturn, "ratio", inp.asOf, {
          coverage: { scope: `Peers: other open members of the coin's narratives (${p.peersWithData} of ${p.peersListed} with prices).`, fraction: p.peersListed ? p.peersWithData / p.peersListed : null, population: "tracked_universe" },
          method: HOLDERS_VERSION,
        }),
      };
    }
    return { ...base, measure: missing("unavailable", "ratio", `Needs ${NEEDS[id]!.join("; ")}. No such capability is validated and enabled.`) };
  });
}

// ---------------------------------------------------------------- composite framework

export interface CompositeConfig {
  enabled: boolean;
  disabledReason?: string;
  normalization: Record<string, { zeroAt: number; hundredAt: number }>;
  weights: Record<string, number>;
  gate: { minComponents: number; requiredAreas: readonly Area[]; maxBoundWidth: number };
}

export interface CompositeResult {
  version: string;
  state: "disabled" | "insufficient_data" | "bounded" | "scored";
  score: number | null;
  bound: [number, number] | null;
  componentsUsed: number;
  note: string;
}

export function normalize(value: number, ref: { zeroAt: number; hundredAt: number }): number {
  const t = (value - ref.zeroAt) / (ref.hundredAt - ref.zeroAt);
  return Math.max(0, Math.min(100, 100 * t));
}

/**
 * Missing components never raise a score: below the gate the result is insufficient_data; above it the score is
 * a bound with missing components at 0 and at 100, and a point value only when that bound is narrow.
 */
export function composite(components: ComponentResult[], cfg: CompositeConfig): CompositeResult {
  if (!cfg.enabled) return { version: COMPOSITE_VERSION, state: "disabled", score: null, bound: null, componentsUsed: 0, note: cfg.disabledReason ?? "Disabled." };
  const usable = components.filter((c) => (c.measure.state === "observed" || c.measure.state === "derived") && c.measure.value !== null);
  const areas = new Set(usable.map((c) => c.area));
  if (usable.length < cfg.gate.minComponents || !cfg.gate.requiredAreas.every((a) => areas.has(a))) {
    return { version: COMPOSITE_VERSION, state: "insufficient_data", score: null, bound: null, componentsUsed: usable.length, note: `${usable.length} usable components; the gate needs ${cfg.gate.minComponents} across ${cfg.gate.requiredAreas.join(", ")}.` };
  }
  const total = Object.values(cfg.weights).reduce((a, w) => a + w, 0);
  let known = 0;
  let missingWeight = 0;
  for (const id of COMPONENT_IDS) {
    const w = cfg.weights[id] ?? 0;
    const c = usable.find((x) => x.id === id);
    if (c) known += w * normalize(c.measure.value!, cfg.normalization[id]!);
    else missingWeight += w;
  }
  const lo = known / total;
  const hi = (known + 100 * missingWeight) / total;
  const narrow = hi - lo <= cfg.gate.maxBoundWidth;
  return {
    version: COMPOSITE_VERSION,
    state: narrow ? "scored" : "bounded",
    score: narrow ? (lo + hi) / 2 : null,
    bound: [lo, hi],
    componentsUsed: usable.length,
    note: narrow ? "Point value is the midpoint of a narrow bound." : "Missing components make the bound too wide for a point value.",
  };
}
