#!/usr/bin/env python3
"""Hourly scout: new coins and new narratives within the hour. Offline; the agent makes the Frames calls.

Usage (the full procedure is docs/prompts/scout.md):
  python3 scripts/frames-refresh/scout.py start [--at YYYYMMDDTHHMMSSZ]
      Checks the day's scout spend against jobs.json scout maxCreditsPerDay (data/live/scout-ledger.json) with this
      run's worst case, creates research/scout/<UTC>/ and plans d1 (plan.py scout). Exit 1, creating nothing, when the
      day's budget cannot cover another run.
  python3 scripts/frames-refresh/scout.py names <run>
      After raw/d1.json is saved: plans d2, the names of the swept tokens (discover.py names).
  python3 scripts/frames-refresh/scout.py check <run>
      After raw/d2.json is saved: clusters candidates exactly as the daily run does (discover.py summary against the
      registry's latestRefreshRun), keeps the themes no earlier scout run or daily run has decided (or that are due a
      re-check) and plans raw/e1-request.json, one X search per theme, at most maxStorySearchesPerRun, largest
      combined volume first. Writes escalated.json and prints what needs a decision.
  python3 scripts/frames-refresh/scout.py followups <run> "<query>" ["<query>"]
      Optional, after raw/e1.json is saved: plans raw/e2-request.json, at most maxFollowUpsPerRun X searches.
  python3 scripts/frames-refresh/scout.py publish <run>
      Validates <run>/decisions.json against the posts actually saved in raw/e1.json and raw/e2.json, then writes
      data/live/spotted.json (what the home page shows as Live Monitor) and adds the run's billed credits to
      data/live/scout-ledger.json.
  python3 scripts/frames-refresh/scout.py record <run>
      For a run that stops after a paid call without publishing: adds its billed credits to the ledger only, so the
      day's budget counts every paid batch. start also records earlier unrecorded runs of the day in this checkout.

What is public (src/lib/lamble/site/spotted.ts): new coins, which are observations (a covered launchpad, a first pool at
most newCoinHours old, the addMember bar met with no quarantine flag); and theme clusters only once a public source for
the story was found (confirmed) or the daily run tracks the theme (tracked). A word shared by coin names is a lead,
not a story: unchecked, deferred and rejected clusters stay in the file only so the same theme is not paid for again.
Narrative membership still changes only in the daily refresh, which reads the confirmed leads (refresh-market-data.md).
Blocked sites and coins (docs/data/blocked.json) are never requested, cited or listed.
"""
import argparse, datetime as dt, json, math, os, pathlib, re, subprocess, sys

from catalog import JOBS, billed_usd, search_ids, tool

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
LIVE = pathlib.Path(os.environ.get('LAMBLE_LIVE_DIR') or ROOT / 'data/live').resolve()
SCOUTS = pathlib.Path(os.environ.get('LAMBLE_SCOUT_DIR') or ROOT / 'research/scout').resolve()
SPOTTED, LEDGER = LIVE / 'spotted.json', LIVE / 'scout-ledger.json'
REG = json.loads((ROOT / 'docs/prompts/refresh-market-data.sources.json').read_text())
CFG, RULES = REG['discovery']['scout'], REG['narrativeRules']
JOB = next(j for j in JOBS['jobs'] if j['id'] == 'scout')
CREDIT = JOBS['framesPricing']['creditUsd']
SCHEMA, LEDGER_SCHEMA = 'lamble-spotted-v1', 'lamble-scout-ledger-v1'
STATUSES = ('spotted', 'confirmed', 'deferred', 'rejected', 'tracked')
RUN_RE = re.compile(r'^\d{8}T\d{6}Z$')
HOUR, LEDGER_DAYS = 3600, 14
XSEARCH = tool('x.search')
BLOCKED = json.loads((ROOT / 'docs/data/blocked.json').read_text())
BLOCKED_IDS = {t['tokenId'] for t in BLOCKED['tokens']}
BLOCKED_TERMS = [h['host'].lower() for h in BLOCKED['hosts']] + [t.split(':', 1)[1].lower() for t in BLOCKED_IDS]
CREDENTIAL = re.compile(r'(?i)("?authorization"?\s*[:=]|x-api-key|bearer\s+[a-z0-9._-]{16,})')
SOURCE_REF = re.compile(r'^(e[12]):(\d+)#(\d{1,25})$')
SCREEN_NAME = re.compile(r'^[A-Za-z0-9_]{1,15}$')


def fail(msg): sys.exit(f'scout: {msg}')
def read(p): return json.loads(pathlib.Path(p).read_text())
def ts(name): return int(dt.datetime.strptime(name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc).timestamp())
def iso(t): return dt.datetime.fromtimestamp(t, dt.timezone.utc).isoformat().replace('+00:00', 'Z')
def from_iso(s): return int(dt.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp())
def names_blocked(value): text = json.dumps(value).lower(); return [b for b in BLOCKED_TERMS if b in text]


def rel(p):
    p = pathlib.Path(p).resolve()
    return str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p)


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
    tmp.replace(path)


def write_request(run, batch, calls, keys):
    assert 1 <= len(calls) <= JOB['pagination']['maxCallsPerBatch']
    assert not names_blocked(calls), f'{batch} would request blocked {names_blocked(calls)} (docs/data/blocked.json)'
    usd = math.ceil(sum(billed_usd(k) for k in keys) * 10000 - 1e-9) / 10000  # what the calls cost at catalog prices, rounded up
    req = dict(calls=calls, search_ids=search_ids('x.search'), idempotency_key=f'lamble-scout-{run.name}-{batch}', max_usd=usd)
    (run / f'raw/{batch}-request.json').write_text(json.dumps(req, separators=(',', ':')) + '\n')


def worst_case_credits():
    """Every call a scout run may make, billed at catalog prices: the sweep, names, story searches and follow-ups."""
    p = JOB['pagination']
    codex = (len(REG['discovery']['sweepGroups']) + 2) * billed_usd('codex.token-discovery') + billed_usd('codex.token-metadata')
    return math.ceil((codex + (p['maxStorySearchesPerRun'] + p['maxFollowUpsPerRun']) * billed_usd('x.search')) / CREDIT - 1e-9)


assert worst_case_credits() <= JOB['budget']['maxCreditsPerRun'], 'jobs.json scout: the worst-case run exceeds maxCreditsPerRun'


def scout_run(arg):
    run = pathlib.Path(arg).resolve()
    if not RUN_RE.match(run.name) or run.parent.name != 'scout': fail(f'{arg} is not a scout run (research/scout/<UTC-YYYYMMDDTHHMMSSZ>)')
    if not (run / 'raw/d1-request.json').exists(): fail(f'{arg} has no raw/d1-request.json; start a run with scout.py start')
    return run


def baseline():
    """The daily run the registry names as latest: the scout's reference for tracked coins and earlier decisions."""
    base = (ROOT / REG['references']['latestRefreshRun']).resolve()
    for f in ('curation.json', 'candidates.json', 'narratives.json', 'discovery.json'):
        if not (base / f).exists(): fail(f'baseline daily run {rel(base)} has no {f}')
    return base


# ---------------------------------------------------------------- ledger and memory
def load_ledger():
    if not LEDGER.exists(): return dict(schema=LEDGER_SCHEMA, maxCreditsPerDay=JOB['budget']['maxCreditsPerDay'], days={})
    led = read(LEDGER)
    if led.get('schema') != LEDGER_SCHEMA: fail(f'{rel(LEDGER)} is not a {LEDGER_SCHEMA} file')
    return led


def day_of(t): return iso(t)[:10]
def spent_on(led, day): return sum(led['days'].get(day, {}).get('runs', {}).values())


def load_spotted():
    if not SPOTTED.exists(): return dict(leads={}, coins={})
    s = read(SPOTTED)
    if s.get('schema') != SCHEMA: fail(f'{rel(SPOTTED)} is not a {SCHEMA} file')
    return dict(leads={l['id']: l for l in s['leads']}, coins=s.get('seen', {}).get('coins', {}))


def daily_decisions(base):
    """Cluster decisions of the baseline daily run, with the time it ran and each cluster's combined volume then."""
    at = ts(base.name)
    vol = {k['id']: k['combinedVolume24Usd'] for k in read(base / 'discovery.json').get('clusters', [])}
    status = {'created': 'tracked', 'assigned': 'tracked', 'rejected': 'rejected', 'deferred': 'deferred'}
    out = {}
    for cid, d in read(base / 'curation.json').get('clusterDecisions', {}).items():
        if d.get('decision') in status:
            out[cid] = dict(status=status[d['decision']], checkedAt=at, volumeAtCheck=vol.get(cid), narrativeId=d.get('narrativeId'),
                            reason=f"Daily review: {d.get('reason', '')}".strip(), by='daily')
    return out


def prior_state(cid, memory, daily):
    """The newer of the last scout decision and the baseline daily decision for a theme, or None."""
    m = memory['leads'].get(cid); d = daily.get(cid)
    if m and m['status'] != 'spotted':
        mine = dict(status=m['status'], checkedAt=from_iso(m['checkedAt']) if m.get('checkedAt') else None, volumeAtCheck=m.get('volumeAtCheck'),
                    narrativeId=m.get('narrativeId'), reason=m.get('reason'), by='scout')
        if not d or (mine['checkedAt'] or 0) >= d['checkedAt']: return mine
    return d or (dict(status='spotted', checkedAt=None, volumeAtCheck=None, narrativeId=None, reason=None, by=None) if m else None)


def needs_check(state, cluster, now):
    if state is None or state['status'] == 'spotted': return True
    if state['status'] in ('confirmed', 'tracked'): return False
    due = state['checkedAt'] is None or now - state['checkedAt'] >= CFG['recheckAfterHours'] * HOUR
    if state['status'] == 'deferred': return due
    grown = state['volumeAtCheck'] is None or cluster['combinedVolume24Usd'] >= CFG['recheckVolumeMultiple'] * state['volumeAtCheck']
    return due and grown


def story_query(cluster):
    top = max(cluster['members'], key=lambda m: m['volume24Usd'])['symbol']
    return cluster['keyword'] if cluster['keyword'].startswith('$') else f"{cluster['keyword']} ${top}"  # as discover.py stories


# ---------------------------------------------------------------- steps
def start(args):
    at = args.at or dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    if not RUN_RE.match(at): fail('--at must be YYYYMMDDTHHMMSSZ')
    day = day_of(ts(at))
    for d in sorted(SCOUTS.iterdir()) if SCOUTS.exists() else []:  # a run in this checkout that paid but never published or recorded
        if RUN_RE.match(d.name) and d.name < at and day_of(ts(d.name)) == day and d.name not in load_ledger()['days'].get(day, {}).get('runs', {}) \
                and any((d / f'raw/{b}.json').exists() for b in ('d1', 'd2', 'e1', 'e2')):
            record_run(d)
    led = load_ledger(); spent = spent_on(led, day); worst = worst_case_credits(); cap = JOB['budget']['maxCreditsPerDay']
    if spent + worst > cap:
        print(json.dumps(dict(status='refused', reason='scout day budget', day=day, spentCredits=spent, worstCaseCredits=worst, maxCreditsPerDay=cap)))
        sys.exit(1)
    run, base = SCOUTS / at, baseline()
    if run.exists(): fail(f'{rel(run)} already exists')
    (run / 'raw').mkdir(parents=True)
    r = subprocess.run([sys.executable, str(HERE / 'plan.py'), str(run), 'scout'], capture_output=True, text=True)
    if r.returncode: fail(f'plan.py scout failed:\n{r.stdout}{r.stderr}')
    print(json.dumps(dict(status='planned', run=rel(run), batches=['d1'], baseline=rel(base), day=day, spentCredits=spent,
                          worstCaseCredits=worst, maxCreditsPerDay=cap)))


def names(args):
    run = scout_run(args.run)
    if not (run / 'raw/d1.json').exists(): fail('save raw/d1.json first')
    r = subprocess.run([sys.executable, str(HERE / 'discover.py'), str(run), 'names'], capture_output=True, text=True)
    if r.returncode: fail(f'discover.py names failed:\n{r.stdout}{r.stderr}')
    print(r.stdout.strip())


def check(args):
    run = scout_run(args.run); base = baseline()
    if not (run / 'raw/d2.json').exists(): fail('save raw/d2.json first')
    if (run / 'raw/e1.json').exists(): fail('raw/e1.json is already saved; re-planning would change its request under the same idempotency key')
    r = subprocess.run([sys.executable, str(HERE / 'discover.py'), str(run), 'summary', '--prior', str(base)], capture_output=True, text=True)
    if r.returncode: fail(f'discover.py summary failed:\n{r.stdout[-3000:]}{r.stderr}')
    disc = read(run / 'discovery.json'); now = ts(run.name)
    memory, daily = load_spotted(), daily_decisions(base)
    todo = [k for k in disc['clusters'] if needs_check(prior_state(k['id'], memory, daily), k, now)]
    todo.sort(key=lambda k: (-k['combinedVolume24Usd'], k['id']))
    cap = JOB['pagination']['maxStorySearchesPerRun']
    queries, escalated, pending = [], [], []
    for k in todo:
        q = story_query(k)
        if names_blocked(q): pending.append(dict(clusterId=k['id'], why='query names a blocked site or coin')); continue
        if q not in queries:
            if len(queries) >= cap: pending.append(dict(clusterId=k['id'], why=f'over maxStorySearchesPerRun ({cap}); checked next hour')); continue
            queries.append(q)
        escalated.append(dict(clusterId=k['id'], keyword=k['keyword'], query=q, batch='e1', seq=queries.index(q)))
    (run / 'raw/e1-request.json').unlink(missing_ok=True)
    if queries: write_request(run, 'e1', [dict(id=XSEARCH, args=dict(words=q)) for q in queries], ['x.search'] * len(queries))
    write_json(run / 'escalated.json', dict(run=run.name, baseline=base.name, escalated=escalated, pending=pending))
    cands = {c['tokenId']: c for c in disc['candidates']}
    detail = []
    for e in escalated:
        k = next(x for x in disc['clusters'] if x['id'] == e['clusterId'])
        detail.append(dict(clusterId=k['id'], keyword=k['keyword'], search=f"e1:{e['seq']} {e['query']!r}", coins=k['size'],
                           combinedVolume24Usd=round(k['combinedVolume24Usd']), launchpads=k['launchpads'], overlapsNarratives=k['overlapsNarratives'],
                           members=[dict(symbol=m['symbol'], name=m['name'], volume24Usd=round(m['volume24Usd']), launchpad=cands.get(m['tokenId'], {}).get('launchpadSlug'),
                                         ageHours=cands.get(m['tokenId'], {}).get('ageHours'), description=(cands.get(m['tokenId'], {}).get('description') or '')[:160])
                                    for m in k['members']]))
    print(json.dumps(dict(run=run.name, clusters=len(disc['clusters']), candidates=len(disc['candidates']), toDecide=detail, pending=pending,
                          request='raw/e1-request.json' if queries else None), indent=1, ensure_ascii=False))


def followups(args):
    run = scout_run(args.run)
    if not (run / 'raw/e1.json').exists(): fail('follow-ups come after raw/e1.json is saved')
    if (run / 'raw/e2.json').exists(): fail('raw/e2.json is already saved')
    qs = [q.strip() for q in args.queries]
    limit = JOB['pagination']['maxFollowUpsPerRun']
    if not 1 <= len(qs) <= limit: fail(f'give 1 to {limit} follow-up searches')
    for q in qs:
        if not q or len(q) > 200: fail(f'follow-up search must be 1-200 characters: {q!r}')
        if names_blocked(q): fail(f'follow-up search names a blocked site or coin: {q!r}')
    write_request(run, 'e2', [dict(id=XSEARCH, args=dict(words=q)) for q in qs], ['x.search'] * len(qs))
    print(json.dumps(dict(run=run.name, request='raw/e2-request.json', searches=qs)))


# ---------------------------------------------------------------- publish
def saved_batches(run):
    out = {}
    for b in ('d1', 'd2', 'e1', 'e2'):
        f = run / f'raw/{b}.json'
        if not f.exists(): continue
        resp, req = read(f), read(run / f'raw/{b}-request.json')
        if resp.get('status') != 'completed': fail(f'raw/{b}.json is not a completed Frames run')
        calls = resp['result']['calls']
        if len(calls) != len(req['calls']) or any(c['tool_id'] != req['calls'][c['seq']]['id'] for c in calls): fail(f'raw/{b}.json does not answer raw/{b}-request.json')
        out[b] = (resp, req)
    for b in ('d1', 'd2'):
        if b not in out: fail(f'raw/{b}.json is missing')
    for f in (run / 'raw').glob('*.json'):
        if CREDENTIAL.search(f.read_text()): fail(f'credential-like text in raw/{f.name}')
    return out


def saved_posts(batches):
    posts = {}
    for b in ('e1', 'e2'):
        if b not in batches: continue
        resp, req = batches[b]
        for c in resp['result']['calls']:
            for tw in (c.get('body') or {}).get('tweets') or []:
                posts[(b, c['seq'], str(tw.get('id')))] = (tw, req['calls'][c['seq']]['args'].get('words'))
    return posts


def source_record(ref, posts, run):
    m = SOURCE_REF.match(ref or '')
    if not m: fail(f'source {ref!r} must look like "e1:0#<post id>"')
    b, seq, pid = m.group(1), int(m.group(2)), m.group(3)
    if (b, seq, pid) not in posts: fail(f'source {ref} is not a post saved in raw/{b}.json call {seq}')
    tw, query = posts[(b, seq, pid)]
    author = (tw.get('author') or {}).get('screen_name') or ''
    if not SCREEN_NAME.match(author): fail(f'source {ref} has no usable author handle')
    if names_blocked(tw): fail(f'source {ref} names a blocked site or coin (docs/data/blocked.json); cite another post')
    return dict(postId=pid, url=f'https://x.com/{author}/status/{pid}', author=author, authorName=((tw.get('author') or {}).get('name') or author)[:60],
                createdAt=tw.get('created_at'), text=(tw.get('text') or '')[:280], query=query, ref=f'{b}:{seq}', evidence=f'{rel(run)}/raw/{b}.json')


def validated_decisions(run, escalated, posts, have_e1):
    path = run / 'decisions.json'
    decisions = read(path) if path.exists() else {}
    if not isinstance(decisions, dict): fail('decisions.json must be an object keyed by cluster id')
    ids = {e['clusterId'] for e in escalated}
    if unknown := sorted(set(decisions) - ids): fail(f'decisions.json decides themes this run did not escalate: {unknown}')
    if have_e1 and (missing := sorted(ids - set(decisions))): fail(f'decisions.json needs a decision for every escalated theme; missing {missing}')
    out = {}
    for cid, d in decisions.items():
        if d.get('decision') not in ('confirmed', 'rejected', 'deferred'): fail(f'{cid}: decision must be confirmed, rejected or deferred')
        reason = (d.get('reason') or '').strip()
        if not 10 <= len(reason) <= 500: fail(f'{cid}: reason must be 10-500 characters')
        rec = dict(status=d['decision'], reason=reason, title=None, sourceSays=None, sources=[])
        if d['decision'] == 'confirmed':
            if not have_e1: fail(f'{cid}: confirmed without a saved story search')
            title, says = (d.get('title') or '').strip(), (d.get('sourceSays') or '').strip()
            if not 3 <= len(title) <= 80: fail(f'{cid}: confirmed needs a title of 3-80 characters')
            if not 20 <= len(says) <= 280: fail(f'{cid}: confirmed needs sourceSays of 20-280 characters (what the sources say, attributed)')
            refs = d.get('sources') or []
            if not 1 <= len(refs) <= 5 or len(set(refs)) != len(refs): fail(f'{cid}: confirmed needs 1-5 distinct sources')
            rec.update(title=title, sourceSays=says, sources=[source_record(r, posts, run) for r in refs])
        if names_blocked(rec): fail(f'{cid}: the decision names a blocked site or coin (docs/data/blocked.json)')
        out[cid] = rec
    return out


def narrative_names(base):
    names = {n['id']: dict(slug=n.get('slug'), title=n.get('title')) for n in read(base / 'narratives.json')}
    for nid, n in read(base / 'curation.json').get('newNarratives', {}).items():
        names.setdefault(nid, dict(slug=n.get('slug'), title=n.get('title')))
    return names


def age(c):
    """Hours since the coin's first pool, at the run time; a pool opened after the run started (the sweep runs minutes later) is 0."""
    return None if c.get('ageHours') is None else max(0.0, c['ageHours'])


def lead_from_cluster(k, cands, now, tracked):
    def member(m):
        c = cands.get(m['tokenId'], {})
        return dict(tokenId=m['tokenId'], symbol=m['symbol'][:24], name=(m['name'] or '')[:60], volume24Usd=round(m['volume24Usd'], 2),
                    launchpadSlug=c.get('launchpadSlug'), ageHours=age(c))
    members = sorted((member(m) for m in k['members'] if m['tokenId'] not in BLOCKED_IDS and m['tokenId'] not in tracked), key=lambda m: -m['volume24Usd'])
    return dict(id=k['id'], keyword=k['keyword'], size=len(members), combinedVolume24Usd=round(sum(m['volume24Usd'] for m in members), 2),
                launchpads=k['launchpads'], chains=k['chains'], overlapsNarratives=k['overlapsNarratives'], members=members[:12],
                firstSpottedAt=iso(now), lastSeenAt=iso(now))


def publish(args):
    run = scout_run(args.run); base = baseline(); now = ts(run.name)
    if not (run / 'escalated.json').exists() or not (run / 'discovery.json').exists(): fail('run scout.py check first')
    esc = read(run / 'escalated.json')
    batches = saved_batches(run)
    have_e1 = 'e1' in batches
    if (run / 'raw/e1-request.json').exists() != bool(esc['escalated']): fail('escalated.json and raw/e1-request.json disagree; re-run scout.py check')
    posts = saved_posts(batches)
    decisions = validated_decisions(run, esc['escalated'], posts, have_e1)
    disc = read(run / 'discovery.json'); cands = {c['tokenId']: c for c in disc['candidates']}
    memory, daily, narr = load_spotted(), daily_decisions(base), narrative_names(base)
    tracked_tokens = {u['tokenId']: u['narrativeId'] for u in REG['poolUniverse']}
    keep = lambda since, hours: since is not None and now - since <= hours * HOUR

    def settle(lead, state):
        """Apply a prior state (scout memory or daily decision) to a lead, carrying a confirmed lead's story and sources."""
        lead.update(status=state['status'], checkedAt=iso(state['checkedAt']) if state['checkedAt'] else None, volumeAtCheck=state['volumeAtCheck'],
                    reason=state['reason'], narrativeId=state['narrativeId'], decidedBy=state['by'])
        m = memory['leads'].get(lead['id'])
        if m and state['by'] == 'scout' and state['status'] in ('confirmed', 'tracked'):
            lead.update(title=m.get('title'), sourceSays=m.get('sourceSays'), sources=m.get('sources', []))

    leads = {}
    for k in disc['clusters']:
        lead = lead_from_cluster(k, cands, now, tracked_tokens)
        if lead['size'] == 0: continue
        m = memory['leads'].get(k['id'])
        if m: lead['firstSpottedAt'] = m['firstSpottedAt']
        lead.update(status='spotted', checkedAt=None, volumeAtCheck=None, reason=None, narrativeId=None, decidedBy=None, title=None, sourceSays=None, sources=[])
        if k['id'] in decisions:
            d = decisions[k['id']]
            lead.update(status=d['status'], checkedAt=iso(now), volumeAtCheck=lead['combinedVolume24Usd'], reason=d['reason'], decidedBy='scout',
                        title=d['title'], sourceSays=d['sourceSays'], sources=d['sources'])
        elif (state := prior_state(k['id'], memory, daily)) is not None:
            settle(lead, state)
        leads[k['id']] = lead
    for cid, m in memory['leads'].items():  # themes this sweep no longer shows
        if cid in leads: continue
        lead = dict(m)
        state = prior_state(cid, memory, daily)
        if state: settle(lead, state)
        # Tracked only when ONE narrative took at least half its coins: coins spread over several narratives say nothing about
        # this theme, and must not make an unchecked or rejected theme public.
        hits = [tracked_tokens[x['tokenId']] for x in lead['members'] if x['tokenId'] in tracked_tokens]
        top = max(set(hits), key=lambda n: (hits.count(n), n)) if hits else None
        if lead['status'] != 'tracked' and top and hits.count(top) * 2 >= len(lead['members']):
            lead.update(status='tracked', narrativeId=top, checkedAt=iso(now), decidedBy='daily',
                        reason='At least half of its coins joined this narrative in the daily refresh.')
        seen, checked = from_iso(lead['lastSeenAt']), from_iso(lead['checkedAt']) if lead.get('checkedAt') else None
        if (lead['status'] == 'confirmed' and keep(seen, CFG['keepConfirmedHours'])) or (lead['status'] == 'tracked' and keep(checked or seen, CFG['keepTrackedHours'])) \
                or (lead['status'] in ('rejected', 'deferred') and keep(checked, CFG['rememberDecisionsHours'])):
            leads[cid] = lead
    for lead in leads.values():
        n = narr.get(lead.get('narrativeId')) or {}
        lead.update(narrativeSlug=n.get('slug') if lead['status'] == 'tracked' else None, narrativeTitle=n.get('title') if lead['status'] == 'tracked' else None)
        if lead['status'] == 'tracked' and not lead.get('narrativeId'): lead['status'] = 'deferred'  # a decision without a narrative names nothing to show

    coins, seen_coins = [], {t: v for t, v in memory['coins'].items() if keep(from_iso(v['firstSpottedAt']), 2 * CFG['newCoinHours'])}
    lead_of = {}
    for lead in leads.values():
        if lead['lastSeenAt'] == iso(now):
            for x in lead['members']: lead_of.setdefault(x['tokenId'], []).append(lead['id'])
    for c in disc['candidates']:
        if not c['meetsMemberBar'] or age(c) is None or age(c) > CFG['newCoinHours']: continue
        if c['priorStatus'] in ('quarantined', 'removed') or c['tokenId'] in BLOCKED_IDS or names_blocked([c['address'], c['name'], c['symbol']]): continue
        if c['tokenId'] in tracked_tokens: continue  # already a narrative member (discover.py names skips tracked coins; this holds even if it did not)
        first = seen_coins.get(c['tokenId']) or dict(firstSpottedAt=iso(now), firstSpottedRun=run.name)
        seen_coins[c['tokenId']] = first
        coins.append(dict(tokenId=c['tokenId'], chain=c['chain'], address=c['address'], name=(c['name'] or '')[:60], symbol=(c['symbol'] or '')[:24],
                          launchpadSlug=c['launchpadSlug'], poolCreatedAt=iso(c['poolCreatedAt']) if c.get('poolCreatedAt') else None, ageHours=age(c),
                          volume24Usd=round(c['volume24Usd'], 2), mcapUsd=round(c['mcapUsd'], 2) if c.get('mcapUsd') else None,
                          firstSpottedAt=first['firstSpottedAt'], firstSpottedRun=first['firstSpottedRun'], leadIds=sorted(lead_of.get(c['tokenId'], []))))
    coins.sort(key=lambda c: (-c['volume24Usd'], c['tokenId']))
    coins = coins[:CFG['maxCoins']]

    order = {s: i for i, s in enumerate(('confirmed', 'tracked', 'spotted', 'deferred', 'rejected'))}
    out = dict(schema=SCHEMA, generatedAt=iso(now), scoutRun=run.name, baselineRun=base.name,
               evidence=[f'{rel(run)}/raw/{b}.json' for b in sorted(batches)],
               rules=dict(newCoinHours=CFG['newCoinHours'], freshWindowHours=CFG['freshWindowHours'],
                          memberBar=dict(minVolume24Usd=RULES['addMember']['minVolume24Usd'], minMcapUsd=RULES['addMember']['minMcapUsd']),
                          newNarrative=dict(minConstituents=RULES['newNarrative']['minConstituents'], minCombinedVolume24Usd=RULES['newNarrative']['minCombinedVolume24Usd'])),
               coins=coins, leads=sorted(leads.values(), key=lambda l: (order[l['status']], -l['combinedVolume24Usd'], l['id'])),
               seen=dict(coins=dict(sorted(seen_coins.items()))))
    check_output(out)

    write_json(SPOTTED, out)
    credits, led, day = record_run(run)
    by = {s: sum(1 for l in out['leads'] if l['status'] == s) for s in STATUSES}
    print(json.dumps(dict(run=run.name, spotted=rel(SPOTTED), coins=len(coins), leads=by, public=dict(coins=len(coins), leads=by['confirmed'] + by['tracked']),
                          credits=credits, overRunBudget=credits > JOB['budget']['maxCreditsPerRun'], dayCredits=spent_on(led, day),
                          maxCreditsPerDay=JOB['budget']['maxCreditsPerDay'])))


def billed_credits(run):
    """Credits Frames billed for the batches this run saved: one billing block per Frames run id."""
    billed = {}
    for b in ('d1', 'd2', 'e1', 'e2'):
        f = run / f'raw/{b}.json'
        if f.exists():
            resp = read(f)
            billed[resp['run_id']] = (resp.get('billing') or {}).get('charged_credits') or 0
    return sum(billed.values())


def record_run(run):
    """Adds a run's billed credits to the ledger (idempotent: keyed by run). Published or not, a paid batch counts."""
    credits, now = billed_credits(run), ts(run.name)
    led = load_ledger(); day = day_of(now)
    led['days'].setdefault(day, dict(runs={}))['runs'][run.name] = credits
    led['days'] = {d: v for d, v in sorted(led['days'].items()) if d >= day_of(now - LEDGER_DAYS * 86400)}
    led['maxCreditsPerDay'] = JOB['budget']['maxCreditsPerDay']
    write_json(LEDGER, led)
    return credits, led, day


def record(args):
    """For a run that stops after a paid call without publishing: count its spend so the day's budget stays true."""
    run = scout_run(args.run)
    credits, led, day = record_run(run)
    print(json.dumps(dict(run=run.name, recordedCredits=credits, ledger=rel(LEDGER), dayCredits=spent_on(led, day), maxCreditsPerDay=JOB['budget']['maxCreditsPerDay'])))


def check_output(out):
    ids = [c['tokenId'] for c in out['coins']]
    assert len(ids) == len(set(ids)), 'duplicate coin'
    assert len({l['id'] for l in out['leads']}) == len(out['leads']), 'duplicate lead'
    for c in out['coins']:
        assert c['volume24Usd'] >= 0 and (c['mcapUsd'] is None or c['mcapUsd'] >= 0) and 0 <= c['ageHours'] <= CFG['newCoinHours'], c['tokenId']
    for l in out['leads']:
        assert l['status'] in STATUSES, l['id']
        assert l['status'] != 'confirmed' or (l['title'] and l['sourceSays'] and l['sources']), f"{l['id']}: confirmed without its story and sources"
        assert l['status'] != 'tracked' or l['narrativeId'], f"{l['id']}: tracked without a narrative"
        assert all(s['url'].startswith('https://x.com/') for s in l.get('sources') or []), l['id']
    text = json.dumps(out)
    assert not names_blocked(out), f'spotted.json names blocked {names_blocked(out)}'
    assert not CREDENTIAL.search(text), 'credential-like text in spotted.json'
    assert math.isfinite(sum(c['volume24Usd'] for c in out['coins']))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='step', required=True)
    s = sub.add_parser('start'); s.add_argument('--at')
    for name in ('names', 'check', 'publish', 'record'): sub.add_parser(name).add_argument('run')
    f = sub.add_parser('followups'); f.add_argument('run'); f.add_argument('queries', nargs='+')
    args = ap.parse_args()
    dict(start=start, names=names, check=check, followups=followups, publish=publish, record=record)[args.step](args)


if __name__ == '__main__':
    main()
