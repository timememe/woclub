// Offline analysis: run actual browser loader against the actual REST handler.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const loader=source.slice(source.indexOf('let rt=null,'),source.indexOf("document.getElementById('focus-invitation').addEventListener"));
const store=new Map(), chunks=new Map();
for(let x=975;x<1000;x++)for(let z=975;z<1000;z++)for(let y=0;y<24;y++){
 const key=`w:c:${Math.floor(x/32)}:${Math.floor(z/32)}`;
 if(!chunks.has(key))chunks.set(key,{});
 chunks.get(key)[`${x},${y},${z}`]=[0,'synthetic-analysis',1];
}
for(const [key,value] of chunks)store.set(key,JSON.stringify(value));
const writes=[];
const kv={async get(k){return store.get(k)??null;},async put(k,v){writes.push(k);},async list(){return {keys:[],list_complete:true};}};
const requests=[],elements=new Map();
const context=vm.createContext({AbortController,Array,Error,Math,performance:{now:()=>0},
 document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);}},
 async fetch(url){requests.push(url);return worker.fetch(new Request('https://worldorder.club'+url),{METRICS:kv},{waitUntil(){}});},
 clearTimeout(){},setTimeout(){},draw(){}});
vm.runInContext('let region=null,T=8,drag=null,W=800,H=600,WORLD=1000,fx=500,fy=0,fz=500,target=null,fitted=false;'+loader,context);
await vm.runInContext("focusWorld(999,0,999,'synthetic edge cube')",context);
const first=JSON.parse(vm.runInContext('JSON.stringify(region)',context));
assert.equal(first.count,8192);assert.equal(first.truncated,true);
assert.equal(requests.length,1);
assert.match(elements.get('focus-status').textContent,/no longer present/);
const second=await (await worker.fetch(new Request('https://worldorder.club'+requests[0]+'&cursor='+encodeURIComponent(first.next_cursor)),{METRICS:kv},{waitUntil(){}})).json();
assert.equal(second.count,6808);assert.equal(second.truncated,false);
assert.ok(second.cubes.some(c=>c.x===999&&c.y===0&&c.z===999));
assert.ok(writes.every(k=>!k.startsWith('w:')));
console.log(JSON.stringify({fixture_cubes:15000,focus:[999,0,999],browser_requests:requests,first_page:{count:first.count,truncated:first.truncated,next_cursor:first.next_cursor},browser_region_status:elements.get('region-status').textContent,browser_focus_status:elements.get('focus-status').textContent,second_page:{count:second.count,truncated:second.truncated,target_present:true},world_writes:writes.filter(k=>k.startsWith('w:')).length},null,2));
