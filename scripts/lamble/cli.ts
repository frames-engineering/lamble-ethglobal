/**
 * LAMBLE pipeline CLI. Offline commands never spend; `collect` spends only under an approved budget.
 *
 *   npm run lamble -- providers <validate|matrix|inspect|smoke|register|enable|health>
 *   npm run lamble -- migrate                  create/upgrade data/lamble.sqlite and data/commerce.sqlite
 *   npm run lamble -- ingest [--run <id>]      load research runs into the observation store
 *   npm run lamble -- release [--cutoff <iso>] stage, validate and publish a release from the store
 *   npm run lamble -- weekly [--week <id>]     freeze a calendar-week edition (new revision if it changed)
 *   npm run lamble -- research                 findings, drafts and claim validation from the published release
 *   npm run lamble -- deliver [--dry-run]      deliver change events to verified destinations
 *   npm run lamble -- collect <plan.json>      programmatic Frames collection (budget-guarded)
 *   npm run lamble -- refresh                  migrate + ingest + release + weekly + research (offline)
 *   npm run lamble -- status                   store, release and job state
 */
export {};

type Main = (argv: string[]) => number | Promise<number>;

const COMMANDS: Record<string, () => Promise<{ main: Main }>> = {
  providers: () => import("./providers.ts"),
  migrate: () => import("./migrate.ts"),
  ingest: () => import("./ingest.ts"),
  release: () => import("./release.ts"),
  weekly: () => import("./weekly.ts"),
  research: () => import("./research.ts"),
  collect: () => import("./collect.ts"),
  deliver: () => import("./deliver.ts"),
  refresh: () => import("./refresh.ts"),
  status: () => import("./status.ts"),
};

const [cmd, ...rest] = process.argv.slice(2);
const load = cmd ? COMMANDS[cmd] : undefined;
if (!load) {
  console.error(`usage: lamble <${Object.keys(COMMANDS).join("|")}> [...]`);
  process.exit(2);
}
try {
  const { main } = await load();
  process.exit(await main(rest));
} catch (error) {
  console.error(error instanceof Error ? (process.env.LAMBLE_DEBUG ? error.stack : error.message) : error);
  process.exit(1);
}
