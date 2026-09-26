import { framesProvider } from "@/lib/data/providers/frames";
import type { DataProvider } from "@/lib/data/types";

/** The landing serves the validated Frames snapshot. */
export const dataProvider: DataProvider = framesProvider;

export const getLaunchpads = () => dataProvider.getLaunchpads();
export const getNarratives = () => dataProvider.getNarratives();
