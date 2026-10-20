/**
 * Read access to the observation store. Every read takes an availability cutoff: only rows whose
 * available_at <= cutoff are visible, and for windowed series the latest revision visible at the cutoff wins.
 */
import type { Db } from "../../../src/lib/lamble/store/sqlite.ts";
import { all, one } from "../../../src/lib/lamble/store/sqlite.ts";

export interface RunRow {
  run_id: string;
  kind: string;
  runtime_at: number;
  available_at: number;
  financial_anchor: number | null;
  chart_anchor: number | null;
  activity_as_of: number | null;
  passed: number | null;
  credits_charged: number | null;
}

export interface WindowValue {
  windowStart: number;
  windowEnd: number;
  value: number;
  obsId: number;
  availableAt: number;
  fetchedAt: number;
  runId: string;
  evidenceId: string;
  revisionOf: number | null;
}

export interface TokenRow {
  token_id: string;
  chain: string;
  address: string;
  display_address: string;
  name: string | null;
  symbol: string | null;
  origin_venue: string | null;
  origin_status: string | null;
  token_created_at: number | null;
  token_created_basis: string | null;
  first_observed_at: number;
  first_observed_run: string;
  first_available_at: number;
  evidence_ids_json: string | null;
}

export interface MembershipRowDb {
  interval_id: string;
  source_id: string;
  narrative_id: string;
  token_id: string;
  effective_from: number;
  recorded_at: number;
  effective_to: number | null;
  close_recorded_at: number | null;
  close_kind: "factual_exit" | "collection_paused" | "inactive" | null;
  close_reason: string | null;
  observed_through: number | null;
  basis: string;
  rationale: string | null;
  evidence_ids_json: string | null;
}

export class Store {
  readonly db: Db;
  private cache = new Map<string, unknown>();

  constructor(db: Db) {
    this.db = db;
  }

  private memo<T>(key: string, fn: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, fn());
    return this.cache.get(key) as T;
  }

  runs(cutoff: number): RunRow[] {
    return this.memo(`runs|${cutoff}`, () =>
      all<RunRow>(
        this.db,
        "SELECT run_id, kind, runtime_at, available_at, financial_anchor, chart_anchor, activity_as_of, passed, credits_charged FROM runs WHERE available_at <= ? ORDER BY runtime_at",
        cutoff,
      ),
    );
  }

  dailyRuns(cutoff: number): RunRow[] {
    return this.runs(cutoff).filter((r) => r.kind === "daily-refresh" && r.passed === 1);
  }

  /** Latest visible revision per window, for windows of exactly `step` seconds. */
  windows(entityType: string, entityId: string, metric: string, step: number, cutoff: number, from = -Infinity, to = Infinity): Map<number, WindowValue> {
    const rows = all<{ window_start: number; window_end: number; value: number; obs_id: number; available_at: number; fetched_at: number; run_id: string; evidence_id: string; revision_of: number | null }>(
      this.db,
      `SELECT window_start, window_end, value, obs_id, available_at, fetched_at, run_id, evidence_id, revision_of FROM observations
       WHERE entity_type = ? AND entity_id = ? AND metric = ? AND window_start IS NOT NULL AND window_end - window_start = ? AND available_at <= ?
       ORDER BY window_start, available_at, obs_id`,
      entityType,
      entityId,
      metric,
      step,
      cutoff,
    );
    const out = new Map<number, WindowValue>();
    for (const r of rows) {
      if (r.window_start < from || r.window_start >= to) continue;
      out.set(r.window_start, {
        windowStart: r.window_start,
        windowEnd: r.window_end,
        value: r.value,
        obsId: r.obs_id,
        availableAt: r.available_at,
        fetchedAt: r.fetched_at,
        runId: r.run_id,
        evidenceId: r.evidence_id,
        revisionOf: r.revision_of,
      });
    }
    return out;
  }

  /** Instant observations (snapshots) visible at the cutoff, in observation order. */
  snapshots(entityType: string, entityId: string, metric: string, cutoff: number) {
    return all<{ observed_at: number; value: number; run_id: string; evidence_id: string; available_at: number; fetched_at: number }>(
      this.db,
      `SELECT observed_at, value, run_id, evidence_id, available_at, fetched_at FROM observations
       WHERE entity_type = ? AND entity_id = ? AND metric = ? AND window_start IS NULL AND available_at <= ? ORDER BY observed_at, obs_id`,
      entityType,
      entityId,
      metric,
      cutoff,
    );
  }

  tokens(cutoff: number): TokenRow[] {
    return this.memo(`tokens|${cutoff}`, () => all<TokenRow>(this.db, "SELECT * FROM tokens WHERE first_available_at <= ? ORDER BY token_id", cutoff));
  }

  tokenNames(tokenId: string): { name: string; symbol: string }[] {
    return all(this.db, "SELECT name, symbol FROM token_names WHERE token_id = ? ORDER BY first_seen_run", tokenId);
  }

  pools(tokenId: string) {
    return all<{ pool_id: string; address: string; kind: string; pool_created_at: number | null }>(this.db, "SELECT pool_id, address, kind, pool_created_at FROM pools WHERE token_id = ? ORDER BY first_observed_at", tokenId);
  }

  /** Memberships recorded by the cutoff; closures recorded after it are not yet visible. */
  memberships(cutoff: number): MembershipRowDb[] {
    return this.memo(`memberships|${cutoff}`, () =>
      all<MembershipRowDb>(this.db, "SELECT * FROM memberships WHERE recorded_at <= ? ORDER BY effective_from, interval_id", cutoff).map((m) =>
        m.close_recorded_at !== null && m.close_recorded_at > cutoff ? { ...m, effective_to: null, close_kind: null, close_reason: null, observed_through: null, close_recorded_at: null } : m,
      ),
    );
  }

  narratives(cutoff: number) {
    return all<{ narrative_id: string; slug: string; title: string; category: string | null; first_observed_at: number; first_observed_run: string }>(
      this.db,
      "SELECT n.* FROM narratives n WHERE EXISTS (SELECT 1 FROM narrative_versions v WHERE v.narrative_id = n.narrative_id AND v.available_at <= ?) ORDER BY first_observed_at",
      cutoff,
    );
  }

  narrativeVersion(narrativeId: string, cutoff: number) {
    return one<{ run_id: string; available_at: number; title: string; summary: string | null; story_status_json: string | null; provenance_json: string | null; signals_json: string | null; volume_scope: string | null }>(
      this.db,
      "SELECT * FROM narrative_versions WHERE narrative_id = ? AND available_at <= ? ORDER BY available_at DESC LIMIT 1",
      narrativeId,
      cutoff,
    );
  }

  lifecycle(narrativeId: string, cutoff: number) {
    return all<{ state: "collected" | "collection_paused" | "retired"; from_at: number; to_at: number | null; recorded_at: number; reason: string | null }>(
      this.db,
      "SELECT state, from_at, to_at, recorded_at, reason FROM narrative_lifecycle WHERE narrative_id = ? AND recorded_at <= ? ORDER BY from_at",
      narrativeId,
      cutoff,
    ).map((l) => (l.to_at !== null && l.to_at > cutoff ? { ...l, to_at: null } : l));
  }

  featured(runId: string) {
    return all<{ narrative_id: string; rank: number }>(this.db, "SELECT narrative_id, rank FROM featured WHERE run_id = ? ORDER BY rank", runId);
  }

  evidence(ids: string[]) {
    if (!ids.length) return [];
    const marks = ids.map(() => "?").join(",");
    return all<{ evidence_id: string; kind: string; route: string; upstream: string | null; url: string | null; author: string | null; source_event_time: number | null; fetched_at: number | null; run_id: string | null; batch: string | null; seq: number | null; capability: string | null; response_ref: string | null; sha256: string | null; extraction_path: string | null; limitations_json: string | null }>(
      this.db,
      `SELECT * FROM evidence WHERE evidence_id IN (${marks})`,
      ...ids,
    );
  }

  post(postId: string) {
    return one<{ post_id: string; url: string; author: string; created_at: number | null }>(this.db, "SELECT post_id, url, author, created_at FROM posts WHERE post_id = ?", postId);
  }

  venues() {
    return all<{ slug: string; name: string; provider_slug: string; indexed_provider_ids_json: string; presentation_json: string }>(this.db, "SELECT * FROM venues ORDER BY slug");
  }

  feePolicy(cutoff: number) {
    return one<{ run_id: string; included_json: string; excluded_json: string; scope: string }>(
      this.db,
      "SELECT f.* FROM fee_policy f JOIN runs r ON r.run_id = f.run_id WHERE r.available_at <= ? ORDER BY r.runtime_at DESC LIMIT 1",
      cutoff,
    );
  }

  feePolicyAt(runtimeAtOrBefore: number) {
    return one<{ run_id: string; included_json: string; excluded_json: string; scope: string }>(
      this.db,
      "SELECT f.* FROM fee_policy f JOIN runs r ON r.run_id = f.run_id WHERE r.runtime_at <= ? ORDER BY r.runtime_at DESC LIMIT 1",
      runtimeAtOrBefore,
    );
  }

  /** Indexed rows: latest visible observation per (row, metric) at or before `at`. */
  indexRows(cutoff: number, at = Infinity) {
    return all<{ entity_id: string; metric: string; value: number; event_time: number; evidence_id: string }>(
      this.db,
      `SELECT o.entity_id, o.metric, o.value, o.event_time, o.evidence_id FROM observations o
       WHERE o.entity_type = 'index_row' AND o.available_at <= ? AND o.event_time <= ?
         AND o.obs_id = (SELECT p.obs_id FROM observations p WHERE p.entity_type = 'index_row' AND p.entity_id = o.entity_id AND p.metric = o.metric
                         AND p.available_at <= ? AND p.event_time <= ? ORDER BY p.event_time DESC, p.obs_id DESC LIMIT 1)`,
      cutoff,
      Number.isFinite(at) ? at : 2 ** 52,
      cutoff,
      Number.isFinite(at) ? at : 2 ** 52,
    );
  }

  indexHistory(rowIds: string[], cutoff: number) {
    if (!rowIds.length) return [];
    const marks = rowIds.map(() => "?").join(",");
    return all<{ entity_id: string; value: number; event_time: number }>(
      this.db,
      `SELECT entity_id, value, event_time FROM observations WHERE entity_type = 'index_row' AND metric = 'index.created_rolling24h' AND entity_id IN (${marks}) AND available_at <= ? ORDER BY event_time`,
      ...rowIds,
      cutoff,
    );
  }

  // ---------------------------------------------------------------- holder and bottoming inputs (as known at the cutoff)

  holderPanels(tokenId: string, cutoff: number): HolderPanelRow[] {
    const panels = all<Omit<HolderPanelRow, "rows">>(
      this.db,
      "SELECT panel_id, capability, population, complete, observed_at, available_at, evidence_id, row_count FROM holder_panels WHERE token_id = ? AND available_at <= ? ORDER BY observed_at, panel_id",
      tokenId,
      cutoff,
    );
    return panels.map((p) => ({
      ...p,
      rows: all<HolderPanelRow["rows"][number]>(this.db, "SELECT wallet, amount, value_usd, cost_basis_usd FROM balance_checkpoints WHERE panel_id = ? ORDER BY wallet", p.panel_id),
    }));
  }

  trades(tokenId: string, cutoff: number): TradeRow[] {
    return all<TradeRow>(
      this.db,
      `SELECT capability, source_id, event_time, side, usd, amount, wallet, population, available_at, evidence_id FROM token_events
       WHERE token_id = ? AND class = 'trade' AND event_time IS NOT NULL AND available_at <= ? ORDER BY event_time, capability, source_id`,
      tokenId,
      cutoff,
    );
  }

  tradeCoverage(tokenId: string, cutoff: number) {
    return all<{ capability: string; from_time: number; to_time: number; available_at: number }>(
      this.db,
      "SELECT capability, from_time, to_time, available_at FROM trade_coverage WHERE token_id = ? AND available_at <= ? ORDER BY from_time",
      tokenId,
      cutoff,
    );
  }

  /** Latest visible copy of each candle (a later run may revise an interval that was still open). */
  candles(tokenId: string, cutoff: number): CandleRow[] {
    const rows = all<CandleRow & { run_id: string }>(
      this.db,
      `SELECT capability, resolution_seconds, start, high, low, close, volume_usd, available_at, evidence_id, run_id FROM candles
       WHERE token_id = ? AND available_at <= ? ORDER BY capability, resolution_seconds, start, available_at, run_id`,
      tokenId,
      cutoff,
    );
    const latest = new Map<string, CandleRow>();
    for (const r of rows) latest.set(`${r.capability}|${r.resolution_seconds}|${r.start}`, r);
    return [...latest.values()];
  }

  /** Restated windowed values that became available in (after, upTo], per entity and metric. */
  revisionsBetween(after: number, upTo: number) {
    return all<{ entity_type: string; entity_id: string; metric: string; n: number; first_window: number | null; last_window: number | null }>(
      this.db,
      `SELECT entity_type, entity_id, metric, count(*) n, min(window_start) first_window, max(window_start) last_window FROM observations
       WHERE revision_of IS NOT NULL AND available_at > ? AND available_at <= ? GROUP BY entity_type, entity_id, metric ORDER BY entity_type, entity_id, metric`,
      after,
      upTo,
    );
  }

  /** Latest source time per capability for anything stored about a token (observations, events, panels, candles). */
  capabilityActivity(tokenId: string, cutoff: number): Map<string, { latest: number; rows: number }> {
    const rows = all<{ capability: string; latest: number; n: number }>(
      this.db,
      `SELECT capability, max(t) latest, sum(n) n FROM (
         SELECT capability, max(observed_at) t, count(*) n FROM observations WHERE entity_type = 'token' AND entity_id = ? AND available_at <= ? GROUP BY capability
         UNION ALL SELECT capability, max(coalesce(event_time, available_at)), count(*) FROM token_events WHERE token_id = ? AND available_at <= ? GROUP BY capability
         UNION ALL SELECT capability, max(observed_at), count(*) FROM holder_panels WHERE token_id = ? AND available_at <= ? GROUP BY capability
         UNION ALL SELECT capability, max(start), count(*) FROM candles WHERE token_id = ? AND available_at <= ? GROUP BY capability
       ) GROUP BY capability`,
      tokenId,
      cutoff,
      tokenId,
      cutoff,
      tokenId,
      cutoff,
      tokenId,
      cutoff,
    );
    return new Map(rows.filter((r) => r.capability !== null).map((r) => [r.capability, { latest: r.latest, rows: r.n }]));
  }

  addressLabels(chain: string, cutoff: number) {
    return all<{ address: string; class: string; verified: number; source: string }>(
      this.db,
      "SELECT address, class, verified, source FROM address_labels WHERE chain = ? AND available_at <= ? ORDER BY address, class",
      chain,
      cutoff,
    );
  }
}

export interface HolderPanelRow {
  panel_id: string;
  capability: string;
  population: string;
  complete: number;
  observed_at: number;
  available_at: number;
  evidence_id: string;
  row_count: number;
  rows: { wallet: string; amount: number | null; value_usd: number | null; cost_basis_usd: number | null }[];
}

export interface TradeRow {
  capability: string;
  source_id: string;
  event_time: number;
  side: "buy" | "sell" | null;
  usd: number | null;
  amount: number | null;
  wallet: string | null;
  population: string;
  available_at: number;
  evidence_id: string;
}

export interface CandleRow {
  capability: string;
  resolution_seconds: number;
  start: number;
  high: number | null;
  low: number | null;
  close: number | null;
  volume_usd: number | null;
  available_at: number;
  evidence_id: string;
}
