#!/usr/bin/env python3
"""Build the manifest and report from saved artifacts, without network access."""
import datetime as dt, hashlib, json, pathlib
P=pathlib.Path(__file__).resolve().parent
def read(n):return json.loads((P/n).read_text())
def write(n,x):(P/n).write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
lp=read('launchpads.json'); ns=read('narratives.json');validation=read('validation-report.json');mapping=read('entity-mapping.json')
requests=[]
for f in (P/'raw').glob('*fetch-log*.json'):
    for r in json.loads(f.read_text()):
        requests.append(dict(id='public-'+hashlib.sha256(r['url'].encode()).hexdigest()[:12],route='outside_frames',
          request={'method':'GET','url':r['url']},executed=True,outcome=r['status'],responseRef=r.get('path'),fetchedAt=r.get('fetched_at'),error=r.get('error'),
          cost={'framesChargedCredits':0,'reason':'Public GET; not a Frames invocation'},retryPolicy='No automatic retries; cache saved response; inspect failures before retrying.'))
queries=[]
for pool in read('selected-pools.json'):
    queries.append('p'+str(len(queries))+': getBars(symbol: '+json.dumps(pool['poolAddress']+':1399811149')+', from: 1790352000, to: 1790438400, resolution: "60", currencyCode: "USD", removeEmptyBars: false) { t volume }')
frames=dict(id='frames-compact-seed-v1',route='frames_invoke_tools',executed=False,status='blocked',
 blocker='No numeric approved overall spending ceiling was supplied in this session; get_usage gives only the plan maximum.',
 request={'calls':[{'id':'mpp.codex.post.graphql','args':{'query':'{ '+ ' '.join(queries)+' }'}},
  {'id':'bazaar.defillama-use-x402atlas-com-fee-summary','args':{'protocol':'pump.fun','dataType':'dailyFees','excludeTotalDataChart':'false','excludeTotalDataChartBreakdown':'true'}},
  {'id':'agentic.emc2ai-io..x402-bitquery-pumpfun-launches-raw','args':{'limit':'20','timeperiod':'24h'}},
  {'id':'bazaar.x402-ottoai-services-twitter-summary','args':{}}],
  'search_ids':['srch_0292469d-885f-450d-b251-260690bfa135','srch_1176fd9b-8396-4f26-8dc8-37abc8fc6eeb','srch_c0fbbc8b-b600-440d-8f0a-13873f9344c3','srch_0edaa3e7-a7c2-4248-ad38-2cb69e7f946a'],
  'idempotency_key':'lamble-20260926T170103Z-compact-seed-v1','max_usd':0.02,
  'objective':'Read-only: validate four identified pool hourly volumes, one launchpad fee history, bounded new-token sample, and story candidates'},
  authorization='Proposed cap is not approval. Execute only after explicit overall ceiling is known; use a fresh key on a future run.',
  poll='Call frames_get_run(run_id) until terminal. Retrieve every body_ref with frames_get_tool_results(run_id,seq).',
  extraction='Inspect actual bodies. getBars response paths p0..p3.t/volume; join arrays by index then filter UTC timestamps. Provider body envelope is not yet validated.',
  limitations=['Pool bars measure declared pool universe, not total token market volume.','20 latest launches cannot establish a complete launch count.','Twitter summary is a discovery proposal, not primary evidence or mention counts.','GraphQL documented fields and schema wrapper inspected; this exact query has not been executed through Frames.'],
  providerQuotes=[{'id':'mpp.codex.post.graphql','price_hint_usd':.001},{'id':'bazaar.defillama-use-x402atlas-com-fee-summary','probe_quote_usd':.005},{'id':'agentic.emc2ai-io..x402-bitquery-pumpfun-launches-raw','probe_quote_usd':.000385},{'id':'bazaar.x402-ottoai-services-twitter-summary','probe_quote_usd':.001}],
  actualBilling=None)
write('acquisition-recipes.json',dict(version='1.0.0',recipes=requests+[frames],
 financialNormalization={'input':'DefiLlama summary dailyFees and dailyRevenue per mapped providerSlug','path':'totalDataChart: [UTC-midnight unix seconds, USD value]',
  'anchor':'2026-09-26T00:00:00Z','windowsDays':[1,7,30],'previousWindowsDays':[1,7,30],
  'change':'100*(currentFees-previousFees)/previousFees; null for missing/zero denominator','history':'30 exact dates; null for missing values','summaryTotals':'Saved only for comparison; do not substitute when daily grid incomplete.'},
 narrativeNormalization={'input':'GeckoTerminal selected pool OHLCV','path':'data.attributes.ohlcv_list[*][0,5]',
  'identityCheck':'Contract must match meta.base.address or meta.quote.address and discovery metadata. Never infer from row rank or price.',
  'grid':'24 or 168 UTC bucket starts ascending; [T-W,T), T=2026-09-26T16:00:00Z','sum':'Each chain:pool once; missing pool interval makes aggregate null.',
  'boundary':'Observed inclusive aligned before_timestamp; request T-1 and still post-filter. Minute sum verified CALI hour starts.',
  'pagination':'Initial token pools: one page only. Histories: one 168-bucket request each, plus CALI two-bucket prefix repair after inclusive-boundary discovery.',
  'population':'Two selected tokens per narrative. Pool universe not exhausted; CEX excluded; current membership reconstructed retrospectively.'},
 creationRecipe={'status':'unexecuted_requires_indexer','source':'https://docs.ponsfamily.com','scope':'Pons V1 TokenLaunched event; V1 has no bonding curve so its liquidity milestone is not counted as graduation',
  'instructions':'Use documented factory address and event ABI; anchor blocks by timestamps; scan all logs with pagination to finalized end block. Deduplicate chain+transaction+log index. V2 requires its own event definitions. Do not count discovered pairs.',
  'completeness':'Not established; no chain logs requested.'},
 documentation={'codexGetBars':'https://docs.codex.io/api-reference/queries/getbars','codexGetTokenBars':'raw/codex-gettokenbars.md','warning':'getTokenBars historical aggregate volume coverage has caveats in documentation; not interchangeable with selected-pool bars.'}))

manifest=dict(runId=P.name,version='1.0.0',runtimeStartedAt='2026-09-26T17:01:03Z',packagedAt=dt.datetime.now(dt.timezone.utc).isoformat(),
 repositoryCommit='d98c8a73d78de4f008db032bc51659812d710bf3',status='partial_research_completed; paid Frames execution blocked',
 recurringTaskCreated=False,providerMappings='entity-mapping.json',lastSuccessByRecipe={r['id']:r['fetchedAt'] for r in requests if r['outcome']=='success'},
 watermarks={'financialExclusiveEnd':'2026-09-26T00:00:00Z','narrativeExclusiveEnd':'2026-09-26T16:00:00Z','creationFinalizedBlock':None,'socialCursor':None},
 checkpoints={'usepaidRegistry':'100 unique mints from one public homepage response; not paginated/exhausted','geckoTokenPools':'one page per token; top-ranked pool frozen, rest excluded','financials':'full returned chart saved; latest incomplete UTC date excluded; no assumed zero before first observation'},
 cadence=[{'task':'Token/story discovery','proposed':'every 30 minutes','boundedRequests':'one registry page plus at most two new-launch pages after source validation','cache':'retain metadata by chain:address; reclassify only new evidence'},
  {'task':'Public social evidence','proposed':'every 30–60 minutes','boundedRequests':'at most two focused query pages per narrative, three narratives maximum; paid authorization required','cache':'post ID + edit version; save source publish times; no total-mention inference'},
  {'task':'Hourly market aggregation','proposed':'hourly after 1-hour safety lag; tune from measured provider ingestion','boundedRequests':'four selected-pool OHLCV requests, each 3 complete hours; one metadata page per token daily','overlap':'2 previously processed hours','cache':'chain:pool:interval:start; reconcile late corrections, retain revisions'},
  {'task':'Financials','proposed':'daily after source reports prior UTC day','boundedRequests':'38 GETs for 19 mapped adapters × fees/revenue; optional 4 GETs for Pons V1 and Safe Launch, in a separate bounded batch','overlap':'7 complete days; periodic 60-day reconciliation','cache':'source has no tested incremental date filter; fetch full chart then merge overlapping dates'},
  {'task':'Configuration/branding','proposed':'weekly or on published upgrade','boundedRequests':'at most 19 official pages plus changed documentation only','cache':'content hash / published version; invalidate affected metric comparisons'}],
 costPolicy={'actualFramesChargedCredits':0,'percentRemaining':84,'paidRunIds':[],'approvedOverallCeiling':None,
  'planMaxUsdPerRun':10,'warning':'Balance and plan maximum do not authorize a research batch. Provider USD quotes are not billed credits.',
  'refreshAssumptions':'Public API rate/availability can change. No unsupported dollar forecast. Re-probe paid routes when stale and sum actual billing.charged_credits by unique run ID.'},
 replay={'normalize':'python3 build_dataset.py','package':'python3 package_research.py','verify':'python3 validate.py','chart':'uv run --with matplotlib plot_preview.py',
  'publicCollector':'python3 collect_public.py REQUEST_FILE (dry run); --live is required to send bounded public GET requests'},
 fallbackPolicy='Mark route and semantic scope on every change. Keep stale/failed observation timestamps; never turn errors into zeros.',
 versioning='Keep narrative IDs and memberships immutable per version; append future merge/split lineage. This run has initial versions only.')
write('refresh-manifest.json',manifest)

def money(v):return '—' if v is None else f'${v:,.2f}'
rows=[]
for r in lp:
    m=r['metrics'];gaps=[]
    for w in ['h24','d7','d30']:
        absent=[k for k,v in m[w].items() if v is None]
        if absent:gaps.append(w+': '+', '.join(absent))
    if r['slug']=='pons':gaps.append('V2 only')
    if r['slug']=='stonkbrokers':gaps.append('Nightshades only')
    rows.append('| '+ ' | '.join([r['slug'],money(m['h24']['fees']),money(m['d7']['fees']),money(m['d30']['fees']),str(sum(p['value'] is not None for p in m['history30d']))+'/30','; '.join(gaps) or 'financial windows complete'])+' |')
report='''# LAMBLE market-data acquisition — 20260926T170103Z

## Result and limits

Two specific narratives now have resolved token identities and real, auditable hourly charts. All 19 application venue slugs are preserved and have acquired financial-source mappings. Fourteen rows have 30 complete fee days; twelve have fees, revenue and correctly calculated changes for all three requested windows.

**This is a partial acquisition, not a drop-in production dataset.** Both narrative charts measure explicitly selected two-token/two-pool samples. Launch counts and curve-completion counts remain unknown for every venue. Supported-chain and fee-configuration verification is incomplete. There is no justified third featured narrative.

Frames discovery, descriptors, usage and unpaid probes worked. **No paid Frames invocation was made.** The user's instruction requires an existing approved overall ceiling, which was not present in this session. A clarification was sent; no ceiling was received. The account's $10 per-run maximum was not treated as authorization. Actual market datasets here were obtained from public APIs outside Frames. Therefore no paid Frames data route is claimed as validated.

Runtime inventory anchor: **2026-09-26 17:01:03 UTC**. Individual requests have later `fetched_at` values. Financial anchor: **September 26 00:00 UTC**, using complete prior UTC days. Chart anchor: **September 26 16:00 UTC**, with a one-hour collection safety margin. These are separate snapshots, not a synchronized rolling feed.

## Repository contract

`git ls-remote --symref origin HEAD` resolved `main` at `d98c8a73d78de4f008db032bc51659812d710bf3`, equal to local HEAD. All requested files and relevant chart/format/share imports were inspected. Since `762c11c`, six files changed for CSS, hero animation/contrast, navigation and table presentation. The requested data contract and fixture generation are unchanged.

The provider still selects fixtures, both histories are generated, the first three narrative array entries become visible choices, and the “Launch here” button has no route. Additional conflict: `relativeTime` defaults to the fixture snapshot and the revenue-take display clamps values at 100%. `node_modules/next/dist/docs/` is absent. No Next.js/application code was written, no packages were added to the app, and nothing was committed or deployed.

## Supported specific stories

### 1. X-handle creator-fee routing

UsePaid's [documentation](https://usepaid.app/docs) describes routing token creator fees to a named X account. Its [public registry](https://usepaid.app/) exposes names, contracts, venue tags and recipients. This is a concrete payout behavior, not a generic culture sector. CALI and Elon Coin appear by contract and independently resolve to matching GeckoTerminal identities and PumpSwap pools. The sources report pump.fun origin; creation instructions were not independently decoded.

The docs report an 80/20 recipient/buyback split and explicitly say pump.fun is live, Pons is not yet live, and four.meme is exploratory. The homepage and discussion can imply broader availability. This conflict is retained; the sample uses only Solana pump.fun tokens. Payout amounts, fiat settlement, recipient endorsement and claimed social momentum are not independently verified and are not populated as metrics. Relative token ages and registry `change: 0` values were not used as launch timestamps or price changes.

### 2. Holder rewards in the paired asset

[KNOTS's own site](https://www.knotsonstonk.com/) describes its reversed-STONK joke, StonkFun origin and a transfer-tax mechanism paying holders in STONK. [Bitquery's dated investigation](https://www.bitquery.io/investigations/is-stonkfun-dumping-on-holders) describes the recurring mechanism across KNOTS, ZCAT and other reward coins. [ZCAT's published profile](https://www.mexc.co/en-NG/learn/article/what-is-anonymous-cat-zcat-the-solana-meme-coin-paying-zec/1) identifies its contract and ZEC reward pairing. This is a specific recurring holder-reward behavior. Claims of superior returns are not made.

KNOTS and ZCAT resolve by chain and full address. ZEC and STONK are the selected pools' base/quote counterparts and are excluded as constituents. Pool USD turnover can be used regardless of which side the member occupies; base-token market cap and price-change fields cannot be reused for a quote-side member, so those example fields are null.

### Measured sample, not all-market ranking

| Narrative | Constituents | Selected-pool USD volume, 24h | Selected-pool USD volume, 7d |
| --- | --- | ---: | ---: |
'''
for n in ns:report+=f"| {n['title']} | {', '.join(t['symbol'] for t in n['exampleTokens'])} | {money(n['volume24hUsd'])} | {money(n['volume7dUsd'])} |\n"
report+='''
Twenty-four buckets cover **[September 25 16:00, September 26 16:00 UTC)**. Seven-day history contains 168 hourly buckets per narrative. Points are oldest first, Unix seconds, with timestamp denoting bucket start. Missing source buckets would produce null; there are none in these selected histories. No daily totals, rolling snapshots or generated curves were used to construct them.

The selected pools are unique. Neither selected pair joins two included constituents, so no constituent-side double counting occurs within this sample. Multi-hop routes can still contribute activity in multiple pools; this is DEX pool turnover, not unique trader spending. All other pools and CEX trading are omitted. Pool discovery stopped after one response page per token and was not exhausted. CALI had 8 returned pools; Elon Coin had 16. Only the first ranked pool per token was frozen into this retrospective dataset.

CALI's 15:00–16:00 September 26 hour equals the sum of 60 minute bars exactly: **$329,440.59267238935**. This supports the start-time convention. An aligned `before_timestamp` returned the boundary bucket, so normalization explicitly filters `[start,end)` and subsequent requests use `end-1`. CALI's missing seventh-day edge bucket was acquired in a bounded two-bucket prefix request.

Membership is **reconstructed today**, not “as observed then.” No earlier detection is claimed. `status`, `startedAt`, `mindshare`, launch totals and legacy attention shares remain null. Supplemental contender volume shares are provided, but must not be silently inserted into the attention field. `topLaunchpads` stays null because it means share of launches, not volume.

Ordering is a curated evidence-backed selection sorted by measured sample volume descending, then slug. It is not a market-wide top-two ranking. Potential accelerationist recipient-funding tokens remain a subnarrative candidate inside UsePaid; stock-paired memes remain a separate candidate requiring specific member evidence. Neither was promoted to manufacture a third slot.

## Launchpad financial acquisition

Every row below uses dated `dailyFees` and `dailyRevenue` responses from the [DefiLlama public API](https://github.com/DefiLlama/api-docs/blob/main/llms-free.txt). Revenue and all three percentage changes are included in `launchpads.json`. The table shows fee coverage for scanning. Provider methodology, raw totals, source hashes and exact requests are preserved.

| Application slug | Fees: last complete UTC day | Fees: 7 complete days | Fees: 30 complete days | History | Gaps / scope |
| --- | ---: | ---: | ---: | --- | --- |
'''+ '\n'.join(rows)+'''

Changes compare full current and previous windows: `100*(current-previous)/previous`. Missing dates and zero previous totals yield null. For example, pump.fun's 7-day fee change is **+2.8794%**, not the fixture's +3.51% daily-vs-seven-days-ago comparison. StonkFun's full-week change is **+47.8466%**, not the fixture's −32.25% daily comparison. Source summary fields occasionally include an in-progress day; they are retained for reconciliation and not used to override the complete-day sums.

### Definitions and overlap that prevent a hero sum

- **pump.fun:** adapter fees include curve trades, graduation and Mayhem flows. Creator/cashback earnings are supply-side revenue. PumpSwap is a separately linked product, so these row financials do not mean all lifetime trading of pump-origin tokens. The current [fee page](https://pump.fun/docs/fees) documents 125 bps for SOL/USDC curve trades, including 30 bps of trade value for creator fees: **2,400 bps of the total fee**, in that configuration. Creation is 0 SOL/USDC. Post-graduation tiers and cashback/mobile variants prevent a universal creator-share constant. The USD market-cap graduation target is unknown.
- **LaunchLab, StonkFun, BONK.fun, Graphite:** LaunchLab includes protocol, frontend/platform and creator curve fees; StonkFun's adapter includes its curve platform fees, graduated CPMM creator fees and locked-LP fees. These flows overlap. Graphite's official bio identifies infrastructure powering BONK.fun/LiveBONK. Their events and fees cannot be blindly added.
- **Meteora DBC / Bags:** Bags has DBC pre-migration and DAMM post-migration fee flows on Solana, plus separate Robinhood versions. DBC is an engine. The two rows do not define disjoint activity.
- **Pons:** the preserved application row uses **V2 financials only**, matching the baseline's 7d/30d figures. V1 is retained separately. [V1 docs](https://docs.ponsfamily.com) say immediate Uniswap V3 pools, no curve, and no migration; its 4.2 ETH liquidity milestone is not curve completion. [V2 docs](https://docs.ponsfamily.com/docs/v2) describe curve sellout followed by a Uniswap V4 pool. Neither threshold should be forced into an unsupported USD market-cap constant.
- **StonkBrokers:** the baseline's faction-token description and 7d financial value match **Nightshades**, one product of a broader platform. The row is explicitly scoped to Nightshades. Safe Launch has separate retained observations. Other products include NFT/loan, locker, LP-management and game fees; these are not all token launches.
- **Flap, BaseStonk, Foci:** tax, treasury, holder and creator flows differ. Foci recognizes fees on keeper settlement, not trade time. BaseStonk and Foci revenue can include holder-directed value; the UI's “share the venue keeps” needs qualification.
- **Binance Alpha:** broader discovery/trading activity is not a distinct creation-event population. **Rapid Launch** is a toolkit; collector fees do not establish venue-origin creations. Detailed adapter methodology for every row is in `entity-mapping.json` and `provider-financials.json`.

Official homepages were attempted for all 19 slugs. Eight returned meaningful identity metadata; the Binance Alpha response was empty. Ten other sites failed fetches. Declared icon URLs are stored separately and binary availability was not tested. Existing hex colors are retained only as editorial presentation choices. Full supported-chain lists are not proven by fee adapter coverage. Clanker's homepage explicitly adds BNB Chain relative to the fixture; its financial adapter coverage is recorded separately.

## What can be integrated now

- Source-backed identity/description subsets, adapter methodology and explicitly scoped calendar-day financial metrics.
- Four resolved coin identities and two charts of 24 real hourly sample buckets, plus 168-hour extensions. `series.id` remains `volume`, and its sum equals the corresponding sample `volume24hUsd`.
- Thirty-date launchpad grids, with real fee points and null gaps. Fourteen are complete.

**Requires minimal integration changes:** nullable numbers and unknown states; per-metric dates and scope labels; whitespace chart points; explicit nullable `hasBondingCurve`; versioned fee configurations; token addresses and evidence URLs; accurate share labels; timestamp-based history joins; overlap-aware aggregates; genuine current time for relative labels; external-logo ingestion; and internal launch routing. No current `Launchpad[]`/`Narrative[]` compatibility is claimed. Detailed field-by-field statuses are in `contract-and-coverage.json`.

## Frames routes and charges

Free calls successfully returned usage, catalog descriptors and unpaid live probes. `mpp.codex.post.graphql` returned a query-wrapper schema and live HTTP 400 probe; `bazaar.defillama-use-x402atlas-com-fee-summary` and `...-fees` returned fee-query parameter schemas and live 402 quotes. `agentic.emc2ai-io..x402-bitquery-pumpfun-launches-raw` returned bounded `limit`/`timeperiod` arguments. Firecrawl, Twitter search/summary and the cursor-based launch candidate were also probed; none were invoked. Probe history referring to earlier project calls is not this run's evidence.

**Actual Frames charge: 0 credits. `percent_remaining`: 84.** No paid run IDs or billing blocks exist for this run. Balance remained 76,008 credits at the two usage checks. The existing open reserve is not attributed to this investigation. Quotes, including 0.005 USD for the fee-summary provider and 0.000385 USD for the bounded Pump launch provider, are quotes only.

The tested data routes were outside Frames: DefiLlama `/summary/fees/{slug}` with `dailyFees`/`dailyRevenue`, GeckoTerminal token-pool discovery and pool hourly/minute OHLCV, plus public website extraction. DEX Screener returned 403. Codex `getLaunchpads` documentation URL and the guessed Meteora documentation route returned 404; no schema or claims were inferred from those failures. The Meteora URL was not used as evidence.

## Smallest repeatable path and remaining work

1. Reuse saved provider IDs, four token contracts and four pool IDs. Refresh the four pool histories hourly with two hours of overlap; recompute the same declared sample. Revalidate metadata daily. Preserve revisions and old membership versions.
2. Refresh 19 fee adapters × two data types daily (38 public GETs). Use the last complete day, retain 60 days, and merge by timestamp. Refresh Pons V1/Safe Launch separately if desired. No tested source-side date filter exists for these fee calls.
3. Refresh discovery every 30 minutes, social evidence every 30–60 minutes, and configurations/branding weekly. These are proposals only; no recurring task was created.
4. Once the approved overall Frames ceiling is supplied, run the exact bounded seed batch in `acquisition-recipes.json`, poll terminal status, inspect every body reference, and record actual credits by unique run ID. Then expand token/pool coverage and launch indexing. Do not repeat broad catalog discovery unnecessarily.
5. For complete launch/graduation metrics, index documented creation and curve-completion events, verify finality and window exhaustion, and deduplicate transaction/instruction/log identities. A newest-token feed, first pool or discovery timestamp cannot fill these fields.

Remaining work is substantive: paid Frames delivery validation, new-launch sampling across venues, complete token/pool membership, event counts, timestamped social signals, 30 daily narrative buckets and other requested attention/breadth histories, most fee variants, and exhaustive supported-chain/branding verification. Nulls preserve these limits.

## Artifacts and replay

Core files: `launchpads.json`, `narratives.json`, `tokens.json`, `memberships.json`, `evidence.json`, `field-provenance.json`, `entity-mapping.json`, `narrative-series.json`, `chart-data.csv`, `contract-and-coverage.json`, `acquisition-recipes.json`, `refresh-manifest.json`, `validation-report.json`. Supplemental files retain raw provider financials, candidate narratives and selected pools.

Run `python3 build_dataset.py`, `python3 package_research.py`, and `python3 validate.py` from this directory to reproduce normalization and checks **without live spending or network access**. `collect_public.py` defaults to a dry run; `--live` explicitly enables bounded unauthenticated GETs. Render with `uv run --with matplotlib plot_preview.py` (may download plotting dependencies). `chart-preview.png` and `.svg` contain actual measured data and were visually inspected.
'''
(P/'report.md').write_text(report)
print('Wrote report, acquisition recipes and refresh manifest.')
