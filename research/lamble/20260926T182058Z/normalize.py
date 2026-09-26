"""Offline derivations. Preserve event-verified DTO fields separately from beta indexed observations."""
import json,pathlib,datetime
p=pathlib.Path(__file__).parent
raw=json.loads((p/'raw/launchstats.json').read_text())
data=raw['result']['calls'][0]['body']['data']['filterLaunchpads']
assert len(data['results'])==data['count']==80
rows={r['id']:r for r in data['results']}
mapping={'pump.fun':['pump.fun:0','pump-mayhem:0'],'stonkfun':['stonkfun:0'],'pons':['pons:0'],'flap-sh':['flap:0'],'launchlab':['launchlab:0'],'bonk.fun':['bonk:0'],'genius.fun':['genius:0'],'argus-world':['argus:0'],'meteora-dbc':['meteoradbc:0'],'o1-launchpad':['o1.exchange:0'],'clanker':['clanker:0','clanker-v4:0'],'bags':['bags:0'],'four.meme':['four.meme:0','four.meme-fair:0'],'foci':['foci:0']}
observations=[]
for slug,ids in mapping.items():
 selected=[rows[i] for i in ids]
 assert len(set(r['timestamp'] for r in selected))==1
 sums={f:sum(r[f] for r in selected) for f in ['tokensCreated24','tokensCreated1w','tokensCompleted24','tokensCompleted1w','tokensMigrated24']}
 # Argus completion state contradicts direct-pool methodology. Curve completion is N/A for Clanker and o1.
 curve=slug not in ['argus-world','clanker','o1-launchpad']
 observations.append(dict(slug=slug,providerIds=ids,sourceAsOf=selected[0]['timestamp'],networkIds=sorted(set(n for r in selected for n in r['networkIds'])),indexedCreated24=sums['tokensCreated24'],indexedCreated7d=sums['tokensCreated1w'],indexedCompleted24=sums['tokensCompleted24'] if curve else None,indexedCompleted7d=sums['tokensCompleted1w'] if curve else None,indexedMigrated24=sums['tokensMigrated24'],indexed7dAvg=sums['tokensCreated1w']/7,indexed7dCompletionRate=100*sums['tokensCompleted1w']/sums['tokensCreated1w'] if curve and sums['tokensCreated1w'] else None,status='candidate_unverified',coverage='Provider-reported indexed activity, beta. Exact window cutoffs, creation-event completeness and finality are not independently established.',rawCompletion=sums['tokensCompleted24'],runId=raw['run_id'],seq=0))
base=json.loads((p.parent/'20260926T172434Z/launchpads.json').read_text())
# Conservative subset: disjoint launch contracts plus separate toolkit service charges.
excluded={'stonkfun':'Contains LaunchLab platform fees; post-migration component not separated','bonk.fun':'Shares LaunchLab curve fees; post-migration component not separated','graphite-protocol':'Share of BONK joint-venture fees','bags':'Solana DBC overlap; Robinhood and post-migration components not separated','binance-alpha':'Execution-route fees may overlap underlying venues; no component partition'}
selected=[r for r in base if r['slug'] not in excluded]
assert len(selected)==14 and all(r['metrics']['h24']['fees'] is not None for r in selected)
fee=sum(r['metrics']['h24']['fees'] for r in selected)
# Time-key join; any missing component leaves the aggregate daily bucket unknown.
grids=[{x['time']:x['value'] for x in r['metrics']['history30d']} for r in selected]
times=sorted(set().union(*(g.keys() for g in grids)))
history=[dict(time=t,value=sum(g[t] for g in grids) if all(g.get(t) is not None for g in grids) else None) for t in times]
output=dict(methodologyVersion='lamble-activity-v1',activity=observations,fees=dict(value=fee,kind='covered subtotal',financialAnchor=selected[0]['_meta']['financialAnchor'],includedSlugs=[r['slug'] for r in selected],excluded=excluded,history30d=history,change30d=None,scope='Sum of 14 non-overlapping mapped fee streams for the last complete UTC day. Omits five overlapping rows; some included adapters cover only one version. Not an all-roster total.'),indexedTotals=dict(created24=sum(r['indexedCreated24'] for r in observations),completed24=sum(r['indexedCompleted24'] or 0 for r in observations),creationVenues=len(observations),completionVenues=sum(r['indexedCompleted24'] is not None for r in observations),sourceAsOf=observations[0]['sourceAsOf'],scope='Provider-indexed counts, mapped launchpad names. 14 venue creation records, 11 completion records. Beta coverage; omitted venues are unknown, not zero. Not a complete roster total.'))
(p/'landing-metrics.json').write_text(json.dumps(output,indent=2)+'\n')
print({'feeSubtotal':fee,'activity':output['indexedTotals'],'feeHistoryKnownDays':sum(x['value'] is not None for x in history)})
