import type { ChainId, Launchpad, Narrative, Point } from './types';

export interface Aggregates {
  launchpadCount: number;
  chainCount: number;
  fees24h: number | null;
  feesChange30d: number | null;
  feesHistory30d: Point[];
  launched24h: number | null;
  graduated24h: number | null;
  launchesPerMinute: number | null;
  chains: ChainId[];
  completeHistories: number;
  narrativeCount: number;
  constituentCount: number;
  feeSubtotal: number | null;
  feeScope: string;
  indexedCreated24: number | null;
  indexedCompleted24: number | null;
  indexedCompletionRate: number | null;
  creationCoverage: number;
  completionCoverage: number;
}

/** Coverage counts only: engine/frontend fee flows are not disjoint. */
export function aggregate(launchpads: Launchpad[], narratives: Narrative[] = [], fees?: { value: number; scope: string }): Aggregates {
  const chains = [...new Set(launchpads.flatMap((l) => l.chains))];
  const observed = launchpads.flatMap((l) => l.activityObservation ? [l.activityObservation] : []);
  const completions = observed.filter((a) => a.indexedCompleted24 !== null);
  const matchedLaunches = completions.reduce((sum, a) => sum + a.indexedCreated24, 0);
  const completed = completions.reduce((sum, a) => sum + (a.indexedCompleted24 ?? 0), 0);
  return {
    feeSubtotal: fees?.value ?? null, feeScope: fees?.scope ?? '',
    indexedCreated24: observed.length ? observed.reduce((sum, a) => sum + a.indexedCreated24, 0) : null,
    indexedCompleted24: completions.length ? completed : null,
    indexedCompletionRate: matchedLaunches > 0 ? 100 * completed / matchedLaunches : null,
    creationCoverage: observed.length, completionCoverage: completions.length,
    chainCount: chains.length,
    // All-venue totals remain unknown until overlapping flows are partitioned.
    fees24h: null, feesChange30d: null, feesHistory30d: [],
    launched24h: null, graduated24h: null, launchesPerMinute: null,
    launchpadCount: launchpads.length,
    chains,
    completeHistories: launchpads.filter((l) => l.metrics.history30d.length === 30 && l.metrics.history30d.every((p) => p.value !== null)).length,
    narrativeCount: narratives.length,
    constituentCount: new Set(narratives.flatMap((n) => n.contenders.map((c) => c.id))).size,
  };
}
