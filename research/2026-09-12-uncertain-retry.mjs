// Offline research only: real Worker/coordinator with controlled durable storage and KV.
// No network requests or production mutations. Run: node research/2026-09-12-uncertain-retry.mjs
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

const h = await harness();
const env = {METRICS:h.kv, WORLD_WRITE_MODE:'coordinated', WORLD_COORDINATOR:{
  idFromName:n=>n, get:()=>({fetch:async request=>{
    const r=await h.send(await request.json());return Response.json(r.body,{status:r.status});
  }})
}};
const plan = builder => ({builder,ops:[{op:'place',x:8,y:0,z:8,type:'stone'}]});
const post = async body => {
  const r=await worker.fetch(new Request('https://worldorder.club/api/v1/batch',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
  }),env);assert.equal(r.status,200);return r.json();
};
const cell = async () => (await (await worker.fetch(new Request('https://worldorder.club/api/v1/cube?x=8&y=0&z=8'),env)).json()).cube;
const firstResponse=await post(plan('offline-A'));
// Pretend the transport dropped firstResponse after the durable commit.
const beforeProjection=await cell();
assert.equal(beforeProjection,null);
h.restart();await h.alarm();
const afterRestart=await cell();assert.equal(afterRestart.builder,'offline-A');
await post(plan('offline-B'));await h.alarm();
const afterOtherBuilder=await cell();assert.equal(afterOtherBuilder.builder,'offline-B');
const retryResponse=await post(plan('offline-A'));await h.alarm();
const afterBlindRetry=await cell();assert.equal(afterBlindRetry.builder,'offline-A');
const events=JSON.parse(h.projected.get('w:changes'));
assert.equal(events.sequence,3);assert.equal(retryResponse.summary.replaced,1);
console.log(JSON.stringify({scenario:'synthetic dropped response, restart, intervening builder, identical retry',
  firstResponse,beforeProjection,afterRestart,afterOtherBuilder,retryResponse,afterBlindRetry,
  activitySequence:events.sequence,activityBuilders:events.events.map(e=>e.builder),
  conclusion:'Durable commit survives, but identical retry is a new mutation and overwrites the intervening builder.'
},null,2));
