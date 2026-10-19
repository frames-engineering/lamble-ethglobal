/** Store, release, edition and schedule state, for operators and the provider-health runbook. */
import { loadCatalog, loadJobs } from "../../src/lib/lambo/catalog/load.ts";
import { iso } from "../../src/lib/lambo/core/time.ts";
import { editionIndex, publishedReleaseId, loadRelease } from "../../src/lib/lambo/service.ts";
import { all, one } from "../../src/lib/lambo/store/sqlite.ts";
import { openPipelineDb } from "./ingest.ts";

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
  console.log(
    JSON.stringify(
      {
        store: { runs: runs?.n, latestRun: runs?.last, latestAvailable: runs?.avail ? iso(runs.avail) : null, observations: obs?.n, revisions: obs?.revisions },
        published,
        recentReleases: releases,
        editions: editionIndex().map((e) => ({ id: e.id, status: e.status, revisions: e.latestRevision })),
        schedules: loadJobs().jobs.map((j) => ({ job: j.id, scheduleStatus: j.scheduleStatus, cron: j.cron })),
        capabilities: { total: catalog.capabilities.length, enabled: catalog.capabilities.filter((c) => c.enabled).map((c) => c.key), candidates: catalog.capabilities.filter((c) => c.validation.status === "candidate").length },
      },
      null,
      1,
    ),
  );
  return 0;
}
