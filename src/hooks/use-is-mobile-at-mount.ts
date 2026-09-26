"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px) and (pointer: coarse)";
const subscribe = () => () => {};
let decided: boolean | null = null;

/**
 * Decided once per page load, like Backpack's table: the column order does not
 * change while resizing an open page. SSR always renders the desktop order.
 */
export function useIsMobileAtMount(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (decided ??= window.matchMedia(QUERY).matches),
    () => false,
  );
}
