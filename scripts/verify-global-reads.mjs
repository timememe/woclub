// Offline workerd binding smoke test; no production access.
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
// Populate fixtures inside workerd, avoiding large values through the host proxy.
const harness = `import worker from './src/worker.js';
export default {async fetch(req,env,ctx){
 if(new URL(req.url).pathname==='/fixture'){
  for(let i=0;i<8;i++)await env.METRICS.put('w:c:0:'+i,JSON.stringify({['0,0,'+32*i]:[0,'offline-workerd',1]}));
  await env.METRICS.put('w:meta',JSON.stringify({n:8}));
  const chunk={};
  for(let i=0;i<20000;i++)chunk[(960+i%32)+','+(100+Math.floor(i/1024))+','+(960+Math.floor(i/32)%32)]=[14,String.fromCharCode(1).repeat(40),-8640000000000000];
  const raw=JSON.stringify(chunk),keys=Array.from({length:4},(_,i)=>'fixture:'+i);
  for(const key of keys)await env.METRICS.put(key,raw);
  const values=await env.METRICS.get(keys,'text');
  const passed=keys.every(k=>values.get(k)===raw);
  return Response.json({passed,bulk_keys:4,raw_group_bytes:4*new TextEncoder().encode(raw).length,text_envelope_bytes:new TextEncoder().encode(JSON.stringify(Object.fromEntries(values))).length});
 }
 return worker.fetch(req,env,ctx);
}};`;
const bundled=await build({stdin:{contents:harness,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-08-24',kvNamespaces:['METRICS']}));
try {
  const seeded=await mf.dispatchFetch('http://localhost/fixture'),evidence=await seeded.json();
  assert.equal(seeded.status,200);assert.equal(evidence.passed,true);
  for(const path of ['/api/v1/stats','/api/v1/overview?format=sparse']) {
    const res=await mf.dispatchFetch('http://localhost'+path),body=await res.json();
    assert.equal(res.status,200);assert.equal(body.cubes,8);assert.equal(body.truncated,false);
  }
  console.log(JSON.stringify({runtime:'local workerd via Miniflare',world_cubes:8,...evidence},null,2));
} finally {await mf.dispose();}
