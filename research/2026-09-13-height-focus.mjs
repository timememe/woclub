// Offline geometry probe; executes only repository-authored camera functions.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const camera=source.slice(source.indexOf('function ox()'),source.indexOf('// frame the built'));
const projection=source.slice(source.indexOf('function proj('),source.indexOf('function face('));
const focus=source.slice(source.indexOf('async function focusWorld('),source.indexOf("document.getElementById('focus-invitation').addEventListener"));
const results=[];
for(const [W,H] of [[800,600],[360,600]])for(const y of [0,20,80,999]){
 const context=vm.createContext({Math,performance:{now:()=>0},document:{getElementById:()=>({textContent:''})},invalidateRegion(){},async loadRegion(url,done){context.request=url;done({cubes:[{x:500,y,z:500}]});}});
 vm.runInContext(`let W=${W},H=${H},WORLD=1000,fx=500,fz=500,T=4,target=null;`+camera+projection+focus,context);
 await vm.runInContext(`focusWorld(500,${y},500,'offline fixture')`,context);
 const geometry=vm.runInContext(`(()=>{const [sx,sy]=proj(500,500,${y}+1);return {zoom:T,top:sy};})()`,context);
 results.push({viewport:{W,H},target:{x:500,y,z:500},request:context.request,zoom:geometry.zoom,top_face_center_y:geometry.top,face_bounds_y:[geometry.top-geometry.zoom*1.15*.5,geometry.top+geometry.zoom*1.15*1.5],fully_outside:geometry.top+geometry.zoom*1.15*1.5<0});
}
console.log(JSON.stringify({source_commit:'e335d39',kind:'offline synthetic geometry; no world writes',results},null,2));
