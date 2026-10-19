/**
 * Daily release job. Offline; never spends.
 *
 *   npm run lambo -- release [--cutoff <iso>] [--dry-run]
 *
 * Builds from the observation store at the cutoff (default: the latest validated daily run's availability),
 * validates (including a cross-check against that run's own normalizer output), stages, and publishes
 * atomically. Changes are diffed against the published release; for the first release the baseline is
 * rebuilt at the previous run's cutoff and the events are marked reconstructed.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { loadCatalog, loadRegistry } from "../../src/lib/lambo/catalog/load.ts";
import { iso, parseIso } from "../../src/lib/lambo/core/time.ts";
import { diffReleases } from "../../src/lib/lambo/release/changes.ts";
import type { ReleasePublic } from "../../src/lib/lambo/release/types.ts";
import { readJson, readJsonIfExists, resolveFromRoot } from "../../src/lib/lambo/server/io.ts";
import { openPipelineDb, researchDir } from "./ingest.ts";
import { withLock } from "./lock.ts";
import { type HolderMethodConfig, buildReleaseContent } from "./release/build.ts";
import { dataDir, prune, readPointer, releasesDir, stageAndPublish, validateContent } from "./release/publish.ts";
import { Store } from "./release/store.ts";

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** Releases referenced by articles and weekly editions stay available. */
export function pinnedReleases(): Set<string> {
  const pinned = new Set<string>();
  const research = resolveFromRoot("content/research");
  if (existsSync(research)) for (const f of readdirSync(research).filter((x) => x.endsWith(".json"))) {
    const a = readJson<{ releaseId?: string; revisions?: { releaseId?: string }[] }>(path.join(research, f));
    if (a.releaseId) pinned.add(a.releaseId);
    for (const r of a.revisions ?? []) if (r.releaseId) pinned.add(r.releaseId);
  }
  const editions = path.join(dataDir(), "editions");
  if (existsSync(editions)) for (const w of readdirSync(editions)) {
    const dir = path.join(editions, w);
    if (!w.match(/^\d{4}-W\d{2}$/)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const e = readJson<{ releaseId?: string }>(path.join(dir, f));
      if (e.releaseId) pinned.add(e.releaseId);
    }
  }
  return pinned;
}

export function runRelease(argv: string[] = []) {
  return withLock("releases", () => {
    const db = openPipelineDb();
    try {
      const store = new Store(db);
      const all = store.dailyRuns(Number.MAX_SAFE_INTEGER);
      const cutoffArg = arg(argv, "--cutoff");
      const cutoff = cutoffArg ? parseIso(cutoffArg) : all.at(-1)!.available_at;
      const catalog = loadCatalog(true);
      const registry = loadRegistry();
      const holderConfig = readJson<HolderMethodConfig>(resolveFromRoot("docs/methods/holder-analysis.v1.json"));
      const ctx = { store, catalog, holderConfig, registryVenues: registry.venues };
      const content = buildReleaseContent({ ...ctx, cutoff });
      const runDir = path.join(researchDir(), content.latestRun);
      const reference = {
        launchpads: readJson<{ slug: string; metrics: { d7: { fees: number | null } } }[]>(path.join(runDir, "launchpads.json")),
        narratives: readJson<{ id: string; volume24hUsd: number }[]>(path.join(runDir, "narratives.json")),
        venueSlugs: registry.venues.map((v) => v.slug),
      };
      const checks = validateContent(content.publicContent, content.bundles, reference);
      const pointer = readPointer();
      let previous: Pick<ReleasePublic, "coins" | "narratives" | "market"> | null = pointer ? readJsonIfExists<ReleasePublic>(path.join(releasesDir(), pointer.releaseId, "public.json")) : null;
      let reconstructed = false;
      if (!previous) {
        const visible = store.dailyRuns(cutoff);
        const prevRun = visible.at(-2);
        if (prevRun) {
          previous = buildReleaseContent({ ...ctx, cutoff: prevRun.available_at }).publicContent;
          reconstructed = true;
        }
      }
      const changes = diffReleases(previous, content.publicContent);
      if (argv.includes("--dry-run")) return { status: "dry-run" as const, checks, changes: changes.length, latestRun: content.latestRun };
      const result = stageAndPublish({
        latestRun: content.latestRun,
        sourceRuns: content.sourceRuns,
        dataCutoff: iso(cutoff),
        dataThrough: content.dataThrough,
        methodVersions: content.methodVersions,
        counts: content.counts,
        publicContent: content.publicContent,
        bundles: content.bundles,
        checks,
        changes,
        reconstructedChanges: reconstructed,
        limitations: [
          "x4o2 Pump and FOMO capabilities are candidates: no response has been collected, so Pump and FOMO panels are unavailable.",
          "Holder components other than liquidity-to-size and peer performance need holder balances or wallet-resolved trades that no validated capability provides.",
          "Bottoming condition 1 needs wallet-resolved sales with acquisition cost; no coin can reach stage 1.",
          "Price histories are daily snapshot samples until Codex OHLC bars are live-verified (jobs.json codexBars).",
          "Narrative volume covers identified coins only; it is not all-market coverage.",
        ],
      });
      db.prepare(
        "INSERT OR REPLACE INTO releases (release_id, status, data_cutoff, source_runs_json, method_versions_json, content_sha256, created_at, published_at, rejected_reason, validation_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        result.releaseId,
        result.status === "rejected" ? "rejected" : "published",
        cutoff,
        JSON.stringify(content.sourceRuns),
        JSON.stringify(content.methodVersions),
        result.releaseId.split("-").at(-1)!,
        Math.floor(Date.now() / 1000),
        result.status === "rejected" ? null : Math.floor(Date.now() / 1000),
        result.status === "rejected" ? result.failed.map((f) => `${f.id}: ${f.detail}`).join("; ") : null,
        JSON.stringify(checks),
      );
      if (result.status === "published") prune(pinnedReleases());
      return { ...result, checks };
    } finally {
      db.close();
    }
  });
}

export function main(argv: string[]): number {
  const r = runRelease(argv);
  console.log(JSON.stringify({ ...r, checks: r.checks.map((c) => `${c.passed ? "ok" : "FAIL"} ${c.id}: ${c.detail}`) }, null, 1));
  return r.status === "rejected" ? 1 : 0;
}
