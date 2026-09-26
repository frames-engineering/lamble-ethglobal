"""Offline metadata overlay. Financial observations and narrative charts are unchanged."""
import json,pathlib,datetime
root=pathlib.Path(__file__).parent
base=json.loads((root.parent/'20260926T172434Z/launchpads.json').read_text())
def captured(file):
 return datetime.datetime.fromtimestamp((root/file).stat().st_mtime,datetime.timezone.utc).isoformat()
now=max(captured(f'raw/enrich{n}.json') for n in range(1,7))
raw={n:json.loads((root/f'raw/enrich{n}.json').read_text()) for n in range(1,7)}
def source(n,seq,path='body.data.markdown'):
 req=json.loads((root/f'raw/enrich{n}-request.json').read_text())
 return dict(url=req['calls'][seq]['args']['url'],run_id=raw[n]['run_id'],seq=seq,extraction=path,tool='mpp.firecrawl.post.v1-scrape',upstream='Firecrawl / official public page',fetched_at=captured(f'raw/enrich{n}.json'),timestampMeaning='response saved at; source event time unknown',source_as_of=None)
def provider(slug):
 ids={'bonk.fun':'bonk.fun-launchpad'}; pid=ids.get(slug,slug)
 return dict(url='https://api.llama.fi/summary/fees/'+pid,raw='../20260926T170103Z/raw/llama-'+pid+'-dailyFees.json',extraction='description and chains, corroborated with official ecosystem page where available',tool='DefiLlama summary; prior Frames fee-summary corroboration',fetched_at='2026-09-26T17:24:34Z',source_as_of=None)
# These are explicitly verified support/deployment sets, never copied wholesale from financial coverage.
spec={
 'pump.fun':(['solana'],None), 'stonkfun':(['solana'],source(2,6)), 'pons':(['robinhood'],source(2,8)),
 'flap-sh':(['bsc','robinhood','base','xlayer','monad'],dict(url='https://docs.flap.sh/flap/developers/deployed-contract-addresses.md',raw='raw/flap-addresses.md',extraction='Mainnet chain headings and Portal deployments',transport='public HTTPS outside Frames',fetched_at=captured('raw/flap-addresses.md'),source_as_of=None)),
 'launchlab':(['solana'],source(5,3)), 'bonk.fun':(['solana'],provider('bonk.fun')),
 'graphite-protocol':(['solana'],provider('graphite-protocol')), 'genius.fun':(['bsc'],source(1,4,'body.data.markdown network icons; corroborated by DefiLlama description')),
 'argus-world':(['arc'],provider('argus-world')), 'meteora-dbc':(['solana'],source(3,0)),
 'binance-alpha':(['bsc','solana','base','ethereum'],source(3,5)), 'o1-launchpad':(['base','robinhood'],source(1,8)),
 'clanker':(['base','arbitrum','bsc'],source(2,0)), 'stonkbrokers':(['robinhood'],source(2,7)),
 'bags':(['solana'],source(4,2)), 'rapid-launch':(['solana','robinhood','bsc','ethereum','arc','base','monad'],source(2,2)),
 'basestonk':(['base','robinhood'],source(2,3,'body.data.metadata.description')), 'four.meme':(['bsc'],source(4,1)), 'foci':(['arc'],source(2,5,'body.data.metadata.description')),
}
updates={
 'flap-sh':dict(hasBondingCurve=True,feeNote='Curve parameters depend on chain and quote asset. Tax-token rates of 1%, 3%, 5% or 10% are separate from curve swap fees. Robinhood launches currently migrate to a native Uniswap V2 fork.',references=[source(4,0),source(6,1),source(6,2)]),
 'launchlab':dict(hasBondingCurve=True,graduatesTo='Raydium CPMM',feeNote='Platform and creator settings vary by launch. New launches migrate to CPMM; creator fees and platform Fee Key rights are separate.',references=[source(6,0)]),
 'genius.fun':dict(hasBondingCurve=True,graduatesTo='PancakeSwap Infinity',references=[provider('genius.fun')]),
 'argus-world':dict(hasBondingCurve=False,feeNote='Tokens begin in locked Uniswap v4 liquidity. Buy/sell taxes and treasury allocations depend on the portal version and launch configuration; no separate curve-completion migration.',references=[provider('argus-world')]),
 'meteora-dbc':dict(hasBondingCurve=True,graduatesTo='Meteora DAMM v2 (legacy v1)',feeNote='Per-config curve, quote reserve migration threshold, fee schedule and creator allocations. The quote reserve threshold is not a fixed USD market cap.',references=[source(5,0)]),
 'binance-alpha':dict(hasBondingCurve=False,feeNote='Curated token discovery and trading platform. Token-creation fees and curve graduation are not platform-wide launch settings.',references=[source(3,5)]),
 'rapid-launch':dict(feeNote='Deployment toolkit spanning multiple launchpads. Fees and graduation mechanics belong to the selected underlying launchpad.',references=[source(2,2)]),
 'basestonk':dict(hasBondingCurve=False,feeNote='Tokens open directly in Uniswap v4 pools. Hook and creator fee settings vary by launch.',references=[source(2,3,'body.data.metadata.description')]),
 'stonkbrokers':dict(hasBondingCurve=True,feeNote='The financial row covers Nightshades, launched through the Stonklauncher anti-snipe curve. Other platform projects have different launch settings.',references=[source(2,7)]),
}
logos={r['slug']:r for r in json.loads((root/'logo-assets.json').read_text()) if r['status']=='verified_direct'}
rows=[]
for b in base:
 slug=b['slug']; chains,ref=spec[slug]
 r=dict(slug=slug,chains=chains,additionalSupportedChains=['stable','ink'] if slug=='rapid-launch' else [],chainCoverage='verified subset; not an exhaustive live network availability guarantee',chainStatus='verified_direct',chainEvidence=ref or dict(raw='../20260926T172434Z/launchpads.json',extraction=slug+'._meta',note='Retained previously verified support'),fields=updates.get(slug,{}))
 if slug in logos: r['logo']=logos[slug]
 if slug in ['bonk.fun','graphite-protocol','argus-world']: r['chainCoverage']='Provider-declared deployment support; official current chain confirmation remains incomplete'
 if slug=='binance-alpha': r['chainCoverage']='Official 2025-04-25 supported listing chains; verified subset, not all current trading/transfer networks'; r['chainEvidence']['source_as_of']='2025-04-25'
 if slug=='rapid-launch': r['chainCoverage']='Nine chains advertised on homepage; seven fit current ChainId, Stable and Ink retained separately'
 rows.append(r)
(root/'launchpad-enrichment.json').write_text(json.dumps(dict(methodologyVersion='lamble-enrichment-v1',fetchedAt=now,records=rows),indent=2)+'\n')
bills=[dict(run_id=r['run_id'],**r['billing']) for r in raw.values()]
(root/'validation-report.json').write_text(json.dumps(dict(venues=len(rows),chainRowsBefore=sum(bool(r['chains']) for r in base),chainRowsAfter=len(rows),localLogos=len(logos),billing=bills,charged_credits=sum(r['charged_credits'] for r in bills),percent_remaining=bills[-1]['percent_remaining'],limitations=['Chain sets may be partial; financial coverage remains separate','Launch and completion counts remain unknown','Numeric fee configurations are not inferred from tax rates','Stable and Ink are supplemental, outside existing ChainId']),indent=2)+'\n')
print('Enriched',len(rows),'venues;',len(logos),'local logos;',sum(r['charged_credits'] for r in bills),'credits')
