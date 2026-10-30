#!/usr/bin/env python3
"""Write one daily refresh's exact Frames requests. Offline; spends nothing.

Usage:
  python3 scripts/frames-refresh/plan.py research/lamble/<UTC-YYYYMMDDTHHMMSSZ> discover
  python3 scripts/frames-refresh/plan.py research/lamble/<same run> collect
  python3 scripts/frames-refresh/plan.py research/lamble/<same run> panels [--prior research/lamble/<run>]

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
panels (run after collect) writes:
  p1..pN  Pump and FOMO coin panels, filled in priority order until the job's credit ceiling
          (jobs.json x4o2-coin-panels maxCreditsPerRun, lowered so the max_usd reserved by the run's
          other request files plus the panels stays within dailyCreditCeiling) at Frames' billed price per call:
          1. coins collected daily (the registry pool universe), 2. the other tracked coins of the
          prior run (tokens.json), largest market cap first. A coin's calls are planned whole or not at all.
          pump.fun coins on Solana: pump.coin, pump.trades, pump.candles (30 daily), pump.holders,
          fomo.holders. Other coins on FOMO networks: fomo.token, fomo.holders, fomo.candles (12h),
          fomo.activity.
Each batch gets a stable idempotency key derived from the run id.
Blocked sites and coins (docs/data/blocked.json) are never requested. A blocked host in dailyEvidence stops planning.
discover leaves blocked coins out of the constituent snapshot; collect refuses to plan until the run's curation has
removed them from poolUniverse (with a removedMembers entry); panels skip them. write() refuses any request that
names a blocked host or coin address.
"""
import datetime as dt, json, math, pathlib, sys

from catalog import JOBS, billed_usd, capability, codex_bar_fields, search_ids, tool

ROOT = pathlib.Path(__file__).resolve().parents[2]
run = pathlib.Path(sys.argv[1]).resolve(); stage = sys.argv[2]
assert stage in ('discover', 'collect', 'panels'), 'stage must be discover, collect or panels'
runtime = dt.datetime.strptime(run.name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc)
NOW = int(runtime.timestamp())
T = NOW // 3600 * 3600 - 3600  # one complete-hour safety margin
reg = json.loads((ROOT / 'docs/prompts/refresh-market-data.sources.json').read_text())
(run / 'raw').mkdir(parents=True, exist_ok=True)
# Tool IDs and search attribution come from the provider catalog (docs/data/providers.json); nothing is hardcoded here.
FIN, CODEX = tool('defillama.fees'), tool('codex.token-bars')
SCRAPE, XSEARCH = tool('firecrawl.scrape'), tool('x.search')
assert CODEX == tool('codex.token-snapshot') == tool('codex.token-discovery') == tool('codex.launchpad-activity') == tool('codex.token-metadata')
SEARCH = {'fin': search_ids('defillama.fees'), 'codex': search_ids('codex.token-bars'),
          'scrape': search_ids('firecrawl.scrape'), 'x': search_ids('x.search')}
BAR_FIELDS, MAX_ALIASES = codex_bar_fields()  # jobs.json codexBars: t volume, plus o h l c when ohlcEnabled
BAR_SELECTION = '{' + ' '.join(BAR_FIELDS) + '}'
SNAPSHOT_FIELDS = 'results{pair{address token0 token1 networkId createdAt} priceUSD circulatingMarketCap change24 volume24 liquidity}'
BLOCKED = json.loads((ROOT / 'docs/data/blocked.json').read_text())
BLOCKED_TOKENS = {t['tokenId']: t['reason'] for t in BLOCKED['tokens']}
BLOCKED_TERMS = [h['host'].lower() for h in BLOCKED['hosts']] + [t.split(':', 1)[1].lower() for t in BLOCKED_TOKENS]


def names_blocked(value):
    text = json.dumps(value).lower()
    return [b for b in BLOCKED_TERMS if b in text]


def write(batch, calls, search, max_usd):
    assert 1 <= len(calls) <= 10
    assert not names_blocked(calls), f'{batch} would request blocked {names_blocked(calls)} (docs/data/blocked.json)'
    req = dict(calls=calls, search_ids=search, idempotency_key=f'lamble-{run.name}-{batch}', max_usd=max_usd)
    (run / f'raw/{batch}-request.json').write_text(json.dumps(req, separators=(',', ':')) + '\n')


def snapshot(universe):
    tokens = ','.join(f'"{u["address"]}:{u["networkId"]}"' for u in universe)
    return dict(id=CODEX, args=dict(query='{filterTokens(tokens:[' + tokens + f'],limit:{min(200, 2 * len(universe))}){{{SNAPSHOT_FIELDS}}}}}'))


pages = [u for u in reg['dailyEvidence']['pages'] if names_blocked(u)]
assert not pages, f'dailyEvidence.pages holds blocked sites (docs/data/blocked.json): {pages}. Remove them, then plan again.'
held = {u['tokenId']: BLOCKED_TOKENS[u['tokenId']] for u in reg['poolUniverse'] if u['tokenId'] in BLOCKED_TOKENS}
assert not (held and stage == 'collect'), (f'poolUniverse holds blocked coins (docs/data/blocked.json): {held}. Remove each from '
                                          'poolUniverse and record it in curation.json removedMembers with that reason, then plan again.')
universe = [u for u in reg['poolUniverse'] if u['tokenId'] not in BLOCKED_TOKENS]
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
    write('d1', calls, SEARCH['codex'], 0.04)
    ev = [dict(id=SCRAPE, args=dict(url=u, formats=['markdown'])) for u in reg['dailyEvidence']['pages']]
    ev += [dict(id=XSEARCH, args=dict(words=w)) for w in reg['dailyEvidence']['xSearches'] + d.get('trendQueries', [])]
    assert len(ev) <= 10, 'dailyEvidence pages + xSearches + discovery.trendQueries exceed one batch of 10; trim the registry'
    write('e1', ev, SEARCH['scrape'] + SEARCH['x'], 0.13)
    print(json.dumps(dict(run=run.name, stage=stage, batches=['d1', 'e1'], calls=len(calls) + len(ev))))
elif stage == 'panels':
    job = next(j for j in JOBS['jobs'] if j['id'] == 'x4o2-coin-panels')
    credit = JOBS['framesPricing']['creditUsd']  # 1 credit = $0.001 (frames_get_usage)
    assert not [f for f in (run / 'raw').glob('p[0-9]*.json') if not f.name.endswith('-request.json')], \
        'panel batches of this run were already called; re-planning would change requests under the same idempotency keys'
    for f in (run / 'raw').glob('p[0-9]*-request.json'): f.unlink()
    # The run's other batches (discover, evidence, collect) reserve their max_usd first; panels get what is left of the
    # daily ceiling, never more than the job's own ceiling.
    reserved = sum(json.loads(f.read_text())['max_usd'] for f in (run / 'raw').glob('*-request.json'))
    ceiling_usd = max(0, min(job['budget']['maxCreditsPerRun'], JOBS['dailyCreditCeiling'] - reserved / credit)) * credit
    prior = pathlib.Path(sys.argv[sys.argv.index('--prior') + 1]).resolve() if '--prior' in sys.argv else max(
        (d for d in (ROOT / 'research/lamble').iterdir() if (d / 'tokens.json').exists() and d.name < run.name), key=lambda d: d.name)
    fomo_networks = set(capability('fomo.token')['dataNetworks'])
    def coin_calls(chain, address, origin):
        if chain == 'solana' and origin == 'pump.fun':
            return [('pump.coin', dict(mint=address)), ('pump.trades', dict(mint=address, limit=100)),
                    ('pump.candles', dict(mint=address, res='1d', count=30, measure='price_usd')), ('pump.holders', dict(mint=address)),
                    ('fomo.holders', dict(chain=chain, address=address))]
        if chain in fomo_networks:
            return [('fomo.token', dict(chain=chain, address=address)), ('fomo.holders', dict(chain=chain, address=address)),
                    ('fomo.candles', dict(chain=chain, address=address, period='12h')), ('fomo.activity', dict(chain=chain, address=address, limit=50))]
        return []
    collected = [(u['chain'], u['address'], u.get('originLaunchpadSlug')) for u in universe]
    seen = {(c, a) for c, a, _ in collected}
    others = sorted((t for t in json.loads((prior / 'tokens.json').read_text()) if (t['chain'], t['address']) not in seen and not names_blocked(t['address'])),
                    key=lambda t: (-(t.get('mcapUsd') or 0), t['chain'], t['address']))
    queue = [(1, *c) for c in collected] + [(2, t['chain'], t['address'], t.get('originLaunchpadSlug')) for t in others]
    planned, spent, skipped, tiers = [], 0.0, 0, {1: 0, 2: 0}
    for tier, chain, address, origin in queue:
        calls = [(k, dict(id=tool(k), args=a)) for k, a in coin_calls(chain, address, origin)]
        if not calls: continue
        cost = sum(billed_usd(k) for k, _ in calls)
        if spent + cost > ceiling_usd + 1e-9:
            skipped += 1
            continue
        planned += calls; spent += cost; tiers[tier] += 1
    batches = []
    for i in range(0, len(planned), 10):
        chunk = planned[i:i + 10]
        name = f'p{i // 10 + 1}'
        assert i // 10 + 1 <= 99, 'more than 99 panel batches; raise the batch naming or lower the ceiling'
        # max_usd caps the bill at what the planned calls cost at catalog prices, rounded up to $0.0001.
        write(name, [c for _, c in chunk], search_ids(*sorted({k for k, _ in chunk})), math.ceil(sum(billed_usd(k) for k, _ in chunk) * 10000 - 1e-9) / 10000)
        batches.append(name)
    print(json.dumps(dict(run=run.name, stage=stage, prior=prior.name, batches=batches, calls=len(planned), coins={'collected': tiers[1], 'other': tiers[2]},
                          coinsSkippedForCeiling=skipped, plannedCredits=round(spent / credit), ceilingCredits=round(ceiling_usd / credit),
                          reservedByOtherBatchesCredits=round(reserved / credit))))
else:
    fin = [dict(id=FIN, args=dict(protocol=v['providerSlug'], dataType=k, excludeTotalDataChart='false', excludeTotalDataChartBreakdown='true'))
           for v in reg['venues'] for k in ('dailyFees', 'dailyRevenue', 'dailySupplySideRevenue')]
    for i in range(0, len(fin), 10):
        write(f'f{i // 10 + 1}', fin[i:i + 10], SEARCH['fin'], 0.12)
    launchpads = ('{ filterLaunchpads(scope: global, filters: {isTestnet: false}, limit: 200, offset: 0) { count offset results { id launchpadName displayName '
                  'launchpadUrl launchpadProtocol isThirdParty networkIds timestamp tokensCreated24 tokensCreated1w tokensCompleted24 tokensCompleted1w '
                  'tokensMigrated24 totalFees24 pre { totalFees24 } post { totalFees24 } } } }')
    calls = [dict(id=CODEX, args=dict(query=launchpads))]
    # Token-level bars aggregate every pool a coin trades in (Codex getTokenBars; currencyCode is an enum here).
    for network in sorted({u['networkId'] for u in universe}, key=lambda n: (n != 1399811149, n)):
        members = [u for u in universe if u['networkId'] == network]
        for k in range(0, len(members), MAX_ALIASES):  # bound body size (Frames stores at most 1,000,000 characters per body)
            bars = ' '.join(f'p{universe.index(u)}:getTokenBars(symbol:"{u["address"]}:{network}",from:{T - 7 * 86400},to:{T - 1},resolution:"60",'
                            f'currencyCode:USD,removeEmptyBars:false){BAR_SELECTION}' for u in members[k:k + MAX_ALIASES])
            calls.append(dict(id=CODEX, args=dict(query='{ ' + bars + ' }')))
    calls.append(snapshot(universe))
    ids = ','.join(f'{{address:"{u["address"]}",networkId:{u["networkId"]}}}' for u in universe)
    calls.append(dict(id=CODEX, args=dict(query=f'{{ created:tokens(ids:[{ids}]){{address networkId createdAt}} }}')))  # zero-fill boundary
    assert len(calls) <= 10, 'too many networks for one Codex batch; split c1'
    write('c1', calls, SEARCH['codex'], 0.05)
    # 30 complete UTC days of all-pool daily bars ending at the last midnight on or before the chart anchor.
    # Codex omits the bucket that starts exactly at `from`, so ask from one day earlier; normalize.py keeps exactly 30 days.
    D = T // 86400 * 86400; daily = []
    for network in sorted({u['networkId'] for u in universe}, key=lambda n: (n != 1399811149, n)):
        members = [u for u in universe if u['networkId'] == network]
        for k in range(0, len(members), MAX_ALIASES):
            bars = ' '.join(f'q{universe.index(u)}:getTokenBars(symbol:"{u["address"]}:{network}",from:{D - 31 * 86400},to:{D - 1},resolution:"1D",'
                            f'currencyCode:USD,removeEmptyBars:false){BAR_SELECTION}' for u in members[k:k + MAX_ALIASES])
            daily.append(dict(id=CODEX, args=dict(query='{ ' + bars + ' }')))
    assert len(daily) <= 10
    write('c2', daily, SEARCH['codex'], 0.03)
    fb = [f'f{i // 10 + 1}' for i in range(0, len(fin), 10)]
    print(json.dumps(dict(run=run.name, stage=stage, chartAnchor=dt.datetime.fromtimestamp(T, dt.timezone.utc).isoformat(),
                          dailyEnd=dt.datetime.fromtimestamp(D, dt.timezone.utc).isoformat(),
                          batches=fb + ['c1', 'c2'], calls=len(fin) + len(calls) + len(daily), pools=len(universe))))
