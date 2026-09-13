import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const loader=source.slice(source.indexOf('let rt=null,'),source.indexOf("document.getElementById('focus-invitation').addEventListener"));
const tick=()=>new Promise(r=>setImmediate(r));
const cube=(x=500)=>({x,y:0,z:500,type:'stone'});
const page=(cubes=[],next_cursor=null)=>({cubes,count:cubes.length,truncated:next_cursor!==null,next_cursor});
function harness(fetcher){
 const requests=[],elements=new Map();
 const context=vm.createContext({AbortController,performance:{now:()=>0},
 document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);}},
 fetch:(url,options)=>fetcher?fetcher(url,options):new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
 clearTimeout(){},setTimeout(fn){context.timer=fn;},draw(){}});
 const run=s=>vm.runInContext(s,context);
 run('let region=null,T=8,drag=null,W=800,H=600,WORLD=1000,fx=500,fy=0,fz=500,target=null,fitted=false;'+loader);
 return {run,requests,elements,async finish(i,data){requests[i].resolve({ok:true,json:async()=>data});await tick();}};
}
for(const edge of [0,975])for(const count of [8192,8193,15000])test(`actual REST traversal: ${count} cubes at edge ${edge}`,async()=>{
 const chunks=new Map();let n=0;
 for(let x=edge;x<edge+25;x++)for(let z=edge;z<edge+25;z++)for(let y=0;y<24;y++){
  if(n++>=count)continue;
  const key=`w:c:${Math.floor(x/32)}:${Math.floor(z/32)}`;
  if(!chunks.has(key))chunks.set(key,{});
  chunks.get(key)[`${x},${y},${z}`]=[0,'offline-fixture',1];
 }
 const calls=[],writes=[];
 const kv={async get(k){return chunks.has(k)?JSON.stringify(chunks.get(k)):null;},async put(k){writes.push(k);}};
 const h=harness((url,options)=>{calls.push({url,signal:options.signal});return worker.fetch(new Request('https://worldorder.club'+url),{METRICS:kv},{waitUntil(){}});});
 await h.run(`focusWorld(${edge===0?0:999},0,${edge===0?0:999},'edge')`);
 assert.equal(h.run('region.count'),count);assert.equal(calls.length,Math.ceil(count/8192));
 assert.equal(h.run('region.truncated'),false);
 assert.match(h.elements.get('region-status').textContent,/not a snapshot/);
 assert.equal(new Set(calls.map(c=>c.signal)).size,1);
 assert.ok(writes.every(k=>!k.startsWith('w:')));
 if(count===15000)assert.doesNotMatch(h.elements.get('focus-status').textContent,/not observed/);
});
test('four pages bound received cubes; duplicates collapse and continuation is encoded as data',async()=>{
 const h=harness();h.run("loadRegion('/api/v1/region?x=0')");
 const cubes=Array.from({length:8192},(_,i)=>({x:i%1000,y:Math.floor(i/1000),z:0,type:'stone'}));
 for(let i=0;i<4;i++)await h.finish(i,page(cubes,i===0?'https://invalid.example/?x=1&y=2':'cursor'+i));
 assert.equal(h.requests.length,4);assert.equal(h.run('region.count'),8192);
 assert.match(h.requests[1].url,/&cursor=https%3A%2F%2Finvalid/);
 assert.match(h.elements.get('region-status').textContent,/Partial.*zoom in/);
 assert.equal(h.run('region.truncated'),true);
 h.run('pollRegion();pollRegion()');assert.equal(h.requests.length,5);assert.equal(h.requests[4].url,'/api/v1/region?x=0');
});
for(const fault of ['network','loop','malformed','oversized cursor','invalid cube','inconsistent count'])test(`page-two ${fault} retains scene and polling recovers`,async()=>{
 const h=harness();h.run("loadRegion('/api/v1/region?x=0')");await h.finish(0,page([cube(400)]));
 h.run('pollRegion()');await h.finish(1,page([cube(500)],'next'));
 assert.equal(h.run('region.cubes[0].x'),400);
 if(fault==='network'){h.requests[2].reject(Error('offline'));await tick();}
 else await h.finish(2,fault==='loop'?page([cube(600)],'next'):fault==='malformed'?{cubes:[]}:
  fault==='oversized cursor'?page([cube(600)],'a'.repeat(1025)):fault==='invalid cube'?page([{x:-1}]):{...page([cube(600)]),count:2});
 assert.equal(h.run('region.cubes[0].x'),400);assert.match(h.elements.get('region-status').textContent,/stale/);
 h.run('pollRegion()');assert.equal(h.requests[3].url,'/api/v1/region?x=0');await h.finish(3,page([cube(700)]));assert.equal(h.run('region.cubes[0].x'),700);
});
test('navigation invalidates late page two and idle polls never overlap a traversal',async()=>{
 const h=harness();h.run("focusWorld(500,80,500,'old')");await h.finish(0,page([cube()],'next'));
 h.run('pollRegion();pollRegion()');assert.equal(h.requests.length,2);
 h.run("focusWorld(400,20,400,'new')");await h.finish(2,page([]));await h.finish(1,page([cube()]));
 assert.equal(h.run('fx'),400);assert.equal(h.run('fy'),20);assert.equal(h.run('region.count'),0);
 assert.ok(h.requests[1].options.signal.aborted);
 assert.match(h.elements.get('focus-status').textContent,/not observed/);
});
test('actual REST box exceeding cap publishes exactly 32768 distinct observed cubes',async()=>{
 const chunks=new Map();
 for(let x=0;x<40;x++)for(let z=0;z<40;z++)for(let y=0;y<25;y++){
  const key=`w:c:${Math.floor(x/32)}:${Math.floor(z/32)}`;
  if(!chunks.has(key))chunks.set(key,{});
  chunks.get(key)[`${x},${y},${z}`]=[0,'offline-fixture',1];
 }
 let calls=0;
 const h=harness(url=>{calls++;return worker.fetch(new Request('https://worldorder.club'+url),
  {METRICS:{async get(k){return chunks.has(k)?JSON.stringify(chunks.get(k)):null;},async put(){}}},{waitUntil(){}});});
 await h.run("loadRegion('/api/v1/region?x=0&z=0&w=40&d=40&y=0&h=25')");
 assert.equal(calls,4);assert.equal(h.run('region.count'),32768);assert.equal(h.run('region.truncated'),true);
 assert.match(h.elements.get('region-status').textContent,/Partial/);
});
