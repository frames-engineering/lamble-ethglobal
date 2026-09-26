#!/usr/bin/env python3
"""Reproduce the Frames dataset from saved bodies. Offline; never spends credits."""
import csv, datetime as dt, hashlib, json, math, pathlib, re, shutil
P=pathlib.Path(__file__).resolve().parent
OLD=P.parent/'20260926T170103Z'
TF=1790380800; TC=1790438400
VERSION='lamble-frames-1.1.0'
def read(name,root=P): return json.loads((root/name).read_text())
def write(name,obj): (P/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False,allow_nan=False)+'\n')
def iso(t): return dt.datetime.fromtimestamp(t,dt.timezone.utc).isoformat().replace('+00:00','Z')
def total(v): return None if any(x is None for x in v) else math.fsum(v)
def percent(a,b): return None if a is None or b in (None,0) else 100*(a-b)/b
asof=dt.datetime.now(dt.timezone.utc).isoformat()
names=['seed','f1','f2','f3','f4','e1','e2','v1']
runs={k:read('raw/'+k+'.json') for k in names}
requests={k:read('raw/'+k+'-request.json') for k in names}
assert all(r['status']=='completed' for r in runs.values())
assert len({r['run_id'] for r in runs.values()})==len(runs)
evidence=read('evidence.json',OLD)
for e in evidence:e['response_ref']='../'+OLD.name+'/'+e['response_ref']
new_ev={}; outcomes=[]; recipes=[]
for name,r in runs.items():
 for c in r['result']['calls']:
  seq=c['seq'];req=requests[name]['calls'][seq]; eid='frames-'+name+'-'+str(seq)
  body=c.get('body',{});assert 'body_ref' not in c,'Retrieve stored body before normalization'
  ev=dict(id=eid,route='frames',tool=req['id'],upstream={'mpp.codex.post.graphql':'Codex','bazaar.defillama-use-x402atlas-com-fee-summary':'DefiLlama via Atlas','mpp.firecrawl.post.v1-scrape':'Firecrawl / target website','bazaar.twitter-use-x402atlas-com-search':'X via Atlas'}.get(req['id'],req['id']),redacted_request=req,run_id=r['run_id'],seq=seq,response_ref='raw/'+name+'.json',sha256=hashlib.sha256((P/('raw/'+name+'.json')).read_bytes()).hexdigest(),extraction_path=f'$.result.calls[{seq}].body',source_as_of=body.get('queried_at') or body.get('generated_at'),fetched_at=body.get('queried_at') or body.get('generated_at') or iso((P/('raw/'+name+'.json')).stat().st_mtime),fetched_at_basis='provider query/generation timestamp where present, otherwise saved response mtime',source_event_time=None,delivery=c['delivered'],delivery_outcome=c.get('outcome','not_delivered'),methodology_version=VERSION,limitations=['Delivery outcome and semantic validation are separate. Fetched time is not publish time.'])
  evidence.append(ev);new_ev[(name,seq)]=eid
  outcomes.append(dict(run_id=r['run_id'],seq=seq,tool_id=req['id'],delivered=c['delivered'],outcome=c.get('outcome','not_delivered'),reason=c.get('receipt',{}).get('reason') or body.get('reason')))
 recipes.append(dict(id=name,status='executed',request=requests[name],run_id=r['run_id'],response_ref='raw/'+name+'.json',billing=r['billing'],last_success_at=iso((P/('raw/'+name+'.json')).stat().st_mtime),repeat_policy='New idempotency key for each new logical observation; reuse key only to recover same run. Poll terminal status before retry.'))

launchpads=read('launchpads.json',OLD);mapping=read('entity-mapping.json',OLD)
coverage=read('contract-and-coverage.json',OLD);coverage['as_of']=asof
coverage['repository']['reinspectionRun']=OLD.name
provenance=read('field-provenance.json',OLD)
fin={};checks=[];disputes=[]
for name in ['seed','f1','f2','f3','f4']:
 for c in runs[name]['result']['calls']:
  req=requests[name]['calls'][c['seq']]
  if req['id']!='bazaar.defillama-use-x402atlas-com-fee-summary':continue
  args=req['args'];provider=args['protocol'];kind=args['dataType'];d=c['body']['data']
  pairs=d['totalDataChart'];assert d['slug']==provider
  assert len({t for t,v in pairs})==len(pairs)
  assert all(t%86400==0 and t<=TF and isinstance(v,(int,float)) and v>=0 for t,v in pairs)
  prior=read('raw/llama-'+provider+'-'+kind+'.json',OLD)
  complete={t:v for t,v in pairs if t<TF}
  assert complete=={t:v for t,v in prior['totalDataChart'] if t<TF}
  fin[(provider,kind)]=(d,new_ev[(name,c['seq'])],c['delivered'])
  checks.append(dict(provider=provider,kind=kind,sourceDays=len(pairs),lastDate=iso(max(t for t,v in pairs)),completeDaysMatchEarlierDirectUpstream=True,containsFutureDates=False,delivery=c['delivered']))
  if not c['delivered']:disputes.append(dict(provider=provider,kind=kind,receipt=c['receipt'],evidence_id=new_ev[(name,c['seq'])],assessment='Date rejection contradicted by Unix timestamp conversion: all dates <= runtime UTC date. Complete dates exactly match earlier direct DefiLlama response. Retained as independently validated returned body, not a delivered call.'))
for lp in launchpads:
 provider=lp['_meta']['providerSlug'];data={};refs=[]
 for kind,label in [('dailyFees','fees'),('dailyRevenue','revenue')]:
  d,eid,delivered=fin[(provider,kind)];data[label]=dict(d['totalDataChart']);refs.append(eid)
 metrics={}
 for label,days in [('h24',1),('d7',7),('d30',30)]:
  vals={k:total([v.get(t) for t in range(TF-days*86400,TF,86400)]) for k,v in data.items()}
  prev=total([data['fees'].get(t) for t in range(TF-2*days*86400,TF-days*86400,86400)])
  metrics[label]={**vals,'change':percent(vals['fees'],prev)}
 metrics.update({k:None for k in ['launched24h','launched7dAvg','graduated24h','graduationRate7d']})
 metrics['history30d']=[dict(time=t,value=data['fees'].get(t)) for t in range(TF-30*86400,TF,86400)]
 lp['metrics']=metrics;lp['_meta']['financialEvidenceIds']=refs
 lp['_meta']['financialRoute']='frames';lp['_meta']['financialDeliveryDisputes']=[x for x in disputes if x['provider']==provider]
 lp['_meta']['fetched_at_reference']=refs
 for path,status in coverage['venueFields'][lp['slug']].items():
  if path.startswith('metrics.') and path not in ['metrics.launched24h','metrics.launched7dAvg','metrics.graduated24h','metrics.graduationRate7d']:
   status['evidence_ids']=refs
 for f in provenance:
  if f['entity_id']==lp['slug'] and f['field_path'].startswith('metrics.') and not f['field_path'].split('.')[-1] in ['launched24h','launched7dAvg','graduated24h','graduationRate7d']:
   f['evidence_ids']=refs;f['methodology_version']=VERSION;f['extraction_path']='body.data.totalDataChart';f['transformation']='Exact complete-day grid; sum only when all required buckets present; percent change against preceding equal window.'
 for m in mapping['launchpads']:
  if m['slug']==lp['slug']:m['financialFramesEvidenceIds']=refs

tokens=read('tokens.json',OLD);members=read('memberships.json',OLD);pools=read('selected-pools.json',OLD)
ns=read('narratives.json',OLD);old_series=read('narrative-series.json',OLD);series=[]
bars=runs['e1']['result']['calls'][0]['body']['data'];tokenbars={};barchecks=[]
for i,pool in enumerate(pools):
 b=bars['p'+str(i)];assert b['t']==list(range(TC-7*86400,TC,3600))
 assert len(b['volume'])==168
 values=[float(v) if v is not None else None for v in b['volume']]
 assert all(v is not None and v>=0 for v in values)
 tokenbars[pool['tokenId']]=dict(zip(b['t'],values))
 pool['framesEvidenceIds']=[new_ev[('e1',0)]]
 seed=runs['seed']['result']['calls'][0]['body']['data']['p'+str(i)]
 barchecks.append(dict(tokenId=pool['tokenId'],hourCount=168,missing=0,seed24hMatchesLatest7d=all(math.isclose(float(v),tokenbars[pool['tokenId']][t],abs_tol=.01) for t,v in zip(seed['t'],seed['volume']))))
for n in ns:
 ids=n['_meta']['constituentTokenIds'];points=[dict(time=t,value=total([tokenbars[x].get(t) for x in ids])) for t in range(TC-7*86400,TC,3600)]
 n['series'][0]['points']=points[-24:];n['volume24hUsd']=total([p['value'] for p in points[-24:]])
 n['volume7dUsd']=total([p['value'] for p in points]);n['_meta']['marketDataProvider']='Codex via Frames'
 n['_meta']['marketEvidenceIds']=[new_ev[('e1',0)]];n['_meta']['supersedesMarketDataRun']=OLD.name
 shares=[dict(tokenId=x,share=100*sum(tokenbars[x][p['time']] for p in points[-24:])/n['volume24hUsd']) for x in ids]
 n['_meta']['contenderVolumeShares']=sorted(shares,key=lambda x:-x['share'])
 n['contenders'].sort(key=lambda c:-next(s['share'] for s in shares if s['tokenId']==c['id']))
 s=dict(narrativeId=n['id'],seriesId='volume',unit='USD per hour',timeUnit='Unix seconds',timestampMeaning='bucket start',interval='[start,start+3600)',window=dict(start=iso(TC-86400),end_exclusive=iso(TC)),points=points[-24:],extendedHourly7d=points,coverage=dict(expectedHourlyBuckets=168,observedHourlyBuckets=168,poolCount=2,fullNarrativeUniverse=False,otherPoolsExcluded=True,cexExcluded=True),membershipBasis='reconstructed_today',provider='Codex via Frames',evidenceIds=[new_ev[('e1',0)],new_ev[('v1',0)]],daily30d=None)
 series.append(s)
 for f in provenance:
  if f['entity_id']==n['id'] and f['field_path'] in ['volume24hUsd','volume7dUsd','series']:
   f.update(evidence_ids=[new_ev[('e1',0)]],methodology_version=VERSION,extraction_path='$.result.calls[0].body.data.p{0..3}.{t,volume}',transformation='Sum disjoint fixed-pool USD hourly volumes by exact timestamp. Exclude other pools and CEX.',source_as_of=iso(TC))
 # Keep inherited market-cap/price snapshots explicitly timestamped, rather than implying Frames refreshed them.
 n['_meta']['exampleTokenMarketSnapshot']='Earlier direct GeckoTerminal observation; timestamps and evidence in tokens.json. Not refreshed by Frames bars.'
 if n['id']=='n-x-money':n['_meta']['storyEvidenceIds'] += [new_ev[('e1',2)],new_ev[('e2',0)]]
 else:n['_meta']['storyEvidenceIds'] += [new_ev[('e1',3)],new_ev[('e2',1)]]
ns.sort(key=lambda n:(-n['volume24hUsd'],n['id']))
for m in members:
 m['framesEvidenceIds']=[new_ev[('e2',0)],new_ev[('e1',2)]] if m['narrativeId']=='n-x-money' else [new_ev[('e1',3)],new_ev[('e2',1)]]
 m['classifierVersion']=VERSION
social=[]
for name,seq,nid,selected in [('e1',4,'n-x-money',['2103695485118623883','2103568713060602288']),('e2',2,'n-pair-rewards',['2102801301449199906','2099528749683224635'])]:
 body=runs[name]['result']['calls'][seq]['body']
 for t in body['tweets']:
  url=f"https://x.com/{t['author']['screen_name']}/status/{t['id']}"
  social.append(dict(narrativeId=nid,postId=t['id'],url=url,at=t['created_at'],text=t['text'],author=t['author']['screen_name'],evidenceId=new_ev[(name,seq)],attentionInterpretation='Top-results convenience sample; no mention total or historical mindshare. Some KNOTS posts are incentivized by campaign.'))
  if t['id'] in selected:
   title=('ALX discusses keeping UsePaid fees in X Money' if t['id']=='2103695485118623883' else 'Recipient identifies a UsePaid-linked token and disclaims endorsement' if t['id']=='2103568713060602288' else 'KNOTS account reports a social-reward campaign distribution' if t['id']=='2102801301449199906' else 'KNOTS account announces rewards for posting about the token')
   next(n for n in ns if n['id']==nid)['signals'].append(dict(id='x-'+t['id'],source='x',label='Public post; claim not payout verification',title=title,at=t['created_at']))
   evidence.append(dict(id='x-'+t['id'],route='frames',tool='bazaar.twitter-use-x402atlas-com-search',url=url,post_id=t['id'],source_event_time=t['created_at'],source_as_of=t['created_at'],fetched_at=body['queried_at'],response_ref='raw/'+name+'.json',sha256=hashlib.sha256((P/('raw/'+name+'.json')).read_bytes()).hexdigest(),run_id=runs[name]['run_id'],seq=seq,extraction_path=f'body.tweets[id={t["id"]}]',limitations=['Paraphrases a public claim; not independent proof of payouts.']))
launchbody=runs['e1']['result']['calls'][1]['body']
launchsample=dict(evidenceId=new_ev[('e1',1)],requestedSince=requests['e1']['calls'][1]['args']['since'],returnedSince=launchbody['data']['since'],returnedCount=len(launchbody['data']['items']),uniqueMints=len({x['mint'] for x in launchbody['data']['items']}),truncated=launchbody['data']['truncated'],nextCursor=launchbody['data']['next_cursor'],generatedAt=launchbody['generated_at'],meta=launchbody['meta'],events=launchbody['data']['items'],status='candidate_unverified',limitations=['Requested since was not honored; returned default recent window. No transaction/instruction identity or finality proof. Cannot establish complete launch/graduation counts. Probability labels are not measured completion events. Pagination stopped after one page; cursor unsupported until transport semantics fixed.'])
minute=runs['v1']['result']['calls'][0]['body']['data'];ms=math.fsum(map(float,minute['minute']['volume']));hv=float(minute['hour']['volume'][0])
assert minute['minute']['t']==list(range(TC-3600,TC,60))
assert math.isclose(ms,hv,abs_tol=.01)
boundary=dict(minuteCount=60,minuteSum=ms,hourVolume=hv,toleranceUsd=.01,passed=True,observedToBoundaryBehavior='Both to=T and to=T-1 returned only the preceding hour in this test. Use to=T-1 and explicitly clip to [start,T) on refresh.',timestampMeaning='Bucket starts established by minute-to-hour reconciliation',evidenceId=new_ev[('v1',0)])
fees_missing={x['slug']:[f'{w}.{k}' for w in ['h24','d7','d30'] for k,v in x['metrics'][w].items() if v is None] for x in launchpads}
billing=dict(charged_credits=sum(r['billing']['charged_credits'] for r in runs.values()),percent_remaining=runs['v1']['billing']['percent_remaining'],run_ids=[r['run_id'] for r in runs.values()],deduplication='Unique run_id only; sum billing.charged_credits. Quotes and per-call charged_usd are not billed credit totals.')
validation=dict(as_of=asof,passed=True,billing=billing,callsRequested=sum(len(q['calls']) for q in requests.values()),callsDelivered=sum(c['delivered'] for r in runs.values() for c in r['result']['calls']),outcomes=outcomes,financialChecks=checks,deliveryDisputes=disputes,bucketSemantics=boundary,barChecks=barchecks,missingFinancialFields=fees_missing,financialComplete30dRows=sum(all(p['value'] is not None for p in x['metrics']['history30d']) for x in launchpads),narrativeCount=2,canonicalTokenCount=4,launchSampleComplete=False,noApplicationSourceChanges=True,limitations=['Independent date validation does not overturn Frames billing/delivery receipts.','This is a curated fixed-pool sample, not market-wide narrative coverage.'])
for nid,fields in coverage.get('narrativeFields',{}).items():
 for path,status in fields.items():
  if path in ['series','volume24hUsd','volume7dUsd']:status['evidence_ids']=[new_ev[('e1',0)]]
  if path=='signals':status.update(status='verified_direct',reason='Timestamped actual X records with URL sidecars; sampled discussion only.',evidence_ids=[new_ev[('e1',4)] if nid=='n-x-money' else new_ev[('e2',2)]])
coverage['framesRun']=dict(runId=P.name,financialRoutesTested=38,paidExecutionBlocked=False,deliveryDisputes=disputes)
for f in provenance:
 if f['entity_id'] in ['n-x-money','n-pair-rewards'] and f['field_path']=='signals':
  n=next(n for n in ns if n['id']==f['entity_id'])
  f.update(status='verified_direct',evidence_ids=[s['id'] for s in n['signals']],extraction_path='Timestamped selected tweets; evidence IDs resolve URL and source record',methodology_version=VERSION,transformation='Paraphrase source claims; do not infer verified payouts or organic mindshare',limitations=['Convenience sample, campaign incentives and unverified payout claims retained.'])
manifest=dict(runId=P.name,version=VERSION,runtimeStartedAt='2026-09-26T17:24:34Z',packagedAt=asof,repositoryCommit=coverage['repository']['commit'],status='Frames executed; partial market coverage preserved',authorization='User explicitly removed overall ceiling for this research run. Lower per-batch caps retained.',recurringTaskCreated=False,providerMappings='entity-mapping.json',watermarks=dict(financialExclusiveEnd=iso(TF),narrativeExclusiveEnd=iso(TC),creationFinalizedBlock=None),checkpoints=dict(launchFeed=launchsample['nextCursor'],launchFeedUsable=False,socialUsepaidCursor=runs['e1']['result']['calls'][4]['body'].get('cursor'),socialKnotsCursor=runs['e2']['result']['calls'][2]['body'].get('cursor')),cadence=[dict(task='Hourly market aggregation',schedule='hourly after one complete-hour safety margin',boundedCalls=1,recipe='e1 call 0',policy='Four fixed pools; reread last 3 hours for revisions, merge by chain:pool:bucket, preserve old versions.'),dict(task='Daily financials',schedule='daily after upstream updates',boundedCalls=38,recipe='seed call 1 plus f1..f4',policy='Cache full histories; replace overlapping last 7 complete days, retain revisions; API supplies full chart, no invented date filter.'),dict(task='Social evidence',schedule='30–60 minutes',boundedCalls=2,recipe='e1 call 4 and e2 call 2',policy='Deduplicate post IDs. Top mode is a sample. Reclassify only meaningful new evidence.'),dict(task='Discovery',schedule='30 minutes after launch-route repair',boundedCalls=2,policy='Current launch route fails since contract. Do not advance finalized watermark or count launches from it.'),dict(task='Configuration/branding',schedule='weekly or official update',boundedCalls=19,policy='Cache official sources; retain version and chain variants.')],costs=billing,fallback='Earlier public DefiLlama/GeckoTerminal routes are documented in previous run. Never silently merge semantically different volume scopes.',lastSuccessByRecipe={r['id']:r['last_success_at'] for r in recipes},collectionPolicyChanges=['Hourly source changed from GeckoTerminal to Codex for the same four fixed pools. Prior observations retained; provider differences recorded, not blended.'])
for name,obj in [('launchpads.json',launchpads),('entity-mapping.json',mapping),('narratives.json',ns),('tokens.json',tokens),('memberships.json',members),('evidence.json',evidence),('field-provenance.json',provenance),('narrative-series.json',series),('selected-pools.json',pools),('social-evidence.json',social),('launch-observations.json',launchsample),('contract-and-coverage.json',coverage),('validation-report.json',validation),('acquisition-recipes.json',dict(version=VERSION,testedBatches=recipes,extraction='Financials body.data.totalDataChart; Codex body.data.pN.t/volume. Requests are exact executed arguments.',offlineReplay='python3 normalize_frames.py',limits='No live calls from replay. Paid refresh only via Frames with explicit per-batch caps and terminal-run polling.')),('refresh-manifest.json',manifest)]:write(name,obj)
write('narrative-candidates.json',read('narrative-candidates.json',OLD))
with (P/'chart-data.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['narrative_id','bucket_start_unix','bucket_start_utc','volume_usd','provider','membership_basis'])
 for s in series:
  for p in s['extendedHourly7d']:w.writerow([s['narrativeId'],p['time'],iso(p['time']),p['value'],'Codex via Frames','reconstructed_today'])
for n in ns:
 s=next(s for s in series if s['narrativeId']==n['id'])
 assert len(n['series'][0]['points'])==24
 assert math.isclose(sum(p['value'] for p in n['series'][0]['points']),n['volume24hUsd'],abs_tol=.01)
 assert math.isclose(sum(p['value'] for p in s['extendedHourly7d']),n['volume7dUsd'],abs_tol=.01)
 assert all(c['share'] is None for c in n['contenders'])
assert len(launchpads)==19 and len({x['slug'] for x in launchpads})==19
assert all(len(x['metrics']['history30d'])==30 for x in launchpads)
eids={e['id'] for e in evidence}
assert all(e in eids for f in provenance for e in f['evidence_ids'])
for e in evidence:assert hashlib.sha256((P/e['response_ref']).read_bytes()).hexdigest()==e['sha256']
write('offline-validation.json',dict(passed=True,billing=billing,checks=['Saved raw hashes','19 preserved venue references','All returned financial dates <= runtime UTC date','Complete financial dates match direct upstream','Exact 24/168-hour grids','Same-window volume sums within $0.01','60 minute bars reconcile with hour','Unique run billing','Null legacy shares preserved']))
print(json.dumps(dict(billing=billing,narratives=[dict(title=n['title'],volume24hUsd=n['volume24hUsd'],volume7dUsd=n['volume7dUsd']) for n in ns],financialComplete30dRows=validation['financialComplete30dRows'],requested=validation['callsRequested'],delivered=validation['callsDelivered']),indent=2))
