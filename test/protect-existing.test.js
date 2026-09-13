import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {WorldCoordinator} from '../src/worker.js';
import {storageAdapter} from '../src/world-coordinator.js';
import {RECEIPT_TTL_MS, RECEIPT_CAPACITY} from '../src/receipts.js';

function storage() {
  const values = new Map();
  const api = {
    async get(k) { return structuredClone(values.get(k)); },
    async put(k,v) { values.set(k,structuredClone(v)); },
    async delete(k) { values.delete(k); },
    async list({prefix='',startAfter='',limit=1000}={}) {return new Map([...values].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit));},
    async setAlarm(v) { values.set('alarm',v); },
    async deleteAlarm() { values.delete('alarm'); },
    async transaction(fn) {
      const before = structuredClone(values);
      try {return await fn(api);} catch(e) {values.clear();for(const [k,v] of before) values.set(k,v);throw e;}
    }
  };
  return api;
}
async function harness() {
  const durable=storage(), projected=new Map(); let fail=false;
  const kv={async get(k){return projected.get(k)||null;},async put(k,v){if(fail)throw Error('offline');projected.set(k,v);},async delete(k){if(fail)throw Error('offline');projected.delete(k);},async list({prefix=''}){return {keys:[...projected.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true};}};
  let coordinator=new WorldCoordinator({storage:durable},{METRICS:kv});
  const send=body=>coordinator.fetch(new Request('https://coordinator',{method:'POST',body:JSON.stringify(body)}));
  await send({action:'import',entries:[['w:meta','{"n":0}']]});
  const env={METRICS:kv,WORLD_WRITE_MODE:'coordinated',WORLD_COORDINATOR:{idFromName:n=>n,get:()=>({fetch:r=>r.json().then(send)})}};
  const waits=[];
  const call=(path,body)=>worker.fetch(new Request('https://worldorder.club'+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),env,{waitUntil:p=>waits.push(p.catch(()=>{}))});
  const rpc=async(name,args)=>{const r=await call('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});const b=await r.json();return {error:b.result.isError,body:JSON.parse(b.result.content[0].text),response:r};};
  return {durable,projected,kv,env,call,rpc,send,waits,setFail(v){fail=v;},restart(){coordinator=new WorldCoordinator({storage:durable},{METRICS:kv});},alarm(){return coordinator.alarm();}};
}
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const place=(x=0,builder='A')=>({op:'place',x,y:0,z:0,type:'stone',builder});
const batch=(n,ops=[place()])=>({request_id:id(n),ops});
const sequence=async h=>JSON.parse(await storageAdapter(h.durable).get('w:changes')||'{"sequence":0}').sequence;

for (const transport of ['REST','MCP']) test(`${transport}: stale empty preview cannot overwrite an intervening commit, including lagging projection`,async()=>{
  const h=await harness();
  const plan={...batch(100),protect_existing:true};
  assert.equal((await (await h.call('/api/v1/preview',plan)).json()).summary.replaced,0);
  await h.call('/api/v1/batch',{ops:[place(0,'B')]});
  assert.equal((await (await h.call('/api/v1/preview',plan)).json()).summary.replaced,0);
  const before=await (await h.send({action:'export'})).json();
  const result=transport==='REST'?await h.call('/api/v1/batch',plan):await h.rpc('build',plan);
  const body=transport==='REST'?await result.json():result.body;
  assert.equal(transport==='REST'?result.status:result.error,transport==='REST'?409:true);
  assert.equal(body.error,'existing_cells_conflict');assert.deepEqual(body.conflicts,[{x:0,y:0,z:0}]);
  assert.deepEqual(await (await h.send({action:'export'})).json(),before);
  assert.equal((await h.rpc('get_build_receipt',{request_id:id(100)})).body.status,'rejected');
  await h.call('/api/v1/remove',{x:0,y:0,z:0});h.restart();h.setFail(true);
  const replay=await h.call('/api/v1/batch',plan);assert.equal(replay.status,409);
  assert.deepEqual(await replay.json(),{...body,replayed:true});
  assert.equal(await sequence(h),2);
  const changed=await h.call('/api/v1/batch',{...plan,protect_existing:false});
  assert.equal((await changed.json()).error,'request_id_conflict');
});

test('atomic protection spans chunks, deduplicates coordinates, and blocks same-type/same-builder and remove-place bypass',async()=>{
 const h=await harness();await h.call('/api/v1/batch',{ops:[place()]});await h.alarm();
 const before=await (await h.send({action:'export'})).json();
 for(const ops of [[place(40),place()], [{op:'remove',x:0,y:0,z:0},place()], [place(),place()]]) {
  const plan={ops,protect_existing:true};
  const preview=await h.call('/api/v1/preview',plan);assert.equal(preview.status,409);
  assert.equal((await h.rpc('preview_build',plan)).error,true);
  const r=await h.call('/api/v1/batch',plan);assert.equal(r.status,409);assert.equal((await r.json()).conflicts.length,1);
  assert.deepEqual(await (await h.send({action:'export'})).json(),before);
 }
});

test('initially empty ordered edits allowed; invalid operations alone do not conflict; default compatibility and false receipt identity',async()=>{
 const h=await harness();
 const r=await h.call('/api/v1/batch',{protect_existing:true,ops:[place(),{op:'remove',x:0,y:0,z:0},place()]});
 assert.equal(r.status,200);assert.equal((await r.json()).summary.placed,2);
 const invalid=await h.call('/api/v1/batch',{protect_existing:true,ops:[{...place(),type:'invalid'},place(40)]});
 assert.equal(invalid.status,200);assert.equal((await invalid.json()).summary.rejected,1);
 const ordinary=await h.call('/api/v1/batch',batch(101));assert.equal(ordinary.status,200);
 assert.equal((await ordinary.json()).summary.replaced,1);
 assert.equal((await (await h.call('/api/v1/batch',{...batch(101),protect_existing:false})).json()).replayed,true);
 assert.equal((await h.call('/api/v1/batch',{...batch(101),protect_existing:true})).status,409);
});

test('strict boolean validation and discoverable REST/MCP flag',async()=>{
 const h=await harness();
 for(const protect_existing of [null,0,1,'true',{},[]]) for(const route of ['batch','preview']) {
  assert.equal((await h.call('/api/v1/'+route,{ops:[place()],protect_existing})).status,400);
  assert.equal((await h.rpc(route==='batch'?'build':'preview_build',{ops:[place()],protect_existing})).body.error,'invalid_protect_existing');
 }
 const api=await (await h.call('/openapi.json')).json();
 for(const route of ['batch','preview']) assert.equal(api.paths['/api/v1/'+route].post.requestBody.content['application/json'].schema.properties.protect_existing.type,'boolean');
});
