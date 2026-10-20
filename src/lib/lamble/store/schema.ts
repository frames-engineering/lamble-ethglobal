/**
 * Observation store schema (data/lamble.sqlite). Derived from retained research runs and rebuildable:
 * deleting the file and re-running `npm run lamble -- ingest` reproduces it. Purchases live in a separate
 * commerce store (src/lib/lamble/payments/schema.ts) that is never rebuilt.
 *
 * Times are unix seconds UTC. Three times are kept apart on every observation:
 *   event_time   the source's own time for the value (bar start, day start, provider as-of), NULL if none
 *   fetched_at   when LAMBLE's collection received it
 *   available_at when the observation became durable and public (first commit of the run, or the run start
 *                when uncommitted); "as known then" views filter on it
 */
import type { Migration } from "./sqlite.ts";

export const PIPELINE_MIGRATIONS: Migration[] = [
  {
    id: "0001_observation_store",
    sql: `
CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  version TEXT,
  kind TEXT NOT NULL,
  runtime_at INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  available_basis TEXT NOT NULL CHECK (available_basis IN ('git-commit', 'first-ingest', 'runtime')),
  financial_anchor INTEGER,
  chart_anchor INTEGER,
  activity_as_of INTEGER,
  passed INTEGER,
  credits_charged INTEGER,
  frames_runs_json TEXT,
  manifest_sha256 TEXT NOT NULL,
  ingested_at INTEGER NOT NULL,
  ingest_version TEXT NOT NULL,
  warnings_json TEXT
);

CREATE TABLE frames_calls (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  batch TEXT NOT NULL,
  seq INTEGER NOT NULL,
  frames_run_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  capability TEXT,
  args_json TEXT NOT NULL,
  delivered INTEGER NOT NULL,
  outcome TEXT,
  used INTEGER NOT NULL,
  response_ref TEXT NOT NULL,
  response_sha256 TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (run_id, batch, seq)
);

CREATE TABLE evidence (
  evidence_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('frames-call', 'x-post', 'page', 'curated-source', 'legacy')),
  route TEXT NOT NULL,
  upstream TEXT,
  run_id TEXT,
  batch TEXT,
  seq INTEGER,
  capability TEXT,
  url TEXT,
  title TEXT,
  author TEXT,
  source_event_time INTEGER,
  fetched_at INTEGER,
  available_at INTEGER,
  response_ref TEXT,
  extraction_path TEXT,
  sha256 TEXT,
  limitations_json TEXT
);

CREATE TABLE tokens (
  token_id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  display_address TEXT NOT NULL,
  name TEXT,
  symbol TEXT,
  description TEXT,
  origin_venue TEXT,
  origin_status TEXT,
  source_launchpad TEXT,
  token_created_at INTEGER,
  token_created_basis TEXT,
  first_observed_at INTEGER NOT NULL,
  first_observed_run TEXT NOT NULL,
  first_available_at INTEGER NOT NULL,
  evidence_ids_json TEXT,
  UNIQUE (chain, address)
);

CREATE TABLE token_names (
  token_id TEXT NOT NULL REFERENCES tokens(token_id),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  first_seen_run TEXT NOT NULL,
  PRIMARY KEY (token_id, name, symbol)
);

CREATE TABLE pools (
  pool_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES tokens(token_id),
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  kind TEXT NOT NULL,
  pool_created_at INTEGER,
  first_observed_at INTEGER NOT NULL,
  first_observed_run TEXT NOT NULL
);

CREATE TABLE observations (
  obs_id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  window_start INTEGER,
  window_end INTEGER,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  event_time INTEGER,
  observed_at INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  evidence_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  extraction TEXT NOT NULL,
  transform_version TEXT NOT NULL,
  revision_of INTEGER REFERENCES observations(obs_id),
  population TEXT,
  delivery TEXT NOT NULL CHECK (delivery IN ('delivered', 'refunded-validated'))
);
-- One row per key per run; windowed keys only get a new row when the value changes (a revision).
CREATE UNIQUE INDEX observations_key ON observations (entity_type, entity_id, metric, COALESCE(window_start, -1), COALESCE(window_end, -1), run_id);
CREATE INDEX observations_series ON observations (entity_type, entity_id, metric, window_start, available_at);
CREATE INDEX observations_run ON observations (run_id);

CREATE TABLE posts (
  post_id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER,
  text TEXT NOT NULL,
  query TEXT,
  first_seen_run TEXT NOT NULL,
  first_available_at INTEGER NOT NULL,
  evidence_id TEXT NOT NULL
);

CREATE TABLE venues (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_slug TEXT NOT NULL,
  indexed_provider_ids_json TEXT NOT NULL,
  latest_run TEXT NOT NULL,
  presentation_json TEXT NOT NULL
);

CREATE TABLE fee_policy (
  run_id TEXT PRIMARY KEY REFERENCES runs(run_id),
  included_json TEXT NOT NULL,
  excluded_json TEXT NOT NULL,
  scope TEXT NOT NULL
);

CREATE TABLE narratives (
  narrative_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT,
  first_observed_at INTEGER NOT NULL,
  first_observed_run TEXT NOT NULL
);

CREATE TABLE narrative_versions (
  narrative_id TEXT NOT NULL REFERENCES narratives(narrative_id),
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  available_at INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  story_status_json TEXT,
  provenance_json TEXT,
  signals_json TEXT,
  volume_scope TEXT,
  PRIMARY KEY (narrative_id, run_id)
);

-- Lifecycle is separate from featured placement and collection priority.
CREATE TABLE narrative_lifecycle (
  narrative_id TEXT NOT NULL REFERENCES narratives(narrative_id),
  state TEXT NOT NULL CHECK (state IN ('collected', 'collection_paused', 'retired')),
  from_at INTEGER NOT NULL,
  to_at INTEGER,
  recorded_at INTEGER NOT NULL,
  reason TEXT,
  source TEXT NOT NULL,
  PRIMARY KEY (narrative_id, from_at)
);

-- Which narratives a run collected and featured (homepage cap), in display order.
CREATE TABLE featured (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  narrative_id TEXT NOT NULL REFERENCES narratives(narrative_id),
  rank INTEGER NOT NULL,
  PRIMARY KEY (run_id, narrative_id)
);

CREATE TABLE memberships (
  interval_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  narrative_id TEXT NOT NULL REFERENCES narratives(narrative_id),
  token_id TEXT NOT NULL REFERENCES tokens(token_id),
  effective_from INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL,
  effective_to INTEGER,
  close_recorded_at INTEGER,
  -- factual_exit: evidence contradicts membership (effective_to set).
  -- collection_paused: the narrative stopped being collected (cap replacement); membership stays open.
  -- inactive: the coin was archived for inactivity; membership stays open, collection stopped.
  close_kind TEXT CHECK (close_kind IS NULL OR close_kind IN ('factual_exit', 'collection_paused', 'inactive')),
  close_reason TEXT,
  observed_through INTEGER,
  basis TEXT NOT NULL,
  rationale TEXT,
  evidence_ids_json TEXT,
  confidence TEXT,
  method_version TEXT
);
CREATE INDEX memberships_token ON memberships (token_id);
CREATE INDEX memberships_narrative ON memberships (narrative_id);

CREATE TABLE curation_decisions (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  narrative_id TEXT,
  reason TEXT,
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY (run_id, kind, subject_id)
);

CREATE TABLE releases (
  release_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('staged', 'published', 'rejected', 'superseded')),
  data_cutoff INTEGER NOT NULL,
  source_runs_json TEXT NOT NULL,
  method_versions_json TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  published_at INTEGER,
  rejected_reason TEXT,
  validation_json TEXT
);

CREATE TABLE signal_episodes (
  episode_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES tokens(token_id),
  method_version TEXT NOT NULL,
  opened_at INTEGER NOT NULL,
  peak_time INTEGER NOT NULL,
  peak_price REAL NOT NULL,
  low_time INTEGER,
  low_price REAL,
  stage INTEGER NOT NULL,
  state TEXT NOT NULL,
  first_release_id TEXT NOT NULL,
  last_release_id TEXT NOT NULL,
  closed_at INTEGER,
  close_reason TEXT
);

CREATE TABLE job_runs (
  job TEXT NOT NULL,
  run_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  checkpoint_json TEXT,
  error TEXT,
  PRIMARY KEY (job, run_key)
);
`,
  },
  {
    // Inputs for holder analysis and the bottoming test. Rows keep their source population: a top-holder or
    // FOMO-user panel is never stored as all holders, and a recent-trades tape is complete only inside the
    // span it covers (trade_coverage).
    id: "0002_holder_inputs",
    sql: `
CREATE TABLE token_events (
  capability TEXT NOT NULL,
  source_id TEXT NOT NULL,
  class TEXT NOT NULL CHECK (class IN ('trade', 'transfer', 'pinned_post', 'social', 'listing', 'other')),
  type TEXT NOT NULL,
  token_id TEXT,
  event_time INTEGER,
  side TEXT CHECK (side IN ('buy', 'sell')),
  usd REAL,
  amount REAL,
  wallet TEXT,
  population TEXT NOT NULL,
  first_seen_run TEXT NOT NULL REFERENCES runs(run_id),
  available_at INTEGER NOT NULL,
  evidence_id TEXT NOT NULL,
  extraction TEXT NOT NULL,
  PRIMARY KEY (capability, source_id)
);
CREATE INDEX token_events_token ON token_events (token_id, event_time);

CREATE TABLE trade_coverage (
  evidence_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  from_time INTEGER NOT NULL,
  to_time INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  PRIMARY KEY (evidence_id, token_id),
  CHECK (to_time >= from_time)
);

CREATE TABLE holder_panels (
  panel_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  population TEXT NOT NULL CHECK (population IN ('top_holders_sample', 'fomo_users', 'all_holders')),
  complete INTEGER NOT NULL CHECK (complete IN (0, 1)),
  observed_at INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  evidence_id TEXT NOT NULL,
  extraction TEXT NOT NULL,
  row_count INTEGER NOT NULL
);
CREATE INDEX holder_panels_token ON holder_panels (token_id, observed_at);

CREATE TABLE balance_checkpoints (
  panel_id TEXT NOT NULL REFERENCES holder_panels(panel_id),
  wallet TEXT NOT NULL,
  amount REAL,
  value_usd REAL,
  cost_basis_usd REAL,
  is_developer INTEGER,
  PRIMARY KEY (panel_id, wallet)
);

CREATE TABLE candles (
  token_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  resolution_seconds INTEGER NOT NULL,
  start INTEGER NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume_usd REAL,
  measure TEXT NOT NULL CHECK (measure = 'price_usd'),
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  available_at INTEGER NOT NULL,
  evidence_id TEXT NOT NULL,
  PRIMARY KEY (token_id, capability, resolution_seconds, start, run_id)
);

CREATE TABLE address_labels (
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  class TEXT NOT NULL CHECK (class IN ('pool', 'burn', 'custody', 'lockup', 'program', 'contract', 'cluster_heuristic')),
  verified INTEGER NOT NULL CHECK (verified IN (0, 1)),
  source TEXT NOT NULL,
  evidence TEXT NOT NULL,
  available_at INTEGER NOT NULL,
  PRIMARY KEY (chain, address, class, source)
);
`,
  },
  {
    // Pump's holder route lists pump.fun accounts' positions, a population of its own (2026-10-20 samples).
    id: "0003_pump_users_population",
    sql: `
CREATE TABLE holder_panels_next (
  panel_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  population TEXT NOT NULL CHECK (population IN ('top_holders_sample', 'fomo_users', 'pump_users', 'all_holders')),
  complete INTEGER NOT NULL CHECK (complete IN (0, 1)),
  observed_at INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  evidence_id TEXT NOT NULL,
  extraction TEXT NOT NULL,
  row_count INTEGER NOT NULL
);
INSERT INTO holder_panels_next SELECT * FROM holder_panels;
DROP INDEX holder_panels_token;
PRAGMA defer_foreign_keys = ON;
DROP TABLE holder_panels;
ALTER TABLE holder_panels_next RENAME TO holder_panels;
CREATE INDEX holder_panels_token ON holder_panels (token_id, observed_at);
`,
  },
];
