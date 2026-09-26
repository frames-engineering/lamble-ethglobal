import { fixtureProvider } from "@/lib/data/providers/fixture";
import type { DataProvider } from "@/lib/data/types";

/** The only swap point: replace `fixtureProvider` with a backend client later. */
export const dataProvider: DataProvider = fixtureProvider;

export const getLaunchpads = () => dataProvider.getLaunchpads();
export const getNarratives = () => dataProvider.getNarratives();
