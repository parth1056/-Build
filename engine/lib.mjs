import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const readJSON = async p => JSON.parse(await readFile(p, 'utf8'));
export async function save(p, value) {
  await mkdir(dirname(p), { recursive: true }); const tmp = `${p}.tmp`; await writeFile(tmp, JSON.stringify(value, null, 2));
  // Windows readers/antivirus can briefly hold the destination during atomic replacement.
  for(let attempt=0;attempt<12;attempt++){
    try{await rename(tmp,p);return;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||attempt===11)throw e;await new Promise(r=>setTimeout(r,25*(attempt+1)));}
  }
}
export const hash = x => createHash('sha256').update(x).digest('hex');
export function exec(bin, args, { cwd=root, log, onData=()=>{}, allowFailure=false, timeout=600000 }={}) {
  return new Promise((resolve,reject)=>{
    const process=spawn(bin,args,{cwd,windowsHide:true,shell:false}); let output='',timedOut=false;
    const chunks=[]; const append=b=>{const s=b.toString(); output=(output+s).slice(-1500000); chunks.push(s); onData(s);};
    process.stdout.on('data',append); process.stderr.on('data',append);
    const timer=setTimeout(()=>{timedOut=true;process.kill();},timeout);
    let error;
    process.on('error',e=>{error=e;});
    process.on('close',async code=>{clearTimeout(timer); try {if(log){await mkdir(dirname(log),{recursive:true});await writeFile(log,chunks.join(''));} if(error)throw error; if((code!==0||timedOut)&&!allowFailure){const failure=new Error(`${bin} ${args.slice(0,3).join(' ')} failed: ${timedOut?'timeout':code}\n${output.slice(-1800)}`);failure.exitCode=timedOut?null:code;throw failure;} resolve({code,output,timedOut});}catch(e){reject(e);}});
  });
}
export const median = list => { if(!list.length) return null; const n=[...list].sort((a,b)=>a-b),m=Math.floor(n.length/2); return n.length%2?n[m]:(n[m-1]+n[m])/2; };
