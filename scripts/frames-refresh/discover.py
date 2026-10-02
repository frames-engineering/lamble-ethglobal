#!/usr/bin/env python3
"""Narrative discovery helpers. Offline; spends nothing.

Usage:
  python3 scripts/frames-refresh/discover.py <run> names
      After raw/d1.json is saved: writes raw/d2-request.json, a Codex tokens(ids) lookup
      for every swept token not already tracked (Frames redacts response keys named
      "token", so filterTokens cannot return names directly).
  python3 scripts/frames-refresh/discover.py <run> summary --prior <previous full run>
      After raw/d2.json is saved: writes discovery.json and prints the decision table:
      candidates with flags, current narrative health, and rule-based suggestions from
      the registry's narrativeRules. Suggestions are inputs to judgment, not decisions.
"""
import argparse, datetime as dt, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(); ap.add_argument('run'); ap.add_argument('step', choices=['names', 'summary']); ap.add_argument('--prior')
args = ap.parse_args()
P = pathlib.Path(args.run).resolve()
NOW = int(dt.datetime.strptime(P.name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc).timestamp())
reg = json.loads((ROOT / 'docs/prompts/refresh-market-data.sources.json').read_text())
NETWORK_CHAIN = {1399811149: 'solana', 56: 'bsc', 4663: 'robinhood', 8453: 'base', 1: 'ethereum', 42161: 'arbitrum', 143: 'monad', 5042: 'arc', 196: 'xlayer', 130: 'unichain'}
CODEX = reg['marketAndActivityTool']


def read(p): return json.loads(pathlib.Path(p).read_text())


d1 = read(P / 'raw/d1.json'); assert d1['status'] == 'completed'
rows, snap, refunded = [], None, []
for c in d1['result']['calls']:  # every alias except the constituent snapshot ("filterTokens") is a sweep
    body = c.get('body') or {}; data = body.get('data') or {}
    # A refunded call with a valid body (for example an empty "recent" list flagged by the cross-check) is still an observation.
    assert not body.get('errors') and data and all(v is not None for v in data.values()), f'discovery call {c["seq"]} failed; see raw/d1.json'
    if not c['delivered']: refunded.append(dict(seq=c['seq'], outcome=c.get('outcome'), reason=(c.get('receipt') or {}).get('reason')))
    for alias, v in data.items():
        if alias == 'filterTokens': snap = v['results']
        else: rows += v['results']
assert rows and snap is not None
tracked = {(u['address'], u['networkId']) for u in reg['poolUniverse']}
sides = []
for r in rows:
    for a in (r['pair']['token0'], r['pair']['token1']):
        k = (a, r['pair']['networkId'])
        if k not in tracked and k not in sides: sides.append(k)

if args.step == 'names':
    parts = [sides[i:i + 60] for i in range(0, len(sides), 60)]
    q = '{ ' + ' '.join(f't{i}:tokens(ids:[' + ','.join(f'{{address:"{a}",networkId:{n}}}' for a, n in part) +
                        ']){address name symbol networkId info{description} launchpad{launchpadName}}' for i, part in enumerate(parts)) + ' }'
    req = dict(calls=[dict(id=CODEX, args=dict(query=q))], search_ids=['srch_0292469d-885f-450d-b251-260690bfa135'],
               idempotency_key=f'lamble-{P.name}-d2', max_usd=0.01)
    (P / 'raw/d2-request.json').write_text(json.dumps(req, separators=(',', ':')) + '\n')
    print(json.dumps(dict(lookups=len(sides), request='raw/d2-request.json')))
    raise SystemExit

# ---------------------------------------------------------------- summary
rules = reg['narrativeRules']; d = reg['discovery']
d2 = read(P / 'raw/d2.json'); assert d2['status'] == 'completed'
meta = {(x['address'], x['networkId']): x for part in d2['result']['calls'][0]['body']['data'].values() for x in part}
slug_of = d['codexLaunchpadSlug']
prior = read(pathlib.Path(args.prior) / 'candidates.json')['candidates'] if args.prior and (pathlib.Path(args.prior) / 'candidates.json').exists() else []
prior_status = {c.get('address'): c['status'] for c in prior if c.get('address')}
best = {}
for r in rows:  # a token can appear in both lists or with several pairs; keep its highest-volume pair
    for a in (r['pair']['token0'], r['pair']['token1']):
        k = (a, r['pair']['networkId']); m = meta.get(k)
        if not m or not m.get('launchpad') or m['launchpad']['launchpadName'] not in slug_of: continue  # quote assets, stocks, uncovered venues
        if k not in best or float(r['volume24'] or 0) > float(best[k]['volume24'] or 0): best[k] = r
candidates = []
for (a, n), r in best.items():
    m = meta[(a, n)]; vol = float(r['volume24'] or 0); cap = float(r['circulatingMarketCap'] or 0); ch = float(r['change24'] or 0)
    age_h = (NOW - r['pair']['createdAt']) / 3600 if r['pair'].get('createdAt') else None
    flags = []
    q = rules['quarantine']
    if cap > q['maxMcapUsdForNewPool'] and age_h is not None and age_h < q['newPoolHours']: flags.append('implausible-cap-for-new-pool')
    if ch > q['maxChange24Ratio']: flags.append('extreme-24h-move')
    if cap and vol / cap > q['maxTurnover']: flags.append('extreme-turnover')
    candidates.append(dict(tokenId=f'{NETWORK_CHAIN.get(n, n)}:{a}', address=a, networkId=n, chain=NETWORK_CHAIN.get(n), name=m['name'], symbol=m['symbol'],
                           description=(m.get('info') or {}).get('description') or '', codexLaunchpad=m['launchpad']['launchpadName'],
                           launchpadSlug=slug_of[m['launchpad']['launchpadName']], pool=r['pair']['address'], poolCreatedAt=r['pair'].get('createdAt'),
                           ageHours=age_h and round(age_h, 1), volume24Usd=vol, mcapUsd=cap or None, change24Pct=100 * ch, turnover=cap and vol / cap or None,
                           flags=flags, priorStatus=prior_status.get(a),
                           meetsMemberBar=not flags and (vol >= rules['addMember']['minVolume24Usd'] or cap >= rules['addMember']['minMcapUsd'])))
candidates.sort(key=lambda c: -c['volume24Usd'])

# Narrative health: today's token-level snapshot plus yesterday's pool-level chart volumes.
tok_vol = {}
for r in snap:
    for a in (r['pair']['token0'], r['pair']['token1']):
        tok_vol.setdefault((a, r['pair']['networkId']), float(r['volume24'] or 0))
prior_n = {n['id']: n for n in read(pathlib.Path(args.prior) / 'narratives.json')} if args.prior else {}
health, suggestions = [], []
for nid in sorted({u['narrativeId'] for u in reg['poolUniverse']}):
    members = [u for u in reg['poolUniverse'] if u['narrativeId'] == nid]
    pn = prior_n.get(nid); pool_prev = {t['tokenId']: t['volume24hUsd'] for t in (pn or {}).get('_meta', {}).get('turnover', [])}
    rows_h = [dict(tokenId=u['tokenId'], symbol=u['symbol'], tokenVolume24Usd=tok_vol.get((u['address'], u['networkId'])), priorPoolVolume24Usd=pool_prev.get(u['tokenId'])) for u in members]
    total_now = sum(r['tokenVolume24Usd'] or 0 for r in rows_h)
    health.append(dict(narrativeId=nid, title=pn and pn['title'], constituents=len(members), tokenVolume24UsdNow=total_now,
                       priorSampleVolume24Usd=pn and pn['volume24hUsd'], members=rows_h))
    rm = rules['removeMember']['maxPoolVolume24Usd']
    for r in rows_h:
        if (r['tokenVolume24Usd'] or 0) < rm and r['priorPoolVolume24Usd'] is not None and r['priorPoolVolume24Usd'] < rm:
            suggestions.append(dict(action='consider-removing-member', narrativeId=nid, tokenId=r['tokenId'], symbol=r['symbol'],
                                    why=f'below ${rm:,} 24h volume on two consecutive observations'))
    rt = rules['retireNarrative']['maxVolume24Usd']
    if total_now < rt and pn and pn['volume24hUsd'] < rt:
        suggestions.append(dict(action='consider-retiring-narrative', narrativeId=nid, why=f'below ${rt:,} 24h volume on two consecutive observations'))
active = len(health)
if active < rules['newNarrative']['minActive']:
    suggestions.append(dict(action='find-new-narrative', why=f'only {active} active narratives; target {rules["newNarrative"]["minActive"]}-{rules["newNarrative"]["maxActive"]}'))
eligible = [c for c in candidates if c['meetsMemberBar'] and c['priorStatus'] not in ('rejected', 'quarantined')]
if eligible:
    suggestions.append(dict(action='classify-candidates', count=len(eligible),
                            why='candidates above the member bar; assign to an existing narrative, cluster into a new one, or record as unrelated'))
out = dict(run=P.name, rules=rules, refundedButUsed=refunded, candidates=candidates, narrativeHealth=health, suggestions=suggestions,
           note='Token-level volumes here are not the pool-level sample volumes shown on the site.')
(P / 'discovery.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')

if refunded: print('== refunded discovery calls used as observations:', json.dumps(refunded)[:300])
print(f'== narrative health ({active} active)')
for h in health:
    print(f"{h['narrativeId']:22} {h['constituents']:>2} coins  token vol now ${h['tokenVolume24UsdNow']:>12,.0f}  prior sample ${h['priorSampleVolume24Usd'] or 0:>12,.0f}")
print('== suggestions'); [print(' -', json.dumps(s)) for s in suggestions]
print(f'== candidates ({len(candidates)}; * = meets member bar)')
for c in candidates[:90]:
    print(f"{'*' if c['meetsMemberBar'] else ' '} {c['chain']:9} {c['launchpadSlug']:12} {c['symbol'][:14]:14} vol ${c['volume24Usd']:>11,.0f} cap ${c['mcapUsd'] or 0:>12,.0f} "
          f"age {c['ageHours'] or 0:>6.0f}h {','.join(c['flags']) or '-':28} {c['priorStatus'] or '':12} {c['description'][:110]!r}")
