/** Creates or upgrades the local stores. Safe to run repeatedly. */
import { openPipelineDb, pipelineDbPath } from "./ingest.ts";

export function main(): number {
  const db = openPipelineDb();
  const applied = (db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as { id: string }[]).map((r) => r.id);
  db.close();
  console.log(JSON.stringify({ pipeline: pipelineDbPath(), migrations: applied }));
  return 0;
}
