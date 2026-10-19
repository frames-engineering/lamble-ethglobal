/**
 * Citation helpers shared by the article generator and the article page. A citation is one of:
 *   release:<releaseId>#/<json pointer>    a value inside a published release's public data
 *   edition:<weekId>/r<n>#/<json pointer>  a value inside a weekly edition revision
 *   <evidence id>                          an entry in the release's evidence index
 */
import type { Evidence } from "../release/types.ts";

export function releaseCite(releaseId: string, ...pointer: (string | number)[]): string {
  return `release:${releaseId}#/${pointer.map((p) => String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}

export function editionCite(week: string, revision: number, ...pointer: (string | number)[]): string {
  return `edition:${week}/r${revision}#/${pointer.map((p) => String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}

function unescape(segment: string): string {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

export interface ResolvedCitation {
  kind: "release" | "edition" | "evidence" | "unknown";
  label: string;
  href: string | null;
  external: boolean;
  raw: string;
}

/** Maps a citation to a label and an internal page (or the evidence's own https URL). */
export function resolveCitation(c: string, evidence: Record<string, Evidence>): ResolvedCitation {
  const rel = /^release:(rel-[0-9TZ]+-[0-9a-f]{8})#\/(.*)$/.exec(c);
  if (rel) {
    const parts = rel[2]!.split("/").map(unescape);
    const [collection, id] = parts;
    let href: string | null = null;
    if (collection === "coins" && id) {
      const i = id.indexOf(":");
      href = i > 0 ? `/coins/${id.slice(0, i)}/${id.slice(i + 1)}` : null;
    } else if (collection === "narratives" && id) href = `/narratives/${id}`;
    else if (collection === "launchpads" && id) href = `/launchpads/${id}`;
    else if (collection === "market") href = "/market";
    return { kind: "release", label: `${rel[1]} · ${parts.join(" › ")}`, href, external: false, raw: c };
  }
  const ed = /^edition:(\d{4}-W\d{2})\/r(\d+)#\/(.*)$/.exec(c);
  if (ed) {
    return { kind: "edition", label: `${ed[1]} r${ed[2]} · ${ed[3]!.split("/").map(unescape).join(" › ")}`, href: `/market/${ed[1]}?revision=${ed[2]}`, external: false, raw: c };
  }
  const e = evidence[c];
  if (e) return { kind: "evidence", label: e.label, href: e.url, external: e.url !== null, raw: c };
  return { kind: "unknown", label: c, href: null, external: false, raw: c };
}
