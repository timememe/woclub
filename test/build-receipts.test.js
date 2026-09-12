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

test('lost response, restart and intervening replacement: REST/MCP replay returns historical outcome without mutation',async()=>{
  const h=await harness(),payload=batch(1);
  const first=await (await h.call('/api/v1/batch',payload)).json(); // caller loses this response
  h.restart();
  await h.call('/api/v1/batch',{ops:[place(0,'B')]});
  const before=await storageAdapter(h.durable).get('w:c:0:0');
  const retry=await h.rpc('build',payload);
  assert.equal(retry.error,false);assert.equal(retry.body.replayed,true);
  assert.deepEqual({...retry.body,replayed:false},first);
  assert.equal(await storageAdapter(h.durable).get('w:c:0:0'),before);
  assert.equal(await sequence(h),2);
  const lookup=await h.call('/api/v1/receipts/'+id(1));
  assert.equal(lookup.headers.get('cache-control'),'no-store');
  const receipt=await lookup.json();assert.equal(receipt.status,'committed');assert.deepEqual(receipt.outcome,first);
  assert.deepEqual((await h.rpc('get_build_receipt',{request_id:id(1)})).body,receipt);
  await Promise.all(h.waits);
  const added=[...h.projected].filter(([k])=>k.endsWith(':cubes_added')).reduce((n,[,v])=>n+Number(v),0);
  assert.equal(added,1);
  assert.equal(await h.durable.get('r:count'),1);
});

test('simultaneous duplicate calls commit once; normalized defaults and property order match; execution changes conflict',async()=>{
  const h=await harness(),payload=batch(2,[place(),place(1)]);
  const responses=await Promise.all([h.call('/api/v1/batch',payload),h.call('/api/v1/batch',payload)]);
  const bodies=await Promise.all(responses.map(r=>r.json()));
  assert.deepEqual(bodies.map(b=>b.replayed),[false,true]);assert.equal(await sequence(h),2);
  const equivalent={builder:' A ',request_id:id(2),ops:payload.ops.map(({builder,...op})=>({z:op.z,type:op.type,y:op.y,x:op.x,op:op.op,ignored:{text:'inert'}}))};
  assert.equal((await h.rpc('build',equivalent)).body.replayed,true);
  for(const ops of [[place(0,'B'),place(1)],[place(1),place()],[{...place(),type:'gold'},place(1)],[place(2),place(1)]]){
    const conflict=await h.call('/api/v1/batch',batch(2,ops));assert.equal(conflict.status,409);assert.equal((await conflict.json()).error,'request_id_conflict');
    assert.equal((await h.rpc('build',batch(2,ops))).error,true);
  }
  assert.equal(await sequence(h),2);
});

test('retained replay and lookup bypass failed projection; unavailable storage never becomes unknown',async()=>{
  const h=await harness();h.setFail(true);
  const first=await (await h.call('/api/v1/batch',batch(3))).json();
  h.restart();await assert.rejects(h.alarm(),/offline/);
  assert.equal((await h.rpc('build',batch(3))).body.replayed,true);
  assert.equal((await h.call('/api/v1/batch',batch(3,[place(1)]))).status,409);
  assert.equal((await h.rpc('get_build_receipt',{request_id:id(3)})).body.status,'committed');
  assert.equal((await h.call('/api/v1/batch',batch(4,[place(1)]))).status,503);
  assert.equal(await sequence(h),1);
  h.setFail(false);await h.alarm();assert.equal(JSON.parse(h.projected.get('w:changes')).sequence,1);
  assert.ok(await h.durable.get('alarm')); // receipt expiry remains scheduled
  h.env.WORLD_COORDINATOR.get=()=>({fetch(){throw Error('network');}});
  const unavailable=await h.call('/api/v1/receipts/'+id(3));assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).error,'world_storage_unavailable');
  const mcp=await h.rpc('get_build_receipt',{request_id:id(3)});assert.equal(mcp.error,true);assert.equal(mcp.body.error,'world_storage_unavailable');
  assert.equal(first.replayed,false);
});

test('partial rejection and no-op outcomes are receipted; preview does not reserve a request ID',async()=>{
  const h=await harness(),payload=batch(5,[place(),{...place(1),type:'invalid'},{op:'remove',x:3,y:0,z:0}]);
  const before=await h.durable.list({limit:10000});
  assert.equal((await h.rpc('preview_build',payload)).body.preview,true);
  assert.deepEqual(await h.durable.list({limit:10000}),before);assert.equal(h.waits.length,0);
  const first=await (await h.call('/api/v1/batch',payload)).json();assert.equal(first.summary.rejected,1);
  assert.deepEqual({...((await h.rpc('build',payload)).body),replayed:false},first);
  const noop=batch(6,[{op:'remove',x:10,y:0,z:0}]);
  const empty=await (await h.call('/api/v1/batch',noop)).json();assert.equal(empty.results[0].removed,false);
  assert.equal((await h.rpc('build',noop)).body.replayed,true);assert.equal(await sequence(h),1);
  assert.equal(await h.durable.get('r:count'),2);
});

test('strict UUID validation, unknown semantics and unkeyed compatibility',async()=>{
  const h=await harness();
  for(const request_id of [null,5,'',id(1)+'\n','00000000-0000-1000-8000-000000000000','AAAAAAAA-0000-4000-8000-000000000000','x'.repeat(1000)]){
    const r=await h.call('/api/v1/batch',{request_id,ops:[place()]});assert.equal(r.status,400);
    assert.equal((await h.rpc('build',{request_id,ops:[place()]})).error,true);
  }
  assert.equal(await sequence(h),0);
  const unknown=await (await h.call('/api/v1/receipts/'+id(7))).json();assert.equal(unknown.status,'unknown');assert.match(unknown.note,/does not prove/);
  assert.equal((await h.rpc('get_build_receipt',{})).error,true);
  const first=await (await h.call('/api/v1/batch',{ops:[place()]})).json();assert.equal(first.receipt,undefined);
  await h.call('/api/v1/batch',{ops:[place()]});assert.equal(await sequence(h),2);
  h.env.WORLD_WRITE_MODE='paused';assert.equal((await h.call('/api/v1/receipts/'+id(7))).status,200);
});

test('24-hour boundary makes lookup unknown, permits explicit ID reuse, and cleanup retains the projection alarm',async()=>{
  const originalNow=Date.now;let now=1800000000000;Date.now=()=>now;
  try{
    const h=await harness();await h.call('/api/v1/batch',batch(8));
    now+=RECEIPT_TTL_MS-1;
    assert.equal((await h.rpc('get_build_receipt',{request_id:id(8)})).body.status,'committed');
    now++;
    assert.equal((await h.rpc('get_build_receipt',{request_id:id(8)})).body.status,'unknown');
    h.setFail(true);await assert.rejects(h.alarm(),/offline/);
    assert.equal(await h.durable.get('r:count'),0);assert.ok(await h.durable.get('alarm'));
    assert.equal(await storageAdapter(h.durable).get('r:outcome:'+id(8)),null);
    h.setFail(false);
    const reused=await (await h.call('/api/v1/batch',batch(8))).json();assert.equal(reused.replayed,false);assert.equal(await sequence(h),2);
    now+=RECEIPT_TTL_MS;await h.alarm();assert.equal(await h.durable.get('alarm'),undefined);
  }finally{Date.now=originalNow;}
});

test('capacity rejects before world mutation, retains existing receipts, and purges expiry in bounded batches',async()=>{
  const h=await harness(),future=Date.now()+RECEIPT_TTL_MS;
  // Real index/count fixture at 9,999 occupied slots; outcomes are unnecessary
  // for capacity decisions and none of these fixture IDs is looked up.
  for(let n=100;n<100+RECEIPT_CAPACITY-1;n++){
    await h.durable.put('r:meta:'+id(n),{fingerprint:'fixture',expires_at_ms:future});
    await h.durable.put(`r:expiry:${future}:${id(n)}`,id(n));
  }
  await h.durable.put('r:count',RECEIPT_CAPACITY-1);
  assert.equal((await h.call('/api/v1/batch',batch(9))).status,200);
  const before=await storageAdapter(h.durable).get('w:c:0:0');
  const full=await h.call('/api/v1/batch',batch(10,[place(1)]));assert.equal(full.status,503);assert.equal((await full.json()).error,'receipt_capacity');
  assert.equal((await h.rpc('build',batch(9))).body.replayed,true);
  assert.equal(await storageAdapter(h.durable).get('w:c:0:0'),before);assert.equal(await sequence(h),1);
  const expired=Date.now()-1;
  for(let n=100;n<350;n++){
    await h.durable.delete(`r:expiry:${future}:${id(n)}`);
    await h.durable.put('r:meta:'+id(n),{fingerprint:'fixture',expires_at_ms:expired});
    await h.durable.put(`r:expiry:${expired}:${id(n)}`,id(n));
  }
  await h.alarm();assert.equal(await h.durable.get('r:count'),9900);assert.ok(await h.durable.get('alarm'));
  assert.equal((await h.call('/api/v1/batch',batch(10,[place(1)]))).status,200);
  assert.equal(await h.durable.get('r:count'),9801);
});

test('large outcomes are segmented and atomic receipt failure rolls back world and activity',async()=>{
  const h=await harness(),payload=batch(11,Array.from({length:512},(_,x)=>place(x,'🌍'.repeat(32))));
  const first=await (await h.call('/api/v1/batch',payload)).json();assert.equal(first.results.length,512);
  h.restart();assert.deepEqual({...((await h.rpc('build',payload)).body),replayed:false},first);
  const parts=await h.durable.list({prefix:'part:r:outcome:',limit:1000});assert.ok(parts.size>1);
  for(const [,value] of parts)assert.ok(Buffer.byteLength(value)<128*1024);
  const fresh=await harness(),put=fresh.durable.put;
  fresh.durable.put=async(k,v)=>{if(k.startsWith('r:meta:'))throw Error('storage failure');return put(k,v);};
  assert.equal((await fresh.call('/api/v1/batch',batch(12))).status,503);
  assert.equal(await sequence(fresh),0);assert.equal(await storageAdapter(fresh.durable).get('w:c:0:0'),null);
  fresh.durable.put=put;
  assert.equal((await fresh.rpc('get_build_receipt',{request_id:id(12)})).body.status,'unknown');
  assert.equal((await fresh.call('/api/v1/batch',batch(12))).status,200);
});

test('removal replays never double-count removals, and receipt storage excludes arbitrary submitted fields',async()=>{
  const h=await harness();await h.call('/api/v1/batch',{ops:[place()]});await Promise.all(h.waits);
  const plan={request_id:id(13),ignored:'not-to-be-stored',ops:[{op:'remove',x:0,y:0,z:0,ignored:'not-to-be-stored'}]};
  const first=await (await h.call('/api/v1/batch',plan)).json();await Promise.all(h.waits);
  assert.equal(first.summary.removed,1);
  assert.equal((await h.rpc('build',plan)).body.replayed,true);await Promise.all(h.waits);
  assert.equal([...h.projected].filter(([k])=>k.endsWith(':cubes_removed')).reduce((n,[,v])=>n+Number(v),0),1);
  assert.doesNotMatch(JSON.stringify([...await h.durable.list({limit:10000})]),/not-to-be-stored/);
  assert.equal((await h.call('/api/v1/receipts')).status,404);
  const api=await (await h.call('/openapi.json')).json();
  assert.ok(api.paths['/api/v1/receipts/{request_id}']);
  assert.equal(api.paths['/api/v1/batch'].post.requestBody.content['application/json'].schema.properties.request_id.maxLength,36);
  assert.ok(api.paths['/api/v1/batch'].post.responses['409']);
});
