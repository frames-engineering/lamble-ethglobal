"""Resolve Frames tool IDs and job settings from the provider catalog. Offline.

docs/data/providers.json is the only registry of tool IDs (capability key -> tool ID, search attribution,
upstream name); docs/data/jobs.json holds cadence, scope, budgets and field selections. The research
universe and narrative rules stay in docs/prompts/refresh-market-data.sources.json.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
CATALOG = json.loads((ROOT / 'docs/data/providers.json').read_text())
JOBS = json.loads((ROOT / 'docs/data/jobs.json').read_text())
_BY_KEY = {c['key']: c for c in CATALOG['capabilities']}
_PROVIDERS = {p['id']: p for p in CATALOG['providers']}


def capability(key):
    if key not in _BY_KEY:
        raise SystemExit(f'unknown capability {key}; see docs/data/providers.json')
    return _BY_KEY[key]


def tool(key):
    """Tool ID for a capability a job may call. Candidates, discovered and blocked routes are refused."""
    c = capability(key)
    if not c['enabled'] or not c['toolId']:
        raise SystemExit(f'capability {key} is not enabled ({c["validation"]["status"]}); validate and enable it first')
    return c['toolId']


def search_ids(*keys):
    """Attribution search ids for frames_invoke_tools (optional hints, not identifiers)."""
    out = []
    for k in keys:
        s = capability(k)['attribution']['searchId']
        if s and s not in out: out.append(s)
    return out


def upstream_names():
    """tool ID -> human upstream name for evidence records."""
    names = {}
    for c in CATALOG['capabilities']:
        if c['toolId'] and c['toolId'] not in names:
            names[c['toolId']] = c['upstream'].get('source') if c['provider'] == 'lamble' else _PROVIDERS[c['provider']]['name']
    return names


def codex_bar_fields():
    cfg = JOBS['codexBars']
    return cfg['fields'] + (cfg['ohlcFields'] if cfg['ohlcEnabled'] else []), cfg['maxAliasesPerCall']


def billed_usd(key):
    """What Frames bills for one delivered call of a capability: seller price x (1 + fee rate) + per-call fee floor."""
    c = capability(key); fee = JOBS['framesPricing']
    price = (c.get('payment') or {}).get('priceHintUsd')
    if price is None:
        raise SystemExit(f'capability {key} has no price hint; quote it with frames_probe_tools first')
    return price * (1 + fee['feeRate']) + fee['feeFloorUsdPerCall']
