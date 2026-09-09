// Offline only: reproduce overlapping reads through the real Worker handler.
import worker from '../src/worker.js';
import assert from 'node:assert/strict';
const origin = 'https://worldorder.club';
async function scenario(secondX, concurrent) {
  const store = new Map();
  let arrived = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const kv = {
    async get(key) {
      const value = store.get(key) ?? null;
      if (concurrent && key.startsWith('w:c:') && arrived < 2) {
        if (++arrived === 2) release();
        await barrier;
      }
      return value;
    },
    async put(key, value) { store.set(key, String(value)); },
    async delete(key) { store.delete(key); },
    async list({prefix = ''} = {}) { return {keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({name})), list_complete: true}; }
  };
  const pending = [];
  async function call(path, body) {
    const response = await worker.fetch(new Request(origin + path, body ? {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)} : {}), {METRICS:kv}, {waitUntil:p => pending.push(p)});
    return {status: response.status, body: await response.json()};
  }
  const place = x => call('/api/v1/place', {x,y:0,z:0,type:'stone',builder:'WOCLUB-offline-probe'});
  const responses = concurrent ? await Promise.all([place(0), place(secondX)]) : [await place(0), await place(secondX)];
  await Promise.allSettled(pending);
  const cells = await Promise.all([0, secondX].map(x => call(`/api/v1/cube?x=${x}&y=0&z=0`)));
  const chunks = [...store].filter(([k]) => k.startsWith('w:c:'));
  return {second_x:secondX, concurrent, responses, cells, persisted_cube_count:chunks.reduce((n,[,v]) => n + Object.keys(JSON.parse(v)).length,0), meta:JSON.parse(store.get('w:meta')), changes:JSON.parse(store.get('w:changes'))};
}
const cases = [await scenario(1,false), await scenario(1,true), await scenario(32,true)];
assert.equal(cases[0].persisted_cube_count,2);
assert.equal(cases[1].persisted_cube_count,1);
assert.equal(cases[2].persisted_cube_count,2);
console.log(JSON.stringify({source_commit:'642efca',kind:'synthetic forced overlap; no production writes',cases},null,2));
