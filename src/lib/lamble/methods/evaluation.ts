/**
 * Forward-evaluation harness for signal events (for example bottoming stages). Measures what happened after
 * each event: return net of transaction costs, worst adverse move and failure rate, against simple baselines,
 * with a time-based held-out split. Small samples get an explicit 'insufficient' confidence and no claim.
 *
 * Signal and baseline events must be built point-in-time (from evaluations made with data available then and
 * from the universe known then); this module only looks forward from each event, which is its purpose.
 */
export const EVALUATION_VERSION = "forward-eval-v1.0.0";

export interface EventPoint {
  tokenId: string;
  time: number;
  label: string;
}

export interface PriceSeries {
  tokenId: string;
  samples: { time: number; price: number }[];
}

export interface EvalConfig {
  horizonsSeconds: number[];
  toleranceSeconds: number;
  roundTripCost: number;
  failureReturn: number;
  minSample: number;
  heldOutFraction: number;
}

export const EVAL_DEFAULTS: EvalConfig = {
  horizonsSeconds: [86_400, 7 * 86_400],
  toleranceSeconds: 12 * 3600,
  roundTripCost: 0.03,
  failureReturn: -0.2,
  minSample: 30,
  heldOutFraction: 0.3,
};

export interface Outcome {
  tokenId: string;
  time: number;
  horizon: number;
  netReturn: number;
  maxAdverse: number;
  failed: boolean;
}

function nearest(samples: { time: number; price: number }[], t: number, tol: number, after: boolean) {
  let best: { time: number; price: number } | null = null;
  for (const s of samples) {
    if (after ? s.time < t : s.time > t + tol) continue;
    if (Math.abs(s.time - t) > tol) continue;
    if (!best || Math.abs(s.time - t) < Math.abs(best.time - t)) best = s;
  }
  return best;
}

export function outcomes(events: EventPoint[], prices: PriceSeries[], cfg: EvalConfig = EVAL_DEFAULTS): Outcome[] {
  const byToken = new Map(prices.map((p) => [p.tokenId, [...p.samples].sort((a, b) => a.time - b.time)]));
  const out: Outcome[] = [];
  for (const e of events) {
    const samples = byToken.get(e.tokenId) ?? [];
    const entry = nearest(samples, e.time, cfg.toleranceSeconds, true);
    if (!entry || !(entry.price > 0)) continue;
    for (const h of cfg.horizonsSeconds) {
      const exit = nearest(samples, entry.time + h, cfg.toleranceSeconds, false);
      if (!exit) continue;
      const path = samples.filter((s) => s.time > entry.time && s.time <= exit.time);
      const worst = Math.min(0, ...path.map((s) => s.price / entry.price - 1));
      const net = exit.price / entry.price - 1 - cfg.roundTripCost;
      out.push({ tokenId: e.tokenId, time: e.time, horizon: h, netReturn: net, maxAdverse: worst, failed: net <= cfg.failureReturn || worst <= cfg.failureReturn });
    }
  }
  return out;
}

function stats(rows: Outcome[], minSample: number) {
  const n = rows.length;
  const sorted = rows.map((r) => r.netReturn).sort((a, b) => a - b);
  const mean = n ? sorted.reduce((a, b) => a + b, 0) / n : null;
  const median = n ? (n % 2 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2) : null;
  return {
    n,
    distinctTokens: new Set(rows.map((r) => r.tokenId)).size,
    meanNetReturn: mean,
    medianNetReturn: median,
    hitRate: n ? rows.filter((r) => r.netReturn > 0).length / n : null,
    failureRate: n ? rows.filter((r) => r.failed).length / n : null,
    meanMaxAdverse: n ? rows.reduce((a, r) => a + r.maxAdverse, 0) / n : null,
    confidence: n < minSample ? ("insufficient" as const) : n < 100 ? ("low" as const) : ("moderate" as const),
  };
}

export function evaluate(signals: EventPoint[], baselines: Record<string, EventPoint[]>, prices: PriceSeries[], cfg: EvalConfig = EVAL_DEFAULTS) {
  const times = signals.map((s) => s.time).sort((a, b) => a - b);
  const split = times.length ? times[Math.floor((1 - cfg.heldOutFraction) * (times.length - 1))]! : null;
  const sig = outcomes(signals, prices, cfg);
  const horizons = cfg.horizonsSeconds.map((h) => {
    const rows = sig.filter((o) => o.horizon === h);
    const development = split === null ? [] : rows.filter((o) => o.time <= split);
    const heldOut = split === null ? [] : rows.filter((o) => o.time > split);
    const baselineStats = Object.fromEntries(
      Object.entries(baselines).map(([name, evs]) => [name, stats(outcomes(evs, prices, cfg).filter((o) => o.horizon === h), cfg.minSample)]),
    );
    const all = stats(rows, cfg.minSample);
    return {
      horizonSeconds: h,
      all,
      development: stats(development, cfg.minSample),
      heldOut: stats(heldOut, cfg.minSample),
      baselines: baselineStats,
      claim:
        all.confidence === "insufficient"
          ? `No performance claim: ${all.n} outcome(s), below the ${cfg.minSample} needed.`
          : "Descriptive comparison only; not a forecast.",
    };
  });
  return {
    version: EVALUATION_VERSION,
    assumptions: { roundTripCost: cfg.roundTripCost, failureReturn: cfg.failureReturn, toleranceSeconds: cfg.toleranceSeconds, heldOutSplitTime: split },
    signals: signals.length,
    horizons,
  };
}
