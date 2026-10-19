/**
 * Staged, validated, atomic publication. A release is written to data/staging/<id>/, re-read and validated,
 * then renamed into data/releases/<id>/ and only then does data/releases/published.json move to it.
 * A rejected or partial build never replaces the last valid release.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import path from "node:path";

import { assertMeasure, type Measure } from "../../../src/lib/lambo/core/measure.ts";
import { parseTokenId } from "../../../src/lib/lambo/core/identity.ts";
import { readJsonIfExists, removeDir, resolveFromRoot, sha256, stableStringify, writeFileAtomic, writeJsonAtomic } from "../../../src/lib/lambo/server/io.ts";
import { RELEASE_SCHEMA, type ChangeEvent, type ReleaseManifest, type ReleasePublic } from "../../../src/lib/lambo/release/types.ts";
import type { DraftChange } from "../../../src/lib/lambo/release/changes.ts";

export interface PublishedPointer {
  releaseId: string;
  publishedAt: string;
  previousReleaseId: string | null;
}

export interface ReleaseIndexEntry {
  releaseId: string;
  dataCutoff: string;
  publishedAt: string;
  latestRun: string;
  changes: { fromSeq: number; toSeq: number };
  pinned: boolean;
}

export const dataDir = () => process.env.LAMBO_DATA_DIR ?? resolveFromRoot("data");
export const releasesDir = () => path.join(dataDir(), "releases");
export const changesFile = () => path.join(dataDir(), "changes", "events.json");

export function readPointer(): PublishedPointer | null {
  return readJsonIfExists<PublishedPointer>(path.join(releasesDir(), "published.json"));
}

export function readIndex(): ReleaseIndexEntry[] {
  return readJsonIfExists<ReleaseIndexEntry[]>(path.join(releasesDir(), "index.json")) ?? [];
}

export function readChanges(): ChangeEvent[] {
  return readJsonIfExists<ChangeEvent[]>(changesFile()) ?? [];
}

export interface Check {
  id: string;
  passed: boolean;
  detail: string;
}

/** Content-level checks. Cross-checks against the run's own validated normalizer outputs catch adapter or schema drift. */
export function validateContent(
  pub: Omit<ReleasePublic, "releaseId" | "schemaVersion" | "dataCutoff">,
  bundles: { coins: Record<string, unknown> },
  reference: { launchpads: { slug: string; metrics: { d7: { fees: number | null } } }[]; narratives: { id: string; volume24hUsd: number }[]; venueSlugs: string[] },
): Check[] {
  const checks: Check[] = [];
  const add = (id: string, passed: boolean, detail: string) => checks.push({ id, passed, detail });
  const measureErrors: string[] = [];
  const check = (m: Measure<unknown>, where: string) => {
    try {
      assertMeasure(m, where);
    } catch (e) {
      measureErrors.push((e as Error).message);
    }
  };
  for (const c of pub.coins) {
    for (const [k, m] of Object.entries(c.market)) check(m, `${c.id}.market.${k}`);
    for (const h of c.holders.components) check(h.measure, `${c.id}.holders.${h.id}`);
  }
  for (const n of pub.narratives) for (const k of ["volume24h", "volume7d", "volume30d"] as const) check(n.activity[k], `${n.slug}.${k}`);
  add("measure-states", measureErrors.length === 0, measureErrors.length ? measureErrors.slice(0, 5).join("; ") : "Every measure respects the state contract.");
  const ids = new Set<string>();
  let identityErrors = 0;
  for (const c of pub.coins) {
    if (ids.has(c.id)) identityErrors++;
    ids.add(c.id);
    try {
      if (parseTokenId(c.id).id !== c.id) identityErrors++;
    } catch {
      identityErrors++;
    }
  }
  add("canonical-identity", identityErrors === 0, `${pub.coins.length} coins, ${identityErrors} identity errors.`);
  const slugs = pub.launchpads.map((l) => l.slug).sort();
  add("venues", JSON.stringify(slugs) === JSON.stringify([...reference.venueSlugs].sort()), `${slugs.length} venues; registry has ${reference.venueSlugs.length}.`);
  const feeMismatch = reference.launchpads.filter((r) => {
    const mine = pub.launchpads.find((l) => l.slug === r.slug)?.metrics.d7.fees ?? null;
    const theirs = r.metrics.d7.fees;
    return mine === null || theirs === null ? mine !== theirs : Math.abs(mine - theirs) > 1e-6 * Math.max(1, Math.abs(theirs));
  });
  add("fees-match-normalizer", feeMismatch.length === 0, feeMismatch.length ? `7-day fees differ from the run's normalizer for ${feeMismatch.map((x) => x.slug).join(", ")}` : "7-day fees reproduce the run's validated normalizer output for every venue.");
  const volMismatch = reference.narratives.filter((r) => {
    const mine = pub.narratives.find((n) => n.id === r.id);
    return !mine || mine.activity.volume24h.value === null || Math.abs(mine.activity.volume24h.value - r.volume24hUsd) > 0.01;
  });
  add("narrative-volume-match-normalizer", volMismatch.length === 0, volMismatch.length ? `24h volume differs for ${volMismatch.map((x) => x.id).join(", ")}` : "24h narrative volume reproduces the run's normalizer for every collected narrative.");
  const featured = pub.narratives.filter((n) => n.featured.featured);
  add("featured-cap", featured.length <= 6 && pub.narratives.filter((n) => n.lifecycle.state === "collected").every((n) => n.featured.featured), `${featured.length} featured narratives.`);
  const series = pub.narratives.filter((n) => n.activity.hourly.length && n.activity.hourly.length !== 168);
  add("hourly-grid", series.length === 0, series.length ? `Non-168 hourly series: ${series.map((n) => n.slug).join(", ")}` : "Hourly series are complete 168-hour grids.");
  const missingEvidence = pub.coins.flatMap((c) => c.evidence).filter((e) => !pub.evidence[e]);
  add("evidence-resolves", missingEvidence.length === 0, missingEvidence.length ? `${missingEvidence.length} unresolved evidence ids (e.g. ${missingEvidence[0]})` : "Every coin evidence id resolves.");
  const bundleKeys = Object.keys(bundles.coins).sort();
  add("bundles-match", JSON.stringify(bundleKeys) === JSON.stringify(pub.coins.map((c) => c.id).sort()), `${bundleKeys.length} coin bundles.`);
  const blob = JSON.stringify(pub) + JSON.stringify(bundles);
  const secret = /(authorization["']?\s*[:=]|x-api-key|bearer\s+[a-z0-9._-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY)/i.test(blob);
  add("no-credentials", !secret, secret ? "Credential-like text found." : "No credential-like text.");
  return checks;
}

export interface StageInput {
  latestRun: string;
  sourceRuns: string[];
  dataCutoff: string;
  dataThrough: ReleaseManifest["dataThrough"];
  methodVersions: Record<string, string>;
  counts: Record<string, number>;
  publicContent: Omit<ReleasePublic, "releaseId" | "schemaVersion" | "dataCutoff">;
  bundles: unknown;
  checks: Check[];
  changes: DraftChange[];
  reconstructedChanges: boolean;
  limitations: string[];
  now?: Date;
}

export type PublishResult =
  | { status: "published"; releaseId: string; changes: number }
  | { status: "unchanged"; releaseId: string }
  | { status: "rejected"; releaseId: string; failed: Check[] };

export function stageAndPublish(input: StageInput): PublishResult {
  const contentSha = sha256(stableStringify({ public: input.publicContent, bundles: input.bundles, dataCutoff: input.dataCutoff }));
  const releaseId = `rel-${input.latestRun}-${contentSha.slice(0, 8)}`;
  const pointer = readPointer();
  if (pointer?.releaseId === releaseId) return { status: "unchanged", releaseId };
  const failed = input.checks.filter((c) => !c.passed);
  const staging = path.join(dataDir(), "staging", releaseId);
  removeDir(staging);
  const now = (input.now ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const publicDoc: ReleasePublic = { schemaVersion: RELEASE_SCHEMA, releaseId, dataCutoff: input.dataCutoff, ...input.publicContent };
  const events = readChanges();
  const fromSeq = (events.at(-1)?.seq ?? 0) + 1;
  const changeEvents: ChangeEvent[] = input.changes.map((c, i) => ({ ...c, seq: fromSeq + i, releaseId, at: now, reconstructed: input.reconstructedChanges }));
  // Paid bundles are stored gzipped (mtime-free, deterministic); public files stay plain JSON for review.
  const files: Record<string, string | Buffer> = {
    "public.json": JSON.stringify(publicDoc),
    "bundles.json.gz": gzipSync(JSON.stringify({ schemaVersion: RELEASE_SCHEMA, releaseId, ...(input.bundles as object) }), { level: 9 }),
    "changes.json": JSON.stringify(changeEvents),
  };
  for (const [name, data] of Object.entries(files)) writeFileAtomic(path.join(staging, name), data);
  const manifest: ReleaseManifest = {
    schemaVersion: RELEASE_SCHEMA,
    releaseId,
    dataCutoff: input.dataCutoff,
    generatedAt: now,
    latestRun: input.latestRun,
    sourceRuns: input.sourceRuns,
    dataThrough: input.dataThrough,
    methodVersions: input.methodVersions,
    files: Object.fromEntries(Object.entries(files).map(([name, data]) => [name, { sha256: sha256(data), bytes: typeof data === "string" ? Buffer.byteLength(data) : data.length }])),
    contentSha256: contentSha,
    counts: input.counts,
    previousReleaseId: pointer?.releaseId ?? null,
    changes: { fromSeq, toSeq: fromSeq + changeEvents.length - 1, count: changeEvents.length, reconstructed: input.reconstructedChanges },
    validation: { passed: failed.length === 0, checks: input.checks },
    limitations: input.limitations,
  };
  writeJsonAtomic(path.join(staging, "manifest.json"), manifest);
  // Re-read what was written and verify checksums before anything becomes visible.
  for (const [name, meta] of Object.entries(manifest.files)) {
    const bytes = readFileSync(path.join(staging, name));
    let parses = true;
    try {
      JSON.parse((name.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"));
    } catch {
      parses = false;
    }
    if (sha256(bytes) !== meta.sha256 || !parses) failed.push({ id: `checksum:${name}`, passed: false, detail: "Staged file does not match its checksum or is not valid JSON." });
  }
  if (failed.length) {
    const rejected = path.join(dataDir(), "staging", `rejected-${releaseId}`);
    removeDir(rejected);
    renameSync(staging, rejected);
    return { status: "rejected", releaseId, failed };
  }
  const target = path.join(releasesDir(), releaseId);
  mkdirSync(releasesDir(), { recursive: true });
  if (existsSync(target)) removeDir(target);
  renameSync(staging, target);
  // The pointer moves last: until this rename, readers keep serving the previous release.
  writeJsonAtomic(changesFile(), [...events, ...changeEvents]);
  const index = readIndex().filter((e) => e.releaseId !== releaseId);
  index.push({ releaseId, dataCutoff: input.dataCutoff, publishedAt: now, latestRun: input.latestRun, changes: { fromSeq, toSeq: fromSeq + changeEvents.length - 1 }, pinned: false });
  writeJsonAtomic(path.join(releasesDir(), "index.json"), index);
  writeJsonAtomic(path.join(releasesDir(), "published.json"), { releaseId, publishedAt: now, previousReleaseId: pointer?.releaseId ?? null } satisfies PublishedPointer);
  return { status: "published", releaseId, changes: changeEvents.length };
}

/** Keeps the published release, the previous one, every pinned release and the newest `keep`; removes other directories. */
export function prune(pinned: Set<string>, keep = 3): string[] {
  const pointer = readPointer();
  const index = readIndex();
  const keepIds = new Set([...pinned, pointer?.releaseId, pointer?.previousReleaseId, ...index.slice(-keep).map((e) => e.releaseId)].filter(Boolean) as string[]);
  const removed: string[] = [];
  for (const d of readdirSync(releasesDir())) {
    if (!d.startsWith("rel-") || keepIds.has(d)) continue;
    removeDir(path.join(releasesDir(), d));
    removed.push(d);
  }
  writeJsonAtomic(path.join(releasesDir(), "index.json"), index.map((e) => ({ ...e, pinned: pinned.has(e.releaseId), removed: removed.includes(e.releaseId) || undefined })));
  return removed;
}
