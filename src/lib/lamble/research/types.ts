/**
 * Research article contract (content/research/<slug>.json). Articles are generated from one release by
 * scripts/lamble/research.ts: every number in an article is copied from the release by code, never typed, and
 * each block cites the release paths or evidence ids it came from. Text is plain text; pages never render HTML
 * from an article.
 */

export const ARTICLE_SCHEMA = "lamble.article.v1";

export type ArticleFormat = "daily" | "weekly" | "coin-deep-dive" | "narrative-deep-dive";

/** A citation: an evidence id from the release, or a data path inside a release ("release:<id>#/coins/<tokenId>/market/price"). */
export type Citation = string;

export type ArticleBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string; cites: Citation[] }
  | { type: "list"; items: { text: string; cites: Citation[] }[] }
  | { type: "facts"; caption: string; rows: { label: string; value: string; note: string | null; cite: Citation }[] }
  | { type: "callout"; tone: "neutral" | "warning"; text: string }
  /** A series copied from the release; each series cites the release value it equals exactly (checked before publishing). */
  | { type: "chart"; caption: string; format: "usd" | "price" | "count" | "ratio"; series: { label: string; cite: Citation; points: { time: number; value: number | null }[] }[] };

export interface Article {
  schemaVersion: typeof ARTICLE_SCHEMA;
  slug: string;
  title: string;
  dek: string;
  format: ArticleFormat;
  publishedAt: string;
  updatedAt: string;
  dataCutoff: string;
  releaseId: string;
  /** Review is a recorded fact: reviewer and time are null until a named person reviews. Nothing is implied. */
  review: { status: "auto-published" | "pending-review" | "reviewed"; reviewer: string | null; reviewedAt: string | null; policy: string };
  attribution: { producer: string; drafting: string; byline: null | string };
  entities: { coins: string[]; narratives: string[]; weeks: string[]; launchpads: string[] };
  confidence: "low" | "moderate" | "high";
  confidenceReason: string;
  body: ArticleBlock[];
  limitations: string[];
  generator: { name: string; version: string; inputSha256: string };
  changelog: { at: string; summary: string }[];
}
