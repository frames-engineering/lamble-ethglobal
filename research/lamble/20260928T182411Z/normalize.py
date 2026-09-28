#!/usr/bin/env python3
"""Narrative-only refresh for run 20260928T182411Z. Offline; never spends credits.

Moves the chart anchor so Froink (pool created after the 154336Z anchor) has
observed hours, and adds the BNB Chain and Robinhood Chain launch-tool tokens.
Financials and indexed activity stay on 20260928T154336Z.
"""
import csv, datetime as dt, hashlib, json, math, pathlib, re

P = pathlib.Path(__file__).resolve().parent
ROOT = P.parents[2]
BASE = P.parent / '20260928T154336Z'
VERSION = 'lamble-narrative-refresh-1.1.0'
RUNTIME = '2026-09-28T18:24:11Z'
RUNTIME_TS = int(dt.datetime.fromisoformat(RUNTIME.replace('Z', '+00:00')).timestamp())
T = RUNTIME_TS // 3600 * 3600 - 3600
NETWORK_CHAIN = {1399811149: 'solana', 56: 'bsc', 4663: 'robinhood'}
PALETTE = ['#4895ef', '#7c83ff', '#a78bfa', '#f59e0b', '#22c55e', '#ef6f6c', '#2dd4bf', '#e879f9']


def read(name, root=P): return json.loads((root / name).read_text())
def write(name, obj): (P / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
def iso(t): return dt.datetime.fromtimestamp(t, dt.timezone.utc).isoformat().replace('+00:00', 'Z')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def percent(a, b): return None if a is None or b in (None, 0) else 100 * (a - b) / b


registry = read('docs/prompts/refresh-market-data.sources.json', ROOT)
run = read('raw/b1.json'); req = read('raw/b1-request.json')
assert run['status'] == 'completed' and all(c['delivered'] for c in run['result']['calls'])
eid = {}
evidence = []
for c in run['result']['calls']:
    i = f'frames-{P.name}-b1-{c["seq"]}'; eid[c['seq']] = i
    evidence.append(dict(id=i, route='frames', tool=c['tool_id'], upstream='Codex', redacted_request=req['calls'][c['seq']], run_id=run['run_id'],
                         seq=c['seq'], response_ref='raw/b1.json', sha256=sha(P / 'raw/b1.json'), extraction_path=f'$.result.calls[{c["seq"]}].body',
                         fetched_at=RUNTIME, delivery=c['delivered'], delivery_outcome=c['outcome'], methodology_version=VERSION))

# ---------------------------------------------------------------- bars for the declared universe
bars, bar_eid = {}, {}
for seq in (0, 1):
    q = req['calls'][seq]['args']['query']; data = run['result']['calls'][seq]['body']['data']
    for alias, pool, net, frm, to in re.findall(r'(p\d+):getBars\(symbol:"(\w+):(\d+)",from:(\d+),to:(\d+)', q):
        assert (int(frm), int(to)) == (T - 7 * 86400, T - 1) and pool not in bars
        bars[pool] = data[alias]; bar_eid[pool] = eid[seq]
universe = registry['poolUniverse']
pools = [u['pool'] for u in universe]
assert len(set(pools)) == len(pools) and set(pools) == set(bars)
snapshot = run['result']['calls'][2]['body']['data']['filterTokens']['results']
created = {}
for r in read('raw/pools.json', P.parent / '20260926T184109Z')['result']['calls'][0]['body']['data']['filterTokens']['results'] + snapshot:
    created[r['pair']['address']] = r['pair']['createdAt']
grid = list(range(T - 7 * 86400, T, 3600))
series, precreation = {}, []
for u in universe:
    b = bars[u['pool']]; assert len(b['t']) == len(set(b['t'])) and all(T - 7 * 86400 <= t < T and t % 3600 == 0 for t in b['t'])
    vals = dict(zip(b['t'], b['volume'])); out = []
    for t in grid:
        v = vals.get(t)
        c = created.get(u['pool'])
        if v is None and c is not None and t + 3600 <= c:
            v = 0; precreation.append(dict(pool=u['pool'], chain=u['chain'], time=t, poolCreatedAt=c,
                                           basis='Entire bucket precedes provider pool creation time; no pool existed. Not a token-wide inactivity claim.'))
        assert v is not None, (u['symbol'], t, 'unexpected missing live-pool bucket')
        v = float(v); assert v >= 0; out.append(dict(time=t, value=v))
    series[u['tokenId']] = out

# ---------------------------------------------------------------- identities, memberships, market snapshot
base_names = {}
d3 = read('raw/d3.json', BASE)['result']['calls'][0]['body']['data']
for alias in ('t0', 't1'):
    for x in d3[alias]: base_names[(x['address'], x['networkId'])] = x
tokens = read('tokens.json', BASE); members = read('memberships.json', BASE)
base_evidence = {e['id']: e for e in read('evidence.json', BASE)}
known = {t['id'] for t in tokens}
d3_eid = f'frames-{BASE.name}-d3-0'
ADDED = {
    'solana:2yu92oYzBWLAdVpu8BoaLzmM1oxPsHoboay2BXmeDDZr': ('Froink announced on X as a Solana launchpad for X creators that forfeits unclaimed fees; pool token0 matches the mint.',
                                                            [d3_eid, 'x-2104598191681237311']),
    'bsc:0x55db4b1f497b1d7aa93354701883efc758367777': ('Token metadata: "Token launches with fees wired to social media accounts" (Flap, BNB Chain); pool token0 matches the token.', [d3_eid]),
    'robinhood:0x68353dea233cf2ed0f4ab795430962cc50e5d325': ('Token metadata: "Dollhouse is a launchpad on Robinhood Chain" (Pons); pool token1 matches the token.', [d3_eid]),
}
for u in universe:
    if u['tokenId'] in known: continue
    assert u['tokenId'] in ADDED, u['tokenId']
    meta = base_names[(u['address'], u['networkId'])]
    assert (meta['name'], meta['symbol']) == (u['name'], u['symbol'])
    rationale, evid = ADDED[u['tokenId']]
    tokens.append(dict(id=u['tokenId'], chain=u['chain'], address=u['address'], name=u['name'], symbol=u['symbol'], originLaunchpadSlug=u['originLaunchpadSlug'],
                       originStatus=u['originStatus'], evidenceIds=evid, firstObservedAt=RUNTIME, pool=u['pool'], poolCreatedAt=created.get(u['pool']),
                       description=(meta.get('info') or {}).get('description')))
    members.append(dict(id=f"{u['narrativeId']}:{u['tokenId']}", narrativeId=u['narrativeId'], tokenId=u['tokenId'], version=1, methodVersion=VERSION,
                        rationale=rationale, evidenceIds=evid, effectiveFrom=RUNTIME, effectiveTo=None, firstObservedAt=RUNTIME,
                        historicalMembershipBasis='reconstructed_today', confidence='source-supported; not calibrated'))
by_token = {}
for r in snapshot:
    for a in (r['pair']['token0'], r['pair']['token1']):
        by_token.setdefault(f"{NETWORK_CHAIN[r['pair']['networkId']]}:{a}", r)
for t in tokens:
    r = by_token[t['id']]
    t.update(mcapUsd=float(r['circulatingMarketCap']), change24h=100 * float(r['change24']), priceUsd=float(r['priceUSD']), marketSnapshotPair=r['pair']['address'],
             marketSnapshotEvidenceId=eid[2], marketSnapshotFetchedAt=RUNTIME,
             priceChangeScope='Codex filterTokens rolling 24h token price change; ratio converted to percent. Distinct from chart window.')

# ---------------------------------------------------------------- narratives
narratives = read('narratives.json', BASE)
tok = {t['id']: t for t in tokens}
pool_of = {u['tokenId']: u['pool'] for u in universe}
for t in tokens: t.setdefault('pool', pool_of[t['id']])
prev_ext = {n['id']: {p['time']: p['value'] for p in n['_meta']['extendedSeries'][0]['points']} for n in narratives}
for n in narratives:
    have = {c['id'] for c in n['contenders']}
    for u in universe:
        if u['narrativeId'] == n['id'] and u['tokenId'] not in have:
            n['contenders'].append(dict(id=u['tokenId'], name=u['name'], symbol=u['symbol'], share=None, change24h=None, color=None, launchpadSlug=u['originLaunchpadSlug']))
            n['exampleTokens'].append(dict(_tokenId=u['tokenId'], symbol=u['symbol'], name=u['name'], launchpadSlug=u['originLaunchpadSlug'], chain=u['chain'], mcapUsd=None, change24h=None))
    ids = [c['id'] for c in n['contenders']]
    assert set(ids) == {u['tokenId'] for u in universe if u['narrativeId'] == n['id']}
    ext = [dict(time=grid[j], value=math.fsum(series[i][j]['value'] for i in ids)) for j in range(168)]
    v24 = math.fsum(p['value'] for p in ext[-24:]); prev = math.fsum(p['value'] for p in ext[-48:-24])
    n['series'][0]['points'] = ext[-24:]; n['volume24hUsd'] = v24; n['volume7dUsd'] = math.fsum(p['value'] for p in ext)
    shares = [dict(tokenId=i, share=100 * math.fsum(p['value'] for p in series[i][-24:]) / v24) for i in ids]
    chains = sorted({tok[i]['chain'] for i in ids})
    chain_names = {'solana': 'Solana', 'bsc': 'BNB Chain', 'robinhood': 'Robinhood Chain'}
    m = n['_meta']
    m.update(chartAnchor=iso(T).replace('Z', '+00:00'), extendedSeries=[dict(id='volume', label='Volume', color=n['series'][0]['color'], points=ext)],
             volumeChange24h=percent(v24, prev), contenderVolumeShares=shares, constituentCount=len(ids), constituentTokenIds=ids,
             poolIds=[f"{tok[i]['chain']}_{tok[i]['pool']}" for i in ids], marketDataRun=P.name, marketEvidenceIds=sorted({bar_eid[tok[i]['pool']] for i in ids}),
             volumeScope=f"Sum of {len(ids)} selected {', '.join(chain_names[c] for c in chains)} pool volumes for identified constituents, attributed to launch origin; not all-market coverage. Current membership reconstructed retrospectively.")
    share = {s['tokenId']: s['share'] for s in shares}
    n['contenders'].sort(key=lambda c: -share[c['id']])
    for k, c in enumerate(n['contenders']): c['color'] = PALETTE[k % len(PALETTE)]
    for ex in n['exampleTokens']: ex.update(mcapUsd=tok[ex['_tokenId']]['mcapUsd'], change24h=tok[ex['_tokenId']]['change24h'])
    n['exampleTokens'].sort(key=lambda e: -share[e['_tokenId']])
    if n['id'] == 'n-launchpad-coins':
        m['presentationSummary'] = 'Coins for new launch tools, several copying UsePaid for other platforms: XPAD for X handles, insta.fan for Instagram, Froink for X creators, plus BNB and Robinhood Chain variants.'
        m['omittedCandidates'] = 'See candidates.json.'
    for s in n['signals']:
        evidence.append(base_evidence[s['id']])
narratives.sort(key=lambda n: (-n['volume24hUsd'], n['id']))

# ---------------------------------------------------------------- validation
overlap = []
for n in narratives:
    new = {p['time']: p['value'] for p in n['_meta']['extendedSeries'][0]['points']}
    old = prev_ext[n['id']]
    # Only hours whose constituent set is unchanged are comparable across runs.
    same_universe = n['id'] != 'n-launchpad-coins'
    common = sorted(set(old) & set(new))
    diffs = [dict(time=t, previous=old[t], current=new[t]) for t in common if abs(old[t] - new[t]) > .01]
    overlap.append(dict(narrativeId=n['id'], overlappingHours=len(common), sameUniverse=same_universe, revisedHours=len(diffs) if same_universe else None,
                        maxAbsRevisionUsd=max((abs(d['current'] - d['previous']) for d in diffs), default=0) if same_universe else None))
    pts = n['series'][0]['points']
    assert [p['time'] for p in pts] == grid[-24:]
    assert math.isclose(math.fsum(p['value'] for p in pts), n['volume24hUsd'], abs_tol=.01)
    assert math.isclose(math.fsum(p['value'] for p in n['_meta']['extendedSeries'][0]['points']), n['volume7dUsd'], abs_tol=.01)
    assert math.isclose(sum(s['share'] for s in n['_meta']['contenderVolumeShares']), 100, abs_tol=1e-6)
    assert n['mindshare'] is None and n['topLaunchpads'] is None and all(c['share'] is None for c in n['contenders'])
    slugs = {v['slug'] for v in registry['venues']}
    assert all(c['launchpadSlug'] in slugs for c in n['contenders'])
assert len({t['id'] for t in tokens}) == len(tokens)
for e in evidence:
    if e.get('response_ref', '').startswith('raw/') and e['id'].startswith(f'frames-{P.name}'): assert sha(P / e['response_ref']) == e['sha256']
txt = (P / 'raw/b1.json').read_text()
assert not re.search(r'(?i)(authorization|x-api-key|bearer\s+[a-z0-9])', txt)

candidates = read('candidates.json', BASE)
for c in candidates['candidates']:
    for t in tokens:
        if t['address'] == c['address']:
            c.update(status='accepted', acceptedIn=P.name,
                     reason=c['reason'] + ' Accepted in ' + P.name + (' after the chart anchor moved past its pool creation.' if t['chain'] == 'solana' else ' with chain-aware charts and explorer links.'))
candidates['accepted'] += [dict(tokenId=t['id'], symbol=t['symbol'], narrativeId='n-launchpad-coins', acceptedIn=P.name) for t in tokens if t['id'] in ADDED]

billing = dict(charged_credits=run['billing']['charged_credits'], percent_remaining=run['billing']['percent_remaining'], run_ids=[run['run_id']])
validation = dict(as_of=RUNTIME, passed=True, chartAnchor=iso(T), pools=len(pools), chains=sorted({u['chain'] for u in universe}),
                  precreationZeroBuckets=len(precreation), hourlyOverlapWithPriorRun=overlap, narrativeCount=len(narratives), constituentCount=len(tokens), billing=billing,
                  limitations=['Robinhood Chain has no verified explorer link; contenders render without one.',
                               'Pool creation times are provider-reported; a non-null bar before creation is kept as observed.',
                               'Narrative story evidence (UsePaid pause, KNOTS page) is carried from 20260928T154336Z, not re-fetched.'])
manifest = dict(runId=P.name, version=VERSION, runtimeStartedAt=RUNTIME, scope='narratives only', financialRun=BASE.name, activityRun=BASE.name,
                watermarks=dict(narrativeExclusiveEnd=iso(T)), requests=['raw/b1-request.json'], costs=billing, recurringTaskCreated=False,
                authorization='User asked to add Froink and the non-Solana launch-tool tokens.', refreshPrompt='docs/prompts/refresh-market-data.md')
for name, obj in [('narratives.json', narratives), ('tokens.json', tokens), ('memberships.json', members), ('evidence.json', evidence),
                  ('precreation-zero-provenance.json', precreation), ('hourly-revisions.json', overlap), ('candidates.json', candidates),
                  ('validation-report.json', validation), ('refresh-manifest.json', manifest)]:
    write(name, obj)
with (P / 'chart-data.csv').open('w', newline='') as f:
    w = csv.writer(f, lineterminator='\n'); w.writerow(['narrative_id', 'bucket_start_unix', 'bucket_start_utc', 'volume_usd'])
    for n in narratives:
        for p in n['_meta']['extendedSeries'][0]['points']: w.writerow([n['id'], p['time'], iso(p['time']), p['value']])
print(json.dumps(dict(chartAnchor=iso(T), billing=billing['charged_credits'], overlap=overlap,
                      narratives=[(n['id'], round(n['volume24hUsd']), round(n['_meta']['volumeChange24h'], 1), len(n['contenders'])) for n in narratives]), indent=1))
