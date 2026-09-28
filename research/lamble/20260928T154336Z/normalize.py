#!/usr/bin/env python3
"""Daily refresh normalizer for run 20260928T154336Z. Offline; never spends credits.

Reads only this run's raw Frames responses plus explicitly named prior baselines
(structure, memberships, identities). Anchors are derived from this run's runtime,
not copied from earlier runs.
"""
import csv, datetime as dt, hashlib, json, math, pathlib, re

P = pathlib.Path(__file__).resolve().parent
ROOT = P.parents[2]
FIN_BASE = P.parent / '20260926T172434Z'   # venue rows, _meta structure, prior fee histories
NAR_BASE = P.parent / '20260926T184109Z'   # narratives, tokens, memberships, pool creation times
ACT_BASE = P.parent / '20260926T182058Z'   # prior indexed activity (revision comparison only)
VERSION = 'lamble-daily-refresh-1.0.0'
RUNTIME = '2026-09-28T15:43:36Z'
RUNTIME_TS = int(dt.datetime.fromisoformat(RUNTIME.replace('Z', '+00:00')).timestamp())
F = RUNTIME_TS // 86400 * 86400            # financial exclusive end: runtime UTC midnight
T = RUNTIME_TS // 3600 * 3600 - 3600       # chart exclusive end: one complete-hour margin
NETWORK = 1399811149


def read(name, root=P): return json.loads((root / name).read_text())
def write(name, obj): (P / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
def iso(t): return dt.datetime.fromtimestamp(t, dt.timezone.utc).isoformat().replace('+00:00', 'Z')
def total(v): return None if any(x is None for x in v) else math.fsum(v)
def percent(a, b): return None if a is None or b in (None, 0) else 100 * (a - b) / b
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


registry = read('docs/prompts/refresh-market-data.sources.json', ROOT)
batches = ['f1', 'f2', 'f3', 'f4', 'c1', 'e1', 'u1', 'd1', 'd2', 'd3', 'd4']
runs = {k: read(f'raw/{k}.json') for k in batches}
requests = {k: read(f'raw/{k}-request.json') for k in batches}
assert all(r['status'] == 'completed' for r in runs.values())
assert len({r['run_id'] for r in runs.values()}) == len(runs)
UPSTREAM = {'mpp.codex.post.graphql': 'Codex', 'bazaar.defillama-use-x402atlas-com-fee-summary': 'DefiLlama via Atlas',
            'mpp.firecrawl.post.v1-scrape': 'Firecrawl / target website', 'bazaar.twitter-use-x402atlas-com-search': 'X via Atlas'}

evidence, eid, outcomes = [], {}, []
for name, r in runs.items():
    raw = P / f'raw/{name}.json'
    for c in r['result']['calls']:
        seq = c['seq']; req = requests[name]['calls'][seq]; body = c.get('body') or {}
        assert 'body_ref' not in c, 'Retrieve stored body before normalization'
        assert c['tool_id'] == req['id']
        i = f'frames-{P.name}-{name}-{seq}'; eid[(name, seq)] = i
        fetched = body.get('queried_at') if isinstance(body, dict) else None
        evidence.append(dict(id=i, route='frames', tool=req['id'], upstream=UPSTREAM.get(req['id'], req['id']), redacted_request=req,
                             run_id=r['run_id'], seq=seq, response_ref=f'raw/{name}.json', sha256=sha(raw), extraction_path=f'$.result.calls[{seq}].body',
                             source_as_of=None, fetched_at=fetched or RUNTIME, fetched_at_basis='provider query timestamp where present, otherwise run start',
                             delivery=c['delivered'], delivery_outcome=c.get('outcome'), methodology_version=VERSION,
                             limitations=['Delivery outcome and semantic validation are separate. Fetched time is not publish time.']))
        outcomes.append(dict(run_id=r['run_id'], seq=seq, tool_id=req['id'], delivered=c['delivered'], outcome=c.get('outcome'),
                             charged_usd=c.get('charged_usd'), reason=(c.get('receipt') or {}).get('reason')))

# ---------------------------------------------------------------- financials
fin, checks, disputes, revisions, method_changes = {}, [], [], [], []
old_lp = {x['_meta']['providerSlug']: x for x in read('launchpads.json', FIN_BASE)}
OLD_F = int(dt.datetime.fromisoformat(read('launchpads.json', FIN_BASE)[0]['_meta']['financialAnchor'].replace('Z', '+00:00')).timestamp())
old_bodies = {}
for name in ['seed', 'f1', 'f2', 'f3', 'f4']:
    orun = read(f'raw/{name}.json', FIN_BASE); oreq = read(f'raw/{name}-request.json', FIN_BASE)
    for c in orun['result']['calls']:
        a = oreq['calls'][c['seq']]
        if a['id'] == 'bazaar.defillama-use-x402atlas-com-fee-summary':
            old_bodies[(a['args']['protocol'], a['args']['dataType'])] = dict(c['body']['data']['totalDataChart'])
for name in ['f1', 'f2', 'f3', 'f4']:
    for c in runs[name]['result']['calls']:
        args = requests[name]['calls'][c['seq']]['args']; provider, kind = args['protocol'], args['dataType']
        d = c['body']['data']; pairs = d['totalDataChart']
        assert d['slug'] == provider, (provider, d['slug'])
        assert len({t for t, _ in pairs}) == len(pairs)
        assert all(t % 86400 == 0 and t <= F and isinstance(v, (int, float)) and v >= 0 for t, v in pairs), provider
        series = dict(pairs); fin[(provider, kind)] = (d, eid[(name, c['seq'])])
        last_complete = max(t for t in series if t < F)
        prior = old_bodies.get((provider, kind), {})
        overlap = [t for t in prior if t < OLD_F and t in series]
        changed = [dict(date=iso(t), previous=prior[t], current=series[t]) for t in sorted(overlap) if prior[t] != series[t]]
        missing_now = [iso(t) for t in prior if t < OLD_F and t not in series]
        recent = [t for t in range(OLD_F - 7 * 86400, OLD_F, 86400) if t in prior]
        if changed or missing_now:
            revisions.append(dict(provider=provider, kind=kind, revisedDays=changed, droppedDays=missing_now))
        old_method = old_lp.get(provider, {}).get('_meta', {}).get('methodology') if kind == 'dailyFees' else None
        if kind == 'dailyFees' and old_method is not None and d.get('methodology') and d['methodology'] != old_method:
            method_changes.append(dict(provider=provider, previous=old_method, current=d['methodology']))
        checks.append(dict(provider=provider, kind=kind, sourceDays=len(pairs), latestCompleteDate=iso(last_complete),
                           containsCurrentPartialDay=F in series, containsFutureDates=False,
                           priorCompleteDaysCompared=len(overlap), last7PriorDaysReconciled=len(recent),
                           revisedDays=len(changed), delivery=c['delivered'], outcome=c.get('outcome')))
        if not c['delivered']:
            same = all(series.get(t) == prior[t] for t in overlap)
            disputes.append(dict(provider=provider, kind=kind, receipt=c['receipt'], evidence_id=eid[(name, c['seq'])],
                                 assessment=('Frames cross-check rejected the body for "future dates"; independent Unix conversion shows every date <= '
                                             f'runtime UTC date {iso(F)[:10]}, and {len(overlap)} prior complete days '
                                             f'{"match" if same else "differ from"} the reference run. Retained as an independently validated returned body, '
                                             'not a delivered call; Frames refunded it.'), priorOverlapMatches=same))

launchpads = read('launchpads.json', FIN_BASE)
venues = {v['slug']: v for v in registry['venues']}
assert [x['slug'] for x in launchpads] == [v['slug'] for v in registry['venues']]
for lp in launchpads:
    provider = lp['_meta']['providerSlug']; assert venues[lp['slug']]['providerSlug'] == provider
    data, refs = {}, []
    for kind, label in [('dailyFees', 'fees'), ('dailyRevenue', 'revenue')]:
        d, e = fin[(provider, kind)]; data[label] = {t: v for t, v in d['totalDataChart'] if t < F}; refs.append(e)
    metrics = {}
    for label, days in [('h24', 1), ('d7', 7), ('d30', 30)]:
        vals = {k: total([v.get(t) for t in range(F - days * 86400, F, 86400)]) for k, v in data.items()}
        prev = total([data['fees'].get(t) for t in range(F - 2 * days * 86400, F - days * 86400, 86400)])
        metrics[label] = {**vals, 'change': percent(vals['fees'], prev)}
    metrics.update({k: None for k in ['launched24h', 'launched7dAvg', 'graduated24h', 'graduationRate7d']})
    metrics['history30d'] = [dict(time=t, value=data['fees'].get(t)) for t in range(F - 30 * 86400, F, 86400)]
    d = fin[(provider, 'dailyFees')][0]; m = lp['_meta']
    lp['metrics'] = metrics
    m.update(financialAnchor=iso(F), source_as_of=iso(F), financialEvidenceIds=refs, fetched_at_reference=refs, financialRoute='frames',
             financialDeliveryDisputes=[x for x in disputes if x['provider'] == provider],
             methodology=d.get('methodology') or m.get('methodology'), methodologyURL=d.get('methodologyURL') or m.get('methodologyURL'),
             financialRun=P.name)

# ---------------------------------------------------------------- indexed activity
act_run = runs['c1']; fl = act_run['result']['calls'][0]['body']['data']['filterLaunchpads']
assert fl['count'] == len(fl['results']) and fl['count'] < 200, 'paginate before import'
rows = {r['id']: r for r in fl['results']}; assert len(rows) == len(fl['results'])
for r in fl['results']:
    for f in ['tokensCreated24', 'tokensCreated1w', 'tokensCompleted24', 'tokensCompleted1w', 'tokensMigrated24']:
        assert isinstance(r[f], int) and r[f] >= 0, (r['id'], f)
    assert r['tokensCreated24'] <= r['tokensCreated1w'] and r['tokensCompleted24'] <= r['tokensCompleted1w'], r['id']
NO_CURVE_COMPLETION = {'argus-world', 'clanker', 'o1-launchpad'}
observations = []
for v in registry['venues']:
    ids = v.get('indexedProviderIds') or []
    if not ids: continue
    sel = [rows[i] for i in ids]
    assert len({r['timestamp'] for r in sel}) == 1
    s = {f: sum(r[f] for r in sel) for f in ['tokensCreated24', 'tokensCreated1w', 'tokensCompleted24', 'tokensCompleted1w', 'tokensMigrated24']}
    curve = v['slug'] not in NO_CURVE_COMPLETION
    observations.append(dict(slug=v['slug'], providerIds=ids, sourceAsOf=sel[0]['timestamp'], networkIds=sorted({n for r in sel for n in r['networkIds']}),
                             indexedCreated24=s['tokensCreated24'], indexedCreated7d=s['tokensCreated1w'],
                             indexedCompleted24=s['tokensCompleted24'] if curve else None, indexedCompleted7d=s['tokensCompleted1w'] if curve else None,
                             indexedMigrated24=s['tokensMigrated24'], indexed7dAvg=s['tokensCreated1w'] / 7,
                             indexed7dCompletionRate=100 * s['tokensCompleted1w'] / s['tokensCreated1w'] if curve and s['tokensCreated1w'] else None,
                             status='candidate_unverified', coverage='Provider-reported indexed activity, beta. Exact window cutoffs, creation-event completeness and finality are not independently established.',
                             rawCompletion=s['tokensCompleted24'], runId=act_run['run_id'], seq=0))
old_act = {o['slug']: o for o in read('landing-metrics.json', ACT_BASE)['activity']}
excluded = registry['feeExclusions']
included = [x for x in launchpads if x['slug'] not in excluded]
assert all(x['metrics']['h24']['fees'] is not None for x in included), 'subtotal component missing; leave aggregate unknown'
grids = [{p['time']: p['value'] for p in x['metrics']['history30d']} for x in included]
times = sorted(set().union(*grids))
fee_history = [dict(time=t, value=math.fsum(g[t] for g in grids) if all(g.get(t) is not None for g in grids) else None) for t in times]
landing = dict(methodologyVersion='lamble-activity-v1', run=P.name, activity=observations,
               fees=dict(value=math.fsum(x['metrics']['h24']['fees'] for x in included), kind='covered subtotal', financialAnchor=iso(F),
                         includedSlugs=[x['slug'] for x in included], excluded=excluded, history30d=fee_history, change30d=None,
                         scope=f'Sum of {len(included)} non-overlapping mapped fee streams for the last complete UTC day. Omits {len(excluded)} overlapping rows; some included adapters cover only one version. Not an all-roster total.'),
               indexedTotals=dict(created24=sum(o['indexedCreated24'] for o in observations), completed24=sum(o['indexedCompleted24'] or 0 for o in observations),
                                  creationVenues=len(observations), completionVenues=sum(o['indexedCompleted24'] is not None for o in observations),
                                  sourceAsOf=observations[0]['sourceAsOf'],
                                  scope=f'Provider-indexed counts, mapped launchpad names. {len(observations)} venue creation records, {sum(o["indexedCompleted24"] is not None for o in observations)} completion records. Beta coverage; omitted venues are unknown, not zero. Not a complete roster total.'))

# ---------------------------------------------------------------- narrative bars
bars, bar_eid = {}, {}
for name, seq in [('c1', 1), ('d4', 0)]:
    q = requests[name]['calls'][seq]['args']['query']; data = runs[name]['result']['calls'][seq]['body']['data']
    for alias, pool, frm, to in re.findall(r'(p\d+):getBars\(symbol:"(\w+):%d",from:(\d+),to:(\d+)' % NETWORK, q):
        assert (int(frm), int(to)) == (T - 7 * 86400, T - 1) and pool not in bars
        bars[pool] = data[alias]; bar_eid[pool] = eid[(name, seq)]
universe = registry['poolUniverse']; pools = [p['pool'] for p in universe]
assert len(set(pools)) == len(pools) and all(p in bars for p in pools)
# Market snapshots: daily refresh first, then discovery rows for newly accepted constituents.
snapshot = runs['c1']['result']['calls'][2]['body']['data']['filterTokens']['results']
disc = runs['d2']['result']['calls'][0]['body']['data']
snap_rows = [(r, eid[('c1', 2)]) for r in snapshot] + [(r, eid[('d1', 1)]) for r in runs['d1']['result']['calls'][1]['body']['data']['mk']['results']] \
    + [(r, eid[('d2', 0)]) for r in disc['active']['results'] + disc['recent']['results']]
created = {p: None for p in pools}
for r in read('raw/pools.json', NAR_BASE)['result']['calls'][0]['body']['data']['filterTokens']['results']:
    created[r['pair']['address']] = r['pair']['createdAt']
for r, _ in snap_rows:
    if r['pair']['address'] in created: created[r['pair']['address']] = r['pair']['createdAt']
grid = list(range(T - 7 * 86400, T, 3600))
series, precreation, barchecks = {}, [], []
prev_ext = {}
for n in read('narratives.json', NAR_BASE):
    for p in n['_meta']['extendedSeries'][0]['points']: prev_ext.setdefault(n['id'], {})[p['time']] = p['value']
for i, pool in enumerate(pools):
    b = bars[pool]; assert len(b['t']) == len(set(b['t']))
    assert all(t % 3600 == 0 and T - 7 * 86400 <= t < T for t in b['t'])
    vals = dict(zip(b['t'], b['volume'])); out = []
    for t in grid:
        v = vals.get(t)
        if v is None and created[pool] is not None and t + 3600 <= created[pool]:
            v = 0; precreation.append(dict(poolIndex=i, pool=pool, time=t, poolCreatedAt=created[pool],
                                           basis='Entire bucket precedes provider on-chain pool creation time; no pool existed. Not a token-wide inactivity claim.'))
        assert v is not None, (i, t, 'unexpected missing live-pool bucket')
        v = float(v); assert v >= 0; out.append(dict(time=t, value=v))
    series[i] = out
    barchecks.append(dict(pool=pool, tokenId=universe[i]['tokenId'], buckets=len(out), returnedBuckets=len(b['t']), evidenceId=bar_eid[pool],
                          precreationZeroBuckets=sum(1 for z in precreation if z['poolIndex'] == i), poolCreatedAt=created[pool]))

# ---------------------------------------------------------------- discovery: accepted constituents
DISCOVERED_AT = '2026-09-28T16:20:00Z'
names = {}
for alias in ('ids',):
    for x in runs['d1']['result']['calls'][1]['body']['data'][alias]: names[x['address']] = (x, eid[('d1', 1)])
for alias in ('t0', 't1'):
    for x in runs['d3']['result']['calls'][0]['body']['data'][alias]: names.setdefault(x['address'], (x, eid[('d3', 0)]))
tokens = read('tokens.json', NAR_BASE); members = read('memberships.json', NAR_BASE)
registry_md = runs['e1']['result']['calls'][0]['body']['data']['markdown']
known = {t['id'] for t in tokens}
new_tokens = []
for u in universe:
    if u['tokenId'] in known: continue
    meta, name_eid = names[u['address']]
    assert (meta['name'], meta['symbol']) == (u['name'], u['symbol']) and meta['networkId'] == NETWORK
    if u['narrativeId'] == 'n-x-money':
        assert f"https://usepaid.app/token/{u['address']}" in registry_md, 'UsePaid addition must be in the official registry'
        evid = [eid[('e1', 0)], name_eid]
        rationale = 'Official UsePaid homepage lists this exact mint under Top Tokens with a named X recipient and Pump origin; pool token0 matches the mint.'
    else:
        desc = (meta.get('info') or {}).get('description') or ''
        assert re.search(r'(?i)launch|market|handle', desc), 'launch-tool membership needs a self-description'
        evid = [name_eid, eid[('d2', 0)]]
        rationale = f'Token metadata describes a launch tool: "{desc[:160]}". Pool token0 matches the mint.'
    new_tokens.append(u)
    tokens.append(dict(id=u['tokenId'], chain='solana', address=u['address'], name=u['name'], symbol=u['symbol'], originLaunchpadSlug=u['originLaunchpadSlug'],
                       originStatus=u['originStatus'], evidenceIds=evid, firstObservedAt=DISCOVERED_AT, pool=u['pool'], poolCreatedAt=created[u['pool']],
                       description=(meta.get('info') or {}).get('description')))
    members.append(dict(id=f"{u['narrativeId']}:{u['tokenId']}", narrativeId=u['narrativeId'], tokenId=u['tokenId'], version=1, methodVersion=VERSION,
                        rationale=rationale, evidenceIds=evid, effectiveFrom=DISCOVERED_AT, effectiveTo=None, firstObservedAt=DISCOVERED_AT,
                        historicalMembershipBasis='reconstructed_today', confidence='source-supported; not calibrated'))

by_token = {}
for r, e in snap_rows:
    for a in (r['pair']['token0'], r['pair']['token1']):
        if f'solana:{a}' in {t['id'] for t in tokens}: by_token.setdefault(f'solana:{a}', (r, e))
assert set(by_token) == {t['id'] for t in tokens}, 'token snapshot missing an identity'
snap_at = iso(act_run['result']['calls'][0]['body']['data']['filterLaunchpads']['results'][0]['timestamp'])
for t in tokens:
    r, e = by_token[t['id']]
    t.update(mcapUsd=float(r['circulatingMarketCap']), change24h=100 * float(r['change24']), marketSnapshotPair=r['pair']['address'],
             priceUsd=float(r['priceUSD']) if r.get('priceUSD') else None, marketSnapshotEvidenceId=e, marketSnapshotFetchedAt=snap_at if e == eid[('c1', 2)] else DISCOVERED_AT,
             priceChangeScope='Codex filterTokens rolling 24h token price change; ratio converted to percent (unit verified in raw/u1.json). Distinct from chart window.')

pause = re.search(r'X Money payouts are paused until further notice\.[^\n]*', registry_md)
assert pause, 'expected pause notice'
registry_check = []
for m in members:
    if m['narrativeId'] != 'n-x-money': continue
    addr = m['tokenId'].split(':')[1]
    seen = addr in registry_md
    m.setdefault('observations', []).append(dict(at=RUNTIME, evidenceId=eid[('e1', 0)], listedOnHomepage=seen,
                                                  note='Homepage lists a rotating subset; absence is not delisting evidence. Membership interval unchanged.'))
    registry_check.append(dict(tokenId=m['tokenId'], listedOnHomepage=seen))

signals = {
    'n-x-money': [('e1', 2, '2104566834586628228', 'Token account asks UsePaid when the X Money payout issue will be resolved'),
                  ('e1', 2, '2103931647976727023', 'UsePaid reports $1.54M fees claimed in 24h and temporarily caps payouts')],
    'n-pair-rewards': [('e1', 3, '2104592221521547519', 'KNOTS account announces a meme contest paid in STONK'),
                       ('e1', 3, '2102801301449199906', 'KNOTS account reports a social-reward campaign distribution')],
    'n-launchpad-coins': [('d4', 3, '2104598191681237311', 'Froink announced as a Solana launchpad routing creator fees to X accounts'),
                          ('d4', 1, '2104400972923707821', 'Trader frames insta.fan as an Instagram version of UsePaid')],
}
social = []
for nid, picks in signals.items():
    for name, seq in sorted({(p[0], p[1]) for p in picks}):
        body = runs[name]['result']['calls'][seq]['body']
        for tw in body['tweets']:
            social.append(dict(narrativeId=nid, postId=tw['id'], url=f"https://x.com/{tw['author']['screen_name']}/status/{tw['id']}", at=tw['created_at'],
                               text=tw['text'], author=tw['author']['screen_name'], evidenceId=eid[(name, seq)], query=requests[name]['calls'][seq]['args']['words'],
                               attentionInterpretation='Top-results convenience sample; no mention total or historical mindshare.'))

def tweet_url(name, seq, pid):
    tw = next(x for x in runs[name]['result']['calls'][seq]['body']['tweets'] if x['id'] == pid)
    return f"https://x.com/{tw['author']['screen_name']}/status/{pid}", tw

narratives = read('narratives.json', NAR_BASE)
PALETTE = ['#4895ef', '#7c83ff', '#a78bfa', '#f59e0b', '#22c55e', '#ef6f6c', '#2dd4bf', '#e879f9']
launch_ids = [u['tokenId'] for u in universe if u['narrativeId'] == 'n-launchpad-coins']
narratives.append(dict(id='n-launchpad-coins', slug='launchpad-coins', title='Launchpads launched as coins', category='infra',
    summary='Pump.fun and Meteora coins for new launch tools, several copying the UsePaid model for other platforms. Measured sample covers one pool per coin; it does not measure platform usage.',
    status=None, mindshare=None, change24h=None, volume24hUsd=None, volume7dUsd=None, launches24h=None, launches7d=None, startedAt=None,
    series=[dict(id='volume', label='Selected pools: hourly USD volume', color='#f59e0b', points=[])], contenders=[], topLaunchpads=None, signals=[],
    exampleTokens=[], suggestedLaunchpads=[],
    _meta=dict(selection='curated evidence-backed sample; not a market-wide top ranking', constituentTokenIds=launch_ids,
               poolIds=['solana_' + u['pool'] for u in universe if u['narrativeId'] == 'n-launchpad-coins'],
               ingestionLagPolicy='1 complete hour safety margin, not a provider lag guarantee', membershipBasis='reconstructed_today',
               originAttribution='Codex launchpad attribution; creation transactions not independently decoded',
               deduplication='Each selected chain:pool appears once; pools are disjoint; no constituent-to-constituent pair.', cexCoverage=False,
               legacyAttentionBasis=None, firstObservedAt=DISCOVERED_AT, startedAtRule='Unknown: no historical detection threshold established',
               statusRule='Unknown: no agreed trend thresholds', aliases=['launchpad tokens', 'UsePaid clones'], facet='launch infrastructure',
               storyEvidenceIds=[eid[('d3', 0)], eid[('d4', 1)], eid[('d4', 3)]], fullNarrativeCoverage=False, marketDataProvider='Codex via Frames',
               omittedCandidates='See candidates.json: FROINK (pool created after chart anchor), BNB and Robinhood Chain variants outside the Solana chart universe.')))
for n in narratives:
    if n['id'] == 'n-launchpad-coins': continue
    for u in new_tokens:
        if u['narrativeId'] != n['id']: continue
        n['contenders'].append(dict(id=u['tokenId'], name=u['name'], symbol=u['symbol'], share=None, change24h=None, color=None, launchpadSlug=u['originLaunchpadSlug']))
        n['exampleTokens'].append(dict(_tokenId=u['tokenId'], symbol=u['symbol'], name=u['name'], launchpadSlug=u['originLaunchpadSlug'], chain='solana', mcapUsd=None, change24h=None))
        n['_meta']['constituentTokenIds'].append(u['tokenId']); n['_meta']['poolIds'].append('solana_' + u['pool'])
lc = next(n for n in narratives if n['id'] == 'n-launchpad-coins')
for u in new_tokens:
    if u['narrativeId'] == 'n-launchpad-coins':
        lc['contenders'].append(dict(id=u['tokenId'], name=u['name'], symbol=u['symbol'], share=None, change24h=None, color=None, launchpadSlug=u['originLaunchpadSlug']))
        lc['exampleTokens'].append(dict(_tokenId=u['tokenId'], symbol=u['symbol'], name=u['name'], launchpadSlug=u['originLaunchpadSlug'], chain='solana', mcapUsd=None, change24h=None))

SOURCES = {
    'n-x-money': [dict(label='UsePaid documentation', url='https://usepaid.app/docs'), dict(label='Token registry', url='https://usepaid.app/')],
    'n-pair-rewards': [dict(label='KNOTS mechanism', url='https://www.knotsonstonk.com/'), dict(label='ZCAT identity and rewards', url='https://www.mexc.co/en-NG/learn/article/what-is-anonymous-cat-zcat-the-solana-meme-coin-paying-zec/1')],
    'n-launchpad-coins': [dict(label=label, url=tweet_url(name, seq, pid)[0]) for (name, seq, pid, _), label in zip(signals['n-launchpad-coins'], ['Froink launch announcement', 'insta.fan framed as UsePaid for Instagram'])],
}
tok = {t['id']: t for t in tokens}
for n in narratives:
    ids = [c['id'] for c in n['contenders']]
    n['_meta']['constituentTokenIds'] = ids; n['_meta']['poolIds'] = ['solana_' + next(p['pool'] for p in universe if p['tokenId'] == tid) for tid in ids]
    idx = [next(i for i, p in enumerate(universe) if p['tokenId'] == tid) for tid in ids]
    assert all(universe[i]['narrativeId'] == n['id'] for i in idx)
    ext = [dict(time=grid[j], value=math.fsum(series[i][j]['value'] for i in idx)) for j in range(168)]
    v24 = math.fsum(p['value'] for p in ext[-24:]); prev = math.fsum(p['value'] for p in ext[-48:-24])
    n['series'][0]['points'] = ext[-24:]; n['volume24hUsd'] = v24; n['volume7dUsd'] = math.fsum(p['value'] for p in ext)
    m = n['_meta']
    shares = [dict(tokenId=tid, share=100 * math.fsum(p['value'] for p in series[i][-24:]) / v24) for tid, i in zip(ids, idx)]
    m.update(chartAnchor=iso(T).replace('Z', '+00:00'), extendedSeries=[dict(id='volume', label='Volume', color=n['series'][0]['color'], points=ext)],
             volumeChange24h=percent(v24, prev), contenderVolumeShares=shares, constituentCount=len(ids), marketDataRun=P.name,
             marketEvidenceIds=sorted({bar_eid[universe[i]['pool']] for i in idx}), provenanceSources=SOURCES[n['id']],
             exampleTokenMarketSnapshot='Codex filterTokens snapshots; per-token evidence in tokens.json.',
             volumeScope=f'Sum of {len(ids)} selected Solana pool volumes for identified constituents, attributed to launch origin; not all-market coverage. Current membership reconstructed retrospectively.')
    share = {s['tokenId']: s['share'] for s in shares}
    n['contenders'].sort(key=lambda c: -share[c['id']])
    for k, c in enumerate(n['contenders']):
        c['color'] = PALETTE[k % len(PALETTE)]  # rank order, so the displayed top five never repeat
    for ex in n['exampleTokens']:
        ex.update(mcapUsd=tok[ex['_tokenId']]['mcapUsd'], change24h=tok[ex['_tokenId']]['change24h'])
    n['exampleTokens'].sort(key=lambda e: -share[e['_tokenId']])
    n['signals'] = []
    for name, seq, pid, title in signals[n['id']]:
        url, tw = tweet_url(name, seq, pid)
        label = 'Public post; claim not payout verification' if n['id'] != 'n-launchpad-coins' else 'Public post; not usage verification'
        n['signals'].append(dict(id='x-' + pid, source='x', label=label, title=title, at=tw['created_at']))
        evidence.append(dict(id='x-' + pid, route='frames', tool=requests[name]['calls'][seq]['id'], url=url, post_id=pid, source_event_time=tw['created_at'],
                             source_as_of=tw['created_at'], fetched_at=runs[name]['result']['calls'][seq]['body']['queried_at'], response_ref=f'raw/{name}.json',
                             sha256=sha(P / f'raw/{name}.json'), run_id=runs[name]['run_id'], seq=seq, extraction_path=f'body.tweets[id={pid}]',
                             limitations=['Paraphrases a public claim; not independent proof of payouts or usage.']))
    if n['id'] == 'n-x-money':
        m['presentationSummary'] = 'Coins routing creator fees to named X accounts through UsePaid, including e/acc, CALI and Elon Coin. UsePaid now says X Money payouts are paused.'
        m['storyEvidenceIds'] = m['storyEvidenceIds'] + [eid[('e1', 0)], eid[('e1', 2)]]
        m['storyStatus'] = dict(observedAt=RUNTIME, evidenceId=eid[('e1', 0)], notice=pause.group(0).strip(),
                                interpretation='Official homepage notice. Fee routing is the story; paused payouts are reported, not independently verified.')
        m['sourcePolicyChange'] = f'Expanded from 7 to {len(ids)} constituents from the official registry on {DISCOVERED_AT[:10]}; do not compare totals across the expansion as growth.'
    elif n['id'] == 'n-pair-rewards':
        m['storyEvidenceIds'] = m['storyEvidenceIds'] + [eid[('e1', 1)], eid[('e1', 3)]]
        m['storyStatus'] = dict(observedAt=RUNTIME, evidenceId=eid[('e1', 1)],
                                interpretation='Official KNOTS page still reports holder distributions in STONK; figures are self-reported, not payout verification.')
    else:
        m['presentationSummary'] = 'Pump.fun coins for new launch tools, several copying UsePaid for other platforms: XPAD for X handles, insta.fan for Instagram, REGULARS for shops.'
        m['storyStatus'] = dict(observedAt=DISCOVERED_AT, interpretation='Self-described tools; product usage and fee routing not verified. High volume relative to market cap on some pools may include wash or bot trading.')
narratives.sort(key=lambda n: (-n['volume24hUsd'], n['id']))

for n in narratives:
    pts = n['series'][0]['points']
    assert [p['time'] for p in pts] == grid[-24:]
    assert math.isclose(math.fsum(p['value'] for p in pts), n['volume24hUsd'], abs_tol=.01)
    assert math.isclose(math.fsum(p['value'] for p in n['_meta']['extendedSeries'][0]['points']), n['volume7dUsd'], abs_tol=.01)
    assert math.isclose(sum(s['share'] for s in n['_meta']['contenderVolumeShares']), 100, abs_tol=1e-6)
    assert n['mindshare'] is None and n['topLaunchpads'] is None and all(c['share'] is None for c in n['contenders'])

overlap = []
for n in narratives:
    old = prev_ext.get(n['id'], {}); new = {p['time']: p['value'] for p in n['_meta']['extendedSeries'][0]['points']}
    common = sorted(set(old) & set(new))
    diffs = [dict(time=t, previous=old[t], current=new[t]) for t in common if abs(old[t] - new[t]) > .01]
    overlap.append(dict(narrativeId=n['id'], overlappingHours=len(common), revisedHours=len(diffs), maxAbsRevisionUsd=max((abs(d['current'] - d['previous']) for d in diffs), default=0), revisions=diffs,
                        note=None if old else 'New narrative; no prior run to reconcile.'))
    assert len(common) >= 3 or not old

# ---------------------------------------------------------------- validation and outputs
assert len(launchpads) == 19 and len({x['slug'] for x in launchpads}) == 19
assert all(len(x['metrics']['history30d']) == 30 for x in launchpads)
assert len({t['id'] for t in tokens}) == len(tokens) and len(set(pools)) == len(pools)
for e in evidence:
    if 'response_ref' in e: assert sha(P / e['response_ref']) == e['sha256']
for f in (P / 'raw').glob('*.json'):
    txt = f.read_text()
    assert not re.search(r'(?i)(authorization|x-api-key|bearer\s+[a-z0-9])', txt), f'credential-like header in {f.name}'
billing = dict(charged_credits=sum(r['billing']['charged_credits'] for r in runs.values()), percent_remaining=runs['u1']['billing']['percent_remaining'],
               balance_credits_after=min(r['billing']['balance_credits'] for r in runs.values()),
               run_ids={k: r['run_id'] for k, r in runs.items()}, per_run={k: r['billing']['charged_credits'] for k, r in runs.items()},
               deduplication='Unique run_id only; sum billing.charged_credits. Quotes and per-call charged_usd are not billed credit totals.')
validation = dict(as_of=RUNTIME, passed=True, billing=billing, callsRequested=sum(len(q['calls']) for q in requests.values()),
                  callsDelivered=sum(c['delivered'] for r in runs.values() for c in r['result']['calls']), outcomes=outcomes,
                  financialAnchor=iso(F), chartAnchor=iso(T), financialChecks=checks, deliveryDisputes=disputes,
                  financialRevisionsProviders=len(revisions), methodologyChanges=method_changes,
                  financialComplete30dRows=sum(all(p['value'] is not None for p in x['metrics']['history30d']) for x in launchpads),
                  indexedLaunchpadRows=fl['count'], activityVenues=len(observations), barChecks=barchecks, precreationZeroBuckets=len(precreation),
                  hourlyOverlapWithPriorRun=[{k: v for k, v in o.items() if k != 'revisions'} for o in overlap],
                  registryRecheck=registry_check, narrativeCount=len(narratives), constituentCount=len(tokens),
                  change24Unit='ratio; verified against hourly closes in raw/u1.json (CALI -0.650 derived vs -0.644 reported; KARDASHEV 1.98 vs 1.956)',
                  limitations=['Independent date validation does not overturn Frames billing/delivery receipts.',
                               'Curated fixed-pool sample, not market-wide narrative coverage.',
                               'No new constituent discovery this run; homepage tokens not in the universe remain unclassified.'])
manifest = dict(runId=P.name, version=VERSION, runtimeStartedAt=RUNTIME, repositoryCommit='d6885b4637a0c1884f683f736a6e838b3a4b7fcc',
                defaultBranchCommit='d6885b4637a0c1884f683f736a6e838b3a4b7fcc', recurringTaskCreated=False,
                authorization='User requested a data refresh and commit via Frames; executed within the runbook daily call envelope with per-batch max_usd caps.',
                priorRuns=dict(financial=FIN_BASE.name, metadata='20260926T175634Z', activity=ACT_BASE.name, narrative=NAR_BASE.name),
                watermarks=dict(financialExclusiveEnd=iso(F), narrativeExclusiveEnd=iso(T), activitySourceAsOf=iso(observations[0]['sourceAsOf'])),
                requests=[f'raw/{k}-request.json' for k in batches], costs=billing, refreshPrompt='docs/prompts/refresh-market-data.md',
                sourceVersions={'financial': registry['financialTool'], 'marketAndActivity': registry['marketAndActivityTool'], 'sourceRegistryVersion': registry['version']})
def disc_row(addr):
    for r in disc['active']['results'] + disc['recent']['results']:
        if addr in (r['pair']['token0'], r['pair']['token1']): return r
def nm(addr): return names[addr][0] if addr in names else {}
CANDIDATES = [
    ('2yu92oYzBWLAdVpu8BoaLzmM1oxPsHoboay2BXmeDDZr', 'n-launchpad-coins', 'deferred', 'Accepted story (official launch announcement), but its pool was created after the chart anchor; add on the next refresh.'),
    ('zVbJ3eRjhRbvKWAxP8xrXZAeAcSqk3vtTjCzzVAAphi', 'n-launchpad-coins', 'rejected', 'Perpetuals product for graduated coins, not a launch tool.'),
    ('BM2k8mJUbMthHoioykyUm2NjMrXvLBYhoXruwYLpump', 'n-launchpad-coins', 'candidate_unverified', 'Name implies a launchpad; metadata has no description to support membership.'),
    ('0x55db4b1f497b1d7aa93354701883efc758367777', 'n-launchpad-coins', 'omitted_chain', 'BNB Chain (Flap) social fee-routing launch token; outside the Solana chart universe.'),
    ('0x68353dea233cf2ed0f4ab795430962cc50e5d325', 'n-launchpad-coins', 'omitted_chain', 'Robinhood Chain (Pons) nested-launchpad token; outside the Solana chart universe.'),
    ('AmaM7N43JBicpcHDbVKyGeuTjtnNhJ2yZTdWqoZpCX8b', 'n-x-money', 'rejected', 'Second KARDASHEV mint with the same name; the tracked constituent is the registry Top Tokens mint.'),
    ('B2kipu1WYBPBDQrCX5yv9p7dhjhG1FwwnxBjUDhSkbdG', 'n-x-money', 'candidate_unverified', 'Metadata claims UsePaid routing but the mint is absent from the registry snapshot.'),
    ('Cgi54CNpHaYn4smqLH5tW8X5QxssMvi592My3tRoiHfX', 'n-x-money', 'candidate_unverified', 'Metadata claims UsePaid routing but the mint is absent from the registry snapshot.'),
    ('98kfF7rmsg1QDUEoCqNE7g7M1FdrTt92TEp2CLzypump', 'n-x-money', 'candidate_unverified', 'Named Paid; no source links it to UsePaid.'),
    ('3CA4RGSFWAu7ePYr2rmCndNqgoYuMj97m5vAn6Zqpump', None, 'quarantined', 'Fund-style ticker with implausible market cap and >5,000x 24h change; likely manipulated supply or price.'),
    ('wQK5ZserCHkhUCJQJxLL7NKg4N3o3R9VTEqJFqfpump', None, 'quarantined', 'Fund-style ticker with implausible market cap and >2x 24h change on a new pool; likely manipulated.'),
    ('XU438yQcHEf5bGAZ3pHqXhbZPqotoapdanjnhj1pump', None, 'quarantined', 'Fund-style ticker with implausible market cap and >5,000x 24h change; likely manipulated supply or price.'),
    ('Y49yTFUyBiim3HQEiVnVKiiRPqTY2nNrJyvxsi4pump', None, 'quarantined', 'Fund-style ticker with implausible market cap on a new pool; likely manipulated.'),
    ('6E1ZANX18QzRNmz4CszNgPqonQ38nkCGhpRqpwwEpump', None, 'quarantined', 'Implausible market cap and >5,000x 24h change; likely manipulated supply or price.'),
]
candidates = []
for addr, nid, status, reason in CANDIDATES:
    r = disc_row(addr); meta = nm(addr)
    candidates.append(dict(address=addr, name=meta.get('name'), symbol=meta.get('symbol'), networkId=meta.get('networkId'),
                           launchpad=(meta.get('launchpad') or {}).get('launchpadName'), description=(meta.get('info') or {}).get('description'),
                           narrativeId=nid, status=status, reason=reason, volume24=r and r['volume24'], circulatingMarketCap=r and r['circulatingMarketCap'],
                           change24=r and r['change24'], pairCreatedAt=r and r['pair']['createdAt'], evidenceIds=[eid[('d2', 0)], eid[('d3', 0)]]))
discovery = dict(discoveredAt=DISCOVERED_AT, method='Token-first: Codex filterTokens top-50 by 24h volume and top-50 created in the last 72h (liquidity > $10K, volume > $250K) across 14 covered launchpad names; names resolved with Codex tokens(ids). Registry-first: UsePaid Top Tokens. Story-first: three X searches.',
                 limitations=['One 100-row sample by volume; not a market census.', 'foci is not a Codex launchpad name and is not covered by the sweep.', 'The XPAD search returned only unrelated older XPAD projects; XPAD membership rests on its token metadata.'],
                 accepted=[dict(tokenId=u['tokenId'], symbol=u['symbol'], narrativeId=u['narrativeId']) for u in new_tokens], candidates=candidates)
for name, obj in [('candidates.json', discovery), ('launchpads.json', launchpads), ('narratives.json', narratives), ('tokens.json', tokens), ('memberships.json', members),
                  ('evidence.json', evidence), ('landing-metrics.json', landing), ('precreation-zero-provenance.json', precreation),
                  ('financial-revisions.json', dict(priorRun=FIN_BASE.name, priorAnchor=iso(OLD_F), revisions=revisions, methodologyChanges=method_changes)),
                  ('hourly-revisions.json', overlap), ('social-evidence.json', social), ('validation-report.json', validation), ('refresh-manifest.json', manifest)]:
    write(name, obj)
with (P / 'chart-data.csv').open('w', newline='') as f:
    w = csv.writer(f, lineterminator='\n'); w.writerow(['narrative_id', 'bucket_start_unix', 'bucket_start_utc', 'volume_usd'])
    for n in narratives:
        for p in n['_meta']['extendedSeries'][0]['points']: w.writerow([n['id'], p['time'], iso(p['time']), p['value']])
print(json.dumps(dict(financialAnchor=iso(F), chartAnchor=iso(T), billing=billing['charged_credits'], feeSubtotal=landing['fees']['value'],
                      indexed=landing['indexedTotals'], revisions=len(revisions), methodChanges=len(method_changes), disputes=len(disputes),
                      complete30d=validation['financialComplete30dRows'],
                      narratives=[(n['id'], round(n['volume24hUsd']), round(n['volume7dUsd']), n['_meta']['volumeChange24h']) for n in narratives]), indent=1))
