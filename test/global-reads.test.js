import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

function fixture(count, {pageSize=1000, missing=false, fail=false}={}) {
  const data=new Map();
  for(let i=0;i<count;i++) {
    const x=Math.floor(i/32)*32,z=i%32*32;
    data.set(`w:c:${Math.floor(x/32)}:${Math.floor(z/32)}`, JSON.stringify({[`${x},0,${z}`]:[i%2,'fixture',1]}));
  }
  data.set('w:meta',JSON.stringify({n:count}));
  const calls=[]; let active=0;
  const kv={data,calls,async get(key) {
    calls.push(['get',key]); assert.ok(calls.length<300,'total KV operation budget');
    if(!Array.isArray(key)) return data.get(key)??null;
    assert.ok(key.length>0 && key.length<=4); assert.equal(active++,0);
    await Promise.resolve(); active--;
    if(fail) throw Error('bulk unavailable');
    return new Map([...key].reverse().map(k=>[k,missing?null:data.get(k)??null]));
  },async put(k,v){calls.push(['put',k]);data.set(k,v);},async list({prefix,limit,cursor}){
    calls.push(['list',prefix]);const keys=[...data.keys()].filter(k=>k.startsWith(prefix)).sort();
    const start=Number(cursor||0),end=start+Math.min(limit,pageSize);
    return {keys:keys.slice(start,end).map(name=>({name})),list_complete:end>=keys.length,cursor:String(end)};
  }};return kv;
}
async function call(kv,path,method,params) {
  const pending=[];
  const req=new Request('https://worldorder.club'+path,method?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}:{});
  const res=await worker.fetch(req,{METRICS:kv},{waitUntil(p){pending.push(p);}});
  await Promise.all(pending);assert.equal(res.status,200);return res.json();
}
for(const count of [0,998,999,1000,1024]) for(const path of ['/api/v1/stats','/api/v1/overview?format=sparse']) {
  test(`${path}: ${count} columns fit operation budget without truncation`,async()=>{
    const kv=fixture(count),before=new Map(kv.data),body=await call(kv,path);
    assert.equal(body.cubes,count);assert.equal(body.truncated,false);
    assert.ok(kv.calls.length<300);assert.equal(kv.calls.filter(([op,k])=>op==='get'&&Array.isArray(k)).length,Math.ceil(count/4));
    for(const [k,v] of before) assert.equal(kv.data.get(k),v);
    if(path.includes('stats')) {assert.equal(body.builders,count?1:0);assert.equal(body.per_type.stone,Math.ceil(count/2));}
    else {kv.calls.length=0;const warm=await call(kv,path);assert.equal(warm.cached,true);assert.ok(kv.calls.every(([,k])=>!Array.isArray(k)));}
  });
}
test('list pages, null values, raster tie order and dense/sparse equivalence',async()=>{
  const kv=fixture(9,{pageSize:3});
  kv.data.set('w:c:0:0',JSON.stringify({'0,5,0':[0,'a',1],'1,5,0':[1,'b',1]}));
  const dense=await call(kv,'/api/v1/overview');assert.deepEqual(dense.grid[0],[1,5]);
  const sparse=await call(kv,'/api/v1/overview?format=sparse');
  assert.deepEqual(sparse.cells,dense.grid.flatMap(([t,h],i)=>t<0?[]:[[i,t,h]]));
  const stats=await call(kv,'/api/v1/stats');assert.equal(stats.cubes,10);assert.equal(stats.builders,3);
  for(const path of ['/api/v1/stats','/api/v1/overview']) {
    const body=await call(fixture(9,{pageSize:3,missing:true}),path);assert.equal(body.cubes,0);assert.equal(body.truncated,false);
  }
});
for(const [method,params] of [['tools/call',{name:'get_world_stats'}],['tools/call',{name:'get_overview'}],['resources/read',{uri:'woclub://overview'}]]) {
  test(`MCP ${JSON.stringify(params)} shares bounded reads`,async()=>{
    const kv=fixture(1024),body=await call(kv,'/mcp',method,params);
    const result=body.result.structuredContent??JSON.parse(body.result.contents[0].text);
    assert.equal(result.cubes,1024);assert.equal(result.truncated,false);assert.ok(kv.calls.length<300);
  });
}
test('bulk and JSON failures cannot publish a partial cache',async()=>{
  for(const malformed of [false,true]) for(const path of ['/api/v1/stats','/api/v1/overview']) {
    const kv=fixture(8,{fail:!malformed});if(malformed)kv.data.set('w:c:0:7','{broken');
    await assert.rejects(call(kv,path));assert.equal(kv.data.has('w:ov'),false);
  }
});
test('four maximally escaped full chunks fit the KV bulk response bound',()=>{
  const chunk={};
  for(let i=0;i<20000;i++)chunk[`${960+i%32},${100+Math.floor(i/1024)},${960+Math.floor(i/32)%32}`]=[14,'\u0001'.repeat(40),-8640000000000000];
  const raw=JSON.stringify(chunk),bytes=Buffer.byteLength(raw);
  // 11 coordinate chars + JSON punctuation + type + 240 escaped builder bytes + 16 timestamp digits.
  assert.ok(bytes<=20000*280+2);
  assert.ok(4*bytes<25_000_000);
  // Even an extra JSON envelope around text values fits the runtime's 25 MiB limit.
  assert.ok(Buffer.byteLength(JSON.stringify(Object.fromEntries(Array.from({length:4},(_,i)=>[`w:c:30:${i}`,raw]))))<25*1024*1024);
});
