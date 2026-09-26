import { LAUNCHPADS, NARRATIVES } from '@/lib/data/snapshots/frames';
import type { DataProvider } from '@/lib/data/types';

/** Dated snapshot. Serving the page makes no paid API calls. */
export const framesProvider: DataProvider = {
  getLaunchpads: async () => LAUNCHPADS,
  getNarratives: async () => NARRATIVES,
};
