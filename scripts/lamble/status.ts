/**
 * Operator status: store, release freshness and coverage, editions, schedules, actual billed Frames credits,
 * collection reservations, publish failures, delivery outcomes and seller receipts. Server-side only; prints no
 * secrets. Exit code 1 when the published release is stale (older than STALE_HOURS) so a scheduler can alert.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { readLedger } from "../../src/lib/lamble/frames/collect.ts";
import { commerceDbPath } from "../../src/lib/lamble/payments/schema.ts";
import { readJsonIfExists, repoRoot } from "../../src/lib/lamble/server/io.ts";
import { loadCatalog, loadJobs } from "../../src/lib/lamble/catalog/load.ts";
import { iso } from "../../src/lib/lamble/core/time.ts";
import { editionIndex, publishedReleaseId, loadRelease } from "../../src/lib/lamble/service.ts";
import { all, one } from "../../src/lib/lamble/store/sqlite.ts";
import { openPipelineDb } from "./ingest.ts";

const STALE_HOURS = 36;

/** Billed credits per run from each run's manifest: the actual Frames bill, not quotes. */
function recentCosts(limit = 7) {
  const dir = path.join(repoRoot(), "research", "lamble");
  return readdirSync(dir)
    .filter((d) => /^\d{8}T\d{6}Z$/.test(d) && existsSync(path.join(dir, d, "refresh-manifest.json")))
    .sort()
    .slice(-limit)
    .map((run) => {
      const m = JSON.parse(readFileSync(path.join(dir, run, "refresh-manifest.json"), "utf8")) as { costs?: { charged_credits?: number } };
      return { run, chargedCredits: m.costs?.charged_credits ?? null };
    });
}

/** Seller-side receipts and purchase states, read-only; absent when no commerce database exists. */
function commerce() {
  const file = commerceDbPath();
  if (!existsSync(file)) return { database: "absent (no payments configured on this machine)" };
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return {
      purchases: db.prepare("SELECT status, count(*) n FROM purchases GROUP BY status").all(),
      events: db.prepare("SELECT event, count(*) n FROM payment_events GROUP BY event ORDER BY n DESC LIMIT 20").all(),
    };
  } finally {
    db.close();
  }
}

export function main(): number {
  const db = openPipelineDb();
  const runs = one<{ n: number; last: string; avail: number }>(db, "SELECT count(*) n, max(run_id) last, max(available_at) avail FROM runs");
  const obs = one<{ n: number; revisions: number }>(db, "SELECT count(*) n, sum(revision_of IS NOT NULL) revisions FROM observations");
  const releases = all<{ release_id: string; status: string; rejected_reason: string | null }>(db, "SELECT release_id, status, rejected_reason FROM releases ORDER BY created_at DESC LIMIT 5");
  db.close();
  let published: unknown = null;
  try {
    const r = loadRelease(publishedReleaseId());
    published = { releaseId: r.manifest.releaseId, dataCutoff: r.manifest.dataCutoff, dataThrough: r.manifest.dataThrough, validation: r.manifest.validation.passed };
  } catch (e) {
    published = (e as Error).message;
  }
  const catalog = loadCatalog(true);
  let freshness: { ageHours: number; stale: boolean } | null = null;
  let coverage: unknown = null;
  try {
    const r = loadRelease(publishedReleaseId());
    const ageHours = Math.round(((Date.now() - Date.parse(r.manifest.dataCutoff)) / 3_600_000) * 10) / 10;
    freshness = { ageHours, stale: ageHours > STALE_HOURS };
    const d = r.data;
    coverage = {
      coins: d.coins.length,
      collected: d.coins.filter((c) => c.collection.status === "collected").length,
      holderComponentsWithValue: d.coins.reduce((n, c) => n + c.holders.components.filter((h) => h.measure.value !== null).length, 0),
      holderComponentsTotal: d.coins.reduce((n, c) => n + c.holders.components.length, 0),
      bottoming: Object.fromEntries(["evaluated", "insufficient_data", "not_applicable"].map((s) => [s, d.coins.filter((c) => c.bottoming.state === s).length])),
      narrativesCollected: d.narratives.filter((n) => n.lifecycle.state === "collected").length,
    };
  } catch {
    freshness = null;
  }
  const ledger = readLedger(path.join(repoRoot(), "data", "collect", "ledger.json"));
  const delivery = readJsonIfExists<{ destinations: Record<string, unknown> }>(path.join(repoRoot(), "data", "delivery", "state.json"));
  console.log(
    JSON.stringify(
      {
        store: { runs: runs?.n, latestRun: runs?.last, latestAvailable: runs?.avail ? iso(runs.avail) : null, observations: obs?.n, revisions: obs?.revisions },
        published,
        recentReleases: releases,
        editions: editionIndex().map((e) => ({ id: e.id, status: e.status, revisions: e.latestRevision })),
        schedules: loadJobs().jobs.map((j) => ({ job: j.id, scheduleStatus: j.scheduleStatus, cron: j.cron })),
        capabilities: { total: catalog.capabilities.length, enabled: catalog.capabilities.filter((c) => c.enabled).map((c) => c.key), candidates: catalog.capabilities.filter((c) => c.validation.status === "candidate").length },
        freshness,
        coverage,
        publishFailures: releases.filter((r) => r.status === "rejected").length,
        frames: {
          billedCreditsByRun: recentCosts(),
          collectReservations: Object.fromEntries(Object.entries(ledger.budgets).map(([id, b]) => [id, { approvedUsd: b.approvedUsd, entries: b.entries.length, reservedUsd: b.entries.reduce((s, e) => s + e.reservedUsd, 0), chargedCredits: b.entries.reduce((s, e) => s + (e.chargedCredits ?? 0), 0) }])),
        },
        delivery: delivery ? delivery.destinations : "no delivery state (delivery not activated)",
        commerce: commerce(),
      },
      null,
      1,
    ),
  );
  return freshness?.stale ? 1 : 0;
}
