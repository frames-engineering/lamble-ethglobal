"""Explicit public asset downloads; never invoked by the offline snapshot importer."""
import json, pathlib, urllib.request, hashlib, concurrent.futures, datetime
root=pathlib.Path(__file__).parent
slugs=[['flap-sh','launchlab','bonk.fun','graphite-protocol','genius.fun','argus-world','meteora-dbc','binance-alpha','o1-launchpad'],['clanker','bags','rapid-launch','basestonk','four.meme','foci','stonkfun','stonkbrokers','pons']]
jobs=[]
for n in [1,2]:
 a=json.loads((root/f'raw/enrich{n}.json').read_text())
 for c in a['result']['calls']:
  m=c.get('body',{}).get('data',{}).get('metadata',{})
  if m.get('favicon'): jobs.append((slugs[n-1][c['seq']],m['favicon'],a['run_id'],c['seq']))
def get(job):
 slug,url,run,seq=job
 row=dict(slug=slug,url=url,run_id=run,seq=seq,fetched_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),transport='public HTTPS outside Frames; URL discovered through Frames')
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r:
   data=r.read(2000000); ct=r.headers.get('Content-Type','')
  ext='png' if data.startswith(b'\x89PNG') else 'ico' if data.startswith(b'\x00\x00\x01\x00') else 'svg' if b'<svg' in data[:2000] else None
  if not ext: raise ValueError('Not a recognized image: '+ct)
  if ext=='svg' and any(s in data.lower() for s in [b'<script',b'onload=',b'<foreignobject']): raise ValueError('Active SVG rejected')
  path=pathlib.Path('public/launchpads')/(slug+'.'+ext); path.write_bytes(data)
  row.update(status='verified_direct',logoSrc='/launchpads/'+path.name,sha256=hashlib.sha256(data).hexdigest(),contentType=ct)
 except Exception as e: row.update(status='blocked',error=str(e))
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: rows=list(pool.map(get,jobs))
(root/'logo-assets.json').write_text(json.dumps(rows,indent=2)+'\n')
print([(r['slug'],r['status']) for r in rows])
