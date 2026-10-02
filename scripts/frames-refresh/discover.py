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
      the registry's narrativeRules, and theme clusters (candidates sharing a word in name,
      symbol or description that together meet the newNarrative bar). Every cluster must get
      a decision in curation.json clusterDecisions; normalize.py enforces it.
  python3 scripts/frames-refresh/discover.py <run> stories
      After summary: writes raw/e2-request.json, X searches for the top clusters' themes
      (within narrativeRules.storyChecks), so new stories are checked every day.
"""
import argparse, datetime as dt, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(); ap.add_argument('run'); ap.add_argument('step', choices=['names', 'summary', 'stories']); ap.add_argument('--prior')
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

if args.step == 'stories':  # story-first check of today's clusters: theme word and the top member's cashtag
    disc = read(P / 'discovery.json'); sc = reg['narrativeRules']['storyChecks']
    words_, seen = [], set()
    for k in disc['clusters']:
        top = max(k['members'], key=lambda m: m['volume24Usd'])['symbol']
        if top.upper() in seen: continue  # one search per leading coin; overlapping clusters share it
        seen.add(top.upper())
        words_.append(k['keyword'] if k['keyword'].startswith('$') else f"{k['keyword']} ${top}")  # theme word next to the leading ticker
    words_ = words_[:min(10, sc['maxXSearchesPerRun'] - 2)]  # leave room for targeted follow-ups
    if not words_: print(json.dumps(dict(stories=0))); raise SystemExit
    n = 2
    while (P / f'raw/e{n}-request.json').exists(): n += 1
    req = dict(calls=[dict(id='bazaar.twitter-use-x402atlas-com-search', args=dict(words=w)) for w in words_],
               search_ids=['srch_5cb35fee-4f86-413f-954c-78fc2c92631f'], idempotency_key=f'lamble-{P.name}-e{n}', max_usd=0.1)
    (P / f'raw/e{n}-request.json').write_text(json.dumps(req, separators=(',', ':')) + '\n')
    print(json.dumps(dict(stories=len(words_), request=f'raw/e{n}-request.json', words=words_)))
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

# Cluster hints: eligible candidates that share a theme word in their name, symbol or description.
# A word is a lead, not a story; every cluster still needs the newNarrative evidence bar.
STOP = set('''the and for with that this from your you our are was were will have has had its it's not but all any can just get got into out about more most
than then them they their there what when where which who why how new now one two only also very much many some such over under real first last best
token coin coins tokens crypto meme memes memecoin memecoins launch launched launchpad community official project holders holder supply buy sell trade
trading pump fun bonk bags solana sol bnb bsc base chain network website twitter telegram join www http https com app xyz org net live time day world
make made let lets every each like love go going come back here dont don't what's isn't been being would could should first people life'''.split())
def words(c):
    import re
    text = f"{c['name']} {c['symbol']} {c['description']}".lower()
    w = {x for x in re.findall(r'[a-z][a-z0-9]{3,}', text) if x not in STOP}
    return w | {'$' + c['symbol'].upper()}  # a shared ticker (copycat wave) is a theme of its own
nr = rules['newNarrative']
tracked_words = {}
for u in reg['poolUniverse']:
    for x in words(dict(name=u['name'], symbol=u['symbol'], description='')): tracked_words.setdefault(x, set()).add(u['narrativeId'])
pool = [c for c in eligible if c['priorStatus'] != 'accepted']
by_word = {}
for c in pool:
    for x in words(c): by_word.setdefault(x, []).append(c)
clusters = []
for x, cs in by_word.items():
    vol = sum(c['volume24Usd'] for c in cs)
    if len(cs) < nr['minConstituents'] or vol < nr['minCombinedVolume24Usd']: continue
    if not x.startswith('$') and len(cs) > d.get('maxClusterWordShare', 8): continue  # too generic to be a theme (tickers are never capped)
    clusters.append(dict(id=f'k-{x.replace("$", "sym-")}', keyword=x, size=len(cs), combinedVolume24Usd=vol, launchpads=sorted({c['launchpadSlug'] for c in cs}),
                         chains=sorted({c['chain'] for c in cs}), overlapsNarratives=sorted(tracked_words.get(x, set())),
                         members=[dict(tokenId=c['tokenId'], symbol=c['symbol'], name=c['name'], volume24Usd=c['volume24Usd']) for c in cs]))
clusters.sort(key=lambda k: (-k['combinedVolume24Usd'], k['keyword']))
kept = []  # drop clusters whose members are mostly another, larger cluster's (synonyms of one theme)
for k in clusters:
    ids = {m['tokenId'] for m in k['members']}
    if any(len(ids & {m['tokenId'] for m in o['members']}) >= 0.8 * len(ids) for o in kept): continue
    kept.append(k)
clusters = kept[:d.get('maxClusters', 8)]
for k in clusters:
    suggestions.append(dict(action='evaluate-new-narrative-cluster', clusterId=k['id'], keyword=k['keyword'], size=k['size'],
                            combinedVolume24Usd=round(k['combinedVolume24Usd']), overlapsNarratives=k['overlapsNarratives'],
                            why='meets the newNarrative size and volume bar on a shared theme word; check the story, then create, assign or reject (record in curation.clusterDecisions)'))
if active < nr['maxActive'] and not clusters:
    suggestions.append(dict(action='find-new-narrative', why=f'{active} active narratives (cap {nr["maxActive"]}) and no theme cluster met the bar; look across candidates and posts for a story the word match missed'))
out = dict(run=P.name, rules=rules, refundedButUsed=refunded, candidates=candidates, clusters=clusters, narrativeHealth=health, suggestions=suggestions,
           note='Snapshot volumes are Codex rolling 24h token volumes; site volumes are hourly all-pool sums over the chart window.')
(P / 'discovery.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')

if refunded: print('== refunded discovery calls used as observations:', json.dumps(refunded)[:300])
print(f'== narrative health ({active} active)')
for h in health:
    print(f"{h['narrativeId']:22} {h['constituents']:>2} coins  token vol now ${h['tokenVolume24UsdNow']:>12,.0f}  prior sample ${h['priorSampleVolume24Usd'] or 0:>12,.0f}")
print('== suggestions'); [print(' -', json.dumps(s)) for s in suggestions]
print(f'== theme clusters ({len(clusters)})')
for k in clusters:
    print(f"{k['id']:24} {k['size']:>2} coins ${k['combinedVolume24Usd']:>12,.0f} {','.join(k['launchpads'])[:40]:40} overlaps={k['overlapsNarratives'] or '-'} "
          f"{' '.join(m['symbol'] for m in k['members'])[:120]}")
print(f'== candidates ({len(candidates)}; * = meets member bar)')
for c in candidates[:90]:
    print(f"{'*' if c['meetsMemberBar'] else ' '} {c['chain']:9} {c['launchpadSlug']:12} {c['symbol'][:14]:14} vol ${c['volume24Usd']:>11,.0f} cap ${c['mcapUsd'] or 0:>12,.0f} "
          f"age {c['ageHours'] or 0:>6.0f}h {','.join(c['flags']) or '-':28} {c['priorStatus'] or '':12} {c['description'][:110]!r}")
