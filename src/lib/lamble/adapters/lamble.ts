/** LAMBLE's own curation files are read by the ingest job directly; this adapter exists so the capability is registered. */
import { type Adapter, emptyOutput } from "./types.ts";

export const curationAdapter: Adapter = {
  key: "lamble.curation",
  normalize() {
    return emptyOutput();
  },
};
