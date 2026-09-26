import { LAUNCHPAD_FIXTURES } from "@/lib/data/fixtures/launchpads";
import { NARRATIVE_FIXTURES } from "@/lib/data/fixtures/narratives";
import { HOUR, SNAPSHOT_TS, randomWalk } from "@/lib/data/seeded";
import type { DataProvider, Launchpad, Narrative } from "@/lib/data/types";

/**
 * Fixture-backed provider. Histories are generated once at module load with
 * seeded generators, so the server and the client render identical data.
 */
const launchpads: Launchpad[] = LAUNCHPAD_FIXTURES.map((fx) => {
  const { h24, d30 } = fx.metrics;
  // Walk from roughly where the venue was a month ago to today's daily fees.
  const monthAgo = h24.fees / (1 + d30.change / 100);
  const history30d = randomWalk({
    seed: `lp:${fx.slug}`,
    n: 30,
    start: Math.max(monthAgo, h24.fees * 0.2),
    end: h24.fees,
    vol: 0.14,
    min: 0,
  });
  return { ...fx, metrics: { ...fx.metrics, history30d } };
});

/** Volume in the first hour of the window relative to the last, by narrative status. */
const START_RATIO = { heating: 0.55, peak: 0.9, cooling: 1.5 } as const;
const VOLUME_COLOR = "#4c94ff";

const narratives: Narrative[] = NARRATIVE_FIXTURES.map((fx) => {
  const { volumeVol, ...rest } = fx;
  // One line per narrative: hourly volume across its coins over the 24h before
  // the snapshot, scaled so the hours add up to `volume24hUsd`.
  const shape = randomWalk({
    seed: `nr:${fx.slug}`,
    n: 24,
    step: HOUR,
    endTime: SNAPSHOT_TS - HOUR,
    start: START_RATIO[fx.status],
    end: 1,
    vol: volumeVol ?? 0.1,
    min: 0,
    drift: "geometric",
  });
  const total = shape.reduce((a, p) => a + p.value, 0);
  const points = shape.map((p) => ({ time: p.time, value: total > 0 ? (p.value / total) * fx.volume24hUsd : 0 }));
  return {
    ...rest,
    series: [{ id: "volume", label: "Total volume", color: VOLUME_COLOR, points }],
  };
});

export const fixtureProvider: DataProvider = {
  getLaunchpads: async () => launchpads,
  getNarratives: async () => narratives,
};
