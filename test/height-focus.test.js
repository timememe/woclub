import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
function harness(W,H){
 const requests=[],handlers={},elements=new Map();
 const context=vm.createContext({Math,Array,Error,AbortController,devicePixelRatio:1,performance:{now:()=>0},
 document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);}},
 cv:{parentElement:{getBoundingClientRect:()=>({width:W,height:H})},addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture(){}},ctx:{setTransform(){}},
 fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),clearTimeout(){},setTimeout(fn){context.timer=fn;},draw(){}});
 const run=s=>vm.runInContext(s,context);
 run(`let region=null,fx=500,fy=0,fz=500,T=4,drag=null,W=${W},H=${H},WORLD=1000,target=null,fitted=false;`+
 source.slice(source.indexOf('function resize()'),source.indexOf("addEventListener('resize'"))+
 source.slice(source.indexOf('function ox()'),source.indexOf('// frame the built'))+
 source.slice(source.indexOf('function proj('),source.indexOf('function face('))+
 source.slice(source.indexOf('function screenToWorldDelta('),source.indexOf("document.getElementById('focus-invitation').addEventListener")));
 return {run,requests,handlers,elements,async finish(i,cubes){requests[i].resolve({ok:true,json:async()=>({cubes})});await new Promise(r=>setImmediate(r));}};
}
for(const [W,H] of [[800,600],[360,600]])for(const y of [0,20,80,999])for(const present of [true,false]){
 test(`focus height ${y}, ${W}x${H}, present=${present}: cube and full pulse have margin`,async()=>{
  const h=harness(W,H);h.run(`focusWorld(500,${y},500,'fixture')`);
  assert.match(h.requests[0].url,/w=25&d=25/);
  await h.finish(0,present?[{x:500,y,z:500}]:[]);
  assert.equal(h.run('fy'),y);assert.equal(h.run('fx'),500);assert.equal(h.run('fz'),500);
  if(!present)assert.match(h.elements.get('focus-status').textContent,/no longer present/);
  function visible(){const [sx,sy,T]=h.run(` [...proj(500,500,${y}+1),T]`);
   const r=Math.max(9,T*1.45)*1.22+1.5,t=T*1.15;
   assert.ok(sx-Math.max(r,t)>24&&sx+Math.max(r,t)<W-24);
   assert.ok(sy-Math.max(r*.55+1.5,t*.5)>24&&sy+Math.max(r*.55+1.5,t*1.5)<H-24);
  }
  visible();h.handlers.wheel({preventDefault(){},deltaY:-1});visible();
  h.handlers.pointerdown({clientX:100,clientY:100,pointerId:1});h.handlers.pointermove({clientX:104,clientY:104});h.handlers.pointerup();
  assert.equal(h.run('fy'),y);visible();h.run('resize()');visible();
  h.run('timer()');await h.finish(1,[]);h.run('pollRegion()');await h.finish(2,[]);
  assert.equal(h.run('fy'),y);visible();
 });
}
test('failed and superseded focus retain the previous vertical camera',async()=>{
 const h=harness(800,600);h.run("focusWorld(500,80,500,'first')");await h.finish(0,[]);
 h.run("focusWorld(400,999,400,'failed')");h.requests[1].reject(Error('offline'));await new Promise(r=>setImmediate(r));assert.equal(h.run('fy'),80);
 h.run("focusWorld(400,999,400,'old');focusWorld(500,20,500,'new')");await h.finish(3,[]);await h.finish(2,[]);
 assert.equal(h.run('fy'),20);assert.equal(h.run('fx'),500);
});
