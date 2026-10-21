import { cp,mkdir,writeFile,readFile,rm,open,unlink,rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root,home,store,readJSON,save,tree,exec,definitions,modes,plan } from './lib.mjs';

const docker=(args,options)=>exec('docker',args,options);
const flag=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
export function validateOptions(x){
  if(!Array.isArray(x.workloads)||!x.workloads.length||x.workloads.some(w=>!definitions[w]))throw new Error('Choose known workloads');
  if(!Array.isArray(x.modes)||!x.modes.length||x.modes.some(m=>!modes[m]))throw new Error('Choose known configurations');
  if(!['conventional','tuned'].includes(x.starting)||!['source-change','unchanged','cold','dependency-change','failure','cache-miss','repository'].includes(x.scenario))throw new Error('Invalid experiment condition');
  if(!Number.isInteger(x.repeats)||x.repeats<1||x.repeats>5)throw new Error('Repetitions must be 1–5');
  if(x.scenario==='dependency-change'&&x.workloads.some(w=>w!=='invoice'))throw new Error('Dependency upgrade applies to Invoice engine only');
  if(x.scenario==='repository'&&(x.workloads.length!==1||x.modes.length!==1||x.modes[0]!=='combined'||x.repeats!==1||x.starting!=='conventional'))throw new Error('Repository CI runs one optimized workload once; use controlled scenarios for comparisons');
  return x;
}
const emit=x=>process.stdout.write(JSON.stringify(x)+'\n');
const owned=name=>{if(!/^labca-v2-[a-z0-9-]+$/.test(name))throw new Error('Refusing an unowned Docker resource');return name;};
export async function campaign(options){
  validateOptions(options);await mkdir(store,{recursive:true});
  const lockfile=join(root,'.lab/active.lock');let lock;
  try{lock=await open(lockfile,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,kind:'v2-campaign',startedAt:new Date().toISOString()}));}catch(e){throw new Error('Another experiment is active (shared .lab/active.lock). Do not run two together.',{cause:e});}
  const id='experiment-'+Date.now()+'-'+randomUUID().slice(0,6),folder=join(store,id);
  const state={schema:2,id,options,status:'running',startedAt:new Date().toISOString(),runs:[],events:[],environment:null,execution:process.env.GITHUB_ACTIONS==='true'?{platform:'github-actions',repository:process.env.GITHUB_REPOSITORY,commit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,url:`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`}:{platform:'local'}};
  let queue=Promise.resolve();
  const persist=()=>{const snap=structuredClone(state);queue=queue.then(()=>save(join(folder,'experiment.json'),snap));void queue.catch(()=>{});return queue;};
  const event=(type,fields={})=>{const item={type,at:new Date().toISOString(),...fields};if(type!=='log'){state.events.push(item);void persist();}emit(item);};
  let builder;
  try{
    const env=await readJSON(join(root,'.lab/environment.json'));
    const current=JSON.parse((await docker(['info','--format','{{json .}}'])).output);
    if(current.OSType!=='linux'||!['x86_64','amd64'].includes(current.Architecture))throw new Error('Use Docker Linux x64 containers');
    state.environment={...env,measuredAt:new Date().toISOString(),currentDocker:{cpus:current.NCPU,memory:current.MemTotal,os:current.OperatingSystem},node:process.version,controls:{builderCPU:4,builderRAM:'3g',checkCPU:1,checkRAM:'1g',parallelChecks:3,validationNetwork:'none',packageInputs:'fixed verified local tarballs',boundary:'workspace image build through exact runtime-image verification; excludes source staging, builder reset, base preload, seed build and cleanup'}};
    await mkdir(folder,{recursive:true});await cp(join(home,'runner.mjs'),join(folder,'runner.mjs'));await cp(join(home,'lib.mjs'),join(folder,'lib.mjs'));await cp(join(env.packageDirectory,'package-inputs.json'),join(folder,'package-inputs.json'));await persist();
    event('campaign',{id,options});
    const digest=env.baseImage.split('@')[1];
    const baseFlags=['--build-context',`pinnedbase=oci-layout://${env.baseLayout.replaceAll('\\','/')}@${digest}`,'--build-arg','BASE_IMAGE=pinnedbase'];
    const baseContext=join(folder,'base');await mkdir(baseContext,{recursive:true});await writeFile(join(baseContext,'Dockerfile'),'ARG BASE_IMAGE\nFROM ${BASE_IMAGE}\n');
    builder=owned('labca-v2-'+id.replace('experiment-',''));
    await docker(['buildx','create','--name',builder,'--driver','docker-container','--driver-opt',`image=${env.builderImage}`,'--driver-opt','memory=3g','--driver-opt','cpu-period=100000','--driver-opt','cpu-quota=400000']);
    await docker(['buildx','inspect',builder,'--bootstrap']);
    async function snapshot(workload,scenario,pipeline,destination){
      await cp(join(home,'workloads',workload),destination,{recursive:true});
      if(['source-change','cache-miss','failure'].includes(scenario)){
        const changed='Changed release: optimization must deliver this version';
        await save(join(destination,'release.json'),{message:changed});
        const file=join(destination,'src','release.'+(workload==='invoice'?'ts':'mjs'));
        const text=await readFile(file,'utf8');if(!text.includes('Original release'))throw new Error('Source-change fixture no longer matches the app');
        await writeFile(file,text.replace('Original release',changed));
      }
      if(scenario==='dependency-change'){
        const p=await readJSON(join(destination,'package.json'));p.dependencies.zod='4.6.7';await save(join(destination,'package.json'),p);
        await cp(join(home,'inputs/invoice-upgrade-lock.json'),join(destination,'package-lock.json'));
      }
      if(scenario==='failure'){
        if(workload==='invoice'){
          const file=join(destination,'src/invoice.ts'),source=await readFile(file,'utf8');
          if(!source.includes('total:subtotal-discount+tax'))throw new Error('Invoice regression fixture no longer matches');
          await writeFile(file,source.replace('total:subtotal-discount+tax','total:subtotal-discount+tax+1'));
        }else if(workload==='lean'){
          const file=join(destination,'src/rules.mjs'),source=await readFile(file,'utf8');
          if(!source.includes('return !!x'))throw new Error('Manifest regression fixture no longer matches');
          await writeFile(file,source.replace('return !!x','return false && !!x'));
        }else{
          const file=join(destination,'corpus/0000.json'),document=await readJSON(file);document.id='invalid document ID';await save(file,document);
        }
      }
      const manifest=await tree(destination);const release=await readJSON(join(destination,'release.json'));
      const metadata={workload,sourceHash:manifest.sha256,revision:manifest.sha256.slice(0,12),releaseMessage:release.message};
      await save(join(destination,'metadata.json'),metadata);await save(join(destination,'source-manifest.json'),manifest);await writeFile(join(destination,'Dockerfile'),pipeline.dockerfile);
      return metadata;
    }
    async function pipelineRun(workload,mode,scenario,purpose,repetition){
      const p=plan(workload,mode,options.starting),runId=owned('labca-v2-'+randomUUID().slice(0,12));
      const dir=join(folder,runId),context=join(dir,'source');await mkdir(dir,{recursive:true});
      const identity=await snapshot(workload,scenario,p,context),commands=await readJSON(join(context,'commands.json'));
      const record={id:runId,workload,mode,scenario,purpose,repetition,plan:p,identity,status:'running',releaseEligible:false,stages:[],startedAt:new Date().toISOString()};
      state.runs.push(record);await persist();event('run-start',{run:record});
      const workspace='labca-v2/workspace:'+runId,image='labca-v2/output:'+runId,containers=[];
      const runtime=join(dir,'runtime');
      const begin=performance.now();
      async function stage(name,action){
        try{await readFile(join(folder,'cancel.request'));throw new Error('Experiment stopped by user');}catch(e){if(e.code!=='ENOENT')throw e;}
        const s={name,status:'running',startMs:performance.now()-begin};record.stages.push(s);event('stage-start',{runId,name,startMs:s.startMs});
        try{const value=await action({log:join(dir,name+'.log'),onData:chunk=>event('log',{runId,stage:name,text:chunk.slice(-4000)})});s.status='passed';return value;}
        catch(e){s.status='failed';s.error=e.message;throw e;}
        finally{s.durationMs=performance.now()-begin-s.startMs;event('stage-end',{runId,stage:s});}
      }
      const cacheFolder=join(root,'.lab','ci-cache',workload),cacheNext=cacheFolder+'-next';
      const persistent=scenario==='repository';
      if(persistent)await rm(cacheNext,{recursive:true,force:true});
      record.externalCache={enabled:persistent,available:persistent&&existsSync(join(cacheFolder,'index.json')),transport:'BuildKit local export; GitHub Actions cache restores/saves it between jobs'};
      const bf=['--builder',builder,'--progress','plain','--load',...baseFlags,'--build-context',`packages=${env.packageDirectory}`,...(record.externalCache.available?['--cache-from',`type=local,src=${cacheFolder}`]:[]),...(persistent?['--cache-to',`type=local,dest=${cacheNext},mode=max`]:[])];
      const check=name=>stage(name,io=>{const c=owned(runId+'-'+name);containers.push(c);return docker(['run','--name',c,'--label','labca.project=ci-performance-v2','--cpus','1','--memory','1g','--network','none','--env','CI=true',workspace,...commands[name]],io);});
      try{
        const installation=await stage('install',io=>docker(['buildx','build',...bf,'-t',workspace,context],io));
        const step=installation.output.match(/#(\d+) \[[^\n]*\] RUN [^\n]*npm ci/);
        record.cache={installStep:step?.[1]??null,installLayerReused:step?new RegExp('#'+step[1]+' CACHED').test(installation.output):null,lines:installation.output.split('\n').filter(x=>/CACHED|npm ci|added \d+ packages/.test(x)).slice(-20)};
        if(p.parallel){const all=await Promise.allSettled(p.checks.map(check));const failed=all.find(x=>x.status==='rejected');if(failed)throw failed.reason;}else for(const name of p.checks)await check(name);
        await mkdir(runtime,{recursive:true});
        await stage('build',async io=>{const c=owned(runId+'-build');containers.push(c);await docker(['create','--name',c,'--cpus','1','--memory','1g','--network','none',workspace,...commands.build]);await docker(['start','--attach',c],io);await docker(['cp',c+':/app/dist',runtime]);});
        const runtimeDockerfile=`ARG BASE_IMAGE\nFROM \${BASE_IMAGE}\nWORKDIR /app\nCOPY --chown=node:node dist/ ./\nUSER node\nCMD ["node","${definitions[workload].runtime}"]\n`;
        await writeFile(join(runtime,'Dockerfile'),runtimeDockerfile);
        await stage('package',io=>docker(['buildx','build','--builder',builder,'--progress','plain','--load',...baseFlags,'-t',image,runtime],io));
        record.imageId=(await docker(['image','inspect',image,'--format','{{.Id}}'])).output.trim();
        await stage('verify',async io=>{
          const c=owned(runId+'-verify');containers.push(c);
          let actual;
          if(workload==='invoice'){
            await docker(['run','--detach','--name',c,'--cpus','1','--memory','256m','--network','none',record.imageId]);
            const smoke=`const a=require('node:assert/strict');(async()=>{let h;for(let i=0;i<50;i++){try{h=await(await fetch('http://127.0.0.1:3000/health')).json();break}catch{await new Promise(r=>setTimeout(r,100));}}a.ok(h,'server readiness');const req=b=>fetch('http://127.0.0.1:3000/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const good=await req({quantity:3,unitCents:1999,discountPercent:10,taxPercent:18});a.equal(good.status,200);a.equal((await good.json()).total,6368);a.equal((await req({quantity:-1})).status,400);console.log(JSON.stringify({...h,application:'invoice-engine',total:6368,valid:true}));})().catch(e=>{console.error(e);process.exitCode=1});`;
            actual=await docker(['exec',c,'node','-e',smoke],io);
          }else actual=await docker(['run','--name',c,'--cpus','1','--memory','512m','--network','none',record.imageId],io);
          record.output=JSON.parse(actual.output.trim());
          if(record.output.sourceHash!==identity.sourceHash||record.output.releaseMessage!==identity.releaseMessage)throw new Error('Runtime output is stale or from a different source');
          if(workload==='publisher'){const corpus=await readJSON(join(home,'inputs/corpus.json'));if(record.output.documents!==corpus.documents||record.output.bytes!==corpus.bytes||!record.output.verified)throw new Error('Published corpus output does not match input');}
          if(workload==='lean'&&(!record.output.valid||record.output.files!==2))throw new Error('Release contract failed');
        });
        record.status='passed';record.releaseEligible=true;
      }catch(e){record.status='failed';record.error=e.message;}
      finally{
        record.elapsedMs=performance.now()-begin;record.finishedAt=new Date().toISOString();
        record.expected=purpose==='proof'&&scenario==='failure'?'blocked':'passed';
        record.expectationMet=record.expected==='blocked'?record.status==='failed'&&!record.releaseEligible&&!record.stages.some(s=>s.name==='package')&&record.stages.some(s=>p.checks.includes(s.name)&&s.status==='failed'):record.status==='passed'&&record.releaseEligible;
        await save(join(dir,'result.json'),record);await persist();event('run-end',{run:record});
        for(const c of containers)await docker(['rm','--force',owned(c)],{allowFailure:true});
        await docker(['image','rm',workspace],{allowFailure:true});
        // Runtime copy is temporary; preserve source, hashes, output identity and raw logs.
        const target=resolve(runtime);if(!target.startsWith(resolve(folder)+ '\\')&&!target.startsWith(resolve(folder)+'/'))throw new Error('Unsafe cleanup path');
        await rm(target,{recursive:true,force:true});
        // Promote a portable cache only after the complete release gate passes.
        if(persistent&&record.releaseEligible){await mkdir(join(cacheFolder,'..'),{recursive:true});await rm(cacheFolder,{recursive:true,force:true});await rename(cacheNext,cacheFolder);}
        else if(persistent)await rm(cacheNext,{recursive:true,force:true});
      }
      return record;
    }
    for(let rep=1;rep<=options.repeats;rep++)for(const workload of options.workloads){
      const order=options.modes.map((_,i)=>options.modes[(i+rep-1)%options.modes.length]);
      for(const mode of order){
        event('preparation',{workload,mode,repetition:rep,message:'Resetting this experiment-owned cache and loading the shared pinned base. Not part of measured time.'});
        await docker(['buildx','prune','--builder',builder,'--all','--force']);
        await docker(['buildx','build','--builder',builder,...baseFlags,'--output','type=cacheonly',baseContext]);
        if(!['cold','cache-miss','repository'].includes(options.scenario)){
          const seed=await pipelineRun(workload,mode,'seed','preparation',rep);if(!seed.releaseEligible)throw new Error('Preparation build failed; no measured comparison attempted');
        }
        const proof=['failure','cache-miss'].includes(options.scenario);
        const run=await pipelineRun(workload,mode,options.scenario,proof?'proof':'measurement',rep);
        if(!run.expectationMet)state.unexpectedFailures=(state.unexpectedFailures??0)+1;
      }
    }
    state.status=state.unexpectedFailures?'completed-with-failures':'completed';
  }catch(e){state.status='aborted';state.error=e.message;event('error',{message:e.message});}
  finally{
    state.finishedAt=new Date().toISOString();
    if(builder)await docker(['buildx','rm',owned(builder)],{allowFailure:true});
    await lock.close();await unlink(lockfile);event('campaign-end',{id,status:state.status});await persist();
  }
  return state;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const options=validateOptions({workloads:flag('workloads','invoice').split(','),modes:flag('modes','baseline,combined').split(','),starting:flag('starting','conventional'),scenario:flag('scenario','source-change'),repeats:Number(flag('repeats','1'))});
  const result=await campaign(options);if(result.status!=='completed')process.exitCode=1;
}
