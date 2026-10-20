/**
 * Turns stored rows (holder panels, trades, trade coverage, candles) into the inputs of the holder and
 * bottoming methods. Pure: the release builder reads the store at an availability cutoff and passes rows in.
 *
 * Coverage rules:
 * - A recent-trades tape is complete only between its oldest returned trade and when it was read. Coverage of
 *   a window is the share of the window inside the union of those spans; nothing outside them is assumed.
 * - Realized cost (FIFO) is known only when a wallet's whole trade history is observed from the token's start.
 *   A sample tape never qualifies, so its sales carry unknown cost, never zero cost.
 */
import { DAY } from "../core/time.ts";
import type { Candle, FlowInterval, Sale } from "./bottoming.ts";
import type { BalanceCheckpoint, WalletEvent } from "./holders.ts";

export interface TradeInput {
  time: number;
  side: "buy" | "sell" | null;
  usd: number | null;
  /** Unsigned token units; null when the source does not report them in token units. */
  amount: number | null;
  wallet: string | null;
  availableAt: number;
}

export interface SpanInput {
  from: number;
  to: number;
  availableAt: number;
}

export interface CandleInput {
  capability: string;
  resolutionSeconds: number;
  start: number;
  high: number | null;
  low: number | null;
  close: number | null;
  volumeUsd: number | null;
  availableAt: number;
}

/** Union of spans known at asOf, merged and sorted. */
export function mergeSpans(spans: readonly SpanInput[], asOf: number): [number, number][] {
  const s = spans
    .filter((x) => x.availableAt <= asOf && x.to > x.from)
    .map((x) => [x.from, Math.min(x.to, asOf)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: [number, number][] = [];
  for (const [a, b] of s) {
    const last = out.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Share of [from, to) inside the merged spans, 0..1. */
export function coveredFraction(merged: readonly [number, number][], from: number, to: number): number {
  if (to <= from) return 0;
  let covered = 0;
  for (const [a, b] of merged) covered += Math.max(0, Math.min(b, to) - Math.max(a, from));
  return Math.min(1, covered / (to - from));
}

/**
 * Daily candles from provider candles: a native daily candle, or a day assembled from finer candles only when
 * every finer interval of that day is present with high, low and close. One capability per token (the one
 * giving the most days; ties by key), so sources are never mixed within a series.
 */
export function dailyCandles(rows: readonly CandleInput[], day = DAY): Candle[] {
  const byCap = new Map<string, CandleInput[]>();
  for (const r of rows) {
    if (day % r.resolutionSeconds !== 0) continue;
    const list = byCap.get(r.capability) ?? [];
    list.push(r);
    byCap.set(r.capability, list);
  }
  let best: Candle[] = [];
  for (const [, list] of [...byCap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const days = new Map<number, Candle>();
    const native = list.filter((r) => r.resolutionSeconds === day);
    for (const r of native) days.set(r.start, { start: r.start, high: r.high, low: r.low, close: r.close, volumeUsd: r.volumeUsd, availableAt: r.availableAt });
    const finest = Math.min(...list.map((r) => r.resolutionSeconds));
    if (finest < day) {
      const per = day / finest;
      const groups = new Map<number, CandleInput[]>();
      for (const r of list.filter((x) => x.resolutionSeconds === finest)) {
        const k = Math.floor(r.start / day) * day;
        const g = groups.get(k) ?? [];
        g.push(r);
        groups.set(k, g);
      }
      for (const [start, g] of groups) {
        if (days.has(start) || g.length !== per || g.some((x) => x.high === null || x.low === null || x.close === null)) continue;
        g.sort((a, b) => a.start - b.start);
        days.set(start, {
          start,
          high: Math.max(...g.map((x) => x.high!)),
          low: Math.min(...g.map((x) => x.low!)),
          close: g.at(-1)!.close,
          volumeUsd: g.every((x) => x.volumeUsd !== null) ? g.reduce((a, x) => a + x.volumeUsd!, 0) : null,
          availableAt: Math.max(...g.map((x) => x.availableAt)),
        });
      }
    }
    const candles = [...days.values()].sort((a, b) => a.start - b.start);
    if (candles.length > best.length) best = candles;
  }
  return best;
}

/** Signed wallet events from wallet-resolved trades with token amounts. Trades without either are left out. */
export function walletEvents(trades: readonly TradeInput[]): WalletEvent[] {
  return trades
    .filter((t) => t.wallet && t.amount !== null && (t.side === "buy" || t.side === "sell"))
    .map((t) => ({ wallet: t.wallet!, time: t.time, delta: t.side === "buy" ? t.amount! : -t.amount!, kind: t.side! }));
}

/**
 * Buy and sell flows per interval from wallet-resolved trades. An interval appears only when trade coverage
 * reaches into it; its coverage is the share of the interval inside covered spans. When the source reports
 * the interval's total volume, coverage is also capped by the traded USD the tape saw against that volume.
 * First-seen buyers are wallets whose first retained trade in this token falls in the interval: "first seen by
 * LAMBLE's retained trades", which equals "first seen in the token" only when coverage reaches back to its start.
 */
export function flowsFromTrades(
  trades: readonly TradeInput[],
  spans: readonly SpanInput[],
  asOf: number,
  intervalVolumeUsd: ReadonlyMap<number, number | null> = new Map(),
  step = DAY,
): FlowInterval[] {
  const merged = mergeSpans(spans, asOf);
  if (!merged.length) return [];
  const known = trades.filter((t) => t.availableAt <= asOf && t.time < asOf && (t.side === "buy" || t.side === "sell")).sort((a, b) => a.time - b.time);
  const firstSeen = new Map<string, number>();
  for (const t of known) if (t.wallet && !firstSeen.has(t.wallet)) firstSeen.set(t.wallet, t.time);
  const out: FlowInterval[] = [];
  const first = Math.floor(merged[0]![0] / step) * step;
  for (let start = first; start + step <= asOf; start += step) {
    const spanCoverage = coveredFraction(merged, start, start + step);
    if (spanCoverage === 0) continue;
    const inInterval = known.filter((t) => t.time >= start && t.time < start + step);
    const buyVolumeUsd = inInterval.filter((t) => t.side === "buy").reduce((a, t) => a + (t.usd ?? 0), 0);
    const sellVolumeUsd = inInterval.filter((t) => t.side === "sell").reduce((a, t) => a + (t.usd ?? 0), 0);
    const buyers = new Set(inInterval.filter((t) => t.side === "buy" && t.wallet).map((t) => t.wallet!));
    const firstSeenBuyers = [...buyers].filter((w) => {
      const f = firstSeen.get(w)!;
      return f >= start && f < start + step;
    }).length;
    const total = intervalVolumeUsd.get(start);
    const usdShare = total === undefined || total === null ? 1 : total > 0 ? Math.min(1, (buyVolumeUsd + sellVolumeUsd) / total) : 1;
    const unpriced = inInterval.some((t) => t.usd === null);
    out.push({
      start,
      buyVolumeUsd,
      sellVolumeUsd,
      buyers: buyers.size,
      firstSeenBuyers,
      coverage: unpriced ? 0 : Math.min(spanCoverage, usdShare),
      availableAt: Math.max(0, ...spans.filter((s) => s.availableAt <= asOf && s.to > start && s.from < start + step).map((s) => s.availableAt)),
    });
  }
  return out;
}

/**
 * FIFO realized sales. A sale's acquisition cost is the cost of the earliest unsold purchased lots of the same
 * wallet. Cost is known only when `historyFromStart` is true (every trade of the token since its start is
 * retained); otherwise inventory may predate what was observed and every sale carries unknown cost. Inventory
 * that did not come from an observed purchase (transfers in, starting balances) is unknown-cost inventory: the
 * part of a sale drawn from it is reported as a separate sale with unknown cost, never as zero cost.
 * Sales without a USD value are left out and counted in `unvalued`.
 */
export function fifoSales(trades: readonly TradeInput[], historyFromStart: boolean): { sales: Sale[]; unvalued: number } {
  const sales: Sale[] = [];
  let unvalued = 0;
  const lots = new Map<string, { amount: number; unitCost: number }[]>();
  for (const t of [...trades].sort((a, b) => a.time - b.time)) {
    if (t.side === "buy") {
      if (t.wallet && t.amount !== null && t.amount > 0 && t.usd !== null) {
        const l = lots.get(t.wallet) ?? [];
        l.push({ amount: t.amount, unitCost: t.usd / t.amount });
        lots.set(t.wallet, l);
      }
      continue;
    }
    if (t.side !== "sell") continue;
    if (t.usd === null) {
      unvalued++;
      continue;
    }
    if (!historyFromStart || !t.wallet || t.amount === null || t.amount <= 0) {
      sales.push({ time: t.time, soldValueUsd: t.usd, costUsd: null, availableAt: t.availableAt });
      continue;
    }
    const l = lots.get(t.wallet) ?? [];
    let remaining = t.amount;
    let cost = 0;
    while (remaining > 1e-12 && l.length) {
      const lot = l[0]!;
      const take = Math.min(lot.amount, remaining);
      cost += take * lot.unitCost;
      lot.amount -= take;
      remaining -= take;
      if (lot.amount <= 1e-12) l.shift();
    }
    const knownShare = (t.amount - remaining) / t.amount;
    if (knownShare > 0) sales.push({ time: t.time, soldValueUsd: t.usd * knownShare, costUsd: cost, availableAt: t.availableAt });
    if (remaining > 1e-12) sales.push({ time: t.time, soldValueUsd: t.usd * (1 - knownShare), costUsd: null, availableAt: t.availableAt });
  }
  return { sales, unvalued };
}

/** Panel rows with token amounts, as balance checkpoints. EVM wallets compare lowercase. */
export function checkpoints(rows: readonly { wallet: string; amount: number | null }[], evm: boolean): BalanceCheckpoint[] {
  return rows.filter((r) => r.amount !== null && r.amount >= 0).map((r) => ({ wallet: evm ? r.wallet.toLowerCase() : r.wallet, balance: r.amount! }));
}
