/**
 * x4o2 Pump and FOMO adapters.
 *
 * What is verified from the descriptors (frames_get_tool, 2026-10-19): routes, argument names and types,
 * the { data, meta } envelope with meta.observedAt and meta.source (seller guidance), the FOMO feed event
 * type vocabulary, that FOMO holders cover FOMO users only, that Pump holders are a largest-positions panel,
 * and that FOMO candle `t` is unix milliseconds.
 *
 * What is not verified: the field paths inside `data`. No x4o2 response has been retained, so every adapter
 * reads paths from the capability's contract.fieldMap and refuses to emit production records until that map
 * has been verified against a retained response (validation.fieldMapVerified). The onboarding workflow runs
 * the same code in "validation" mode with a proposed map. Nothing is inferred from position or magnitude:
 * a numeric time without a declared unit is rejected, as is a money amount without a declared currency.
 */
import type { Capability, FieldMap, Population } from "../catalog/catalog.ts";
import { tryTokenIdentity, isChain } from "../core/identity.ts";
import { parseIso } from "../core/time.ts";
import {
  type Adapter,
  type AdapterInput,
  type AdapterOutput,
  type EventClass,
  type EventRecord,
  type HolderRow,
  type SourceMeta,
  emptyOutput,
  num,
} from "./types.ts";

export type AdapterMode = "production" | "validation";

export interface X4o2Input extends AdapterInput {
  mode?: AdapterMode;
}

/** Reads a dot path with optional [n] indexes: "data.items[0].wallet". */
export function pick(value: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  let cur: unknown = value;
  for (const part of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    const m = /^([^[\]]*)((?:\[\d+\])*)$/.exec(part);
    if (!m) return undefined;
    if (m[1]) cur = (cur as Record<string, unknown>)[m[1]];
    for (const [, index] of m[2]!.matchAll(/\[(\d+)\]/g)) {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[Number(index)];
    }
  }
  return cur;
}

function fieldMapFor(input: X4o2Input, out: AdapterOutput): FieldMap | null {
  const map = input.capability.contract.fieldMap ?? null;
  const verified = input.capability.validation.fieldMapVerified;
  if (!map) {
    out.refused = true;
    out.warnings.push(`${input.capability.key}: no field map; body retained as evidence only`);
    return null;
  }
  if (!verified && input.mode !== "validation") {
    out.refused = true;
    out.warnings.push(`${input.capability.key}: field map not verified against a retained response; body retained as evidence only`);
    return null;
  }
  return map;
}

/** Converts a source time using only the declared unit. */
export function sourceTime(value: unknown, unit: string | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && !/^\d+$/.test(value)) {
    try {
      return parseIso(value);
    } catch {
      return null;
    }
  }
  const n = num(value);
  if (n === null) return null;
  if (unit === "seconds") return Math.floor(n);
  if (unit === "milliseconds") return Math.floor(n / 1000);
  return null; // numeric time without a declared unit: rejected, never guessed
}

function readMeta(body: unknown, map: FieldMap): SourceMeta {
  const meta = (body as { meta?: Record<string, unknown> } | null)?.meta ?? {};
  const observedAt = sourceTime(meta.observedAt, map.units?.observedAt);
  const stale = typeof meta.stale === "boolean" ? meta.stale : null;
  const cacheAge = num(meta.cacheAgeSeconds ?? meta.ageSeconds);
  return { observedAt, source: typeof meta.source === "string" ? meta.source : null, stale, cacheAgeSeconds: cacheAge };
}

function items(body: unknown, map: FieldMap, out: AdapterOutput): unknown[] {
  const list = pick(body, map.items ?? "data");
  if (!Array.isArray(list)) {
    out.warnings.push(`items path ${map.items ?? "data"} is not an array`);
    return [];
  }
  return list;
}

/** Money is read only when the map declares it USD; SOL or token amounts are never relabelled as USD. */
function usd(item: unknown, map: FieldMap, field: string): number | null {
  if (!map.fields[field]) return null;
  if (map.units?.[field] !== "usd") return null;
  return num(pick(item, map.fields[field]));
}

function resolveToken(item: unknown, map: FieldMap, input: X4o2Input): string | null {
  const address = pick(item, map.fields.tokenAddress);
  const chainValue = pick(item, map.fields.tokenChain) ?? input.request.args.chain ?? (input.capability.dataNetworks.length === 1 ? input.capability.dataNetworks[0] : undefined);
  const addr = typeof address === "string" ? address : typeof input.request.args.address === "string" ? input.request.args.address : typeof input.request.args.mint === "string" ? input.request.args.mint : null;
  // Only chain slugs resolve; numeric network ids are provider-specific and are not mapped by guesswork.
  if (typeof chainValue !== "string" || !isChain(chainValue) || !addr) return null;
  return tryTokenIdentity(chainValue, addr)?.id ?? null;
}

function base(input: X4o2Input): { out: AdapterOutput; map: FieldMap | null } {
  const out = emptyOutput();
  const map = fieldMapFor(input, out);
  if (map) out.meta = readMeta(input.body, map);
  return { out, map };
}

// ---------------------------------------------------------------- FOMO feed

const FEED_CLASS: Record<string, { class: EventClass; side?: "buy" | "sell" }> = {
  large_buy: { class: "trade", side: "buy" },
  large_sell: { class: "trade", side: "sell" },
  multi_user_buy: { class: "trade", side: "buy" },
  multi_user_sell: { class: "trade", side: "sell" },
  single_user_sell: { class: "trade", side: "sell" },
  large_transfer_in: { class: "transfer" },
  large_transfer_out: { class: "transfer" },
  single_user_transfer_out: { class: "transfer" },
  thesis_created: { class: "social" },
  user_trade_profit_milestone: { class: "social" },
  user_with_smart_following: { class: "social" },
  new_token_listing: { class: "listing" },
  price_since_listing: { class: "listing" },
  manual: { class: "pinned_post" },
};

export function classifyFeedType(type: string, pinnedFlag: boolean): { class: EventClass; side?: "buy" | "sell" } {
  // A pinned or manual entry is a post, whatever its position in the page and whatever types= asked for.
  if (pinnedFlag || type === "manual") return { class: "pinned_post" };
  return FEED_CLASS[type] ?? { class: "other" };
}

function feedEvents(input: X4o2Input, map: FieldMap, out: AdapterOutput, population: Population): EventRecord[] {
  const events: EventRecord[] = [];
  items(input.body, map, out).forEach((item, i) => {
    const id = pick(item, map.fields.id);
    if (typeof id !== "string" && typeof id !== "number") {
      out.warnings.push(`item ${i}: no stable id; skipped (cannot deduplicate)`);
      return;
    }
    const type = String(pick(item, map.fields.type) ?? "");
    const pinned = pick(item, map.fields.pinned) === true;
    const cls = classifyFeedType(type, pinned);
    events.push({
      sourceId: String(id),
      class: cls.class,
      type,
      tokenId: resolveToken(item, map, input),
      eventTime: sourceTime(pick(item, map.fields.time), map.units?.time),
      side: cls.side,
      usd: usd(item, map, "usd"),
      wallet: map.fields.wallet ? ((pick(item, map.fields.wallet) as string | undefined) ?? null) : null,
      population,
      extraction: `${map.items ?? "data"}[${i}]`,
    });
  });
  return events;
}

export const fomoFeed: Adapter = {
  key: "x4o2.fomo.feed",
  normalize(input: X4o2Input) {
    const { out, map } = base(input);
    if (!map) return out;
    out.events = feedEvents(input, map, out, "fomo_users");
    return out;
  },
};

export const fomoActivity: Adapter = {
  key: "x4o2.fomo.activity",
  normalize(input: X4o2Input) {
    const { out, map } = base(input);
    if (!map) return out;
    out.events = feedEvents(input, map, out, "fomo_users");
    return out;
  },
};

/** Merges feed pages: one record per stable id; the first-seen copy wins; order is newest first by time, unknown times last. */
export function mergeEventPages(pages: EventRecord[][]): EventRecord[] {
  const byId = new Map<string, EventRecord>();
  for (const page of pages) for (const e of page) if (!byId.has(e.sourceId)) byId.set(e.sourceId, e);
  return [...byId.values()].sort((a, b) => (b.eventTime ?? -Infinity) - (a.eventTime ?? -Infinity) || a.sourceId.localeCompare(b.sourceId));
}

/** The newest trade is the latest event classified as a trade; pinned posts, transfers and social items never count. */
export function newestTrade(events: readonly EventRecord[]): EventRecord | null {
  let best: EventRecord | null = null;
  for (const e of events) {
    if (e.class !== "trade" || e.eventTime === null) continue;
    if (!best || e.eventTime > (best.eventTime ?? -Infinity)) best = e;
  }
  return best;
}

// ---------------------------------------------------------------- holders (samples)

function holderAdapter(key: string): Adapter {
  return {
    key,
    normalize(input: X4o2Input) {
      const { out, map } = base(input);
      if (!map) return out;
      const tokenId = resolveToken(input.body, map, input);
      const population = input.capability.semantics.population;
      if (!tokenId || !population || population === "all_holders") {
        out.warnings.push(!tokenId ? "unresolved token" : "holder panel without a sample population label");
        out.refused = true;
        return out;
      }
      const rows: HolderRow[] = [];
      items(input.body, map, out).forEach((item, i) => {
        const wallet = pick(item, map.fields.wallet);
        if (typeof wallet !== "string" || !wallet) {
          out.warnings.push(`holder ${i}: no wallet`);
          return;
        }
        rows.push({
          wallet,
          amount: map.units?.amount === "token_units" ? num(pick(item, map.fields.amount)) : null,
          valueUsd: usd(item, map, "valueUsd"),
          costBasisUsd: usd(item, map, "costBasisUsd"),
          isDeveloper: map.fields.isDeveloper ? pick(item, map.fields.isDeveloper) === true : null,
        });
      });
      out.panels.push({ tokenId, population, complete: false, observedAt: out.meta?.observedAt ?? null, rows, extraction: map.items ?? "data" });
      return out;
    },
  };
}

export const pumpHolders = holderAdapter("x4o2.pump.holders");
export const fomoHolders = holderAdapter("x4o2.fomo.holders");

// ---------------------------------------------------------------- candles

const PERIOD_SECONDS: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14_400, "6h": 21_600, "12h": 43_200, "1d": 86_400 };

function candleAdapter(key: string, resolutionArg: string): Adapter {
  return {
    key,
    normalize(input: X4o2Input) {
      const { out, map } = base(input);
      if (!map) return out;
      const tokenId = resolveToken(input.body, map, input);
      const period = String(input.request.args[resolutionArg] ?? (resolutionArg === "period" ? "1h" : ""));
      const step = PERIOD_SECONDS[period];
      const measure = input.request.args.measure;
      if (key === "x4o2.pump.candles" && measure !== "price_usd") {
        out.warnings.push("pump candles must be requested with measure=price_usd; other measures are not price in USD");
        out.refused = true;
        return out;
      }
      if (!tokenId || !step) {
        out.warnings.push(!tokenId ? "unresolved token" : `unknown period ${period}`);
        out.refused = true;
        return out;
      }
      if (map.units?.time !== "seconds" && map.units?.time !== "milliseconds") {
        out.warnings.push("candle time unit not declared; refusing to guess seconds vs milliseconds");
        out.refused = true;
        return out;
      }
      const seen = new Set<number>();
      items(input.body, map, out).forEach((item, i) => {
        const start = sourceTime(pick(item, map.fields.time), map.units?.time);
        if (start === null || start % step !== 0) {
          out.warnings.push(`candle ${i}: start not on the ${period} grid`);
          return;
        }
        if (seen.has(start)) return;
        seen.add(start);
        const o = num(pick(item, map.fields.open));
        const h = num(pick(item, map.fields.high));
        const l = num(pick(item, map.fields.low));
        const c = num(pick(item, map.fields.close));
        if ([o, h, l, c].some((x) => x !== null && x < 0) || (h !== null && l !== null && h < l)) {
          out.warnings.push(`candle ${i}: inconsistent OHLC`);
          return;
        }
        out.candles.push({ tokenId, start, resolutionSeconds: step, open: o, high: h, low: l, close: c, volumeUsd: usd(item, map, "volumeUsd"), measure: "price_usd" });
      });
      return out;
    },
  };
}

export const fomoCandles = candleAdapter("x4o2.fomo.candles", "period");
export const pumpCandles = candleAdapter("x4o2.pump.candles", "res");

// ---------------------------------------------------------------- trades (tape sample)

export const pumpTrades: Adapter = {
  key: "x4o2.pump.trades",
  normalize(input: X4o2Input) {
    const { out, map } = base(input);
    if (!map) return out;
    const tokenId = resolveToken(input.body, map, input);
    items(input.body, map, out).forEach((item, i) => {
      const signature = pick(item, map.fields.signature);
      const side = String(pick(item, map.fields.side) ?? "").toLowerCase();
      if (typeof signature !== "string" || (side !== "buy" && side !== "sell")) {
        out.warnings.push(`trade ${i}: missing signature or side`);
        return;
      }
      out.events.push({
        sourceId: signature,
        class: "trade",
        type: side,
        tokenId,
        eventTime: sourceTime(pick(item, map.fields.time), map.units?.time),
        side,
        usd: usd(item, map, "usd"),
        wallet: (pick(item, map.fields.wallet) as string | undefined) ?? null,
        population: "recent_trades_sample",
        extraction: `${map.items ?? "data"}[${i}]`,
      });
    });
    return out;
  },
};

// ---------------------------------------------------------------- single-record panels

function recordAdapter(key: string): Adapter {
  return {
    key,
    normalize(input: X4o2Input) {
      const { out, map } = base(input);
      if (!map) return out;
      const record = pick(input.body, map.items ?? "data");
      const tokenId = resolveToken(record, map, input);
      if (!tokenId) {
        out.warnings.push("unresolved token");
        return out;
      }
      const holders = num(pick(record, map.fields.holderCount));
      if (holders !== null && Number.isInteger(holders) && holders >= 0) {
        out.observations.push({
          entityType: "token",
          entityId: tokenId,
          metric: "token.holders_count_reported",
          value: holders,
          windowStart: null,
          windowEnd: null,
          eventTime: out.meta?.observedAt ?? null,
          extraction: map.fields.holderCount!,
        });
      }
      const top10 = num(pick(record, map.fields.top10Share));
      if (top10 !== null && (map.units?.top10Share === "percent" || map.units?.top10Share === "ratio")) {
        out.observations.push({
          entityType: "token",
          entityId: tokenId,
          metric: "token.top10_share_reported",
          value: map.units.top10Share === "ratio" ? top10 * 100 : top10,
          windowStart: null,
          windowEnd: null,
          eventTime: out.meta?.observedAt ?? null,
          extraction: map.fields.top10Share!,
        });
      }
      return out;
    },
  };
}

export const pumpCoin = recordAdapter("x4o2.pump.coin");
export const fomoToken = recordAdapter("x4o2.fomo.token");

/** Lists, theses, developers and traders are retained as evidence; their normalized use waits for a verified map. */
function evidenceOnly(key: string): Adapter {
  return {
    key,
    normalize(input: X4o2Input) {
      const { out, map } = base(input);
      if (map) out.warnings.push(`${key}: retained as evidence; no normalized records defined yet`);
      return out;
    },
  };
}

export const pumpList = evidenceOnly("x4o2.pump.list");
export const pumpTraders = evidenceOnly("x4o2.pump.traders");
export const fomoList = evidenceOnly("x4o2.fomo.list");
export const fomoTheses = evidenceOnly("x4o2.fomo.theses");
export const fomoDevelopers = evidenceOnly("x4o2.fomo.developers");

export function withProposedFieldMap(capability: Capability, fieldMap: FieldMap): Capability {
  return { ...capability, contract: { ...capability.contract, fieldMap } };
}
