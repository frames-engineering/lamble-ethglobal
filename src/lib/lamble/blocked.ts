/**
 * The owner's blocklist (docs/data/blocked.json): sites and coins the website never links to, cites or lists.
 * Releases, editions, articles and the change feed are immutable published files, so the block is applied when
 * service.ts reads them; every page and API response, for every release including older ones, goes through it.
 *
 * - An array entry about a blocked coin or host is dropped: any field equal to a blocked token id, or an
 *   identifying field (id, url, symbol, name, title, label…) that names a blocked host, address or symbol.
 *   An object key equal to a blocked token id is dropped too (bundle and chart maps).
 * - In any other text, the sentences naming a blocked host or coin are removed and REMOVED_NOTE says so. A list
 *   line whose text or summary was entirely about it is dropped.
 * Totals computed before the block (volumes, member counts) are not recomputed here; the next refresh drops the
 * coin at source (scripts/frames-refresh/plan.py refuses blocked hosts and coins).
 */
import { readFileSync } from "node:fs";

import { resolveFromRoot, sha256 } from "./server/io.ts";

export interface Blocklist {
  hosts: { host: string; reason: string; since: string }[];
  tokens: { tokenId: string; symbol: string | null; name: string | null; reason: string; since: string }[];
}

export const REMOVED_NOTE = "(Text about a site or coin Lamble no longer lists was removed.)";

/** Fields that identify what an array entry is about; naming a blocked host or coin in one drops the entry. */
const IDENTIFYING = new Set(["id", "tokenId", "entityId", "intervalId", "evidenceId", "url", "href", "symbol", "name", "title", "label"]);
/** List-line text: an entry whose text is removed entirely is dropped rather than left as a bare note. */
const LINE_TEXT = new Set(["text", "summary"]);
/** Sentence ends: copy often starts a sentence with a lowercase site or coin name, so the next character is not checked. */
const SENTENCE = /(?<=[.!?]["”’)]?)(\s+)/;
const HOST = /^(?=.{1,253}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function parseBlocklist(raw: unknown): Blocklist {
  const doc = raw as Partial<Blocklist>;
  if (!Array.isArray(doc.hosts) || !Array.isArray(doc.tokens)) throw new Error("blocked.json: hosts and tokens must be arrays");
  for (const h of doc.hosts) {
    if (typeof h.host !== "string" || !HOST.test(h.host)) throw new Error(`blocked.json: not a lowercase host name: ${String(h.host)}`);
    if (!h.reason || !h.since) throw new Error(`blocked.json: ${h.host} needs a reason and a since date`);
  }
  for (const t of doc.tokens) {
    if (typeof t.tokenId !== "string" || !/^[a-z0-9-]+:\S+$/.test(t.tokenId)) throw new Error(`blocked.json: not a token id: ${String(t.tokenId)}`);
    if (!t.reason || !t.since) throw new Error(`blocked.json: ${t.tokenId} needs a reason and a since date`);
  }
  return { hosts: doc.hosts, tokens: doc.tokens };
}

export function blocklistPath(): string {
  return resolveFromRoot("docs", "data", "blocked.json");
}

let loaded: { matcher: Matcher; tag: string } | null = null;

/** The deployed blocklist and a short tag that changes with it. A missing or malformed file throws: the block never silently lapses. */
export function deployedBlocklist(): { matcher: Matcher; tag: string } {
  if (loaded) return loaded;
  const raw = readFileSync(blocklistPath(), "utf8");
  loaded = { matcher: compileBlocklist(parseBlocklist(JSON.parse(raw))), tag: sha256(raw).slice(0, 8) };
  return loaded;
}

export function resetBlocklist(): void {
  loaded = null;
}

export interface Matcher {
  /** True when the text names a blocked host (or a subdomain), a blocked token's address, or its symbol or name. */
  mentions(text: string): boolean;
  tokenIds: ReadonlySet<string>;
  empty: boolean;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function compileBlocklist(list: Blocklist): Matcher {
  const hosts = list.hosts.map((h) => h.host.toLowerCase());
  const addresses = list.tokens.map((t) => t.tokenId.slice(t.tokenId.indexOf(":") + 1).toLowerCase());
  const words = list.tokens.flatMap((t) => [t.symbol, t.name]).filter((w): w is string => !!w);
  const word = words.length ? new RegExp(`(?<![A-Za-z0-9_])\\$?(?:${words.map(escape).join("|")})(?![A-Za-z0-9_])`, "i") : null;
  return {
    mentions(text) {
      const lower = text.toLowerCase();
      return hosts.some((h) => lower.includes(h)) || addresses.some((a) => lower.includes(a)) || (word?.test(text) ?? false);
    },
    tokenIds: new Set(list.tokens.map((t) => t.tokenId)),
    empty: hosts.length === 0 && list.tokens.length === 0,
  };
}

/** Text without the sentences that name a blocked host or coin, plus REMOVED_NOTE; "" when every sentence did. */
export function scrubText(text: string, m: Matcher): string {
  if (!m.mentions(text)) return text;
  const parts = text.split(SENTENCE);
  const kept: string[] = [];
  for (let i = 0; i < parts.length; i += 2) if (!m.mentions(parts[i]!)) kept.push(parts[i]!);
  return kept.length ? `${kept.join(" ")} ${REMOVED_NOTE}` : "";
}

const DROP = Symbol("drop");

function identifies(o: Record<string, unknown>, m: Matcher): boolean {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== "string") continue;
    if (m.tokenIds.has(v) || (IDENTIFYING.has(k) && m.mentions(v))) return true;
  }
  return false;
}

function scrubNode(value: unknown, m: Matcher, inArray: boolean): unknown {
  if (typeof value === "string") {
    if (m.tokenIds.has(value)) return inArray ? DROP : REMOVED_NOTE;
    const t = scrubText(value, m);
    return t === "" ? (inArray ? DROP : REMOVED_NOTE) : t;
  }
  if (Array.isArray(value)) return value.map((x) => scrubNode(x, m, true)).filter((x) => x !== DROP);
  if (value === null || typeof value !== "object") return value;
  const o = value as Record<string, unknown>;
  if (inArray && identifies(o, m)) return DROP;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (m.tokenIds.has(k) || m.mentions(k)) continue;
    if (typeof v === "string" && inArray && LINE_TEXT.has(k) && scrubText(v, m) === "") return DROP;
    out[k] = scrubNode(v, m, false);
  }
  return out;
}

/** A copy of a published document without the blocked hosts and coins; the same object when nothing names them. */
export function scrubBlocked<T>(doc: T, m: Matcher = deployedBlocklist().matcher): T {
  if (m.empty || !m.mentions(JSON.stringify(doc))) return doc;
  return scrubNode(doc, m, false) as T;
}
