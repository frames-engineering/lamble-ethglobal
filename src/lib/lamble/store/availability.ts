/**
 * When each research run's observations became available to LAMBLE. "As known then" views and every release
 * depend on it, so it must not change after it is first decided. It is decided once and recorded in
 * data/run-availability.json, which is committed with the run:
 *
 * - a run already committed to full git history: the commit that added its manifest (basis git-commit);
 * - a run not committed yet (the daily routine ingests before it commits): the time it was first ingested
 *   (basis first-ingest). Not the run's start time: collection finishes later than it starts.
 * - otherwise (a shallow clone, or a tarball without history): the run's start time, as an explicit, earlier
 *   bound (basis runtime), with a warning. Shallow clones report wrong add-commits, so they are never trusted.
 *
 * A recorded value always wins, so a rebuild in any clone reproduces the same releases.
 */

export type AvailabilityBasis = "git-commit" | "first-ingest" | "runtime";

export interface AvailabilityRecord {
  availableAt: string;
  basis: AvailabilityBasis;
}

export type AvailabilityFile = Record<string, AvailabilityRecord>;

export interface AvailabilityContext {
  recorded: AvailabilityFile;
  /** Add-commit time (unix seconds) of each run's manifest from full history; empty for shallow clones. */
  gitCommits: Map<string, number>;
  shallow: boolean;
  /** Whether the run's manifest is tracked by git (committed or staged). */
  tracked: (runId: string) => boolean;
  /** Run start time (unix seconds). */
  runtime: (runId: string) => number;
  now: number;
}

export interface AvailabilityDecision {
  at: number;
  basis: AvailabilityBasis;
  /** Present when the decision is new and must be recorded. */
  record: AvailabilityRecord | null;
  warning: string | null;
}

const iso = (t: number) => new Date(t * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

export function decideAvailability(runId: string, ctx: AvailabilityContext): AvailabilityDecision {
  const rec = ctx.recorded[runId];
  if (rec) {
    const at = Math.floor(Date.parse(rec.availableAt) / 1000);
    if (!Number.isFinite(at)) throw new Error(`data/run-availability.json: invalid time for ${runId}`);
    return { at, basis: rec.basis, record: null, warning: null };
  }
  const committed = ctx.shallow ? undefined : ctx.gitCommits.get(runId);
  if (committed !== undefined) return { at: committed, basis: "git-commit", record: { availableAt: iso(committed), basis: "git-commit" }, warning: null };
  if (!ctx.tracked(runId)) return { at: ctx.now, basis: "first-ingest", record: { availableAt: iso(ctx.now), basis: "first-ingest" }, warning: null };
  const at = ctx.runtime(runId);
  return {
    at,
    basis: "runtime",
    record: { availableAt: iso(at), basis: "runtime" },
    warning: `${runId}: no recorded availability and no full git history${ctx.shallow ? " (shallow clone)" : ""}; using the run start time, an earlier bound`,
  };
}
