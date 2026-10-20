/**
 * Weekly editions. Offline; never spends.
 *
 *   npm run lamble -- weekly [--week 2026-W42] [--revise]
 *
 * Freezes calendar weeks (Monday 00:00 UTC to Monday 00:00 UTC) as data/editions/<week>/r<n>.json.
 * The cutoff of an edition is the availability time of the first validated daily run whose financial anchor
 * reaches the week's end; everything is computed as known at that cutoff. Without such a run the week is
 * reported as delayed and nothing is written. An existing revision is never edited: --revise rebuilds with the
 * latest cutoff and writes r<n+1> only when the content differs, recording what changed.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { LAUNCHPADS as SNAPSHOT_LAUNCHPADS } from "../../src/lib/data/snapshots/frames.ts";
import { loadRegistry } from "../../src/lib/lamble/catalog/load.ts";
import { DAY, HOUR, type Interval, WEEK, iso, lastCompleteWeek, parseIso, parseWeekId, previousWeekId, weekId } from "../../src/lib/lamble/core/time.ts";
import { type HistoricalMode, type MembershipRow, type NarrativeRow, type WeeklySource, buildEdition } from "../../src/lib/lamble/methods/weekly.ts";
import { readJson, sha256, stableStringify, writeJsonAtomic } from "../../src/lib/lamble/server/io.ts";
import { openPipelineDb } from "./ingest.ts";
import { withLock } from "./lock.ts";
import type { DraftChange } from "../../src/lib/lamble/release/changes.ts";
import { appendChangeEvents, dataDir, readPointer } from "./release/publish.ts";
import { BOTTOMING_DEFAULTS, BOTTOMING_VERSION, evaluateBottoming } from "../../src/lib/lamble/methods/bottoming.ts";
import { liquidityToSize } from "../../src/lib/lamble/methods/holders.ts";
import { coinMethodInputs } from "./release/holder-inputs.ts";
import { type RunRow, Store } from "./release/store.ts";

export const editionsDir = () => path.join(dataDir(), "editions");

export function weeklySourceFromStore(store: Store, cutoff: number, week: Interval, prior: Interval): WeeklySource {
  const registry = loadRegistry();
  const cache = new Map<string, Map<number, { value: number }>>();
  const win = (type: string, id: string, metric: string) => {
    const k = `${type}|${id}|${metric}`;
    if (!cache.has(k)) cache.set(k, store.windows(type, id, metric, DAY, cutoff));
    return cache.get(k)!;
  };
  const runs = store.dailyRuns(cutoff);
  const firstRunAfter = (t: number): RunRow | undefined => runs.find((r) => (r.financial_anchor ?? 0) >= t);
  const policyOf = (row: ReturnType<Store["feePolicy"]>) => ({
    included: row ? (JSON.parse(row.included_json) as string[]) : [],
    excluded: row ? (JSON.parse(row.excluded_json) as Record<string, string>) : {},
    runId: row?.run_id ?? "none",
  });
  const tokens = new Map(store.tokens(cutoff).map((t) => [t.token_id, t]));
  return {
    venueDaily: (provider, metric, day) => win("venue_provider", provider, metric).get(day)?.value ?? null,
    tokenDailyVolume: (tokenId, day) => win("token", tokenId, "token.volume_usd").get(day)?.value ?? null,
    tokenPrice: (tokenId, t, tol) => {
      let best: { price: number; time: number } | null = null;
      for (const s of store.snapshots("token", tokenId, "token.price_usd", cutoff)) {
        if (Math.abs(s.observed_at - t) > tol) continue;
        if (!best || Math.abs(s.observed_at - t) < Math.abs(best.time - t)) best = { price: s.value, time: s.observed_at };
      }
      return best;
    },
    indexedNear: (slug, t) => {
      const ids = registry.venues.find((v) => v.slug === slug)?.indexedProviderIds ?? [];
      if (!ids.length) return null;
      // Nearest observation within 12 hours of t, labelled with its own as-of time.
      const candidates = runs.map((r) => r.activity_as_of).filter((x): x is number => x !== null && Math.abs(x - t) <= 12 * HOUR);
      const at = candidates.sort((a, b) => Math.abs(a - t) - Math.abs(b - t))[0];
      if (at === undefined) return null;
      const rows = store.indexRows(cutoff, at + HOUR).filter((r) => ids.includes(r.entity_id));
      const sum = (metric: string) => {
        const vals = ids.map((id) => rows.find((r) => r.entity_id === id && r.metric === metric));
        return vals.every(Boolean) && new Set(vals.map((v) => v!.event_time)).size === 1 ? vals.reduce((a, v) => a + v!.value, 0) : null;
      };
      const created = sum("index.created_rolling7d");
      if (created === null) return null;
      const noCurve = ["argus-world", "clanker", "o1-launchpad"].includes(slug);
      return { created7d: created, completed7d: noCurve ? null : sum("index.completed_rolling7d"), asOf: rows[0]!.event_time };
    },
    feePolicy: () => policyOf(store.feePolicyAt(firstRunAfter(week.end)?.runtime_at ?? cutoff)),
    priorFeePolicy: () => policyOf(store.feePolicyAt(firstRunAfter(prior.end)?.runtime_at ?? cutoff)),
    venues: () =>
      registry.venues.map((v) => {
        const lp = SNAPSHOT_LAUNCHPADS.find((l) => l.slug === v.slug)!;
        return { slug: v.slug, name: lp.name, providerSlug: v.providerSlug, supplySideDefinition: lp.provenance?.methodology?.SupplySideRevenue ?? null };
      }),
    narratives: () =>
      store.narratives(cutoff).map((n): NarrativeRow => {
        const v = store.narrativeVersion(n.narrative_id, cutoff);
        const story = v?.story_status_json ? (JSON.parse(v.story_status_json) as { notice?: string; observedAt?: string; evidenceId?: string }) : null;
        const signals = v?.signals_json ? (JSON.parse(v.signals_json) as { id: string; title: string; at: string | null }[]) : [];
        return {
          id: n.narrative_id,
          slug: n.slug,
          title: v?.title ?? n.title,
          firstObservedAt: n.first_observed_at,
          lifecycle: store.lifecycle(n.narrative_id, cutoff).map((l) => ({ state: l.state, from: l.from_at, to: l.to_at, reason: l.reason })),
          story: story ? { at: story.observedAt ? parseIso(story.observedAt) : (v?.available_at ?? 0), notice: story.notice ?? null, evidenceId: story.evidenceId ?? null } : null,
          signals: signals.map((s) => ({ id: s.id, title: s.title, at: s.at ? parseIso(s.at) : null })),
        };
      }),
    memberships: () =>
      store.memberships(cutoff).map(
        (m): MembershipRow => ({
          intervalId: m.interval_id,
          narrativeId: m.narrative_id,
          tokenId: m.token_id,
          effectiveFrom: m.effective_from,
          recordedAt: m.recorded_at,
          effectiveTo: m.effective_to,
          closeKind: m.close_kind,
          observedThrough: m.observed_through,
          closeRecordedAt: m.close_recorded_at,
          basis: m.basis,
        }),
      ),
    tokenLabel: (tokenId) => ({ symbol: tokens.get(tokenId)?.symbol ?? null, name: tokens.get(tokenId)?.name ?? null, createdAt: tokens.get(tokenId)?.token_created_at ?? null }),
    runsIn: (iv) => ({
      dailyRuns: runs.filter((r) => r.runtime_at >= iv.start && r.runtime_at < iv.end).length,
      financialAnchorReachesEnd: runs.some((r) => (r.financial_anchor ?? 0) >= iv.end),
    }),
  };
}

const RULES = { retireMaxVolume24Usd: 100_000, archiveMaxVolume24Usd: 1000, minDailyRuns: 5 };

type Eval = { state: string; stage: number | null; label: string };

/**
 * Holder and bottoming changes over the week for the edition's member coins, where measurable: the bottoming
 * test evaluated as known one week before the cutoff and at the cutoff (same method as releases), and
 * liquidity-to-size from snapshots near both times. Other holder components have no collected input.
 */
export function weekSignals(store: Store, members: string[], cutoff: number) {
  const start = cutoff - WEEK;
  const tokens = new Map(store.tokens(cutoff).map((t) => [t.token_id, t]));
  const atEnd: Record<string, number> = {};
  const transitions: { tokenId: string; symbol: string | null; from: Eval; to: Eval; drawdownCurrent: number | null }[] = [];
  const liquidity: { tokenId: string; symbol: string | null; from: number; to: number }[] = [];
  let evaluated = 0;
  for (const id of members) {
    const tok = tokens.get(id);
    if (!tok) continue;
    const { bottoming, caps } = coinMethodInputs(store, tok, cutoff, store.addressLabels(tok.chain, cutoff));
    const a = evaluateBottoming(bottoming, start, BOTTOMING_DEFAULTS);
    const b = evaluateBottoming(bottoming, cutoff, BOTTOMING_DEFAULTS);
    evaluated++;
    atEnd[b.state] = (atEnd[b.state] ?? 0) + 1;
    if (a.state !== b.state || a.stage !== b.stage || a.label !== b.label) {
      transitions.push({ tokenId: id, symbol: tok.symbol, from: { state: a.state, stage: a.stage, label: a.label }, to: { state: b.state, stage: b.stage, label: b.label }, drawdownCurrent: b.drawdown.current });
    }
    const liq = store.snapshots("token", id, "token.liquidity_usd", cutoff);
    const ratioNear = (t: number) => {
      const l = [...liq].filter((x) => Math.abs(x.observed_at - t) <= 13 * HOUR).sort((x, y) => Math.abs(x.observed_at - t) - Math.abs(y.observed_at - t))[0];
      const c = l && caps.find((x) => x.run_id === l.run_id && x.evidence_id === l.evidence_id);
      return l && c ? liquidityToSize(l.value, c.value) : null;
    };
    const r0 = ratioNear(start);
    const r1 = ratioNear(cutoff);
    if (r0 !== null && r1 !== null) liquidity.push({ tokenId: id, symbol: tok.symbol, from: r0, to: r1 });
  }
  return {
    bottoming: {
      methodVersion: BOTTOMING_VERSION,
      evaluated,
      from: iso(start),
      to: iso(cutoff),
      atEnd,
      transitions: transitions.sort((x, y) => x.tokenId.localeCompare(y.tokenId)),
      note: "Each coin evaluated twice with only the observations available at each time; a transition is any change of state, stage or label.",
    },
    liquidityToSize: {
      measured: liquidity.length,
      of: members.length,
      rising: liquidity.filter((x) => x.to > x.from).length,
      falling: liquidity.filter((x) => x.to < x.from).length,
      largestMoves: [...liquidity].sort((x, y) => Math.abs(y.to - y.from) - Math.abs(x.to - x.from) || x.tokenId.localeCompare(y.tokenId)).slice(0, 10),
      note: "Liquidity / circulating market cap from the same Codex snapshot, nearest each time within 13 hours.",
    },
    holders: { note: "Other holder components need holder panels or wallet-resolved trades; none is collected yet, so no weekly change is reported for them." },
  };
}

export function buildWeek(store: Store, id: string, cutoff: number) {
  const week = parseWeekId(id);
  const priorId = previousWeekId(id);
  const prior = { ...parseWeekId(priorId), id: priorId };
  const editionFor = (mode: HistoricalMode) => buildEdition(weeklySourceFromStore(store, cutoff, week, prior), { id, week, prior, cutoff, mode, rules: RULES });
  const primary = editionFor("as_known_then");
  const summary = (e: ReturnType<typeof editionFor>) =>
    e.narratives.map((n) => ({ id: n.id, slug: n.slug, title: n.title, members: n.members, volume: n.volume, volumePrior: n.volumePrior, volumeChangePct: n.volumeChangePct }));
  const members = [...new Set(primary.narratives.flatMap((n) => n.tokens.map((t) => t.tokenId)))].sort();
  return {
    ...primary,
    signals: weekSignals(store, members, cutoff),
    alternateModes: {
      same_cohort: { label: "Same cohort: members open at the comparison week's start, measured in both weeks, exits and dead coins kept.", narratives: summary(editionFor("same_cohort")) },
      current_basket: { label: "Current basket: today's open members applied to both weeks retrospectively (reconstructed).", narratives: summary(editionFor("current_basket")) },
    },
  };
}

export function editionCutoff(store: Store, id: string, latest: boolean): number | null {
  const week = parseWeekId(id);
  const runs = store.dailyRuns(Number.MAX_SAFE_INTEGER);
  if (latest) return runs.at(-1)?.available_at ?? null;
  return runs.find((r) => (r.financial_anchor ?? 0) >= week.end && r.runtime_at >= week.end)?.available_at ?? null;
}

function revisions(id: string): { n: number; file: string }[] {
  const dir = path.join(editionsDir(), id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^r(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ n: Number(m[1]), file: path.join(dir, m[0]) }))
    .sort((a, b) => a.n - b.n);
}

function changedFields(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const out: string[] = [];
  const am = a.market as { feeSubtotal: { value: number | null } };
  const bm = b.market as { feeSubtotal: { value: number | null } };
  if (am.feeSubtotal.value !== bm.feeSubtotal.value) out.push(`fee subtotal ${am.feeSubtotal.value} -> ${bm.feeSubtotal.value}`);
  const an = new Map((a.narratives as { id: string; volume: { observed: number } }[]).map((n) => [n.id, n.volume.observed]));
  for (const n of b.narratives as { id: string; title: string; volume: { observed: number } }[]) if (an.get(n.id) !== n.volume.observed) out.push(`${n.title} volume ${an.get(n.id) ?? "absent"} -> ${n.volume.observed}`);
  if (a.status !== b.status) out.push(`status ${a.status} -> ${b.status}`);
  if (a.methodVersion !== b.methodVersion) out.push(`method ${a.methodVersion} -> ${b.methodVersion}`);
  const ac = new Map((a.narratives as { id: string; volumeChangePct: number | null }[]).map((n) => [n.id, n.volumeChangePct]));
  for (const n of b.narratives as { id: string; title: string; volumeChangePct: number | null }[]) {
    const before = ac.get(n.id);
    if (before !== undefined && before !== n.volumeChangePct) out.push(`${n.title} week change ${before === null ? "withheld" : `${before.toFixed(1)}%`} -> ${n.volumeChangePct === null ? "withheld" : `${n.volumeChangePct.toFixed(1)}%`}`);
  }
  const aw = JSON.stringify(a.watch);
  const bw = JSON.stringify(b.watch);
  if (aw !== bw) out.push("watch list wording or entries changed");
  return out.length ? out : ["Content differs outside the summarized fields (presentation change)."];
}

export function runWeekly(argv: string[]) {
  return withLock("releases", () => {
    const db = openPipelineDb();
    try {
      const store = new Store(db);
      const i = argv.indexOf("--week");
      const latestRun = store.dailyRuns(Number.MAX_SAFE_INTEGER).at(-1)!;
      const ids = i >= 0 ? [argv[i + 1]!] : (() => {
        const last = weekId(lastCompleteWeek(latestRun.runtime_at).start);
        return [previousWeekId(last), last];
      })();
      const results: Record<string, unknown>[] = [];
      for (const id of ids) {
        const existing = revisions(id);
        const revise = argv.includes("--revise") && existing.length > 0;
        // --same-cutoff isolates a method or presentation correction: the revision reads exactly the
        // observations its predecessor read. Without it a revision takes the latest data (late data, restatements).
        const sameCutoff = revise && argv.includes("--same-cutoff");
        const cutoff = sameCutoff ? parseIso(readJson<{ dataCutoff: string }>(existing.at(-1)!.file).dataCutoff) : editionCutoff(store, id, revise);
        if (cutoff === null) {
          results.push({ week: id, status: "delayed", reason: "No validated run whose financial anchor reaches the week end yet." });
          continue;
        }
        const content = buildWeek(store, id, cutoff);
        // Reconstruction is a property of the edition, carried by every revision of it.
        const reconstructed = existing.length
          ? readJson<{ provenance: string }>(existing[0]!.file).provenance.startsWith("Reconstructed")
          : cutoff < (latestRun.available_at ?? 0);
        const hash = sha256(stableStringify(content));
        const last = existing.at(-1);
        if (last && readJson<{ contentSha256: string }>(last.file).contentSha256 === hash) {
          results.push({ week: id, status: "unchanged", revision: last.n });
          continue;
        }
        if (last && !revise) {
          results.push({ week: id, status: "frozen", revision: last.n, note: "Use --revise to record a correction as a new revision." });
          continue;
        }
        const n = (last?.n ?? 0) + 1;
        const doc = {
          ...content,
          revision: n,
          revisionOf: last ? `r${last.n}` : null,
          revisionReason: last ? changedFields(readJson(last.file), content) : null,
          contentSha256: hash,
          releaseId: readPointer()?.releaseId ?? null,
          builtAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
          provenance: reconstructed
            ? `Reconstructed: built on ${new Date().toISOString().slice(0, 10)} from observations available at ${iso(cutoff)}. LAMBLE did not publish this edition at that time; its numbers are what was knowable then.`
            : `Built from observations available at ${iso(cutoff)}.`,
          methodChange: last && readJson<{ methodVersion: string }>(last.file).methodVersion !== content.methodVersion ? { from: readJson<{ methodVersion: string }>(last.file).methodVersion, to: content.methodVersion } : null,
        };
        writeJsonAtomic(path.join(editionsDir(), id, `r${n}.json`), doc);
        results.push({ week: id, status: "written", revision: n, cutoff: iso(cutoff), editionStatus: content.status });
        const event: DraftChange = last
          ? {
              entityType: "edition",
              entityId: id,
              kind: "edition.revised",
              summary: `${content.title}: revision r${n} replaces r${last.n} (kept). ${doc.revisionReason!.slice(0, 3).join("; ")}${doc.revisionReason!.length > 3 ? "; …" : ""}`,
              from: { revision: last.n },
              to: { revision: n, dataCutoff: iso(cutoff), reasons: doc.revisionReason },
            }
          : {
              entityType: "edition",
              entityId: id,
              kind: "edition.published",
              summary: `${content.title} published (${content.status}${reconstructed ? ", reconstructed from retained observations" : ""}).`,
              from: null,
              to: { revision: n, dataCutoff: iso(cutoff), status: content.status },
            };
        if (doc.releaseId) appendChangeEvents([event], doc.releaseId);
      }
      // Index: every week with its revisions, newest first.
      const weeks = existsSync(editionsDir()) ? readdirSync(editionsDir()).filter((w) => /^\d{4}-W\d{2}$/.test(w)).sort().reverse() : [];
      writeJsonAtomic(
        path.join(editionsDir(), "index.json"),
        weeks.map((w) => {
          const revs = revisions(w).map((r) => readJson<{ revision: number; status: string; dataCutoff: string; builtAt: string; revisionReason: string[] | null; title: string; interval: unknown; provenance: string }>(r.file));
          const latest = revs.at(-1)!;
          return { id: w, title: latest.title, interval: latest.interval, status: latest.status, latestRevision: latest.revision, provenance: latest.provenance, revisions: revs.map((r) => ({ revision: r.revision, dataCutoff: r.dataCutoff, builtAt: r.builtAt, reason: r.revisionReason })) };
        }),
      );
      return results;
    } finally {
      db.close();
    }
  });
}

export function main(argv: string[]): number {
  const r = runWeekly(argv);
  console.log(JSON.stringify(r, null, 1));
  return 0;
}

