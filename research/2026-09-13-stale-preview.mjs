// Offline research only: real Worker/coordinator with controlled durable storage and KV.
// No network requests or production mutations. Run: node research/2026-09-13-stale-preview.mjs
import assert from 'node:assert/strict';
import worker, {WorldCoordinator} from '../src/worker.js';
function storage() {
  const values = new Map();
  const api = {
    async get(k) { return structuredClone(values.get(k)); },
    async put(k,v) { values.set(k,structuredClone(v)); },
    async delete(k) { values.delete(k); },
    async list({prefix='',startAfter='',limit=1000}={}) {return new Map([...values].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit));},
    async setAlarm(v) { values.set('alarm',v); },
    async deleteAlarm() { values.delete('alarm'); },
    async transaction(fn) {
      const before = structuredClone(values);
      try {return await fn(api);} catch(e) {values.clear();for(const [k,v] of before) values.set(k,v);throw e;}
    }
  };
  return api;
}
async function harness(entries=[['w:meta','{"n":0}']]) {
  const durable = storage(), projected = new Map();
  let fail = false;
  const kv = {async get(k){return projected.get(k)||null;}, async put(k,v){if(fail)throw Error('offline');projected.set(k,v);},async delete(k){if(fail)throw Error('offline');projected.delete(k);},async list({prefix=''}){return {keys:[...projected.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true};}};
  let coordinator = new WorldCoordinator({storage:durable},{METRICS:kv});
  const send = async body => {const r=await coordinator.fetch(new Request('https://coordinator',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};};
  await send({action:'import',entries});
  return {send, durable, projected, kv, setFail(v){fail=v;}, restart(){coordinator=new WorldCoordinator({storage:durable},{METRICS:kv});}, alarm(){return coordinator.alarm();}};
}


const results = [];
for (const transport of ['REST', 'MCP']) {
 const h = await harness();
 const env = {METRICS:h.kv, WORLD_WRITE_MODE:'coordinated', WORLD_COORDINATOR:{
  idFromName:n=>n, get:()=>({fetch:async request=>{
   const r=await h.send(await request.json());return Response.json(r.body,{status:r.status});
  }})
 }};
 const call = async (kind, body) => {
  const mcp = transport === 'MCP';
  const r = await worker.fetch(new Request('https://worldorder.club'+(mcp?'/mcp':'/api/v1/'+kind), {
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(mcp?{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:kind==='preview'?'preview_build':'build',arguments:body}}:body)
  }),env);
  assert.equal(r.status,200);
  const data=await r.json();
  return mcp?JSON.parse(data.result.content[0].text):data;
 };
 const place = (type='stone') => ({op:'place',x:8,y:0,z:8,type});
 const a={builder:'offline-A',ops:[place()]};
 const emptyPreview=await call('preview',a);
 assert.equal(emptyPreview.summary.replaced,0);
 await call('batch',{builder:'offline-B',ops:[place('gold')]});
 // Deliberately do not run the projection alarm: another fresh preview can still see empty KV.
 const laggingPreview=await call('preview',a);
 assert.equal(laggingPreview.summary.replaced,0);
 await h.alarm();
 const freshPreview=await call('preview',a);
 assert.equal(freshPreview.summary.replaced,1);
 const commit=await call('batch',a);await h.alarm();
 assert.equal(commit.summary.replaced,1);
 const cube=(await (await worker.fetch(new Request('https://worldorder.club/api/v1/cube?x=8&y=0&z=8'),env)).json()).cube;
 assert.equal(cube.builder,'offline-A');
 const changes=JSON.parse(h.projected.get('w:changes'));
 assert.equal(changes.sequence,2);
 // Replacements can also be ordered edits within a batch, even when the initial cell is empty.
 const duplicate=await call('preview',{ops:[{...place(),x:9},{...place('gold'),x:9}]});
 assert.equal(duplicate.cells[0].before,null);assert.equal(duplicate.summary.replaced,1);
 // Removing an existing cube before placing hides displacement from summary.replaced.
 const removePlace=await call('preview',{ops:[{op:'remove',x:8,y:0,z:8},place('wood')]});
 assert.equal(removePlace.summary.replaced,0);assert.equal(removePlace.summary.removed,1);
 results.push({transport,emptyPreview:emptyPreview.summary,laggingPreview:laggingPreview.summary,
 freshPreview:freshPreview.summary,commit:commit.summary,finalBuilder:cube.builder,activitySequence:changes.sequence,
 orderedEditOnInitiallyEmpty:{summary:duplicate.summary,before:duplicate.cells[0].before},
 removeThenPlaceOnInitiallyOccupied:{summary:removePlace.summary,before:removePlace.cells[0].before}});
}
assert.deepEqual({...results[0],transport:null},{...results[1],transport:null});
console.log(JSON.stringify({scenario:'Offline preview/commit race and replacement accounting',results,
 conclusion:'REST and MCP both overwrite an intervening builder. Preview may lag even after that commit. Replacement counts include in-batch edits and exclude remove-then-place displacement; they are not an initial-occupancy protection policy.'},null,2));
