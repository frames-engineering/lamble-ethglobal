/**
 * Reads one token's holder and bottoming inputs from the store at a cutoff: provider candles, holder panels,
 * the trade tape and its coverage, circulating supply and address classes. The release builder passes the
 * result to src/lib/lamble/methods/{holders,bottoming}.ts; tests drive it with synthetic stored rows.
 */
import type { Population } from "../../../src/lib/lamble/catalog/catalog.ts";
import { DAY } from "../../../src/lib/lamble/core/time.ts";
import type { BottomingInputs, Candle, FlowInterval, Sale } from "../../../src/lib/lamble/methods/bottoming.ts";
import type { AddressClass, PanelInput } from "../../../src/lib/lamble/methods/holders.ts";
import { type SpanInput, type TradeInput, checkpoints, coveredFraction, dailyCandles, fifoSales, flowsFromTrades, mergeSpans } from "../../../src/lib/lamble/methods/inputs.ts";
import type { Store } from "./store.ts";

export interface SnapshotRow {
  observed_at: number;
  value: number;
  run_id: string;
  evidence_id: string;
  available_at: number;
}

export interface TokenMethodInputs {
  /** Codex daily candles when present, else daily candles from one provider. */
  candles: Candle[];
  trades: TradeInput[];
  /** The capability whose tape is used; null when no complete tape is stored. */
  tape: string | null;
  tradeCoverage: (from: number, to: number) => number;
  /** null when no tape is stored: no source, as opposed to a source with gaps. */
  flows: FlowInterval[] | null;
  sales: Sale[] | null;
  costHistoryFromStart: boolean;
  panels: PanelInput[];
  supply: { time: number; value: number; evidenceId: string }[];
  addressClasses: AddressClass[];
}

/** Seconds of coverage a capability contributes; the tape with the most is used, ties by key. */
function coveredSeconds(rows: { capability: string; from_time: number; to_time: number }[], capability: string): number {
  return rows.filter((r) => r.capability === capability).reduce((a, r) => a + (r.to_time - r.from_time), 0);
}

export function tokenMethodInputs(
  store: Store,
  tok: { token_id: string; chain: string; token_created_at: number | null },
  cutoff: number,
  market: { codexCandles: Candle[]; volumeByDay: ReadonlyMap<number, number>; prices: SnapshotRow[]; caps: SnapshotRow[] },
  labels: { address: string; class: string; verified: number }[],
): TokenMethodInputs {
  const id = tok.token_id;
  const evm = tok.chain !== "solana";
  const canon = (w: string) => (evm ? w.toLowerCase() : w);

  const candles = market.codexCandles.length
    ? market.codexCandles
    : dailyCandles(
        store.candles(id, cutoff).map((c) => ({ capability: c.capability, resolutionSeconds: c.resolution_seconds, start: c.start, high: c.high, low: c.low, close: c.close, volumeUsd: c.volume_usd, availableAt: c.available_at })),
      );

  // Only a tape that is complete within its spans counts, from one capability so the same trade is never counted
  // twice; filtered feeds such as FOMO activity are source-reported context, not wallet-resolved flow.
  const coverageRows = store.tradeCoverage(id, cutoff);
  const tape = [...new Set(coverageRows.map((c) => c.capability))].sort().sort((a, b) => coveredSeconds(coverageRows, b) - coveredSeconds(coverageRows, a))[0] ?? null;
  const trades: TradeInput[] = store
    .trades(id, cutoff)
    .filter((r) => r.capability === tape)
    .map((r) => ({ time: r.event_time, side: r.side, usd: r.usd, amount: r.amount, wallet: r.wallet === null ? null : canon(r.wallet), availableAt: r.available_at }));
  const spans: SpanInput[] = coverageRows.filter((c) => c.capability === tape).map((c) => ({ from: c.from_time, to: c.to_time, availableAt: c.available_at }));
  const merged = mergeSpans(spans, cutoff);
  // FIFO cost needs every trade since the token's start; a tape that does not reach back to it never qualifies.
  const costHistoryFromStart = tok.token_created_at !== null && merged.length === 1 && merged[0]![0] <= tok.token_created_at;
  const { sales } = fifoSales(trades, costHistoryFromStart);

  const supply = market.caps.flatMap((c) => {
    const p = market.prices.find((x) => x.run_id === c.run_id && x.evidence_id === c.evidence_id);
    return p && p.value > 0 && c.value > 0 ? [{ time: c.observed_at, value: c.value / p.value, evidenceId: c.evidence_id }] : [];
  });
  const panels: PanelInput[] = store.holderPanels(id, cutoff).map((p) => ({
    time: p.observed_at,
    population: p.population as Population,
    complete: p.complete === 1,
    capability: p.capability,
    evidenceId: p.evidence_id,
    rowCount: p.row_count,
    checkpoints: checkpoints(p.rows, evm),
  }));
  const addressClasses: AddressClass[] = [
    ...labels.map((l) => ({ wallet: canon(l.address), class: l.class as AddressClass["class"], verified: l.verified === 1 })),
    ...store.pools(id).map((p) => ({ wallet: canon(p.address), class: "pool" as const, verified: true })),
  ];

  return {
    candles,
    trades,
    tape,
    tradeCoverage: (from, to) => coveredFraction(merged, from, to),
    flows: tape ? flowsFromTrades(trades, spans, cutoff, market.volumeByDay) : null,
    sales: tape ? sales : null,
    costHistoryFromStart,
    panels,
    supply,
    addressClasses,
  };
}

/** Codex all-pool daily candles (when its OHLC fields are stored) and daily volume, as known at the cutoff. */
export function codexDaily(store: Store, tokenId: string, cutoff: number): { candles: Candle[]; volumeByDay: Map<number, number> } {
  const high = store.windows("token", tokenId, "token.price_high_usd", DAY, cutoff);
  const low = store.windows("token", tokenId, "token.price_low_usd", DAY, cutoff);
  const close = store.windows("token", tokenId, "token.price_close_usd", DAY, cutoff);
  const vday = store.windows("token", tokenId, "token.volume_usd", DAY, cutoff);
  const candles = [...close.keys()].map((s) => ({
    start: s,
    high: high.get(s)?.value ?? null,
    low: low.get(s)?.value ?? null,
    close: close.get(s)!.value,
    volumeUsd: vday.get(s)?.value ?? null,
    availableAt: Math.max(close.get(s)!.availableAt, high.get(s)?.availableAt ?? 0, low.get(s)?.availableAt ?? 0),
  }));
  return { candles, volumeByDay: new Map([...vday.entries()].map(([s, v]) => [s, v.value] as [number, number])) };
}

/** Everything the bottoming test and holder components read for one token at a cutoff. */
export function coinMethodInputs(
  store: Store,
  tok: { token_id: string; chain: string; token_created_at: number | null },
  cutoff: number,
  labels: { address: string; class: string; verified: number }[],
): { bottoming: BottomingInputs; method: TokenMethodInputs; prices: SnapshotRow[]; caps: SnapshotRow[] } {
  const prices = store.snapshots("token", tok.token_id, "token.price_usd", cutoff);
  const caps = store.snapshots("token", tok.token_id, "token.market_cap_circulating_usd", cutoff);
  const codex = codexDaily(store, tok.token_id, cutoff);
  const method = tokenMethodInputs(store, tok, cutoff, { codexCandles: codex.candles, volumeByDay: codex.volumeByDay, prices, caps }, labels);
  return {
    bottoming: {
      tokenId: tok.token_id,
      candles: method.candles,
      samples: prices.map((p) => ({ time: p.observed_at, price: p.value, availableAt: p.available_at })),
      flows: method.flows,
      sales: method.sales,
      marketCaps: caps.map((c) => ({ time: c.observed_at, value: c.value, availableAt: c.available_at })),
    },
    method,
    prices,
    caps,
  };
}

