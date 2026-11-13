# LAMBLE hourly scout

The daily refresh (`docs/prompts/refresh-market-data.md`) finds new coins and narratives once a day, so a story that
starts at 09:00 UTC reached the site the next morning. The scout closes that gap. Every hour it re-runs the cheap
part of discovery (the launchpad sweep and token names), groups candidates into themes exactly as the daily run
does, pays for an X search only for themes nobody has decided yet, and publishes what it found to
`data/live/spotted.json`. The home page shows it as **Live Monitor**.

The scout does **not** collect fees, bars or panels, and it never changes narrative membership. The registry, the
releases and the narratives stay the daily run's job; the daily run reads the scout's confirmed leads first.

## What is public, and why

| In `spotted.json` | Shown on the site | Why |
|---|---|---|
| New coins: covered launchpad, first pool at most `newCoinHours` (24) old, the `addMember` bar met, no quarantine flag, not tracked, not blocked | yes | Observations from the sweep. |
| `confirmed` theme: a post about the story was found in this run's searches | yes, with the posts | A post is a claim, not verification, so the card says "Posts say…" and links them. |
| `tracked` theme: a tracked narrative covers it (daily decision, or most of its coins joined) | yes, linked to the narrative | Its coins share a tracked story; the daily run decides membership. |
| `spotted` (not checked yet), `deferred`, `rejected` | no | A word shared by coin names is a lead, not a story. 75% of daily clusters (2026-10-20..11-12) were rejected. Kept only so the same theme is not paid for again. |

Settings live in the registry (`discovery.scout`) and budgets in `docs/data/jobs.json` (job `scout`).

## Budget

- **Per run:** at most `maxCreditsPerRun` (100). The worst case, 4 sweep calls, 1 names call, 3 story searches
  and 2 follow-ups at catalog prices, is about 85; a run with nothing new to check costs about 31.
- **Per day:** at most `maxCreditsPerDay` (2,500), summed across the day's scout runs in
  `data/live/scout-ledger.json`. `scout.py start` refuses to start a run the day's remainder cannot cover.
- **Every paid batch counts**, published or not: `publish` and `record` both add the run's billed credits to the
  ledger, and a run that stops after a paid call ships its raw files and the ledger without `spotted.json`. A
  session that dies before it can commit loses that record; the account floor below still bounds total spend.
- **Account floor:** the routine prompt checks `frames_get_usage` first, as the daily routine does.

Typical day: 24 runs × 20–32 credits (the sweep and names calls billed 20–32 in the November daily runs) plus a few story checks at about 11 credits each: roughly 600–1,000 credits ($0.60–1.00).

## Procedure

Run from the repository root, on a fresh branch from the latest `main`. Frames batches are called and saved
exactly as in the daily routine: invoke each `raw/<batch>-request.json` with `frames_invoke_tools`, passing
`calls`, `idempotency_key`, `max_usd` and `search_ids` unchanged; poll `frames_get_run` until `completed`; save with
`python3 scripts/frames-refresh/save.py <run_id> $RUN/raw/<batch>.json`. Never transcribe bodies.

1. **Start.** `python3 scripts/frames-refresh/scout.py start`. It prints the run directory (`RUN`); exit 1 means
   the day's scout budget is spent: stop, publish nothing, report it.
2. **Sweep.** Call and save `d1`. Then `python3 scripts/frames-refresh/scout.py names $RUN`; call and save `d2`.
3. **Check.** `python3 scripts/frames-refresh/scout.py check $RUN`. It prints the themes to decide (each with its
   coins, launchpads, pool ages and descriptions, and its search `e1:<seq>`) and writes `raw/e1-request.json` when
   there is at least one. No themes to decide: go to step 5 with no `decisions.json`.
4. **Decide.** Call and save `e1`. Read every post the search returned for each theme. Optionally, when a decision
   needs it, `python3 scripts/frames-refresh/scout.py followups $RUN "<query>" ["<query>"]` (at most two
   searches, for example the coin's own handle or the story's subject without the ticker); call and save `e2`.
   Write `$RUN/decisions.json` with one entry per theme `check` listed (rules below).
5. **Publish.** `python3 scripts/frames-refresh/scout.py publish $RUN`. It validates the decisions against the saved
   posts and writes `data/live/spotted.json` and `data/live/scout-ledger.json`. A refusal names what to fix; fix
   `decisions.json`, never the script's checks. If it cannot be fixed in this run, do not publish: go to step 6
   with `record`.
6. **Ship.** Commit `research/scout/$RUN_NAME/` (raw requests and responses, `escalated.json`, `decisions.json`),
   `data/live/spotted.json` and `data/live/scout-ledger.json`; `discovery.json` is derived and ignored. A run that
   stopped after any paid call without publishing still ships: `python3 scripts/frames-refresh/scout.py record
   $RUN`, then commit its `raw/` and `data/live/scout-ledger.json` only, so the day's budget counts the spend. Before
   pushing, `git fetch origin main`; if `main` moved and touched `data/live/`, rebase, re-run step 5 on top (it reads
   the newer `spotted.json` as its memory), and commit again. Open the pull request and merge it once the checks in
   the routine prompt pass.

## Deciding a theme

Every theme `check` lists needs exactly one decision. The bar is the daily run's `narrativeRules.newNarrative`
story test, applied to what this run's searches returned:

- **confirmed:** at least one saved post is *about the story itself* (an event, a person, a product, a public
  meme with an origin), not merely a promotion of the coin. Contract-address shills, call-group "entry/peak/150x"
  posts, giveaways and "next 100x" lists are not sources. Check dates: a coin whose pool opened before the story
  did not launch on it. Give:
  - `title`: names the story, 3–80 characters ("Saxon Musk $MAX coins", not "$MAX to the moon").
  - `sourceSays`: what the posts say, attributed and paraphrased faithfully, 20–280 characters. "Posts say…",
    "An account claiming to be … says …". Never present a claim as verified; no prices, calls or advice.
  - `sources`: 1–5 posts as `"<batch>:<seq>#<post id>"`, for example `"e1:0#2120732431665733918"`.
- **rejected:** no story, only shills, a generic word, or a copycat ticker wave with nothing behind it. Not checked
  again for `recheckAfterHours` (6), and then only if the theme's combined volume at least doubled.
- **deferred:** a story may exist but the posts are thin, contradictory or off-date. Re-checked after 6 hours.

Every decision has a `reason` (10–500 characters) naming what the posts showed. Blocked sites and coins
(`docs/data/blocked.json`) are never cited; `publish` refuses a source that names one.

```json
{
  "k-sym-MAX": {
    "decision": "confirmed",
    "title": "Saxon Musk $MAX coins",
    "sourceSays": "Posts say an X account claiming to be a son of Elon Musk launched $MAX; others question whether the account is genuine.",
    "sources": ["e1:0#2120732431665733918", "e1:0#2120664872186945974"],
    "reason": "Posts of Nov 11-12 describe the launch by the self-described Saxon Musk account; the claim is unverified."
  },
  "k-gem": { "decision": "rejected", "reason": "Only call-group posts listing entries and multiples; no story behind the word." }
}
```

## Hand-off to the daily run

The daily routine reads `data/live/spotted.json` in step 2 of the scripted path: every `confirmed` lead is a
priority lead for that day's narrative decisions, and its decision is recorded in `curation.json`
`clusterDecisions` under the same id (`k-<word>` or `k-sym-<TICKER>`, the ids `discover.py` gives) even when the
theme is not among that day's clusters. The next scout run reads the daily decision: `created` or `assigned` turns
the lead into a tracked one linked to its narrative, `rejected` hides it.

## When something fails

| Symptom | Action |
|---|---|
| `start` exits 1 (`scout day budget`) | Stop. Nothing to publish; the next day's budget starts at 00:00 UTC. |
| A batch fails, is refunded or returns `amount_exceeds_cap` | Do not retry in this run. Without `d1` or `d2`: publish nothing, run `record` and ship the raw files and the ledger (step 6). Without `e1`: skip step 4 and publish (themes stay unchecked and are checked next hour). |
| `publish` refuses | Fix `decisions.json` (missing decision, unsaved post, blocked source). Never edit the checks. If it cannot be fixed, run `record` and ship without `spotted.json`. |
| Merge conflict on `data/live/` | Rebase on `main`, re-run `publish`, commit, push. Never merge over a newer `spotted.json`. |
| The site shows "The hourly scout has not reported since …" | The latest file is more than 3 hours old: the routine is failing or paused. The page checks this against the reader's clock too, so it says so even when no deploy has happened since. The daily refresh is unaffected. |

## Routine prompt

Install as a Claude Code routine on this repository, hourly (for example `CRON_TZ=Europe/Lisbon 26 * * * *`), with
the Frames connector. Nothing in this repository installs it.

```text
Hourly LAMBLE scout for the GitHub repository frames-engineering/lamble-ethglobal. You are running unattended as a
scheduled routine the repository owner set up. Their standing instructions:

AUTHORIZATION
- Budget: this run may spend at most 100 Frames credits (sum of billing.charged_credits over unique run ids), and
  the scout's day total in data/live/scout-ledger.json must stay within jobs.json scout maxCreditsPerDay (2,500);
  `scout.py start` enforces the day total. Check frames_get_usage first: if available_credits is below 10,000, stop
  and report. Never retry a failed or refunded call in the same run; never raise a cap or ceiling.
- You may commit, push, open a pull request and merge it into main, but merge ONLY if every check below passes on
  the exact commit you pushed (pass expectedHeadSha). If anything fails, leave the PR open with a comment saying
  exactly what failed, and do not merge.
- External work is read-only: no accounts, wallets, trades, launches or messages. Do not create or change any
  routine or schedule. Do not change narratives, the registry, releases or any file outside research/scout/ and
  data/live/.
- If the Frames MCP tools (frames_get_usage, frames_invoke_tools, frames_get_run) are not available, stop
  immediately and report that; do not substitute other data sources.

PROCEDURE
1. Start your designated branch fresh from the latest main (`git fetch origin main && git checkout -B <branch>
   origin/main`). Read docs/prompts/scout.md and follow its Procedure exactly: start, d1, names, d2, check,
   e1 (and at most one e2 of follow-ups) only for the themes check lists, decisions.json, publish, ship. If the
   run stops after any paid call without publishing, run `scout.py record` and still ship the raw files and the
   ledger, so the day's budget counts what was spent.
2. Decide every listed theme by the rules in "Deciding a theme". A post is a claim, not verification; name the
   story, attribute what posts say, cite only posts you read in this run's saved searches.
3. Checks (all must pass): `node --experimental-strip-types --no-warnings --test tests/lamble/scout.test.ts`,
   `git diff --check` after staging, the diff touches only research/scout/ and data/live/, and no credentials in
   raw files. Commit with a clear message ending with the attribution lines your environment specifies, push, open
   a PR titled "Scout <YYYY-MM-DD HH:MM> UTC" and merge it if and only if the checks passed.

FINAL MESSAGE: one short paragraph: merged or not (PR link); new coins listed; themes decided (id, decision, one-line
reason); confirmed or tracked leads now public; credits this run, the scout's total today and available credits.
```
