import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { LAUNCHPADS, NARRATIVES } from '../src/lib/data/snapshots/frames.ts';
import { aggregate } from '../src/lib/data/aggregate.ts';
import { FEE_COVERAGE } from '../src/lib/data/snapshots/coverage.ts';
import { compactUsd, int, percent, bps } from '../src/lib/format.ts';

const raw = JSON.parse(readFileSync(new URL('../research/lamble/20260926T172434Z/launchpads.json', import.meta.url)));

test('covered totals preserve exclusions, provider observations and matched denominators', () => {
  const stats = aggregate(LAUNCHPADS, NARRATIVES, FEE_COVERAGE);
  assert.equal(stats.fees24h, null);
  assert.equal(stats.feeSubtotal, 4889133);
  assert.equal(stats.indexedCreated24, 74239);
  assert.equal(stats.indexedCompleted24, 4211);
  assert.equal(stats.creationCoverage, 14);
  assert.equal(stats.completionCoverage, 11);
  assert.equal(stats.indexedCompletionRate, 100 * 4211 / (74239 - 3062 - 84 - 347));
  const source = JSON.parse(readFileSync(new URL('../research/lamble/20260926T182058Z/raw/launchstats.json', import.meta.url))).result.calls[0].body.data.filterLaunchpads;
  assert.equal(source.count, source.results.length);
  const used = new Set();
  for (const row of LAUNCHPADS.filter((r) => r.activityObservation)) {
    let sum = 0;
    for (const id of row.activityObservation.providerIds) {
      assert(!used.has(id)); used.add(id);
      sum += source.results.find((r) => r.id === id).tokensCreated24;
    }
    assert.equal(row.activityObservation.indexedCreated24, sum);
  }
  assert.equal(LAUNCHPADS.find((r) => r.slug === 'argus-world').activityObservation.indexedCompleted24, null);
  assert(!FEE_COVERAGE.includedSlugs.includes('stonkfun'));
  assert(!FEE_COVERAGE.includedSlugs.includes('bags'));
  assert.equal(FEE_COVERAGE.value, raw.filter((r) => FEE_COVERAGE.includedSlugs.includes(r.slug)).reduce((s,r) => s + r.metrics.h24.fees, 0));
});

test('enrichment retains source evidence, supported networks and verified local assets', () => {
  const enriched = JSON.parse(readFileSync(new URL('../research/lamble/20260926T175634Z/launchpad-enrichment.json', import.meta.url)));
  for (const row of LAUNCHPADS) {
    const metadata = enriched.records.find((r) => r.slug === row.slug);
    assert(row.chains.length > 0);
    assert.deepEqual(row.chains, metadata.chains);
    assert(metadata.chainEvidence.url || metadata.chainEvidence.raw);
    if (metadata.logo) {
      const file = readFileSync(new URL(`../public${row.logoSrc}`, import.meta.url));
      assert.equal(createHash('sha256').update(file).digest('hex'), metadata.logo.sha256);
    }
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
  assert.equal(stats.completeHistories, 14);
  assert.equal(stats.constituentCount, 9);
  assert.equal(stats.narrativeCount, 2);
  assert.equal(stats.fees24h, null);
});

test('charts reconcile to sample volume and preserve evidence-backed token identity', () => {
  const slugs = new Set(LAUNCHPADS.map((l) => l.slug));
  for (const n of NARRATIVES) {
    const points = n.series[0].points;
    const end = Date.parse(n.provenance.chartAnchor) / 1000;
    assert.deepEqual(points.map((p) => p.time), Array.from({length:24}, (_,i) => end - 86400 + i * 3600));
    assert(Math.abs(points.reduce((sum, p) => sum + p.value, 0) - n.volume24hUsd) < .01);
    assert.equal(n.extendedSeries[0].points.length, 168);
    assert(Math.abs(n.extendedSeries[0].points.reduce((sum,p) => sum + p.value, 0) - n.volume7dUsd) < .01);
    assert.deepEqual(n.extendedSeries[0].points.slice(-24), points);
    assert.equal(n.mindshare, null);
    assert.equal(n.topLaunchpads, null);
    assert(Math.abs(n.contenders.reduce((sum,c) => sum + c.measuredVolumeShare, 0) - 100) < .001);
    for (const c of n.contenders) {
      assert.equal(c.share, null);
      assert.equal(c.id, `solana:${c.address}`);
      assert(slugs.has(c.launchpadSlug));
    }
    assert(n.signals.every((s) => s.url.startsWith('https://x.com/') && Number.isFinite(Date.parse(s.at))));
  }
});
