#!/usr/bin/env python3
"""Deterministic checks of saved research artifacts. No network or paid tools."""
import hashlib,json,math,pathlib
P=pathlib.Path(__file__).resolve().parent
def read(n):return json.loads((P/n).read_text())
lp=read('launchpads.json');ns=read('narratives.json');ss=read('narrative-series.json');tokens=read('tokens.json');members=read('memberships.json')
slugs={x['slug'] for x in lp};tids={x['id'] for x in tokens};nids={x['id'] for x in ns}
assert len(lp)==19 and len(slugs)==19
assert len(tids)==len(tokens)==4
assert all(m['tokenId'] in tids and m['narrativeId'] in nids for m in members)
assert all(t['originLaunchpadSlug'] in slugs for t in tokens)
assert all(x['id']==x['chain']+':'+x['address'] for x in tokens)
for row in lp:
    points=row['metrics']['history30d']
    assert len(points)==30
    assert [p['time'] for p in points]==list(range(1790380800-30*86400,1790380800,86400))
    assert all(p['value'] is None or p['value']>=0 for p in points)
    assert all(row['metrics'][k] is None for k in ['launched24h','launched7dAvg','graduated24h','graduationRate7d'])
    assert row['logoSrc'] is None
for n in ns:
    s=next(x for x in ss if x['narrativeId']==n['id'])
    pts=n['series'][0]['points'];assert n['series'][0]['id']=='volume'
    assert [p['time'] for p in pts]==list(range(1790438400-86400,1790438400,3600))
    assert len(s['extendedHourly7d'])==168
    assert len({p['time'] for p in s['extendedHourly7d']})==168
    assert all(p['value'] is not None and p['value']>=0 for p in s['extendedHourly7d'])
    assert math.isclose(math.fsum(p['value'] for p in pts),n['volume24hUsd'],abs_tol=.01)
    assert math.isclose(math.fsum(p['value'] for p in s['extendedHourly7d']),n['volume7dUsd'],abs_tol=.01)
    assert n['topLaunchpads'] is None and n['mindshare'] is None and n['startedAt'] is None and n['status'] is None
    assert all(c['id'] in tids and c['share'] is None for c in n['contenders'])
evidence=read('evidence.json');eids={e['id'] for e in evidence}
for e in evidence:
    assert (P/e['response_ref']).exists(),e
    assert hashlib.sha256((P/e['response_ref']).read_bytes()).hexdigest()==e['sha256'],e['id']
for f in read('field-provenance.json'):assert all(e in eids for e in f['evidence_ids']),f
report=read('validation-report.json');assert report['billing']['charged_credits']==0
assert report['checks']['caliHourlyStartConventionVerified']
required=['report.md','contract-and-coverage.json','launchpads.json','entity-mapping.json','narratives.json','tokens.json','memberships.json','evidence.json','narrative-series.json','chart-data.csv','acquisition-recipes.json','refresh-manifest.json','validation-report.json','chart-preview.png']
assert all((P/f).exists() for f in required)
out={'passed':True,'checks':['19 preserved venue identities','four canonical token identities','membership/launchpad references','30-date financial grids and null activity','two exact 24-hour grids','two complete 168-hour extensions','same-window arithmetic within $0.01','unknown legacy attention/status fields preserved','source hashes','provenance evidence references','zero paid Frames invocations','required artifacts present'],'limitations':'Passing validates this declared sample and stored arithmetic, not all-market completeness or external claims.'}
(P/'offline-validation.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
