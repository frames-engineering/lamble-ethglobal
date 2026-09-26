import type { ChainId, Launchpad, Point } from "@/lib/data/types";

export interface Aggregates {
  launchpadCount: number;
  chainCount: number;
  chains: ChainId[];
  fees24h: number;
  fees7d: number;
  /** Fee-weighted 24h change across venues, percent. */
  feesChange24h: number;
  /** Fee-weighted 7d change across venues, percent. */
  feesChange7d: number;
  /** Fee-weighted 30d change across venues, percent. */
  feesChange30d: number;
  launched24h: number;
  launched7dAvg: number;
  graduated24h: number;
  /** Total daily fees across venues, 30 points. */
  feesHistory30d: Point[];
  /** Approximate launches per minute across venues right now. */
  launchesPerMinute: number;
}

function weightedChange(rows: { value: number; change: number }[]): number {
  let now = 0;
  let before = 0;
  for (const r of rows) {
    now += r.value;
    before += r.value / (1 + r.change / 100);
  }
  return before > 0 ? ((now - before) / before) * 100 : 0;
}

export function aggregate(launchpads: Launchpad[]): Aggregates {
  const chains = Array.from(new Set(launchpads.flatMap((l) => l.chains)));
  const fees24h = launchpads.reduce((a, l) => a + l.metrics.h24.fees, 0);
  const fees7d = launchpads.reduce((a, l) => a + l.metrics.d7.fees, 0);
  const launched24h = launchpads.reduce((a, l) => a + l.metrics.launched24h, 0);
  const launched7dAvg = launchpads.reduce((a, l) => a + l.metrics.launched7dAvg, 0);
  const graduated24h = launchpads.reduce((a, l) => a + l.metrics.graduated24h, 0);

  const len = launchpads[0]?.metrics.history30d.length ?? 0;
  const feesHistory30d: Point[] = [];
  for (let i = 0; i < len; i++) {
    let value = 0;
    let time = 0;
    for (const l of launchpads) {
      const p = l.metrics.history30d[i];
      if (p) {
        value += p.value;
        time = p.time;
      }
    }
    feesHistory30d.push({ time, value });
  }

  return {
    launchpadCount: launchpads.length,
    chainCount: chains.length,
    chains,
    fees24h,
    fees7d,
    feesChange24h: weightedChange(launchpads.map((l) => ({ value: l.metrics.h24.fees, change: l.metrics.h24.change }))),
    feesChange7d: weightedChange(launchpads.map((l) => ({ value: l.metrics.d7.fees, change: l.metrics.d7.change }))),
    feesChange30d: weightedChange(launchpads.map((l) => ({ value: l.metrics.d30.fees, change: l.metrics.d30.change }))),
    launched24h,
    launched7dAvg,
    graduated24h,
    feesHistory30d,
    launchesPerMinute: launched24h / 1440,
  };
}
