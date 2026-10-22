import {join} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {runCustom} from '../engine/runner.mjs';import {root,save} from '../engine/lib.mjs';import {demoOptions} from '../demo.mjs';
const manifest={schema:1,startedAt:new Date().toISOString(),status:'running',campaigns:[]};await mkdir(join(root,'.lab'),{recursive:true});
const persist=()=>save(join(root,'.lab/study.json'),manifest);
async function record(label,options){const result=await runCustom(options);manifest.campaigns.push({label,id:result.id,status:result.status});await persist();assert.equal(result.status,'completed',label+': '+result.error);assert.ok(result.runs.every(r=>r.expectationMet),label);return result;}
try{
 await persist();
 for(const app of ['inventory','dashboard']){
  await record(app+' cold-cache check',demoOptions({app,scenario:'cold'}));
  await record(app+' broken-change rejection',demoOptions({app,scenario:'failure'}));
 }
 const options={project:join(root,'apps/inventory'),config:'pipeline-lab.json',mode:'after',scenario:'repository',repeats:1,trust:true};
 await record('Custom CLI engine: repository build',options);
 const restored=await record('Custom CLI engine: portable-cache restore',options);assert.equal(restored.runs[0].externalCache.available,true);assert.equal(restored.runs[0].cache.dependencyLayerReused,true);
 for(const app of ['dashboard','inventory'])await record(app+' repeated changed-source study',demoOptions({app,scenario:'code-change',repeats:3}));
 manifest.status='completed';manifest.finishedAt=new Date().toISOString();await persist();console.log('Fresh study complete: '+manifest.campaigns.length+' campaigns. Export with node scripts/export-evidence.mjs.');
}catch(e){manifest.status='failed';manifest.error=e.message;await persist();console.error(e);process.exitCode=1;}
