// Operator-only migration utility. Never executes or fetches any world value.
// All network destinations are constants; credentials never enter saved output.
import {readFile, writeFile} from 'node:fs/promises';
const [action, file] = process.argv.slice(2);
const base = process.env.WORLD_ADMIN_BASE || 'https://worldorder.club';
if (!['https://worldorder.club','http://localhost:8799'].includes(base)) throw Error('Unsupported admin host');
async function admin(body) {
  const token = process.env.WORLD_ADMIN_TOKEN || (await readFile(new URL('../.run-scratch/world-admin-token', import.meta.url),'utf8')).trim();
  const response = await fetch(base+'/internal/world',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
  if (!response.ok) throw Error('Admin HTTP '+response.status);
  return response.json();
}
if (action === 'snapshot') {
  if(!file) throw Error('snapshot requires a path');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/048fa0e573bb4d99862b73ec1ab49fea`;
  async function api(path,raw=false){
    const r=await fetch(endpoint+path,{headers:{authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN}});
    if(!r.ok)throw Error('Cloudflare HTTP '+r.status);
    if(raw)return r.text();const b=await r.json();if(!b.success)throw Error('Cloudflare API failed');return b;
  }
  const names=[];let cursor='';
  do{const page=await api('/keys?prefix=w%3A&limit=1000'+(cursor?'&cursor='+encodeURIComponent(cursor):''));names.push(...page.result.map(k=>k.name).filter(k=>/^w:(c:\d+:\d+|meta|changes)$/.test(k)));cursor=page.result_info?.cursor||'';}while(cursor);
  const entries=[];for(const name of names.sort())entries.push([name,await api('/values/'+encodeURIComponent(name),true)]);
  const n=entries.filter(([k])=>k.startsWith('w:c:')).reduce((sum,[,v])=>sum+Object.keys(JSON.parse(v)).length,0);
  const meta=JSON.parse(entries.find(([k])=>k==='w:meta')?.[1]||'{"n":0}');
  if(n!==meta.n)throw Error('Snapshot count mismatch; reconcile before import');
  await writeFile(file,JSON.stringify({captured_at:new Date().toISOString(),cubes:n,entries},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({snapshot:file,cubes:n,keys:entries.length}));
}else if(action==='import'){
  const snapshot=JSON.parse(await readFile(file,'utf8'));
  console.log(JSON.stringify(await admin({action:'import',entries:snapshot.entries})));
}else if(action==='status')console.log(JSON.stringify(await admin({action:'status'})));
else if(action==='export'){
  if(!file)throw Error('export requires a path');
  const result=await admin({action:'export'});await writeFile(file,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({export:file,keys:result.entries.length}));
}else throw Error('Usage: node scripts/world-storage.mjs snapshot|import|status|export [file]');
