/**
 * Holder analysis (docs/methods/holder-analysis.v1.json): nine components in four areas, plus a gated
 * composite framework. Every number is computed here; nothing is estimated by a model.
 */
import type { Population } from "../catalog/catalog.ts";
import { type Measure, derived, missing } from "../core/measure.ts";
import { type TradeInput, walletEvents } from "./inputs.ts";

export const HOLDERS_VERSION = "holder-analysis-v1.1.0";
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

export interface PanelInput {
  time: number;
  population: Population;
  /** True only when the source states the panel covers every holder. */
  complete: boolean;
  capability: string;
  evidenceId: string;
  rowCount: number;
  /** Rows with token amounts (wallets canonicalized). */
  checkpoints: BalanceCheckpoint[];
}

/** Whether an enabled, validated capability provides each input for this token's chain. */
export interface HolderSources {
  allHolders: boolean;
  topHolders: boolean;
  walletTrades: boolean;
  portfolio: boolean;
}

export interface HolderInputs {
  asOf: number;
  /** Snapshot liquidity and circulating market cap pairs from the same observation. */
  liquiditySnapshots: { time: number; liquidityUsd: number | null; marketCapUsd: number | null; evidenceId: string }[];
  ownReturn7d: number | null;
  peers: PeerReturn[];
  sources: HolderSources;
  /** Holder panels known at asOf, any population; each component accepts only the populations it is valid for. */
  panels: PanelInput[];
  /** Circulating supply: circulating market cap / price from the same snapshot. */
  supply: { time: number; value: number; evidenceId: string }[];
  prices: { time: number; value: number }[];
  addressClasses: AddressClass[];
  /** Wallet-resolved trades known at asOf. */
  trades: TradeInput[];
  /** Share 0..1 of [from, to) inside spans where the trade source is complete. */
  tradeCoverage: (from: number, to: number) => number;
  dailyCloses: { start: number; close: number }[];
  /** Buy/sell USD per daily interval with its coverage (from wallet trades). */
  flows: { start: number; buyVolumeUsd: number; sellVolumeUsd: number; coverage: number }[];
  /** The open bottoming episode at asOf, if any (point-in-time peak and low). */
  episode: { peakTime: number; lowTime: number } | null;
  labels: Record<ComponentId, string>;
  requires: Record<ComponentId, string[]>;
  maxAgeSeconds: Record<ComponentId, number>;
  minCoverage: Record<ComponentId, number>;
  parameters: Partial<Record<ComponentId, Record<string, number>>>;
  minPeers: number;
}

const NEEDS: Partial<Record<ComponentId, string>> = {
  "persistence.drawdown_retention": "all-holder balance checkpoints at the episode peak and low",
  "persistence.balance_retention": "all-holder balance checkpoints (and wallet-resolved trades for continuity)",
  "persistence.portfolio_allocation": "wallet balances across measured assets",
  "demand.meaningful_holder_growth": "all-holder balance checkpoints and prices at both",
  "demand.whale_accumulation": "a holder ranking at the window start and wallet-resolved trades with token amounts",
  "demand.dip_absorption": "buy/sell volume per daily interval",
  "health.concentration": "a top-holder or all-holder panel with token amounts, circulating supply and address classes",
};

const SOURCE_OF: Partial<Record<ComponentId, keyof HolderSources>> = {
  "persistence.drawdown_retention": "allHolders",
  "persistence.balance_retention": "allHolders",
  "persistence.portfolio_allocation": "portfolio",
  "demand.meaningful_holder_growth": "allHolders",
  "demand.whale_accumulation": "walletTrades",
  "demand.dip_absorption": "walletTrades",
  "health.concentration": "topHolders",
};

/** The note for a component whose input has no enabled capability: identical for every coin (release method table). */
export function unavailableNote(id: ComponentId): string {
  return `Needs ${NEEDS[id]}. No such capability is validated and enabled.`;
}

const DEFAULT_EXCLUDED = new Set(["pool", "burn", "custody", "lockup", "program"]);
const DAY_S = 86_400;
const WEEK_S = 7 * DAY_S;

function nearest<T extends { time: number }>(rows: readonly T[], at: number, tol: number, asOf: number): T | null {
  let best: T | null = null;
  for (const r of rows) {
    if (r.time > asOf || Math.abs(r.time - at) > tol) continue;
    if (!best || Math.abs(r.time - at) < Math.abs(best.time - at) || (Math.abs(r.time - at) === Math.abs(best.time - at) && r.time > best.time)) best = r;
  }
  return best;
}

const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

export function holderComponents(inp: HolderInputs): ComponentResult[] {
  const allPanels = inp.panels.filter((p) => p.time <= inp.asOf);
  const populations = [...new Set(allPanels.map((p) => p.population))].sort();
  const complete = allPanels.filter((p) => p.population === "all_holders" && p.complete);
  const ranking = allPanels.filter((p) => p.population === "all_holders" || p.population === "top_holders_sample");
  const verified = inp.addressClasses.filter((c) => c.verified);
  const classOf = new Map(verified.map((c) => [c.wallet, c.class]));

  return COMPONENT_IDS.map((id): ComponentResult => {
    const base = { id, area: AREA[id], label: inp.labels[id], requires: inp.requires[id], inputs: {} as Record<string, unknown>, history: [] as { time: number; value: number | null }[] };
    const maxAge = inp.maxAgeSeconds[id];
    const minCov = inp.minCoverage[id] ?? 1;
    const params = inp.parameters[id] ?? {};
    const tol = (params.checkpointToleranceHours ?? 24) * 3600;
    /** No input at all: unavailable without an enabled source (same note for every coin). With a detail: data exists but is insufficient. */
    const noInput = (detail: string): ComponentResult => {
      const src = SOURCE_OF[id];
      const samples = populations.length && (id.startsWith("persistence.") || id === "demand.meaningful_holder_growth") ? ` Collected panels: ${populations.join(", ")}; a sample never stands in for all holders.` : "";
      if (detail) return { ...base, measure: missing("insufficient_data", "ratio", `${detail}${samples}`) };
      if (src && !inp.sources[src]) return { ...base, measure: missing("unavailable", "ratio", `${unavailableNote(id)}${samples}`) };
      return { ...base, measure: missing("insufficient_data", "ratio", `No ${NEEDS[id]} collected for this coin yet.${samples}`) };
    };

    if (id === "health.liquidity_to_size") {
      const history = inp.liquiditySnapshots.map((s) => ({ time: s.time, value: liquidityToSize(s.liquidityUsd, s.marketCapUsd) }));
      const latest = [...inp.liquiditySnapshots].filter((s) => s.time <= inp.asOf).sort((a, b) => b.time - a.time)[0];
      const value = latest ? liquidityToSize(latest.liquidityUsd, latest.marketCapUsd) : null;
      if (!latest || value === null) {
        return { ...base, history, measure: missing("insufficient_data", "ratio", "No snapshot with both liquidity and a non-zero circulating market cap.") };
      }
      const stale = inp.asOf - latest.time > maxAge;
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

    if (id === "persistence.portfolio_allocation") return noInput("");

    if (id === "persistence.drawdown_retention") {
      if (!inp.episode) return { ...base, measure: missing("not_applicable", "ratio", "Not in a qualifying drawdown episode (bottoming test); retention through a drawdown is measured only inside one.") };
      if (!complete.length) return noInput("");
      const p0 = nearest(complete, inp.episode.peakTime, tol, inp.asOf);
      const p1 = nearest(complete, inp.episode.lowTime, tol, inp.asOf);
      if (!p0 || !p1 || p0 === p1) return noInput(`Needs complete all-holder checkpoints within ${tol / 3600}h of the episode peak (${day(inp.episode.peakTime)}) and low (${day(inp.episode.lowTime)}).`);
      const r = retention(p0.checkpoints, p1.checkpoints, null, p0.time, p1.time);
      if (r.endpointRetention === null) return noInput("The peak checkpoint has no positive balances.");
      return {
        ...base,
        inputs: { peakCheckpoint: p0.time, lowCheckpoint: p1.time, cohortWallets: p0.checkpoints.filter((c) => c.balance > 0).length },
        measure: derived(r.endpointRetention, "ratio", p1.time, {
          window: { start: p0.time, end: p1.time },
          evidence: [p0.evidenceId, p1.evidenceId],
          coverage: { scope: "All holders at the episode peak (fixed cohort), endpoint retention at the low.", fraction: 1, population: "all_holders" },
          method: HOLDERS_VERSION,
          note: "Endpoint retention between two checkpoints; exits and re-entries between them are not visible here.",
        }),
      };
    }

    if (id === "persistence.balance_retention" || id === "demand.meaningful_holder_growth") {
      if (!complete.length) return noInput("");
      const p1 = [...complete].filter((p) => inp.asOf - p.time <= maxAge).sort((a, b) => b.time - a.time)[0];
      const p0 = p1 ? nearest(complete, p1.time - WEEK_S, tol, inp.asOf) : null;
      if (!p1 || !p0 || p0 === p1) return noInput(`Needs complete all-holder checkpoints about 7 days apart (within ${tol / 3600}h), the later one within ${maxAge / 3600}h.`);
      const window = { start: p0.time, end: p1.time };
      const coverage = { scope: "All holders at the earlier checkpoint.", fraction: 1, population: "all_holders" as const };
      if (id === "persistence.balance_retention") {
        const cov = inp.tradeCoverage(p0.time, p1.time);
        const events = cov >= minCov ? walletEvents(inp.trades) : null;
        const r = retention(p0.checkpoints, p1.checkpoints, events, p0.time, p1.time);
        if (r.endpointRetention === null) return noInput("The earlier checkpoint has no positive balances.");
        return {
          ...base,
          inputs: { uninterruptedShare: r.uninterruptedShare, continuityKnown: r.continuityKnown, checkpointSpacingSeconds: p1.time - p0.time, tradeCoverage: cov },
          measure: derived(r.endpointRetention, "ratio", p1.time, {
            window,
            evidence: [p0.evidenceId, p1.evidenceId],
            coverage,
            method: HOLDERS_VERSION,
            note: r.continuityKnown
              ? "Endpoint retention; uninterrupted holding from wallet-resolved trades is in the inputs."
              : `Endpoint retention only: trades cover ${pct(cov)} of the window (${pct(minCov)} needed), so exits and re-entries between checkpoints are not visible.`,
          }),
        };
      }
      const threshold = params.usdThreshold ?? 100;
      const price0 = nearest(inp.prices, p0.time, 12 * 3600, inp.asOf);
      const price1 = nearest(inp.prices, p1.time, 12 * 3600, inp.asOf);
      if (!price0 || !price1) return noInput("No snapshot price within 12 hours of both checkpoints.");
      const m = meaningfulHolders(p0.checkpoints, p1.checkpoints, price0.value, price1.value, threshold);
      if (m.before === 0) return noInput(`No holder at or above $${threshold} at the earlier checkpoint.`);
      const value = (m.after - m.priceCrossers - m.before) / m.before;
      return {
        ...base,
        inputs: { before: m.before, after: m.after, entrants: m.entrants, priceCrossers: m.priceCrossers, usdThreshold: threshold },
        measure: derived(value, "ratio", p1.time, { window, evidence: [p0.evidenceId, p1.evidenceId], coverage, method: HOLDERS_VERSION, note: "Holders who crossed the threshold only because the price rose are excluded." }),
      };
    }

    if (id === "demand.whale_accumulation") {
      const size = params.cohortSize ?? 20;
      const p0 = nearest(ranking, inp.asOf - WEEK_S, tol, inp.asOf);
      if (!p0) return noInput(ranking.length ? `Needs a top-holder or all-holder panel within ${tol / 3600}h of 7 days before the release.` : "");
      const cohort = p0.checkpoints.filter((c) => !DEFAULT_EXCLUDED.has(classOf.get(c.wallet) ?? "")).sort((a, b) => b.balance - a.balance || a.wallet.localeCompare(b.wallet)).slice(0, size);
      if (cohort.length < size && !p0.complete) return noInput(`The ${day(p0.time)} panel has ${cohort.length} non-excluded wallets with token amounts; the cohort needs ${size}.`);
      const startBalance = cohort.reduce((a, c) => a + c.balance, 0);
      const cov = inp.tradeCoverage(p0.time, inp.asOf);
      if (!inp.trades.length && !inp.sources.walletTrades) return noInput("");
      if (cov < minCov) return noInput(`Wallet-resolved trades cover ${pct(cov)} of ${day(p0.time)}..${day(inp.asOf)}; ${pct(minCov)} required.`);
      const wallets = new Set(cohort.map((c) => c.wallet));
      if (inp.trades.some((t) => t.wallet && wallets.has(t.wallet) && t.time >= p0.time && t.time < inp.asOf && t.amount === null)) return noInput("A cohort trade has no token amount; purchases cannot be measured in tokens.");
      const w = whaleAccumulation([...wallets], walletEvents(inp.trades), p0.time, inp.asOf);
      if (startBalance <= 0) return noInput("The cohort held no tokens at the window start.");
      return {
        ...base,
        inputs: { netPurchases: w.netPurchases, bought: w.bought, sold: w.sold, cohortSize: cohort.length, cohortStartBalance: startBalance, tradeCoverage: cov, transfersObserved: false },
        measure: derived(w.netPurchases / startBalance, "ratio", inp.asOf, {
          window: { start: p0.time, end: inp.asOf },
          evidence: [p0.evidenceId],
          coverage: { scope: `Top ${cohort.length} non-excluded wallets of the ${day(p0.time)} panel (${p0.capability}), fixed for the window; trades only.`, fraction: cov, population: p0.population === "all_holders" ? "all_holders" : "top_holders_sample" },
          method: HOLDERS_VERSION,
          note: "Net purchases from trades divided by the cohort's starting balance. Transfers are not purchases and no transfer source is collected.",
        }),
      };
    }

    if (id === "demand.dip_absorption") {
      const lookback = (params.lookbackDays ?? 30) * DAY_S;
      const threshold = params.dipThreshold ?? 0.05;
      if (!inp.flows.length && !inp.sources.walletTrades) return noInput("");
      const closes = [...inp.dailyCloses].filter((c) => c.start + DAY_S <= inp.asOf).sort((a, b) => a.start - b.start);
      if (!closes.length) return noInput("No daily candle closes (snapshot prices are not closes).");
      const dips = closes.filter((c, i) => i > 0 && closes[i - 1]!.start === c.start - DAY_S && c.close <= (1 - threshold) * closes[i - 1]!.close && c.start >= inp.asOf - lookback);
      if (!dips.length) return { ...base, measure: missing("not_applicable", "ratio", `No day in the last ${lookback / DAY_S} closed ${pct(threshold)} or more below the prior close.`) };
      const flows = new Map(inp.flows.filter((f) => f.coverage >= minCov).map((f) => [f.start, f]));
      const covered = dips.filter((d) => flows.has(d.start));
      const fraction = covered.length / dips.length;
      if (fraction < minCov) return noInput(`Buy/sell flows cover ${covered.length} of ${dips.length} dip day(s) at ${pct(minCov)} or more; ${pct(minCov)} of dip days required.`);
      const buy = covered.reduce((a, d) => a + flows.get(d.start)!.buyVolumeUsd, 0);
      const sell = covered.reduce((a, d) => a + flows.get(d.start)!.sellVolumeUsd, 0);
      if (sell <= 0) return noInput("No selling observed on the covered dip days.");
      return {
        ...base,
        inputs: { dipDays: dips.length, coveredDipDays: covered.length, buyVolumeUsd: buy, sellVolumeUsd: sell, dipThreshold: threshold },
        history: covered.map((d) => ({ time: d.start, value: flows.get(d.start)!.sellVolumeUsd > 0 ? flows.get(d.start)!.buyVolumeUsd / flows.get(d.start)!.sellVolumeUsd : null })),
        measure: derived(buy / sell, "ratio", inp.asOf, {
          window: { start: inp.asOf - lookback, end: inp.asOf },
          coverage: { scope: `Dip days (close ${pct(threshold)}+ below the prior close) in the last ${lookback / DAY_S} days.`, fraction, observed: covered.length, required: dips.length },
          method: HOLDERS_VERSION,
        }),
      };
    }

    // health.concentration
    const panel = [...ranking].sort((a, b) => b.time - a.time)[0];
    if (!panel) return noInput(allPanels.length ? `Collected panels: ${populations.join(", ")}; concentration needs the largest positions (a top-holder or all-holder panel).` : "");
    if (panel.checkpoints.length < 10 && !panel.complete) return noInput(`The ${day(panel.time)} panel has ${panel.checkpoints.length} rows with token amounts; at least 10 are needed.`);
    const supply = nearest(inp.supply, panel.time, maxAge, inp.asOf);
    if (!supply) return noInput(`No circulating supply within ${maxAge / 3600}h of the ${day(panel.time)} panel (Codex circulating market cap / price).`);
    const c = concentration(panel.checkpoints, supply.value, inp.addressClasses, panel.population);
    if (c.top10Share === null || (c.sensitivity.none ?? 0) > 1 + 1e-9) return noInput("Top-10 balances exceed circulating supply: the panel and supply disagree.");
    const matched = [...new Set(panel.checkpoints.map((h) => classOf.get(h.wallet)).filter((x): x is AddressClass["class"] => Boolean(x)))].sort();
    const stale = inp.asOf - panel.time > maxAge;
    return {
      ...base,
      inputs: { sensitivity: c.sensitivity, heuristicClusters: c.heuristicClusters, circulatingSupply: supply.value, panelRows: panel.rowCount, classesMatched: matched },
      measure: {
        ...derived(c.top10Share, "ratio", panel.time, {
          evidence: [panel.evidenceId, supply.evidenceId],
          coverage: {
            scope: `${panel.population === "all_holders" ? "All holders" : `Largest positions reported by ${panel.capability}`}; excluded only where an address class is verified (${matched.length ? matched.join(", ") : "none matched"}). Unclassified pools and programs stay included.`,
            fraction: 1,
            population: panel.population === "all_holders" ? "all_holders" : "top_holders_sample",
          },
          method: HOLDERS_VERSION,
        }),
        ...(stale ? { state: "stale" as const, note: "Panel older than the component's accepted age." } : {}),
      },
    };
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
