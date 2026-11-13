"use client";

import { type ReactNode, useSyncExternalStore } from "react";

// A minute clock, as in the status bar. The server snapshot is null, so the server render and the first client
// render agree and hydration never sees a clock mismatch.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}
const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

/**
 * The home page is prerendered when a scout commit deploys, so if the scout stops, nothing re-renders it and the
 * build-time freshness check never runs again. This repeats the check against the reader's clock after hydration
 * and swaps the finds for the paused note once the scan is older than `maxAgeSeconds`.
 */
export function ScoutFreshness({ generatedAt, maxAgeSeconds, paused, children }: { generatedAt: string; maxAgeSeconds: number; paused: ReactNode; children: ReactNode }) {
  const now = useSyncExternalStore(subscribe, minute, () => null);
  const stale = now !== null && now - Date.parse(generatedAt) > maxAgeSeconds * 1000;
  return <>{stale ? paused : children}</>;
}
