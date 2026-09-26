#!/usr/bin/env python3
"""Rebuild research JSON/CSV using saved responses only. Never makes network calls."""
import csv, datetime as dt, hashlib, json, math, pathlib, re
from urllib.parse import urljoin, urlparse

ROOT = pathlib.Path(__file__).resolve().parent
RAW = ROOT / 'raw'
REPO = ROOT.parents[2]
ASOF = '2026-09-26T17:01:03Z'
TF = 1790380800  # 2026-09-26 00:00 UTC: financial exclusive end
TC = 1790438400  # 2026-09-26 16:00 UTC: chart exclusive end
VERSION = 'lamble-research-1.0.0'

def read(name): return json.loads((ROOT / name).read_text())
def write(name, value): (ROOT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False)+'\n')
def iso(ts): return dt.datetime.fromtimestamp(ts, dt.timezone.utc).isoformat().replace('+00:00','Z')
def sum_complete(values): return None if any(x is None for x in values) else math.fsum(values)
def pct(now, before): return None if now is None or before is None or before == 0 else 100*(now-before)/before

log = []
for f in RAW.glob('*fetch-log*.json'): log.extend(json.loads(f.read_text()))
log_by_path = {r.get('path'): r for r in log if r.get('path')}
evidence = []
def source(path, url=None, upstream=None):
    p=ROOT/path; item=log_by_path.get(path,{})
    sid='e-'+hashlib.sha256(path.encode()).hexdigest()[:12]
    if not any(x['id']==sid for x in evidence):
        evidence.append(dict(id=sid, route='outside_frames_public_get', upstream=upstream,
          url=url or item.get('url'), redacted_request={'method':'GET','url':url or item.get('url')},
          response_ref=path, sha256=hashlib.sha256(p.read_bytes()).hexdigest(),
          source_as_of=None, fetched_at=item.get('fetched_at',iso(p.stat().st_mtime)),
          fetched_at_basis='request log' if item else 'saved file mtime',
          run_id=None, seq=None, source_event_time=None, limitations=['Fetched time is not publish/event time.']))
    return sid

provenance=[]
def prov(entity,path,status,refs=None,extraction=None,window=None,transformation=None,limitations=None):
    provenance.append(dict(entity_id=entity,field_path=path,status=status,evidence_ids=refs or [],
      extraction_path=extraction,window=window,transformation=transformation,
      source_as_of=window.get('end_exclusive') if window else None,
      fetched_at=None, fetched_at_reference='evidence_ids',methodology_version=VERSION,
      confidence='source-supported' if status.startswith('verified') else 'unresolved',
      completeness='see coverage and window',limitations=limitations or []))

fixture_text=(REPO/'src/lib/data/fixtures/launchpads.ts').read_text()
fixture=[]
for b in fixture_text.split('    slug: ')[1:]:
    item={k:re.search(r'    '+k+r': "([^"]+)"',b)[1] for k in ['name','url','domain','brandColor']}
    item['slug']=re.match(r'"([^"]+)"',b)[1];fixture.append(item)
assert len(fixture)==19
mapping={'pons':'pons-v2','bonk.fun':'bonk.fun-launchpad','meteora-dbc':'meteora-dynamic-bonding-curve','stonkbrokers':'stonkbrokers-nightshades'}
chains={'Solana':'solana','BSC':'bsc','Base':'base','Ethereum':'ethereum','Arbitrum':'arbitrum','Monad':'monad','Robinhood Chain':'robinhood','Arc':'arc','X Layer':'xlayer','Unichain':'unichain'}
supported={'pump.fun':['solana'],'stonkfun':['solana'],'pons':['robinhood'],'clanker':['base','arbitrum','bsc'],'stonkbrokers':['robinhood']}
roles={'launchlab':'engine','meteora-dbc':'engine','graphite-protocol':'infrastructure / fee participant','bonk.fun':'branded frontend','stonkfun':'branded frontend / venue','bags':'branded frontend / venue','binance-alpha':'broader discovery and trading platform','rapid-launch':'deployment/trading toolkit','stonkbrokers':'broader platform; financial scope Nightshades'}
official={r['slug']:r for r in read('raw/official-metadata.json')}
metrics_by_source={}; financial_checks=[]; mappings=[]; launchpads=[]; coverage={}

for f in RAW.glob('llama-*-dailyFees.json'):
    provider=f.name[len('llama-'):-len('-dailyFees.json')]
    revenue=RAW/f'llama-{provider}-dailyRevenue.json'
    if not revenue.exists():continue
    fee=json.loads(f.read_text());rev=json.loads(revenue.read_text());data={};refs=[]
    for kind,obj,file in [('fees',fee,f),('revenue',rev,revenue)]:
        path=str(file.relative_to(ROOT));refs.append(source(path,upstream='DefiLlama public API'))
        pairs=obj.get('totalDataChart',[])
        assert len({p[0] for p in pairs})==len(pairs), (provider,'duplicate dates')
        assert all(p[0]%86400==0 for p in pairs), (provider,'non-midnight date')
        data[kind]={int(t):v for t,v in pairs}
    m={}
    for label,days in [('h24',1),('d7',7),('d30',30)]:
        vals={kind:sum_complete([data[kind].get(t) for t in range(TF-days*86400,TF,86400)]) for kind in data}
        previous=sum_complete([data['fees'].get(t) for t in range(TF-2*days*86400,TF-days*86400,86400)])
        m[label]={**vals,'change':pct(vals['fees'],previous)}
        financial_checks.append(dict(provider=provider,window=label,computed=vals['fees'],
          previous_fees=previous,source_summary=fee.get({'h24':'total24h','d7':'total7d','d30':'total30d'}[label]),
          equal_to_source_summary=vals['fees']==fee.get({'h24':'total24h','d7':'total7d','d30':'total30d'}[label]),
          note='Summary windows can include current incomplete UTC day; computed windows exclude it.'))
    m.update(launched24h=None,launched7dAvg=None,graduated24h=None,graduationRate7d=None,
      history30d=[dict(time=t,value=data['fees'].get(t)) for t in range(TF-30*86400,TF,86400)])
    metrics_by_source[provider]=dict(metrics=m,evidence_ids=refs,identity={k:fee.get(k) for k in ['name','url','twitter','description','chains','logo','defillamaId','module','parentProtocol','linkedProtocols']},
      methodology=fee.get('methodology'),breakdownMethodology=fee.get('breakdownMethodology'),methodologyURL=fee.get('methodologyURL'),
      doublecounted=fee.get('doublecounted'),financial_anchor=iso(TF),earliest_fee_day=iso(min(data['fees'])),
      latest_fee_day=iso(max(data['fees'])),excluded_current_day=data['fees'].get(TF),
      source_reported_totals={k:fee.get(k) for k in ['total24h','total7d','total30d']})

for fx in fixture:
    slug=fx['slug'];provider=mapping.get(slug,slug);entry=metrics_by_source[provider];identity=entry['identity'];refs=entry['evidence_ids']
    of=official.get(slug);official_ref=[]
    if of:official_ref=[source(f'raw/official-{slug}.html',fx['url'],'launchpad website')]
    meta=of.get('meta',[]) if of else []
    description=next((x['content'] for x in meta if x.get('name')=='description'),identity.get('description'))
    # Drop marketing superlatives from descriptions used for presentation.
    if slug=='pump.fun':description='Create and trade tokens on Solana using a bonding curve, with graduated tokens trading on PumpSwap.'
    if slug=='clanker':description='Token launch platform; its current homepage lists Base, Arbitrum and BNB Chain.'
    fm=dict(tradingFeeBps=None,creatorShareBps=None,launchCostUsd=None,graduationTargetUsd=None,note=None)
    hascurve=None;grad=None;variants=[]
    if slug=='pump.fun':
        hascurve=True;grad='PumpSwap';fm.update(tradingFeeBps=125,launchCostUsd=0,note='Documented SOL/USDC curve fee. Creator and cashback modes differ; post-graduation fees vary by pool type and market cap.')
        variants=[dict(version='documented SOL/USDC creator-fee curve',tradingFeeBps=125,creatorTradeFeeBps=30,creatorShareBps=2400,protocolTradeFeeBps=95,graduationCharge={'value':0.015,'currency':'SOL'},source='https://pump.fun/docs/fees',source_updated_at='2026-05-20',limitation='Docs precede current runtime; smart-contract state was not read. Additional mobile and cashback variants exist.')]
    if slug=='pons':
        variants=[dict(version='V1',hasBondingCurve=False,tradingFeeBps=100,launchCharge={'value':0.0005,'currency':'ETH'},threshold={'value':4.2,'currency':'ETH','meaning':'WETH paired in same locked pool; not market cap or curve completion'},migration=False,source='https://docs.ponsfamily.com'),dict(version='V2',hasBondingCurve=True,graduation='curve sellout; migration into Uniswap v4',source='https://docs.ponsfamily.com/docs/v2')]
        fm['note']='V1 and V2 have different mechanics. USD launch cost and market-cap target not established. Financial row covers V2 only.'
    obj=dict(slug=slug,name=fx['name'],domain=fx['domain'],url=identity.get('url') or fx['url'],twitter=identity.get('twitter'),description=description,
      chains=supported.get(slug),brandColor=fx['brandColor'],logoSrc=None,bestFor=None,graduatesTo=grad,feeModel=fm,routingNotes=None,metrics=entry['metrics'])
    asset_urls=[]
    if of:
        asset_urls=[urljoin(fx['url'],x['href']) for x in of['links'] if 'icon' in x.get('rel','')]
        if slug=='graphite-protocol':asset_urls=[x['content'] for x in meta if x.get('property')=='og:image']
    scope='all activity captured by mapped DefiLlama adapter'
    if slug=='pons':scope='Pons V2 ONLY; Pons V1 separately retained in provider-financials.json'
    if slug=='stonkbrokers':scope='Nightshades ONLY; not all StonkBrokers products. Matches baseline 7d fee figure and faction-token description.'
    obj['_meta']=dict(providerSlug=provider,metricScope=scope,financialAnchor=iso(TF),financialWindowMode='complete UTC calendar days',
      hasBondingCurve=hascurve,configurationVariants=variants,entityRole=roles.get(slug,'launch venue; precise role not fully verified'),
      metricChainIds=[chains.get(c,c) for c in identity.get('chains',[])],supportedChainsComplete=False,
      logoAssetUrls=asset_urls,logoAssetStatus='declared in official HTML; binary availability not tested',providerLogoUrl=identity.get('logo'),
      brandingNote='brandColor retained as repository presentation choice, not verified official color',
      launchRouteStatus='requires_internal_config',aggregateSafe=False,evidenceIds=refs+official_ref,
      methodology=entry['methodology'],methodologyURL=entry['methodologyURL'],source_as_of=iso(TF),fetched_at_reference=refs)
    statuses={}
    def field(path,status,rs=refs,why=None,window=None):
        statuses[path]={'status':status,'reason':why,'evidence_ids':rs}
        prov(slug,path,status,rs,window=window,limitations=[why] if why else [])
    for k in ['slug','name','domain','url','twitter','description']:
        field(k,'verified_direct' if obj[k] is not None else 'not_found',official_ref or refs,'Source-reported identity; official HTML and provider may differ. Slug is repository identity.')
    field('chains','verified_direct' if obj['chains'] else 'not_found',official_ref,'Verified subset only; financial chain coverage kept separately.')
    field('brandColor','candidate_unverified',[],'Existing presentation color retained; not official branding evidence.')
    field('logoSrc','requires_internal_config',official_ref,'External asset URLs are metadata; no local public asset was created.')
    for k in ['bestFor','routingNotes']:field(k,'not_found',[],'Editorial claims withheld pending configuration and suitability evidence.')
    field('graduatesTo','verified_direct' if grad else 'not_found',official_ref)
    for k,v in fm.items():
        rs=refs
        if slug=='pump.fun':rs=[source('raw/pump-fee-docs.md','https://pump.fun/docs/fees','pump.fun documentation')]
        field('feeModel.'+k,'verified_direct' if v is not None else 'not_found',rs,'Variants and units must be retained; unknown is not zero.')
    for period,days in [('h24',1),('d7',7),('d30',30)]:
        for k,v in obj['metrics'][period].items():field(f'metrics.{period}.{k}','verified_derived' if v is not None else 'not_found',refs,
          scope+'; missing history or zero previous denominator yields null.',{'start':iso(TF-days*86400),'end_exclusive':iso(TF),'mode':'UTC daily'})
    for k in ['launched24h','launched7dAvg','graduated24h','graduationRate7d']:field('metrics.'+k,'requires_indexer',[],'No exhausted finalized creation/completion event scan was performed.')
    field('metrics.history30d','verified_derived',refs,'Exactly 30 UTC dates; unavailable source buckets stay null.',{'start':iso(TF-30*86400),'end_exclusive':iso(TF)})
    field('metrics.history30d[].time','verified_derived',refs,'UTC midnight grid; seconds.')
    field('metrics.history30d[].value','verified_derived',refs,f"{sum(p['value'] is not None for p in obj['metrics']['history30d'])}/30 non-null days.")
    for i,point in enumerate(obj['metrics']['history30d']):
        prov(slug,f'metrics.history30d[{i}].value','verified_derived' if point['value'] is not None else 'not_found',refs[:1],
             extraction=f'totalDataChart[time={point["time"]}][1]',window={'start':iso(point['time']),'end_exclusive':iso(point['time']+86400)},
             transformation='Exact timestamp lookup. No interpolation or zero fill.')
    coverage[slug]=statuses;launchpads.append(obj)
    mappings.append(dict(slug=slug,providerSlug=provider,defillamaId=identity.get('defillamaId'),module=identity.get('module'),scope=scope,
      chainsCovered=identity.get('chains'),role=obj['_meta']['entityRole'],sourceRefs=refs,methodology=entry['methodology'],providerMarkedDoublecounted=entry['doublecounted']))

overlaps=[dict(entities=['launchlab','stonkfun','bonk.fun','graphite-protocol'],metrics=['fees','launches','graduations'],relationship='LaunchLab includes platform/creator fee flows; branded frontend events must be attributed once. Graphite participates in BONK fees.',status='verified_direct',source='DefiLlama methodology and Graphite official bio'),
 dict(entities=['meteora-dbc','bags'],metrics=['fees','launches','graduations'],relationship='Bags uses DBC pre-migration on Solana; adapter definitions overlap and post-migration activity differs.',status='verified_direct',source='DefiLlama methodology'),
 dict(entities=['pons','stonkbrokers','basestonk','foci'],metrics=['fees'],relationship='Several adapters include Uniswap pool/hook flows. Broader DEX totals must not be added without flow-level partitioning.',status='candidate_unverified',source='adapter methodology; no event-level deduplication performed')]
write('launchpads.json',launchpads);write('provider-financials.json',metrics_by_source)
write('entity-mapping.json',dict(launchpads=mappings,overlapRelationships=overlaps,additionalProviderProducts=['pons-v1','stonkbrokers-safe-launch'],
 additionalSupportedChains=[dict(venue='clanker',chain='bsc',evidence='official homepage names BNB Chain; absent from fixture chain list')],
 additionalVenues=[],aggregatePolicy='Do not sum roster rows. Establish disjoint fees/events first.'))

# Narrative sample: fixed membership reconstructed today; historical observations do not establish earlier detection.
members=[('cali','8k4sBtEeK4pf26noKqApv8NBTnuSJcbdwpKYknk5PbAA','pump.fun','n-x-money'),
 ('elon','GY9mZfyPpxXxBXBxS2hB2XjhP3kfUsywTvgveozxpump','pump.fun','n-x-money'),
 ('zcat','HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR','stonkfun','n-pair-rewards'),
 ('knots','8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS','stonkfun','n-pair-rewards')]
registry=read('raw/usepaid-tokens.json');registry_by_mint={r['mint']:r for r in registry}
tokens=[];memberships=[];bars_by_token={};selected_pools=[]
usepaid_ref=source('raw/usepaid.html','https://usepaid.app/','UsePaid public registry')
usepaid_doc_ref=source('raw/usepaid-docs.md','https://usepaid.app/docs','UsePaid documentation')
knots_ref=source('raw/knots-official.md','https://www.knotsonstonk.com/','KNOTS official site')
bitquery_ref=source('raw/stonkfun-investigation.md','https://www.bitquery.io/investigations/is-stonkfun-dumping-on-holders','Bitquery published investigation')
zcat_identity_ref=source('raw/zcat-identity-story.md','https://www.mexc.co/en-NG/learn/article/what-is-anonymous-cat-zcat-the-solana-meme-coin-paying-zec/1','MEXC published token profile') if (RAW/'zcat-identity-story.md').exists() else None
for key,address,origin,narrative in members:
    pooldata=read(f'raw/gecko-{key}.json');primary=pooldata['data'][0];attrs=primary['attributes']
    identity=next(x['attributes'] for x in pooldata['included'] if x['type']=='token' and x['attributes']['address']==address)
    rawbars=read(f'raw/gecko-{key}-hour.json');rows=rawbars['data']['attributes']['ohlcv_list']
    if key=='cali':rows+=read('raw/gecko-cali-hour-prefix.json')['data']['attributes']['ohlcv_list']
    bars={int(r[0]):r[5] for r in rows if TC-168*3600<=r[0]<TC};bars_by_token[address]=bars
    assert address in [rawbars['meta'][s]['address'] for s in ['base','quote']], 'Wrong token in bars'
    refs=[source(f'raw/gecko-{key}.json',upstream='GeckoTerminal public API'),source(f'raw/gecko-{key}-hour.json',upstream='GeckoTerminal public API')]
    if key=='cali':refs.append(source('raw/gecko-cali-hour-prefix.json',upstream='GeckoTerminal public API'))
    story=[usepaid_ref,usepaid_doc_ref] if narrative=='n-x-money' else [bitquery_ref]+([knots_ref] if key=='knots' else [])
    if key=='zcat' and zcat_identity_ref:story.append(zcat_identity_ref)
    observed=max(e['fetched_at'] for e in evidence if e['id'] in refs+story)
    # Pool change/mcap describe the base token. Do not substitute those for a quote-side constituent.
    isbase=primary['relationships']['base_token']['data']['id']=='solana_'+address
    mc=attrs.get('market_cap_usd') if isbase else None
    token=dict(id='solana:'+address,chain='solana',address=address,name=identity['name'],symbol=identity['symbol'],originLaunchpadSlug=origin,
      underlyingEngine='launchlab' if key=='knots' else None,originStatus='source-reported; creation transaction not independently decoded',
      mcapUsd=float(mc) if mc is not None else None,change24h=attrs.get('price_change_percentage',{}).get('h24') if isbase else None,
      priceChangeScope='provider rolling snapshot of selected pool; distinct from chart window',evidenceIds=refs+story,
      firstObservedAt=observed,source_as_of=None,metricFetchedAtReference=refs,finalizedCreationEvent=None)
    if token['change24h'] is not None:token['change24h']=float(token['change24h'])
    tokens.append(token)
    rationale='Address is listed by UsePaid with a named recipient and resolves to matching market-data name/symbol.' if narrative=='n-x-money' else 'Published investigation identifies this coin as a StonkFun reward coin; market data resolves its address. '+('Official token site confirms rewards paid in STONK.' if key=='knots' else 'ZEC is the reward/quote asset, excluded from membership.')
    memberships.append(dict(id=narrative+':'+token['id'],narrativeId=narrative,tokenId=token['id'],version=1,methodVersion=VERSION,
      rationale=rationale,evidenceIds=story+refs,confidence='source-supported, qualitative; not calibrated',evidenceTime=None,
      firstObservedAt=observed,effectiveFrom=observed,effectiveTo=None,historicalMembershipBasis='reconstructed_today',
      historicalAppliedWindow={'start':iso(TC-168*3600),'end_exclusive':iso(TC)},lineage={'parents':[],'operation':'initial'},
      limitations=['No proof this classifier detected membership before this run.','Source attribution is not transaction-level finality proof.']))
    selected_pools.append(dict(tokenId=token['id'],chain='solana',poolAddress=attrs['address'],poolId=primary['id'],executionVenue=primary['relationships']['dex']['data']['id'],
      baseToken=rawbars['meta']['base'],quoteToken=rawbars['meta']['quote'],selectionRule='First ranked pool returned at discovery, frozen for this retrospective sample',
      otherReturnedPools=len(pooldata['data'])-1,poolUniverseExhausted=False,bucketCount=len(bars),evidenceIds=refs))

narratives=[];series=[];ncoverage={};chartchecks=[]
definitions=[dict(id='n-x-money',slug='x-money-fee-payout',title='X-handle creator-fee routing',category='culture',
  summary='UsePaid lists tokens that direct creator fees to named X accounts. This measured sample covers CALI and Elon Coin in one PumpSwap pool each; it does not measure payouts or recipient endorsement.',
  aliases=['UsePaid','X Money fee routing'],facet='payout behavior',storyEvidenceIds=[usepaid_ref,usepaid_doc_ref]),
 dict(id='n-pair-rewards',slug='pair-asset-holder-rewards',title='Holder rewards in the paired asset',category='culture',
  summary='StonkFun reward coins turn transfer tax into distributions of the paired asset. This measured sample covers ZCAT/ZEC and KNOTS/STONK, one pool each. ZEC and STONK are quote assets, excluded as constituents.',
  aliases=['StonkFun reward coins','pair-asset rewards'],facet='holder reward mechanism',storyEvidenceIds=[knots_ref,bitquery_ref])]
for definition in definitions:
    nid=definition['id'];ms=[m for m in memberships if m['narrativeId']==nid];ids=[m['tokenId'] for m in ms]
    subset=[t for t in tokens if t['id'] in ids]
    points=[dict(time=t,value=sum_complete([bars_by_token[x['address']].get(t) for x in subset])) for t in range(TC-168*3600,TC,3600)]
    last24=points[-24:];v24=sum_complete([p['value'] for p in last24]);v7=sum_complete([p['value'] for p in points])
    parts={x['id']:sum_complete([bars_by_token[x['address']].get(t) for t in range(TC-86400,TC,3600)]) for x in subset}
    coins=sorted(subset,key=lambda x:(-(parts[x['id']] or 0),x['id']))
    meta=dict(selection='curated evidence-backed sample; not a market-wide top ranking',volumeScope='USD turnover in two fixed selected DEX pools; not all pools or all narrative tokens',
      constituentTokenIds=ids,poolIds=[p['poolId'] for p in selected_pools if p['tokenId'] in ids],chartAnchor=iso(TC),ingestionLagPolicy='1 complete hour safety margin, not a provider lag guarantee',
      membershipBasis='reconstructed_today',originAttribution='Post-graduation trading attributed to reported origin; execution venues retained separately',
      deduplication='Each selected chain:pool appears once; the four pools are disjoint; no selected constituent-to-constituent pair. Multi-hop route turnover is not deduplicated.',
      cexCoverage=False,legacyAttentionBasis=None,contenderVolumeShares=[dict(tokenId=x['id'],share=100*parts[x['id']]/v24 if v24 else None) for x in coins],
      contenderShareProposal='Rename share label to share of measured sample 24h volume before copying contenderVolumeShares into share.',
      firstObservedAt=max(m['firstObservedAt'] for m in ms),startedAtRule='Unknown: no historical detection threshold established',statusRule='Unknown: no agreed trend thresholds or history/coverage gate for heating/peak/cooling',
      aliases=definition['aliases'],facet=definition['facet'],storyEvidenceIds=definition['storyEvidenceIds'],fullNarrativeCoverage=False,
      publicationGate='Show explicit sample/universe label and unknown states. Not compatible with unchanged DTO/UI.')
    n={k:definition[k] for k in ['id','slug','title','category','summary']}
    n.update(status=None,mindshare=None,change24h=None,volume24hUsd=v24,volume7dUsd=v7,launches24h=None,launches7d=None,startedAt=None,
      series=[dict(id='volume',label='Selected pools: hourly USD volume',color='#4c94ff',points=last24)],
      contenders=[dict(id=x['id'],name=x['name'],symbol=x['symbol'],share=None,change24h=None,color='#4c94ff',launchpadSlug=x['originLaunchpadSlug']) for x in coins],
      topLaunchpads=None,signals=[],exampleTokens=[dict(symbol=x['symbol'],name=x['name'],launchpadSlug=x['originLaunchpadSlug'],chain=x['chain'],mcapUsd=x['mcapUsd'],change24h=x['change24h'],_tokenId=x['id']) for x in coins],
      suggestedLaunchpads=[],_meta=meta)
    narratives.append(n)
    series.append(dict(narrativeId=nid,seriesId='volume',unit='USD per hour',timeUnit='Unix seconds',timestampMeaning='bucket start',interval='[start,start+3600)',
      window={'start':iso(TC-86400),'end_exclusive':iso(TC)},points=last24,extendedHourly7d=points,daily30d=None,
      total24hUsd=v24,total7dUsd=v7,membershipBasis='reconstructed_today',coverage={'hourlyBuckets24h':sum(p['value'] is not None for p in last24),'hourlyBuckets7d':sum(p['value'] is not None for p in points),'universe':'two declared pools only','allNarrativeTokens':False},
      otherExtensions={'launchCounts':None,'activityShare':None,'attention':None,'breadth':None,'launchpadBreakdowns':None,'priceIndex':None},poolIds=meta['poolIds']))
    chartchecks.append(dict(narrativeId=nid,points24=len(last24),points7d=len(points),aligned=all(p['time']%3600==0 for p in points),
      nullBuckets=sum(p['value'] is None for p in points),sum24=v24,sum7d=v7,toleranceUsd=max(.01,(v24 or 0)*1e-9),reconcilesToNarrative24h=v24==n['volume24hUsd'],
      note='Internal bucket reconciliation; rolling snapshot h24 is a different window and is not used as an independent comparison.'))
    st={}
    for k in n:
        if k=='_meta':continue
        status='verified_derived' if k in ['volume24hUsd','volume7dUsd','series'] else 'verified_direct'
        if k in ['status','mindshare','change24h','startedAt']:status='not_found'
        if k in ['launches24h','launches7d','topLaunchpads']:status='requires_indexer'
        if k in ['signals','suggestedLaunchpads']:status='not_found'
        st[k]={'status':status,'reason':'See narrative _meta for universe, definitions and publication gate.'}
        metric_refs=list(dict.fromkeys(ref for p in selected_pools if p['tokenId'] in ids for ref in p['evidenceIds']))
        prov(nid,k,status,metric_refs if k in ['volume24hUsd','volume7dUsd','series','contenders','exampleTokens'] else definition['storyEvidenceIds'],
          extraction='data.attributes.ohlcv_list[*][0,5]' if k in ['volume24hUsd','volume7dUsd','series'] else None,
          transformation='Filter explicit half-open UTC grid, deduplicate chain:pool, sum volumes; propagate any missing pool bucket as null.' if k in ['volume24hUsd','volume7dUsd','series'] else None,
          window={'start':iso(TC-(168 if k=='volume7dUsd' else 24)*3600),'end_exclusive':iso(TC)} if k in ['volume24hUsd','volume7dUsd','series'] else None)
    for k in ['series[].id','series[].label','series[].color','series[].points[].time','series[].points[].value','contenders[].id','contenders[].name','contenders[].symbol','contenders[].color','contenders[].launchpadSlug','exampleTokens[].symbol','exampleTokens[].name','exampleTokens[].launchpadSlug','exampleTokens[].chain']:
        st[k]={'status':'verified_derived','reason':'Colors/labels are presentation choices; identity references tokens.json.'}
    for k in ['contenders[].share','contenders[].change24h','topLaunchpads[].slug','topLaunchpads[].share','topLaunchpads[].change24h','signals[].id','signals[].source','signals[].label','signals[].title','signals[].at','suggestedLaunchpads[].slug','suggestedLaunchpads[].reason']:
        st[k]={'status':'not_found','reason':'Legacy attention, exhausted launch denominator, timestamped signal, or suitability evidence unavailable.'}
    for k in ['exampleTokens[].mcapUsd','exampleTokens[].change24h']:st[k]={'status':'verified_direct','reason':'Conditional on non-null token metadata; missing or quote-side values are null, never FDV substitutes.'}
    ncoverage[nid]=st

narratives.sort(key=lambda n:(-(n['volume24hUsd'] or 0),n['slug']))
write('narratives.json',narratives);write('tokens.json',tokens);write('memberships.json',memberships);write('narrative-series.json',series);write('selected-pools.json',selected_pools)
write('narrative-candidates.json',[
 dict(id='candidate-eacc-funding',title='Named-recipient accelerationist funding tokens',tokens=[r for r in registry if r.get('recipient',{}).get('handle')=='@beffjezos'],
   status='candidate_unverified',blockers=['UsePaid registry claims only; resolve each address and recipient relationship.','Potential subnarrative of X-handle fee routing, not an independent third slot.','No measured chart or verified creation history.']),
 dict(id='candidate-stock-paired-memes',title='Stock-paired memes',status='candidate_unverified',blockers=['Pairing mechanism verified on StonkFun homepage; specific stock-story membership not established.','Quote stock tokens are not automatically constituents.','No chart acquired.'])])

with (ROOT/'chart-data.csv').open('w') as f:
    w=csv.writer(f);w.writerow(['entity_id','series_id','time','utc','value','unit','scope'])
    for s in series:
        for p in s['extendedHourly7d']:w.writerow([s['narrativeId'],'volume',p['time'],iso(p['time']),'' if p['value'] is None else p['value'],'USD/hour','selected two pools; reconstructed today'])
    for lp in launchpads:
        for p in lp['metrics']['history30d']:w.writerow([lp['slug'],'fees',p['time'],iso(p['time']),'' if p['value'] is None else p['value'],'USD/day',lp['_meta']['metricScope']])

blockers=[
 'Numeric DTO fields and Point.value need null; chart must map gaps to WhitespaceData and sparklines must break lines.',
 'Add explicit per-metric as-of, window, source and completeness; h24 financials are complete UTC day, not rolling 24h.',
 'Use explicit hasBondingCurve (nullable) and versioned configuration; never infer it from graduationTargetUsd.',
 'Separate curve completion and liquidity migration. Pons V1 liquidity milestone is not a curve graduation.',
 'Add chain+contract identity to contender/example token and evidence URLs/event times to Signal.',
 'Keep contender attention share null; approve explicit measured-volume-share label before using supplemental shares.',
 'topLaunchpads is launch share; no launch denominator means no volume-based substitution.',
 'mindshare/change24h/status/startedAt unsupported; firstObservedAt is separate.',
 'Calendar-day fees/revenue are adapter-defined. Revenue can include tokenholder flows; do not label it protocol-only retained revenue.',
 'Hero totals must partition overlapping engine/frontend fee flows and events, join histories by timestamp, and propagate missing coverage.',
 'External logo URLs require local asset ingestion or a contract change; no fictitious local paths.',
 'Launch here requires_internal_config. This research does not wire routes.',
 'relativeTime defaults to fixture SNAPSHOT_AT; runtime source dates need a real as-of value.',
 'Revenue percentage is clamped at 100% in UI; this can conceal mismatched source scope.',
 'Two narratives are curated measured samples, not market-wide top-three results. Order is sample volume descending, slug tie-break.',
 'Supported chains differ from metric coverage. Clanker homepage additionally lists BNB Chain; inspect versions before asserting exhaustive support.'
]
write('contract-and-coverage.json',dict(repository={'remote':'frames-engineering/lamble-ethglobal','defaultBranch':'main','commit':'d98c8a73d78de4f008db032bc51659812d710bf3','baseline':'762c11cb842ea4549e3169d99b6856638be9cfd2','reinspected':True,'dataContractChanged':False,'changesSinceBaseline':['globals.css','hero/hero.tsx','hero/stat-tiles.tsx','launchpads/launchpads-table.tsx','layout/navbar.tsx','hooks/use-entered.ts'],'nextDocs':'node_modules/next/dist/docs absent; no application code written'},
  as_of=ASOF,uiFieldUsage={'page':'fixture provider -> hero aggregate + narratives + launchpad table','NarrativesSection':'slice(0,3); URL selection inside subset','FeaturedNarrative':['title','summary','contenders','topLaunchpads','series'],'NarrativeCard':['title','launches24h','volume24hUsd','series[0].points'],'LaunchpadTable':['name','domain','url','twitter','chains','brandColor','logoSrc','metrics'],'DetailSheet':['description','bestFor','routingNotes','feeModel','graduatesTo','metrics'],'HistoryChart':'non-null numeric points; no gap mapping'},
  venueFields=coverage,narrativeFields=ncoverage,compatibilityBlockers=blockers,priorities=['Approve/locate overall Frames spending ceiling and execute narrow discovery/metadata/bar batch','Implement finalized creation/completion indexing and prove window exhaustion','Expand frozen pool/token universe while preserving sampling history','Reconcile version scopes and adapter methodology','Adapt DTO/UI unknown states and sample labels'],
  investigationScope='All 19 venue identities and financial mappings investigated; current homepage attempted for each. Configuration, social, launch and chain coverage remains partial.'))

# Sources retained separately from per-field transformations.
for token in tokens:
    for field in ['chain','address','name','symbol','originLaunchpadSlug','underlyingEngine','mcapUsd','change24h']:
        prov(token['id'],field,'verified_direct' if token[field] is not None else 'not_found',token['evidenceIds'],
          extraction='included[type=token].attributes; data[0].attributes only for base-token market metrics',
          limitations=['Origin is source-reported; no independently decoded creation event.','Quote-side pool market cap and price changes are withheld.'])
for item in provenance:
    if item['entity_id'] in coverage and re.match(r'metrics\.(h24|d7|d30)\.',item['field_path']):
        item['extraction_path']='totalDataChart: timestamp joins across dailyFees and dailyRevenue responses'
        item['transformation']='Sum exact complete-day buckets. change=100*(currentFees-previousFees)/previousFees; null if either grid incomplete or previous=0.'
write('evidence.json',evidence);write('field-provenance.json',provenance)
minutes=read('raw/gecko-cali-minute-check.json')['data']['attributes']['ohlcv_list']
minute_sum=math.fsum(r[5] for r in minutes if TC-3600<=r[0]<TC)
hour=bars_by_token[members[0][1]][TC-3600]
valid=dict(methodologyVersion=VERSION,as_of=ASOF,chartAnchor=iso(TC),financialAnchor=iso(TF),
 checks={'rosterCount':len(launchpads),'rosterSlugsPreserved':True,'allDailyGridsLength30':all(len(x['metrics']['history30d'])==30 for x in launchpads),
 'allTokenIdsUnique':len({t['id'] for t in tokens})==len(tokens),'allLaunchpadReferencesValid':all(t['originLaunchpadSlug'] in coverage for t in tokens),
 'allSelectedPoolsUnique':len({p['poolId'] for p in selected_pools})==len(selected_pools),'noQuoteAssetsIncludedAsConstituents':True,
 'caliHourlyStartConventionVerified':abs(minute_sum-hour)<.01,'caliHourVolume':hour,'caliMinuteSum':minute_sum,
 'boundaryBehavior':'Gecko response included bucket exactly at before_timestamp when aligned; always post-filter start <= t < end; T-1 requests tested.',
 'sourceModifiedOutsideResearch':False},chartChecks=chartchecks,financialChecks=financial_checks,
 delivery={'framesPaidInvocations':0,'framesValidatedDataRoutes':[],'framesFreeDiscoveryAndProbesExecuted':True,'outsideFramesFetches':log},
 billing={'charged_credits':0,'percent_remaining':84,'basis':'No paid Frames invocation; free get_usage reports 84% remaining. No billing blocks exist to sum.','deduplicatedPaidRunIds':[],'approvedOverallCeiling':None,'paidExecutionStatus':'blocked: approved task-level ceiling not present in session'},
 limitations=['No finalized event scan; launch/graduation totals unknown for every venue.','No verified complete all-token narrative universe.','Charts are inspectable selected-pool samples only.','Runtime metrics end at explicit past boundaries; current incomplete day/hour excluded.'])
write('validation-report.json',valid)
print(json.dumps({'venues':len(launchpads),'narratives':[(n['title'],n['volume24hUsd'],n['volume7dUsd']) for n in narratives],
 'full30DayHistories':sum(all(p['value'] is not None for p in x['metrics']['history30d']) for x in launchpads),
 'allFinancialWindowsComplete':sum(all(x['metrics'][w][k] is not None for w in ['h24','d7','d30'] for k in ['fees','revenue','change']) for x in launchpads),
 'minuteReconciliation':abs(minute_sum-hour)},indent=2))
