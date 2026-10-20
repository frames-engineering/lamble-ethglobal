/**
 * Offline end-to-end refresh: migrate, ingest new research runs, publish a release, freeze weekly editions and
 * prepare research. Never spends; safe for a clean checkout (`npm run data:setup`).
 */
import { ingest } from "./ingest.ts";
import { runRelease } from "./release.ts";
import { runResearch } from "./research.ts";
import { runWeekly } from "./weekly.ts";

export function main(argv: string[]): number {
  const ing = ingest({ rebuild: argv.includes("--rebuild") });
  console.log(`ingest: ${ing.ingested.length} new, ${ing.skipped.length} unchanged, ${ing.failed.length} failed`);
  if (ing.failed.length) {
    for (const f of ing.failed) console.error(`  ${f.run}: ${f.error}`);
    return 1;
  }
  const rel = runRelease([]);
  console.log(`release: ${rel.status} ${"releaseId" in rel ? rel.releaseId : ""}`);
  if (rel.status === "rejected") return 1;
  for (const w of runWeekly([])) console.log(`weekly: ${JSON.stringify(w)}`);
  const research = runResearch([]);
  for (const a of research) console.log(`research: ${a.slug} ${a.status}${a.problems ? `\n  ${a.problems.join("\n  ")}` : ""}`);
  return research.some((a) => a.status === "rejected") ? 1 : 0;
}
