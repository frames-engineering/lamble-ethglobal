/**
 * Delivers new change events to configured destinations (docs/data/notifications.json).
 *
 *   npm run lamble -- deliver [--dry-run]
 *   npm run lamble -- deliver verify <destination>          webhook: signed challenge echo; Telegram: send a code
 *   npm run lamble -- deliver confirm <destination> <code>  record the code a Telegram chat member relayed
 *
 * Disabled unless the configuration says enabled and LAMBLE_DELIVERY_ENABLED=true. Per-destination cursors and
 * backoff live in data/delivery/state.json (no secrets).
 */
import path from "node:path";

import { loadJobs } from "../../src/lib/lamble/catalog/load.ts";
import { type DeliveryState, type NotificationsConfig, deliver } from "../../src/lib/lamble/notify/deliver.ts";
import { type VerificationFile, confirmTelegram, startTelegram, verifyWebhook } from "../../src/lib/lamble/notify/verify.ts";
import { readJsonIfExists, repoRoot, writeJsonAtomic } from "../../src/lib/lamble/server/io.ts";
import { allChanges } from "../../src/lib/lamble/service.ts";
import { withLockAsync } from "./lock.ts";

export async function main(argv: string[]): Promise<number> {
  const config = readJsonIfExists<NotificationsConfig>(path.join(repoRoot(), "docs", "data", "notifications.json")) ?? { enabled: false, destinations: [] };
  const stateFile = path.join(repoRoot(), "data", "delivery", "state.json");
  const verificationsFile = path.join(repoRoot(), "data", "delivery", "verifications.json");
  const verifications = readJsonIfExists<VerificationFile>(verificationsFile) ?? { destinations: {} };
  if (argv[0] === "verify" || argv[0] === "confirm") {
    const d = config.destinations.find((x) => x.id === argv[1]);
    if (!d) {
      console.error(`No destination ${argv[1] ?? "(missing)"} in docs/data/notifications.json.`);
      return 2;
    }
    return withLockAsync("delivery", async () => {
      try {
        if (argv[0] === "confirm") {
          const v = verifications.destinations[d.id];
          if (!v) throw new Error("no pending verification; run deliver verify first");
          try {
            verifications.destinations[d.id] = confirmTelegram(v, argv[2] ?? "");
          } finally {
            writeJsonAtomic(verificationsFile, verifications);
          }
          console.log(`${d.id}: verified`);
          return 0;
        }
        const secret = process.env[d.secretEnv];
        if (!secret) throw new Error(`${d.secretEnv} is not set`);
        verifications.destinations[d.id] = d.kind === "webhook" ? await verifyWebhook(d, secret) : await startTelegram(d, secret);
        writeJsonAtomic(verificationsFile, verifications);
        console.log(d.kind === "webhook" ? `${d.id}: verified (challenge echoed)` : `${d.id}: code sent to chat ${d.chatId}; record it with deliver confirm ${d.id} <code>`);
        return 0;
      } catch (e) {
        console.error(`${d.id}: ${String((e as Error).message).replace(/bot[^/\s]+/g, "bot***")}`);
        return 1;
      }
    });
  }
  const job = loadJobs().jobs.find((j) => j.id === "notification-delivery");
  const policy = {
    maxAttempts: Number((job?.pagination as { maxAttempts?: number } | undefined)?.maxAttempts ?? 6),
    backoffSeconds: ((job?.pagination as { backoffSeconds?: number[] } | undefined)?.backoffSeconds ?? [60, 300, 900, 3600, 21600]).map(Number),
    maxDeliveriesPerDestinationPerDay: Number((job?.budget as { maxDeliveriesPerDestinationPerDay?: number } | undefined)?.maxDeliveriesPerDestinationPerDay ?? 200),
  };
  const results = await withLockAsync("delivery", async () => {
    const state = readJsonIfExists<DeliveryState>(stateFile) ?? { destinations: {} };
    const r = await deliver({ config, verifications, events: allChanges(), state, env: process.env, policy, siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""), dryRun: argv.includes("--dry-run") });
    if (!argv.includes("--dry-run") && r.some((x) => x.status !== "disabled")) writeJsonAtomic(stateFile, state);
    return r;
  });
  for (const r of results) console.log(`${r.destination}: ${r.status} (${r.delivered}) — ${r.detail}`);
  return results.some((r) => r.status === "failed") ? 1 : 0;
}
