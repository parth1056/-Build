from pathlib import Path
import json, statistics
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).resolve().parent
experiments=[json.loads(p.read_text(encoding='utf-8')) for p in (root/'evidence').glob('experiment-*/experiment.json')]
main=[e for e in experiments if e['status']=='completed' and e['options']['starting']=='conventional' and e['options']['scenario']=='source-change' and len(e['options']['workloads'])==3 and e['options']['repeats']>=3]
if not main: raise SystemExit('No completed repeated three-workload study. No illustrative chart generated.')
e=sorted(main,key=lambda x:x['startedAt'])[-1]
fig,axes=plt.subplots(1,3,figsize=(13,5.4),facecolor='#f5f7f0')
names={'invoice':'Invoice engine','publisher':'Document publisher','lean':'Release validator'}
trace=[]
for ax,w in zip(axes,['invoice','publisher','lean']):
 ax.set_facecolor('#f5f7f0')
 for idx,mode in enumerate(['baseline','combined']):
  records=[r for r in e['runs'] if r['workload']==w and r['mode']==mode and r['purpose']=='measurement']
  if len(records)!=3 or any(r['status']!='passed' or not r['releaseEligible'] for r in records): raise ValueError('Incomplete measurement group')
  values=[r['elapsedMs']/1000 for r in records];med=statistics.median(values)
  ax.bar(idx,med,color=['#a6b09c','#477752'][idx],width=.55)
  ax.errorbar(idx,med,yerr=[[med-min(values)],[max(values)-med]],fmt='none',ecolor='#314d35',capsize=6)
  ax.scatter([idx-.07,idx,idx+.07],values,s=25,c='#203a27',zorder=5)
  ax.text(idx,max(values)+1.1,f'{med:.2f}s',ha='center',fontsize=11,color='#27452d',fontweight='bold')
  trace.extend({'experiment':e['id'],'run':r['id'],'seconds':r['elapsedMs']/1000} for r in records)
 ax.set_xticks([0,1],['Before','After']);ax.set_title(names[w],fontsize=13,pad=15,color='#29442f');ax.set_ylabel('Elapsed seconds');ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True);ax.set_ylim(0,max(r['seconds'] for r in trace if r['run'] in [x['id'] for x in e['runs'] if x['workload']==w])+6)
 ax.spines[['top','right']].set_visible(False)
fig.suptitle('Same software. Different pipeline. Measured outcomes.',fontsize=18,x=.07,ha='left',color='#233d2a',fontweight='bold')
fig.text(.07,.045,'Bars: medians · dots: all 3 observations · whiskers: observed min–max.\nSource-change after one seed; fixed local inputs; workspace build through exact-image verification. Small local sample.',fontsize=9,color='#64755d')
fig.subplots_adjust(left=.07,right=.97,bottom=.23,top=.78,wspace=.32)
out=root/'figures';out.mkdir(exist_ok=True)
fig.savefig(out/'comparison.png',dpi=180,facecolor=fig.get_facecolor());fig.savefig(out/'comparison.svg',facecolor=fig.get_facecolor())
(out/'figure-evidence.json').write_text(json.dumps(trace,indent=2),encoding='utf-8')
print('Exported comparison PNG/SVG and exact contributing run IDs.')

hosted=[x for x in experiments if x.get('execution',{}).get('platform')=='github-actions' and x['status']=='completed' and x['options']['scenario']=='source-change' and x['options']['repeats']==3 and x['options']['workloads']==['invoice'] and x['options']['modes']==['baseline','combined']]
if hosted:
 h=sorted(hosted,key=lambda x:x['startedAt'])[-1]
 fig2,ax=plt.subplots(figsize=(8,5.7),facecolor='#f5f7f0');ax.set_facecolor('#f5f7f0');hosted_trace=[]
 for idx,mode in enumerate(['baseline','combined']):
  records=[r for r in h['runs'] if r['purpose']=='measurement' and r['mode']==mode]
  assert len(records)==3 and all(r['status']=='passed' and r['releaseEligible'] for r in records)
  values=[r['elapsedMs']/1000 for r in records];med=statistics.median(values)
  ax.bar(idx,med,color=['#a6b09c','#477752'][idx],width=.52)
  ax.errorbar(idx,med,yerr=[[med-min(values)],[max(values)-med]],fmt='none',ecolor='#314d35',capsize=6)
  ax.scatter([idx-.07,idx,idx+.07],values,s=28,c='#203a27',zorder=5)
  ax.text(idx,max(values)+.45,f'{med:.2f}s',ha='center',fontweight='bold',color='#27452d')
  hosted_trace.extend({'experiment':h['id'],'run':r['id'],'seconds':r['elapsedMs']/1000,'githubRun':h['execution']['url']} for r in records)
 ax.set_xticks([0,1],['Before','After']);ax.set_ylabel('Pipeline elapsed seconds');ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True);ax.spines[['top','right']].set_visible(False);ax.set_ylim(0,max(x['seconds'] for x in hosted_trace)+2)
 fig2.suptitle('Invoice engine on GitHub Actions',fontsize=17,color='#233d2a',fontweight='bold')
 fig2.text(.11,.035,'3 observations per method · bars: medians · dots: all runs · whiskers: min–max\nWarm source-change case; two reported CPUs. Setup, seeds and cache transport\nare outside this pipeline timer. Descriptive sample; no universal speedup.',fontsize=8.5,color='#64755d')
 fig2.subplots_adjust(left=.11,right=.94,bottom=.23,top=.86)
 fig2.savefig(out/'hosted-comparison.png',dpi=180,facecolor=fig2.get_facecolor());fig2.savefig(out/'hosted-comparison.svg',facecolor=fig2.get_facecolor())
 (out/'hosted-figure-evidence.json').write_text(json.dumps(hosted_trace,indent=2),encoding='utf-8')
