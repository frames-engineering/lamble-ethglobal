#!/usr/bin/env python3
"""Save a completed Frames run's full JSON exactly as the MCP tool returned it.

Usage: python3 scripts/frames-refresh/save.py <run_id> <out.json>

Frames bodies are large; never transcribe them by hand. Claude Code stores oversized
tool results under ~/.claude/projects/*/<session>/tool-results/ and every tool result
in the session transcript (*.jsonl). This finds the newest completed result for run_id.
"""
import glob, json, os, sys

run_id, out = sys.argv[1], sys.argv[2]
home = os.path.expanduser('~/.claude/projects')


def completed(text):
    try:
        r = json.loads(text)
    except ValueError:
        return None
    return r if isinstance(r, dict) and r.get('run_id') == run_id and r.get('status') == 'completed' else None


def parts(text):  # persisted results are either the raw text or a JSON list of {"type": "text", "text": ...} parts
    try:
        v = json.loads(text)
    except ValueError:
        return text
    return ''.join(x.get('text', '') for x in v) if isinstance(v, list) else text


found = None
for f in sorted(glob.glob(f'{home}/*/*/tool-results/*.txt') + glob.glob(f'{home}/*/*/tool-results/*.json'), key=os.path.getmtime, reverse=True):
    with open(f, errors='replace') as fh:  # unrelated persisted results can hold a truncated multi-byte character
        text = fh.read()
    if run_id in text[:600] and (found := completed(parts(text))):
        break
if not found:
    for f in sorted(glob.glob(f'{home}/*/*.jsonl'), key=os.path.getmtime, reverse=True):
        for line in open(f, errors='replace'):
            if run_id not in line:
                continue
            content = json.loads(line).get('message', {}).get('content')
            for part in content if isinstance(content, list) else []:
                if part.get('type') == 'tool_result':
                    c = part['content']
                    found = completed(c if isinstance(c, str) else ''.join(x.get('text', '') for x in c)) or found
        if found:
            break
if not found:
    sys.exit(f'No completed result for {run_id}; poll frames_get_run until completed, then retry.')
with open(out, 'w') as fh:
    json.dump(found, fh, indent=1)
print(f'saved {out}: {found["status"]}, {found["billing"]["charged_credits"]} credits')
