# Editorial policy

## What gets published

| Format | Produced by | Review | Where |
|---|---|---|---|
| Daily facts | `npm run lambo -- research` from the published release | none; labelled "Not reviewed" | everywhere |
| State of the Trenches (weekly) | same, from the latest weekly edition revision | none; labelled "Not reviewed" | everywhere |
| Coin and narrative deep dives | same, chosen deterministically (longest-observed collected coin in a narrative; longest-observed featured narrative) | `pending-review` until a named person reviews | local and preview builds; hidden in production (`VERCEL_ENV=production`, or `LAMBO_HIDE_PENDING_REVIEW=true`) |

All text is filled into fixed templates from release values by code (`src/lib/lambo/research/generate.ts`).
No person writes the articles and no language model drafts them; the attribution on every article says so.
Every paragraph, list item and table row cites the release value, edition value, change event or evidence it
comes from, and the sources list resolves each citation.

## Review

- A review is recorded in the article file: `review.status: "reviewed"`, `reviewer` (the person's name as they
  want it shown) and `reviewedAt`. Nothing else marks an article reviewed; there are no invented bylines.
- Regenerating an article whose text changed resets it to its format's default status, because a review
  covers the text that was reviewed.
- Reviewers check: each figure against its citation, the stated scope (identified coins, not the whole
  market; rolling windows vs calendar weeks), that missing data is described as missing, and that nothing reads
  as a recommendation.

## Language rules

- Claims are attributed: project claims, independent reporting and posts are kept apart. A post is a claim,
  not verification. Membership in a narrative is a classification, not affiliation.
- Missing values are "not available", "insufficient data" or "unavailable" with the reason, never zero.
- The bottoming test describes conditions observed in a drawdown. Never "bottom confirmed", never a forecast or
  a return probability. The forward-evaluation harness makes no performance claim below 30 outcomes.
- Volume is trading volume of identified coins and can include wash or bot trading where turnover is extreme.

## Corrections

A correction is a new release, a new edition revision or a regenerated article with a changelog line; the
earlier version stays retrievable. Silent edits are not allowed.
