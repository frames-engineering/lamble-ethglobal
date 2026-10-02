#!/usr/bin/env python3
"""Normalize one daily refresh run. Offline; never spends credits.

Usage: python3 scripts/frames-refresh/normalize.py research/lamble/<run> --prior research/lamble/<previous full run>
                                                   [--prior-narrative research/lamble/<previous narrative run>]

Inputs: raw/{f1..f4,c1,e1}.json and their requests (see plan.py), the source registry,
the prior run (structure, identities, memberships, revision baseline) and curation.json.
curation.json holds the only judgment calls: which posts are signals, narrative copy,
story notes, and rationales for new members. Everything else is computed here.
"""
import argparse, csv, datetime as dt, hashlib, json, math, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser()
ap.add_argument('run'); ap.add_argument('--prior', required=True); ap.add_argument('--prior-narrative')
args = ap.parse_args()
P = pathlib.Path(args.run).resolve(); PRIOR = pathlib.Path(args.prior).resolve()
PRIOR_N = pathlib.Path(args.prior_narrative).resolve() if args.prior_narrative else PRIOR
VERSION = 'lamble-daily-refresh-2.0.0'
RUNTIME_DT = dt.datetime.strptime(P.name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc)
RUNTIME = RUNTIME_DT.isoformat().replace('+00:00', 'Z'); RUNTIME_TS = int(RUNTIME_DT.timestamp())
SETTLE_HOURS = 4          # a UTC day counts as complete only this long after it closes
F = (RUNTIME_TS - SETTLE_HOURS * 3600) // 86400 * 86400   # financial exclusive end
T = RUNTIME_TS // 3600 * 3600 - 3600       # chart exclusive end: one complete-hour margin
NETWORK_CHAIN = {1399811149: 'solana', 56: 'bsc', 4663: 'robinhood', 8453: 'base', 1: 'ethereum', 42161: 'arbitrum', 143: 'monad', 5042: 'arc', 196: 'xlayer', 130: 'unichain'}
CHAIN_NAME = {'solana': 'Solana', 'bsc': 'BNB Chain', 'robinhood': 'Robinhood Chain', 'base': 'Base', 'ethereum': 'Ethereum', 'arbitrum': 'Arbitrum', 'monad': 'Monad', 'arc': 'Arc', 'xlayer': 'X Layer', 'unichain': 'Unichain'}
PALETTE = ['#4895ef', '#7c83ff', '#a78bfa', '#f59e0b', '#22c55e', '#ef6f6c', '#2dd4bf', '#e879f9']
TURNOVER_FLAG = 10        # 24h pool volume above this multiple of circulating market cap is flagged
NO_CURVE_COMPLETION = {'argus-world', 'clanker', 'o1-launchpad'}
# d* = discovery, e* = evidence (e2+ are retries or story checks for candidates); all are citable as "<batch>:<seq>".
BATCHES = ['f1', 'f2', 'f3', 'f4', 'c1'] + sorted(f.name[:-13] for f in (P / 'raw').glob('[de]*-request.json'))


def read(name, root=P): return json.loads((root / name).read_text())
def write(name, obj): (P / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
def iso(t): return dt.datetime.fromtimestamp(t, dt.timezone.utc).isoformat().replace('+00:00', 'Z')
def total(v): return None if any(x is None for x in v) else math.fsum(v)
def percent(a, b): return None if a is None or b in (None, 0) else 100 * (a - b) / b
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


registry = read('docs/prompts/refresh-market-data.sources.json', ROOT)
curation = read('curation.json')
runs = {k: read(f'raw/{k}.json') for k in BATCHES}
requests = {k: read(f'raw/{k}-request.json') for k in BATCHES}
assert all(r['status'] == 'completed' for r in runs.values()) and len({r['run_id'] for r in runs.values()}) == len(runs)
UPSTREAM = {'mpp.codex.post.graphql': 'Codex', registry['financialTool']: 'DefiLlama via Atlas',
            'mpp.firecrawl.post.v1-scrape': 'Firecrawl / target website', 'bazaar.twitter-use-x402atlas-com-search': 'X via Atlas'}
evidence, eid, outcomes = [], {}, []
for name, r in runs.items():
    for c in r['result']['calls']:
        seq = c['seq']; req = requests[name]['calls'][seq]; body = c.get('body') or {}
        assert 'body_ref' not in c and c['tool_id'] == req['id']
        i = f'frames-{P.name}-{name}-{seq}'; eid[(name, seq)] = i
        evidence.append(dict(id=i, route='frames', tool=req['id'], upstream=UPSTREAM.get(req['id'], req['id']), redacted_request=req, run_id=r['run_id'], seq=seq,
                             response_ref=f'raw/{name}.json', sha256=sha(P / f'raw/{name}.json'), extraction_path=f'$.result.calls[{seq}].body',
                             fetched_at=(body.get('queried_at') if isinstance(body, dict) else None) or RUNTIME, delivery=c['delivered'],
                             delivery_outcome=c.get('outcome'), methodology_version=VERSION))
        outcomes.append(dict(run_id=r['run_id'], seq=seq, tool_id=req['id'], delivered=c['delivered'], outcome=c.get('outcome'),
                             reason=(c.get('receipt') or {}).get('reason')))
def ev_ref(ref):  # "e1:2" -> evidence id
    b, s = ref.split(':'); return eid[(b, int(s))]

# ---------------------------------------------------------------- financials
prior_lp = read('launchpads.json', PRIOR)
OLD_F = int(dt.datetime.fromisoformat(prior_lp[0]['_meta']['financialAnchor'].replace('Z', '+00:00')).timestamp())
assert OLD_F < F, 'financial anchor did not advance'
old_bodies = {}
for name in ['f1', 'f2', 'f3', 'f4']:
    if not (PRIOR / f'raw/{name}.json').exists(): continue
    oreq = read(f'raw/{name}-request.json', PRIOR)
    for c in read(f'raw/{name}.json', PRIOR)['result']['calls']:
        a = oreq['calls'][c['seq']]['args']
        old_bodies[(a['protocol'], a['dataType'])] = dict(c['body']['data']['totalDataChart'])
fin, checks, disputes, revisions = {}, [], [], []
for name in ['f1', 'f2', 'f3', 'f4']:
    for c in runs[name]['result']['calls']:
        a = requests[name]['calls'][c['seq']]['args']; provider, kind = a['protocol'], a['dataType']
        d = c['body']['data']; pairs = d['totalDataChart']
        assert d['slug'] == provider and len({t for t, _ in pairs}) == len(pairs)
        assert all(t % 86400 == 0 and t <= F and isinstance(v, (int, float)) and v >= 0 for t, v in pairs), provider
        series = dict(pairs); fin[(provider, kind)] = (d, eid[(name, c['seq'])])
        prior = old_bodies.get((provider, kind), {})
        overlap = [t for t in prior if t < OLD_F and t in series]
        changed = [dict(date=iso(t), previous=prior[t], current=series[t]) for t in sorted(overlap) if prior[t] != series[t]]
        if changed: revisions.append(dict(provider=provider, kind=kind, revisedDays=changed))
        checks.append(dict(provider=provider, kind=kind, sourceDays=len(pairs), latestCompleteDate=iso(max(t for t in series if t < F)),
                           containsCurrentPartialDay=F in series, priorCompleteDaysCompared=len(overlap), revisedDays=len(changed),
                           delivery=c['delivered'], outcome=c.get('outcome')))
        if not c['delivered']:
            same = all(series.get(t) == prior[t] for t in overlap)
            assert same or not overlap, f'undelivered {provider} {kind} contradicts prior complete days'
            disputes.append(dict(provider=provider, kind=kind, receipt=c['receipt'], evidence_id=eid[(name, c['seq'])], priorOverlapMatches=same,
                                 assessment=f'Refunded by Frames; every date <= runtime UTC date and {len(overlap)} prior complete days match. Retained as a validated, non-delivered body.'))
venues = {v['slug']: v for v in registry['venues']}
launchpads = prior_lp
assert [x['slug'] for x in launchpads] == list(venues)
for lp in launchpads:
    provider = venues[lp['slug']]['providerSlug']; data, refs = {}, []
    for kind, label in [('dailyFees', 'fees'), ('dailyRevenue', 'revenue')]:
        d, e = fin[(provider, kind)]; data[label] = {t: v for t, v in d['totalDataChart'] if t < F}; refs.append(e)
    metrics = {}
    for label, days in [('h24', 1), ('d7', 7), ('d30', 30)]:
        vals = {k: total([v.get(t) for t in range(F - days * 86400, F, 86400)]) for k, v in data.items()}
        prev = total([data['fees'].get(t) for t in range(F - 2 * days * 86400, F - days * 86400, 86400)])
        metrics[label] = {**vals, 'change': percent(vals['fees'], prev)}
    metrics.update({k: None for k in ['launched24h', 'launched7dAvg', 'graduated24h', 'graduationRate7d']})
    metrics['history30d'] = [dict(time=t, value=data['fees'].get(t)) for t in range(F - 30 * 86400, F, 86400)]
    d = fin[(provider, 'dailyFees')][0]
    lp['metrics'] = metrics
    lp['_meta'].update(financialAnchor=iso(F), source_as_of=iso(F), financialEvidenceIds=refs, fetched_at_reference=refs, financialRun=P.name,
                       financialDeliveryDisputes=[x for x in disputes if x['provider'] == provider],
                       methodology=d.get('methodology') or lp['_meta'].get('methodology'), methodologyURL=d.get('methodologyURL') or lp['_meta'].get('methodologyURL'))

# ---------------------------------------------------------------- indexed activity
fl = runs['c1']['result']['calls'][0]['body']['data']['filterLaunchpads']
assert fl['count'] == len(fl['results']) < 200, 'paginate before import'
rows = {r['id']: r for r in fl['results']}; assert len(rows) == len(fl['results'])
FIELDS = ['tokensCreated24', 'tokensCreated1w', 'tokensCompleted24', 'tokensCompleted1w', 'tokensMigrated24']
for r in fl['results']:
    assert all(isinstance(r[f], int) and r[f] >= 0 for f in FIELDS), r['id']
    assert r['tokensCreated24'] <= r['tokensCreated1w'] and r['tokensCompleted24'] <= r['tokensCompleted1w'], r['id']
observations = []
for v in registry['venues']:
    ids = v.get('indexedProviderIds') or []
    if not ids: continue
    missing = [i for i in ids if i not in rows]
    if missing:  # a vanished provider row leaves the venue unknown, never zero
        continue
    sel = [rows[i] for i in ids]; assert len({r['timestamp'] for r in sel}) == 1
    s = {f: sum(r[f] for r in sel) for f in FIELDS}; curve = v['slug'] not in NO_CURVE_COMPLETION
    observations.append(dict(slug=v['slug'], providerIds=ids, sourceAsOf=sel[0]['timestamp'], networkIds=sorted({n for r in sel for n in r['networkIds']}),
                             indexedCreated24=s['tokensCreated24'], indexedCreated7d=s['tokensCreated1w'],
                             indexedCompleted24=s['tokensCompleted24'] if curve else None, indexedCompleted7d=s['tokensCompleted1w'] if curve else None,
                             indexedMigrated24=s['tokensMigrated24'], indexed7dAvg=s['tokensCreated1w'] / 7,
                             indexed7dCompletionRate=100 * s['tokensCompleted1w'] / s['tokensCreated1w'] if curve and s['tokensCreated1w'] else None,
                             status='candidate_unverified', coverage='Provider-reported indexed activity, beta. Exact window cutoffs, creation-event completeness and finality are not independently established.',
                             rawCompletion=s['tokensCompleted24'], runId=runs['c1']['run_id'], seq=0))
excluded = registry['feeExclusions']
included = [x for x in launchpads if x['slug'] not in excluded]
assert all(x['metrics']['h24']['fees'] is not None for x in included), 'subtotal component missing; leave aggregate unknown'
grids = [{p['time']: p['value'] for p in x['metrics']['history30d']} for x in included]
fee_history = [dict(time=t, value=math.fsum(g[t] for g in grids) if all(g.get(t) is not None for g in grids) else None) for t in sorted(set().union(*grids))]
landing = dict(methodologyVersion='lamble-activity-v1', run=P.name, activity=observations,
               fees=dict(value=math.fsum(x['metrics']['h24']['fees'] for x in included), kind='covered subtotal', financialAnchor=iso(F),
                         includedSlugs=[x['slug'] for x in included], excluded=excluded, history30d=fee_history, change30d=None,
                         scope=f'Sum of {len(included)} non-overlapping mapped fee streams for the last complete UTC day. Omits {len(excluded)} overlapping rows; some included adapters cover only one version. Not an all-roster total.'),
               indexedTotals=dict(created24=sum(o['indexedCreated24'] for o in observations), completed24=sum(o['indexedCompleted24'] or 0 for o in observations),
                                  creationVenues=len(observations), completionVenues=sum(o['indexedCompleted24'] is not None for o in observations),
                                  sourceAsOf=observations[0]['sourceAsOf'],
                                  scope=f'Provider-indexed counts, mapped launchpad names. {len(observations)} venue creation records, {sum(o["indexedCompleted24"] is not None for o in observations)} completion records. Beta coverage; omitted venues are unknown, not zero. Not a complete roster total.'))

# ---------------------------------------------------------------- narrative bars and snapshot
universe = registry['poolUniverse']
bars, bar_eid, snapshot = {}, {}, []
for c in runs['c1']['result']['calls'][1:]:
    q = requests['c1']['calls'][c['seq']]['args']['query']; data = c['body']['data']
    for alias, pool, net, frm, to in re.findall(r'(p\d+):getBars\(symbol:"(\w+):(\d+)",from:(\d+),to:(\d+)', q):
        assert (int(frm), int(to)) == (T - 7 * 86400, T - 1) and pool not in bars
        bars[pool] = data[alias]; bar_eid[pool] = eid[('c1', c['seq'])]
    if 'filterTokens' in (data or {}):
        snapshot += data['filterTokens']['results']; snap_eid = eid[('c1', c['seq'])]
assert {u['pool'] for u in universe} <= set(bars), 'every universe pool needs bars'  # extra bars (a pool removed after collect) are ignored
created = {}
for r in snapshot: created[r['pair']['address']] = r['pair']['createdAt']
for t in read('tokens.json', PRIOR_N):
    if t.get('pool') and t.get('poolCreatedAt'): created.setdefault(t['pool'], t['poolCreatedAt'])
grid = list(range(T - 7 * 86400, T, 3600))
series, precreation = {}, []
for u in universe:
    b = bars[u['pool']]; assert b is not None and len(b['t']) == len(set(b['t'])) and all(T - 7 * 86400 <= t < T and t % 3600 == 0 for t in b['t'])
    vals = dict(zip(b['t'], b['volume'])); out = []
    for t in grid:
        v = vals.get(t); c = created.get(u['pool'])
        if v is None and c is not None and t + 3600 <= c:
            v = 0; precreation.append(dict(pool=u['pool'], chain=u['chain'], time=t, poolCreatedAt=c,
                                           basis='Entire bucket precedes provider pool creation time; no pool existed. Not a token-wide inactivity claim.'))
        assert v is not None, (u['symbol'], t, 'unexpected missing live-pool bucket')
        v = float(v); assert v >= 0; out.append(dict(time=t, value=v))
    series[u['tokenId']] = out

tokens = read('tokens.json', PRIOR_N); members = read('memberships.json', PRIOR_N)
known = {t['id'] for t in tokens}
for u in universe:
    if u['tokenId'] in known: continue
    c = curation['newMembers'][u['tokenId']]  # every new constituent needs a written rationale and evidence
    evid = [ev_ref(x) if ':' in x and x.split(':')[0] in BATCHES else x for x in c['evidence']]
    tokens.append(dict(id=u['tokenId'], chain=u['chain'], address=u['address'], name=u['name'], symbol=u['symbol'], originLaunchpadSlug=u['originLaunchpadSlug'],
                       originStatus=u['originStatus'], evidenceIds=evid, firstObservedAt=RUNTIME, pool=u['pool'], poolCreatedAt=created.get(u['pool'])))
    members.append(dict(id=f"{u['narrativeId']}:{u['tokenId']}", narrativeId=u['narrativeId'], tokenId=u['tokenId'], version=1, methodVersion=VERSION,
                        rationale=c['rationale'], evidenceIds=evid, effectiveFrom=RUNTIME, effectiveTo=None, firstObservedAt=RUNTIME,
                        historicalMembershipBasis='reconstructed_today', confidence='source-supported; not calibrated'))
in_universe = {u['tokenId'] for u in universe}
retired = curation.get('retiredNarratives', {})
for tid, c in curation.get('removedMembers', {}).items():  # close the interval, keep the record
    assert tid not in in_universe, f'{tid} is marked removed but still in the registry poolUniverse'
    for m in members:
        if m['tokenId'] == tid and m['effectiveTo'] is None: m.update(effectiveTo=RUNTIME, closedReason=c['reason'])
for nid, c in retired.items():
    assert not any(u['narrativeId'] == nid for u in universe), f'retired narrative {nid} still has pools in the registry'
    for m in members:
        if m['narrativeId'] == nid and m['effectiveTo'] is None: m.update(effectiveTo=RUNTIME, closedReason=f'narrative retired: {c["reason"]}')
for m in members:  # every open membership must still be charted
    assert m['effectiveTo'] is not None or m['tokenId'] in in_universe, f'{m["tokenId"]} left the registry without a removedMembers entry'
assert {t['id'] for t in tokens} >= {u['tokenId'] for u in universe}
pool_of = {u['tokenId']: u['pool'] for u in universe}
by_token = {}
for r in snapshot:
    for a in (r['pair']['token0'], r['pair']['token1']):
        by_token.setdefault(f"{NETWORK_CHAIN[r['pair']['networkId']]}:{a}", r)
for t in tokens:
    if t['id'] not in pool_of: continue
    t['pool'] = pool_of[t['id']]
    r = by_token.get(t['id'])
    if r is None:  # keep the old observation, but say it is stale
        t['marketSnapshotStale'] = True; continue
    t.update(mcapUsd=float(r['circulatingMarketCap']) if r['circulatingMarketCap'] else None, change24h=100 * float(r['change24']) if r['change24'] else None,
             priceUsd=float(r['priceUSD']) if r.get('priceUSD') else None, marketSnapshotPair=r['pair']['address'], marketSnapshotEvidenceId=snap_eid,
             marketSnapshotFetchedAt=RUNTIME, marketSnapshotStale=False,
             priceChangeScope='Codex filterTokens rolling 24h token price change; ratio converted to percent. Distinct from chart window.')
tok = {t['id']: t for t in tokens}

# ---------------------------------------------------------------- signals and narratives
tweets = {}
for b in (b for b in BATCHES if b.startswith('e')):
    for c in runs[b]['result']['calls']:
        for tw in ((c.get('body') or {}).get('tweets') or []) if c['delivered'] else []:
            tweets[tw['id']] = (tw, (b, c['seq']))
social = [dict(postId=tw['id'], url=f"https://x.com/{tw['author']['screen_name']}/status/{tw['id']}", at=tw['created_at'], text=tw['text'],
               author=tw['author']['screen_name'], evidenceId=eid[src], query=requests[src[0]]['calls'][src[1]]['args'].get('words'),
               attentionInterpretation='Top-results convenience sample; no mention total or historical mindshare.') for tw, src in tweets.values()]
prior_evidence = {e['id']: e for e in read('evidence.json', PRIOR_N)}
narratives = read('narratives.json', PRIOR_N)
retired_records = [dict(narrativeId=n['id'], title=n['title'], retiredAt=RUNTIME, reason=retired[n['id']]['reason'],
                        lastVolume24hUsd=n['volume24hUsd'], lastChartAnchor=n['_meta']['chartAnchor']) for n in narratives if n['id'] in retired]
narratives = [n for n in narratives if n['id'] not in retired]
prev_ext = {n['id']: {p['time']: p['value'] for p in n['_meta']['extendedSeries'][0]['points']} for n in narratives}
for nid, spec in curation.get('newNarratives', {}).items():
    assert nid not in {n['id'] for n in narratives}, f'{nid} already exists'
    assert curation.get('provenanceSources', {}).get(nid) and curation['signals'].get(nid), f'new narrative {nid} needs provenanceSources and signals'
    narratives.append(dict(id=nid, slug=spec['slug'], title=spec['title'], category=spec['category'], summary=spec['summary'], status=None, mindshare=None,
                           change24h=None, volume24hUsd=None, volume7dUsd=None, launches24h=None, launches7d=None, startedAt=None,
                           series=[dict(id='volume', label='Selected pools: hourly USD volume', color=spec.get('color', '#f59e0b'), points=[])],
                           contenders=[], topLaunchpads=None, signals=[], exampleTokens=[], suggestedLaunchpads=[],
                           _meta=dict(selection='curated evidence-backed sample; not a market-wide top ranking', firstObservedAt=RUNTIME, storyEvidenceIds=[],
                                      membershipBasis='reconstructed_today', fullNarrativeCoverage=False, marketDataProvider='Codex via Frames')))
for n in narratives:
    want = [u for u in universe if u['narrativeId'] == n['id']]
    have = {c['id'] for c in n['contenders']}
    n['contenders'] = [c for c in n['contenders'] if c['id'] in {u['tokenId'] for u in want}]
    n['exampleTokens'] = [e for e in n['exampleTokens'] if e['_tokenId'] in {u['tokenId'] for u in want}]
    for u in want:
        if u['tokenId'] not in have:
            n['contenders'].append(dict(id=u['tokenId'], name=u['name'], symbol=u['symbol'], share=None, change24h=None, color=None, launchpadSlug=u['originLaunchpadSlug']))
            n['exampleTokens'].append(dict(_tokenId=u['tokenId'], symbol=u['symbol'], name=u['name'], launchpadSlug=u['originLaunchpadSlug'], chain=u['chain'], mcapUsd=None, change24h=None))
    ids = [c['id'] for c in n['contenders']]; assert ids, f'{n["id"]} has no constituents'
    ext = [dict(time=grid[j], value=math.fsum(series[i][j]['value'] for i in ids)) for j in range(168)]
    v24 = math.fsum(p['value'] for p in ext[-24:]); prev = math.fsum(p['value'] for p in ext[-48:-24])
    n['series'][0]['points'] = ext[-24:]; n['volume24hUsd'] = v24; n['volume7dUsd'] = math.fsum(p['value'] for p in ext)
    pool24 = {i: math.fsum(p['value'] for p in series[i][-24:]) for i in ids}
    shares = [dict(tokenId=i, share=100 * pool24[i] / v24) for i in ids]
    # Turnover flag: pool volume far above the token's market cap usually means wash, bot or launch-day churn.
    turnover = {i: (pool24[i] / tok[i]['mcapUsd'] if tok[i].get('mcapUsd') else None) for i in ids}
    flagged = sorted((i for i in ids if turnover[i] is not None and turnover[i] > TURNOVER_FLAG), key=lambda i: -pool24[i])
    flagged_share = math.fsum(100 * pool24[i] / v24 for i in flagged)
    chains = sorted({tok[i]['chain'] for i in ids})
    m = n['_meta']
    m.update(chartAnchor=iso(T).replace('Z', '+00:00'), extendedSeries=[dict(id='volume', label='Volume', color=n['series'][0]['color'], points=ext)],
             volumeChange24h=percent(v24, prev), contenderVolumeShares=shares, constituentCount=len(ids), constituentTokenIds=ids,
             poolIds=[f"{tok[i]['chain']}_{tok[i]['pool']}" for i in ids], marketDataRun=P.name, marketEvidenceIds=sorted({bar_eid[tok[i]['pool']] for i in ids}),
             turnover=[dict(tokenId=i, volume24hUsd=pool24[i], mcapUsd=tok[i].get('mcapUsd'), ratio=turnover[i]) for i in ids],
             volumeCaveat=(dict(threshold=TURNOVER_FLAG, flaggedTokenIds=flagged, flaggedShare=flagged_share,
                                text=f"{', '.join(tok[i]['name'] for i in flagged[:3])}{' and others' if len(flagged) > 3 else ''} traded over {TURNOVER_FLAG}× "
                                     f"{'its' if len(flagged) == 1 else 'their'} market cap in 24h ({flagged_share:.0f}% of this volume); it may include wash or bot trading.")
                           if flagged else None),
             provenanceSources=curation.get('provenanceSources', {}).get(n['id'], m.get('provenanceSources')),
             volumeScope=f"Sum of {len(ids)} selected {', '.join(CHAIN_NAME[c] for c in chains)} pool volumes for identified constituents, attributed to launch origin; not all-market coverage. Current membership reconstructed retrospectively.")
    share = {s['tokenId']: s['share'] for s in shares}
    n['contenders'].sort(key=lambda c: -share[c['id']])
    for k, c in enumerate(n['contenders']): c['color'] = PALETTE[k % len(PALETTE)]
    for ex in n['exampleTokens']: ex.update(mcapUsd=tok[ex['_tokenId']].get('mcapUsd'), change24h=tok[ex['_tokenId']].get('change24h'))
    n['exampleTokens'].sort(key=lambda e: -share[e['_tokenId']])
    if n['id'] in curation.get('summaries', {}): m['presentationSummary'] = curation['summaries'][n['id']]
    if n['id'] in curation.get('storyStatus', {}):
        st = dict(curation['storyStatus'][n['id']]); st['observedAt'] = RUNTIME
        if 'evidence' in st: st['evidenceId'] = ev_ref(st.pop('evidence'))
        m['storyStatus'] = st
        if st.get('evidenceId') and st['evidenceId'] not in m['storyEvidenceIds']: m['storyEvidenceIds'].append(st['evidenceId'])
    picks = curation['signals'].get(n['id'])
    if picks is not None:  # today's selection; otherwise keep yesterday's signals and their evidence
        n['signals'] = []
        for p in picks:
            tw, src = tweets[p['postId']]
            url = f"https://x.com/{tw['author']['screen_name']}/status/{tw['id']}"
            n['signals'].append(dict(id='x-' + tw['id'], source='x', label=p.get('label', 'Public post; claim not verification'), title=p['title'], at=tw['created_at']))
            evidence.append(dict(id='x-' + tw['id'], route='frames', tool=requests[src[0]]['calls'][src[1]]['id'], url=url, post_id=tw['id'], source_event_time=tw['created_at'],
                                 source_as_of=tw['created_at'], fetched_at=runs[src[0]]['result']['calls'][src[1]]['body'].get('queried_at'), response_ref=f'raw/{src[0]}.json',
                                 sha256=sha(P / f'raw/{src[0]}.json'), run_id=runs[src[0]]['run_id'], seq=src[1], extraction_path=f"body.tweets[id={tw['id']}]",
                                 limitations=['Paraphrases a public claim; not independent proof.']))
    else:
        evidence.extend(prior_evidence[s['id']] for s in n['signals'] if s['id'] not in {e['id'] for e in evidence})
narratives.sort(key=lambda n: (-n['volume24hUsd'], n['id']))
rules = registry['narrativeRules']
assert 1 <= len(narratives) <= rules['newNarrative']['maxActive'], f'{len(narratives)} narratives; allowed 1-{rules["newNarrative"]["maxActive"]}'
assert len(curation.get('newNarratives', {})) <= rules['newNarrative']['maxNewPerRun']
for nid in curation.get('newNarratives', {}):
    assert sum(1 for u in universe if u['narrativeId'] == nid) >= rules['newNarrative']['minConstituents'], f'{nid} has too few constituents'

# ---------------------------------------------------------------- validation and outputs
overlap = []
for n in narratives:
    new = {p['time']: p['value'] for p in n['_meta']['extendedSeries'][0]['points']}; old = prev_ext.get(n['id'], {})
    common = sorted(set(old) & set(new))
    diffs = [t for t in common if abs(old[t] - new[t]) > .01]
    overlap.append(dict(narrativeId=n['id'], overlappingHours=len(common), differingHours=len(diffs),
                        note='Differences can come from membership changes as well as provider revisions.'))
    pts = n['series'][0]['points']
    assert [p['time'] for p in pts] == grid[-24:]
    assert math.isclose(math.fsum(p['value'] for p in pts), n['volume24hUsd'], abs_tol=.01)
    assert math.isclose(math.fsum(p['value'] for p in n['_meta']['extendedSeries'][0]['points']), n['volume7dUsd'], abs_tol=.01)
    assert math.isclose(sum(s['share'] for s in n['_meta']['contenderVolumeShares']), 100, abs_tol=1e-6)
    assert n['mindshare'] is None and n['topLaunchpads'] is None and all(c['share'] is None for c in n['contenders'])
    assert all(c['launchpadSlug'] in venues for c in n['contenders']) and n['_meta'].get('provenanceSources')
    assert len(n['signals']) > 0
assert len(launchpads) == 19 and all(len(x['metrics']['history30d']) == 30 for x in launchpads)
for e in evidence:
    if e.get('response_ref', '').startswith('raw/') and e['id'].startswith(f'frames-{P.name}'): assert sha(P / e['response_ref']) == e['sha256']
for f in (P / 'raw').glob('*.json'):
    assert not re.search(r'(?i)(authorization|x-api-key|bearer\s+[a-z0-9])', f.read_text()), f'credential-like text in {f.name}'
billing = dict(charged_credits=sum(r['billing']['charged_credits'] for r in runs.values()), percent_remaining=min(r['billing']['percent_remaining'] for r in runs.values()),
               balance_credits_after=min(r['billing']['balance_credits'] for r in runs.values()), per_run={k: r['billing']['charged_credits'] for k, r in runs.items()},
               run_ids={k: r['run_id'] for k, r in runs.items()}, deduplication='Unique run_id only.')
validation = dict(as_of=RUNTIME, passed=True, financialAnchor=iso(F), chartAnchor=iso(T), billing=billing, outcomes=outcomes,
                  callsRequested=sum(len(q['calls']) for q in requests.values()), callsDelivered=sum(c['delivered'] for r in runs.values() for c in r['result']['calls']),
                  financialChecks=checks, deliveryDisputes=disputes, financialRevisionsProviders=len(revisions),
                  financialComplete30dRows=sum(all(p['value'] is not None for p in x['metrics']['history30d']) for x in launchpads),
                  indexedLaunchpadRows=fl['count'], activityVenues=len(observations), pools=len(universe), precreationZeroBuckets=len(precreation),
                  hourlyOverlapWithPriorRun=overlap, narrativeCount=len(narratives), constituentCount=len(universe),
                  staleMarketSnapshots=[t['id'] for t in tokens if t.get('marketSnapshotStale')])
manifest = dict(runId=P.name, version=VERSION, runtimeStartedAt=RUNTIME, priorRun=PRIOR.name, priorNarrativeRun=PRIOR_N.name,
                watermarks=dict(financialExclusiveEnd=iso(F), narrativeExclusiveEnd=iso(T), activitySourceAsOf=iso(observations[0]['sourceAsOf'])),
                requests=[f'raw/{k}-request.json' for k in BATCHES], costs=billing, refreshPrompt='docs/prompts/refresh-market-data.md',
                normalizer='scripts/frames-refresh/normalize.py', recurringTaskCreated=curation.get('recurring', False))
candidates = read('candidates.json', PRIOR_N) if (PRIOR_N / 'candidates.json').exists() else dict(candidates=[], accepted=[])
for c in curation.get('candidates', []): candidates['candidates'].append(dict(c, observedAt=RUNTIME))
addr_universe = {u['address'] for u in universe}
removed_addr = {t.split(':', 1)[1]: c['reason'] for t, c in curation.get('removedMembers', {}).items()}
for c in candidates['candidates']:  # statuses follow the registry, so a token is a member exactly when it is "accepted"
    a = c.get('address')
    if a in addr_universe and c['status'] != 'accepted': c.update(status='accepted', acceptedIn=P.name)
    elif a in removed_addr: c.update(status='removed', removedIn=P.name, reason=removed_addr[a])
known_c = {c.get('address') for c in candidates['candidates']}
for tid, c in curation.get('removedMembers', {}).items():
    if tid.split(':', 1)[1] not in known_c:
        candidates['candidates'].append(dict(address=tid.split(':', 1)[1], tokenId=tid, status='removed', removedIn=P.name, reason=c['reason']))
candidates.setdefault('retiredNarratives', []).extend(retired_records)
for name, obj in [('launchpads.json', launchpads), ('landing-metrics.json', landing), ('narratives.json', narratives), ('tokens.json', tokens),
                  ('memberships.json', members), ('evidence.json', evidence), ('precreation-zero-provenance.json', precreation), ('social-evidence.json', social),
                  ('financial-revisions.json', dict(priorRun=PRIOR.name, revisions=revisions)), ('hourly-revisions.json', overlap), ('candidates.json', candidates),
                  ('validation-report.json', validation), ('refresh-manifest.json', manifest)]:
    write(name, obj)
with (P / 'chart-data.csv').open('w', newline='') as f:
    w = csv.writer(f, lineterminator='\n'); w.writerow(['narrative_id', 'bucket_start_unix', 'bucket_start_utc', 'volume_usd'])
    for n in narratives:
        for p in n['_meta']['extendedSeries'][0]['points']: w.writerow([n['id'], p['time'], iso(p['time']), p['value']])
print(json.dumps(dict(financialAnchor=iso(F), chartAnchor=iso(T), credits=billing['charged_credits'], feeSubtotal=landing['fees']['value'],
                      indexed=[landing['indexedTotals'][k] for k in ('created24', 'completed24')], revisions=len(revisions), disputes=len(disputes),
                      narratives=[(n['id'], round(n['volume24hUsd']), round(n['_meta']['volumeChange24h'] or 0, 1), len(n['contenders']),
                                   n['_meta']['volumeCaveat'] and n['_meta']['volumeCaveat']['text']) for n in narratives]), indent=1))
