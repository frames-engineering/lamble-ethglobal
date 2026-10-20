/**
 * Citation checks shared by the publishing gate (scripts/lamble/research.ts), the article page, the API bundle
 * and the tests: every citation must resolve in the release, edition or change feed it names, and every chart
 * series must equal the release value it cites. An article that fails is not written.
 */
import type { Evidence } from "../release/types.ts";
import { type LoadedRelease, allChanges, getEdition, loadRelease } from "../service.ts";
import type { Article } from "./types.ts";

const unescape = (s: string) => s.replaceAll("~1", "/").replaceAll("~0", "~");

function walk(cur: unknown, parts: string[]): { found: boolean; value?: unknown } {
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return { found: false };
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur === undefined ? { found: false } : { found: true, value: cur };
}

/** Resolves a release citation to the value it points at in that release's public data. */
export function resolveReleaseValue(citation: string): { found: boolean; value?: unknown; releaseId?: string } {
  const m = /^release:(rel-[0-9TZ]+-[0-9a-f]{8})#\/(.*)$/.exec(citation);
  if (!m) return { found: false };
  let r: LoadedRelease;
  try {
    r = loadRelease(m[1]!);
  } catch {
    return { found: false, releaseId: m[1] };
  }
  const [head, key, ...rest] = m[2]!.split("/").map(unescape);
  let root: unknown;
  if (head === "coins") root = r.coins.get(key ?? "");
  else if (head === "narratives") root = r.narratives.get(key ?? "");
  else if (head === "launchpads") root = r.launchpads.get(key ?? "");
  else {
    root = (r.data as unknown as Record<string, unknown>)[head ?? ""];
    if (key !== undefined) rest.unshift(key);
  }
  if (root === undefined) return { found: false, releaseId: m[1] };
  return { ...walk(root, rest), releaseId: m[1] };
}

/** Resolves an edition citation (edition:<week>/r<n>#/<pointer>). */
export function resolveEditionValue(citation: string): { found: boolean; value?: unknown } {
  const m = /^edition:(\d{4}-W\d{2})\/r(\d+)#\/(.*)$/.exec(citation);
  if (!m) return { found: false };
  try {
    return walk(getEdition(m[1]!, Number(m[2])), m[3]!.split("/").map(unescape));
  } catch {
    return { found: false };
  }
}

export function articleCitations(a: Pick<Article, "body">): string[] {
  const out: string[] = [];
  for (const b of a.body) {
    if (b.type === "p") out.push(...b.cites);
    if (b.type === "list") for (const i of b.items) out.push(...i.cites);
    if (b.type === "facts") for (const r of b.rows) out.push(r.cite);
    if (b.type === "chart") for (const s of b.series) out.push(s.cite);
  }
  return out;
}

export interface CitationProblem {
  cite: string;
  problem: string;
}

/** Every unresolved citation and every chart series that differs from its cited value. Empty means publishable. */
export function validateArticle(a: Pick<Article, "body" | "releaseId">, changes: ReadonlySet<string> = new Set(allChanges().map((e) => `change:${e.seq}`))): CitationProblem[] {
  const problems: CitationProblem[] = [];
  let evidence: Record<string, Evidence> = {};
  try {
    evidence = loadRelease(a.releaseId).data.evidence;
  } catch {
    problems.push({ cite: a.releaseId, problem: "the article's release is not available" });
  }
  const cites = articleCitations(a);
  if (!cites.length) problems.push({ cite: "", problem: "the article cites nothing" });
  for (const c of cites) {
    const ok = c.startsWith("release:") ? resolveReleaseValue(c).found : c.startsWith("edition:") ? resolveEditionValue(c).found : c.startsWith("change:") ? changes.has(c) : Boolean(evidence[c]);
    if (!ok) problems.push({ cite: c, problem: "does not resolve" });
  }
  for (const b of a.body) {
    if (b.type !== "chart") continue;
    for (const s of b.series) {
      const v = resolveReleaseValue(s.cite);
      if (v.found && JSON.stringify(v.value) !== JSON.stringify(s.points)) problems.push({ cite: s.cite, problem: `chart series "${s.label}" differs from the cited release value` });
      if (!s.cite.startsWith("release:")) problems.push({ cite: s.cite, problem: "chart series must cite a release value" });
    }
  }
  return problems;
}
