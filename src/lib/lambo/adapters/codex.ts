/**
 * Codex GraphQL adapters (mpp.codex.post.graphql). Field names and units are verified against retained
 * live responses in research/lamble/ (see docs/data/providers.json validation evidence).
 */
import { CHAIN_BY_CODEX_NETWORK, tryTokenIdentity, poolIdentity } from "../core/identity.ts";
import { DAY, HOUR } from "../core/time.ts";
import type { MetricKey } from "../core/metrics.ts";
import { type Adapter, type AdapterInput, type AdapterOutput, emptyOutput, num } from "./types.ts";

function graphqlData(input: AdapterInput, out: AdapterOutput): Record<string, unknown> | null {
  const body = input.body as { data?: Record<string, unknown> | null; errors?: unknown[] } | null;
  if (!body || typeof body !== "object") {
    out.warnings.push("empty body");
    return null;
  }
  if (Array.isArray(body.errors) && body.errors.length) {
    out.warnings.push(`graphql errors: ${JSON.stringify(body.errors).slice(0, 300)}`);
    out.refused = true;
    return null;
  }
  if (!body.data || typeof body.data !== "object") {
    out.warnings.push("no data object");
    return null;
  }
  return body.data;
}

function query(input: AdapterInput): string {
  const q = input.request.args.query;
  return typeof q === "string" ? q : "";
}

const RESOLUTION: Record<string, number> = { "60": HOUR, "1D": DAY };
const BAR_FIELDS: [string, MetricKey][] = [
  ["volume", "token.volume_usd"],
  ["o", "token.price_open_usd"],
  ["h", "token.price_high_usd"],
  ["l", "token.price_low_usd"],
  ["c", "token.price_close_usd"],
];

/** getTokenBars aliases: one per token; buckets are start-labelled; a missing bucket stays missing. */
export const codexTokenBars: Adapter = {
  key: "codex.token-bars",
  normalize(input) {
    const out = emptyOutput();
    const data = graphqlData(input, out);
    if (!data) return out;
    const pattern = /(\w+):getTokenBars\(symbol:"(\w+):(\d+)",from:(\d+),to:(\d+),resolution:"(\w+)"[^)]*\)\{([^}]*)\}/g;
    for (const [, alias, address, network, from, to, resolution, selection] of query(input).matchAll(pattern)) {
      const chain = CHAIN_BY_CODEX_NETWORK.get(Number(network));
      const identity = chain ? tryTokenIdentity(chain, address!) : null;
      const step = RESOLUTION[resolution!];
      if (!identity || !step) {
        out.warnings.push(`${alias}: unmapped network ${network} or resolution ${resolution}`);
        continue;
      }
      const bars = data[alias!] as Record<string, unknown[] | undefined> | null | undefined;
      if (!bars || !Array.isArray(bars.t)) {
        out.warnings.push(`${alias}: no bars returned`);
        continue;
      }
      const selected = new Set(selection!.trim().split(/\s+/));
      const lo = Number(from);
      const hi = Number(to);
      const seen = new Set<number>();
      bars.t.forEach((rawT, i) => {
        const t = num(rawT);
        if (t === null || t % step !== 0 || t < lo || t > hi) {
          out.warnings.push(`${alias}: bucket ${String(rawT)} outside the requested grid`);
          return;
        }
        if (seen.has(t)) {
          out.warnings.push(`${alias}: duplicate bucket ${t}`);
          return;
        }
        seen.add(t);
        for (const [field, metric] of BAR_FIELDS) {
          if (!selected.has(field)) continue;
          const value = num(bars[field]?.[i]);
          if (value === null) continue; // missing, not zero
          if (value < 0) {
            out.warnings.push(`${alias}: negative ${field} at ${t}`);
            continue;
          }
          out.observations.push({
            entityType: "token",
            entityId: identity.id,
            metric,
            value,
            windowStart: t,
            windowEnd: t + step,
            eventTime: t,
            extraction: `$.data.${alias}.${field}[${i}]`,
          });
        }
      });
    }
    return out;
  },
};

interface SnapshotRow {
  pair?: { address?: string; token0?: string; token1?: string; networkId?: number; createdAt?: number | null };
  priceUSD?: string | number | null;
  circulatingMarketCap?: string | number | null;
  change24?: string | number | null;
  volume24?: string | number | null;
  liquidity?: string | number | null;
}

/**
 * filterTokens(tokens:[...]) snapshot. The body has no source timestamp, so eventTime is null and the
 * fetch time is the observation time. Frames redacts keys named "token", so each row is matched to the
 * requested token through pair.token0/token1; a row matching two requested tokens is skipped as ambiguous.
 * A zero market cap or price is the provider's "unknown supply/price", not a measured zero (same rule as
 * normalize.py), and is skipped with a warning.
 */
export const codexTokenSnapshot: Adapter = {
  key: "codex.token-snapshot",
  normalize(input) {
    const out = emptyOutput();
    const data = graphqlData(input, out);
    if (!data) return out;
    const requested = new Map<string, string>();
    const tokensArg = /filterTokens\(tokens:\[([^\]]*)\]/.exec(query(input));
    if (!tokensArg) return out; // discovery sweeps (filters/rankings) carry no requested identities
    for (const [, address, network] of tokensArg[1]!.matchAll(/"(\w+):(\d+)"/g)) {
      const chain = CHAIN_BY_CODEX_NETWORK.get(Number(network));
      const identity = chain ? tryTokenIdentity(chain, address!) : null;
      if (identity) requested.set(`${address}:${network}`, identity.id);
    }
    const results = ((data.filterTokens as { results?: SnapshotRow[] } | undefined)?.results ?? []) as SnapshotRow[];
    results.forEach((row, i) => {
      const pair = row.pair ?? {};
      const sides = [pair.token0, pair.token1].filter((a): a is string => typeof a === "string").map((a) => requested.get(`${a}:${pair.networkId}`)).filter(Boolean) as string[];
      if (sides.length !== 1) {
        out.warnings.push(`row ${i}: ${sides.length ? "ambiguous" : "unrequested"} token sides`);
        return;
      }
      const tokenId = sides[0]!;
      const at = `$.data.filterTokens.results[${i}]`;
      const push = (metric: MetricKey, value: number | null, field: string, allowZero: boolean) => {
        if (value === null) return;
        if (!allowZero && value === 0) {
          out.warnings.push(`row ${i}: ${field} is 0; treated as unknown`);
          return;
        }
        out.observations.push({ entityType: "token", entityId: tokenId, metric, value, windowStart: null, windowEnd: null, eventTime: null, extraction: `${at}.${field}` });
      };
      push("token.price_usd", num(row.priceUSD), "priceUSD", false);
      push("token.market_cap_circulating_usd", num(row.circulatingMarketCap), "circulatingMarketCap", false);
      push("token.liquidity_usd", num(row.liquidity), "liquidity", true);
      push("token.volume_rolling24h_usd", num(row.volume24), "volume24", true);
      const change = num(row.change24);
      if (change !== null) {
        // change24 is a ratio (verified against hourly closes on 2026-09-28): 0.1 means +10%.
        out.observations.push({
          entityType: "token",
          entityId: tokenId,
          metric: "token.price_change_rolling24h_pct",
          value: change * 100,
          windowStart: null,
          windowEnd: null,
          eventTime: null,
          extraction: `${at}.change24`,
        });
      }
      if (pair.address && pair.networkId !== undefined) {
        const chain = CHAIN_BY_CODEX_NETWORK.get(pair.networkId);
        try {
          const pool = chain ? poolIdentity(chain, pair.address) : null;
          if (pool) out.tokens.push({ tokenId, pool: { poolId: pool.id, createdAt: typeof pair.createdAt === "number" ? pair.createdAt : null }, extraction: `${at}.pair` });
        } catch {
          out.warnings.push(`row ${i}: unparseable pool ${pair.address}`);
        }
      }
    });
    return out;
  },
};

/** Discovery sweeps produce candidates through discover.py and curation.json; no observations are stored. */
export const codexTokenDiscovery: Adapter = {
  key: "codex.token-discovery",
  normalize(input) {
    const out = emptyOutput();
    graphqlData(input, out);
    return out;
  },
};

interface MetadataRow {
  address?: string;
  networkId?: number;
  name?: string;
  symbol?: string;
  createdAt?: number | null;
  info?: { description?: string | null } | null;
  launchpad?: { launchpadName?: string | null } | null;
}

/** tokens(ids) lookups: names, descriptions, Codex launchpad attribution and indexed creation times. */
export const codexTokenMetadata: Adapter = {
  key: "codex.token-metadata",
  normalize(input) {
    const out = emptyOutput();
    const data = graphqlData(input, out);
    if (!data) return out;
    for (const [alias, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      (rows as MetadataRow[]).forEach((row, i) => {
        const chain = row.networkId === undefined ? undefined : CHAIN_BY_CODEX_NETWORK.get(row.networkId);
        const identity = chain && row.address ? tryTokenIdentity(chain, row.address) : null;
        if (!identity) {
          out.warnings.push(`${alias}[${i}]: unmapped token`);
          return;
        }
        out.tokens.push({
          tokenId: identity.id,
          name: row.name ?? undefined,
          symbol: row.symbol ?? undefined,
          description: row.info?.description ?? undefined,
          sourceLaunchpad: row.launchpad?.launchpadName ?? undefined,
          createdAt: typeof row.createdAt === "number" ? row.createdAt : undefined,
          extraction: `$.data.${alias}[${i}]`,
        });
      });
    }
    return out;
  },
};

interface LaunchpadRow {
  id?: string;
  timestamp?: number;
  tokensCreated24?: number;
  tokensCreated1w?: number;
  tokensCompleted24?: number;
  tokensCompleted1w?: number;
  tokensMigrated24?: number;
}

/**
 * filterLaunchpads rows keyed by provider row id (for example "pump.fun:0"). Venues map to rows through the
 * registry (venues[].indexedProviderIds); the release builder sums rows per venue. Counts are rolling windows
 * ending at the row's timestamp and are never summed into calendar periods.
 */
export const codexLaunchpadActivity: Adapter = {
  key: "codex.launchpad-activity",
  normalize(input) {
    const out = emptyOutput();
    const data = graphqlData(input, out);
    if (!data) return out;
    const fl = data.filterLaunchpads as { count?: number; results?: LaunchpadRow[] } | undefined;
    const rows = fl?.results ?? [];
    if (fl?.count !== rows.length) out.warnings.push(`count ${fl?.count} != rows ${rows.length}: paginate before relying on totals`);
    const fields: [keyof LaunchpadRow, MetricKey, number][] = [
      ["tokensCreated24", "index.created_rolling24h", DAY],
      ["tokensCreated1w", "index.created_rolling7d", 7 * DAY],
      ["tokensCompleted24", "index.completed_rolling24h", DAY],
      ["tokensCompleted1w", "index.completed_rolling7d", 7 * DAY],
      ["tokensMigrated24", "index.migrated_rolling24h", DAY],
    ];
    rows.forEach((row, i) => {
      if (!row.id || typeof row.timestamp !== "number") {
        out.warnings.push(`row ${i}: missing id or timestamp`);
        return;
      }
      for (const [field, metric, span] of fields) {
        const value = row[field];
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
          out.warnings.push(`row ${row.id}: invalid ${String(field)}`);
          continue;
        }
        out.observations.push({
          entityType: "index_row",
          entityId: row.id,
          metric,
          value,
          windowStart: row.timestamp - span,
          windowEnd: row.timestamp,
          eventTime: row.timestamp,
          extraction: `$.data.filterLaunchpads.results[${i}].${String(field)}`,
        });
      }
    });
    return out;
  },
};
