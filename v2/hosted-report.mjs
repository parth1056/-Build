import {readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {home,store,readJSON} from './lib.mjs';
import {summarize} from './analysis.mjs';
let md='# Verified GitHub Actions observations\n\nThese are hosted measurements, separate from the local three-application study. Sources, plans, stage logs, image IDs and output records were downloaded and audited locally.\n\n';
for(const folder of (await readdir(store)).sort()){
 if(!folder.startsWith('experiment-'))continue;
 const e=await readJSON(join(store,folder,'experiment.json'));if(e.execution?.platform!=='github-actions')continue;
 md+=`## [GitHub run ${e.execution.runId}](${e.execution.url})\n\nCommit: ${e.execution.commit}. Experiment: ${e.id}. Status: ${e.status}. Machine: ${e.environment.currentDocker.cpus} reported CPUs, ${(e.environment.currentDocker.memory/1024**3).toFixed(2)} GiB RAM, ${e.environment.currentDocker.os}.\n\n`;
 if(e.options.scenario==='repository'){
  for(const r of e.runs)md+=`Regular CI: ${r.status}; ${(r.elapsedMs/1000).toFixed(2)} pipeline seconds; external cache available: ${r.externalCache.available}; dependency-install layer reused: ${r.cache.installLayerReused}; every required check reran; release eligible: ${r.releaseEligible}. No controlled speedup is attributed to this single CI build.\n\n`;
 }else{
  md+=`Scenario: ${e.options.scenario}; ${e.options.repeats} observations per method, plus separate preparation builds.\n\n| Method | n | Median s | Min–max s | Reduction |\n|---|---:|---:|---:|---:|\n`;
  for(const g of summarize(e))for(const r of g.result){const seconds=x=>x===null?'—':(x/1000).toFixed(2);md+=`| ${g.workload}: ${r.name} | ${r.n} | ${seconds(r.medianMs)} | ${seconds(r.minMs)}–${seconds(r.maxMs)} | ${r.reductionPercent===null?'unavailable':r.reductionPercent.toFixed(1)+'%'} |\n`;}
  md+='\nThe conventional baseline is source-first with sequential checks; After uses dependency-first layers and concurrent independent checks. Both use BuildKit and identical verified package archives. Source identity matches within each comparison. These are descriptive small samples, not universal or statistically established effects.\n\n';
 }
}
md+='## How to interpret this\n\nPipeline time covers workspace build through exact-image verification. Runner setup, initial input downloads, seed builds, cleanup and Actions cache/artifact transfer are excluded and must not be silently included in a speedup claim. Regular CI includes its BuildKit cache import/export within the build; a controlled warm comparison does not include cross-job cache transport. Full job durations are visible on GitHub. A cache hit proves reuse, not necessarily net time saved after transport.\n\nThe optimization addresses repeated installation and independent validation work. It cannot remove required compilation/serialization, sequential bottlenecks or queue delays. An already optimized starting point has no new technique to gain from. CPU contention and cache transfer can offset savings.\n';
await writeFile(join(home,'HOSTED-RESULTS.md'),md);console.log('Generated hosted-only results with run provenance.');
