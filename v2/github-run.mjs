import {appendFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {campaign} from './runner.mjs';
import {home,exec,save} from './lib.mjs';
import {summarize} from './analysis.mjs';

const suite=process.env.LAB_SUITE??'pilot';
const workload=process.env.LAB_WORKLOAD??'invoice';
const repeats=Number(process.env.LAB_REPEATS??'3');
if(!['ci','pilot','four-way','full','tuned','failure','cache-miss','dependency-change','cold','unchanged'].includes(suite))throw new Error('Unknown study');
const common={starting:'conventional',scenario:'source-change',workloads:[workload],modes:['baseline','combined'],repeats};
const specs=suite==='ci'?[{...common,scenario:'repository',modes:['combined'],repeats:1}]
 :suite==='four-way'?[{...common,modes:['baseline','cache','parallel','combined']}]
 :suite==='full'?[
 {...common,workloads:['invoice','publisher','lean']},
 {...common,modes:['baseline','cache','parallel','combined'],workloads:['invoice']},
 {...common,starting:'tuned',workloads:['lean']},
 ...['failure','cache-miss','dependency-change','cold','unchanged'].map(s=>({...common,scenario:s,workloads:['invoice'],modes:['failure','cache-miss','dependency-change'].includes(s)?['combined']:common.modes,repeats:1}))]
 :suite==='tuned'?[{...common,starting:'tuned'}]
 :['failure','cache-miss','dependency-change','cold','unchanged'].includes(suite)?[{...common,scenario:suite,modes:['failure','cache-miss','dependency-change'].includes(suite)?['combined']:common.modes,repeats:1}]
 :[common];
const start=performance.now(),out=[];let failed=false;
for(const spec of specs){const result=await campaign(spec);out.push(result);if(result.status!=='completed'){failed=true;break;}}
await save(join(home,'github-session.json'),{suite,elapsedMs:performance.now()-start,experiments:out.map(e=>e.id),platform:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local-validation',note:'Session time includes preparation and cleanup, but not runner allocation, checkout, tool setup or Actions cache/artifact transfer. Full job duration is in GitHub.'});
await exec(process.execPath,[join(home,'audit.mjs')],{onData:s=>process.stdout.write(s)});
await exec(process.execPath,[join(home,'publish.mjs')],{onData:s=>process.stdout.write(s)});
let md=`# Pipeline Lab — ${suite}\n\n${process.env.GITHUB_ACTIONS==='true'?'Measured on this GitHub Actions runner.':'Local verification of the GitHub entry point; not hosted measurements.'} Commit: ${process.env.GITHUB_SHA??'local'}.\n\n`;
md+='Optimizations: dependency-first Docker layers, independent checks in parallel, Docker BuildKit. All checks rerun; cached passing tests are never substituted.\n\n';
for(const e of out){md+=`## ${e.id}: ${e.status}\n\n`;
 if(e.options.scenario==='repository')md+='Regular CI: one optimized build of the generated workload at this repository commit. No before/after or percentage claim. Cache import/export and fresh validations are in retained logs.\n\n';
 else for(const g of summarize(e)){md+=`### ${g.workload}\n\n| Configuration | n | Median s | Range s | Reduction |\n|---|---:|---:|---:|---:|\n`;for(const r of g.result){const s=n=>n===null?'—':(n/1000).toFixed(2);md+=`| ${r.name} | ${r.n} | ${s(r.medianMs)} | ${s(r.minMs)}–${s(r.maxMs)} | ${r.reductionPercent===null?'not attributable':r.reductionPercent.toFixed(1)+'%'} |\n`;}md+='\n';}
 for(const r of e.runs.filter(r=>r.purpose==='proof'))md+=`Proof ${r.scenario}: **${r.expectationMet?'expected behavior verified':'FAILED'}**; release eligible: ${r.releaseEligible}.\n\n`;
}
md+='Pipeline timing includes workspace image creation, checks, artifact build, image packaging/export/load and exact-image verification. Setup, seeds and cleanup are separately retained. GitHub’s job duration additionally includes setup and cache/artifact transfer; do not equate the two. Failed or slower runs remain visible. The full raw logs and CSV are in the downloadable evidence artifact.\n';
await writeFile(join(home,'GITHUB-SUMMARY.md'),md);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,md);
if(failed)process.exitCode=1;
