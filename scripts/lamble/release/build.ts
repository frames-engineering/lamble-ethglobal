/**
 * Builds a release's content from the observation store at an availability cutoff. Deterministic: the same
 * store and cutoff produce byte-identical public and bundle content (generatedAt lives only in the manifest).
 */
import { LAUNCHPADS as SNAPSHOT_LAUNCHPADS } from "../../../src/lib/data/snapshots/frames.ts";
import type { Catalog } from "../../../src/lib/lamble/catalog/catalog.ts";
import type { Chain } from "../../../src/lib/lamble/core/identity.ts";
import { type Measure, derived, fsum, missing, observed, percentChange, sumOrNull, withFreshness } from "../../../src/lib/lamble/core/measure.ts";
import { DAY, HOUR, WEEK, iso, weekId, weekStart } from "../../../src/lib/lamble/core/time.ts";
import { BOTTOMING_DEFAULTS, BOTTOMING_VERSION, bottomingHistory, evaluateBottoming } from "../../../src/lib/lamble/methods/bottoming.ts";
import { EVALUATION_VERSION, evaluate } from "../../../src/lib/lamble/methods/evaluation.ts";
import {
  COMPONENT_IDS,
  COMPOSITE_VERSION,
  type ComponentId,
  HOLDERS_VERSION,
  type HolderSources,
  composite,
  holderComponents,
  unavailableNote,
} from "../../../src/lib/lamble/methods/holders.ts";
import { WEEKLY_VERSION } from "../../../src/lib/lamble/methods/weekly.ts";
import type {
  BottomingPublic,
  CoinPublic,
  Evidence,
  LaunchpadPublic,
  MarketPublic,
  MembershipPublic,
  NarrativeMemberPublic,
  NarrativePublic,
  SeriesPoint,
} from "../../../src/lib/lamble/release/types.ts";
import { coinMethodInputs } from "./holder-inputs.ts";
import type { MembershipRowDb, RunRow, Store, TokenRow } from "./store.ts";

export const RELEASE_BUILDER_VERSION = "lamble-release-1.1.0";
const PRICE_MAX_AGE = 26 * HOUR;
const NO_CURVE_COMPLETION = new Set(["argus-world", "clanker", "o1-launchpad"]);
const TURNOVER_FLAG = 10;
const EXPLORERS: Partial<Record<Chain, string>> = { solana: "https://solscan.io/token/", bsc: "https://bscscan.com/token/", base: "https://basescan.org/token/", ethereum: "https://etherscan.io/token/" };
const NEWS_HOSTS = /(^|\.)(lemonde\.fr|bbc\.co\.uk|bbc\.com|reuters\.com|bloomberg\.com|apnews\.com|nytimes\.com|wsj\.com|ft\.com|cnbc\.com|foxnews\.com|coindesk\.com|theblock\.co|decrypt\.co|cointelegraph\.com|france24\.com|theguardian\.com|cnn\.com|axios\.com|watcher\.guru)$/;

export interface HolderMethodConfig {
  components: { id: ComponentId; label: string; requires: string[]; maxAgeSeconds: number; minCoverage?: number; parameters?: Record<string, number> }[];
  composite: { enabled: boolean; disabledReason?: string; normalization: Record<string, { zeroAt: number; hundredAt: number }>; weights: Record<string, number>; gate: { minComponents: number; requiredAreas: ("persistence" | "demand" | "market_health" | "relative_strength")[]; maxBoundWidth: number } };
}

export interface BuildContext {
  store: Store;
  cutoff: number;
  catalog: Catalog;
  holderConfig: HolderMethodConfig;
  registryVenues: { slug: string; providerSlug: string; indexedProviderIds?: string[] }[];
}

const t = (s: number | null) => (s === null ? null : iso(s));

function lastBefore<T extends { observed_at: number }>(rows: T[], at: number): T | null {
  let best: T | null = null;
  for (const r of rows) if (r.observed_at <= at) best = r;
  return best;
}

function nearestTo<T extends { observed_at: number }>(rows: T[], at: number, tol: number): T | null {
  let best: T | null = null;
  for (const r of rows) if (Math.abs(r.observed_at - at) <= tol && (!best || Math.abs(r.observed_at - at) < Math.abs(best.observed_at - at))) best = r;
  return best;
}

export function buildReleaseContent(ctx: BuildContext) {
  const { store, cutoff, catalog } = ctx;
  const runs = store.dailyRuns(cutoff);
  const latest = runs.at(-1);
  if (!latest) throw new Error("no validated daily run available at the cutoff");
  const F = latest.financial_anchor!;
  const T = latest.chart_anchor!;
  const D = Math.floor(T / DAY) * DAY;
  const evidenceIds = new Set<string>();
  const cite = (ids: (string | null | undefined)[]) => {
    const out = ids.filter((x): x is string => Boolean(x));
    for (const id of out) evidenceIds.add(id);
    return out;
  };

  const tokens = store.tokens(cutoff);
  const tokenById = new Map(tokens.map((x) => [x.token_id, x]));
  const memberships = store.memberships(cutoff).filter((m) => tokenById.has(m.token_id));
  const narrativesDb = store.narratives(cutoff);
  const narrativeById = new Map(narrativesDb.map((n) => [n.narrative_id, n]));
  const featured = store.featured(latest.run_id);
  const featuredRank = new Map(featured.map((f) => [f.narrative_id, f.rank]));
  // The run in which each narrative was last collected gives its chart anchor.
  const lastCollectedRun = new Map<string, RunRow>();
  for (const r of runs) for (const f of store.featured(r.run_id)) lastCollectedRun.set(f.narrative_id, r);

  const collectionOf = (m: MembershipRowDb): MembershipPublic["collection"] =>
    m.effective_to !== null ? "ended" : m.close_kind === "collection_paused" ? "collection_paused" : m.close_kind === "inactive" ? "inactive" : "collected";

  // ---------------------------------------------------------------- per-token series
  const snap = (id: string, metric: string) => store.snapshots("token", id, metric, cutoff);
  const hourly = (id: string, from: number, to: number) => store.windows("token", id, "token.volume_usd", HOUR, cutoff, from, to);
  const daily = (id: string, from: number, to: number) => store.windows("token", id, "token.volume_usd", DAY, cutoff, from, to);

  /** Hourly volume with the documented pre-creation zero rule (whole bucket before the token existed). */
  function hourlySeries(tok: TokenRow, end: number): SeriesPoint[] {
    const w = hourly(tok.token_id, end - WEEK, end);
    const out: SeriesPoint[] = [];
    for (let s = end - WEEK; s < end; s += HOUR) {
      const v = w.get(s);
      out.push({ time: s, value: v ? v.value : tok.token_created_at !== null && s + HOUR <= tok.token_created_at ? 0 : null });
    }
    return out;
  }

  function dailySeries(tok: TokenRow, end: number, days = 30): SeriesPoint[] {
    const w = daily(tok.token_id, end - days * DAY, end);
    const out: SeriesPoint[] = [];
    for (let s = end - days * DAY; s < end; s += DAY) {
      const v = w.get(s);
      out.push({ time: s, value: v ? v.value : tok.token_created_at !== null && s + DAY <= tok.token_created_at ? 0 : null });
    }
    return out;
  }

  function returnOver(id: string, horizon: number, at: number): number | null {
    const prices = snap(id, "token.price_usd");
    const p1 = lastBefore(prices, at);
    if (!p1 || at - p1.observed_at > PRICE_MAX_AGE) return null;
    const p0 = nearestTo(prices, p1.observed_at - horizon, 12 * HOUR);
    return p0 && p0.value > 0 ? p1.value / p0.value - 1 : null;
  }

  const tokenMemberships = new Map<string, MembershipRowDb[]>();
  for (const m of memberships) tokenMemberships.set(m.token_id, [...(tokenMemberships.get(m.token_id) ?? []), m]);
  const narrativeMembers = new Map<string, MembershipRowDb[]>();
  for (const m of memberships) narrativeMembers.set(m.narrative_id, [...(narrativeMembers.get(m.narrative_id) ?? []), m]);

  const membershipPublic = (m: MembershipRowDb): MembershipPublic => {
    const n = narrativeById.get(m.narrative_id);
    return {
      intervalId: m.interval_id,
      narrativeId: m.narrative_id,
      narrativeSlug: n?.slug ?? m.narrative_id,
      narrativeTitle: n?.title ?? m.narrative_id,
      tokenId: m.token_id,
      effectiveFrom: iso(m.effective_from),
      recordedAt: iso(m.recorded_at),
      effectiveTo: t(m.effective_to),
      collection: collectionOf(m),
      observedThrough: t(m.observed_through),
      basis: m.basis,
      rationale: m.rationale,
      closeReason: m.close_reason,
      evidence: cite(JSON.parse(m.evidence_ids_json ?? "[]")),
    };
  };

  const holderLabels = Object.fromEntries(ctx.holderConfig.components.map((c) => [c.id, c.label])) as Record<ComponentId, string>;
  const holderRequires = Object.fromEntries(ctx.holderConfig.components.map((c) => [c.id, c.requires])) as Record<ComponentId, string[]>;
  const holderMaxAge = Object.fromEntries(ctx.holderConfig.components.map((c) => [c.id, c.maxAgeSeconds])) as Record<ComponentId, number>;
  const holderMinCoverage = Object.fromEntries(ctx.holderConfig.components.map((c) => [c.id, c.minCoverage ?? 1])) as Record<ComponentId, number>;
  const holderParams = Object.fromEntries(ctx.holderConfig.components.map((c) => [c.id, c.parameters ?? {}])) as Partial<Record<ComponentId, Record<string, number>>>;
  /** Inputs an enabled capability provides on a chain. No catalog capability reports wallet portfolios across assets. */
  const sourcesFor = (chain: string, pumpCoin: boolean): HolderSources => {
    const on = (population: string) =>
      catalog.capabilities.some((c) => c.enabled && c.semantics.population === population && c.dataNetworks.includes(chain as Chain) && (!c.key.startsWith("pump.") || pumpCoin));
    return { allHolders: on("all_holders"), topHolders: on("top_holders_sample"), walletTrades: on("recent_trades_sample"), portfolio: false };
  };
  const labelCache = new Map<string, ReturnType<Store["addressLabels"]>>();
  const labelsFor = (chain: string) => {
    if (!labelCache.has(chain)) labelCache.set(chain, store.addressLabels(chain, cutoff));
    return labelCache.get(chain)!;
  };
  const peerCfg = ctx.holderConfig.components.find((c) => c.id === "relative.peer_performance")?.parameters ?? { minPeers: 3 };
  const capByKey = new Map(catalog.capabilities.map((c) => [c.key, c]));

  const coinBundles: Record<string, unknown> = {};
  const bottomingSignals: { tokenId: string; time: number; label: string }[] = [];
  const episodeOpens: { tokenId: string; time: number; label: string }[] = [];
  const priceSeriesForEval: { tokenId: string; samples: { time: number; price: number }[] }[] = [];
  let costKnownCoins = 0;

  const coins: CoinPublic[] = tokens.map((tok) => {
    const id = tok.token_id;
    const ms = tokenMemberships.get(id) ?? [];
    const open = ms.filter((m) => m.effective_to === null);
    const status: CoinPublic["collection"]["status"] = open.some((m) => m.close_kind === null) ? "collected" : open.some((m) => m.close_kind === "collection_paused") ? "collection_paused" : "inactive";
    const prices = snap(id, "token.price_usd");
    const caps = snap(id, "token.market_cap_circulating_usd");
    const liq = snap(id, "token.liquidity_usd");
    const vol24 = snap(id, "token.volume_rolling24h_usd");
    const ch24 = snap(id, "token.price_change_rolling24h_pct");
    const latestOf = (rows: typeof prices, unit: "usd" | "usd_per_token" | "percent", note: string): Measure<number> => {
      const r = rows.at(-1);
      if (!r) return missing("insufficient_data", unit, note);
      cite([r.evidence_id]);
      return withFreshness(observed(r.value, unit, r.observed_at, { evidence: [r.evidence_id] }), cutoff, PRICE_MAX_AGE);
    };
    const changeMeasure = (h: number, label: string): Measure<number> => {
      const r = returnOver(id, h, cutoff);
      return r === null ? missing("insufficient_data", "percent", `No snapshot price ${label} earlier (within 12 hours) for a current price.`) : derived(100 * r, "percent", prices.at(-1)!.observed_at, { method: "snapshot-to-snapshot", note: "Snapshot prices about the same time of day, not candle closes." });
    };
    // Daily volume: the latest 30 complete days the store holds for this coin.
    const lastDaily = [...daily(id, -Infinity, Infinity).keys()].at(-1);
    const dailyEnd = lastDaily === undefined ? null : Math.min(D, lastDaily + DAY);
    const volumeDaily = dailyEnd === null ? [] : dailySeries(tok, dailyEnd);
    const week = volumeDaily.slice(-7).map((p) => p.value);
    const vol7 = sumOrNull(week);
    const volume7d: Measure<number> =
      dailyEnd === null || week.length < 7
        ? missing("insufficient_data", "usd", "No daily volume bars.")
        : vol7 === null
          ? missing("insufficient_data", "usd", "A day in the last seven has no bar.")
          : withFreshness(derived(vol7, "usd", dailyEnd, { window: { start: dailyEnd - WEEK, end: dailyEnd }, method: "sum of Codex all-pool daily bars" }), cutoff, 2 * DAY);

    // Bottoming: Codex daily candles when the store has them, else provider candles, else snapshot samples.
    const { bottoming: binputs, method: mi } = coinMethodInputs(store, tok, cutoff, labelsFor(tok.chain));
    if (mi.sales?.some((x) => x.costUsd !== null)) costKnownCoins++;
    const candles = mi.candles;
    // Evaluate only from when the coin was first known; earlier dates have nothing to say about it.
    const evalTimes = runs.map((r) => r.available_at).filter((at) => at >= tok.first_available_at);
    const hist = bottomingHistory(binputs, evalTimes, BOTTOMING_DEFAULTS);
    const now = evaluateBottoming(binputs, cutoff, BOTTOMING_DEFAULTS);

    // Holder analysis. Each component accepts only the populations it is valid for (src/lib/lamble/methods/holders.ts).
    const liquiditySnapshots = liq.map((l) => {
      const c = caps.find((x) => x.run_id === l.run_id && x.evidence_id === l.evidence_id);
      return { time: l.observed_at, liquidityUsd: l.value, marketCapUsd: c?.value ?? null, evidenceId: l.evidence_id };
    });
    for (const p of mi.panels) cite([p.evidenceId]);
    const peerIds = [...new Set(open.flatMap((m) => (narrativeMembers.get(m.narrative_id) ?? []).filter((x) => x.effective_to === null && x.token_id !== id).map((x) => x.token_id)))];
    const peers = peerIds.map((p) => ({ tokenId: p, return7d: returnOver(p, WEEK, cutoff) }));
    const components = holderComponents({
      asOf: cutoff,
      liquiditySnapshots,
      ownReturn7d: returnOver(id, WEEK, cutoff),
      peers,
      sources: sourcesFor(tok.chain, tok.origin_venue === "pump.fun"),
      panels: mi.panels,
      supply: mi.supply,
      prices: prices.map((p) => ({ time: p.observed_at, value: p.value })),
      addressClasses: mi.addressClasses,
      trades: mi.trades,
      tradeCoverage: mi.tradeCoverage,
      dailyCloses: candles.filter((c) => c.close !== null).map((c) => ({ start: c.start, close: c.close! })),
      flows: binputs.flows ?? [],
      episode: now.episode ? { peakTime: now.episode.peakTime, lowTime: now.episode.lowTime } : null,
      labels: holderLabels,
      requires: holderRequires,
      maxAgeSeconds: holderMaxAge,
      minCoverage: holderMinCoverage,
      parameters: holderParams,
      minPeers: peerCfg.minPeers ?? 3,
    });
    for (const c of components) cite(c.measure.evidence ?? []);
    const comp = composite(components, ctx.holderConfig.composite);
    for (const e of hist.evaluations) if (e.stage !== null && e.stage >= 1) bottomingSignals.push({ tokenId: id, time: e.asOf, label: `stage-${e.stage}` });
    for (const ep of hist.episodes) episodeOpens.push({ tokenId: id, time: ep.openedAt, label: "episode-open" });
    priceSeriesForEval.push({ tokenId: id, samples: prices.map((p) => ({ time: p.observed_at, price: p.value })) });
    const bottoming: BottomingPublic = {
      state: now.state,
      stage: now.stage,
      label: now.label,
      priceBasis: now.priceBasis,
      asOf: iso(now.asOf),
      episodeId: now.episode?.id ?? null,
      peak: now.episode ? { time: iso(now.episode.peakTime), price: now.episode.peakPrice } : null,
      low: now.episode ? { time: iso(now.episode.lowTime), price: now.episode.lowPrice } : null,
      drawdownCurrent: now.drawdown.current,
      drawdownMax: now.drawdown.maxInEpisode,
      secondsSinceLow: now.secondsSinceLow,
      conditions: [
        { id: "capitulation", label: "Realized loss-taking", state: now.conditions.capitulation.state, detail: now.conditions.capitulation.detail },
        { id: "low_holds", label: "Low holds", state: now.conditions.lowHolds.state, detail: now.conditions.lowHolds.detail },
        { id: "absorption", label: "Absorption and new buyers", state: now.conditions.absorption.state, detail: now.conditions.absorption.detail },
      ],
      explanation: now.explanation,
      invalidatesIf: now.invalidatesIf,
      // Transitions only: an entry whenever the state, stage or label changed between daily evaluations.
      history: hist.evaluations
        .filter((e, i, arr) => i === 0 || e.state !== arr[i - 1]!.state || e.stage !== arr[i - 1]!.stage || e.label !== arr[i - 1]!.label)
        .map((e) => ({ asOf: iso(e.asOf), state: e.state, stage: e.stage, label: e.label })),
      episodes: hist.episodes.map((e) => ({
        id: e.id,
        peakTime: iso(e.peakTime),
        peakPrice: e.peakPrice,
        lowTime: iso(e.lowTime),
        lowPrice: e.lowPrice,
        closedAt: t(e.closedAt),
        closeReason: e.closeReason,
        invalidations: e.invalidations.length,
      })),
      methodVersion: BOTTOMING_VERSION,
    };

    const chain = tok.chain as Chain;
    const pumpApplicable = chain === "solana" && tok.origin_venue === "pump.fun";
    const activity = store.capabilityActivity(id, cutoff);
    const providerPanels = ["pump.coin", "pump.holders", "pump.candles", "fomo.token", "fomo.holders", "fomo.theses"].map((key) => {
      const cap = capByKey.get(key)!;
      const applicable = key.startsWith("pump.") ? pumpApplicable : cap.dataNetworks.includes(chain);
      const seen = applicable ? activity.get(key) : undefined;
      return {
        capability: key,
        applicable,
        state: (seen ? "observed" : applicable ? (cap.enabled ? "insufficient_data" : "unavailable") : "not_applicable") as CoinPublic["providerPanels"][number]["state"],
        note: seen
          ? `${seen.rows} stored record(s); latest source time ${iso(seen.latest)}. ${cap.semantics.population ? `Population: ${cap.semantics.population.replaceAll("_", " ")}.` : "Source-reported."}`
          : !applicable
            ? key.startsWith("pump.")
              ? "Not a pump.fun coin on Solana."
              : `FOMO does not list ${chain}.`
            : cap.enabled
              ? "No observation collected for this coin yet."
              : "See provider table.",
      };
    });
    const pools = store.pools(id).map((p) => ({ poolId: p.pool_id, address: p.address, kind: p.kind, createdAt: t(p.pool_created_at) }));
    const lastCollected = prices.at(-1)?.observed_at ?? null;
    const membershipsPub = ms.map(membershipPublic);
    const coinEvidence = cite(JSON.parse(tok.evidence_ids_json ?? "[]"));
    const coin: CoinPublic = {
      id,
      chain,
      address: tok.address,
      displayAddress: tok.display_address,
      name: tok.name,
      symbol: tok.symbol,
      names: store.tokenNames(id),
      explorerUrl: EXPLORERS[chain] ? `${EXPLORERS[chain]}${tok.display_address}` : null,
      identity: {
        tokenCreatedAt: t(tok.token_created_at),
        tokenCreatedBasis: tok.token_created_basis,
        firstObservedAt: iso(tok.first_observed_at),
        firstAvailableAt: iso(tok.first_available_at),
        firstObservedRun: tok.first_observed_run,
        originVenue: tok.origin_venue,
        originStatus: tok.origin_status,
        pools,
      },
      collection: {
        status,
        lastCollectedAt: t(lastCollected),
        note:
          status === "collected"
            ? "Collected by the daily run."
            : status === "collection_paused"
              ? "Its narrative's collection is paused; membership stays open and values below are the last observed."
              : "Archived for inactivity (under $1,000 of 24h volume twice); membership stays open and values below are the last observed.",
      },
      market: {
        price: latestOf(prices, "usd_per_token", "No price snapshot."),
        marketCap: latestOf(caps, "usd", "No circulating market cap (Codex reports 0 when supply is unknown)."),
        fdv: missing("unavailable", "usd", "No validated capability reports total supply for FDV; circulating market cap is shown instead and never relabelled."),
        liquidity: latestOf(liq, "usd", "No liquidity snapshot."),
        volume24hRolling: latestOf(vol24, "usd", "No rolling 24h volume."),
        priceChange24hRolling: latestOf(ch24, "percent", "No rolling 24h change."),
        change1d: changeMeasure(DAY, "1 day"),
        change7d: changeMeasure(WEEK, "7 days"),
        change30d: changeMeasure(30 * DAY, "30 days"),
        volume7d,
      },
      charts: { price: prices.map((p) => ({ time: p.observed_at, value: p.value })), priceBasis: candles.length ? "daily-candles" : "snapshot-samples", volumeDaily, volumeDailyEnd: t(dailyEnd) },
      holders: {
        // Labels, areas and requirements are release-level (componentsTable); unavailable notes identical for every coin live there too.
        components: components.map((c) => ({
          id: c.id,
          measure: c.measure.state === "unavailable" && c.measure.note === unavailableNote(c.id) ? { state: c.measure.state, value: null, unit: c.measure.unit, asOf: null, note: "See method table." } : c.measure,
          inputs: c.id === "relative.peer_performance" ? { ...c.inputs, peers: undefined } : c.inputs,
          history: c.history.filter((h) => h.value !== null),
        })),
        composite: { state: comp.state, score: comp.score, bound: comp.bound, note: comp.note, version: COMPOSITE_VERSION },
        methodVersion: HOLDERS_VERSION,
      },
      bottoming,
      memberships: membershipsPub,
      peers: peers.map((p) => {
        const m = open.find((x) => (narrativeMembers.get(x.narrative_id) ?? []).some((y) => y.token_id === p.tokenId));
        return { tokenId: p.tokenId, symbol: tokenById.get(p.tokenId)?.symbol ?? null, narrativeSlug: m ? (narrativeById.get(m.narrative_id)?.slug ?? m.narrative_id) : "", return7d: p.return7d === null ? null : Math.round(p.return7d * 1e6) / 1e6 };
      }),
      providerPanels,
      evidence: coinEvidence,
    };
    // Paid bundle: provenance per observation, compactly referenced through an evidence table.
    const evTable: string[] = [];
    const evIndex = (e: string) => {
      let i = evTable.indexOf(e);
      if (i < 0) i = evTable.push(e) - 1;
      cite([e]);
      return i;
    };
    const snapRows = (rows: typeof prices) => rows.map((r) => [r.observed_at, r.value, r.available_at, evIndex(r.evidence_id)]);
    const winRows = (m: ReturnType<typeof hourly>) => [...m.values()].map((v) => [v.windowStart, v.value, v.availableAt, evIndex(v.evidenceId), v.revisionOf]);
    coinBundles[id] = {
      columns: { snapshot: ["observedAt", "value", "availableAt", "evidence"], window: ["windowStart", "value", "availableAt", "evidence", "revisionOf"] },
      series: {
        price: snapRows(prices),
        marketCapCirculating: snapRows(caps),
        liquidity: snapRows(liq),
        volumeRolling24h: snapRows(vol24),
        priceChangeRolling24hPct: snapRows(ch24),
        volumeHourly: winRows(hourly(id, -Infinity, Infinity)),
        volumeDaily: winRows(daily(id, -Infinity, Infinity)),
      },
      evidence: evTable,
      memberships: ms,
      bottoming: {
        current: now,
        evaluations: hist.evaluations.map((e) => [e.asOf, e.state, e.stage, e.conditions.capitulation.state, e.conditions.lowHolds.state, e.conditions.absorption.state, e.drawdown.current]),
        evaluationColumns: ["asOf", "state", "stage", "capitulation", "lowHolds", "absorption", "drawdownCurrent"],
        episodes: hist.episodes,
      },
      holders: components.map((c) => ({ id: c.id, inputs: c.inputs, requires: c.requires })),
      peers,
    };
    return coin;
  });
  const coinById = new Map(coins.map((c) => [c.id, c]));

  // ---------------------------------------------------------------- narratives
  const overlapTokens = new Map<string, Set<string>>();
  for (const m of memberships) if (m.effective_to === null) overlapTokens.set(m.token_id, new Set([...(overlapTokens.get(m.token_id) ?? []), m.narrative_id]));
  const narrativeBundles: Record<string, unknown> = {};
  /** A member's latest observed (not stale) market values from its coin record in this release. */
  const memberMarket = (tokenId: string) => {
    const mk = coinById.get(tokenId)?.market;
    const fresh = (m: Measure<number> | undefined) => (m && m.state === "observed" ? m.value : null);
    const times = [mk?.price, mk?.marketCap, mk?.liquidity].filter((m) => m && m.state === "observed" && m.asOf !== null).map((m) => m!.asOf!);
    return { price: fresh(mk?.price), marketCap: fresh(mk?.marketCap), liquidity: fresh(mk?.liquidity), marketAsOf: times.length ? iso(Math.max(...times)) : null };
  };
  const narratives: NarrativePublic[] = narrativesDb.map((n) => {
    const nid = n.narrative_id;
    const version = store.narrativeVersion(nid, cutoff);
    const lifecycle = store.lifecycle(nid, cutoff);
    const current = lifecycle.find((l) => l.to_at === null) ?? lifecycle.at(-1);
    const ms = narrativeMembers.get(nid) ?? [];
    const lastRun = lastCollectedRun.get(nid) ?? null;
    const anchor = lastRun?.chart_anchor ?? null;
    const dEnd = anchor === null ? null : Math.floor(anchor / DAY) * DAY;
    // Activity basket: members collected in the narrative's last collected run.
    const basket = ms.filter((m) => m.effective_to === null && (m.close_kind === null || (m.close_kind === "collection_paused" && lastRun && (m.observed_through ?? 0) >= lastRun.runtime_at)));
    const basketTokens = [...new Set(basket.map((m) => m.token_id))].map((x) => tokenById.get(x)!).filter(Boolean);
    const hourlyBy = new Map(basketTokens.map((tk) => [tk.token_id, anchor === null ? [] : hourlySeries(tk, anchor)]));
    const dailyBy = new Map(basketTokens.map((tk) => [tk.token_id, dEnd === null ? [] : dailySeries(tk, dEnd)]));
    const sumSeries = (series: SeriesPoint[][]) =>
      series[0]?.map((p, i) => ({ time: p.time, value: series.every((s) => s[i]?.value !== null && s[i]?.value !== undefined) ? fsum(series.map((s) => s[i]!.value!)) : null })) ?? [];
    const hourlySum = sumSeries([...hourlyBy.values()]);
    const dailySum = sumSeries([...dailyBy.values()]);
    const sum = (pts: SeriesPoint[]) => sumOrNull(pts.map((p) => p.value));
    const v24 = sum(hourlySum.slice(-24));
    const v7 = sum(hourlySum);
    const v30 = sum(dailySum);
    const d7 = sum(dailySum.slice(-7));
    const d7prior = sum(dailySum.slice(-14, -7));
    const change7 = percentChange(d7, d7prior);
    const isCollected = current?.state === "collected";
    // A narrative that is not collected keeps its last observed window, labelled stale with the reason.
    const notCollectedNote = isCollected || anchor === null ? undefined : `Not collected since ${iso(current?.from_at ?? anchor)} (${current?.state ?? "paused"}); window ends ${iso(anchor)}.`;
    const asOfMeasure = (v: number | null, window: number, note: string): Measure<number> =>
      v === null || anchor === null
        ? missing("insufficient_data", "usd", note)
        : withFreshness(derived(v, "usd", anchor, { window: { start: anchor - window, end: anchor }, coverage: { scope: `${basketTokens.length} identified coins, all indexed pools (Codex getTokenBars); not all-market coverage.`, population: "tracked_universe" }, note: notCollectedNote }), cutoff, isCollected ? 2 * DAY : 0);
    const memberRows: NarrativeMemberPublic[] = ms.map((m) => {
      const tk = tokenById.get(m.token_id)!;
      const h = hourlyBy.get(m.token_id);
      const dd = dailyBy.get(m.token_id);
      const vol24 = h ? sum(h.slice(-24)) : null;
      const vol7 = dd ? sum(dd.slice(-7)) : null;
      return {
        tokenId: m.token_id,
        symbol: tk.symbol,
        name: tk.name,
        chain: tk.chain as Chain,
        intervalId: m.interval_id,
        effectiveFrom: iso(m.effective_from),
        collection: collectionOf(m),
        observedThrough: t(m.observed_through),
        volume24h: vol24,
        volume7d: vol7,
        share7d: null,
        return7d: returnOver(m.token_id, WEEK, isCollected ? cutoff : (lastRun?.available_at ?? cutoff)),
        originVenue: tk.origin_venue,
        ...memberMarket(m.token_id),
      };
    });
    const total7 = fsum(memberRows.map((r) => r.volume7d ?? 0));
    for (const r of memberRows) r.share7d = r.volume7d !== null && total7 > 0 ? r.volume7d / total7 : null;
    memberRows.sort((a, b) => (b.volume7d ?? -1) - (a.volume7d ?? -1) || a.tokenId.localeCompare(b.tokenId));
    const shares = memberRows.filter((r) => r.share7d !== null).map((r) => r.share7d!);
    const withReturns = memberRows.filter((r) => r.return7d !== null && r.collection !== "ended");
    // Evidence: project claims, independent reporting and posts are kept apart. Reposts never corroborate.
    const sources = (version?.provenance_json ? (JSON.parse(version.provenance_json) as { label: string; url: string }[]) : []).filter((s) => {
      try {
        return new URL(s.url).protocol === "https:";
      } catch {
        return false;
      }
    });
    const asEvidence = (s: { label: string; url: string }, kind: Evidence["kind"]): Evidence => ({ id: `src:${s.url}`, kind, label: s.label, url: s.url, at: null, route: "curated" });
    const independent = sources.filter((s) => NEWS_HOSTS.test(new URL(s.url).hostname)).map((s) => asEvidence(s, "curated-source"));
    const posts = sources.filter((s) => /^(x|twitter)\.com$/.test(new URL(s.url).hostname.replace(/^www\./, ""))).map((s) => asEvidence(s, "x-post"));
    const claims = sources.filter((s) => !NEWS_HOSTS.test(new URL(s.url).hostname) && !/^(x|twitter)\.com$/.test(new URL(s.url).hostname.replace(/^www\./, ""))).map((s) => asEvidence(s, "curated-source"));
    const signals = version?.signals_json ? (JSON.parse(version.signals_json) as { id: string; title: string; label: string | null; at: string | null }[]) : [];
    for (const s of signals) {
      const post = s.id.startsWith("x-") ? store.post(s.id.slice(2)) : undefined;
      cite([s.id]);
      if (post) posts.push({ id: s.id, kind: "x-post", label: `${s.title}${s.label ? ` — ${s.label}` : ""}`, url: post.url, at: t(post.created_at), route: "frames" });
    }
    const story = version?.story_status_json ? (JSON.parse(version.story_status_json) as { notice?: string; interpretation?: string; observedAt?: string; evidenceId?: string }) : null;
    if (story?.evidenceId) cite([story.evidenceId]);
    // Volume caveat from rolling snapshots: coins trading far above their market cap.
    const flagged = basketTokens.filter((tk) => {
      const v = snap(tk.token_id, "token.volume_rolling24h_usd").at(-1)?.value;
      const c = snap(tk.token_id, "token.market_cap_circulating_usd").at(-1)?.value;
      return v !== undefined && c !== undefined && c > 0 && v / c > TURNOVER_FLAG;
    });
    const flaggedShare = v24 && v24 > 0 ? fsum(flagged.map((tk) => sum(hourlyBy.get(tk.token_id)!.slice(-24)) ?? 0)) / v24 : null;
    const overlap = new Map<string, number>();
    for (const m of ms) for (const other of overlapTokens.get(m.token_id) ?? []) if (other !== nid) overlap.set(other, (overlap.get(other) ?? 0) + 1);
    const counts = { open: 0, collected: 0, paused: 0, inactive: 0, ended: 0 };
    for (const r of memberRows) {
      if (r.collection === "ended") counts.ended++;
      else counts.open++;
      if (r.collection === "collected") counts.collected++;
      if (r.collection === "collection_paused") counts.paused++;
      if (r.collection === "inactive") counts.inactive++;
    }
    narrativeBundles[nid] = {
      memberships: ms,
      versions: version,
      lifecycle,
      memberSeries: {
        hourlyStart: anchor === null ? null : anchor - WEEK,
        dailyStart: dEnd === null ? null : dEnd - 30 * DAY,
        tokens: Object.fromEntries([...hourlyBy.entries()].map(([k, v]) => [k, { hourly: v.map((p) => p.value), daily: (dailyBy.get(k) ?? []).map((p) => p.value) }])),
      },
    };
    return {
      id: nid,
      slug: n.slug,
      title: version?.title ?? n.title,
      category: n.category,
      summary: version?.summary ?? null,
      lifecycle: {
        state: current?.state ?? "collected",
        since: iso(current?.from_at ?? n.first_observed_at),
        reason: current?.reason ?? null,
        history: lifecycle.map((l) => ({ state: l.state, from: iso(l.from_at), to: t(l.to_at), reason: l.reason })),
      },
      featured: { featured: featuredRank.has(nid), rank: featuredRank.get(nid) ?? null },
      // Trend describes the latest window only while the narrative is collected; otherwise its data has stopped.
      trend: !isCollected ? "not_collected" : n.first_observed_at >= cutoff - WEEK ? "new" : change7 === null ? "unknown" : change7 >= 25 ? "rising" : change7 <= -25 ? "fading" : "steady",
      firstObservedAt: iso(n.first_observed_at),
      story: story ? { notice: story.notice ?? null, interpretation: story.interpretation ?? null, observedAt: story.observedAt ?? null, evidence: story.evidenceId ?? null } : null,
      evidence: {
        projectClaims: claims,
        independent,
        posts,
        note: "Project claims are what a project or its participants say; independent sources are third-party reporting; posts are a top-results sample whose reposts of one claim count once. Membership is a classification of what a coin is, not affiliation with any named project or person.",
      },
      members: memberRows,
      memberCounts: counts,
      activity: {
        volume24h: asOfMeasure(v24, DAY, "No complete 24 hours of member volume."),
        volume7d: asOfMeasure(v7, WEEK, "No complete 7 days of hourly member volume."),
        volume30d: v30 === null || dEnd === null ? missing("insufficient_data", "usd", "No complete 30 days of daily member volume.") : withFreshness(derived(v30, "usd", dEnd, { window: { start: dEnd - 30 * DAY, end: dEnd }, note: [notCollectedNote, "Today's basket applied to earlier days (reconstructed)."].filter(Boolean).join(" ") }), cutoff, isCollected ? 2 * DAY : 0),
        change7dPct: change7,
        hourly: hourlySum,
        daily: dailySum,
        lastObservedAt: t(anchor),
        volumeScope:
          version?.volume_scope ??
          `Sum of ${basketTokens.length} identified coins' volume across all their indexed pools; not all-market coverage. Current membership applied to past hours.`,
        caveat: flagged.length
          ? `${flagged.map((tk) => tk.name ?? tk.symbol).slice(0, 3).join(", ")}${flagged.length > 3 ? " and others" : ""} traded over ${TURNOVER_FLAG}x ${flagged.length === 1 ? "its" : "their"} market cap in 24h (${((flaggedShare ?? 0) * 100).toFixed(0)}% of this volume); it may include wash or bot trading.`
          : null,
      },
      concentration: { top1Share: shares.length ? Math.max(...shares) : null, hhi: shares.length ? Math.round(fsum(shares.map((s) => (100 * s) ** 2))) : null },
      breadth: { advancing: withReturns.filter((r) => r.return7d! > 0).length, withPrices: withReturns.length, members: memberRows.filter((r) => r.collection !== "ended").length },
      overlap: [...overlap.entries()].map(([other, tokensShared]) => ({ narrativeSlug: narrativeById.get(other)?.slug ?? other, tokens: tokensShared })),
      market: (() => {
        const live = memberRows.filter((r) => r.collection !== "ended");
        const caps = live.filter((r) => r.marketCap !== null);
        const liqs = live.filter((r) => r.liquidity !== null);
        const asOf = live.map((r) => r.marketAsOf).filter((x): x is string => x !== null).sort();
        const rets = withReturns.map((r) => r.return7d!).sort((a, b) => a - b);
        const mid = Math.floor(rets.length / 2);
        return {
          marketCap: caps.length ? fsum(caps.map((r) => r.marketCap!)) : null,
          liquidity: liqs.length ? fsum(liqs.map((r) => r.liquidity!)) : null,
          withMarketCap: caps.length,
          withLiquidity: liqs.length,
          of: live.length,
          medianReturn7d: rets.length ? (rets.length % 2 ? rets[mid]! : (rets[mid - 1]! + rets[mid]!) / 2) : null,
          oldest: asOf[0] ?? null,
          newest: asOf.at(-1) ?? null,
          note: "Sum of open members' latest circulating market caps and top-pair liquidity from Codex snapshots taken at slightly different times; stale or missing values are left out and counted. A cross-section at one time, never summed over time.",
        };
      })(),
    } satisfies NarrativePublic;
  });

  // ---------------------------------------------------------------- launchpads
  const policy = store.feePolicy(cutoff);
  const included: string[] = policy ? JSON.parse(policy.included_json) : [];
  const excluded: Record<string, string> = policy ? JSON.parse(policy.excluded_json) : {};
  const indexRows = store.indexRows(cutoff);
  const venueRows = store.venues();
  const launchpadBundles: Record<string, unknown> = {};
  const launchpads: LaunchpadPublic[] = SNAPSHOT_LAUNCHPADS.map((presentationRow) => {
    const reg = ctx.registryVenues.find((v) => v.slug === presentationRow.slug)!;
    const provider = reg.providerSlug;
    const fees = store.windows("venue_provider", provider, "venue.fees_usd", DAY, cutoff);
    const revenue = store.windows("venue_provider", provider, "venue.revenue_usd", DAY, cutoff);
    const supply = store.windows("venue_provider", provider, "venue.supply_side_usd", DAY, cutoff);
    const supplyDefinition = presentationRow.provenance?.methodology?.SupplySideRevenue ?? null;
    const windowSum = (m: typeof fees, end: number, days: number) => sumOrNull(Array.from({ length: days }, (_, i) => m.get(end - (days - i) * DAY)?.value ?? null));
    const period = (days: number) => {
      const f = windowSum(fees, F, days);
      return {
        fees: f,
        revenue: windowSum(revenue, F, days),
        supplySide: supplyDefinition ? windowSum(supply, F, days) : null,
        change: percentChange(f, windowSum(fees, F - days * DAY, days)),
      };
    };
    const rows = (reg.indexedProviderIds ?? []).map((pid) => ({
      pid,
      created24: indexRows.find((r) => r.entity_id === pid && r.metric === "index.created_rolling24h"),
      created7d: indexRows.find((r) => r.entity_id === pid && r.metric === "index.created_rolling7d"),
      completed24: indexRows.find((r) => r.entity_id === pid && r.metric === "index.completed_rolling24h"),
      completed7d: indexRows.find((r) => r.entity_id === pid && r.metric === "index.completed_rolling7d"),
    }));
    const haveAll = rows.length > 0 && rows.every((r) => r.created24 && r.created7d && r.completed24 && r.completed7d) && new Set(rows.map((r) => r.created24!.event_time)).size === 1;
    const curve = !NO_CURVE_COMPLETION.has(presentationRow.slug);
    const history = store.indexHistory(reg.indexedProviderIds ?? [], cutoff);
    const byTime = new Map<number, number>();
    for (const h of history) byTime.set(h.event_time, (byTime.get(h.event_time) ?? 0) + h.value);
    const venueTokens = coins.filter((c) => c.identity.originVenue === presentationRow.slug);
    const narrativeCounts = new Map<string, number>();
    for (const c of venueTokens) for (const m of c.memberships) if (m.collection !== "ended") narrativeCounts.set(m.narrativeSlug, (narrativeCounts.get(m.narrativeSlug) ?? 0) + 1);
    const { metrics: _metrics, activityObservation: _activity, ...presentation } = presentationRow;
    void _metrics;
    void _activity;
    const venueDb = venueRows.find((v) => v.slug === presentationRow.slug);
    const lpEvidence: string[] = [];
    const lpEv = (e: string) => {
      let i = lpEvidence.indexOf(e);
      if (i < 0) i = lpEvidence.push(e) - 1;
      return i;
    };
    const rowsOf = (m: typeof fees) => [...m.values()].map((v) => [v.windowStart, v.value, v.availableAt, lpEv(v.evidenceId), v.revisionOf]);
    launchpadBundles[presentationRow.slug] = {
      provider,
      columns: ["dayStart", "valueUsd", "availableAt", "evidence", "revisionOf"],
      fees: rowsOf(fees),
      revenue: rowsOf(revenue),
      supplySide: rowsOf(supply),
      evidence: lpEvidence,
      indexedHistory: [...byTime.entries()].map(([time, value]) => [time, value]),
      latestVenueRow: venueDb?.presentation_json ? JSON.parse(venueDb.presentation_json) : null,
    };
    return {
      slug: presentationRow.slug,
      name: presentationRow.name,
      presentation: presentation as unknown as Record<string, unknown>,
      financialAnchor: iso(F),
      metrics: {
        h24: period(1),
        d7: period(7),
        d30: period(30),
        history30d: Array.from({ length: 30 }, (_, i) => ({ time: F - (30 - i) * DAY, value: fees.get(F - (30 - i) * DAY)?.value ?? null })),
      },
      feeSubtotal: { included: included.includes(presentationRow.slug), excludedReason: excluded[presentationRow.slug] ?? null },
      indexed: haveAll
        ? {
            asOf: iso(rows[0]!.created24!.event_time),
            created24: fsum(rows.map((r) => r.created24!.value)),
            created7d: fsum(rows.map((r) => r.created7d!.value)),
            completed24: curve ? fsum(rows.map((r) => r.completed24!.value)) : null,
            completed7d: curve ? fsum(rows.map((r) => r.completed7d!.value)) : null,
            history: [...byTime.entries()].map(([time, value]) => ({ asOf: iso(time), created24: value })),
          }
        : null,
      coins: venueTokens.map((c) => ({ tokenId: c.id, symbol: c.symbol })),
      narratives: [...narrativeCounts.entries()].map(([slug, count]) => ({ slug, title: narratives.find((n) => n.slug === slug)?.title ?? slug, coins: count })),
      supplySideDefinition: supplyDefinition,
    };
  });

  // ---------------------------------------------------------------- market overview
  const includedRows = launchpads.filter((l) => l.feeSubtotal.included);
  const subtotalAt = (day: number) => {
    const vals = includedRows.map((l) => store.windows("venue_provider", ctx.registryVenues.find((v) => v.slug === l.slug)!.providerSlug, "venue.fees_usd", DAY, cutoff).get(day)?.value ?? null);
    return sumOrNull(vals);
  };
  const feeHistory = Array.from({ length: 30 }, (_, i) => ({ time: F - (30 - i) * DAY, value: subtotalAt(F - (30 - i) * DAY) }));
  const last7 = sumOrNull(feeHistory.slice(-7).map((p) => p.value));
  const prior7 = sumOrNull(feeHistory.slice(-14, -7).map((p) => p.value));
  const ceRows = launchpads.filter((l) => l.metrics.d7.supplySide !== null);
  const collectedTokens = coins.filter((c) => c.collection.status === "collected");
  const dedupHourly = (from: number, to: number) => {
    const vals = collectedTokens.map((c) => {
      const tk = tokenById.get(c.id)!;
      return sumOrNull(hourlySeries(tk, T).filter((p) => p.time >= from && p.time < to).map((p) => p.value));
    });
    return sumOrNull(vals);
  };
  const ws = weekStart(cutoff);
  const devDays = Array.from({ length: Math.max(0, Math.floor((F - ws) / DAY)) }, (_, i) => ws + i * DAY);
  const devVolDays = Array.from({ length: Math.max(0, Math.floor((D - ws) / DAY)) }, (_, i) => ws + i * DAY);
  const indexedVenues = launchpads.filter((l) => l.indexed);
  const market: MarketPublic = {
    feeSubtotal: {
      value: feeHistory.at(-1)!.value,
      anchor: iso(F),
      history30d: feeHistory,
      included,
      excluded,
      scope: policy?.scope ?? "",
      change7dPct: percentChange(last7, prior7),
    },
    creatorEarnings: { value7d: ceRows.length ? fsum(ceRows.map((l) => l.metrics.d7.supplySide!)) : null, venues: ceRows.map((l) => l.slug), scope: "DefiLlama supply-side revenue over the last 7 complete days, venues that define it; each venue's definition differs (creators, holders, referrers or traders)." },
    indexed: {
      created24: indexedVenues.length ? fsum(indexedVenues.map((l) => l.indexed!.created24)) : null,
      completed24: indexedVenues.some((l) => l.indexed!.completed24 !== null) ? fsum(indexedVenues.map((l) => l.indexed!.completed24 ?? 0)) : null,
      completionVenues: indexedVenues.filter((l) => l.indexed!.completed24 !== null).length,
      creationVenues: indexedVenues.length,
      asOf: indexedVenues[0]?.indexed?.asOf ?? null,
      scope: "Codex beta provider-indexed counts for mapped launchpad names; rolling windows; omitted venues are unknown, not zero.",
    },
    rolling7d: {
      start: iso(T - WEEK),
      end: iso(T),
      narrativeVolume: dedupHourly(T - WEEK, T),
      fees: last7,
      note: `Narrative volume: collected coins counted once, hourly, to ${iso(T)}. Fees: the 7 settled UTC days to ${iso(F)} (daily data has no hourly split).`,
    },
    developingWeek: {
      id: weekId(cutoff),
      start: iso(ws),
      through: iso(Math.max(ws, F)),
      fees: devDays.length ? sumOrNull(devDays.map(subtotalAt)) : null,
      feeDays: devDays.length,
      narrativeVolume: devVolDays.length
        ? sumOrNull(collectedTokens.map((c) => sumOrNull(devVolDays.map((d) => daily(c.id, d, d + DAY).get(d)?.value ?? null))))
        : null,
      volumeDays: devVolDays.length,
      partial: true,
    },
    narratives: narratives
      .filter((n) => n.lifecycle.state === "collected")
      .map((n) => ({ slug: n.slug, title: n.title, volume7d: n.activity.volume7d.value, change7dPct: n.activity.change7dPct, trend: n.trend, featured: n.featured.featured }))
      .sort((a, b) => (b.volume7d ?? 0) - (a.volume7d ?? 0)),
    tracked: { coins: coins.length, collected: collectedTokens.length, narratives: narratives.length, collectedNarratives: narratives.filter((n) => n.lifecycle.state === "collected").length },
  };

  // ---------------------------------------------------------------- forward evaluation (descriptive; no claims below sample gates)
  const evaluation = {
    ...evaluate(bottomingSignals, { "drawdown-episode-open": episodeOpens }, priceSeriesForEval),
    version: EVALUATION_VERSION,
    note:
      bottomingSignals.length === 0
        ? `No coin reached stage 1 in any evaluation: condition 1 needs wallet-resolved sales with known acquisition cost${costKnownCoins === 0 ? ", and no coin has any yet" : ""}. Nothing to evaluate; no performance claim is made.`
        : "Descriptive only.",
  };

  // ---------------------------------------------------------------- evidence index (public citations)
  const evidence: Record<string, Evidence> = {};
  for (const e of store.evidence([...evidenceIds])) {
    const post = e.kind === "x-post" ? e.url : null;
    evidence[e.evidence_id] = {
      id: e.evidence_id,
      kind: e.kind as Evidence["kind"],
      label:
        e.kind === "x-post"
          ? `X post by @${e.author ?? "unknown"}`
          : e.kind === "frames-call"
            ? `${e.upstream ?? e.capability ?? "Frames"} via Frames (run ${e.run_id}${e.batch ? `, ${e.batch}:${e.seq}` : ""})`
            : `${e.upstream ?? "Source"}${e.route && e.route !== "frames" ? ` (${e.route.replace(/_/g, " ")})` : ""}`,
      url: post ?? (e.url && /^https:\/\//.test(e.url) && e.kind !== "frames-call" ? e.url : null),
      at: t(e.source_event_time ?? e.fetched_at),
      route: e.route,
    };
  }

  const coverage = catalog.capabilities.map((c) => ({ capability: c.key, status: c.validation.status, enabled: c.enabled, population: c.semantics.population ?? null, coverage: c.semantics.coverage }));

  const methodVersions = {
    releaseBuilder: RELEASE_BUILDER_VERSION,
    holders: HOLDERS_VERSION,
    composite: COMPOSITE_VERSION,
    bottoming: BOTTOMING_VERSION,
    weekly: WEEKLY_VERSION,
    evaluation: EVALUATION_VERSION,
    narratives: "narratives-v1.0.0",
  };
  const dataThrough = {
    financial: iso(F),
    hourlyVolume: iso(T),
    dailyVolume: iso(D),
    prices: t(Math.max(...coins.map((c) => c.market.price.asOf ?? 0)) || null),
    membership: iso(latest.runtime_at),
  };
  return {
    latestRun: latest.run_id,
    sourceRuns: runs.map((r) => r.run_id),
    methodVersions,
    dataThrough,
    publicContent: {
      coins,
      narratives,
      launchpads,
      market,
      evidence,
      coverage,
      evaluation,
      methods: {
        holderComponents: ctx.holderConfig.components.map((c) => {
          const shared = coins.some((x) => x.holders.components.some((h) => h.id === c.id && h.measure.note === "See method table."));
          return { id: c.id, label: c.label, requires: c.requires, maxAgeSeconds: c.maxAgeSeconds, unavailableNote: shared ? unavailableNote(c.id) : null };
        }),
        providerPanels: ["pump.coin", "pump.holders", "pump.candles", "fomo.token", "fomo.holders", "fomo.theses"].map((key) => {
          const cap = capByKey.get(key)!;
          return { capability: key, status: cap.validation.status, enabled: cap.enabled, note: cap.enabled ? "Enabled." : `Candidate capability (${cap.validation.status}): descriptor and live 402 schema verified ${cap.validation.lastVerifiedAt.slice(0, 10)}; no response collected under an approved budget.`, coverage: cap.semantics.coverage };
        }),
        bottomingEvaluationTimes: runs.map((r) => iso(r.available_at)),
      },
    },
    bundles: { coins: coinBundles, narratives: narrativeBundles, launchpads: launchpadBundles },
    counts: { coins: coins.length, narratives: narratives.length, launchpads: launchpads.length, evidence: Object.keys(evidence).length, memberships: memberships.length },
    coinById,
  };
}

export type ReleaseContent = ReturnType<typeof buildReleaseContent>;
export { COMPONENT_IDS };
