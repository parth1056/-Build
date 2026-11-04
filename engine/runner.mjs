import {readFile,writeFile,mkdir,cp,rm,open,unlink,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join,dirname,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {root,readJSON,save,exec,hash,median} from './lib.mjs';
import {validateConfig,validateRequest,safeRelative,validateDockerfile,copyProject,hashDirectory,assertExpected} from './config.mjs';
import {verifyFailureProof} from './proof.mjs';
const owned=x=>{if(!/^labca-custom-[a-z0-9-]+$/.test(x))throw Error('Unowned Docker resource rejected');return x;};
const lab=join(root,'.lab');
const insideLab=p=>{const path=resolve(p);if(!path.startsWith(resolve(lab)+sep))throw Error('Custom cleanup outside .lab rejected');return path;};
export function summarizeCustom(state){
 const rows=state.runs.filter(r=>r.purpose==='measurement');
 const modes=state.options.mode==='compare'?['before','after']:[state.options.mode];
 const methods=modes.map(mode=>{const selected=rows.filter(r=>r.mode===mode),ok=state.status==='completed'&&selected.length===state.options.repeats&&selected.every(r=>r.status==='passed'&&r.releaseEligible);return {mode,n:selected.length,medianMs:ok?median(selected.map(r=>r.elapsedMs)):null,minMs:ok?Math.min(...selected.map(r=>r.elapsedMs)):null,maxMs:ok?Math.max(...selected.map(r=>r.elapsedMs)):null};});
 const before=methods.find(x=>x.mode==='before'),after=methods.find(x=>x.mode==='after');
 const matched=new Set(rows.map(x=>x.source.sha256)).size===1;
 const plans=new Set(rows.map(x=>x.planHash)).size;
 const comparable=!!(matched&&before?.medianMs&&after?.medianMs&&plans>1);
 return {methods,sourceMatched:matched,comparable,reductionPercent:comparable?(before.medianMs-after.medianMs)/before.medianMs*100:null,note:plans===1&&modes.length===2?'Effective plans identical; no attributed optimization.':state.options.repeats<3?'Single/short sample; preview, not a stable performance estimate.':'Descriptive small sample; not statistical significance.'};
}
export async function runCustom(options){
 safeRelative(options.config,'config');const config=validateConfig(await readJSON(join(options.project,options.config)));validateRequest(config,options);
 for(const file of new Set([config.workspace.after,config.workspace.before,config.runtime.dockerfile].filter(Boolean)))validateDockerfile(await readFile(join(options.project,file),'utf8'),file);
 await mkdir(lab,{recursive:true});const lockfile=join(lab,'active.lock');let lock;
 try{lock=await open(lockfile,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,kind:'custom-build',startedAt:new Date().toISOString()}));}catch(e){throw Error('Another build/setup is active in this Pipeline Lab checkout.',{cause:e});}
 const token=randomUUID().slice(0,12),id='custom-'+Date.now()+'-'+token,folder=join(lab,'custom-evidence',id);
 const state={schema:1,id,name:config.name,status:'running',startedAt:new Date().toISOString(),options,config,runs:[],events:[],environment:null};
 let builder,cancelled=false;const stop=()=>{cancelled=true;console.log('Stop requested. Waiting for the current Docker command and owned-resource cleanup.');};process.on('SIGINT',stop);
 let journal=Promise.resolve();const persist=()=>{journal=journal.then(()=>save(join(folder,'experiment.json'),state));return journal;};
 const event=(type,fields={})=>{state.events.push({type,at:new Date().toISOString(),...fields});console.log(JSON.stringify({type,...fields}));};
 const docker=(args,extra={})=>exec('docker',args,{timeout:config.options.timeoutSeconds*1000,...extra});
 const cleanup=p=>rm(insideLab(p),{recursive:true,force:true});
 try{
  await mkdir(folder,{recursive:true});await cp(new URL('./runner.mjs',import.meta.url),join(folder,'coordinator.mjs'));await cp(new URL('./config.mjs',import.meta.url),join(folder,'config-validator.mjs'));
  const info=JSON.parse((await docker(['info','--format','{{json .}}'])).output);
  if(info.OSType!=='linux'||!['x86_64','amd64'].includes(info.Architecture))throw Error('Custom CLI v1 requires a Linux x64 Docker engine with containerd image storage.');
  const pins=await readJSON(join(root,'engine/toolchain.json'));
  state.environment={docker:JSON.parse((await docker(['version','--format','{{json .}}'])).output),buildx:(await docker(['buildx','version'])).output.trim(),node:process.version,host:{cpus:info.NCPU,memory:info.MemTotal,os:info.OperatingSystem},builderImage:pins.builderImage,limits:{builderCPU:4,builderMemory:'3g',...config.options},timing:'Workspace build through exact-image JSON verification; excludes source staging, base preparation, seed builds and cleanup. Repository mode includes BuildKit cache import/export within workspace build.'};await persist();
  state.execution=process.env.GITHUB_ACTIONS?{platform:'GitHub Actions',commit:process.env.GITHUB_SHA,url:`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`}:{platform:'Local Docker',commit:(await exec('git',['rev-parse','HEAD'],{allowFailure:true})).output.trim(),dirty:!!(await exec('git',['status','--porcelain'],{allowFailure:true})).output.trim()};
  async function base(image){
   if((await docker(['image','inspect',image],{allowFailure:true})).code!==0)await docker(['pull',image]);
   const digest=image.split('@')[1],directory=insideLab(join(lab,'custom-inputs','base-'+digest.slice(7)));
   if(!existsSync(join(directory,'oci-layout'))){await mkdir(directory,{recursive:true});const tar=join(directory,'base.tar');await docker(['image','save','-o',tar,image]);await exec('tar',['-xf',tar,'-C',directory]);}
   const index=await readJSON(join(directory,'index.json')).catch(()=>{throw Error('Custom base export needs Docker containerd image storage. Enable it and remove/rename the incomplete custom base directory.');});
   if(!index.manifests?.some(x=>x.digest===digest))throw Error('Exported custom base digest does not match the pinned image');
   return ['--build-context',`labbase=oci-layout://${directory.replaceAll('\\','/')}@${digest}`,'--build-arg','BASE_IMAGE=labbase'];
  }
  const workspaceBase=await base(config.baseImage),runtimeBase=config.runtimeBaseImage===config.baseImage?workspaceBase:await base(config.runtimeBaseImage);
  const template=join(folder,'original-source');state.sourceCopy=await copyProject(options.project,template,config.exclude);state.originalSource=await hashDirectory(template);
  await save(join(folder,'original-source-manifest.json'),state.originalSource);await save(join(folder,'adapter.json'),config);await persist();
  const preload=join(folder,'preload');await mkdir(preload,{recursive:true});await writeFile(join(preload,'Dockerfile'),'ARG BASE_IMAGE\nFROM ${BASE_IMAGE}\n');
  builder=owned('labca-custom-b-'+token);await docker(['buildx','create','--name',builder,'--driver','docker-container','--driver-opt',`image=${pins.builderImage}`,'--driver-opt','memory=3g','--driver-opt','cpu-period=100000','--driver-opt','cpu-quota=400000']);await docker(['buildx','inspect',builder,'--bootstrap']);
  const cache=insideLab(join(lab,'custom-cache',config.name+'-'+hash(JSON.stringify(config)).slice(0,16))),cacheNext=cache+'-next';
  const modes=options.mode==='compare'?['before','after']:[options.mode];
  async function mutation(directory,fixture){const file=join(directory,fixture.file),text=await readFile(file,'utf8');if(text.split(fixture.from).length!==2)throw Error('Fixture from text must occur exactly once: '+fixture.file);await writeFile(file,text.replace(fixture.from,fixture.to));}
  async function pipeline(mode,scenario,purpose,repetition){
   const runId=owned('labca-custom-'+randomUUID().slice(0,12)),dir=join(folder,runId),source=join(dir,'source');await mkdir(dir,{recursive:true});await cp(template,source,{recursive:true});
   if(['code-change','failure'].includes(scenario))await mutation(source,config.change);if(scenario==='failure')await mutation(source,config.failure);
   const sourceIdentity=await hashDirectory(source),dockerfile=config.workspace[mode],parallelism=mode==='after'?Math.min(config.options.parallelism,config.checks.length):Math.min(config.options.beforeParallelism,config.checks.length);
   const plan={dockerfile:await readFile(join(source,dockerfile),'utf8'),checks:config.checks,parallelism,build:config.build,runtimeDockerfile:await readFile(join(source,config.runtime.dockerfile),'utf8'),verification:config.verify,baseImage:config.baseImage,runtimeBaseImage:config.runtimeBaseImage,resources:config.options};
   const r={id:runId,mode,scenario,purpose,repetition,status:'running',source:sourceIdentity,planHash:hash(JSON.stringify(plan)),parallelism,stages:[],releaseEligible:false,startedAt:new Date().toISOString()};state.runs.push(r);await save(join(dir,'source-manifest.json'),sourceIdentity);await save(join(dir,'plan.json'),plan);await persist();event('run-start',{run:runId,mode,scenario,purpose});
   const workspace='labca-custom/workspace:'+runId,image='labca-custom/'+config.name+':'+runId,containers=[];const persistent=scenario==='repository';
   r.externalCache={enabled:persistent,available:persistent&&existsSync(join(cache,'index.json'))};if(persistent)await cleanup(cacheNext);
   const begin=performance.now();
   async function stage(name,fn){if(existsSync(join(folder,'cancel.request')))cancelled=true;if(cancelled)throw Error('Cancelled by user');const s={name,status:'running',startMs:performance.now()-begin};r.stages.push(s);await persist();event('stage-start',{run:runId,name});
    try{return await fn({log:join(dir,name+'.log'),onData:text=>{if(process.env.CUSTOM_VERBOSE==='1')process.stdout.write(text);}}).then(value=>{s.status='passed';return value;});}catch(e){s.status='failed';s.error=e.message;s.exitCode=e.exitCode??null;throw e;}finally{s.durationMs=performance.now()-begin-s.startMs;await persist();}}
   const caps=['--cpus',String(config.options.cpus),'--memory',config.options.memory,'--network',config.options.network];
   try{
    const install=await stage('workspace',io=>docker(['buildx','build','--builder',builder,'--progress','plain','--load',...workspaceBase,'--target',config.workspace.target,'-f',join(source,dockerfile),'-t',workspace,...(r.externalCache.available?['--cache-from',`type=local,src=${cache}`]:[]),...(persistent?['--cache-to',`type=local,dest=${cacheNext},mode=max`]:[]),source],io));
    const line=config.dependencyStep?install.output.split('\n').find(x=>x.includes('RUN ')&&x.includes(config.dependencyStep)):null,step=line?/#(\d+)/.exec(line)?.[1]:null;
    r.cache={declaredDependencyStep:config.dependencyStep??null,dependencyLayerReused:step?new RegExp('#'+step+' CACHED').test(install.output):null,cachedLogLines:install.output.split('\n').filter(x=>/ CACHED/.test(x)).slice(-30)};
    let index=0;const failures=[];await Promise.all(Array.from({length:parallelism},async()=>{while(index<config.checks.length){const check=config.checks[index++],name=owned(runId+'-'+check.name);containers.push(name);try{await stage(check.name,io=>docker(['run','--name',name,'--label','labca.project=custom',...caps,workspace,...check.command],io));}catch(e){failures.push(e);}}}));if(failures.length)throw failures[0];
    const artifacts=join(dir,'artifacts');await mkdir(artifacts,{recursive:true});
    await stage('build',async io=>{const name=owned(runId+'-build');containers.push(name);await docker(['create','--name',name,...caps,workspace,...config.build.command]);await docker(['start','--attach',name],io);const exit=Number((await docker(['inspect',name,'--format','{{.State.ExitCode}}'])).output.trim());if(exit!==0)throw Error('Artifact build exited '+exit);await docker(['cp',name+':'+config.build.output+'/.',artifacts]);r.artifacts=await hashDirectory(artifacts);if(!r.artifacts.files.length)throw Error('Artifact directory is empty');});
    await stage('package',io=>docker(['buildx','build','--builder',builder,'--progress','plain','--load',...runtimeBase,'-f',join(source,config.runtime.dockerfile),'-t',image,artifacts],io));
    r.imageId=(await docker(['image','inspect',image,'--format','{{.Id}}'])).output.trim();r.imageTag=image;
    await stage('verify',async io=>{const name=owned(runId+'-verify');containers.push(name);const result=await docker(['run','--name',name,...caps,r.imageId,...config.verify.command],io);r.output=JSON.parse(result.output.trim());r.expectedOutput=['code-change','failure'].includes(scenario)?config.verify.changedExpected:config.verify.expected;assertExpected(r.output,r.expectedOutput);});
    r.status='passed';r.releaseEligible=true;
   }catch(e){r.status=cancelled?'cancelled':'failed';r.error=e.message;}
   finally{
    r.elapsedMs=performance.now()-begin;r.finishedAt=new Date().toISOString();r.expected=purpose==='proof'&&scenario==='failure'?'blocked':'passed';
    r.expectationMet=r.expected==='blocked'?verifyFailureProof(r,config.failure,await readFile(join(dir,config.failure.check+'.log'),'utf8').catch(()=>'')):r.status==='passed'&&r.releaseEligible;
    try{await save(join(dir,'result.json'),r);await persist();event('run-end',{run:runId,status:r.status,expected:r.expected,expectationMet:r.expectationMet,seconds:(r.elapsedMs/1000).toFixed(2),image:r.imageTag});}
    finally{for(const name of containers)await docker(['rm','--force',owned(name)],{allowFailure:true,timeout:60000});await docker(['image','rm',workspace],{allowFailure:true,timeout:60000});}
    if(persistent&&r.releaseEligible&&!cancelled){await mkdir(dirname(cache),{recursive:true});await cleanup(cache);await rename(cacheNext,cache);}else if(persistent)await cleanup(cacheNext);
   }return r;
  }
  for(let rep=1;rep<=options.repeats;rep++){
   const order=modes.map((_,i)=>modes[(i+rep-1)%modes.length]);for(const mode of order){if(cancelled)throw Error('Cancelled by user');event('preparation',{mode,repetition:rep,note:'Builder-local cache reset and pinned base preload are outside timing. Only repository mode imports the saved portable cache.'});
    await docker(['buildx','prune','--builder',builder,'--all','--force']);for(const flags of config.runtimeBaseImage===config.baseImage?[workspaceBase]:[workspaceBase,runtimeBase])await docker(['buildx','build','--builder',builder,...flags,'--output','type=cacheonly',preload]);
    if(['code-change','unchanged','failure'].includes(options.scenario)){const seed=await pipeline(mode,'seed','preparation',rep);if(!seed.expectationMet)throw Error('Seed failed; no valid comparison can be made');}
    const r=await pipeline(mode,options.scenario,options.scenario==='failure'?'proof':'measurement',rep);if(!r.expectationMet)state.unexpectedFailures=(state.unexpectedFailures??0)+1;
   }
  }
  state.status=cancelled?'cancelled':state.unexpectedFailures?'completed-with-failures':'completed';
 }catch(e){state.status=cancelled?'cancelled':'aborted';state.error=e.message;event('error',{message:e.message});}
 finally{try{
  if(builder)await docker(['buildx','rm',owned(builder)],{allowFailure:true,timeout:60000});state.finishedAt=new Date().toISOString();state.summary=summarizeCustom(state);await persist();
  const seconds=x=>x===null?'unavailable':(x/1000).toFixed(2);let md=`# Custom app: ${config.name}\n\nStatus: ${state.status}. Scenario: ${options.scenario}. Results are separate from the comparison website.\n\n| Mode | n | Median s | Min–max s |\n|---|---:|---:|---:|\n`;
  for(const row of state.summary.methods)md+=`| ${row.mode} | ${row.n} | ${seconds(row.medianMs)} | ${seconds(row.minMs)}–${seconds(row.maxMs)} |\n`;
  md+=`\nReduction: ${state.summary.reductionPercent===null?'not attributable':state.summary.reductionPercent.toFixed(1)+'%'}. ${state.summary.note}\n\nSource matched: ${state.summary.sourceMatched}. Adapter-defined output assertions are not an exhaustive correctness proof. Timer excludes setup, seeds and cleanup. Base downloads are outside the timer; Dockerfile dependency-network operations remain inside workspace builds.\n`;
  for(const r of state.runs.filter(r=>r.purpose==='proof'))md+=`\nFault proof: ${r.expectationMet?'expected rejection verified':'NOT VERIFIED'}. Required-check failure and blocked packaging are required.\n`;
  await writeFile(join(folder,'SUMMARY.md'),md);
  console.log(md);console.log('Evidence: '+folder);if(state.error)console.error(state.error);
 }finally{await lock.close();await unlink(lockfile);process.removeListener('SIGINT',stop);}}return state;
}
