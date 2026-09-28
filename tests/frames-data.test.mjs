import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { LAUNCHPADS, NARRATIVES, SNAPSHOT } from '../src/lib/data/snapshots/frames.ts';
import { aggregate } from '../src/lib/data/aggregate.ts';
import { FEE_COVERAGE } from '../src/lib/data/snapshots/coverage.ts';
import { compactUsd, int, percent, bps } from '../src/lib/format.ts';

// Expectations are recomputed from the imported run's raw provider bodies, not copied from normalized output.
const run = (file) => new URL(`../research/lamble/${SNAPSHOT.runId}/${file}`, import.meta.url);
const narrativeRun = (file) => new URL(`../${SNAPSHOT.narrativeRun}/${file}`, import.meta.url);
const activityRun = (file) => new URL(`../${SNAPSHOT.activityPath.replace(/[^/]+$/, '')}${file}`, import.meta.url);
const readJson = (url) => JSON.parse(readFileSync(url));
const raw = readJson(run('launchpads.json'));
// Every raw Codex response the narrative run declares, paired with its exact request.
const narrativeCalls = readJson(narrativeRun('refresh-manifest.json')).requests.flatMap((request) => {
  const calls = readJson(narrativeRun(request)).calls;
  return readJson(narrativeRun(request.replace('-request', ''))).result.calls.map((c) => ({ query: calls[c.seq].args.query, data: c.body.data }));
});
const registry = readJson(new URL('../docs/prompts/refresh-market-data.sources.json', import.meta.url));
const F = Date.parse(SNAPSHOT.financialEnd) / 1000;
const feeBodies = new Map();
for (const batch of ['f1', 'f2', 'f3', 'f4']) {
  const request = readJson(run(`raw/${batch}-request.json`));
  for (const call of readJson(run(`raw/${batch}.json`)).result.calls) {
    const { protocol, dataType } = request.calls[call.seq].args;
    feeBodies.set(`${protocol}:${dataType}`, new Map(call.body.data.totalDataChart));
  }
}
const rawFees = (slug, day) => feeBodies.get(`${registry.venues.find((v) => v.slug === slug).providerSlug}:dailyFees`).get(day) ?? null;
const launchSource = readJson(activityRun('raw/c1.json')).result.calls[0].body.data.filterLaunchpads;
const indexedRows = new Map(launchSource.results.map((r) => [r.id, r]));

test('covered totals preserve exclusions, provider observations and matched denominators', () => {
  const stats = aggregate(LAUNCHPADS, NARRATIVES, FEE_COVERAGE);
  assert.equal(stats.fees24h, null);
  const included = registry.venues.map((v) => v.slug).filter((slug) => !(slug in registry.feeExclusions));
  assert.deepEqual(FEE_COVERAGE.includedSlugs, included);
  assert.equal(stats.feeSubtotal, included.reduce((sum, slug) => sum + rawFees(slug, F - 86400), 0));
  const mapped = registry.venues.filter((v) => v.indexedProviderIds?.length);
  const noCurve = new Set(['argus-world', 'clanker', 'o1-launchpad']);
  const created = (v) => v.indexedProviderIds.reduce((sum, id) => sum + indexedRows.get(id).tokensCreated24, 0);
  const completed = (v) => v.indexedProviderIds.reduce((sum, id) => sum + indexedRows.get(id).tokensCompleted24, 0);
  const completionVenues = mapped.filter((v) => !noCurve.has(v.slug));
  assert.equal(stats.indexedCreated24, mapped.reduce((sum, v) => sum + created(v), 0));
  assert.equal(stats.indexedCompleted24, completionVenues.reduce((sum, v) => sum + completed(v), 0));
  assert.equal(stats.creationCoverage, 14);
  assert.equal(stats.completionCoverage, 11);
  assert.equal(stats.indexedCompletionRate, 100 * stats.indexedCompleted24 / completionVenues.reduce((sum, v) => sum + created(v), 0));
  assert.equal(launchSource.count, launchSource.results.length);
  const used = new Set();
  for (const row of LAUNCHPADS.filter((r) => r.activityObservation)) {
    let sum = 0;
    for (const id of row.activityObservation.providerIds) {
      assert(!used.has(id)); used.add(id);
      sum += indexedRows.get(id).tokensCreated24;
    }
    assert.equal(row.activityObservation.indexedCreated24, sum);
  }
  assert.equal(LAUNCHPADS.find((r) => r.slug === 'argus-world').activityObservation.indexedCompleted24, null);
  assert(!FEE_COVERAGE.includedSlugs.includes('stonkfun'));
  assert(!FEE_COVERAGE.includedSlugs.includes('bags'));
  assert.equal(FEE_COVERAGE.value, raw.filter((r) => FEE_COVERAGE.includedSlugs.includes(r.slug)).reduce((s,r) => s + r.metrics.h24.fees, 0));
  for (const point of FEE_COVERAGE.history30d) {
    const parts = included.map((slug) => rawFees(slug, point.time));
    assert.equal(point.value, parts.includes(null) ? null : parts.reduce((a, b) => a + b, 0));
  }
});

test('enrichment retains source evidence, supported networks and verified local assets', () => {
  const enriched = JSON.parse(readFileSync(new URL(`../${SNAPSHOT.enrichmentPath}`, import.meta.url)));
  const logos = JSON.parse(readFileSync(new URL('../docs/data/launchpad-logos.json', import.meta.url)));
  assert.equal(new Set(logos.map((r) => r.slug)).size, LAUNCHPADS.length);
  for (const row of LAUNCHPADS) {
    const metadata = enriched.records.find((r) => r.slug === row.slug);
    assert(row.chains.length > 0);
    assert.deepEqual(row.chains, metadata.chains);
    assert(metadata.chainEvidence.url || metadata.chainEvidence.raw);
    const logo = logos.find((r) => r.slug === row.slug);
    assert.equal(row.logoSrc, logo.logoSrc);
    const file = readFileSync(new URL(`../public${row.logoSrc}`, import.meta.url));
    assert.equal(createHash('sha256').update(file).digest('hex'), logo.sha256);
  }
  const rapid = LAUNCHPADS.find((r) => r.slug === 'rapid-launch');
  assert.equal(rapid.chains.length, 7);
  assert.deepEqual(rapid.metricChains, ['solana']);
  assert.deepEqual(rapid.provenance.additionalSupportedChains, ['stable', 'ink']);
  const stats = aggregate(LAUNCHPADS, NARRATIVES);
  assert.deepEqual(new Set(stats.chains), new Set(LAUNCHPADS.flatMap((r) => r.chains)));
  assert.equal(stats.chainCount, 9);
});

test('all venue metrics preserve the acquired values and missing observations', () => {
  assert.equal(LAUNCHPADS.length, 19);
  for (const row of LAUNCHPADS) {
    assert.deepEqual(row.metrics, raw.find((r) => r.slug === row.slug).metrics);
    assert.equal(row.metrics.launched24h, null);
    assert.equal(row.provenance.financialAnchor, SNAPSHOT.financialEnd);
    assert.deepEqual(row.metrics.history30d.map((p) => p.time), Array.from({ length: 30 }, (_, i) => F - (30 - i) * 86400));
    for (const p of row.metrics.history30d) assert.equal(p.value, rawFees(row.slug, p.time));
    const window = (days, end) => Array.from({ length: days }, (_, i) => rawFees(row.slug, end - (days - i) * 86400));
    const sum = (values) => values.includes(null) ? null : values.reduce((a, b) => a + b, 0);
    for (const [key, days] of [['h24', 1], ['d7', 7], ['d30', 30]]) {
      const current = sum(window(days, F));
      const previous = sum(window(days, F - days * 86400));
      assert.equal(row.metrics[key].fees, current);
      assert.equal(row.metrics[key].change, current === null || !previous ? null : 100 * (current - previous) / previous);
    }
  }
  assert.equal(LAUNCHPADS.find((r) => r.slug === 'pons').hasBondingCurve, null);
  assert.equal(LAUNCHPADS.find((r) => r.slug === 'pump.fun').hasBondingCurve, true);
});

test('unknown values are never formatted as zero or a positive change', () => {
  for (const format of [compactUsd, int, percent, bps]) assert.equal(format(null), '—');
  assert.equal(compactUsd(0), '$0');
  assert.equal(percent(0), '0.0%');
});

test('coverage counts do not add overlapping financial flows', () => {
  const stats = aggregate(LAUNCHPADS, NARRATIVES);
  assert.equal(stats.launchpadCount, 19);
  assert.equal(stats.completeHistories, raw.filter((r) => r.metrics.history30d.every((p) => p.value !== null)).length);
  assert.equal(stats.constituentCount, registry.poolUniverse.length);
  assert.equal(stats.narrativeCount, new Set(registry.poolUniverse.map((p) => p.narrativeId)).size);
  assert.equal(stats.fees24h, null);
});

test('charts reconcile to sample volume and preserve evidence-backed token identity', () => {
  const slugs = new Set(LAUNCHPADS.map((l) => l.slug));
  // Every getBars alias in this run's raw requests, keyed by pool address.
  const bars = new Map();
  for (const { query, data } of narrativeCalls) {
    for (const [, alias, pool, network] of query.matchAll(/(p\d+):getBars\(symbol:"(\w+):(\d+)"/g)) {
      assert.equal(Number(network), registry.poolUniverse.find((p) => p.pool === pool).networkId);
      bars.set(pool, data[alias]);
    }
  }
  const zeros = new Set(readJson(narrativeRun('precreation-zero-provenance.json')).map((z) => `${z.pool}:${z.time}`));
  const hourly = (tokenId, time) => {
    const { pool } = registry.poolUniverse.find((p) => p.tokenId === tokenId);
    const b = bars.get(pool);
    const at = b.t.indexOf(time);
    const value = at === -1 ? null : b.volume[at];
    if (value === null) { assert(zeros.has(`${pool}:${time}`)); return 0; }
    return Number(value);
  };
  for (const n of NARRATIVES) {
    const points = n.series[0].points;
    const end = Date.parse(n.provenance.chartAnchor) / 1000;
    assert.equal(end, Date.parse(SNAPSHOT.chartEnd) / 1000);
    assert.deepEqual(points.map((p) => p.time), Array.from({length:24}, (_,i) => end - 86400 + i * 3600));
    assert(Math.abs(points.reduce((sum, p) => sum + p.value, 0) - n.volume24hUsd) < .01);
    assert.equal(n.extendedSeries[0].points.length, 168);
    for (const p of n.extendedSeries[0].points) {
      assert(Math.abs(n.contenders.reduce((sum, c) => sum + hourly(c.id, p.time), 0) - p.value) < .01);
    }
    assert(Math.abs(n.extendedSeries[0].points.reduce((sum,p) => sum + p.value, 0) - n.volume7dUsd) < .01);
    assert.deepEqual(n.extendedSeries[0].points.slice(-24), points);
    assert.equal(n.mindshare, null);
    assert.equal(n.topLaunchpads, null);
    assert(Math.abs(n.contenders.reduce((sum,c) => sum + c.measuredVolumeShare, 0) - 100) < .001);
    for (const c of n.contenders) {
      assert.equal(c.share, null);
      const member = registry.poolUniverse.find((p) => p.tokenId === c.id);
      assert.equal(c.id, `${member.chain}:${c.address}`);
      assert.equal(Boolean(c.explorerUrl), member.chain === 'solana' || member.chain === 'bsc');
      assert(slugs.has(c.launchpadSlug));
    }
    assert(n.signals.every((s) => s.url.startsWith('https://x.com/') && Number.isFinite(Date.parse(s.at))));
  }
});

test('example token changes use percent units from the ratio-valued provider field', () => {
  const snapshot = narrativeCalls.flatMap(({ data }) => data.filterTokens?.results ?? []);
  for (const n of NARRATIVES) for (const token of n.exampleTokens) {
    const { networkId } = registry.poolUniverse.find((p) => p.address === token.address);
    const row = snapshot.find((r) => r.pair.networkId === networkId && (r.pair.token0 === token.address || r.pair.token1 === token.address));
    assert(row, token.symbol);
    assert.equal(token.change24h, 100 * Number(row.change24));
    assert.equal(token.mcapUsd, Number(row.circulatingMarketCap));
  }
});

test('discovery keeps rejected and quarantined candidates out of narratives', () => {
  const { candidates } = readJson(narrativeRun('candidates.json'));
  const members = new Set(NARRATIVES.flatMap((n) => n.contenders.map((c) => c.address)));
  for (const c of candidates) assert.equal(members.has(c.address), c.status === 'accepted', `${c.symbol} is ${c.status}`);
  for (const n of NARRATIVES) {
    assert(n.provenance.sources.length > 0);
    for (const s of n.provenance.sources) assert(s.url.startsWith('https://'));
  }
});
