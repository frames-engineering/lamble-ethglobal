"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Reads a query parameter on the client without opting the page out of static rendering. */
export function useSearchParamValue(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}
