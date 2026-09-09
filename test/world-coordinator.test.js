import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {WorldCoordinator} from '../src/worker.js';
import {storageAdapter} from '../src/world-coordinator.js';

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
const place=(x,builder='a')=>({op:'place',x,y:0,z:0,type:'stone',builder});

test('durable coordinator preserves concurrent same/different chunk writes and distinct activity',async()=>{
  for(const x of [1,32]){
    const h=await harness();
    const results=await Promise.all([h.send({action:'ops',ops:[place(0)]}),h.send({action:'ops',ops:[place(x)]})]);
    assert.ok(results.every(r=>r.status===200&&r.body.added===1));
    await h.alarm();
    assert.equal(JSON.parse(h.projected.get('w:meta')).n,2);
    const log=JSON.parse(h.projected.get('w:changes'));
    assert.equal(log.events.length,2);assert.equal(new Set(log.events.map(e=>e.cursor)).size,2);
    let n=0;for(const [k,v] of h.projected)if(k.startsWith('w:c:'))n+=Object.keys(JSON.parse(v)).length;
    assert.equal(n,2);
  }
});

test('clear versus place and capacity contention preserve serialized ordered semantics',async()=>{
  const h=await harness();
  await h.send({action:'ops',ops:[place(0)]});
  const results=await Promise.all([h.send({action:'clear',builder:'a'}),h.send({action:'ops',ops:[place(32,'b')]})]);
  assert.equal(results[0].body.removed,1);await h.alarm();
  assert.equal(JSON.parse(h.projected.get('w:meta')).n,1);
  assert.equal(JSON.parse(h.projected.get('w:c:1:0'))['32,0,0'][1],'b');
  const full=await harness([['w:meta','{"n":749999}']]);
  const responses=await Promise.all([full.send({action:'ops',ops:[place(0)]}),full.send({action:'ops',ops:[place(32)]})]);
  assert.equal(responses[0].body.added,1);assert.equal(responses[1].body.results[0].error,'world_full');
  const chain=await full.send({action:'ops',ops:[{op:'remove',x:0,y:0,z:0},place(32),{...place(33),type:'invalid'}]});
  assert.deepEqual(chain.body.summary,{placed:1,removed:1,replaced:0,rejected:1});
});

test('committed state survives restart and failed projection without duplicate events',async()=>{
  const h=await harness();h.setFail(true);
  assert.equal((await h.send({action:'ops',ops:[place(0)]})).status,200);
  h.restart();await assert.rejects(h.alarm(),/offline/);
  assert.equal((await h.send({action:'ops',ops:[place(32)]})).status,503);
  h.setFail(false);await h.alarm();await h.alarm();
  assert.equal(JSON.parse(h.projected.get('w:changes')).sequence,1);
  assert.equal((await h.send({action:'ops',ops:[place(32)]})).status,200);
  await h.alarm();assert.equal(JSON.parse(h.projected.get('w:changes')).sequence,2);
  assert.equal(JSON.parse(h.projected.get('w:meta')).n,2);
});

test('import is idempotent and large values roundtrip across durable segments',async()=>{
  const h=await harness();
  assert.equal((await h.send({action:'import',entries:[['w:meta','{"n":99}']]})).body.already_initialized,true);
  assert.equal((await h.send({action:'status'})).body.meta.n,0);
  const kv=storageAdapter(h.durable), value='世界'.repeat(70000);
  await kv.put('w:c:0:0',value);assert.equal(await kv.get('w:c:0:0'),value);
  await kv.put('w:c:0:0','short');assert.equal(await kv.get('w:c:0:0'),'short');
  await kv.delete('w:c:0:0');assert.equal(await kv.get('w:c:0:0'),null);
});

test('REST and MCP route writes to same coordinator; maintenance gates both; preview never calls coordinator',async()=>{
  const h=await harness();let calls=0;
  const env={METRICS:h.kv,WORLD_WRITE_MODE:'coordinated',WORLD_COORDINATOR:{idFromName:n=>n,get:n=>{assert.equal(n,'world');return {async fetch(r){calls++;const result=await h.send(await r.json());return Response.json(result.body,{status:result.status});}};}}};
  const post=body=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await worker.fetch(new Request('https://worldorder.club/api/v1/place',post(place(0))),env)).status,200);
  const rpc={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'place_cube',arguments:place(32)}};
  const req=()=>new Request('https://worldorder.club/mcp',{...post(rpc),headers:{'content-type':'application/json','mcp-protocol-version':'2025-06-18'}});
  const mcp=await worker.fetch(req(),env);const body=await mcp.json();assert.equal(body.result.isError,false);
  assert.equal(calls,2);
  await worker.fetch(new Request('https://worldorder.club/api/v1/preview',post({ops:[place(5)]})),env);assert.equal(calls,2);
  env.WORLD_WRITE_MODE='paused';
  assert.equal((await worker.fetch(new Request('https://worldorder.club/api/v1/place',post(place(3))),env)).status,503);
  const paused=await (await worker.fetch(req(),env)).json();assert.equal(paused.result.isError,true);assert.equal(calls,2);
});
