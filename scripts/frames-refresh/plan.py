#!/usr/bin/env python3
"""Write one daily refresh's exact Frames requests. Offline; spends nothing.

Usage: python3 scripts/frames-refresh/plan.py research/lamble/<UTC-YYYYMMDDTHHMMSSZ>

Reads docs/prompts/refresh-market-data.sources.json and writes raw/<batch>-request.json:
  f1..f4  DefiLlama dailyFees + dailyRevenue for every venue (38 calls, <=10 per batch)
  c1      Codex: filterLaunchpads, hourly bars per network, token market snapshot
  e1      Narrative evidence pages and targeted X searches from the registry
Each batch gets a stable idempotency key derived from the run id.
"""
import datetime as dt, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
run = pathlib.Path(sys.argv[1]).resolve()
runtime = dt.datetime.strptime(run.name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc)
T = int(runtime.timestamp()) // 3600 * 3600 - 3600  # one complete-hour safety margin
reg = json.loads((ROOT / 'docs/prompts/refresh-market-data.sources.json').read_text())
(run / 'raw').mkdir(parents=True, exist_ok=True)
FIN, CODEX = reg['financialTool'], reg['marketAndActivityTool']
SEARCH = {'fin': 'srch_1176fd9b-8396-4f26-8dc8-37abc8fc6eeb', 'codex': 'srch_0292469d-885f-450d-b251-260690bfa135',
          'scrape': 'srch_bb1aaf8a-5504-476b-a652-d896325be6e1', 'x': 'srch_5cb35fee-4f86-413f-954c-78fc2c92631f'}


def write(batch, calls, search, max_usd):
    assert 1 <= len(calls) <= 10
    req = dict(calls=calls, search_ids=search, idempotency_key=f'lamble-{run.name}-{batch}', max_usd=max_usd)
    (run / f'raw/{batch}-request.json').write_text(json.dumps(req, separators=(',', ':')) + '\n')


fin = [dict(id=FIN, args=dict(protocol=v['providerSlug'], dataType=k, excludeTotalDataChart='false', excludeTotalDataChartBreakdown='true'))
       for v in reg['venues'] for k in ('dailyFees', 'dailyRevenue')]
for i in range(0, len(fin), 10):
    write(f'f{i // 10 + 1}', fin[i:i + 10], [SEARCH['fin']], 0.1)

launchpads = ('{ filterLaunchpads(scope: global, filters: {isTestnet: false}, limit: 200, offset: 0) { count offset results { id launchpadName displayName '
              'launchpadUrl launchpadProtocol isThirdParty networkIds timestamp tokensCreated24 tokensCreated1w tokensCompleted24 tokensCompleted1w '
              'tokensMigrated24 totalFees24 pre { totalFees24 } post { totalFees24 } } } }')
calls = [dict(id=CODEX, args=dict(query=launchpads))]
universe = reg['poolUniverse']
for network in sorted({u['networkId'] for u in universe}, key=lambda n: (n != 1399811149, n)):
    pools = [u for u in universe if u['networkId'] == network]
    bars = ' '.join(f'p{universe.index(u)}:getBars(symbol:"{u["pool"]}:{network}",from:{T - 7 * 86400},to:{T - 1},resolution:"60",'
                    f'currencyCode:"USD",removeEmptyBars:false){{t volume}}' for u in pools)
    calls.append(dict(id=CODEX, args=dict(query='{ ' + bars + ' }')))
tokens = ','.join(f'"{u["address"]}:{u["networkId"]}"' for u in universe)
calls.append(dict(id=CODEX, args=dict(query='{filterTokens(tokens:[' + tokens + '],limit:' + str(min(200, 2 * len(universe))) +
                                            '){results{pair{address token0 token1 networkId createdAt} priceUSD circulatingMarketCap change24 volume24 liquidity}}}')))
write('c1', calls, [SEARCH['codex']], 0.03)

ev = [dict(id='mpp.firecrawl.post.v1-scrape', args=dict(url=u, formats=['markdown'])) for u in reg['dailyEvidence']['pages']]
ev += [dict(id='bazaar.twitter-use-x402atlas-com-search', args=dict(words=w)) for w in reg['dailyEvidence']['xSearches']]
write('e1', ev, [SEARCH['scrape'], SEARCH['x']], 0.08)
print(json.dumps(dict(run=run.name, chartAnchor=dt.datetime.fromtimestamp(T, dt.timezone.utc).isoformat(), batches=['f1', 'f2', 'f3', 'f4', 'c1', 'e1'],
                      calls=len(fin) + len(calls) + len(ev))))
