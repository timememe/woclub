import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
function harness(){
  const requests=[],elements=new Map();
  const context=vm.createContext({AbortController,Array,Error,Math,performance:{now:()=>0},
    document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);}},
    fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
    clearTimeout(){},setTimeout(fn){context.timer=fn;},draw(){}});
  vm.runInContext('let region=null,T=8,drag=null,W=800,H=600,WORLD=1000,fx=500,fy=0,fz=500,target=null,fitted=false;'+source.slice(source.indexOf('let rt=null,'),source.indexOf("document.getElementById('focus-invitation').addEventListener")),context);
  return {requests,elements,run:s=>vm.runInContext(s,context),async finish(i,cubes){requests[i].resolve({ok:true,json:async()=>({cubes})});await new Promise(r=>setImmediate(r));}};
}
test('idle refresh shows placement and removal, preserves focused height, camera and target, bounds polling',async()=>{
  const h=harness();h.run("focusWorld(500,80,500,'high build')");await h.finish(0,[]);
  const camera=h.run('JSON.stringify([fx,fy,fz,T,target])');
  h.run('pollRegion();pollRegion()');assert.equal(h.requests.length,2);
  assert.match(h.requests[1].url,/y=74&h=24/);
  await h.finish(1,[{x:500,y:80,z:500,type:'stone'}]);assert.equal(h.run('region.cubes.length'),1);
  h.run('pollRegion()');await h.finish(2,[]);assert.equal(h.run('region.cubes.length'),0);
  assert.equal(h.run('JSON.stringify([fx,fy,fz,T,target])'),camera);
  assert.ok(h.requests.every(r=>r.url.startsWith('/api/v1/region?')));
});
test('navigation invalidates delayed focus and timer responses even when abort is ignored',async()=>{
  const h=harness();h.run("focusWorld(400,80,400,'old')");
  h.run('maybeRegion();timer()');await h.finish(1,[{x:501}]);await h.finish(0,[{x:400}]);
  assert.equal(h.run('region.cubes[0].x'),501);assert.equal(h.run('fx'),500);
  h.run('pollRegion();T=1;maybeRegion()');await h.finish(2,[{x:600}]);assert.equal(h.run('region'),null);
  h.run('pollRegion()');assert.equal(h.requests.length,3);
});
test('failed polls keep last geometry, show stale state and recover',async()=>{
  const h=harness();h.run('maybeRegion();timer()');await h.finish(0,[{x:500}]);
  h.run('pollRegion()');h.requests[1].reject(Error('offline'));await new Promise(r=>setImmediate(r));
  assert.equal(h.run('region.cubes[0].x'),500);assert.match(h.elements.get('region-status').textContent,/stale/);
  h.run('pollRegion()');await h.finish(2,[]);assert.match(h.elements.get('region-status').textContent,/updated/);
});
