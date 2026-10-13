#!/usr/bin/env python3
"""Build report/images.html (tweet-sized slides) and render PNGs.
Usage: python3 report/build-report-images.py   (needs playwright + chromium)"""
import json, os, subprocess, sys
BASE = 'research/lamble'
runs = sorted(os.listdir(BASE))
byday = {}
for r in runs:
    p = f'{BASE}/{r}'
    if all(os.path.exists(f'{p}/{f}') for f in ('narratives.json', 'landing-metrics.json', 'launchpads.json')):
        byday[r[:8]] = r
days, titles = [], {}
for d, r in sorted(byday.items()):
    p = f'{BASE}/{r}'
    n = json.load(open(p + '/narratives.json')); m = json.load(open(p + '/landing-metrics.json'))
    rec = {'date': f'{d[:4]}-{d[4:6]}-{d[6:]}', 'n': {}, 'created': m['indexedTotals']['created24'], 'completed': m['indexedTotals']['completed24'], 'fees': m['fees']['value']}
    for x in n:
        titles[x['id']] = x['title']; rec['n'][x['id']] = {'v24': x['volume24hUsd'], 'coins': len(x['contenders'])}
    days.append(rec)
latest = byday[max(byday)]
l = json.load(open(f'{BASE}/{latest}/launchpads.json')); m = json.load(open(f'{BASE}/{latest}/landing-metrics.json'))
inc = m['fees']['includedSlugs']
hist = {x['slug']: {'name': x['name'], 'pts': x['metrics']['history30d']} for x in l if x['slug'] in inc}
times = [p['time'] for p in next(iter(hist.values()))['pts']]
sub = {p['time']: p['value'] for p in m['fees']['history30d']}
start = next(i for i, t in enumerate(times) if sub[t] is not None)
fees = {'times': times[start:], 'venues': {k: [p['value'] for p in a['pts']][start:] for k, a in hist.items()}, 'names': {k: a['name'] for k, a in hist.items()}, 'subtotal': [sub[t] for t in times[start:]]}
# the per-venue sum must equal the recorded subtotal (nulls count as zero only where the subtotal agrees)
for i, t in enumerate(fees['times']):
    s = sum((v[i] or 0) for v in fees['venues'].values())
    assert abs(s - fees['subtotal'][i]) <= 1.5, (t, s, fees['subtotal'][i])
data = {'days': days, 'titles': titles, 'fees': fees}
html = open('report/images.template.html').read().replace('__DATA__', json.dumps(data, separators=(',', ':')))
open('report/images.html', 'w').write(html)
print('wrote report/images.html;', len(days), 'snapshots;', len(fees['times']), 'fee days')
