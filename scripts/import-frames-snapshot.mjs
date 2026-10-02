// Offline, explicit snapshot import. No API calls or metered requests.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const run = process.argv[2] ?? 'research/lamble/20261002T012546Z';
const read = async (file) => JSON.parse(await readFile(path.join(run, file), 'utf8'));
const [rawLaunchpads, , evidence, manifest, validation] = await Promise.all(
  ['launchpads.json', 'narratives.json', 'evidence.json', 'refresh-manifest.json', 'validation-report.json'].map(read),
);
assert.equal(validation.passed, true);
assert.equal(rawLaunchpads.length, 19);
// Token explorers verified per chain; chains without one render plain names.
const EXPLORERS = { solana: 'https://solscan.io/token/', bsc: 'https://bscscan.com/token/', base: 'https://basescan.org/token/', ethereum: 'https://etherscan.io/token/' };
const knownChains = new Set(['solana','base','bsc','ethereum','arbitrum','monad','robinhood','arc','xlayer','unichain']);
const enrichmentPath = process.argv[3] ?? 'research/lamble/20260926T175634Z/launchpad-enrichment.json';
const enrichment = JSON.parse(await readFile(enrichmentPath, 'utf8'));
const enrichments = new Map(enrichment.records.map((r) => [r.slug, r]));
// Keep reviewed brand assets across market-data refreshes.
const logoRegistry = JSON.parse(await readFile('docs/data/launchpad-logos.json', 'utf8'));
const logos = new Map(logoRegistry.map((r) => [r.slug, r.logoSrc]));
const activityPath = process.argv[4] ?? 'research/lamble/20261002T012546Z/landing-metrics.json';
const narrativeRun = process.argv[5] ?? 'research/lamble/20261002T012546Z';
const landingMetrics = JSON.parse(await readFile(activityPath, 'utf8'));
const rawNarratives = JSON.parse(await readFile(path.join(narrativeRun, 'narratives.json'), 'utf8'));
assert.equal(JSON.parse(await readFile(path.join(narrativeRun, 'validation-report.json'), 'utf8')).passed, true);
const activity = new Map(landingMetrics.activity.map((r) => [r.slug, {
  sourceAsOf: r.sourceAsOf, providerIds: r.providerIds,
  indexedCreated24: r.indexedCreated24, indexedCompleted24: r.indexedCompleted24,
  indexed7dAvg: r.indexed7dAvg, indexed7dCompletionRate: r.indexed7dCompletionRate,
  coverage: r.coverage,
}]));
assert.equal(enrichments.size, 19);
const launchpads = rawLaunchpads.map(({ _meta: m, ...row }) => {
  const enriched = enrichments.get(row.slug);
  assert(enriched, `Missing enrichment for ${row.slug}`);
  row.chains = enriched.chains;
  if (enriched.logo) row.logoSrc = enriched.logo.logoSrc;
  if (logos.has(row.slug)) row.logoSrc = logos.get(row.slug);
  if (enriched.fields.graduatesTo) row.graduatesTo = enriched.fields.graduatesTo;
  if (enriched.fields.feeNote) row.feeModel = { ...row.feeModel, note: enriched.fields.feeNote };
  assert.equal(row.metrics.history30d.length, 30);
  for (const c of (row.chains ?? [])) assert(knownChains.has(c), `Unknown chain ${c}`);
  return { ...row, domain: new URL(row.url).hostname.replace(/^www\./, '') + (new URL(row.url).pathname === '/' ? '' : new URL(row.url).pathname.replace(/\/$/, '')), chains: row.chains ?? [], bestFor: row.bestFor ?? [], routingNotes: row.routingNotes ?? [],
    logoSrc: row.logoSrc ?? undefined, twitter: row.twitter ?? undefined,
    activityObservation: activity.get(row.slug),
    hasBondingCurve: enriched.fields.hasBondingCurve ?? m.hasBondingCurve, metricChains: m.metricChainIds.filter((c) => knownChains.has(c)),
    provenance: { financialAnchor: m.financialAnchor, scope: m.metricScope,
      supportedChainCoverage: enriched.chainCoverage,
      additionalSupportedChains: enriched.additionalSupportedChains,
      metadataSourceUrls: [enriched.chainEvidence.url, ...(enriched.fields.references ?? []).map((r) => r.url)].filter(Boolean),
      metadataFetchedAt: enrichment.fetchedAt,
      additionalMetricChains: m.metricChainIds.filter((c) => !knownChains.has(c)),
      sourceUrl: m.methodologyURL, methodology: m.methodology ?? {},
      deliveryDisputed: m.financialDeliveryDisputes.length > 0,
      configurationVariants: m.configurationVariants.map((variant) => JSON.stringify(variant)),
    },
  };
});
const slugs = new Set(launchpads.map((l) => l.slug));
const narrativeEvidence = JSON.parse(await readFile(path.join(narrativeRun, 'evidence.json'), 'utf8'));
const sources = new Map([...evidence, ...narrativeEvidence].map((e) => [e.id, e]));
const narratives = rawNarratives.map(({ _meta: m, ...row }) => {
  const points = row.series[0].points;
  assert.equal(points.length, 24);
  const end = Date.parse(m.chartAnchor) / 1000;
  assert(points.every((p, i) => p.time === end - 86400 + i * 3600 && p.value !== null));
  assert(Math.abs(points.reduce((sum, p) => sum + p.value, 0) - row.volume24hUsd) < .01);
  if (m.dailySeries) {  // 30 complete UTC days ending at dailyEnd, summing to volume30dUsd
    const days = m.dailySeries[0].points, dayEnd = Date.parse(m.dailyEnd) / 1000;
    assert.equal(days.length, 30);
    assert(days.every((p, i) => p.time === dayEnd - (30 - i) * 86400 && Number.isFinite(p.value) && p.value >= 0));
    assert(Math.abs(days.reduce((sum, p) => sum + p.value, 0) - m.volume30dUsd) < .01);
  }
  const contenders = row.contenders.map((c) => {
    assert(slugs.has(c.launchpadSlug));
    const [chain, address] = c.id.split(':');
    assert(knownChains.has(chain), `Unknown chain ${chain}`); assert(address);
    // Only explorers verified for these chains; others render as plain text.
    const explorer = EXPLORERS[chain];
    return { ...c, address, explorerUrl: explorer ? explorer + address : undefined,
      measuredVolumeShare: m.contenderVolumeShares.find((s) => s.tokenId === c.id)?.share };
  });
  return { ...row, contenders,
    summary: m.presentationSummary ?? row.summary,
    extendedSeries: m.extendedSeries,
    dailySeries: m.dailySeries, volume30dUsd: m.volume30dUsd,
    volumeChange24h: m.volumeChange24h,
    volumeCaveat: m.volumeCaveat ? { text: m.volumeCaveat.text, flaggedShare: m.volumeCaveat.flaggedShare, threshold: m.volumeCaveat.threshold } : null,
    signals: row.signals.map((signal) => {
      const url = sources.get(signal.id)?.url;
      assert(url, `Missing signal evidence: ${signal.id}`);
      return { ...signal, url };
    }),
    exampleTokens: row.exampleTokens.map(({ _tokenId, ...token }) => {
      assert.equal(token.chain, _tokenId.split(':')[0]);
      return { ...token, address: _tokenId.split(':')[1] };
    }),
    provenance: { chartAnchor: m.chartAnchor, volumeScope: m.volumeScope, dailyEnd: m.dailyEnd, dailyScope: m.dailyScope,
      sources: (() => {
        assert(m.provenanceSources?.length, `Missing provenance sources: ${row.id}`);
        for (const s of m.provenanceSources) assert(new URL(s.url).protocol === 'https:' && s.label);
        return m.provenanceSources;
      })(),
    },
  };
}).sort((a,b) => b.volume24hUsd - a.volume24hUsd || a.id.localeCompare(b.id));
const metadata = { runId: manifest.runId, collectedAt: manifest.runtimeStartedAt,
  financialEnd: manifest.watermarks.financialExclusiveEnd, chartEnd: rawNarratives[0]._meta.chartAnchor,
  narrativeRun, activityPath, enrichmentPath };
const out = 'src/lib/data/snapshots/frames.ts';
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, `// Generated by scripts/import-frames-snapshot.mjs. Do not edit by hand.\nimport type { Launchpad, Narrative } from '../types';\n\nexport const SNAPSHOT = ${JSON.stringify(metadata, null, 2)};\nexport const LAUNCHPADS: Launchpad[] = ${JSON.stringify(launchpads, null, 2)} satisfies Launchpad[];\nexport const NARRATIVES: Narrative[] = ${JSON.stringify(narratives, null, 2)} satisfies Narrative[];\n`);
console.log(`Imported ${launchpads.length} launchpads and ${narratives.length} narratives from ${run}`);
await writeFile('src/lib/data/snapshots/coverage.ts', `// Generated offline by import-frames-snapshot.mjs.\nexport const FEE_COVERAGE = ${JSON.stringify(landingMetrics.fees, null, 2)};\n`);
