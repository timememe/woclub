// Offline probe of repository-authored initial camera; no network or world writes.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const camera=source.slice(source.indexOf('function ox()'),source.indexOf('function face('));
const fixtures=[
 {name:'compact-ground',cells:[[20100,0,0]]},
 {name:'compact-elevated',cells:[[20100,0,999]]},
 {name:'opposite-xz-corners',cells:[[199,0,0],[39800,0,0]]},
 {name:'opposite-diagonal-corners',cells:[[0,0,0],[39999,0,0]]},
];
const results=[];
for(const [W,H] of [[800,600],[360,600]])for(const fixture of fixtures){
 const context=vm.createContext({Math});
 vm.runInContext(`let W=${W},H=${H},WORLD=1000,fx=500,fy=0,fz=500,T=4,fitted=false;let overview=${JSON.stringify({resolution:200,unit:5,cells:fixture.cells})};function maybeRegion(){};`+camera+'fitView();',context);
 const result=vm.runInContext(`(()=>{const size=Math.max(T*overview.unit,1);const faces=overview.cells.map(([i,type,y])=>{const x=(i%200)*5+2.5,z=Math.floor(i/200)*5+2.5;const [sx,sy]=proj(x,z,y+1);return {x,y,z,bounds:{left:sx-size,right:sx+size,top:sy-size*.5,bottom:sy+size*1.5},fullyOutside:sx+size<0||sx-size>W||sy+size*1.5<0||sy-size*.5>H};});const span=Math.min(300,Math.ceil((W+H)/T));const x=Math.max(0,Math.min(1000-span,Math.floor(fx-span/2))),z=Math.max(0,Math.min(1000-span,Math.floor(fz-span/2)));return {camera:{fx,fy,fz,T},faces,initialRegion:T>=2.5?{x,z,w:span,d:span,representativesInside:faces.filter(c=>c.x>=x&&c.x<x+span&&c.z>=z&&c.z<z+span).length}:null};})()`,context);
 if(fixture.name!=='compact-ground')assert.ok(result.faces.every(f=>f.fullyOutside));
 if(fixture.name.startsWith('opposite'))assert.equal(result.initialRegion.representativesInside,0);
 results.push({fixture:fixture.name,viewport:{W,H},...result});
}
console.log(JSON.stringify({baseline:'22142ec',method:'Actual fitView/ox/oy/proj, overview face geometry and initial-region formula; synthetic data only',results},null,2));
