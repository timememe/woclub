import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const origin = 'https://worldorder.club';
const order = (a, b) => a.x - b.x || a.z - b.z || a.y - b.y;
const coordinates = ({ x, y, z }) => ({ x, y, z });
const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');

function fixture(count) {
  // Interleave four chunk columns, then reverse insertion order. Storage order
  // must not affect page selection (sorting just a selected page is insufficient).
  const cubes = Array.from({ length: count }, (_, i) => ({ x: i % 64, z: Math.floor(i / 64) % 64, y: Math.floor(i / 4096) }));
  const chunks = new Map();
  for (const { x, y, z } of [...cubes].reverse()) {
    const key = `w:c:${Math.floor(x / 32)}:${Math.floor(z / 32)}`;
    if (!chunks.has(key)) chunks.set(key, {});
    chunks.get(key)[`${x},${y},${z}`] = [0, 'fixture', 1];
  }
  const store = new Map([...chunks].map(([key, value]) => [key, JSON.stringify(value)]));
  store.set('w:meta', JSON.stringify({ count }));
  store.set('w:changes', JSON.stringify({ seq: 1, events: [] }));
  const writes = [];
  let reads = 0;
  const kv = {
    async get(key) { reads++; return store.get(key) ?? null; },
    async put(key, value) { writes.push(key); store.set(key, value); },
    async list() { return { keys: [], list_complete: true }; }
  };
  return { kv, store, writes, cubes: cubes.sort(order), reads: () => reads };
}

async function request(f, params, mcp = false) {
  const pending = [];
  const ctx = { waitUntil: p => pending.push(p) };
  const req = mcp ? new Request(`${origin}/mcp`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'MCP-Protocol-Version': '2025-06-18' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_region', arguments: params } })
  }) : new Request(`${origin}/api/v1/region?${new URLSearchParams(params)}`);
  const res = await worker.fetch(req, { METRICS: f.kv }, ctx);
  await Promise.all(pending);
  const body = await res.json();
  return { status: res.status, data: mcp ? body.result.structuredContent : body, error: mcp ? body.result.isError : res.status === 400 };
}
const box = { x: 0, z: 0, w: 64, d: 64 };

test('static region traversal is complete at cap boundaries and across multiple pages/chunks', async () => {
  for (const count of [0, 8191, 8192, 8193, 20000]) {
    const f = fixture(count);
    const before = new Map(f.store);
    const found = [];
    const cursors = new Set();
    let cursor;
    do {
      const { status, data } = await request(f, { ...box, ...(cursor ? { cursor } : {}) });
      assert.equal(status, 200);
      assert.deepEqual(data.box, { x: 0, y: 0, z: 0, w: 64, h: 1000, d: 64 });
      assert.equal(data.count, Math.min(8192, count - found.length));
      assert.equal(data.truncated, count - found.length > 8192);
      assert.equal(data.next_cursor !== null, data.truncated);
      found.push(...data.cubes.map(coordinates));
      cursor = data.next_cursor;
      if (cursor) { assert.ok(!cursors.has(cursor)); cursors.add(cursor); assert.ok(cursor.length <= 256); }
    } while (cursor);
    assert.deepEqual(found, f.cubes, `complete ordered traversal of ${count}`);
    for (const [key, value] of before) assert.equal(f.store.get(key), value);
    assert.ok(f.writes.every(key => !key.startsWith('w:')));
  }
});

test('REST and MCP return identical small pages with accurate lookahead and preserve world/activity', async () => {
  const f = fixture(257);
  const before = new Map(f.store);
  const found = [];
  let cursor;
  do {
    const params = { ...box, limit: 37, ...(cursor ? { cursor } : {}) };
    const rest = await request(f, params);
    const mcp = await request(f, params, true);
    assert.equal(rest.status, 200);
    assert.ok(!mcp.error);
    assert.deepEqual(mcp.data, rest.data);
    found.push(...rest.data.cubes.map(coordinates));
    cursor = rest.data.next_cursor;
  } while (cursor);
  assert.deepEqual(found, f.cubes);
  for (const [key, value] of before) assert.equal(f.store.get(key), value);
  assert.ok(f.writes.every(key => !key.startsWith('w:')));
});

test('region cursors reject malformed, oversized, noncanonical, out-of-box and mismatched state before chunk reads', async () => {
  const f = fixture(5);
  const good = (await request(f, { ...box, limit: 1 })).data.next_cursor;
  const parsed = JSON.parse(Buffer.from(good, 'base64url'));
  const invalid = ['', '!', 'a'.repeat(257), good + '=', encode(null), encode({}), encode([...parsed, 1]),
    encode([2, ...parsed.slice(1)]), encode([...parsed.slice(0, 7), -1, 0, 0]),
    encode([...parsed.slice(0, 7), 64, 0, 0]), encode([...parsed.slice(0, 7), 0.5, 0, 0]),
    Buffer.from(' ' + JSON.stringify(parsed)).toString('base64url')];
  for (const cursor of invalid) {
    const reads = f.reads();
    const rest = await request(f, { ...box, cursor });
    assert.equal(rest.status, 400);
    assert.equal(rest.data.error, 'invalid_cursor');
    assert.equal(f.reads(), reads);
    const mcp = await request(f, { ...box, cursor }, true);
    assert.equal(mcp.error, true);
    assert.equal(mcp.data.error, rest.data.error);
  }
  for (const key of ['x', 'z', 'w', 'd', 'y', 'h']) {
    const changed = { ...box, y: 0, h: 1000 };
    changed[key] += key === 'h' ? -1 : 1;
    assert.equal((await request(f, { ...changed, cursor: good })).data.error, 'invalid_cursor');
  }
  for (const cursor of [null, [], [good], 1, {}]) {
    assert.equal((await request(f, { ...box, cursor }, true)).data.error, 'invalid_cursor');
  }
});

test('region continuation survives boundary deletion, limit changes, normalized equivalent boxes and empty final pages', async () => {
  const f = fixture(5);
  const first = (await request(f, { ...box, limit: 1 })).data;
  const chunk = JSON.parse(f.store.get('w:c:0:0'));
  delete chunk['0,0,0'];
  f.store.set('w:c:0:0', JSON.stringify(chunk));
  const params = { ...box, x: -1, y: 0, h: 1000, limit: 4, cursor: first.next_cursor };
  const second = (await request(f, params)).data;
  assert.deepEqual(second.cubes.map(coordinates), f.cubes.slice(1));
  assert.equal(second.truncated, false);
  assert.equal(second.next_cursor, null);
  f.store.set('w:c:0:0', '{}');
  const empty = (await request(f, params)).data;
  assert.equal(empty.count, 0);
  assert.equal(empty.next_cursor, null);
  assert.equal(empty.truncated, false);
  const edge = await request(f, { x: 990, z: 990, w: 1000, d: 1000, cursor: encode([1,990,0,990,999,999,999,991,0,991]) });
  assert.equal(edge.status, 200);
});

test('pagination preserves the 128-chunk ceiling and strictly bounds page size', async () => {
  const f = fixture(0);
  for (const limit of ['', 0, -1, 8193, 1.5, '1e2', '01', 'Infinity', ' '.repeat(100)]) {
    const result = await request(f, { ...box, limit });
    assert.equal(result.status, 400);
    assert.equal(result.data.error, 'invalid_limit');
  }
  for (const limit of [null, [], '2', 1.5, 8193]) {
    assert.equal((await request(f, { ...box, limit }, true)).data.error, 'invalid_limit');
  }
  assert.equal((await request(f, { x: 0, z: 0, w: 512, d: 256, limit: 1 })).status, 200);
  const large = await request(f, { x: 0, z: 0, w: 513, d: 256, limit: 1 });
  assert.equal(large.status, 400);
  assert.equal(large.data.error, 'region_too_large');
});
