import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const page=(cubes=[],next_cursor=null)=>({cubes,count:cubes.length,truncated:next_cursor!==null,next_cursor});
function harness(W,H,cells){
 const requests=[],handlers={},elements=new Map();
 const ctx=vm.createContext({AbortController,performance:{now:()=>0},draw(){},
 document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);}},
 cv:{addEventListener:(n,f)=>handlers[n]=f,setPointerCapture(){}},
 fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
 clearTimeout(){},setTimeout(fn){ctx.timer=fn;}});
 const run=s=>vm.runInContext(s,ctx);
 run(`let W=${W},H=${H},WORLD=1000,fx=500,fy=0,fz=500,T=4,fitted=false,region=null,target=null,drag=null;let overview=${JSON.stringify({resolution:200,unit:5,cells})};`+
 source.slice(source.indexOf('function ox()'),source.indexOf('function face('))+
 source.slice(source.indexOf('function screenToWorldDelta('),source.indexOf("document.getElementById('focus-invitation').addEventListener")));
 return {run,requests,handlers,elements,async finish(i,data){requests[i].resolve({ok:true,json:async()=>data});await tick();}};
}
function visible(h,cubes,scale,W,H){
 for(const c of cubes){const [sx,sy,T]=h.run(`[...proj(${c.x},${c.z},${c.y}+1),T]`),s=T*scale;
  assert.ok(sx-Math.max(s,1)>=24&&sx+Math.max(s,1.5)<=W-24,`horizontal ${sx},${s}`);
  assert.ok(sy-Math.max(s*.5,1)>=24&&sy+Math.max(s*1.5,1.5)<=H-24,`vertical ${sy},${s}`);
 }
}
for(const [W,H] of [[800,600],[360,600]])for(const cells of [[],[[20100,0,0]],[[20100,0,999]],[[199,0,0],[39800,0,0]],[[0,0,999],[39999,0,0]],[[0,0,0],[39999,0,0]]]){
 test(`initial margins ${W}x${H} ${JSON.stringify(cells)}`,()=>{
  const h=harness(W,H,cells);h.run('fitView()');
  visible(h,cells.map(([i,t,y])=>({x:i%200*5+2.5,z:Math.floor(i/200)*5+2.5,y})),5,W,H);
  assert.ok(h.run('[fx,fy,fz,T].every(Number.isFinite)&&T>0'));
  if(cells.length!==1)assert.equal(h.requests.length,0);
  if(cells.length>1){const before=h.run('T');h.handlers.wheel({preventDefault(){},deltaY:-1});assert.ok(h.run('T')>before);assert.ok(h.run('T')<before*1.17);}
 });
}
for(const edge of [0,999])test(`complete geometry refines once at world edge ${edge}`,async()=>{
 const i=Math.floor(edge/5)*201,h=harness(360,600,[[i,0,999]]);h.run('fitView()');
 const query=new URL(h.requests[0].url,'https://worldorder.club').searchParams;
 assert.ok(+query.get('x')<=edge&&+query.get('x')+ +query.get('w')>edge);assert.equal(query.get('h'),'1000');
 const cubes=[{x:edge,y:0,z:edge,type:'stone'},{x:edge,y:999,z:edge,type:'stone'}];
 await h.finish(0,page(cubes));visible(h,cubes,1.15,360,600);assert.equal(h.run('region.initialComplete'),true);
 const camera=h.run('[fx,fy,fz,T].join()');h.run('pollRegion()');await h.finish(1,page([cubes[0]]));assert.equal(h.run('[fx,fy,fz,T].join()'),camera);
});
for(const mode of ['empty','failure','partial'])test(`initial ${mode} preserves overview and camera`,async()=>{
 const h=harness(800,600,[[20100,0,0]]);h.run('fitView()');const camera=h.run('[fx,fy,fz,T].join()');
 if(mode==='failure'){h.requests[0].reject(Error('offline'));await tick();}
 else if(mode==='empty')await h.finish(0,page());
 else for(let i=0;i<4;i++){await h.finish(i,page([{x:500,y:i,z:500,type:'stone'}],'page'+i));assert.equal(h.run('region'),null);}
 assert.equal(h.run('region'),null);assert.equal(h.run('[fx,fy,fz,T].join()'),camera);
 assert.match(h.elements.get('region-status').textContent,/stale|retaining global overview/);
 h.run('pollRegion()');const cubes=[{x:500,y:999,z:500,type:'stone'}];await h.finish(h.requests.length-1,page(cubes));
 visible(h,cubes,1.15,800,600);assert.equal(h.run('region.initialComplete'),true);
});
for(const mode of ['wheel','drag','focus'])test(`${mode} cancels late initial page two`,async()=>{
 const h=harness(800,600,[[20100,0,0]]);h.run('fitView()');await h.finish(0,page([{x:500,y:0,z:500,type:'stone'}],'next'));
 if(mode==='wheel')h.handlers.wheel({preventDefault(){},deltaY:-1});
 if(mode==='drag')h.handlers.pointerdown({clientX:0,clientY:0,pointerId:1});
 if(mode==='focus'){h.run("focusWorld(100,80,100,'new')");await h.finish(2,page([{x:100,y:80,z:100,type:'stone'}]));}
 const camera=h.run('[fx,fy,fz,T].join()');await h.finish(1,page([{x:500,y:999,z:500,type:'stone'}]));
 assert.equal(h.run('[fx,fy,fz,T].join()'),camera);assert.ok(h.requests[1].options.signal.aborted);
});
test('navigation before overview arrival suppresses initial fit',()=>{
 const h=harness(800,600,[[20100,0,999]]);h.handlers.wheel({preventDefault(){},deltaY:-1});const camera=h.run('[fx,fy,fz,T].join()');h.run('fitView()');assert.equal(h.run('[fx,fy,fz,T].join()'),camera);assert.equal(h.requests.length,0);
});
