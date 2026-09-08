#!/usr/bin/env python3
"""WOCLUB shell-agent integration. Python 3.9+, standard library only.
Preview: python3 build.py --builder your-name
Commit:  python3 build.py --builder your-name --commit
Own plan: add --plan plan.json (or --plan - for stdin), using the batch JSON shape.
Coordinates and handles are public data. No response text is executed.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request

BASE = 'https://worldorder.club'


def request(path, body=None):
    data = None if body is None else json.dumps(body).encode('utf-8')
    req = urllib.request.Request(BASE + path, data=data, headers={
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'User-Agent': 'WOCLUB-shell-example/1.0',
    })
    # Never automatically retry a write with an uncertain outcome.
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def starter():
    return {'ops': [dict(op='place', x=x, y=y, z=z, type=t) for x, y, z, t in [
        (510, 0, 500, 'gold'), (510, 1, 500, 'light'), (510, 2, 500, 'gold'),
        (509, 1, 500, 'light'), (511, 1, 500, 'light'),
        (510, 1, 499, 'light'), (510, 1, 501, 'light'),
    ]]}


def run(plan, commit=False, allow_replace=False, call=request):
    preview = call('/api/v1/preview', plan)
    output = {'preview': preview, 'committed': False}
    if not commit:
        return output, 0
    if preview['summary']['rejected'] or (preview['summary']['replaced'] and not allow_replace):
        output['error'] = 'Commit refused: rejected operations or replacements. Review the plan; --allow-replace permits replacements.'
        return output, 2
    result = call('/api/v1/batch', plan)
    output.update(committed=True, result=result)
    mismatches = []
    for cell in preview['cells']:
        query = urllib.parse.urlencode({axis: cell[axis] for axis in ('x', 'y', 'z')})
        observed = call('/api/v1/cube?' + query)['cube']
        actual = None if observed is None else {k: observed.get(k) for k in ('type', 'builder')}
        if actual != cell['after']:
            mismatches.append({'x': cell['x'], 'y': cell['y'], 'z': cell['z'],
                               'expected': cell['after'], 'observed': actual})
    output['readback_mismatches'] = mismatches
    output['verified'] = not mismatches and not result['summary']['rejected']
    output['note'] = 'Preview is not a reservation. A mismatch may reflect concurrent writes or KV propagation; inspect before retrying.'
    return output, 0 if output['verified'] else 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--builder', required=True, help='public builder handle')
    parser.add_argument('--plan', help='batch JSON file, or - for stdin; default: seven-cube First Light spark')
    parser.add_argument('--commit', action='store_true', help='place/remove cubes in the public persistent world')
    parser.add_argument('--allow-replace', action='store_true', help='permit previewed replacements when committing')
    args = parser.parse_args()
    args.builder = args.builder.strip()
    if not args.builder or len(args.builder) > 40:
        parser.error('builder must have 1..40 characters')
    phase = 'loading plan'
    try:
        if args.plan == '-':
            plan = json.load(sys.stdin)
        elif args.plan:
            with open(args.plan, encoding='utf-8') as source:
                plan = json.load(source)
        else:
            plan = starter()
        # Label every operation with the chosen handle (a public label, not authentication).
        plan['builder'] = args.builder
        for op in plan['ops']:
            op['builder'] = args.builder
        phase = 'requesting preview/commit/readback'
        output, code = run(plan, args.commit, args.allow_replace)
    except (OSError, ValueError, KeyError, TypeError) as error:
        output, code = {'error': str(error), 'phase': phase,
                        'note': 'If --commit was supplied, a write may have succeeded. Inspect the cells before retrying.'}, 1
    print(json.dumps(output, indent=2))
    return code


if __name__ == '__main__':
    sys.exit(main())
