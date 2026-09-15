import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const origin = 'https://worldorder.club';
// Any world access fails: generation must be a pure, bounded operation.
const env = {METRICS: new Proxy({}, {get() { throw new Error('unexpected KV access'); }}), WORLD_WRITE_MODE: 'coordinated', WORLD_COORDINATOR: new Proxy({}, {get() { throw new Error('unexpected coordinator access'); }})};
async function rest(id, query) {
  const response = await worker.fetch(new Request(`${origin}/api/v1/templates/${id}?${query}`), env, {});
  return {status: response.status, data: await response.json(), headers: response.headers};
}
async function mcp(args) {
  const response = await worker.fetch(new Request(`${origin}/mcp`, {method:'POST', headers:{'content-type':'application/json', 'MCP-Protocol-Version':'2025-06-18'}, body: JSON.stringify({jsonrpc:'2.0', id:1, method:'tools/call', params:{name:'get_template', arguments:args}})}), env, {});
  const json = await response.json();
  assert.ok(json.result, JSON.stringify(json));
  return json.result;
}

test('all templates and rotations produce identical bounded REST/MCP plans without storage', async () => {
  for (const id of ['pillar','arch','staircase','room-5x5','letter-w']) for (const rotation of [0,90,180,270]) {
    const args = {id, x:31,y:20,z:31,rotation,type:'glass',builder:'  maker  '};
    const {id: _, ...query} = args;
    const http = await rest(id, new URLSearchParams(query));
    const rpc = await mcp(args);
    assert.equal(http.status, 200);
    assert.equal(http.headers.get('cache-control'), 'no-store');
    assert.equal(rpc.isError, false);
    assert.deepEqual(rpc.structuredContent, http.data);
    const {body, cube_count, observation_region:r} = http.data;
    assert.equal(body.protect_existing, true);
    assert.equal(body.builder, 'maker');
    assert.ok(cube_count > 0 && cube_count <= 512);
    assert.equal(new Set(body.ops.map(p => `${p.x},${p.y},${p.z}`)).size, cube_count);
    for (const p of body.ops) {
      assert.equal(p.type, 'glass');
      assert.ok(p.x >= r.x && p.x < r.x+r.w && p.y >= r.y && p.y < r.y+r.h && p.z >= r.z && p.z < r.z+r.d);
    }
    assert.deepEqual([Math.min(...body.ops.map(p=>p.x)), Math.min(...body.ops.map(p=>p.y)), Math.min(...body.ops.map(p=>p.z))], [31,20,31]);
  }
});

test('asymmetric staircase rotation preserves handedness and height', async () => {
  const cases = [[0,[107,7,100]], [90,[100,7,107]], [180,[100,7,100]], [270,[100,7,100]]];
  for (const [rotation, top] of cases) {
    const {data} = await rest('staircase', `x=100&y=0&z=100&rotation=${rotation}`);
    assert.equal(data.cube_count,36);
    assert.deepEqual(data.body.ops.filter(p=>p.y===7).map(p=>[p.x,p.y,p.z]),[top]);
    const bottomOnly = data.body.ops.filter(p=>p.y===0);
    assert.equal(bottomOnly.length,8);
    assert.equal(data.observation_region[rotation%180 === 0 ? 'w':'d'],8);
  }
});

test('room plan removes repeated corners and keeps doorway open', async () => {
  const {data} = await rest('room-5x5', 'x=0&y=0&z=0');
  assert.equal(data.cube_count,61); // Four 16-cell wall perimeters, minus the three-cell doorway.
  assert.equal(data.body.builder,'your-handle');
  assert.equal(data.body.ops.some(p=>p.x===2 && p.z===0 && p.y<3),false);
  assert.equal(data.body.ops.some(p=>p.x===2 && p.z===0 && p.y===3),true);
});

test('world-edge plans fit exactly or fail wholly', async () => {
  assert.equal((await rest('pillar','x=999&y=992&z=999')).status,200);
  for (const query of ['x=999&y=993&z=999','x=994&y=0&z=999']) {
    const result = await rest(query.includes('993') ? 'pillar':'arch',query);
    assert.equal(result.status,400);
    assert.equal(result.data.error,'template_out_of_bounds');
    assert.equal(result.data.body,undefined);
  }
  assert.equal((await rest('arch','x=999&y=993&z=993&rotation=90')).status,200);
});

test('reject malformed, duplicate, unknown and incorrectly typed arguments', async () => {
  for (const suffix of ['&rotation=45','&x=1','&rotation=','&rotation=1e2','&type=evil','&builder='+ 'a'.repeat(41),'&url=https://example.com']) {
    assert.equal((await rest('arch','x=0&y=0&z=0'+suffix)).status,400,suffix);
  }
  for (const x of ['','-1','1000','01','0.1','NaN']) assert.equal((await rest('arch',`x=${x}&y=0&z=0`)).status,400);
  assert.equal((await rest('arch','x=0&z=0')).status,400);
  assert.equal((await rest('missing','x=0&y=0&z=0')).status,404);
  for (const extra of [{rotation:null},{rotation:'90'},{x:'0'},{builder:{}},{type:null},{url:'https://example.com'}]) {
    assert.equal((await mcp({id:'arch',x:0,y:0,z:0,...extra})).isError,true);
  }
});

test('builder text remains inert JSON data', async () => {
  const builder = '<script>fetch("https://x")</script>';
  const result = await rest('pillar',new URLSearchParams({x:0,y:0,z:0,builder}));
  assert.equal(result.status,200);
  assert.equal(result.data.body.builder,builder);
  assert.equal((await rest('pillar','x=0&y=0&z=0&builder=%20')).data.body.builder,'');
});
