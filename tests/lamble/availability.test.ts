/**
 * Run availability is decided once and recorded, so rebuilds in any clone agree. SYNTHETIC run ids and times.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { type AvailabilityContext, decideAvailability } from "../../src/lib/lamble/store/availability.ts";

const RUN = "20261020T055800Z";
const START = Date.UTC(2026, 9, 20, 5, 58) / 1000;
const COMMIT = START + 40 * 60;
const NOW = START + 25 * 60;

function ctx(over: Partial<AvailabilityContext> = {}): AvailabilityContext {
  return { recorded: {}, gitCommits: new Map(), shallow: false, tracked: () => false, runtime: () => START, now: NOW, ...over };
}

test("an uncommitted run is available when first ingested, not when it started, and the decision is recorded", () => {
  const d = decideAvailability(RUN, ctx());
  assert.equal(d.basis, "first-ingest");
  assert.equal(d.at, NOW);
  assert.ok(d.at > START, "collection finishes after the run starts");
  assert.deepEqual(d.record, { availableAt: "2026-10-20T06:23:00Z", basis: "first-ingest" });
});

test("a recorded decision wins over a later commit time, so the next day's rebuild reproduces the release", () => {
  const recorded = { [RUN]: { availableAt: "2026-10-20T06:23:00Z", basis: "first-ingest" as const } };
  const d = decideAvailability(RUN, ctx({ recorded, gitCommits: new Map([[RUN, COMMIT]]), tracked: () => true }));
  assert.equal(d.at, NOW);
  assert.equal(d.record, null);
});

test("committed history without a record uses the add-commit; shallow clones never trust commit times", () => {
  const full = decideAvailability(RUN, ctx({ gitCommits: new Map([[RUN, COMMIT]]), tracked: () => true }));
  assert.equal(full.basis, "git-commit");
  assert.equal(full.at, COMMIT);
  const shallow = decideAvailability(RUN, ctx({ gitCommits: new Map([[RUN, NOW + 86_400]]), shallow: true, tracked: () => true }));
  assert.equal(shallow.basis, "runtime");
  assert.equal(shallow.at, START);
  assert.match(shallow.warning!, /shallow clone/);
});

test("a corrupt record fails loudly instead of guessing", () => {
  assert.throws(() => decideAvailability(RUN, ctx({ recorded: { [RUN]: { availableAt: "not a time", basis: "git-commit" } } })), /invalid time/);
});
