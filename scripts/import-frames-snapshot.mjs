// Offline, explicit snapshot import. No API calls or metered requests.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const run = process.argv[2] ?? 'research/lamble/20260926T172434Z';
const read = async (file) => JSON.parse(await readFile(path.join(run, file), 'utf8'));
const [rawLaunchpads, , evidence, manifest, validation] = await Promise.all(
  ['launchpads.json', 'narratives.json', 'evidence.json', 'refresh-manifest.json', 'validation-report.json'].map(read),
);
assert.equal(validation.passed, true);
assert.equal(rawLaunchpads.length, 19);
const knownChains = new Set(['solana','base','bsc','ethereum','arbitrum','monad','robinhood','arc','xlayer','unichain']);
const enrichmentPath = process.argv[3] ?? 'research/lamble/20260926T175634Z/launchpad-enrichment.json';
const enrichment = JSON.parse(await readFile(enrichmentPath, 'utf8'));
const enrichments = new Map(enrichment.records.map((r) => [r.slug, r]));
const activityPath = process.argv[4] ?? 'research/lamble/20260926T182058Z/landing-metrics.json';
const narrativeRun = process.argv[5] ?? 'research/lamble/20260926T184109Z';
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
const sources = new Map(evidence.map((e) => [e.id, e]));
const narratives = rawNarratives.map(({ _meta: m, ...row }) => {
  const points = row.series[0].points;
  assert.equal(points.length, 24);
  const end = Date.parse(m.chartAnchor) / 1000;
  assert(points.every((p, i) => p.time === end - 86400 + i * 3600 && p.value !== null));
  assert(Math.abs(points.reduce((sum, p) => sum + p.value, 0) - row.volume24hUsd) < .01);
  const contenders = row.contenders.map((c) => {
    assert(slugs.has(c.launchpadSlug));
    const [chain, address] = c.id.split(':');
    assert.equal(chain, 'solana'); assert(address);
    return { ...c, address, explorerUrl: `https://solscan.io/token/${address}`,
      measuredVolumeShare: m.contenderVolumeShares.find((s) => s.tokenId === c.id)?.share };
  });
  return { ...row, contenders,
    summary: m.presentationSummary ?? row.summary,
    extendedSeries: m.extendedSeries,
    volumeChange24h: m.volumeChange24h,
    signals: row.signals.map((signal) => {
      const url = sources.get(signal.id)?.url;
      assert(url, `Missing signal evidence: ${signal.id}`);
      return { ...signal, url };
    }),
    exampleTokens: row.exampleTokens.map(({ _tokenId, ...token }) => ({ ...token, address: _tokenId.split(':')[1] })),
    provenance: { chartAnchor: m.chartAnchor, volumeScope: m.volumeScope,
      sources: row.id === 'n-x-money'
        ? [{ label: 'UsePaid documentation', url: 'https://usepaid.app/docs' }, { label: 'Token registry', url: 'https://usepaid.app/' }]
        : [{ label: 'KNOTS mechanism', url: 'https://www.knotsonstonk.com/' }, { label: 'ZCAT identity and rewards', url: 'https://www.mexc.co/en-NG/learn/article/what-is-anonymous-cat-zcat-the-solana-meme-coin-paying-zec/1' }],
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
