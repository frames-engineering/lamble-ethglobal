#!/usr/bin/env python3
"""Write one daily refresh's exact Frames requests. Offline; spends nothing.

Usage:
  python3 scripts/frames-refresh/plan.py research/lamble/<UTC-YYYYMMDDTHHMMSSZ> discover
  python3 scripts/frames-refresh/plan.py research/lamble/<same run> collect

discover (run first) writes:
  d1  Codex: per chain group, top tokens by 24h volume and newly created tokens on the
      covered launchpads; a trending ranking; a market snapshot of every constituent
  e1  Narrative evidence pages and targeted X searches from the registry
collect (run after narrative decisions are applied to the registry) writes:
  f1..f6  DefiLlama dailyFees, dailyRevenue and dailySupplySideRevenue for every venue
          (57 calls, <=10 per batch); supply side is what creators (and, per venue, holders
          or traders) earn
  c1      Codex: filterLaunchpads, all-pool hourly token bars per network, token market
          snapshot, token creation times
  c2      Codex: 30 complete UTC days of all-pool daily token bars per network
Each batch gets a stable idempotency key derived from the run id.
"""
import datetime as dt, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
run = pathlib.Path(sys.argv[1]).resolve(); stage = sys.argv[2]
assert stage in ('discover', 'collect'), 'stage must be discover or collect'
runtime = dt.datetime.strptime(run.name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc)
NOW = int(runtime.timestamp())
T = NOW // 3600 * 3600 - 3600  # one complete-hour safety margin
reg = json.loads((ROOT / 'docs/prompts/refresh-market-data.sources.json').read_text())
(run / 'raw').mkdir(parents=True, exist_ok=True)
FIN, CODEX = reg['financialTool'], reg['marketAndActivityTool']
SEARCH = {'fin': 'srch_1176fd9b-8396-4f26-8dc8-37abc8fc6eeb', 'codex': 'srch_0292469d-885f-450d-b251-260690bfa135',
          'scrape': 'srch_bb1aaf8a-5504-476b-a652-d896325be6e1', 'x': 'srch_5cb35fee-4f86-413f-954c-78fc2c92631f'}
SNAPSHOT_FIELDS = 'results{pair{address token0 token1 networkId createdAt} priceUSD circulatingMarketCap change24 volume24 liquidity}'


def write(batch, calls, search, max_usd):
    assert 1 <= len(calls) <= 10
    req = dict(calls=calls, search_ids=search, idempotency_key=f'lamble-{run.name}-{batch}', max_usd=max_usd)
    (run / f'raw/{batch}-request.json').write_text(json.dumps(req, separators=(',', ':')) + '\n')


def snapshot(universe):
    tokens = ','.join(f'"{u["address"]}:{u["networkId"]}"' for u in universe)
    return dict(id=CODEX, args=dict(query='{filterTokens(tokens:[' + tokens + f'],limit:{min(200, 2 * len(universe))}){{{SNAPSHOT_FIELDS}}}}}'))


universe = reg['poolUniverse']
if stage == 'discover':
    d = reg['discovery']; calls = []
    for group, names in d['sweepGroups'].items():  # one call per chain group so busy chains do not crowd out the rest
        n = json.dumps(names)
        calls.append(dict(id=CODEX, args=dict(query=(
            f'{{ {group}_active:filterTokens(filters:{{launchpadName:{n},liquidity:{{gt:{d["minLiquidityUsd"]}}}}},'
            f'rankings:[{{attribute:volume24,direction:DESC}}],limit:{d["sweepLimit"]}){{{SNAPSHOT_FIELDS}}} '
            f'{group}_recent:filterTokens(filters:{{launchpadName:{n},liquidity:{{gt:{d["minLiquidityUsd"]}}},volume24:{{gt:{d["recentMinVolumeUsd"]}}},'
            f'createdAt:{{gt:{NOW - d["recentWindowHours"] * 3600}}}}},rankings:[{{attribute:volume24,direction:DESC}}],limit:{d["sweepLimit"]}){{{SNAPSHOT_FIELDS}}} }}'))))
    every = json.dumps(d['codexLaunchpadNames'])
    calls.append(dict(id=CODEX, args=dict(query=f'{{ trending:filterTokens(filters:{{launchpadName:{every},liquidity:{{gt:{d["minLiquidityUsd"]}}}}},'
                                                 f'rankings:[{{attribute:trendingScore24,direction:DESC}}],limit:{d["trendingLimit"]}){{{SNAPSHOT_FIELDS}}} }}')))
    calls.append(snapshot(universe))
    write('d1', calls, [SEARCH['codex']], 0.03)
    ev = [dict(id='mpp.firecrawl.post.v1-scrape', args=dict(url=u, formats=['markdown'])) for u in reg['dailyEvidence']['pages']]
    ev += [dict(id='bazaar.twitter-use-x402atlas-com-search', args=dict(words=w)) for w in reg['dailyEvidence']['xSearches'] + d.get('trendQueries', [])]
    assert len(ev) <= 10, 'dailyEvidence pages + xSearches + discovery.trendQueries exceed one batch of 10; trim the registry'
    write('e1', ev, [SEARCH['scrape'], SEARCH['x']], 0.1)
    print(json.dumps(dict(run=run.name, stage=stage, batches=['d1', 'e1'], calls=len(calls) + len(ev))))
else:
    fin = [dict(id=FIN, args=dict(protocol=v['providerSlug'], dataType=k, excludeTotalDataChart='false', excludeTotalDataChartBreakdown='true'))
           for v in reg['venues'] for k in ('dailyFees', 'dailyRevenue', 'dailySupplySideRevenue')]
    for i in range(0, len(fin), 10):
        write(f'f{i // 10 + 1}', fin[i:i + 10], [SEARCH['fin']], 0.1)
    launchpads = ('{ filterLaunchpads(scope: global, filters: {isTestnet: false}, limit: 200, offset: 0) { count offset results { id launchpadName displayName '
                  'launchpadUrl launchpadProtocol isThirdParty networkIds timestamp tokensCreated24 tokensCreated1w tokensCompleted24 tokensCompleted1w '
                  'tokensMigrated24 totalFees24 pre { totalFees24 } post { totalFees24 } } } }')
    calls = [dict(id=CODEX, args=dict(query=launchpads))]
    # Token-level bars aggregate every pool a coin trades in (Codex getTokenBars; currencyCode is an enum here).
    for network in sorted({u['networkId'] for u in universe}, key=lambda n: (n != 1399811149, n)):
        bars = ' '.join(f'p{universe.index(u)}:getTokenBars(symbol:"{u["address"]}:{network}",from:{T - 7 * 86400},to:{T - 1},resolution:"60",'
                        f'currencyCode:USD,removeEmptyBars:false){{t volume}}' for u in universe if u['networkId'] == network)
        calls.append(dict(id=CODEX, args=dict(query='{ ' + bars + ' }')))
    calls.append(snapshot(universe))
    ids = ','.join(f'{{address:"{u["address"]}",networkId:{u["networkId"]}}}' for u in universe)
    calls.append(dict(id=CODEX, args=dict(query=f'{{ created:tokens(ids:[{ids}]){{address networkId createdAt}} }}')))  # zero-fill boundary
    assert len(calls) <= 10, 'too many networks for one Codex batch; split c1'
    write('c1', calls, [SEARCH['codex']], 0.03)
    # 30 complete UTC days of all-pool daily bars ending at the last midnight on or before the chart anchor.
    # Codex omits the bucket that starts exactly at `from`, so ask from one day earlier; normalize.py keeps exactly 30 days.
    D = T // 86400 * 86400; daily = []
    for network in sorted({u['networkId'] for u in universe}, key=lambda n: (n != 1399811149, n)):
        bars = ' '.join(f'q{universe.index(u)}:getTokenBars(symbol:"{u["address"]}:{network}",from:{D - 31 * 86400},to:{D - 1},resolution:"1D",'
                        f'currencyCode:USD,removeEmptyBars:false){{t volume}}' for u in universe if u['networkId'] == network)
        daily.append(dict(id=CODEX, args=dict(query='{ ' + bars + ' }')))
    assert len(daily) <= 10
    write('c2', daily, [SEARCH['codex']], 0.02)
    fb = [f'f{i // 10 + 1}' for i in range(0, len(fin), 10)]
    print(json.dumps(dict(run=run.name, stage=stage, chartAnchor=dt.datetime.fromtimestamp(T, dt.timezone.utc).isoformat(),
                          dailyEnd=dt.datetime.fromtimestamp(D, dt.timezone.utc).isoformat(),
                          batches=fb + ['c1', 'c2'], calls=len(fin) + len(calls) + len(daily), pools=len(universe))))
