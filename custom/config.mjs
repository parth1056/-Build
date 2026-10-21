import {readFile,readdir,mkdir,copyFile,lstat} from 'node:fs/promises';
import {isAbsolute,resolve,join,relative,sep,dirname} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {hash} from '../v2/lib.mjs';
const fail=message=>{throw Error(message);};
export function safeRelative(value,label='path'){
 if(typeof value!=='string'||!value||isAbsolute(value)||value.includes('\\')||value.includes(':')||value.split('/').some(x=>['','..','.'].includes(x)))fail(label+' must be a clean project-relative path using /');
 return value;
}
const command=(v,label)=>{if(!Array.isArray(v)||!v.length||v.length>64||v.some(x=>typeof x!=='string'||!x||x.includes('\0')||x.length>8192))fail(label+' must be a nonempty command argument array');return v;};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validateConfig(input){
 const c=structuredClone(input);if(!object(c)||c.schema!==1)fail('Configuration requires schema: 1');
 if(!/^[a-z][a-z0-9-]{0,47}$/.test(c.name??''))fail('name must be lowercase letters/numbers/hyphens, starting with a letter');
 for(const key of ['baseImage','runtimeBaseImage'])if(c[key]!==undefined&&!/^[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}$/.test(c[key]))fail(key+' must be an image pinned with @sha256:<64 hex characters>');
 if(!c.baseImage)fail('baseImage is required');c.runtimeBaseImage??=c.baseImage;
 if(!object(c.workspace)||!c.workspace.after)fail('workspace.after Dockerfile is required');
 for(const key of ['before','after'])if(c.workspace[key])safeRelative(c.workspace[key],'workspace.'+key);
 c.workspace.target??='workspace';if(!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(c.workspace.target))fail('Invalid workspace target');
 if(!Array.isArray(c.checks)||c.checks.length<1||c.checks.length>8)fail('Provide 1–8 independent checks');
 const names=new Set();for(const check of c.checks){if(!object(check)||!/^[a-z][a-z0-9-]{0,31}$/.test(check.name??'')||['workspace','build','package','verify'].includes(check.name)||names.has(check.name))fail('Check names must be unique and cannot shadow build stages');names.add(check.name);command(check.command,'check '+check.name);}
 if(!object(c.build))fail('build is required');command(c.build.command,'build.command');
 if(typeof c.build.output!=='string'||!/^\/[a-zA-Z0-9_./-]+$/.test(c.build.output)||c.build.output.split('/').includes('..')||c.build.output.endsWith('/')||['/app','/etc','/usr','/root','/home'].includes(c.build.output))fail('build.output must identify a dedicated absolute container artifact directory, e.g. /app/dist');
 if(!object(c.runtime))fail('runtime is required');safeRelative(c.runtime.dockerfile,'runtime.dockerfile');
 if(!object(c.verify)||!object(c.verify.expected)||!Object.keys(c.verify.expected).length)fail('verify.expected must be a nonempty JSON object');command(c.verify.command,'verify.command');
 for(const key of ['change','failure'])if(c[key]!==undefined){const x=c[key];if(!object(x))fail(key+' must be an object');safeRelative(x.file,key+'.file');if(typeof x.from!=='string'||!x.from||typeof x.to!=='string'||x.from===x.to)fail(key+' requires distinct nonempty from/to text');}
 if(c.change&&(!object(c.verify.changedExpected)||!Object.keys(c.verify.changedExpected).length||isDeepStrictEqual(c.verify.expected,c.verify.changedExpected)))fail('A source change requires distinct verify.changedExpected assertions');
 c.options??={};if(!object(c.options))fail('options must be an object');const o=c.options;o.parallelism??=3;o.timeoutSeconds??=300;o.cpus??=1;o.memory??='1g';o.network??='none';
 if(!Number.isInteger(o.parallelism)||o.parallelism<1||o.parallelism>3)fail('parallelism must be 1–3');
 if(!Number.isInteger(o.timeoutSeconds)||o.timeoutSeconds<10||o.timeoutSeconds>600)fail('timeoutSeconds must be 10–600');
 if(typeof o.cpus!=='number'||o.cpus<0.25||o.cpus>4)fail('cpus must be 0.25–4');
 const mem=/^([1-9][0-9]*)(m|g)$/.exec(o.memory);if(!mem||Number(mem[1])*(mem[2]==='g'?1024:1)<128||Number(mem[1])*(mem[2]==='g'?1024:1)>4096)fail('memory must be 128m–4096m or 1g–4g');
 if(!['none','default'].includes(o.network))fail('network must be none or default');
 c.exclude??=[];if(!Array.isArray(c.exclude))fail('exclude must be an array');for(const x of c.exclude)safeRelative(x,'exclude');
 if(c.dependencyStep!==undefined&&(typeof c.dependencyStep!=='string'||!c.dependencyStep.trim()))fail('dependencyStep must be text found in the dependency RUN instruction');
 return c;
}
export function validateRequest(c,r){
 if(!['before','after','compare'].includes(r.mode)||!['repository','code-change','unchanged','cold','failure'].includes(r.scenario))fail('Unknown mode or scenario');
 if(!Number.isInteger(r.repeats)||r.repeats<1||r.repeats>5)fail('repeats must be 1–5');
 if(r.mode!=='after'&&!c.workspace.before)fail('Before/compare requires workspace.before; the CLI does not invent a baseline');
 if(['code-change','failure'].includes(r.scenario)&&!c.change)fail('This scenario requires a declared source change and changed-output assertions');
 if(r.scenario==='failure'&&(!c.failure||r.mode!=='after'||r.repeats!==1))fail('Failure proof requires failure fixture, mode after and one repetition');
 if(r.scenario==='repository'&&(r.mode!=='after'||r.repeats!==1))fail('Repository builds run mode after once; choose an explicit controlled scenario for comparisons');
 return r;
}
export function assertExpected(actual,expected,path='output'){
 if(object(expected)){if(!object(actual))fail(path+' must be an object');for(const [key,value] of Object.entries(expected)){if(!Object.hasOwn(actual,key))fail(path+'.'+key+' is missing');assertExpected(actual[key],value,path+'.'+key);}}
 else if(!isDeepStrictEqual(actual,expected))fail(path+': expected '+JSON.stringify(expected)+', received '+JSON.stringify(actual));
}
export function validateDockerfile(text,label){
 const aliases=new Set();let used=false,count=0;
 for(const line of text.split(/\r?\n/)){const m=/^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+([\w-]+))?\s*(?:#.*)?$/i.exec(line);if(!m)continue;count++;const image=m[1];if(image==='${BASE_IMAGE}')used=true;else if(!aliases.has(image.toLowerCase()))fail(label+': FROM must use ${BASE_IMAGE} or a preceding stage alias');if(m[2])aliases.add(m[2].toLowerCase());}
 if(!count||!used)fail(label+' must declare ARG BASE_IMAGE and use FROM ${BASE_IMAGE}');
}
const defaults=new Set(['.git','.lab','node_modules','.venv','venv','__pycache__']);
export async function copyProject(source,destination,exclude=[]){
 let count=0,total=0;const prefix=resolve(destination)+sep;
 async function walk(dir){for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const from=join(dir,e.name),p=relative(source,from).split(sep).join('/');if(defaults.has(e.name)||e.name==='.env'||e.name.startsWith('.env.')||exclude.some(x=>p===x||p.startsWith(x+'/')))continue;
  const st=await lstat(from);if(st.isSymbolicLink())fail('Source symlinks/junctions are unsupported: '+p);
  const to=resolve(destination,p);if(!to.startsWith(prefix))fail('Unsafe source path');
  if(st.isDirectory()){await mkdir(to,{recursive:true});await walk(from);}else if(st.isFile()){count++;total+=st.size;if(count>20000||st.size>100*1024**2||total>256*1024**2)fail('Source exceeds v1 limits: 20,000 files, 100 MiB/file, 256 MiB total');await mkdir(dirname(to),{recursive:true});await copyFile(from,to);}else fail('Unsupported source entry: '+p);
 }}await mkdir(destination,{recursive:true});await walk(source);return {files:count,bytes:total};
}
export async function hashDirectory(directory){
 const files=[];async function walk(p){for(const e of (await readdir(p,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const f=join(p,e.name),st=await lstat(f);if(st.isSymbolicLink())fail('Cannot hash symlink output: '+f);if(st.isDirectory())await walk(f);else if(st.isFile())files.push({path:relative(directory,f).split(sep).join('/'),sha256:hash(await readFile(f))});else fail('Unsupported output file');}}await walk(directory);return {sha256:hash(JSON.stringify(files)),files};
}
