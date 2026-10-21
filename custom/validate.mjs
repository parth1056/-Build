import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {runCustom} from './runner.mjs';
import {hashDirectory} from './config.mjs';
const root=resolve('.'), observations=[];
async function run(label,project,mode,scenario,expected='completed'){
 const s=await runCustom({project:resolve(project),config:'pipeline-lab.json',mode,scenario,repeats:1,trust:true});
 assert.equal(s.status,expected,label+': '+s.error);
 for(const r of s.runs){const d=join(root,'.lab/custom-evidence',s.id,r.id);assert.equal((await hashDirectory(join(d,'source'))).sha256,r.source.sha256);if(r.artifacts)assert.equal((await hashDirectory(join(d,'artifacts'))).sha256,r.artifacts.sha256);}
 observations.push({label,id:s.id,status:s.status,summary:s.summary,runs:s.runs.map(r=>({id:r.id,mode:r.mode,purpose:r.purpose,scenario:r.scenario,status:r.status,error:r.error,expected:r.expected,releaseEligible:r.releaseEligible,expectationMet:r.expectationMet,sourceHash:r.source.sha256,planHash:r.planHash,artifactHash:r.artifacts?.sha256,output:r.output,expectedOutput:r.expectedOutput,externalCache:r.externalCache,cache:r.cache,elapsedMs:r.elapsedMs,stages:r.stages}))});
 await writeFile('.lab/custom-validation-results.json',JSON.stringify({validatedAt:new Date().toISOString(),note:'Integration checks, one sample per case; not a performance study. Raw evidence stays local under .lab/custom-evidence. Source and artifact hashes recomputed independently after execution.',observations},null,2)+'\n');return s;
}
await run('Node repository build', 'custom/examples/node','after','repository');
const cached=await run('Node repository cache restore','custom/examples/node','after','repository');
assert.equal(cached.runs[0].externalCache.available,true);assert.equal(cached.runs[0].cache.dependencyLayerReused,true);
const compare=await run('Node changed source comparison','custom/examples/node','compare','code-change');
assert.equal(compare.runs.length,4);assert.equal(compare.summary.comparable,true);assert.equal(compare.runs.filter(r=>r.purpose==='measurement').every(r=>r.output.release==='v2'),true);
assert.equal(compare.runs.find(r=>r.mode==='before'&&r.purpose==='measurement').cache.dependencyLayerReused,false);
assert.equal(compare.runs.find(r=>r.mode==='after'&&r.purpose==='measurement').cache.dependencyLayerReused,true);
const failed=await run('Node deliberately broken change','custom/examples/node','after','failure');assert.equal(failed.runs.at(-1).expectationMet,true);assert.equal(failed.runs.at(-1).releaseEligible,false);
const python=await run('Python cold app build','custom/examples/python','after','cold');assert.equal(python.runs[0].output.totalCents,6000);
const bad=join(root,'.lab/custom-bad-verification');await mkdir(bad,{recursive:true});await cp('custom/examples/node',bad,{recursive:true});const cfg=JSON.parse(await readFile(join(bad,'pipeline-lab.json'),'utf8'));cfg.name='wrong-output-proof';cfg.verify.expected.feeCents=901;await writeFile(join(bad,'pipeline-lab.json'),JSON.stringify(cfg));
const rejected=await run('Wrong packaged-output expectation rejected',bad,'after','cold','completed-with-failures');assert.equal(rejected.runs[0].releaseEligible,false);assert.equal(rejected.runs[0].stages.at(-1).name,'verify');assert.equal(rejected.runs[0].stages.at(-1).status,'failed');
console.log('CUSTOM INTEGRATION MATRIX PASSED');
