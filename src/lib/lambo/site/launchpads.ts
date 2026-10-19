/**
 * Adapts release launchpads to the presentation type the existing launchpads table and detail sheet render, so
 * the established table keeps its look while its numbers come from the published release.
 */
import type { ChainId, Launchpad } from "../../data/types.ts";
import type { LaunchpadPublic } from "../release/types.ts";

export function toLaunchpadView(l: LaunchpadPublic): Launchpad {
  const p = l.presentation as Omit<Launchpad, "metrics" | "activityObservation">;
  const ix = l.indexed;
  return {
    ...p,
    chains: (p.chains ?? []) as ChainId[],
    metrics: {
      h24: l.metrics.h24,
      d7: l.metrics.d7,
      d30: l.metrics.d30,
      // Event-level launch counts are not collected; indexed rolling counts are reported separately below.
      launched24h: null,
      launched7dAvg: null,
      graduated24h: null,
      graduationRate7d: null,
      history30d: l.metrics.history30d,
    },
    activityObservation: ix
      ? {
          sourceAsOf: Math.floor(Date.parse(ix.asOf) / 1000),
          providerIds: [],
          indexedCreated24: ix.created24,
          indexedCompleted24: ix.completed24,
          indexed7dAvg: ix.created7d / 7,
          indexed7dCompletionRate: ix.completed7d === null || ix.created7d === 0 ? null : (100 * ix.completed7d) / ix.created7d,
          coverage: "Provider-reported indexed activity, beta. Exact window cutoffs, creation-event completeness and finality are not independently established.",
        }
      : undefined,
  };
}
