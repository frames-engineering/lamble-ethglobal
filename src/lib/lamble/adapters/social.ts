/**
 * Evidence adapters. Social posts and scraped pages are untrusted input: they are stored as evidence records
 * (URL, author, time), never executed, never fetched again from links inside them, and never redistributed
 * as text in paid exports (catalog rights: link-only).
 */
import { parseIso } from "../core/time.ts";
import { type Adapter, emptyOutput } from "./types.ts";

interface Tweet {
  id?: string;
  text?: string;
  created_at?: string;
  author?: { screen_name?: string };
}

const SCREEN_NAME = /^[A-Za-z0-9_]{1,15}$/;
const POST_ID = /^\d{1,25}$/;

export const xSearch: Adapter = {
  key: "x.search",
  normalize(input) {
    const out = emptyOutput();
    const tweets = (input.body as { tweets?: Tweet[] } | null)?.tweets;
    if (!Array.isArray(tweets)) {
      out.warnings.push("no tweets array");
      return out;
    }
    const query = typeof input.request.args.words === "string" ? input.request.args.words : null;
    tweets.forEach((tw, i) => {
      const author = tw.author?.screen_name ?? "";
      const id = tw.id ?? "";
      // The URL is constructed from validated parts, never taken from the body.
      if (!SCREEN_NAME.test(author) || !POST_ID.test(id)) {
        out.warnings.push(`tweet ${i}: invalid id or author`);
        return;
      }
      let createdAt: number | null = null;
      try {
        createdAt = tw.created_at ? parseIso(tw.created_at) : null;
      } catch {
        out.warnings.push(`tweet ${id}: unparseable created_at`);
      }
      out.posts.push({ postId: id, url: `https://x.com/${author}/status/${id}`, author, createdAt, text: String(tw.text ?? ""), query });
    });
    return out;
  },
};

export const firecrawlScrape: Adapter = {
  key: "firecrawl.scrape",
  normalize(input) {
    const out = emptyOutput();
    const url = typeof input.request.args.url === "string" ? input.request.args.url : "";
    let safe = false;
    try {
      safe = new URL(url).protocol === "https:";
    } catch {
      safe = false;
    }
    const body = input.body as { data?: { markdown?: string; metadata?: { title?: string; statusCode?: number } } } | null;
    const markdown = body?.data?.markdown ?? "";
    const status = body?.data?.metadata?.statusCode;
    const usable = safe && markdown.length > 200 && (status === undefined || (status >= 200 && status < 300));
    out.pages.push({
      url,
      title: body?.data?.metadata?.title ?? null,
      usable,
      reason: usable ? undefined : !safe ? "non-https url" : status && status >= 300 ? `status ${status}` : "page too short to be evidence (app shell, bot check or geoblock)",
    });
    return out;
  },
};
