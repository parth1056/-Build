const $=s=>document.querySelector(s);
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds=n=>Number.isFinite(n)?(n/1000).toFixed(2)+'s':'—';
const modeNames={baseline:'Before',cache:'Cache only',parallel:'Parallel only',combined:'After'};
const stageNames={install:'Dependencies',lint:'Code quality',types:'Type check',tests:'Tests',schema:'Document checks',gzip:'Gzip check',brotli:'Brotli check',syntax:'Syntax',rules:'Manifest checks',build:'Build app',package:'Package image',verify:'Verify output'};
const scenarioNames={'source-change':'Code changed; dependencies unchanged',unchanged:'No code changes',cold:'No previous cache','dependency-change':'Dependencies changed',failure:'Broken-change test','cache-miss':'Missing-cache test',repository:'Regular CI build'};
const needs={invoice:'Calculates invoice totals and rejects invalid inputs.',publisher:'Validates and compresses 192 sample documents.',lean:'Checks a small release manifest with no external dependencies.',all:'Compare a dependency-rich app, document processing and a small dependency-free app.'};
let state,firstLoad=true,lastRender='',lastLog='',pollFailed=false;
let history=new URL(location.href).searchParams.get('experiment')??'';
const evidence=(exp,run,file)=>`/evidence/${encodeURIComponent(exp)}/${encodeURIComponent(run)}/${encodeURIComponent(file)}`;
function experimentName(e){
 const name=e.options.workloads.length===3?'All applications':state.definitions[e.options.workloads[0]].name;
 const kind=e.options.starting==='tuned'?'Already optimized':e.options.modes.length===4?'4 methods':e.options.scenario==='source-change'?'Before / after':scenarioNames[e.options.scenario];
 return `${name} · ${e.execution?.platform==='github-actions'?'GitHub':'Local'} · ${kind}${e.status==='completed'?'':e.status==='running'?' · Running':' · Incomplete'}`;
}
function renderPlan(){
 if(!state)return;const w=$('#workload').value==='all'?'invoice':$('#workload').value;
 $('#workload-explanation').textContent=needs[$('#workload').value];
 const tuned=$('#starting').value==='tuned';
 $('.method').innerHTML=tuned?'<div><b>Before</b><span>Dependencies already cached.<br>Checks already run together.</span></div><div class="method-after"><b>After</b><span>The same optimized pipeline.<br>No additional change to apply.</span></div>':'<div><b>Before</b><span>Install dependencies again.<br>Run checks one at a time.</span></div><div class="method-after"><b>After</b><span>Reuse unchanged dependencies.<br>Run independent checks together.</span></div>';
 $('#decision').textContent=tuned?'This control uses identical pipelines. Differences in time are variation, not a new optimization.':'BuildKit is used in both pipelines. The changes are dependency reuse and the order in which checks run.';
 for(const key of ['before','after']){const p=state.plans[w][key];$('#'+key+'-description').textContent=key==='before'?'Before':'After';$('#'+key+'-plan').textContent=p.dockerfile+'\nCHECKS '+p.checks.join(p.parallel?' + ':' → ')+'\nBUILD → PACKAGE → VERIFY';}
}
function stageCards(exp,r){
 const code=r.scenario==='failure'&&r.workload==='invoice'?'source/src/invoice.ts':'source/src/release.'+(r.workload==='invoice'?'ts':'mjs');
 return `<div class="run-card"><div class="run-head"><strong>${escape(state.definitions[r.workload].name)} · ${modeNames[r.mode]}</strong><small>${r.purpose==='preparation'?'Cache preparation':r.purpose==='proof'?'Safety test':'Measured build'} · ${escape(r.status)} · ${seconds(r.elapsedMs)}</small></div><div class="stages">${r.stages.map(s=>`<a class="stage ${s.status}" href="${evidence(exp,r.id,s.name+'.log')}" target="_blank">${stageNames[s.name]??escape(s.name)}<small>${s.status==='running'?'Running…':seconds(s.durationMs)}</small></a>`).join('')}</div>${r.cache?`<p class="footnote">Dependencies ${r.cache.installLayerReused===true?'reused':r.cache.installLayerReused===false?'installed':'being checked'} · ${r.status==='running'?'Output pending':r.releaseEligible?'Output verified':'Output blocked'}</p>`:''}<p class="footnote"><a href="${evidence(exp,r.id,code)}" target="_blank">Source code ↗</a> · <a href="${evidence(exp,r.id,'source/Dockerfile')}" target="_blank">Dockerfile ↗</a> · <a href="${evidence(exp,r.id,'result.json')}" target="_blank">Run record ↗</a></p>${r.output?`<details><summary>Verified application output</summary><pre>${escape(JSON.stringify(r.output,null,2))}</pre></details>`:''}</div>`;
}
function timeline(run,scale){return `<div><p class="timeline-label"><b>${modeNames[run.mode]}</b><span>${seconds(run.elapsedMs)}</span></p>${run.stages.map(s=>`<div class="timeline"><span title="${escape(stageNames[s.name]??s.name)}: ${seconds(s.durationMs)}" style="left:${s.startMs/scale*100}%;width:${Math.max(.5,s.durationMs/scale*100)}%">${escape(stageNames[s.name]??s.name)}</span></div>`).join('')}</div>`;}
function renderResults(){
 const exp=state.selected;$('#results').innerHTML='';$('#proofs').innerHTML='';$('#timelines').innerHTML='';
 if(!exp){$('#experiment-context').innerHTML='';$('#results').innerHTML='<p class="empty">Run a comparison below to see how much time these optimizations save.</p>';$('#evidence-details').hidden=true;return;}
 $('#evidence-details').hidden=false;
 const platform=exp.execution?.platform==='github-actions'?'GitHub Actions':'Local Docker';
 $('#experiment-context').innerHTML=`<div class="result-context"><strong>${escape(platform)}</strong><span>· ${escape(scenarioNames[exp.options.scenario])}</span>${exp.execution?.url?`<a href="${escape(exp.execution.url)}" target="_blank">View GitHub run ↗</a>`:''}</div>`;
 $('#evidence-meta').innerHTML=`<div class="evidence-meta">${escape(exp.id)} · ${escape(exp.status)}<br><a href="/evidence/${encodeURIComponent(exp.id)}/experiment.json" target="_blank">Complete experiment record ↗</a>${exp.error?'<br>'+escape(exp.error):''}</div>`;
 for(const g of state.summary.filter(g=>g.result.some(r=>r.n))){
  const before=g.result.find(r=>r.mode==='baseline'),after=g.result.find(r=>r.mode==='combined');
  const comparable=g.comparable&&before?.medianMs!=null&&after?.medianMs!=null;
  const tuned=exp.options.starting==='tuned',ci=exp.options.scenario==='repository';
  const saving=comparable&&!tuned?after.reductionPercent:null;
  const note=ci?'One optimized build; this is not a before/after comparison.':`${exp.options.repeats===1?'One measured build per method — preview only.':`Median of ${exp.options.repeats} builds per method.`} ${g.sourceMatched?'Same source and required checks.':'Source identity not matched; no valid saving can be claimed.'}`;
  const result=ci?`<div class="metrics"><div class="metric after"><span class="metric-label">Optimized build</span><b class="metric-value">${after?.medianMs!=null?(after.medianMs/1000).toFixed(2):'—'}<small>sec</small></b></div></div>`:`<div class="metrics"><div class="metric"><span class="metric-label">Before</span><b class="metric-value">${before?.medianMs!=null?(before.medianMs/1000).toFixed(2):'—'}<small>sec</small></b></div><div class="metric after"><span class="metric-label">After</span><b class="metric-value">${after?.medianMs!=null?(after.medianMs/1000).toFixed(2):'—'}<small>sec</small></b></div><div class="saving ${saving!==null&&saving<0?'negative':''}"><b>${tuned?'Same pipeline':saving===null?'Not ready':Math.abs(saving).toFixed(1)+'% '+(saving>=0?'less time':'more time')}</b><span>${tuned?'No new optimization applied.':saving===null?'A completed, matching comparison is needed.':seconds(Math.abs(before.medianMs-after.medianMs))+(saving>=0?' saved per build':' added per build')}</span></div></div>`;
  const max=Math.max(...g.result.map(r=>r.medianMs??0),1);
  const bars=exp.options.modes.length===4?g.result.map(r=>`<div class="bar-row"><span>${r.name}</span><div class="bar-track"><div class="bar ${r.mode}" style="width:${(r.medianMs??0)/max*100}%"></div></div><b>${seconds(r.medianMs)}</b></div>`).join(''):'';
  $('#results').insertAdjacentHTML('beforeend',`<div class="result-group"><h3>${escape(state.definitions[g.workload].name)}</h3>${result}${bars}<p class="result-note">${note} Timed from workspace build to verified image; setup, cache preparation and Actions cache transfer are excluded.</p></div>`);
  const representative=mode=>exp.runs.filter(r=>r.workload===g.workload&&r.mode===mode&&r.purpose==='measurement'&&r.status==='passed').sort((a,b)=>Math.abs(a.elapsedMs-g.result.find(x=>x.mode===mode).medianMs)-Math.abs(b.elapsedMs-g.result.find(x=>x.mode===mode).medianMs))[0];
  if(comparable){const a=representative('baseline'),b=representative('combined'),scale=Math.max(a.elapsedMs,b.elapsedMs);$('#timelines').insertAdjacentHTML('beforeend',`<h3>${escape(state.definitions[g.workload].name)} · stage timings</h3><p class="small-note">Observed range: Before ${seconds(before.minMs)}–${seconds(before.maxMs)}; After ${seconds(after.minMs)}–${seconds(after.maxMs)}. ${exp.options.repeats} measured builds per method.</p><div class="timeline-pair">${timeline(a,scale)}${timeline(b,scale)}</div><p class="small-note">Both timelines use the same time scale. Overlapping stages ran together. These are the builds nearest each method's median; all timings remain in the logs.</p>`);}
 }
 if(!$('#results').innerHTML&&!exp.runs.some(r=>r.purpose==='proof'))$('#results').innerHTML=`<p class="empty">${exp.status==='running'?'Builds are running. Results appear when the measurements finish.':'No completed comparison in this run.'}</p>`;
 $('#proofs').innerHTML=exp.runs.filter(r=>r.purpose==='proof').map(r=>`<div class="proof ${r.expectationMet?'':'warn'}"><b>${r.scenario==='failure'?(r.expectationMet?'Broken change caught. Output blocked.':'Broken-change test not verified.'):(r.expectationMet?'Build succeeds without a cache.':'Missing-cache test not verified.')}</b>${!r.expectationMet?'Inspect the run before drawing a conclusion.':r.scenario==='failure'?'The checks rejected the deliberately broken change before an image could be packaged.':'The cache is optional: the pipeline can still build and verify the application.'}<br><a href="${evidence(exp.id,r.id,'result.json')}" target="_blank">Inspect test result ↗</a></div>`).join('');
 $('#run-table').innerHTML=`<table><thead><tr><th>Application / method</th><th>Purpose</th><th>Result</th><th>Time</th><th>Evidence</th></tr></thead><tbody>${exp.runs.map(r=>`<tr><td>${escape(r.workload)} / ${modeNames[r.mode]}</td><td>${escape(r.purpose)} · run ${r.repetition}</td><td>${escape(r.status)}</td><td>${seconds(r.elapsedMs)}</td><td><a href="${evidence(exp.id,r.id,'result.json')}" target="_blank">Record</a> · ${r.stages.map(s=>`<a href="${evidence(exp.id,r.id,s.name+'.log')}" target="_blank">${escape(s.name)}</a>`).join(' · ')}</td></tr>`).join('')}</tbody></table>`;
}
function render(){
 renderPlan();for(const id of ['compare','study','failure','miss'])$('#'+id).disabled=state.busy;$('#cancel').hidden=!state.busy;
 const h=$('#history'),keys=state.experiments.map(e=>e.id+e.status).join('|');
 if(h.dataset.keys!==keys){h.innerHTML='<option value="">Latest run</option>'+state.experiments.map(e=>`<option value="${e.id}">${escape(experimentName(e))}</option>`).join('');h.dataset.keys=keys;}h.value=history;
 const exp=state.selected;const signature=JSON.stringify([exp,$('#workload').value]);
 if(signature!==lastRender){lastRender=signature;renderResults();
  let displayed=exp?.runs.slice(-2)??[];
  if(exp?.status==='completed'&&exp.runs.some(r=>r.purpose==='measurement')){const w=exp.options.workloads.includes($('#workload').value)?$('#workload').value:exp.options.workloads[0],g=state.summary.find(g=>g.workload===w);displayed=exp.options.modes.map(mode=>{const med=g?.result.find(r=>r.mode===mode)?.medianMs;return exp.runs.filter(r=>r.workload===w&&r.mode===mode&&r.purpose==='measurement').sort((a,b)=>Math.abs(a.elapsedMs-med)-Math.abs(b.elapsedMs-med))[0];}).filter(Boolean);}
  $('#live-runs').innerHTML=exp?displayed.map(r=>stageCards(exp.id,r)).join(''):'';
  const last=exp?.runs.at(-1);$('#active-stages').innerHTML=exp?.status==='running'&&last?stageCards(exp.id,last):'';
  $('#live-explanation').textContent=last?.purpose==='preparation'?'Building the previous version first, so the cache starts in a known state. This preparation is not counted in the comparison.':exp?.status==='running'?'Running the required checks and building the application. Every check must pass.':'Preparing Docker and the build inputs…';
 }
 $('#progress').hidden=!state.busy;$('#live-status').textContent=exp?.status==='running'?'In progress':'Preparing';
 const text=state.recent.filter(e=>e.type==='log').slice(-35).map(e=>`[${e.stage}] ${e.text}`).join('\n');if(text!==lastLog){lastLog=text;$('#log').textContent=text;}
 if(state.error)$('#action-error').textContent=state.error;
}
async function poll(){try{
 const params=new URLSearchParams({starting:$('#starting').value});if(history)params.set('experiment',history);
 const response=await fetch('/api/state?'+params);if(!response.ok)throw Error('Cannot load results.');state=await response.json();
 if(pollFailed){$('#action-error').textContent='';pollFailed=false;}
 if(firstLoad){firstLoad=false;if(!state.busy&&!history){const preferred=state.experiments.find(e=>e.status==='completed'&&e.execution?.platform==='github-actions'&&e.options.scenario==='source-change'&&e.options.repeats>=3)??state.experiments.find(e=>e.status==='completed'&&e.options.workloads.length===3&&e.options.repeats>=3);if(preferred){history=preferred.id;return;}}}render();
 }catch(e){pollFailed=true;$('#action-error').textContent='Results are unavailable. Check that the demo server is running.';}finally{setTimeout(poll,1200);}}
async function start(type){try{
 $('#action-error').textContent='';const w=$('#workload').value;
 const x={workloads:w==='all'?['invoice','publisher','lean']:[w],starting:$('#starting').value,scenario:type==='failure'?'failure':type==='miss'?'cache-miss':$('#scenario').value,modes:type==='study'?['baseline','cache','parallel','combined']:['failure','miss'].includes(type)?['combined']:['baseline','combined'],repeats:type==='study'?3:1};
 const response=await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)});const data=await response.json();if(!response.ok)throw Error(data.error);
 history='';$('#history').value='';$('#progress').hidden=false;$('#progress').scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){$('#action-error').textContent=e.message;}}
for(const id of ['compare','study','failure','miss'])$('#'+id).onclick=()=>start(id);
$('#cancel').onclick=async()=>{try{const response=await fetch('/api/cancel',{method:'POST'});if(!response.ok)throw Error('Could not request a stop.');$('#action-error').textContent='Stopping after the current command finishes.';}catch(e){$('#action-error').textContent=e.message;}};
$('#workload').onchange=()=>{lastRender='';if(state)render();};$('#starting').onchange=()=>{state=null;};$('#history').onchange=e=>{history=e.target.value;};
void poll();
