/**
 * Delivers new change events to configured destinations (docs/data/notifications.json).
 *
 *   npm run lambo -- deliver [--dry-run]
 *
 * Disabled unless the configuration says enabled and LAMBO_DELIVERY_ENABLED=true. Per-destination cursors and
 * backoff live in data/delivery/state.json (no secrets).
 */
import path from "node:path";

import { loadJobs } from "../../src/lib/lambo/catalog/load.ts";
import { type DeliveryState, type NotificationsConfig, deliver } from "../../src/lib/lambo/notify/deliver.ts";
import { readJsonIfExists, repoRoot, writeJsonAtomic } from "../../src/lib/lambo/server/io.ts";
import { allChanges } from "../../src/lib/lambo/service.ts";
import { withLockAsync } from "./lock.ts";

export async function main(argv: string[]): Promise<number> {
  const config = readJsonIfExists<NotificationsConfig>(path.join(repoRoot(), "docs", "data", "notifications.json")) ?? { enabled: false, destinations: [] };
  const stateFile = path.join(repoRoot(), "data", "delivery", "state.json");
  const job = loadJobs().jobs.find((j) => j.id === "notification-delivery");
  const policy = {
    maxAttempts: Number((job?.pagination as { maxAttempts?: number } | undefined)?.maxAttempts ?? 6),
    backoffSeconds: ((job?.pagination as { backoffSeconds?: number[] } | undefined)?.backoffSeconds ?? [60, 300, 900, 3600, 21600]).map(Number),
    maxDeliveriesPerDestinationPerDay: Number((job?.budget as { maxDeliveriesPerDestinationPerDay?: number } | undefined)?.maxDeliveriesPerDestinationPerDay ?? 200),
  };
  const results = await withLockAsync("delivery", async () => {
    const state = readJsonIfExists<DeliveryState>(stateFile) ?? { destinations: {} };
    const r = await deliver({ config, events: allChanges(), state, env: process.env, policy, siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""), dryRun: argv.includes("--dry-run") });
    if (!argv.includes("--dry-run") && r.some((x) => x.status !== "disabled")) writeJsonAtomic(stateFile, state);
    return r;
  });
  for (const r of results) console.log(`${r.destination}: ${r.status} (${r.delivered}) — ${r.detail}`);
  return results.some((r) => r.status === "failed") ? 1 : 0;
}
