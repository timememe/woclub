// Offline only: real handlers, synthetic legal worlds and a counted KV adapter.
// Run: node research/2026-09-14-global-read-budget.mjs
import worker from '../src/worker.js';
import assert from 'node:assert/strict';

async function probe(count, route, budget = Infinity, warm = false) {
  const data = new Map();
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(i / 32), cz = i % 32;
    data.set(`w:c:${cx}:${cz}`, JSON.stringify({[`${cx*32},0,${cz*32}`]: [0, 'WOCLUB-offline-fixture', 1]}));
  }
  data.set('w:meta', JSON.stringify({n: count}));
  const original = new Map(data);
  let ops = [], failures = [], pending = [];
  const tick = (kind, key) => {
    ops.push({kind, key});
    if (ops.length > budget) throw new Error('synthetic_kv_operation_budget_exceeded');
  };
  const kv = {
    async get(key) { tick('get', key); return data.get(key) ?? null; },
    async put(key, value) { tick('put', key); data.set(key, value); },
    async list({prefix, limit, cursor}) {
      tick('list', prefix);
      const keys = [...data.keys()].filter(k => k.startsWith(prefix)).sort();
      const start = Number(cursor || 0), end = start + limit;
      return { keys: keys.slice(start, end).map(name => ({name})), list_complete: end >= keys.length, cursor: String(end) };
    }
  };
  const context = {waitUntil(p) { pending.push(p.catch(e => failures.push(e.message))); }};
  const invoke = () => worker.fetch(new Request(`https://worldorder.club${route}`), {METRICS: kv}, context);
  if (warm) { await invoke(); await Promise.all(pending); ops = []; failures = []; pending = []; }
  let result;
  try {
    const response = await invoke(), body = await response.json();
    result = {status: response.status, cubes: body.cubes, cached: body.cached, truncated: body.truncated};
  } catch (e) { result = {thrown: e.message}; }
  await Promise.all(pending);
  for (const [key, value] of original) assert.equal(data.get(key), value);
  return {fixture_cubes: count, fixture_chunks: count, route, budget: Number.isFinite(budget) ? budget : 'unlimited', warm,
    ...result, operations: ops.length, chunk_gets: ops.filter(o => o.kind === 'get' && o.key.startsWith('w:c:')).length,
    list_calls: ops.filter(o => o.kind === 'list').length, cache_puts: ops.filter(o => o.kind === 'put' && o.key === 'w:ov').length,
    background_failures: failures, world_unchanged: true};
}
const results = [];
for (const count of [1, 998, 999, 1000, 1024]) {
  for (const route of ['/api/v1/overview?format=sparse', '/api/v1/stats']) {
    results.push(await probe(count, route));
    results.push(await probe(count, route, 1000));
  }
}
results.push(await probe(1024, '/api/v1/overview?format=sparse', Infinity, true));
assert.equal(results.find(r => r.fixture_chunks === 1024 && r.route.includes('overview') && r.budget === 'unlimited' && !r.warm).chunk_gets, 1024);
assert.ok(results.some(r => r.fixture_chunks === 999 && r.thrown));
console.log(JSON.stringify({source_commit: 'f3ce2c4', scope: 'Synthetic operation accounting, not a production load test or latency benchmark',
  platform_reference: 'https://developers.cloudflare.com/kv/platform/limits/', max_legal_chunk_columns: 32 * 32, results}, null, 2));
