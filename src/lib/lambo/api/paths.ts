/**
 * Public API paths, in one place so pages, route handlers, OpenAPI and llms.txt cannot disagree.
 * Free discovery paths describe a resource (identity, coverage, schema, price); paid paths return the bundle.
 */

export const API_BASE = "/api/v1";

export type { ResourceKind } from "../payments/pricing.ts";

const enc = encodeURIComponent;

export const apiPaths = {
  index: () => API_BASE,
  openapi: () => `${API_BASE}/openapi.json`,
  health: () => `${API_BASE}/health`,
  changes: (since = 0) => `${API_BASE}/changes?since=${since}`,
  coins: () => `${API_BASE}/coins`,
  coin: (chain: string, address: string) => `${API_BASE}/coins/${enc(chain)}/${enc(address)}`,
  coinBundle: (chain: string, address: string) => `${API_BASE}/coins/${enc(chain)}/${enc(address)}/bundle`,
  coinHistory: (chain: string, address: string) => `${API_BASE}/coins/${enc(chain)}/${enc(address)}/history`,
  narratives: () => `${API_BASE}/narratives`,
  narrative: (slug: string) => `${API_BASE}/narratives/${enc(slug)}`,
  narrativeBundle: (slug: string) => `${API_BASE}/narratives/${enc(slug)}/bundle`,
  weeks: () => `${API_BASE}/weeks`,
  week: (id: string) => `${API_BASE}/weeks/${enc(id)}`,
  weekDataset: (id: string) => `${API_BASE}/weeks/${enc(id)}/dataset`,
  launchpads: () => `${API_BASE}/launchpads`,
  launchpadsDataset: () => `${API_BASE}/launchpads/dataset`,
  research: () => `${API_BASE}/research`,
  article: (slug: string) => `${API_BASE}/research/${enc(slug)}`,
  articleBundle: (slug: string) => `${API_BASE}/research/${enc(slug)}/bundle`,
} as const;
