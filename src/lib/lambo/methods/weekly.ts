/**
 * Weekly editions (docs/methods/weekly.v1.json). Pure: all data comes through a WeeklySource whose reads are
 * already restricted to what was available at the edition's cutoff.
 */
import { assertSummable } from "../core/metrics.ts";
import { fsum, percentChange } from "../core/measure.ts";
import { DAY, type Interval, daysIn, iso } from "../core/time.ts";

export const WEEKLY_VERSION = "weekly-v1.1.0";

/** A week-over-week change is reported only on a comparable basket of at least this many members... */
export const MIN_COMPARABLE_MEMBERS = 3;
/** ...covering at least this share of the members present in both weeks. */
export const MIN_COMPARABLE_SHARE = 0.5;

export type HistoricalMode = "as_known_then" | "same_cohort" | "current_basket";

export interface MembershipRow {
  intervalId: string;
  narrativeId: string;
  tokenId: string;
  effectiveFrom: number;
  recordedAt: number;
  effectiveTo: number | null;
  closeKind: "factual_exit" | "collection_paused" | "inactive" | null;
  observedThrough: number | null;
  closeRecordedAt: number | null;
  basis: string;
}

export interface VenueRow {
  slug: string;
  name: string;
  providerSlug: string;
  supplySideDefinition: string | null;
}

export interface NarrativeRow {
  id: string;
  slug: string;
  title: string;
  firstObservedAt: number;
  lifecycle: { state: "collected" | "collection_paused" | "retired"; from: number; to: number | null; reason: string | null }[];
  story: { at: number; notice: string | null; evidenceId: string | null } | null;
  signals: { id: string; title: string; at: number | null }[];
}

export interface WeeklySource {
  /** Settled daily value known at the cutoff; null when missing. */
  venueDaily(providerSlug: string, metric: "venue.fees_usd" | "venue.revenue_usd" | "venue.supply_side_usd", day: number): number | null;
  /** Codex all-pool daily volume known at the cutoff; null when not collected. */
  tokenDailyVolume(tokenId: string, day: number): number | null;
  /** Last price sample at or before t (and within toleranceSeconds), known at the cutoff. */
  tokenPrice(tokenId: string, t: number, toleranceSeconds: number): { price: number; time: number } | null;
  /** Provider rolling-7d indexed counts nearest at or before t. */
  indexedNear(slug: string, t: number): { created7d: number; completed7d: number | null; asOf: number } | null;
  feePolicy(): { included: string[]; excluded: Record<string, string>; runId: string };
  priorFeePolicy(): { included: string[]; excluded: Record<string, string>; runId: string };
  venues(): VenueRow[];
  narratives(): NarrativeRow[];
  memberships(): MembershipRow[];
  tokenLabel(tokenId: string): { symbol: string | null; name: string | null; createdAt: number | null };
  /** Number of daily research runs available inside an interval, and whether a run after it reached the week end financially. */
  runsIn(interval: Interval): { dailyRuns: number; financialAnchorReachesEnd: boolean };
}

export interface EditionInputs {
  id: string;
  week: Interval;
  prior: Interval & { id: string };
  cutoff: number;
  mode: HistoricalMode;
  rules: { retireMaxVolume24Usd: number; archiveMaxVolume24Usd: number; minDailyRuns: number };
}

const pctPoints = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

function sumDays(values: (number | null)[]): { total: number | null; observed: number; missing: number } {
  const observed = values.filter((v): v is number => v !== null);
  return { total: observed.length === values.length ? fsum(observed) : null, observed: observed.length, missing: values.length - observed.length };
}

/** Members of a narrative that count for a week under a mode. */
export function basket(rows: MembershipRow[], narrativeId: string, week: Interval, cutoff: number, mode: HistoricalMode, cohortAt?: number): MembershipRow[] {
  const forNarrative = rows.filter((m) => m.narrativeId === narrativeId);
  const overlaps = (m: MembershipRow, iv: Interval) => m.effectiveFrom < iv.end && (m.effectiveTo === null || m.effectiveTo > iv.start);
  if (mode === "as_known_then") return forNarrative.filter((m) => m.recordedAt <= cutoff && overlaps(m, week));
  if (mode === "current_basket") return forNarrative.filter((m) => m.recordedAt <= cutoff && m.effectiveTo === null && (m.closeKind === null));
  // same_cohort: members open at the declared cohort time (the comparison week's start), kept even if they died or were archived.
  const at = cohortAt ?? week.start;
  return forNarrative.filter((m) => m.recordedAt <= cutoff && m.effectiveFrom <= at && (m.effectiveTo === null || m.effectiveTo > at));
}

function hhi(shares: number[]): number {
  return Math.round(fsum(shares.map((s) => (100 * s) ** 2)));
}

export interface TokenWeek {
  tokenId: string;
  symbol: string | null;
  /** Total over the week when every expected day was observed; null otherwise. */
  volume: number | null;
  /** Sum of the days that were observed (a lower bound when incomplete). */
  observedVolume: number;
  observedDays: number;
  expectedDays: number;
  return7d: number | null;
}

function tokenWeek(src: WeeklySource, tokenId: string, iv: Interval): TokenWeek {
  assertSummable("token.volume_usd");
  const days = daysIn(iv);
  const createdAt = src.tokenLabel(tokenId).createdAt;
  // Documented pre-creation rule: a whole day before the token existed is an observed zero, never a gap.
  const vols = days.map((d) => (createdAt !== null && d + DAY <= createdAt ? 0 : src.tokenDailyVolume(tokenId, d)));
  const s = sumDays(vols);
  const p0 = src.tokenPrice(tokenId, iv.start, 12 * 3600);
  const p1 = src.tokenPrice(tokenId, iv.end, 12 * 3600);
  return {
    tokenId,
    symbol: src.tokenLabel(tokenId).symbol,
    volume: s.total,
    observedVolume: fsum(vols.filter((v): v is number => v !== null)),
    observedDays: s.observed,
    expectedDays: days.length,
    return7d: p0 && p1 && p0.price > 0 ? p1.price / p0.price - 1 : null,
  };
}

export function buildEdition(src: WeeklySource, inp: EditionInputs) {
  const { week, prior } = inp;
  const days = daysIn(week);
  const priorDays = daysIn(prior);
  // ---------------------------------------------------------------- market activity and fees
  const policy = src.feePolicy();
  const priorPolicy = src.priorFeePolicy();
  const venues = src.venues();
  const venueRows = venues.map((v) => {
    const flow = (metric: "venue.fees_usd" | "venue.revenue_usd" | "venue.supply_side_usd", ds: number[]) => sumDays(ds.map((d) => src.venueDaily(v.providerSlug, metric, d)));
    const fees = flow("venue.fees_usd", days);
    const feesPrior = flow("venue.fees_usd", priorDays);
    const supply = v.supplySideDefinition ? flow("venue.supply_side_usd", days) : null;
    const supplyPrior = v.supplySideDefinition ? flow("venue.supply_side_usd", priorDays) : null;
    return {
      slug: v.slug,
      name: v.name,
      included: policy.included.includes(v.slug),
      excludedReason: policy.excluded[v.slug] ?? null,
      fees: fees.total,
      feesPrior: feesPrior.total,
      feesChangePct: percentChange(fees.total, feesPrior.total),
      missingFeeDays: fees.missing,
      revenue: flow("venue.revenue_usd", days).total,
      creatorEarnings: supply?.total ?? null,
      creatorEarningsPrior: supplyPrior?.total ?? null,
      creatorEarningsDefinition: v.supplySideDefinition,
      shareOfSubtotal: null as number | null,
    };
  });
  const included = venueRows.filter((v) => v.included);
  const intersection = policy.included.filter((s) => priorPolicy.included.includes(s));
  const scopeChanged = intersection.length !== policy.included.length || intersection.length !== priorPolicy.included.length;
  const subtotal = (rows: typeof venueRows, key: "fees" | "feesPrior") => (rows.every((r) => r[key] !== null) ? fsum(rows.map((r) => r[key]!)) : null);
  const onIntersection = venueRows.filter((v) => intersection.includes(v.slug));
  const feeComplete = included.every((v) => v.missingFeeDays === 0);
  const feesWeek = subtotal(included, "fees");
  const feesPriorSame = subtotal(onIntersection, "feesPrior");
  const feesWeekSame = subtotal(onIntersection, "fees");
  for (const v of venueRows) v.shareOfSubtotal = v.included && v.fees !== null && feesWeek ? v.fees / feesWeek : null;
  const priorSub = subtotal(included, "feesPrior");
  const shareShift = venueRows
    .filter((v) => v.included)
    .map((v) => ({
      slug: v.slug,
      name: v.name,
      sharePoints: pctPoints(
        v.fees !== null && feesWeek ? (100 * v.fees) / feesWeek : null,
        v.feesPrior !== null && priorSub ? (100 * v.feesPrior) / priorSub : null,
      ),
      feesChangePct: v.feesChangePct,
    }))
    .sort((a, b) => Math.abs(b.sharePoints ?? 0) - Math.abs(a.sharePoints ?? 0));
  // Creator earnings: only venues that define supply side and report every day, compared on the same venues.
  const ceVenues = venueRows.filter((v) => v.creatorEarnings !== null && v.creatorEarningsPrior !== null);
  const indexed = venues.map((v) => ({ slug: v.slug, name: v.name, obs: src.indexedNear(v.slug, week.end) })).filter((x) => x.obs);
  const completionVenues = indexed.filter((x) => x.obs!.completed7d !== null);
  const created7d = completionVenues.reduce((a, x) => a + x.obs!.created7d, 0);
  const completed7d = completionVenues.reduce((a, x) => a + (x.obs!.completed7d ?? 0), 0);

  // ---------------------------------------------------------------- narratives
  const memberships = src.memberships();
  // Only narratives that existed before the week ended belong to it.
  const narratives = src.narratives().filter((n) => n.firstObservedAt < week.end);
  const narrativeRows = narratives.map((n) => {
    const members = basket(memberships, n.id, week, inp.cutoff, inp.mode, prior.start);
    const priorMembers = basket(memberships, n.id, prior, inp.cutoff, inp.mode === "as_known_then" ? "as_known_then" : inp.mode, prior.start);
    const tokens = [...new Set(members.map((m) => m.tokenId))];
    const weeks = tokens.map((t) => {
      const firstFrom = Math.min(...members.filter((m) => m.tokenId === t).map((m) => m.effectiveFrom));
      return { ...tokenWeek(src, t, week), memberSince: firstFrom };
    });
    const priorTokens = [...new Set(priorMembers.map((m) => m.tokenId))];
    const priorWeeks = priorTokens.map((t) => tokenWeek(src, t, prior));
    const observed = (ws: TokenWeek[]) => fsum(ws.map((w) => w.observedVolume));
    const complete = (ws: TokenWeek[]) => ws.every((w) => w.volume !== null);
    const coverage = (ws: TokenWeek[]) => {
      const exp = ws.reduce((a, w) => a + w.expectedDays, 0);
      return exp ? ws.reduce((a, w) => a + w.observedDays, 0) / exp : null;
    };
    const vol = observed(weeks);
    const volPrior = observed(priorWeeks);
    const entrants = weeks.filter((w) => !priorTokens.includes(w.tokenId));
    const exits = priorWeeks.filter((w) => !tokens.includes(w.tokenId));
    const continuing = weeks.filter((w) => priorTokens.includes(w.tokenId));
    const continuingPrior = priorWeeks.filter((w) => tokens.includes(w.tokenId));
    const shares = vol > 0 ? weeks.map((w) => w.observedVolume / vol) : [];
    const withReturns = weeks.filter((w) => w.return7d !== null);
    const lifecycleAt = (t: number) => n.lifecycle.find((l) => l.from <= t && (l.to === null || l.to > t))?.state ?? null;
    const paused = n.lifecycle.find((l) => l.state === "collection_paused" && l.from >= week.start && l.from < week.end);
    const firstObservedInWeek = n.firstObservedAt >= week.start && n.firstObservedAt < week.end;
    // Week-over-week change on a declared comparable basket: members fully observed in both weeks. Members left
    // out (archived or paused coins with missing days) are listed, so the denominator never shrinks silently.
    const comparableIds = weeks.filter((w) => w.volume !== null && priorWeeks.some((p) => p.tokenId === w.tokenId && p.volume !== null)).map((w) => w.tokenId);
    const comparableVol = fsum(weeks.filter((w) => comparableIds.includes(w.tokenId)).map((w) => w.volume!));
    const comparablePrior = fsum(priorWeeks.filter((w) => comparableIds.includes(w.tokenId)).map((w) => w.volume!));
    const inBoth = tokens.filter((id) => priorTokens.includes(id)).length;
    const sufficient = comparableIds.length >= MIN_COMPARABLE_MEMBERS && comparableIds.length >= MIN_COMPARABLE_SHARE * inBoth;
    const change = sufficient ? percentChange(comparableVol, comparablePrior) : null;
    return {
      id: n.id,
      slug: n.slug,
      title: n.title,
      stateAtWeekEnd: lifecycleAt(week.end - 1),
      collectedDuringWeek: n.lifecycle.some((l) => l.state === "collected" && l.from < week.end && (l.to === null || l.to > week.start)),
      emerging: firstObservedInWeek,
      pausedDuringWeek: paused ? { at: paused.from, reason: paused.reason } : null,
      trend: firstObservedInWeek
        ? "new"
        : !n.lifecycle.some((l) => l.state === "collected" && l.from < week.end && (l.to === null || l.to > week.start))
          ? "not_collected"
          : change === null
            ? "unknown"
            : change >= 25
              ? "rising"
              : change <= -25
                ? "fading"
                : "steady",
      members: weeks.length,
      volume: { observed: vol, complete: complete(weeks), coverage: coverage(weeks) },
      volumePrior: { observed: volPrior, complete: complete(priorWeeks), coverage: coverage(priorWeeks), members: priorWeeks.length },
      volumeChangePct: change,
      comparable: {
        members: comparableIds.length,
        ofMembersInBothWeeks: inBoth,
        sufficient,
        volume: comparableIds.length ? comparableVol : null,
        volumePrior: comparableIds.length ? comparablePrior : null,
        excludedIncomplete: [...new Set([...weeks, ...priorWeeks].map((w) => w.tokenId))].filter((id) => !comparableIds.includes(id) && tokens.includes(id) && priorTokens.includes(id)),
        note: `Change is computed on members observed on every day of both weeks; entrants, exits and partially observed members are excluded and listed. It is reported only when at least ${MIN_COMPARABLE_MEMBERS} members and half of those present in both weeks are comparable.`,
      },
      entrants: entrants.map((w) => ({ tokenId: w.tokenId, symbol: w.symbol, volume: w.volume })),
      exits: exits.map((w) => ({ tokenId: w.tokenId, symbol: w.symbol, volumePrior: w.volume })),
      continuing: {
        members: continuing.length,
        volume: observed(continuing),
        volumePrior: observed(continuingPrior),
        changePct: percentChange(complete(continuing) ? observed(continuing) : null, complete(continuingPrior) && continuingPrior.length ? observed(continuingPrior) : null),
      },
      concentration: { top1Share: shares.length ? Math.max(...shares) : null, hhi: shares.length ? hhi(shares) : null },
      breadth: { advancing: withReturns.filter((w) => w.return7d! > 0).length, withPrices: withReturns.length, of: weeks.length },
      tokens: weeks.sort((a, b) => b.observedVolume - a.observedVolume),
      story: n.story,
      signalsInWeek: n.signals.filter((s) => s.at !== null && s.at >= week.start && s.at < week.end),
    };
  });
  // Multi-label: deduplicated total counts each token once; overlap disclosed.
  const tokenSet = new Map<string, number | null>();
  const counted = new Map<string, number>();
  for (const n of narrativeRows) for (const t of n.tokens) {
    tokenSet.set(t.tokenId, t.observedVolume);
    counted.set(t.tokenId, (counted.get(t.tokenId) ?? 0) + 1);
  }
  const overlap = [...counted.entries()].filter(([, c]) => c > 1).map(([tokenId, c]) => ({ tokenId, narratives: c, volume: tokenSet.get(tokenId) ?? null }));
  const dedupTotal = fsum([...tokenSet.values()].map((v) => v ?? 0));
  const sumOfNarratives = fsum(narrativeRows.map((n) => n.volume.observed));
  const allTokens = [...tokenSet.keys()].map((t) => narrativeRows.flatMap((n) => n.tokens).find((x) => x.tokenId === t)!);
  const priced = allTokens.filter((t) => t.return7d !== null);
  const byVolume = [...allTokens].sort((a, b) => b.observedVolume - a.observedVolume);

  // ---------------------------------------------------------------- completeness and status
  const runs = src.runsIn(week);
  const checks = [
    { id: "fees", passed: feeComplete, detail: feeComplete ? "Every included venue has 7 settled days." : `Missing venue-days: ${included.filter((v) => v.missingFeeDays).map((v) => `${v.slug} (${v.missingFeeDays})`).join(", ")}` },
    { id: "runs", passed: runs.dailyRuns >= inp.rules.minDailyRuns, detail: `${runs.dailyRuns} daily runs in the week (minimum ${inp.rules.minDailyRuns}).` },
    { id: "financial-anchor", passed: runs.financialAnchorReachesEnd, detail: runs.financialAnchorReachesEnd ? "A run after the week reached its end financially." : "No run's financial anchor reaches the week end yet." },
  ];
  const status = checks.every((c) => c.passed) ? "complete" : "partial";

  // ---------------------------------------------------------------- watch conditions (deterministic)
  const watch: { kind: string; subject: string; condition: string; tokenId?: string }[] = [];
  for (const n of narrativeRows) {
    if (n.stateAtWeekEnd !== "collected") continue;
    const lastValues = n.tokens.map((t) => src.tokenDailyVolume(t.tokenId, week.end - DAY));
    const lastDay = lastValues.includes(null) ? null : fsum(lastValues as number[]);
    if (lastDay !== null && lastDay < inp.rules.retireMaxVolume24Usd) watch.push({ kind: "narrative-volume", subject: n.title, condition: `Last day's volume $${Math.round(lastDay).toLocaleString("en-US")} is below the $${inp.rules.retireMaxVolume24Usd.toLocaleString("en-US")} line; a second observation below it pauses collection.` });
    for (const t of n.tokens) {
      const v = src.tokenDailyVolume(t.tokenId, week.end - DAY);
      if (v !== null && v < inp.rules.archiveMaxVolume24Usd) watch.push({ kind: "member-volume", subject: `${t.symbol ?? "Token"} ${shortId(t.tokenId)} (${n.title})`, tokenId: t.tokenId, condition: `Last day's volume $${Math.round(v)} is under $${inp.rules.archiveMaxVolume24Usd.toLocaleString("en-US")}; a second observation archives it.` });
    }
  }
  for (const v of venueRows.filter((x) => x.included && x.missingFeeDays)) watch.push({ kind: "venue-lag", subject: v.name, condition: `${v.missingFeeDays} unsettled day(s) in the week; totals that include it stay partial until it reports.` });

  return {
    schemaVersion: "lambo.weekly-edition.v1",
    methodVersion: WEEKLY_VERSION,
    id: inp.id,
    title: `State of the Trenches — ${inp.id}`,
    interval: { start: iso(week.start), end: iso(week.end), endExclusive: true },
    comparison: { id: prior.id, start: iso(prior.start), end: iso(prior.end) },
    dataCutoff: iso(inp.cutoff),
    mode: inp.mode,
    status,
    checks,
    market: {
      feeSubtotal: {
        value: feesWeek,
        prior: priorSub,
        changePct: percentChange(feesWeekSame, feesPriorSame),
        comparedOn: intersection,
        scopeChanged,
        scope: `Sum of ${included.length} non-overlapping mapped fee streams (fee policy of run ${policy.runId}); ${Object.keys(policy.excluded).length} overlapping venues are shown individually and never added.`,
        complete: feeComplete,
      },
      creatorEarnings: {
        value: fsum(ceVenues.map((v) => v.creatorEarnings!)),
        prior: fsum(ceVenues.map((v) => v.creatorEarningsPrior!)),
        changePct: percentChange(fsum(ceVenues.map((v) => v.creatorEarnings!)), fsum(ceVenues.map((v) => v.creatorEarningsPrior!))),
        venues: ceVenues.map((v) => v.slug),
        scope: "DefiLlama supply-side revenue: fees paid to coin creators and, per venue definition, holders, referrers or traders. Same venues in both weeks; venues without a definition are excluded, not zero.",
      },
      venues: venueRows,
      excluded: Object.entries(policy.excluded).map(([slug, reason]) => ({ slug, reason })),
      indexedActivity: {
        created7d,
        completed7d,
        periodCompletionRatio: created7d ? completed7d / created7d : null,
        venues: completionVenues.map((x) => ({ slug: x.slug, created7d: x.obs!.created7d, completed7d: x.obs!.completed7d, asOf: iso(x.obs!.asOf) })),
        creationOnlyVenues: indexed.filter((x) => x.obs!.completed7d === null).map((x) => ({ slug: x.slug, created7d: x.obs!.created7d })),
        scope: "Codex beta rolling-7-day counts at the observation nearest the week end — their own window, not this calendar week, and never summed from daily observations. Period completions / period creations is not a graduation probability and can exceed 100%.",
      },
    },
    venueChanges: shareShift,
    narratives: narrativeRows,
    dedup: { totalVolume: dedupTotal, sumOfNarrativeTotals: sumOfNarratives, overlap, note: "Tokens in more than one narrative count once in the deduplicated total." },
    breadth: {
      advancing: priced.filter((t) => t.return7d! > 0).length,
      withPrices: priced.length,
      tracked: allTokens.length,
      top5VolumeShare: dedupTotal > 0 ? fsum(byVolume.slice(0, 5).map((t) => t.observedVolume)) / dedupTotal : null,
      note: "Returns use snapshot prices nearest the week's start and end (within 12 hours).",
    },
    watch,
  };
}

export type WeeklyEdition = ReturnType<typeof buildEdition>;

/** chain:address → "chain:abcd…wxyz", so two coins sharing a symbol stay distinguishable in text. */
function shortId(tokenId: string): string {
  const i = tokenId.indexOf(":");
  const a = tokenId.slice(i + 1);
  return `${tokenId.slice(0, i)}:${a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a}`;
}
