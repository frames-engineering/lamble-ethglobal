/**
 * Commerce store schema (data/commerce.sqlite, override LAMBLE_COMMERCE_DB_PATH; ":memory:" in tests). Unlike
 * the observation store this file is the system of record for money: it is never derived, never rebuilt and
 * lives apart so a pipeline rebuild can never touch a purchase.
 *
 * Times are unix milliseconds UTC from the injected clock (deps.now()).
 *
 *   offers          fixed-price quotes bound to resource kind + canonical params + pinned release + protocol terms
 *   purchases       one row per protocol-level payment identity; payment_key UNIQUE is the single-use guard
 *   entitlements    access created only after settlement; capability tokens are stored as sha256 only
 *   payment_events  append-only audit trail of every step including rejections (triggers forbid UPDATE/DELETE)
 *   mpp_store       durable key/value behind mppx's replay Store, so claims survive restarts and span instances
 *
 * Server-only (node:sqlite).
 */
import { resolveFromRoot } from "../server/io.ts";
import { type Db, type Migration, migrate, openDb } from "../store/sqlite.ts";

export const COMMERCE_MIGRATIONS: Migration[] = [
  {
    id: "0001_commerce",
    sql: `
CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  binding_key TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  params_json TEXT NOT NULL,
  params_key TEXT NOT NULL,
  release_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  protocols_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX offers_binding ON offers (binding_key, expires_at);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id),
  protocol TEXT NOT NULL CHECK (protocol IN ('x402', 'mpp')),
  payment_key TEXT NOT NULL UNIQUE,
  credential_hash TEXT NOT NULL,
  payer TEXT,
  network TEXT,
  amount TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verifying', 'settling', 'settled', 'fulfilled', 'failed', 'uncertain')),
  settlement_ref TEXT,
  failure_reason TEXT,
  settle_attempts INTEGER NOT NULL DEFAULT 0,
  replay_serves INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  settled_at INTEGER,
  fulfilled_at INTEGER
);
CREATE INDEX purchases_offer ON purchases (offer_id);
CREATE INDEX purchases_status ON purchases (status, updated_at);
CREATE UNIQUE INDEX purchases_settlement ON purchases (protocol, settlement_ref) WHERE settlement_ref IS NOT NULL;

CREATE TABLE entitlements (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL UNIQUE REFERENCES purchases(id),
  token_hash TEXT NOT NULL UNIQUE,
  resource_kind TEXT NOT NULL,
  params_key TEXT NOT NULL,
  release_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  downloads_max INTEGER NOT NULL,
  revoked_at INTEGER,
  revoked_reason TEXT
);

CREATE TABLE payment_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('ok', 'rejected', 'failed', 'uncertain', 'error')),
  protocol TEXT,
  offer_id TEXT,
  purchase_id TEXT,
  entitlement_id TEXT,
  http_status INTEGER,
  detail_json TEXT
);
CREATE INDEX payment_events_purchase ON payment_events (purchase_id);
CREATE TRIGGER payment_events_no_update BEFORE UPDATE ON payment_events
BEGIN SELECT RAISE(ABORT, 'payment_events is append-only'); END;
CREATE TRIGGER payment_events_no_delete BEFORE DELETE ON payment_events
BEGIN SELECT RAISE(ABORT, 'payment_events is append-only'); END;

CREATE TABLE mpp_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER
);
`,
  },
];

/** Commerce database location: LAMBLE_COMMERCE_DB_PATH, else data/commerce.sqlite under the repository root. */
export function commerceDbPath(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const configured = env.LAMBLE_COMMERCE_DB_PATH?.trim();
  return configured ? configured : resolveFromRoot("data", "commerce.sqlite");
}

/** Opens (creating if needed) and migrates the commerce database. */
export function openCommerceDb(file: string = commerceDbPath()): Db {
  const db = openDb(file);
  migrate(db, COMMERCE_MIGRATIONS);
  return db;
}
