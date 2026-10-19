import type { ArticleFormat } from "@/lib/lambo/research/types";

export const FORMAT_LABEL: Record<ArticleFormat, string> = {
  daily: "Daily facts",
  weekly: "State of the Trenches",
  "coin-deep-dive": "Coin deep dive",
  "narrative-deep-dive": "Narrative deep dive",
};

export const REVIEW_LABEL = {
  "auto-published": "Not reviewed",
  "pending-review": "Pending review",
  reviewed: "Reviewed",
} as const;
