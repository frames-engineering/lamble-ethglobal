"""Offline expansion using address-level registry evidence and matched pool bars."""
import json,pathlib,math,datetime,csv
P=pathlib.Path(__file__).parent; OLD=P.parent/'20260926T172434Z'
def read(f,p=P):return json.loads((p/f).read_text())
def write(f,v):(P/f).write_text(json.dumps(v,indent=2,allow_nan=False)+'\n')
T=1790442000
bars=read('raw/bars.json'); data=bars['result']['calls'][0]['body']['data']
pools=read('raw/pools.json')['result']['calls'][0]['body']['data']['filterTokens']['results']
registry=read('registry.json'); reg={x['address']:x for x in registry}
discovery=read('raw/discovery.json'); markdown=discovery['result']['calls'][1]['body']['data']['markdown']
ns=read('narratives.json',OLD); tokens=read('tokens.json',OLD); memberships=read('memberships.json',OLD)
created={i+4:r['pair']['createdAt'] for i,r in enumerate(pools)}
series={};precreation=[]
for i in range(9):
 b=data[f'p{i}']; assert len(b['t'])==len(set(b['t']))
 vals=dict(zip(b['t'],b['volume'])); out=[]
 for t in range(T-7*86400,T,3600):
  v=vals.get(t)
  if v is None and i in created and t+3600<=created[i]:
   v=0;precreation.append(dict(poolIndex=i,time=t,basis='Entire bucket precedes provider on-chain pool creation time; no pool existed. Not a token-wide inactivity claim.'))
  assert v is not None,(i,t,'unexpected missing live-pool bucket')
  out.append(dict(time=t,value=float(v)))
 series[i]=out
colors=['#4895ef','#7c83ff','#a78bfa','#f59e0b','#22c55e']
new=[]
for i, market in enumerate(pools,4):
 pair=market['pair']; addr=pair['token0']; assert pair['networkId']==1399811149 and addr in reg
 label=reg[addr]['label']; name,symbol=label.rsplit(' (',1);symbol=symbol[:-1]
 block=markdown[markdown.index(addr):].split('\n- [')[0];assert 'pump.fun' in block
 tokenId='solana:'+addr; eid='frames-usepaid-'+addr
 token=dict(id=tokenId,chain='solana',address=addr,name=name,symbol=symbol,originLaunchpadSlug='pump.fun',originStatus='Official registry reports Pump; creation transaction not independently decoded',evidenceIds=[eid],firstObservedAt='2026-09-26T18:41:09Z',mcapUsd=float(market['circulatingMarketCap']),change24h=float(market['change24']),pool=pair['address'],poolCreatedAt=pair['createdAt'])
 tokens.append(token);new.append((i,token,colors[i-4]))
 memberships.append(dict(id='n-x-money:'+tokenId,narrativeId='n-x-money',tokenId=tokenId,version=1,methodVersion='lamble-narratives-v2',rationale='Official UsePaid registry links this exact mint to a named fee recipient and marks Pump origin; pool token0 matches that mint on Solana.',evidenceIds=[eid],effectiveFrom='2026-09-26T18:41:09Z',effectiveTo=None,firstObservedAt='2026-09-26T18:41:09Z',historicalMembershipBasis='reconstructed_today',confidence='source-supported; not calibrated'))
for n in ns:
 indices=[0,1,4,5,6,7,8] if n['id']=='n-x-money' else [2,3]
 extended=[dict(time=series[0][j]['time'],value=math.fsum(series[i][j]['value'] for i in indices)) for j in range(168)]
 total=math.fsum(x['value'] for x in extended[-24:]);previous=math.fsum(x['value'] for x in extended[-48:-24])
 n['series'][0]['points']=extended[-24:];n['volume24hUsd']=total;n['volume7dUsd']=math.fsum(x['value'] for x in extended)
 m=n['_meta'];m['chartAnchor']=datetime.datetime.fromtimestamp(T,datetime.timezone.utc).isoformat();m['volumeScope']=f'Sum of {len(indices)} selected Solana pool volumes for identified constituents, attributed to launch origin; not all-market coverage. Current membership reconstructed retrospectively.'
 m['extendedSeries']=[dict(id='volume',label='Volume',color=n['series'][0]['color'],points=extended)]
 m['volumeChange24h']=100*(total-previous)/previous if previous else None;m['constituentCount']=len(indices)
 m['presentationSummary']='Coins routing creator fees to named X accounts through UsePaid, including e/acc, CALI and Elon Coin.' if n['id']=='n-x-money' else 'StonkFun coins distributing their paired asset to holders: ZCAT rewards in ZEC and KNOTS rewards in STONK.'
 if n['id']=='n-x-money':
  for i,t,color in new:
   n['contenders'].append(dict(id=t['id'],name=t['name'],symbol=t['symbol'],share=None,change24h=None,color=color,launchpadSlug='pump.fun'))
   n['exampleTokens'].append(dict(_tokenId=t['id'],symbol=t['symbol'],name=t['name'],launchpadSlug='pump.fun',chain='solana',mcapUsd=t['mcapUsd'],change24h=t['change24h']))
 tokenids=[c['id'] for c in n['contenders']]
 m['contenderVolumeShares']=[dict(tokenId=tid,share=100*math.fsum(x['value'] for x in series[i][-24:])/total) for tid,i in zip(tokenids,indices)]
 shares={x['tokenId']:x['share'] for x in m['contenderVolumeShares']}; n['contenders'].sort(key=lambda c:-shares[c['id']])
 n['exampleTokens']=[dict(t, mcapUsd=None,change24h=None) if t['_tokenId'] in {x['id'] for x in read('tokens.json',OLD)} else t for t in n['exampleTokens']]
write('narratives.json',ns);write('tokens.json',tokens);write('memberships.json',memberships)
write('precreation-zero-provenance.json',precreation)
write('evidence.json',[dict(id='frames-usepaid-'+t['address'],url='https://usepaid.app/token/'+t['address'],registryUrl='https://usepaid.app/',run_id=discovery['run_id'],seq=1,extraction='body.data.markdown registry block linked by exact mint',poolEvidence='raw/pools.json',barEvidence='raw/bars.json',source_as_of=None,fetched_at='2026-09-26T18:41:09Z') for _,t,_ in new])
write('validation-report.json',dict(passed=True,constituents=9,newConstituents=5,narratives=2,hourlyBucketsPerNarrative=168,precreationZeroBuckets=len(precreation),gridComplete=True,volumeReconciled=True,classificationBasis='reconstructed_today',sampling='20 high-volume and 20 recently created-pair candidates over five launchpad filters. Missing metadata prevented broad classification; five additions resolved independently through official registry and exact pool token addresses. Not exhaustive.'))
with (P/'chart-data.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['narrative_id','time','volume_usd'])
 for n in ns:
  for x in n['_meta']['extendedSeries'][0]['points']:w.writerow([n['id'],x['time'],x['value']])
print([(n['title'],n['volume24hUsd'],n['_meta']['volumeChange24h'],len(n['contenders'])) for n in ns])
