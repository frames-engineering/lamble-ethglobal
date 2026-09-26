#!/usr/bin/env python3
"""Bounded public GET collector. No network unless --live is passed. No credentials."""
import argparse, concurrent.futures, datetime, hashlib, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent

def collect(item):
    name, url = item
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        with urllib.request.urlopen(url, timeout=20) as response:
            body = response.read(8_000_001)
            if len(body) > 8_000_000:
                raise ValueError('Response exceeded 8 MB; not saved as complete')
            final_url = response.url
        path = ROOT / 'raw' / name
        path.write_bytes(body)
        return dict(url=url, final_url=final_url, path=str(path.relative_to(ROOT)),
                    fetched_at=stamp, status='success', sha256=hashlib.sha256(body).hexdigest())
    except Exception as error:
        return dict(url=url, fetched_at=stamp, status='failed', error=str(error))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('request_file', type=pathlib.Path)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--log', default='public-collection-log.json')
    args = parser.parse_args()
    requests = json.loads(args.request_file.read_text())
    assert len(requests) <= 40, 'Hard cap: 40 GET requests per execution'
    assert all(u.startswith('https://') for _, u in requests)
    if not args.live:
        print(json.dumps({'dry_run': True, 'requests': requests}, indent=2))
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(collect, requests))
        (ROOT / 'raw' / args.log).write_text(json.dumps(results, indent=2))
        print(json.dumps([{'url': r['url'], 'status': r['status']} for r in results], indent=2))
