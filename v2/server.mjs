import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve,sep,extname} from 'node:path';
import {home,store,root,readJSON,definitions,modes,plan} from './lib.mjs';
import {validateOptions} from './runner.mjs';
import {summarize} from './analysis.mjs';
const port=4180;let child=null;let recent=[];let lastError=null;
async function experiments(){let list;try{list=await readdir(store,{withFileTypes:true});}catch{return [];}const out=[];for(const e of list)if(e.isDirectory()&&/^experiment-[a-z0-9-]+$/.test(e.name)){try{const value=await readJSON(join(store,e.name,'experiment.json'));out.push(value);}catch{/* atomic file may not exist during initial setup */}}return out.sort((a,b)=>b.startedAt.localeCompare(a.startedAt));}
const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const csvCell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  if(req.method==='POST'){
   if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return json(res,{error:'Local console requests only'},403);
   if(url.pathname==='/api/start'){
    if(child)return json(res,{error:'An experiment is already active. Wait for it to finish.'},409);
    try{await readFile(join(root,'.lab/active.lock'));return json(res,{error:'Another experiment is active in a terminal. Wait for it to finish.'},409);}catch(e){if(e.code!=='ENOENT')throw e;}
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return json(res,{error:'Request too large'},413);}
    const x=validateOptions(JSON.parse(raw));recent=[];lastError=null;
    child=spawn(process.execPath,[join(home,'runner.mjs'),'--workloads',x.workloads.join(','),'--modes',x.modes.join(','),'--scenario',x.scenario,'--starting',x.starting,'--repeats',String(x.repeats)],{cwd:root,windowsHide:true,shell:false});
    let pending='';child.stdout.on('data',chunk=>{pending+=chunk;const lines=pending.split('\n');pending=lines.pop();for(const line of lines){try{recent.push(JSON.parse(line));recent=recent.slice(-100);}catch{/* no synthetic success */}}});
    child.stderr.on('data',chunk=>{lastError=chunk.toString().slice(-4000);});child.on('error',e=>{lastError=e.message;});child.on('close',code=>{if(code!==0&&!lastError)lastError='Experiment ended with a failure. Open its evidence.';child=null;});
    return json(res,{started:true},202);
   }
   if(url.pathname==='/api/cancel'){
    const list=await experiments();const active=list.find(e=>e.status==='running');if(active)await writeFile(join(store,active.id,'cancel.request'),'Stop requested by user');return json(res,{requested:!!active});
   }
   return json(res,{error:'Unknown action'},404);
  }
  if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
  if(url.pathname==='/api/state'){
   const list=await experiments();const requested=url.searchParams.get('experiment');const selected=(requested?list.find(e=>e.id===requested):list[0])??null;
   let externallyBusy=false;try{await readFile(join(root,'.lab/active.lock'));externallyBusy=true;}catch(e){if(e.code!=='ENOENT')throw e;}
   return json(res,{busy:!!child||externallyBusy,error:lastError,definitions,modes,plans:Object.fromEntries(Object.keys(definitions).map(w=>[w,{before:plan(w,'baseline',url.searchParams.get('starting')??'conventional'),after:plan(w,'combined',url.searchParams.get('starting')??'conventional')}])),experiments:list.map(e=>({id:e.id,status:e.status,startedAt:e.startedAt,options:e.options,execution:e.execution??{platform:'local'}})),selected,summary:selected?summarize(selected):[],recent});
  }
  if(url.pathname==='/api/export.csv'){
   const list=await experiments();const rows=[['experiment','platform','commit','githubRun','workload','starting','scenario','configuration','purpose','repetition','status','expected','expectationMet','releaseEligible','elapsedMs','sourceHash','imageId','installLayerReused']];for(const e of list)for(const r of e.runs)rows.push([e.id,e.execution?.platform??'local',e.execution?.commit??'',e.execution?.url??'',r.workload,e.options.starting,r.scenario,r.mode,r.purpose,r.repetition,r.status,r.expected,r.expectationMet,r.releaseEligible,r.elapsedMs,r.identity.sourceHash,r.imageId,r.cache?.installLayerReused]);res.writeHead(200,{'Content-Type':'text/csv','Content-Disposition':'attachment; filename=pipeline-experiments.csv'});return res.end(rows.map(r=>r.map(csvCell).join(',')).join('\n'));
  }
  let file;
  if(url.pathname.startsWith('/evidence/')){
   const target=resolve(store,'.'+decodeURIComponent(url.pathname.slice('/evidence'.length)));if(!target.startsWith(resolve(store)+sep))return json(res,{error:'Outside evidence directory'},403);file=target;
  }else{const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(!files[url.pathname])return json(res,{error:'Not found'},404);file=join(home,'ui',files[url.pathname]);}
  const bytes=await readFile(file);const type=file.endsWith('Dockerfile')?'text/plain':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.log':'text/plain','.mjs':'text/plain','.ts':'text/plain','.txt':'text/plain'}[extname(file)]??'application/octet-stream';res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
 }catch(e){json(res,{error:e.message},e.code==='ENOENT'?404:400);}
});
server.listen(port,'127.0.0.1',()=>console.log(`Pipeline Lab: http://127.0.0.1:${port}\nThis console runs real Docker commands. Saved evidence loads without Docker. Ctrl+C stops the console.`));
process.on('SIGINT',async()=>{if(child){const list=await experiments();const e=list.find(x=>x.status==='running');if(e)await writeFile(join(store,e.id,'cancel.request'),'Console shutdown');console.log('Waiting for experiment cleanup before shutdown.');child.once('close',()=>server.close(()=>process.exit(0)));}else server.close(()=>process.exit(0));});
