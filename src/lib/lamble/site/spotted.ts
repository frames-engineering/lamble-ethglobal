/**
 * Just spotted: what the hourly scout (scripts/frames-refresh/scout.py, docs/prompts/scout.md) found since the daily
 * refresh, read from data/live/spotted.json. Server-only.
 *
 * Public: new coins (observations: a covered launchpad, a first pool at most newCoinHours old, the member bar met
 * without a quarantine flag) and theme clusters whose story a public post backs (confirmed) or that a tracked narrative
 * covers (tracked). Unchecked, deferred and rejected clusters stay in the file only so the scout does not pay for the
 * same theme twice; they are never shown.
 *
 * The file is data written every hour by an agent, so it is read defensively: a missing, malformed or stale file
 * hides the section and never breaks a build, entries that do not parse are dropped one by one, and the owner's
 * blocklist (src/lib/lamble/blocked.ts) is applied on read like every other published file.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { scrubBlocked } from "../blocked.ts";
import { resolveFromRoot } from "../server/io.ts";

export const SPOTTED_SCHEMA = "lamble-spotted-v1";
/** Three missed hourly runs: older than this, the section says the scout has paused instead of listing old finds. */
export const SPOTTED_STALE_SECONDS = 3 * 3600;

export interface SpottedCoin {
  tokenId: string;
  chain: string;
  address: string;
  name: string;
  symbol: string;
  launchpadSlug: string;
  poolCreatedAt: string | null;
  /** Hours since the coin's first pool, at the scout run. */
  ageHours: number;
  volume24Usd: number;
  mcapUsd: number | null;
  firstSpottedAt: string;
  leadIds: string[];
}

export interface SpottedSource {
  postId: string;
  url: string;
  author: string;
  authorName: string;
  createdAt: string | null;
  text: string;
}

export interface SpottedLead {
  id: string;
  keyword: string;
  status: "confirmed" | "tracked";
  size: number;
  combinedVolume24Usd: number;
  launchpads: string[];
  members: { tokenId: string; symbol: string; name: string; volume24Usd: number; launchpadSlug: string | null }[];
  firstSpottedAt: string;
  lastSeenAt: string;
  checkedAt: string | null;
  /** Confirmed leads: a short name for the story and what the cited posts say, attributed. */
  title: string | null;
  sourceSays: string | null;
  sources: SpottedSource[];
  /** Tracked leads: the narrative that covers the theme. */
  narrativeSlug: string | null;
  narrativeTitle: string | null;
}

export interface Spotted {
  generatedAt: string;
  scoutRun: string;
  /** Seconds between the scout run and `now` (the build, for prerendered pages). */
  ageSeconds: number;
  stale: boolean;
  rules: { newCoinHours: number; memberBar: { minVolume24Usd: number; minMcapUsd: number }; newNarrative: { minConstituents: number; minCombinedVolume24Usd: number } };
  coins: SpottedCoin[];
  leads: SpottedLead[];
}

export function spottedPath(): string {
  return process.env.LAMBLE_LIVE_DIR ? path.join(path.resolve(process.env.LAMBLE_LIVE_DIR), "spotted.json") : resolveFromRoot("data", "live", "spotted.json");
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const time = (v: unknown): v is string => str(v) && !Number.isNaN(Date.parse(v));
const strOrNull = (v: unknown) => (str(v) ? v : null);
const https = (v: unknown): v is string => {
  if (!str(v)) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
};

function coin(v: unknown): SpottedCoin | null {
  if (!isObj(v)) return null;
  const { tokenId, chain, address, name, symbol, launchpadSlug, poolCreatedAt, ageHours, volume24Usd, mcapUsd, firstSpottedAt, leadIds } = v;
  if (!str(tokenId) || !str(chain) || !str(address) || !str(symbol) || !str(launchpadSlug) || !num(ageHours) || !num(volume24Usd) || !time(firstSpottedAt)) return null;
  return {
    tokenId,
    chain,
    address,
    name: typeof name === "string" ? name : "",
    symbol,
    launchpadSlug,
    poolCreatedAt: time(poolCreatedAt) ? poolCreatedAt : null,
    ageHours,
    volume24Usd,
    mcapUsd: num(mcapUsd) ? mcapUsd : null,
    firstSpottedAt,
    leadIds: Array.isArray(leadIds) ? leadIds.filter(str) : [],
  };
}

function source(v: unknown): SpottedSource | null {
  if (!isObj(v) || !str(v.postId) || !https(v.url) || !str(v.author)) return null;
  return { postId: v.postId, url: v.url, author: v.author, authorName: str(v.authorName) ? v.authorName : v.author, createdAt: time(v.createdAt) ? v.createdAt : null, text: typeof v.text === "string" ? v.text : "" };
}

function lead(v: unknown): SpottedLead | null {
  if (!isObj(v) || (v.status !== "confirmed" && v.status !== "tracked")) return null;
  if (!str(v.id) || !str(v.keyword) || !num(v.combinedVolume24Usd) || !time(v.firstSpottedAt) || !time(v.lastSeenAt) || !Array.isArray(v.members)) return null;
  const members = v.members.flatMap((m) => (isObj(m) && str(m.tokenId) && str(m.symbol) && num(m.volume24Usd) ? [{ tokenId: m.tokenId, symbol: m.symbol, name: typeof m.name === "string" ? m.name : "", volume24Usd: m.volume24Usd, launchpadSlug: strOrNull(m.launchpadSlug) }] : []));
  const sources = (Array.isArray(v.sources) ? v.sources : []).map(source).filter((s): s is SpottedSource => s !== null);
  const out: SpottedLead = {
    id: v.id,
    keyword: v.keyword,
    status: v.status,
    size: members.length,
    combinedVolume24Usd: v.combinedVolume24Usd,
    launchpads: Array.isArray(v.launchpads) ? v.launchpads.filter(str) : [],
    members,
    firstSpottedAt: v.firstSpottedAt,
    lastSeenAt: v.lastSeenAt,
    checkedAt: time(v.checkedAt) ? v.checkedAt : null,
    title: strOrNull(v.title),
    sourceSays: strOrNull(v.sourceSays),
    sources,
    narrativeSlug: strOrNull(v.narrativeSlug),
    narrativeTitle: strOrNull(v.narrativeTitle),
  };
  // A confirmed story is shown only with what its sources say and at least one source left after the blocklist.
  if (out.status === "confirmed" && (!out.title || !out.sourceSays || out.sources.length === 0)) return null;
  if (out.status === "tracked" && (!out.narrativeSlug || !out.narrativeTitle)) return null;
  return out.members.length ? out : null;
}

/**
 * One card per tracked narrative: the daily run often splits a story into several overlapping themes (a word, a
 * ticker, a spelling), and each would otherwise repeat the same narrative. Members are de-duplicated and the combined
 * volume is recomputed over the distinct coins.
 */
export function mergeTracked(leads: SpottedLead[]): SpottedLead[] {
  const out: SpottedLead[] = [];
  const byNarrative = new Map<string, SpottedLead>();
  for (const l of leads) {
    if (l.status !== "tracked") {
      out.push(l);
      continue;
    }
    const prev = byNarrative.get(l.narrativeSlug!);
    if (!prev) {
      const first = { ...l, members: [...l.members], launchpads: [...l.launchpads] };
      byNarrative.set(l.narrativeSlug!, first);
      out.push(first);
      continue;
    }
    const seen = new Set(prev.members.map((m) => m.tokenId));
    for (const m of l.members) if (!seen.has(m.tokenId)) prev.members.push(m);
    prev.members.sort((a, b) => b.volume24Usd - a.volume24Usd);
    prev.size = prev.members.length;
    prev.combinedVolume24Usd = prev.members.reduce((a, m) => a + m.volume24Usd, 0);
    prev.launchpads = [...new Set([...prev.launchpads, ...l.launchpads])].sort();
    prev.id = `${prev.id}+${l.id}`;
    if (l.firstSpottedAt < prev.firstSpottedAt) prev.firstSpottedAt = l.firstSpottedAt;
    if (l.lastSeenAt > prev.lastSeenAt) prev.lastSeenAt = l.lastSeenAt;
  }
  return out;
}

/** The public part of a spotted.json document, or null when it is not one. `now` is unix seconds. */
export function parseSpotted(raw: unknown, now: number): Spotted | null {
  if (!isObj(raw) || raw.schema !== SPOTTED_SCHEMA || !time(raw.generatedAt) || !str(raw.scoutRun) || !Array.isArray(raw.coins) || !Array.isArray(raw.leads) || !isObj(raw.rules)) return null;
  const r = raw.rules;
  const bar = isObj(r.memberBar) ? r.memberBar : {};
  const nn = isObj(r.newNarrative) ? r.newNarrative : {};
  if (!num(r.newCoinHours) || !num(bar.minVolume24Usd) || !num(bar.minMcapUsd) || !num(nn.minConstituents) || !num(nn.minCombinedVolume24Usd)) return null;
  const ageSeconds = Math.max(0, now - Date.parse(raw.generatedAt) / 1000);
  return {
    generatedAt: raw.generatedAt,
    scoutRun: raw.scoutRun,
    ageSeconds,
    stale: ageSeconds > SPOTTED_STALE_SECONDS,
    rules: { newCoinHours: r.newCoinHours, memberBar: { minVolume24Usd: bar.minVolume24Usd, minMcapUsd: bar.minMcapUsd }, newNarrative: { minConstituents: nn.minConstituents, minCombinedVolume24Usd: nn.minCombinedVolume24Usd } },
    coins: raw.coins.map(coin).filter((c): c is SpottedCoin => c !== null).sort((a, b) => b.volume24Usd - a.volume24Usd),
    leads: mergeTracked(raw.leads.map(lead).filter((l): l is SpottedLead => l !== null)),
  };
}

/** What the scout last published, with the blocklist applied; null when there is no usable file. */
export function loadSpotted(now: number = Date.now() / 1000): Spotted | null {
  const file = spottedPath();
  if (!existsSync(file)) return null;
  try {
    const doc = JSON.parse(readFileSync(file, "utf8")) as Obj;
    delete doc.seen; // first-spotted memory for the scout, not published content
    return parseSpotted(scrubBlocked(doc), now);
  } catch (err) {
    console.warn(`spotted: ${file} is not usable (${(err as Error).message}); the Just spotted section is hidden.`);
    return null;
  }
}
