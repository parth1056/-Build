import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const home = join(root, 'v2');
export const store = join(home, 'evidence');
export const readJSON = async p => JSON.parse(await readFile(p, 'utf8'));
export async function save(p, value) {
  await mkdir(dirname(p), { recursive: true }); const tmp = `${p}.tmp`; await writeFile(tmp, JSON.stringify(value, null, 2));
  // Windows readers/antivirus can briefly hold the destination during atomic replacement.
  for(let attempt=0;attempt<12;attempt++){
    try{await rename(tmp,p);return;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||attempt===11)throw e;await new Promise(r=>setTimeout(r,25*(attempt+1)));}
  }
}
export const hash = x => createHash('sha256').update(x).digest('hex');
export async function tree(path) {
  const files = [];
  async function walk(p) { for (const e of (await readdir(p, { withFileTypes: true })).sort((a,b)=>a.name.localeCompare(b.name))) { if (['node_modules','dist'].includes(e.name)) continue; const f=join(p,e.name); if(e.isDirectory()) await walk(f); else files.push({path:relative(path,f).replaceAll('\\','/'),sha256:hash(await readFile(f))}); } }
  await walk(path); return {files,sha256:hash(JSON.stringify(files))};
}
export function exec(bin, args, { cwd=root, log, onData=()=>{}, allowFailure=false, timeout=600000 }={}) {
  return new Promise((resolve,reject)=>{
    const process=spawn(bin,args,{cwd,windowsHide:true,shell:false}); let output='',timedOut=false;
    const chunks=[]; const append=b=>{const s=b.toString(); output=(output+s).slice(-1500000); chunks.push(s); onData(s);};
    process.stdout.on('data',append); process.stderr.on('data',append);
    const timer=setTimeout(()=>{timedOut=true;process.kill();},timeout);
    let error;
    process.on('error',e=>{error=e;});
    process.on('close',async code=>{clearTimeout(timer); try {if(log){await mkdir(dirname(log),{recursive:true});await writeFile(log,chunks.join(''));} if(error)throw error; if((code!==0||timedOut)&&!allowFailure)throw new Error(`${bin} ${args.slice(0,3).join(' ')} failed: ${timedOut?'timeout':code}\n${output.slice(-1800)}`); resolve({code,output,timedOut});}catch(e){reject(e);}});
  });
}
export const median = list => { if(!list.length) return null; const n=[...list].sort((a,b)=>a-b),m=Math.floor(n.length/2); return n.length%2?n[m]:(n[m-1]+n[m])/2; };
export const definitions = {
  invoice: {name:'Invoice engine',kind:'Dependency-rich TypeScript app',need:'Calculate invoice totals, discounts and tax while rejecting invalid inputs.',checks:['lint','types','tests'],expected:'Dependencies and TypeScript tools give caching a plausible benefit.',runtime:'main.cjs'},
  publisher: {name:'Document publisher',kind:'Batch processing and compression',need:'Validate a document corpus and publish verified gzip/Brotli release assets.',checks:['schema','gzip','brotli'],expected:'Independent corpus checks can overlap; compression and packaging remain real work.',runtime:'main.mjs'},
  lean: {name:'Release manifest validator',kind:'Small dependency-free control',need:'Reject unsafe or incomplete release manifests before packaging.',checks:['syntax','rules','tests'],expected:'Little reusable dependency work; orchestration may outweigh parallel savings.',runtime:'main.mjs'},
};
export const modes={baseline:{name:'Before',layered:false,parallel:false},cache:{name:'Cache only',layered:true,parallel:false},parallel:{name:'Parallel only',layered:false,parallel:true},combined:{name:'After',layered:true,parallel:true}};
export function plan(workload,mode,starting='conventional') {
  if(!definitions[workload]||!modes[mode]||!['conventional','tuned'].includes(starting)) throw new Error('Invalid pipeline selection');
  const tuned=starting==='tuned'; const layered=tuned||modes[mode].layered; const parallel=tuned||modes[mode].parallel;
  const install='RUN --network=none --mount=type=bind,from=packages,target=/packages,ro --mount=type=cache,id=labca-v2-npm,target=/npm-cache npm ci --offline --cache /npm-cache --no-audit --no-fund';
  const dockerfile=`ARG BASE_IMAGE\nFROM \${BASE_IMAGE}\nWORKDIR /app\n${layered?'COPY package.json package-lock.json ./\n'+install+'\nCOPY . ./':'COPY . ./\n'+install}\n`;
  return {workload,mode,starting,layered,parallel,checks:definitions[workload].checks,dockerfile,planHash:hash(JSON.stringify({dockerfile,parallel,checks:definitions[workload].checks})),reasons:[layered?'Install depends only on package manifests: source-only changes can reuse its layer.':'Simple source-first Dockerfile: source edits invalidate the install layer even when dependencies are unchanged.',parallel?'Checks read the same snapshot independently and run together; all must pass.':'Checks execute one after another; build waits for all required checks.',tuned?'Starting pipeline already has both techniques: no further structural optimization is applied.':'Four configurations isolate layer placement and check scheduling.'],changes:tuned?[]:[...(layered?['Move dependency manifests and installation before source COPY']:[]),...(parallel?['Run independent checks concurrently']:[])]};
}
