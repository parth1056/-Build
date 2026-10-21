import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {store,home,readJSON,hash,save} from './lib.mjs';
import {summarize} from './analysis.mjs';
const audits=[];
for(const e of await readdir(store,{withFileTypes:true})){
 if(!e.isDirectory()||!e.name.startsWith('experiment-'))continue;
 const exp=await readJSON(join(store,e.name,'experiment.json'));
 if(exp.status!=='completed'){audits.push({id:exp.id,status:exp.status,excluded:true,reason:'Not a completed successful experiment'});continue;}
 const findings=[];
 for(const r of exp.runs){
  const directory=join(store,exp.id,r.id),manifest=await readJSON(join(directory,'source/source-manifest.json'));
  for(const file of manifest.files)assert.equal(hash(await readFile(join(directory,'source',file.path))),file.sha256,`${r.id}: captured source modified`);
  assert.equal(hash(JSON.stringify(manifest.files)),r.identity.sourceHash);
  const required=r.plan.checks.map(name=>r.stages.find(s=>s.name===name));
  assert.ok(required.every(Boolean));
  const intervals=required.map(s=>[s.startMs,s.startMs+s.durationMs]);
  const overlaps=intervals.some((a,i)=>intervals.some((b,j)=>j>i&&Math.min(a[1],b[1])>Math.max(a[0],b[0])));
  assert.equal(overlaps,r.plan.parallel,`${r.id}: recorded scheduling disagrees with plan`);
  if(r.expected==='blocked'){
   assert.equal(r.releaseEligible,false);assert.equal(r.status,'failed');assert.ok(required.some(s=>s.status==='failed'));assert.ok(!r.stages.some(s=>s.name==='package'));
  }else{
   assert.ok(r.releaseEligible&&r.status==='passed'&&r.expectationMet);
   assert.ok(r.stages.every(s=>s.status==='passed'));
   assert.equal(r.output.sourceHash,r.identity.sourceHash);assert.equal(r.output.releaseMessage,r.identity.releaseMessage);
   assert.match(r.imageId,/^sha256:[a-f0-9]{64}$/);
  }
  if(r.purpose!=='preparation'){
   if(['source-change','failure','cache-miss'].includes(r.scenario)){
    const code=await readFile(join(directory,'source/src/release.'+(r.workload==='invoice'?'ts':'mjs')),'utf8');
    assert.ok(code.includes('Changed release: optimization must deliver this version'));
    const seed=exp.runs.find(x=>x.purpose==='preparation'&&x.workload===r.workload&&x.mode===r.mode&&x.repetition===r.repetition);
    if(seed){assert.notEqual(seed.identity.sourceHash,r.identity.sourceHash);assert.notEqual(seed.identity.releaseMessage,r.identity.releaseMessage);}
   }
   if(['source-change','failure'].includes(r.scenario))assert.equal(r.cache.installLayerReused,r.plan.layered,`${r.id}: incorrect source-change invalidation`);
   if(['cold','cache-miss','dependency-change'].includes(r.scenario))assert.equal(r.cache.installLayerReused,false);
   if(r.scenario==='unchanged')assert.equal(r.cache.installLayerReused,true);
  }
  findings.push({run:r.id,purpose:r.purpose,sourceVerified:true,checksActuallyExecuted:true,overlappingChecks:overlaps,cacheInstallReused:r.cache.installLayerReused,expectedOutcomeVerified:r.expectationMet});
 }
 const summary=summarize(exp);
 for(const g of summary)if(g.result.some(r=>r.n))assert.equal(g.sourceMatched,true);
 audits.push({id:exp.id,status:'verified',summary,findings});
}
await save(join(home,'verified-evidence.json'),{auditedAt:new Date().toISOString(),experiments:audits});
console.log(JSON.stringify(audits.map(e=>({id:e.id,status:e.status,runs:e.findings?.length??0}))));
