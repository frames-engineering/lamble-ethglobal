#!/usr/bin/env python3
"""Render saved measured data. Run: uv run --with matplotlib plot_preview.py"""
import datetime as dt, json, pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter

root=pathlib.Path(__file__).resolve().parent
data=json.loads((root/'narratives.json').read_text())
fig,axes=plt.subplots(len(data),1,figsize=(12,7),layout='constrained')
for ax,n in zip(axes,data):
    points=n['series'][0]['points']
    x=[dt.datetime.fromtimestamp(p['time'],dt.timezone.utc) for p in points]
    y=[p['value'] if p['value'] is not None else float('nan') for p in points]
    ax.bar(x,y,width=0.035,color='#397fba')
    ax.set_title(n['title']+' — two selected pools',loc='left',fontsize=12)
    ax.set_ylabel('USD traded per hour')
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_: f'${v/1e6:.2f}M'))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d %H:%M',tz=dt.timezone.utc))
    ax.grid(axis='y',alpha=.2)
fig.suptitle('Measured DEX pool volume · September 25 16:00–26 16:00 UTC, 2026',fontsize=14)
fig.supxlabel('UTC bucket start · GeckoTerminal · current membership applied retrospectively\nExcludes other tokens/pools and CEX activity. Not market-wide narrative totals.',fontsize=10)
fig.savefig(root/'chart-preview.png',dpi=160)
fig.savefig(root/'chart-preview.svg')
print('Rendered chart-preview.png and chart-preview.svg')
