/**
 * Bottoming test (docs/methods/bottoming.v1.json). A deterministic, point-in-time state machine.
 *
 * Every evaluation replays the token's intervals from the start of its history up to `asOf`, using only
 * intervals that ended and observations that were available by `asOf`. A live system evaluating at `asOf`
 * would therefore have computed exactly the same result: later lows or recoveries never relabel the past.
 */
import { DAY } from "../core/time.ts";

export const BOTTOMING_VERSION = "bottoming-v1.0.0";

export interface BottomingConfig {
  intervalSeconds: number;
  peakLookbackIntervals: number;
  openDrawdown: number;
  staleIntervals: number;
  c1: { minCostCoverage: number; minLossSoldShare: number; minRealizedLossUsd: number; minLossToMcap: number };
  c2: { requiredIntervals: number; minVolumeUsd: number };
  c3: { minAbsorptionRatio: number; minFirstSeenRatio: number; minIntervals: number; minFlowCoverage: number };
  minHistoryIntervals: number;
}

export const BOTTOMING_DEFAULTS: BottomingConfig = {
  intervalSeconds: DAY,
  peakLookbackIntervals: 30,
  openDrawdown: 0.5,
  staleIntervals: 7,
  c1: { minCostCoverage: 0.8, minLossSoldShare: 0.6, minRealizedLossUsd: 25_000, minLossToMcap: 0.05 },
  c2: { requiredIntervals: 3, minVolumeUsd: 1000 },
  c3: { minAbsorptionRatio: 1.2, minFirstSeenRatio: 1.1, minIntervals: 3, minFlowCoverage: 0.8 },
  minHistoryIntervals: 7,
};

export interface Candle {
  start: number;
  high: number | null;
  low: number | null;
  close: number | null;
  volumeUsd: number | null;
  availableAt: number;
}

export interface PriceSample {
  time: number;
  price: number;
  availableAt: number;
}

export interface FlowInterval {
  start: number;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  buyers: number;
  firstSeenBuyers: number;
  /** Share of the interval's volume the wallet-resolved flows cover, 0..1. */
  coverage: number;
  availableAt: number;
}

export interface Sale {
  time: number;
  soldValueUsd: number;
  /** FIFO acquisition cost in USD; null when unknown (transfer in, starting inventory). Never zero for unknown. */
  costUsd: number | null;
  availableAt: number;
}

export interface BottomingInputs {
  tokenId: string;
  candles: Candle[];
  /** Point price samples (daily snapshots). Used only when no candles exist; they never establish a held low. */
  samples: PriceSample[];
  /** null: no validated capability provides buy/sell flows for this token. */
  flows: FlowInterval[] | null;
  /** null: no validated capability provides wallet-resolved sales with cost basis. */
  sales: Sale[] | null;
  marketCaps: { time: number; value: number; availableAt: number }[];
}

export type ConditionState = "met" | "unmet" | "insufficient_data" | "not_applicable";

export interface ConditionResult {
  state: ConditionState;
  detail: string;
  values: Record<string, number | null>;
  window: { start: number; end: number } | null;
}

export interface Episode {
  id: string;
  peakTime: number;
  peakPrice: number;
  openedAt: number;
  lowTime: number;
  lowPrice: number;
  closedAt: number | null;
  closeReason: "new_high" | "stale" | null;
  invalidations: { at: number; reason: string; previousLow: number; newLow: number }[];
  basis: "candles" | "samples";
}

export interface BottomingEvaluation {
  tokenId: string;
  asOf: number;
  methodVersion: string;
  state: "not_applicable" | "insufficient_data" | "evaluated";
  stage: 0 | 1 | 2 | 3 | null;
  label: string;
  priceBasis: "candles" | "samples" | "none";
  episode: Episode | null;
  drawdown: { current: number | null; maxInEpisode: number | null };
  secondsSinceLow: number | null;
  conditions: { capitulation: ConditionResult; lowHolds: ConditionResult; absorption: ConditionResult };
  explanation: string;
  invalidatesIf: string[];
}

interface Point {
  start: number;
  high: number;
  low: number;
  close: number;
  volumeUsd: number | null;
  adequate: boolean;
}

/** Observed points known at asOf, on the interval grid. Candles must have high/low/close; samples become flat points. */
function pointsAt(inputs: BottomingInputs, asOf: number, cfg: BottomingConfig): { points: Point[]; basis: "candles" | "samples" | "none" } {
  const step = cfg.intervalSeconds;
  const candles = inputs.candles
    .filter((c) => c.start + step <= asOf && c.availableAt <= asOf && c.high !== null && c.low !== null && c.close !== null)
    .sort((a, b) => a.start - b.start);
  if (candles.length) {
    return {
      basis: "candles",
      points: candles.map((c) => ({
        start: c.start,
        high: c.high!,
        low: c.low!,
        close: c.close!,
        volumeUsd: c.volumeUsd,
        adequate: c.volumeUsd !== null && c.volumeUsd >= cfg.c2.minVolumeUsd,
      })),
    };
  }
  // Samples: one point per interval (the last sample in it); never adequate for holding a low.
  const byInterval = new Map<number, PriceSample>();
  for (const s of inputs.samples) {
    if (s.time > asOf || s.availableAt > asOf || !(s.price > 0)) continue;
    const k = Math.floor(s.time / step) * step;
    const prev = byInterval.get(k);
    if (!prev || s.time > prev.time) byInterval.set(k, s);
  }
  const points = [...byInterval.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, s]) => ({ start, high: s.price, low: s.price, close: s.price, volumeUsd: null, adequate: false }));
  return { basis: points.length ? "samples" : "none", points };
}

interface ReplayState {
  episode: Episode | null;
  history: Episode[];
}

/** Replays episodes over points in time order. Only points passed in (already filtered to asOf) are seen. */
function replay(tokenId: string, points: Point[], basis: "candles" | "samples", cfg: BottomingConfig): ReplayState {
  const step = cfg.intervalSeconds;
  const history: Episode[] = [];
  let episode: Episode | null = null;
  let lastSeen = -Infinity;
  points.forEach((p, i) => {
    if (episode) {
      if ((p.start - lastSeen) / step > cfg.staleIntervals) {
        episode.closedAt = lastSeen + step;
        episode.closeReason = "stale";
        episode = null;
      }
    }
    lastSeen = p.start;
    if (episode) {
      if (p.high > episode.peakPrice) {
        episode.closedAt = p.start;
        episode.closeReason = "new_high";
        episode = null;
      } else if (p.low < episode.lowPrice) {
        episode.invalidations.push({ at: p.start + step, reason: "new lower low", previousLow: episode.lowPrice, newLow: p.low });
        episode.lowPrice = p.low;
        episode.lowTime = p.start;
      }
    }
    if (!episode) {
      const windowStart = p.start - (cfg.peakLookbackIntervals - 1) * step;
      let peak = -Infinity;
      let peakTime = p.start;
      for (let j = i; j >= 0 && points[j]!.start >= windowStart; j--) {
        if (points[j]!.high > peak) {
          peak = points[j]!.high;
          peakTime = points[j]!.start;
        }
      }
      if (peak > 0 && p.close <= (1 - cfg.openDrawdown) * peak && peakTime < p.start) {
        let lowPrice = Infinity;
        let lowTime = p.start;
        for (const q of points) {
          if (q.start <= peakTime || q.start > p.start) continue;
          if (q.low < lowPrice) {
            lowPrice = q.low;
            lowTime = q.start;
          }
        }
        episode = { id: `${tokenId}@${peakTime}`, peakTime, peakPrice: peak, openedAt: p.start + step, lowTime, lowPrice, closedAt: null, closeReason: null, invalidations: [], basis };
        history.push(episode);
      }
    }
  });
  return { episode, history };
}

function capitulation(inputs: BottomingInputs, ep: Episode, asOf: number, cfg: BottomingConfig): ConditionResult {
  const window = { start: ep.peakTime, end: asOf };
  if (inputs.sales === null) {
    return { state: "insufficient_data", detail: "No validated source of wallet-resolved sales with acquisition cost for this token.", values: {}, window };
  }
  const sales = inputs.sales.filter((s) => s.time >= ep.peakTime && s.time < asOf && s.availableAt <= asOf);
  const total = sales.reduce((a, s) => a + s.soldValueUsd, 0);
  const known = sales.filter((s) => s.costUsd !== null);
  const knownValue = known.reduce((a, s) => a + s.soldValueUsd, 0);
  const coverage = total > 0 ? knownValue / total : null;
  if (coverage === null || coverage < cfg.c1.minCostCoverage) {
    return {
      state: "insufficient_data",
      detail: `Acquisition cost known for ${coverage === null ? "no" : `${(100 * coverage).toFixed(0)}% of`} sold value; at least ${(100 * cfg.c1.minCostCoverage).toFixed(0)}% is required. Unknown costs are not treated as zero.`,
      values: { soldValueUsd: total, knownCostSoldValueUsd: knownValue, costCoverage: coverage },
      window,
    };
  }
  const losing = known.filter((s) => s.soldValueUsd < s.costUsd!);
  const lossShare = losing.reduce((a, s) => a + s.soldValueUsd, 0) / knownValue;
  const realizedLoss = losing.reduce((a, s) => a + (s.costUsd! - s.soldValueUsd), 0);
  const caps = inputs.marketCaps.filter((m) => m.time >= ep.peakTime && m.time < asOf && m.availableAt <= asOf);
  const meanCap = caps.length ? caps.reduce((a, m) => a + m.value, 0) / caps.length : null;
  const bar = Math.max(cfg.c1.minRealizedLossUsd, meanCap === null ? 0 : cfg.c1.minLossToMcap * meanCap);
  const met = lossShare >= cfg.c1.minLossSoldShare && realizedLoss >= bar;
  return {
    state: met ? "met" : "unmet",
    detail: `${(100 * lossShare).toFixed(0)}% of known-cost sold value was sold at a loss; realized loss $${Math.round(realizedLoss).toLocaleString("en-US")} against a $${Math.round(bar).toLocaleString("en-US")} materiality bar.`,
    values: { soldValueUsd: total, costCoverage: coverage, lossSoldShare: lossShare, realizedLossUsd: realizedLoss, materialityBarUsd: bar },
    window,
  };
}

function lowHolds(points: Point[], basis: string, ep: Episode, asOf: number, cfg: BottomingConfig): ConditionResult {
  const step = cfg.intervalSeconds;
  const window = { start: ep.lowTime + step, end: asOf };
  if (basis !== "candles") {
    return { state: "insufficient_data", detail: "Only point price samples: without candles a held low cannot be observed.", values: { count: null }, window };
  }
  let count = 0;
  let expected = ep.lowTime + step;
  for (const p of points) {
    if (p.start <= ep.lowTime) continue;
    // A missing interval or a thin one resets the count: sparse trading never qualifies as holding.
    if (p.start !== expected || !p.adequate) count = 0;
    if (p.adequate && p.low >= ep.lowPrice) count++;
    else if (p.low < ep.lowPrice) count = 0;
    expected = p.start + step;
  }
  if (expected < Math.floor(asOf / step) * step) count = 0; // trailing gap up to asOf
  const met = count >= cfg.c2.requiredIntervals;
  return {
    state: met ? "met" : "unmet",
    detail: `${count} consecutive adequately observed interval(s) held the episode low; ${cfg.c2.requiredIntervals} required.`,
    values: { count, required: cfg.c2.requiredIntervals, lowPrice: ep.lowPrice },
    window,
  };
}

function absorption(inputs: BottomingInputs, ep: Episode, asOf: number, cfg: BottomingConfig): ConditionResult {
  const step = cfg.intervalSeconds;
  const window = { start: ep.lowTime + step, end: asOf };
  if (inputs.flows === null) return { state: "insufficient_data", detail: "No validated source of buy/sell flows and first-seen buyers for this token.", values: {}, window };
  const ok = (f: FlowInterval) => f.availableAt <= asOf && f.start + step <= asOf && f.coverage >= cfg.c3.minFlowCoverage;
  const base = inputs.flows.filter((f) => ok(f) && f.start >= ep.peakTime && f.start <= ep.lowTime);
  const after = inputs.flows.filter((f) => ok(f) && f.start > ep.lowTime);
  if (base.length < cfg.c3.minIntervals || after.length < cfg.c3.minIntervals) {
    return { state: "insufficient_data", detail: `Needs ${cfg.c3.minIntervals} covered intervals before and after the low (have ${base.length} and ${after.length}).`, values: {}, window };
  }
  const ratio = (fs: FlowInterval[]) => {
    const sell = fs.reduce((a, f) => a + f.sellVolumeUsd, 0);
    return sell > 0 ? fs.reduce((a, f) => a + f.buyVolumeUsd, 0) / sell : null;
  };
  const share = (fs: FlowInterval[]) => {
    const buyers = fs.reduce((a, f) => a + f.buyers, 0);
    return buyers > 0 ? fs.reduce((a, f) => a + f.firstSeenBuyers, 0) / buyers : null;
  };
  const [rb, ra, sb, sa] = [ratio(base), ratio(after), share(base), share(after)];
  if (rb === null || ra === null || sb === null || sa === null) return { state: "insufficient_data", detail: "No selling or no buyers in a window.", values: {}, window };
  const met = ra >= cfg.c3.minAbsorptionRatio * rb && sa >= cfg.c3.minFirstSeenRatio * sb;
  return {
    state: met ? "met" : "unmet",
    detail: `Absorption ${ra.toFixed(2)} vs ${rb.toFixed(2)} in the drawdown; first-seen buyers ${(100 * sa).toFixed(0)}% vs ${(100 * sb).toFixed(0)}%.`,
    values: { absorptionAfter: ra, absorptionBaseline: rb, firstSeenAfter: sa, firstSeenBaseline: sb },
    window,
  };
}

const LABELS = ["In a qualifying drawdown; no capitulation observed", "Capitulation observed", "Capitulation observed; low holding", "Capitulation observed; low holding; absorption improving"];

const na = (detail: string): ConditionResult => ({ state: "not_applicable", detail, values: {}, window: null });

export function evaluateBottoming(inputs: BottomingInputs, asOf: number, cfg: BottomingConfig = BOTTOMING_DEFAULTS): BottomingEvaluation {
  const { points, basis } = pointsAt(inputs, asOf, cfg);
  const base = { tokenId: inputs.tokenId, asOf, methodVersion: BOTTOMING_VERSION, priceBasis: basis } as const;
  if (basis === "none" || points.length < cfg.minHistoryIntervals) {
    const why = `Fewer than ${cfg.minHistoryIntervals} observed price intervals by this date; a drawdown cannot be established.`;
    return {
      ...base,
      state: "insufficient_data",
      stage: null,
      label: "Insufficient price history",
      episode: null,
      drawdown: { current: null, maxInEpisode: null },
      secondsSinceLow: null,
      conditions: { capitulation: { ...na(why), state: "insufficient_data" }, lowHolds: { ...na(why), state: "insufficient_data" }, absorption: { ...na(why), state: "insufficient_data" } },
      explanation: why,
      invalidatesIf: [],
    };
  }
  const { episode } = replay(inputs.tokenId, points, basis, cfg);
  const last = points[points.length - 1]!;
  const lookStart = last.start - (cfg.peakLookbackIntervals - 1) * cfg.intervalSeconds;
  const trailingPeak = Math.max(...points.filter((p) => p.start >= lookStart).map((p) => p.high));
  if (!episode) {
    const dd = trailingPeak > 0 ? 1 - last.close / trailingPeak : null;
    const why = `Not in a qualifying drawdown: ${dd === null ? "no peak" : `${(100 * dd).toFixed(0)}% below the ${cfg.peakLookbackIntervals}-interval peak`}, threshold ${(100 * cfg.openDrawdown).toFixed(0)}%.`;
    return {
      ...base,
      state: "not_applicable",
      stage: null,
      label: "Not in a qualifying drawdown",
      episode: null,
      drawdown: { current: dd, maxInEpisode: null },
      secondsSinceLow: null,
      conditions: { capitulation: na(why), lowHolds: na(why), absorption: na(why) },
      explanation: why,
      invalidatesIf: [`A close at or below ${(100 * (1 - cfg.openDrawdown)).toFixed(0)}% of the trailing peak opens an episode.`],
    };
  }
  const c1 = capitulation(inputs, episode, asOf, cfg);
  const c2 = lowHolds(points, basis, episode, asOf, cfg);
  const c3 = absorption(inputs, episode, asOf, cfg);
  let stage: 0 | 1 | 2 | 3 | null;
  if (c1.state === "insufficient_data") stage = null;
  else if (c1.state !== "met") stage = 0;
  else if (c2.state !== "met") stage = 1;
  else if (c3.state !== "met") stage = 2;
  else stage = 3;
  const current = 1 - last.close / episode.peakPrice;
  const maxDd = 1 - episode.lowPrice / episode.peakPrice;
  return {
    ...base,
    state: stage === null ? "insufficient_data" : "evaluated",
    stage,
    label: stage === null ? `In a ${(100 * maxDd).toFixed(0)}% drawdown; conditions cannot be evaluated` : LABELS[stage]!,
    episode,
    drawdown: { current, maxInEpisode: maxDd },
    secondsSinceLow: asOf - (episode.lowTime + cfg.intervalSeconds),
    conditions: { capitulation: c1, lowHolds: c2, absorption: c3 },
    explanation:
      stage === null
        ? `Episode ${episode.id}: ${(100 * maxDd).toFixed(0)}% below its peak on ${basis === "samples" ? "sampled snapshot prices" : "daily candles"}. Condition 1 needs wallet-resolved sales with known acquisition cost, which no validated source provides for this token; the stage is not counted.`
        : `Episode ${episode.id}: stage ${stage} of 3 (conditions counted in order).`,
    invalidatesIf: [`A low below ${episode.lowPrice.toPrecision(4)} resets the low-holding and absorption conditions.`, `A high above ${episode.peakPrice.toPrecision(4)} ends the episode.`],
  };
}

/** Evaluations at each time, plus the episodes seen by the last evaluation. Each entry is computed independently (point in time). */
export function bottomingHistory(inputs: BottomingInputs, times: number[], cfg: BottomingConfig = BOTTOMING_DEFAULTS): { evaluations: BottomingEvaluation[]; episodes: Episode[] } {
  const evaluations = [...times].sort((a, b) => a - b).map((t) => evaluateBottoming(inputs, t, cfg));
  const last = times.length ? Math.max(...times) : 0;
  const { points, basis } = pointsAt(inputs, last, cfg);
  const episodes = basis === "none" ? [] : replay(inputs.tokenId, points, basis, cfg).history;
  return { evaluations, episodes };
}
