import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {home,store,readJSON,definitions} from './lib.mjs';
import {summarize} from './analysis.mjs';
const all=[];for(const d of await readdir(store,{withFileTypes:true})){if(d.isDirectory()&&d.name.startsWith('experiment-'))all.push(await readJSON(join(store,d.name,'experiment.json')));}
all.sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
const s=x=>x===null||x===undefined?'unavailable':(x/1000).toFixed(2);
let md='# Recorded results — Pipeline Lab\n\nGenerated from retained run records. A displayed value is a measurement, not a target. The old taskboard results are not pooled here.\n\n';
md+='Both methods receive identical local package inputs; npm installation has no network access. Timing covers workspace build through exact-image verification, excluding setup, seed preparation and cleanup. Source-first is an explicitly underoptimized baseline; the cache-only arm and tuned control test stronger starting points.\n\n';
const rows=[['experiment','platform','commit','githubRun','workload','starting','scenario','configuration','purpose','repetition','status','expected','expectationMet','releaseEligible','elapsedMs','sourceHash','imageId','installLayerReused']];
for(const e of all){
 md+=`## ${e.id}\n\nPlatform: **${e.execution?.platform??'local'}**.${e.execution?.url?' [GitHub run]('+e.execution.url+'), commit '+e.execution.commit+'.':''} Status: **${e.status}**. Workloads: ${e.options.workloads.join(', ')}. Starting pipeline: ${e.options.starting}. Scenario: ${e.options.scenario}. Repetitions: ${e.options.repeats}.\n\n`;
 if(e.status!=='completed'){md+='Excluded from performance conclusions. '+(e.error??'Incomplete')+'\n\n';}
 else if(e.options.scenario==='repository'){
  md+='Regular optimized CI, not a controlled before/after comparison. Cache transport and all fresh checks are retained in each run record. No reduction percentage is attributed.\n\n';
  for(const r of e.runs)md+=`- ${r.workload}: ${r.status}; ${s(r.elapsedMs)} seconds; imported cache available: ${r.externalCache?.available}; dependency install layer reused: ${r.cache?.installLayerReused}; release eligible: ${r.releaseEligible}.\n`;
  md+='\n';
 }
 else if(['failure','cache-miss'].includes(e.options.scenario)){
  for(const r of e.runs.filter(r=>r.purpose==='proof'))md+=`- ${r.scenario}: ${r.expectationMet?'expected outcome verified':'NOT VERIFIED'}; pipeline ${r.status}, release ${r.releaseEligible?'eligible':'blocked'}, packaging ${r.stages.some(s=>s.name==='package')?'attempted':'not attempted'}.\n`;
  md+='\n';
 }else{
  for(const g of summarize(e)){
   md+=`### ${definitions[g.workload].name}\n\n| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |\n| --- | ---: | ---: | --- | ---: |\n`;
   for(const r of g.result)md+=`| ${r.name} | ${r.n} | ${s(r.medianMs)} | ${s(r.minMs)}–${s(r.maxMs)} | ${r.reductionPercent===null?'not comparable':r.reductionPercent.toFixed(1)+'%'} |\n`;
   md+='\n'+(g.preliminary?'Single-observation scenario check; preliminary, not a repeated performance estimate.':`${e.options.repeats} observations per method: descriptive evidence on this machine, not statistical significance.`)+' Source hashes '+(g.sourceMatched?'match.':'do not match; no valid comparison.')+'\n\n';
   if(e.options.starting==='tuned')md+='The executable before/after plans are identical. Any timing difference is variability, not an additional optimization effect.\n\n';
   const before=g.result.find(r=>r.mode==='baseline'),after=g.result.find(r=>r.mode==='combined');
   if(after?.medianMs&&before?.medianMs&&e.options.starting!=='tuned')md+=`The combined method ${after.reductionPercent>=0?'saved':'added'} about ${s(Math.abs(before.medianMs-after.medianMs))} seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.\n\n`;
  }
 }
 for(const r of e.runs)rows.push([e.id,e.execution?.platform??'local',e.execution?.commit??'',e.execution?.url??'',r.workload,e.options.starting,r.scenario,r.mode,r.purpose,r.repetition,r.status,r.expected,r.expectationMet,r.releaseEligible,r.elapsedMs,r.identity.sourceHash,r.imageId,r.cache?.installLayerReused]);
}
md+='## Interpretation boundaries\n\nThe same fixed workflows are compared within each workload; apps have different validation contracts. Do not compare their raw seconds as a software-quality ranking. Independent stage intervals establish scheduling; dependency-install log markers establish reuse. The source/output audit establishes the defined correctness chain. Negative observations remain in the medians, preparation runs are separate, and incomplete experiments are excluded explicitly.\n\nA small difference inside a broad range may not justify complexity. A tiny workload can be dominated by process/image overhead. Publisher compression and output verification are sequential work that these two techniques do not remove. Cache-only is a reasonable option when parallel startup or CPU contention offsets its potential saving.\n\nNo production CI queue, internet-download savings, cloud cost, CPU-seconds or energy were measured. The publisher corpus is deterministic and synthetic. Further work and the exact contract are in DESIGN.md.\n';
await writeFile(join(home,'RESULTS.md'),md);
const cell=x=>'"'+String(x??'').replaceAll('"','""')+'"';await writeFile(join(home,'runs.csv'),rows.map(r=>r.map(cell).join(',')).join('\n'));
const esc=x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
// Standalone record view for offline review. The live console remains the execution UI.
const html='<!doctype html><meta charset="utf-8"><title>Pipeline Lab · saved evidence</title><style>body{font:14px/1.8 system-ui;max-width:1100px;margin:50px auto;padding:0 25px;color:#24392c;background:#f7f8f3}h1{font-size:34px}pre{white-space:pre-wrap;font:13px/1.8 Consolas,monospace;background:white;padding:30px;border:1px solid #dce5d5;border-radius:10px}a{color:#3d6e45}</style><h1>Pipeline Lab · saved evidence</h1><p>This is a static snapshot, not a live build. <a href="runs.csv">Raw CSV</a> · <a href="figures/comparison.png">Comparison figure</a></p><pre>'+esc(md)+'</pre>';
await writeFile(join(home,'saved-results.html'),html);console.log('Published RESULTS.md, runs.csv and standalone saved-results.html from '+all.length+' actual experiments.');
