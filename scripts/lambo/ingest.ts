/**
 * Ingest retained research runs into the observation store. Offline; never spends.
 *
 *   npm run lambo -- ingest            append runs newer than the last ingested run
 *   npm run lambo -- ingest --rebuild  drop the store and re-ingest every run in order
 *
 * Raw Frames bodies are normalized through the registered adapter of the capability that produced them
 * (docs/data/providers.json). Curated state (tokens, memberships, narratives, curation decisions) comes from
 * the normalized files the daily normalizer validated. Windowed observations are revision-preserving: a later
 * run that reports a different value for the same key adds a row that points at the value it revises; an
 * unchanged value adds nothing, so the first row's available_at is when the value was first known.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { adapterFor } from "../../src/lib/lambo/adapters/registry.ts";
import type { AdapterOutput } from "../../src/lib/lambo/adapters/types.ts";
import { type Capability, type Catalog, getCapability } from "../../src/lib/lambo/catalog/catalog.ts";
import { loadCatalog, loadRegistry } from "../../src/lib/lambo/catalog/load.ts";
import { parseTokenId, poolIdentity } from "../../src/lib/lambo/core/identity.ts";
import { METRICS, type MetricKey } from "../../src/lib/lambo/core/metrics.ts";
import { parseIso, parseRunId } from "../../src/lib/lambo/core/time.ts";
import { readJson, readJsonIfExists, resolveFromRoot, sha256File } from "../../src/lib/lambo/server/io.ts";
import { type Db, all, migrate, one, openDb, tx } from "../../src/lib/lambo/store/sqlite.ts";
import { PIPELINE_MIGRATIONS } from "../../src/lib/lambo/store/schema.ts";

export const INGEST_VERSION = "lambo-ingest-1.0.0";
export const TRANSFORM_VERSION = "lambo-adapters-1.0.0";
const RUN_ID = /^\d{8}T\d{6}Z$/;

export function pipelineDbPath(): string {
  return process.env.LAMBO_DB_PATH ?? resolveFromRoot("data/lambo.sqlite");
}

export function researchDir(): string {
  return process.env.LAMBO_RESEARCH_DIR ?? resolveFromRoot("research/lamble");
}

export function openPipelineDb(): Db {
  const db = openDb(pipelineDbPath());
  migrate(db, PIPELINE_MIGRATIONS);
  return db;
}

/** First commit time of each run's manifest: when the run became durable and public. */
export function gitAvailability(): Map<string, number> {
  const out = new Map<string, number>();
  try {
    const log = execFileSync("git", ["log", "--diff-filter=A", "--format=C %ct", "--name-only", "--", "research/lamble/*/refresh-manifest.json"], {
      cwd: resolveFromRoot(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    let ct = 0;
    for (const line of log.split("\n")) {
      if (line.startsWith("C ")) ct = Number(line.slice(2));
      else if (line.trim()) {
        const run = line.split("/")[2];
        if (run && RUN_ID.test(run) && (!out.has(run) || ct < out.get(run)!)) out.set(run, ct);
      }
    }
  } catch {
    // No git history (for example a tarball): availability falls back to run start, labelled as such.
  }
  return out;
}

interface Manifest {
  runId?: string;
  version?: string;
  runtimeStartedAt?: string;
  watermarks?: { financialExclusiveEnd?: string; narrativeExclusiveEnd?: string; activitySourceAsOf?: string } | null;
  costs?: { charged_credits?: number; run_ids?: Record<string, string> };
}

interface RawCall {
  seq: number;
  tool_id: string;
  delivered: boolean;
  outcome?: string;
  body?: unknown;
  body_ref?: unknown;
}

interface RunCtx {
  db: Db;
  catalog: Catalog;
  runId: string;
  runtime: number;
  available: number;
  latest: Map<string, { obsId: number; value: number }>;
  knownTokens: Set<string>;
  warnings: string[];
  stats: { observations: number; revisions: number; unchanged: number; calls: number; refused: number };
}

const isoOrNull = (v: string | null | undefined) => {
  if (!v) return null;
  try {
    return parseIso(v);
  } catch {
    return null;
  }
};

function kindOf(version: string | undefined): "daily-refresh" | "narrative-refresh" | "reference" {
  if (version?.startsWith("lamble-daily-refresh")) return "daily-refresh";
  if (version?.startsWith("lamble-narrative-refresh")) return "narrative-refresh";
  return "reference";
}

/** Which capability produced a call: tool id plus, for the shared Codex GraphQL tool, the operation in the query. */
export function capabilityFor(catalog: Catalog, toolId: string, args: Record<string, unknown>): Capability | null {
  const candidates = catalog.capabilities.filter((c) => c.toolId === toolId);
  if (candidates.length <= 1) return candidates[0] ?? null;
  const q = typeof args.query === "string" ? args.query : "";
  const key = q.includes("filterLaunchpads")
    ? "codex.launchpad-activity"
    : q.includes("getTokenBars")
      ? "codex.token-bars"
      : /filterTokens\(tokens:/.test(q)
        ? "codex.token-snapshot"
        : q.includes("filterTokens(")
          ? "codex.token-discovery"
          : /tokens\(ids:/.test(q)
            ? "codex.token-metadata"
            : null;
  return key ? getCapability(catalog, key) : null; // getBars (single-pool, before 2026-10-02) has no capability
}

function hasData(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (b.data !== null && typeof b.data === "object") || Array.isArray(b.tweets);
}

function seriesKey(entityType: string, entityId: string, metric: string, ws: number | null, we: number | null): string {
  return `${entityType}|${entityId}|${metric}|${ws ?? ""}|${we ?? ""}`;
}

function loadLatest(db: Db): Map<string, { obsId: number; value: number }> {
  const latest = new Map<string, { obsId: number; value: number }>();
  for (const r of all<{ obs_id: number; entity_type: string; entity_id: string; metric: string; window_start: number; window_end: number; value: number }>(
    db,
    "SELECT obs_id, entity_type, entity_id, metric, window_start, window_end, value FROM observations WHERE window_start IS NOT NULL ORDER BY obs_id",
  )) {
    latest.set(seriesKey(r.entity_type, r.entity_id, r.metric, r.window_start, r.window_end), { obsId: r.obs_id, value: r.value });
  }
  return latest;
}

function sameValue(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

function writeOutput(ctx: RunCtx, out: AdapterOutput, cap: Capability, evidenceId: string, fetchedAt: number, delivery: "delivered" | "refunded-validated"): void {
  const { db } = ctx;
  const insert = db.prepare(
    `INSERT INTO observations (entity_type, entity_id, metric, window_start, window_end, value, unit, event_time, observed_at, fetched_at, available_at,
      run_id, evidence_id, capability, extraction, transform_version, revision_of, population, delivery)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
  );
  for (const o of out.observations) {
    const windowed = o.windowStart !== null;
    const key = seriesKey(o.entityType, o.entityId, o.metric, o.windowStart, o.windowEnd);
    const prior = windowed ? ctx.latest.get(key) : undefined;
    if (prior && sameValue(prior.value, o.value)) {
      ctx.stats.unchanged++;
      continue;
    }
    const res = insert.run(
      o.entityType,
      o.entityId,
      o.metric,
      o.windowStart,
      o.windowEnd,
      o.value,
      METRICS[o.metric as MetricKey].unit,
      o.eventTime,
      o.eventTime ?? fetchedAt,
      fetchedAt,
      ctx.available,
      ctx.runId,
      evidenceId,
      cap.key,
      o.extraction,
      TRANSFORM_VERSION,
      prior?.obsId ?? null,
      o.population ?? null,
      delivery,
    );
    if (res.changes) {
      ctx.stats.observations++;
      if (prior) ctx.stats.revisions++;
      if (windowed) ctx.latest.set(key, { obsId: Number(res.lastInsertRowid), value: o.value });
    }
  }
  for (const p of out.posts) {
    db.prepare(
      `INSERT INTO posts (post_id, url, author, created_at, text, query, first_seen_run, first_available_at, evidence_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(post_id) DO NOTHING`,
    ).run(p.postId, p.url, p.author, p.createdAt, p.text, p.query, ctx.runId, ctx.available, evidenceId);
  }
  for (const t of out.tokens) {
    if (!ctx.knownTokens.has(t.tokenId)) continue; // candidates live in candidates.json; only tracked tokens get records
    if (t.pool) {
      const [chain, address] = [t.pool.poolId.slice(0, t.pool.poolId.indexOf(":")), t.pool.poolId.slice(t.pool.poolId.indexOf(":") + 1)];
      const kind = poolIdentity(chain!, address!).kind;
      db.prepare(
        `INSERT INTO pools (pool_id, token_id, chain, address, kind, pool_created_at, first_observed_at, first_observed_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(pool_id) DO UPDATE SET pool_created_at = COALESCE(pools.pool_created_at, excluded.pool_created_at)`,
      ).run(t.pool.poolId, t.tokenId, chain!, address!, kind, t.pool.createdAt, fetchedAt, ctx.runId);
    }
    if (t.createdAt !== undefined) {
      db.prepare("UPDATE tokens SET token_created_at = COALESCE(token_created_at, ?), token_created_basis = COALESCE(token_created_basis, 'codex-indexed') WHERE token_id = ?").run(t.createdAt, t.tokenId);
    }
  }
}

function ingestRawBatches(ctx: RunCtx, dir: string): void {
  const raw = path.join(dir, "raw");
  if (!existsSync(raw)) return;
  const batches = readdirSync(raw)
    .filter((f) => f.endsWith("-request.json"))
    .map((f) => f.slice(0, -"-request.json".length))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  type Planned = { batch: string; call: RawCall; req: { id: string; args: Record<string, unknown> }; frames: string; ref: string; sha: string };
  const planned: Planned[] = [];
  for (const batch of batches) {
    const respFile = path.join(raw, `${batch}.json`);
    if (!existsSync(respFile)) {
      ctx.warnings.push(`${batch}: request without a saved response`);
      continue;
    }
    const req = readJson<{ calls: { id: string; args: Record<string, unknown> }[] }>(path.join(raw, `${batch}-request.json`));
    const resp = readJson<{ run_id?: string; status?: string; result?: { calls?: RawCall[] } }>(respFile);
    if (resp.status !== "completed" || !Array.isArray(resp.result?.calls)) {
      ctx.warnings.push(`${batch}: not a completed Frames run body`);
      continue;
    }
    const sha = sha256File(respFile);
    for (const call of resp.result.calls) {
      const r = req.calls[call.seq];
      if (!r || r.id !== call.tool_id) {
        ctx.warnings.push(`${batch}:${call.seq}: response does not match its request`);
        continue;
      }
      planned.push({ batch, call, req: r, frames: resp.run_id ?? "", ref: `research/lamble/${ctx.runId}/raw/${batch}.json`, sha });
    }
  }
  // A refunded call superseded by a delivered retry of the same request in the same run is recorded but not used.
  const deliveredArgs = new Set(planned.filter((p) => p.call.delivered && hasData(p.call.body)).map((p) => `${p.req.id}|${JSON.stringify(p.req.args)}`));
  const callInsert = ctx.db.prepare(
    `INSERT OR REPLACE INTO frames_calls (run_id, batch, seq, frames_run_id, tool_id, capability, args_json, delivered, outcome, used, response_ref, response_sha256, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const evInsert = ctx.db.prepare(
    `INSERT OR REPLACE INTO evidence (evidence_id, kind, route, upstream, run_id, batch, seq, capability, url, title, author, source_event_time, fetched_at, available_at, response_ref, extraction_path, sha256, limitations_json)
     VALUES (?, 'frames-call', 'frames', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of planned) {
    ctx.stats.calls++;
    const cap = capabilityFor(ctx.catalog, p.req.id, p.req.args);
    const evidenceId = `frames-${ctx.runId}-${p.batch}-${p.call.seq}`;
    const queriedAt = isoOrNull((p.call.body as { queried_at?: string } | undefined)?.queried_at);
    const fetchedAt = queriedAt ?? ctx.runtime;
    const superseded = !p.call.delivered && deliveredArgs.has(`${p.req.id}|${JSON.stringify(p.req.args)}`);
    const usable = Boolean(cap && cap.adapter && hasData(p.call.body) && !superseded && p.call.body_ref === undefined);
    callInsert.run(ctx.runId, p.batch, p.call.seq, p.frames, p.req.id, cap?.key ?? null, JSON.stringify(p.req.args), p.call.delivered ? 1 : 0, p.call.outcome ?? null, usable ? 1 : 0, p.ref, p.sha, fetchedAt);
    evInsert.run(
      evidenceId,
      cap ? ctx.catalog.providers.find((x) => x.id === cap.provider)?.name ?? cap.provider : p.req.id,
      ctx.runId,
      p.batch,
      p.call.seq,
      cap?.key ?? null,
      fetchedAt,
      ctx.available,
      p.ref,
      `$.result.calls[${p.call.seq}].body`,
      p.sha,
      JSON.stringify(cap ? [cap.semantics.coverage] : ["No registered capability (legacy request shape)"]),
    );
    if (!usable || !cap) continue;
    const out = adapterFor(cap.adapter)!.normalize({ body: p.call.body, request: p.req, capability: cap, fetchedAt });
    if (out.refused) ctx.stats.refused++;
    for (const w of out.warnings.slice(0, 3)) ctx.warnings.push(`${p.batch}:${p.call.seq} ${w}`);
    writeOutput(ctx, out, cap, evidenceId, fetchedAt, p.call.delivered ? "delivered" : "refunded-validated");
  }
}

interface EvidenceRecord {
  id: string;
  route?: string;
  upstream?: string;
  tool?: string;
  url?: string;
  post_id?: string;
  source_event_time?: string | null;
  fetched_at?: string | null;
  response_ref?: string;
  extraction_path?: string;
  sha256?: string;
  run_id?: string | null;
  seq?: number | null;
  limitations?: string[];
}

function ingestEvidenceFile(ctx: RunCtx, dir: string): void {
  const records = readJsonIfExists<EvidenceRecord[]>(path.join(dir, "evidence.json")) ?? [];
  const ins = ctx.db.prepare(
    `INSERT INTO evidence (evidence_id, kind, route, upstream, run_id, batch, seq, capability, url, title, author, source_event_time, fetched_at, available_at, response_ref, extraction_path, sha256, limitations_json)
     VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(evidence_id) DO NOTHING`,
  );
  for (const e of records) {
    const kind = e.id.startsWith("x-") ? "x-post" : e.id.startsWith("frames-") ? "frames-call" : "legacy";
    const author = e.url?.match(/^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})\/status\//)?.[1] ?? null;
    ins.run(
      e.id,
      kind,
      e.route ?? "frames",
      e.upstream ?? e.tool ?? null,
      e.run_id && RUN_ID.test(e.run_id) ? e.run_id : ctx.runId,
      e.seq ?? null,
      e.url ?? null,
      author,
      isoOrNull(e.source_event_time),
      isoOrNull(e.fetched_at),
      ctx.available,
      e.response_ref ? `research/lamble/${ctx.runId}/${e.response_ref}` : null,
      e.extraction_path ?? null,
      e.sha256 ?? null,
      JSON.stringify(e.limitations ?? []),
    );
  }
}

interface NarrativeFile {
  id: string;
  slug: string;
  title: string;
  category?: string;
  summary?: string;
  signals?: { id: string; title: string; label?: string; at?: string }[];
  _meta?: { presentationSummary?: string; storyStatus?: unknown; provenanceSources?: unknown; volumeScope?: string };
}

function ingestNarratives(ctx: RunCtx, dir: string): void {
  const list = readJsonIfExists<NarrativeFile[]>(path.join(dir, "narratives.json"));
  if (!Array.isArray(list)) return;
  list.forEach((n, rank) => {
    ctx.db
      .prepare(`INSERT INTO narratives (narrative_id, slug, title, category, first_observed_at, first_observed_run) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(narrative_id) DO UPDATE SET title = excluded.title, category = COALESCE(excluded.category, narratives.category)`)
      .run(n.id, n.slug, n.title, n.category ?? null, ctx.runtime, ctx.runId);
    ctx.db
      .prepare(
        `INSERT OR REPLACE INTO narrative_versions (narrative_id, run_id, available_at, title, summary, story_status_json, provenance_json, signals_json, volume_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        n.id,
        ctx.runId,
        ctx.available,
        n.title,
        n._meta?.presentationSummary ?? n.summary ?? null,
        n._meta?.storyStatus ? JSON.stringify(n._meta.storyStatus) : null,
        n._meta?.provenanceSources ? JSON.stringify(n._meta.provenanceSources) : null,
        JSON.stringify((n.signals ?? []).map((s) => ({ id: s.id, title: s.title, label: s.label ?? null, at: s.at ?? null }))),
        n._meta?.volumeScope ?? null,
      );
    ctx.db.prepare("INSERT OR REPLACE INTO featured (run_id, narrative_id, rank) VALUES (?, ?, ?)").run(ctx.runId, n.id, rank + 1);
  });
}

function ingestCuration(ctx: RunCtx, dir: string): void {
  const c = readJsonIfExists<Record<string, unknown>>(path.join(dir, "curation.json"));
  if (!c) return;
  const ins = ctx.db.prepare("INSERT OR REPLACE INTO curation_decisions (run_id, kind, subject_id, decision, narrative_id, reason, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const put = (kind: string, subject: string, decision: string, narrative: string | null, reason: string | null) => ins.run(ctx.runId, kind, subject, decision, narrative, reason, ctx.available);
  for (const [id, d] of Object.entries((c.clusterDecisions ?? {}) as Record<string, { decision: string; narrativeId?: string; reason?: string }>)) put("cluster", id, d.decision, d.narrativeId ?? null, d.reason ?? null);
  for (const [id, d] of Object.entries((c.newMembers ?? {}) as Record<string, { rationale?: string }>)) put("new_member", id, "accepted", null, d.rationale ?? null);
  for (const [id, d] of Object.entries((c.removedMembers ?? {}) as Record<string, { reason?: string }>)) put("archived_member", id, "inactive", null, d.reason ?? null);
  for (const [id, d] of Object.entries((c.retiredNarratives ?? {}) as Record<string, { reason?: string }>)) put("narrative_collection", id, "paused", id, d.reason ?? null);
  for (const [id, d] of Object.entries((c.pausedNarratives ?? {}) as Record<string, { reason?: string }>)) put("narrative_collection", id, "paused", id, d.reason ?? null);
  for (const [id, d] of Object.entries((c.newNarratives ?? {}) as Record<string, { title?: string; summary?: string }>)) put("new_narrative", id, "created", id, d.summary ?? d.title ?? null);
  for (const cand of (c.candidates ?? []) as { tokenId?: string; address?: string; status?: string; reason?: string }[]) {
    const subject = cand.tokenId ?? cand.address;
    if (subject) put("candidate", subject, cand.status ?? "reviewed", null, cand.reason ?? null);
  }
}

function ingestFeePolicy(ctx: RunCtx, dir: string): void {
  const lm = readJsonIfExists<{ fees?: { includedSlugs?: string[]; excluded?: Record<string, string>; scope?: string } }>(path.join(dir, "landing-metrics.json"));
  if (!lm?.fees?.includedSlugs) return;
  ctx.db
    .prepare("INSERT OR REPLACE INTO fee_policy (run_id, included_json, excluded_json, scope) VALUES (?, ?, ?, ?)")
    .run(ctx.runId, JSON.stringify(lm.fees.includedSlugs), JSON.stringify(lm.fees.excluded ?? {}), lm.fees.scope ?? "");
}

function ingestVenues(ctx: RunCtx, dir: string): void {
  const rows = readJsonIfExists<({ slug: string; name: string; metrics?: unknown; _meta?: unknown } & Record<string, unknown>)[]>(path.join(dir, "launchpads.json"));
  if (!Array.isArray(rows) || rows.length !== 19) return;
  const registry = loadRegistry();
  for (const row of rows) {
    const venue = registry.venues.find((v) => v.slug === row.slug);
    if (!venue) continue;
    const { metrics: _metrics, _meta, ...presentation } = row;
    void _metrics;
    ctx.db
      .prepare(
        `INSERT INTO venues (slug, name, provider_slug, indexed_provider_ids_json, latest_run, presentation_json) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET name = excluded.name, provider_slug = excluded.provider_slug, indexed_provider_ids_json = excluded.indexed_provider_ids_json, latest_run = excluded.latest_run, presentation_json = excluded.presentation_json`,
      )
      .run(row.slug, row.name, venue.providerSlug, JSON.stringify(venue.indexedProviderIds ?? []), ctx.runId, JSON.stringify({ ...presentation, methodology: (_meta as { methodology?: unknown })?.methodology ?? null }));
  }
}

interface TokenFile {
  id: string;
  chain: string;
  address: string;
  name?: string;
  symbol?: string;
  originLaunchpadSlug?: string;
  originStatus?: string;
  evidenceIds?: string[];
  firstObservedAt: string;
  tokenCreatedAt?: number | null;
  pool?: string;
}

interface MembershipFile {
  id: string;
  narrativeId: string;
  tokenId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  firstObservedAt?: string;
  historicalMembershipBasis?: string;
  rationale?: string;
  evidenceIds?: string[];
  confidence?: string;
  methodVersion?: string;
  closedReason?: string;
  collectionStatus?: "collected" | "paused" | "inactive";
  collectionChangedAt?: string;
  collectionReason?: string;
}

/** Run whose start is the latest at or before t: the run that recorded an event stamped t. */
function runAt(runs: { run_id: string; runtime_at: number; available_at: number }[], t: number) {
  let best = runs[0]!;
  for (const r of runs) if (r.runtime_at <= t + 1) best = r;
  return best;
}

/** Classifies a recorded closure. Only evidence that contradicts membership ends it. */
export function classifyClosure(reason: string): { kind: "factual_exit" | "collection_paused" | "inactive"; endsMembership: boolean } {
  if (/cap|narrative retired|retired narrative|leaves with the retired/i.test(reason)) return { kind: "collection_paused", endsMembership: false };
  if (/\$1,000|below .*volume|under .*volume|removeMember|inactive/i.test(reason)) return { kind: "inactive", endsMembership: false };
  return { kind: "factual_exit", endsMembership: true };
}

function rebuildCurated(db: Db, latestRun: string): void {
  const dir = path.join(researchDir(), latestRun);
  const runs = all<{ run_id: string; runtime_at: number; available_at: number }>(db, "SELECT run_id, runtime_at, available_at FROM runs ORDER BY runtime_at");
  const tokens = readJson<TokenFile[]>(path.join(dir, "tokens.json"));
  const memberships = readJson<MembershipFile[]>(path.join(dir, "memberships.json"));
  for (const t of tokens) {
    const id = parseTokenId(t.id);
    const first = isoOrNull(t.firstObservedAt) ?? runs[0]!.runtime_at;
    const run = runAt(runs, first);
    db.prepare(
      `INSERT INTO tokens (token_id, chain, address, display_address, name, symbol, origin_venue, origin_status, token_created_at, token_created_basis, first_observed_at, first_observed_run, first_available_at, evidence_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(token_id) DO UPDATE SET name = excluded.name, symbol = excluded.symbol, origin_venue = excluded.origin_venue, origin_status = excluded.origin_status,
         token_created_at = COALESCE(excluded.token_created_at, tokens.token_created_at), first_observed_at = excluded.first_observed_at,
         first_observed_run = excluded.first_observed_run, first_available_at = excluded.first_available_at, evidence_ids_json = excluded.evidence_ids_json`,
    ).run(
      id.id,
      id.chain,
      id.address,
      t.address,
      t.name ?? null,
      t.symbol ?? null,
      t.originLaunchpadSlug ?? null,
      t.originStatus ?? null,
      t.tokenCreatedAt ?? null,
      t.tokenCreatedAt ? "codex-indexed" : null,
      first,
      run.run_id,
      run.available_at,
      JSON.stringify(t.evidenceIds ?? []),
    );
    if (t.name && t.symbol) db.prepare("INSERT OR IGNORE INTO token_names (token_id, name, symbol, first_seen_run) VALUES (?, ?, ?, ?)").run(id.id, t.name, t.symbol, run.run_id);
    if (t.pool) {
      const pool = poolIdentity(id.chain, t.pool);
      db.prepare(`INSERT INTO pools (pool_id, token_id, chain, address, kind, pool_created_at, first_observed_at, first_observed_run) VALUES (?, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(pool_id) DO NOTHING`).run(
        pool.id,
        id.id,
        id.chain,
        pool.pool,
        pool.kind,
        first,
        run.run_id,
      );
    }
  }
  db.exec("DELETE FROM memberships");
  const seen = new Set<string>();
  for (const m of memberships) {
    const from = isoOrNull(m.effectiveFrom)!;
    // Interval ids are unique per (narrative, token, start), so a coin that leaves and rejoins gets a new interval.
    const intervalId = `${m.narrativeId}:${m.tokenId}@${from}`;
    if (seen.has(intervalId)) throw new Error(`duplicate membership interval ${intervalId}`);
    seen.add(intervalId);
    // Legacy runs closed intervals for cap replacements and inactivity; newer runs keep them open with a collection status.
    const pausedAt = m.effectiveTo === null && (m.collectionStatus === "paused" || m.collectionStatus === "inactive") ? isoOrNull(m.collectionChangedAt) : null;
    const closedAt = isoOrNull(m.effectiveTo) ?? pausedAt;
    const closure =
      pausedAt !== null
        ? { kind: m.collectionStatus === "paused" ? ("collection_paused" as const) : ("inactive" as const), endsMembership: false }
        : closedAt !== null
          ? classifyClosure(m.closedReason ?? "")
          : null;
    db.prepare(
      `INSERT INTO memberships (interval_id, source_id, narrative_id, token_id, effective_from, recorded_at, effective_to, close_recorded_at, close_kind, close_reason, observed_through, basis, rationale, evidence_ids_json, confidence, method_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      intervalId,
      m.id,
      m.narrativeId,
      parseTokenId(m.tokenId).id,
      from,
      runAt(runs, from).available_at,
      closure?.endsMembership ? closedAt : null,
      closedAt !== null ? runAt(runs, closedAt).available_at : null,
      closure?.kind ?? null,
      m.closedReason ?? m.collectionReason ?? null,
      closedAt,
      m.historicalMembershipBasis ?? "recorded",
      m.rationale ?? null,
      JSON.stringify(m.evidenceIds ?? []),
      m.confidence ?? null,
      m.methodVersion ?? null,
    );
  }
  // Lifecycle from the per-run collected sets: a narrative is collected while runs feature it; when a run drops it,
  // collection is paused (every historical drop was a cap replacement), never retired without a recorded reason.
  db.exec("DELETE FROM narrative_lifecycle");
  const narratives = all<{ narrative_id: string }>(db, "SELECT narrative_id FROM narratives");
  const reasons = new Map<string, { at: number; reason: string }>();
  const candidates = readJsonIfExists<{
    retiredNarratives?: { narrativeId: string; retiredAt: string; reason: string }[];
    pausedNarratives?: { narrativeId: string; pausedAt: string; reason: string }[];
  }>(path.join(dir, "candidates.json"));
  for (const r of candidates?.retiredNarratives ?? []) reasons.set(r.narrativeId, { at: isoOrNull(r.retiredAt)!, reason: r.reason });
  for (const r of candidates?.pausedNarratives ?? []) reasons.set(r.narrativeId, { at: isoOrNull(r.pausedAt)!, reason: r.reason });
  const runsWithNarratives = all<{ run_id: string; runtime_at: number; available_at: number }>(
    db,
    "SELECT DISTINCT r.run_id, r.runtime_at, r.available_at FROM runs r JOIN featured f ON f.run_id = r.run_id ORDER BY r.runtime_at",
  );
  for (const { narrative_id } of narratives) {
    const present = new Set(all<{ run_id: string }>(db, "SELECT run_id FROM featured WHERE narrative_id = ?", narrative_id).map((r) => r.run_id));
    let open: { from: number; recorded: number } | null = null;
    const put = (state: string, from: number, to: number | null, recorded: number, reason: string | null, source: string) =>
      db.prepare("INSERT OR REPLACE INTO narrative_lifecycle (narrative_id, state, from_at, to_at, recorded_at, reason, source) VALUES (?, ?, ?, ?, ?, ?, ?)").run(narrative_id, state, from, to, recorded, reason, source);
    for (const r of runsWithNarratives) {
      if (present.has(r.run_id) && !open) open = { from: r.runtime_at, recorded: r.available_at };
      else if (!present.has(r.run_id) && open) {
        put("collected", open.from, r.runtime_at, open.recorded, null, "featured runs");
        const why = reasons.get(narrative_id);
        put(
          "collection_paused",
          r.runtime_at,
          null,
          r.available_at,
          why ? `Collection paused: ${why.reason}` : "No longer collected by the daily run; no retirement evidence recorded.",
          why ? "candidates.json retiredNarratives (cap replacement)" : "featured runs",
        );
        open = null;
      }
    }
    if (open) put("collected", open.from, null, open.recorded, null, "featured runs");
  }
}

export interface IngestResult {
  ingested: string[];
  skipped: string[];
  failed: { run: string; error: string }[];
}

export function ingest(options: { rebuild?: boolean; only?: string } = {}): IngestResult {
  if (options.rebuild) for (const suffix of ["", "-wal", "-shm"]) rmSync(`${pipelineDbPath()}${suffix}`, { force: true });
  const db = openPipelineDb();
  const catalog = loadCatalog(true);
  const availability = gitAvailability();
  const runIds = readdirSync(researchDir())
    .filter((d) => RUN_ID.test(d) && existsSync(path.join(researchDir(), d, "refresh-manifest.json")))
    .sort();
  const result: IngestResult = { ingested: [], skipped: [], failed: [] };
  const lastDone = one<{ run_id: string }>(db, "SELECT run_id FROM runs ORDER BY run_id DESC LIMIT 1")?.run_id ?? null;
  // Tracked tokens come from the latest daily run's cumulative tokens.json; they must exist before observations reference pools.
  const dailyRuns = runIds.filter((r) => kindOf(readJson<Manifest>(path.join(researchDir(), r, "refresh-manifest.json")).version) === "daily-refresh");
  const latestDaily = dailyRuns.at(-1);
  if (!latestDaily) throw new Error("no daily refresh run to ingest");
  const knownTokens = new Set(readJson<TokenFile[]>(path.join(researchDir(), latestDaily, "tokens.json")).map((t) => parseTokenId(t.id).id));
  // Token rows must exist for pool foreign keys; rebuildCurated fills them fully at the end.
  tx(db, () => {
    for (const t of readJson<TokenFile[]>(path.join(researchDir(), latestDaily, "tokens.json"))) {
      const id = parseTokenId(t.id);
      db.prepare(
        `INSERT INTO tokens (token_id, chain, address, display_address, first_observed_at, first_observed_run, first_available_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(token_id) DO NOTHING`,
      ).run(id.id, id.chain, id.address, t.address, isoOrNull(t.firstObservedAt) ?? 0, latestDaily, 0);
    }
  });
  const latest = loadLatest(db);
  for (const runId of runIds) {
    if (options.only && runId !== options.only) continue;
    const dir = path.join(researchDir(), runId);
    const manifestFile = path.join(dir, "refresh-manifest.json");
    const manifestSha = sha256File(manifestFile);
    const existing = one<{ manifest_sha256: string; ingest_version: string }>(db, "SELECT manifest_sha256, ingest_version FROM runs WHERE run_id = ?", runId);
    if (existing) {
      if (existing.manifest_sha256 === manifestSha && existing.ingest_version === INGEST_VERSION) {
        result.skipped.push(runId);
        continue;
      }
      result.failed.push({ run: runId, error: "already ingested with a different manifest or ingest version; run with --rebuild" });
      continue;
    }
    if (lastDone && runId < lastDone) {
      result.failed.push({ run: runId, error: `older than the last ingested run ${lastDone}; revisions must be applied in order: run with --rebuild` });
      continue;
    }
    const manifest = readJson<Manifest>(manifestFile);
    const validation = readJsonIfExists<{ passed?: boolean }>(path.join(dir, "validation-report.json"));
    const runtime = parseRunId(runId);
    const committed = availability.get(runId);
    const ctx: RunCtx = {
      db,
      catalog,
      runId,
      runtime,
      available: committed ?? runtime,
      latest,
      knownTokens,
      warnings: [],
      stats: { observations: 0, revisions: 0, unchanged: 0, calls: 0, refused: 0 },
    };
    const kind = kindOf(manifest.version);
    try {
      tx(db, () => {
        db.prepare(
          `INSERT INTO runs (run_id, version, kind, runtime_at, available_at, available_basis, financial_anchor, chart_anchor, activity_as_of, passed, credits_charged, frames_runs_json, manifest_sha256, ingested_at, ingest_version, warnings_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        ).run(
          runId,
          manifest.version ?? null,
          kind,
          runtime,
          ctx.available,
          committed ? "git-commit" : "runtime",
          isoOrNull(manifest.watermarks?.financialExclusiveEnd),
          isoOrNull(manifest.watermarks?.narrativeExclusiveEnd),
          isoOrNull(manifest.watermarks?.activitySourceAsOf),
          validation?.passed === undefined ? null : validation.passed ? 1 : 0,
          manifest.costs?.charged_credits ?? null,
          manifest.costs?.run_ids ? JSON.stringify(manifest.costs.run_ids) : null,
          manifestSha,
          Math.floor(Date.now() / 1000),
          INGEST_VERSION,
        );
        if (kind === "daily-refresh" && validation?.passed) ingestRawBatches(ctx, dir);
        ingestEvidenceFile(ctx, dir);
        ingestNarratives(ctx, dir);
        ingestCuration(ctx, dir);
        ingestFeePolicy(ctx, dir);
        ingestVenues(ctx, dir);
        db.prepare("UPDATE runs SET warnings_json = ? WHERE run_id = ?").run(JSON.stringify({ stats: ctx.stats, warnings: ctx.warnings.slice(0, 200) }), runId);
      });
      result.ingested.push(runId);
      console.log(`${runId} ${kind}: ${ctx.stats.calls} calls, +${ctx.stats.observations} observations (${ctx.stats.revisions} revisions, ${ctx.stats.unchanged} unchanged), ${ctx.warnings.length} warnings`);
    } catch (error) {
      // The run's transaction rolled back; in-memory series state may include its rows, so stop rather than continue inconsistently.
      result.failed.push({ run: runId, error: error instanceof Error ? error.message : String(error) });
      break;
    }
  }
  if (result.ingested.length || options.rebuild) tx(db, () => rebuildCurated(db, latestDaily));
  db.close();
  return result;
}

export function main(argv: string[]): number {
  const rebuild = argv.includes("--rebuild");
  const i = argv.indexOf("--run");
  const res = ingest({ rebuild, only: i >= 0 ? argv[i + 1] : undefined });
  console.log(JSON.stringify({ ingested: res.ingested.length, skipped: res.skipped.length, failed: res.failed }, null, 1));
  return res.failed.length ? 1 : 0;
}
