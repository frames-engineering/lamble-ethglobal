#!/usr/bin/env python3
"""Build a standalone HTML history dashboard from research/lamble/*.

Usage: python3 scripts/build-history-dashboard.py [out.html]
Reads the last run of each UTC day (narratives, launchpads, landing metrics, billing),
the latest 30-day fee history, and each run's report headline; writes one
self-contained HTML file (no network needed).
"""
import json, os, re, sys

BASE = 'research/lamble'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'dashboard/lamble-history.html'
runs = sorted(os.listdir(BASE))
byday = {}
for r in runs:
    p = f'{BASE}/{r}'
    if all(os.path.exists(f'{p}/{f}') for f in ('narratives.json', 'landing-metrics.json', 'launchpads.json')):
        byday[r[:8]] = r
data = {'days': [], 'titles': {}, 'firstRun': runs[0][:8]}
for d, r in sorted(byday.items()):
    p = f'{BASE}/{r}'
    n = json.load(open(p + '/narratives.json')); m = json.load(open(p + '/landing-metrics.json')); l = json.load(open(p + '/launchpads.json'))
    rec = {'date': f'{d[:4]}-{d[4:6]}-{d[6:]}', 'run': r, 'narratives': {}, 'venues': {}}
    for x in n:
        data['titles'][x['id']] = x['title']
        rec['narratives'][x['id']] = {'v24': x['volume24hUsd'], 'v7': x['volume7dUsd'], 'coins': len(x['contenders'])}
    rec['fees'] = m['fees']['value']
    rec['created'] = m['indexedTotals']['created24']; rec['completed'] = m['indexedTotals']['completed24']
    for x in l:
        h = x['metrics']['h24']
        rec['venues'][x['slug']] = {'name': x['name'], 'fees': h.get('fees'), 'supply': h.get('supplySide')}
    vp = p + '/validation-report.json'
    if os.path.exists(vp):
        b = json.load(open(vp)).get('billing', {})
        rec['credits'] = b.get('charged_credits'); rec['balance'] = b.get('balance_credits_after')
    data['days'].append(rec)
last = json.load(open(f'{BASE}/{byday[max(byday)]}/launchpads.json'))
data['hist'] = {x['slug']: {'name': x['name'], 'pts': x['metrics']['history30d']} for x in last}
data['generatedFrom'] = byday[max(byday)]
tpl = open('scripts/history-dashboard.template.html').read()
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
open(OUT, 'w').write(tpl.replace('__DATA__', json.dumps(data, separators=(',', ':'))))
print('wrote', OUT, len(data['days']), 'days')
