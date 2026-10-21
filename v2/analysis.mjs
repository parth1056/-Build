import {median,modes} from './lib.mjs';
export function summarize(experiment){
 const groups=[];
 for(const workload of experiment.options.workloads){
  const rows=experiment.runs.filter(r=>r.workload===workload&&r.purpose==='measurement');
  const result=experiment.options.modes.map(mode=>{const all=rows.filter(r=>r.mode===mode),good=all.filter(r=>r.status==='passed'&&r.releaseEligible&&Number.isFinite(r.elapsedMs));const valid=experiment.status==='completed'&&all.length===experiment.options.repeats&&all.length===good.length;return {mode,name:modes[mode].name,n:all.length,failures:all.length-good.length,medianMs:valid?median(good.map(r=>r.elapsedMs)):null,minMs:valid?Math.min(...good.map(r=>r.elapsedMs)):null,maxMs:valid?Math.max(...good.map(r=>r.elapsedMs)):null,runs:all.map(r=>r.id)};});
  const baseline=result.find(r=>r.mode==='baseline');const hashes=new Set(rows.map(r=>r.identity.sourceHash));
  const comparable=hashes.size===1&&!!baseline?.medianMs;
  for(const r of result)r.reductionPercent=comparable&&experiment.options.starting!=='tuned'&&r.medianMs!==null?(baseline.medianMs-r.medianMs)/baseline.medianMs*100:null;
  groups.push({workload,sourceMatched:hashes.size===1,preliminary:experiment.options.repeats<3,comparable,result});
 }
 return groups;
}
