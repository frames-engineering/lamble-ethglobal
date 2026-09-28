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
batches = ['f1', 'f2', 'f3', 'f4', 'c1', 'e1', 'u1']
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
bar_req = requests['c1']['calls'][1]['args']['query']
pools = re.findall(r'symbol:"(\w+):%d"' % NETWORK, bar_req)
universe = registry['poolUniverse']; assert pools == [p['pool'] for p in universe]
ranges = re.findall(r'from:(\d+),to:(\d+)', bar_req); assert set(ranges) == {(str(T - 7 * 86400), str(T - 1))}
bars = runs['c1']['result']['calls'][1]['body']['data']
snapshot = runs['c1']['result']['calls'][2]['body']['data']['filterTokens']['results']
created = {p['pool']: None for p in universe}
for r in read('raw/pools.json', NAR_BASE)['result']['calls'][0]['body']['data']['filterTokens']['results']:
    created[r['pair']['address']] = r['pair']['createdAt']
for r in snapshot:
    if r['pair']['address'] in created: created[r['pair']['address']] = r['pair']['createdAt']
grid = list(range(T - 7 * 86400, T, 3600))
series, precreation, barchecks = {}, [], []
prev_ext = {}
for n in read('narratives.json', NAR_BASE):
    for p in n['_meta']['extendedSeries'][0]['points']: prev_ext.setdefault(n['id'], {})[p['time']] = p['value']
for i, pool in enumerate(pools):
    b = bars[f'p{i}']; assert len(b['t']) == len(set(b['t']))
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
    barchecks.append(dict(pool=pool, tokenId=universe[i]['tokenId'], buckets=len(out), returnedBuckets=len(b['t']),
                          precreationZeroBuckets=sum(1 for z in precreation if z['poolIndex'] == i), poolCreatedAt=created[pool]))

tokens = read('tokens.json', NAR_BASE); members = read('memberships.json', NAR_BASE)
by_token = {}
for r in snapshot:
    for a in (r['pair']['token0'], r['pair']['token1']):
        if f'solana:{a}' in {t['id'] for t in tokens}: by_token.setdefault(f'solana:{a}', r)
assert set(by_token) == {t['id'] for t in tokens}, 'token snapshot missing an identity'
snap_eid = eid[('c1', 2)]; snap_at = iso(act_run['result']['calls'][0]['body']['data']['filterLaunchpads']['results'][0]['timestamp'])
for t in tokens:
    r = by_token[t['id']]
    t.update(mcapUsd=float(r['circulatingMarketCap']), change24h=100 * float(r['change24']), marketSnapshotPair=r['pair']['address'],
             priceUsd=float(r['priceUSD']), marketSnapshotEvidenceId=snap_eid, marketSnapshotFetchedAt=snap_at,
             priceChangeScope='Codex filterTokens rolling 24h token price change; ratio converted to percent (unit verified in raw/u1.json). Distinct from chart window.')

registry_md = runs['e1']['result']['calls'][0]['body']['data']['markdown']
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
}
social = []
for nid, picks in signals.items():
    for name, seq, _, _ in picks[:1]:
        body = runs[name]['result']['calls'][seq]['body']
        for tw in body['tweets']:
            social.append(dict(narrativeId=nid, postId=tw['id'], url=f"https://x.com/{tw['author']['screen_name']}/status/{tw['id']}", at=tw['created_at'],
                               text=tw['text'], author=tw['author']['screen_name'], evidenceId=eid[(name, seq)],
                               attentionInterpretation='Top-results convenience sample; no mention total or historical mindshare.'))

narratives = read('narratives.json', NAR_BASE)
colors = {t['id']: None for t in tokens}
for n in narratives:
    ids = [c['id'] for c in n['contenders']]
    idx = [next(i for i, p in enumerate(universe) if p['tokenId'] == tid) for tid in ids]
    ext = [dict(time=grid[j], value=math.fsum(series[i][j]['value'] for i in idx)) for j in range(168)]
    v24 = math.fsum(p['value'] for p in ext[-24:]); prev = math.fsum(p['value'] for p in ext[-48:-24])
    n['series'][0]['points'] = ext[-24:]; n['volume24hUsd'] = v24; n['volume7dUsd'] = math.fsum(p['value'] for p in ext)
    m = n['_meta']
    shares = [dict(tokenId=tid, share=100 * math.fsum(p['value'] for p in series[i][-24:]) / v24) for tid, i in zip(ids, idx)]
    m.update(chartAnchor=iso(T).replace('Z', '+00:00'), extendedSeries=[dict(id='volume', label='Volume', color=n['series'][0]['color'], points=ext)],
             volumeChange24h=percent(v24, prev), contenderVolumeShares=shares, constituentCount=len(ids), marketDataRun=P.name,
             marketEvidenceIds=[eid[('c1', 1)]], exampleTokenMarketSnapshot=f'Codex filterTokens snapshot {snap_at}; evidence {snap_eid}.',
             volumeScope=f'Sum of {len(ids)} selected Solana pool volumes for identified constituents, attributed to launch origin; not all-market coverage. Current membership reconstructed retrospectively.')
    share = {s['tokenId']: s['share'] for s in shares}
    n['contenders'].sort(key=lambda c: -share[c['id']])
    tok = {t['id']: t for t in tokens}
    for ex in n['exampleTokens']:
        ex.update(mcapUsd=tok[ex['_tokenId']]['mcapUsd'], change24h=tok[ex['_tokenId']]['change24h'])
    n['signals'] = []
    for name, seq, pid, title in signals[n['id']]:
        tw = next(x for x in runs[name]['result']['calls'][seq]['body']['tweets'] if x['id'] == pid)
        url = f"https://x.com/{tw['author']['screen_name']}/status/{pid}"
        n['signals'].append(dict(id='x-' + pid, source='x', label='Public post; claim not payout verification', title=title, at=tw['created_at']))
        evidence.append(dict(id='x-' + pid, route='frames', tool=requests[name]['calls'][seq]['id'], url=url, post_id=pid, source_event_time=tw['created_at'],
                             source_as_of=tw['created_at'], fetched_at=runs[name]['result']['calls'][seq]['body']['queried_at'], response_ref=f'raw/{name}.json',
                             sha256=sha(P / f'raw/{name}.json'), run_id=runs[name]['run_id'], seq=seq, extraction_path=f'body.tweets[id={pid}]',
                             limitations=['Paraphrases a public claim; not independent proof of payouts.']))
    if n['id'] == 'n-x-money':
        m['presentationSummary'] = 'Coins routing creator fees to named X accounts through UsePaid, including e/acc, CALI and Elon Coin. UsePaid now says X Money payouts are paused.'
        m['storyEvidenceIds'] = m['storyEvidenceIds'] + [eid[('e1', 0)], eid[('e1', 2)]]
        m['storyStatus'] = dict(observedAt=RUNTIME, evidenceId=eid[('e1', 0)], notice=pause.group(0).strip(),
                                interpretation='Official homepage notice. Fee routing is the story; paused payouts are reported, not independently verified.')
    else:
        m['storyEvidenceIds'] = m['storyEvidenceIds'] + [eid[('e1', 1)], eid[('e1', 3)]]
        m['storyStatus'] = dict(observedAt=RUNTIME, evidenceId=eid[('e1', 1)],
                                interpretation='Official KNOTS page still reports holder distributions in STONK; figures are self-reported, not payout verification.')
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
    overlap.append(dict(narrativeId=n['id'], overlappingHours=len(common), revisedHours=len(diffs), maxAbsRevisionUsd=max((abs(d['current'] - d['previous']) for d in diffs), default=0), revisions=diffs))
    assert len(common) >= 3

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
for name, obj in [('launchpads.json', launchpads), ('narratives.json', narratives), ('tokens.json', tokens), ('memberships.json', members),
                  ('evidence.json', evidence), ('landing-metrics.json', landing), ('precreation-zero-provenance.json', precreation),
                  ('financial-revisions.json', dict(priorRun=FIN_BASE.name, priorAnchor=iso(OLD_F), revisions=revisions, methodologyChanges=method_changes)),
                  ('hourly-revisions.json', overlap), ('social-evidence.json', social), ('validation-report.json', validation), ('refresh-manifest.json', manifest)]:
    write(name, obj)
with (P / 'chart-data.csv').open('w', newline='') as f:
    w = csv.writer(f); w.writerow(['narrative_id', 'bucket_start_unix', 'bucket_start_utc', 'volume_usd'])
    for n in narratives:
        for p in n['_meta']['extendedSeries'][0]['points']: w.writerow([n['id'], p['time'], iso(p['time']), p['value']])
print(json.dumps(dict(financialAnchor=iso(F), chartAnchor=iso(T), billing=billing['charged_credits'], feeSubtotal=landing['fees']['value'],
                      indexed=landing['indexedTotals'], revisions=len(revisions), methodChanges=len(method_changes), disputes=len(disputes),
                      complete30d=validation['financialComplete30dRows'],
                      narratives=[(n['id'], round(n['volume24hUsd']), round(n['volume7dUsd']), n['_meta']['volumeChange24h']) for n in narratives]), indent=1))
