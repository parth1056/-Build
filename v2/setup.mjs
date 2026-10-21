import {mkdir,readFile,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {root,home,readJSON,save,exec} from './lib.mjs';
import {preparePackages} from './packages.mjs';
const lab=join(root,'.lab');await mkdir(lab,{recursive:true});
const lockpath=join(lab,'active.lock');const lock=await open(lockpath,'wx').catch(()=>{throw new Error('Another setup or experiment is active. Finish it first.');});
await lock.writeFile(JSON.stringify({pid:process.pid,kind:'pipeline-lab-setup',startedAt:new Date().toISOString()}));
const docker=args=>exec('docker',args,{onData:s=>process.stdout.write(s)});
try{
 const pins=await readJSON(join(home,'inputs/toolchain.json'));
 const info=JSON.parse((await exec('docker',['info','--format','{{json .}}'])).output);
 if(info.OSType!=='linux'||!['x86_64','amd64'].includes(info.Architecture))throw new Error('Use Docker Desktop Linux x64 containers.');
 for(const image of [pins.baseImage,pins.builderImage]){
  if((await exec('docker',['image','inspect',image],{allowFailure:true})).code!==0)await docker(['pull',image]);
 }
 const digest=pins.baseImage.split('@')[1];
 const layout=join(lab,'base-oci-'+digest.slice(7,19));await mkdir(layout,{recursive:true});
 try{await readFile(join(layout,'oci-layout'));}catch(e){
  if(e.code!=='ENOENT')throw e;
  const archive=join(lab,'node-base.tar');await docker(['image','save','-o',archive,pins.baseImage]);await exec('tar',['-xf',archive,'-C',layout]);
 }
 const index=await readJSON(join(layout,'index.json')).catch(()=>{throw new Error('The base export must be OCI format. Enable Docker Desktop containerd image store and rerun setup.');});
 if(!index.manifests.some(m=>m.digest===digest))throw new Error('Exported base does not match the pinned digest');
 const packages=join(lab,'package-inputs');
 await preparePackages(join(home,'inputs/invoice-source-lock.json'),packages);
 const packageInputs=await preparePackages(join(home,'inputs/invoice-upgrade-source-lock.json'),packages);
 const environment={createdAt:new Date().toISOString(),baseImage:pins.baseImage,builderImage:pins.builderImage,dockerVersion:JSON.parse((await exec('docker',['version','--format','{{json .}}'])).output),buildxVersion:(await exec('docker',['buildx','version'])).output.trim(),coordinator:{node:process.version,platform:process.platform,architecture:process.arch},host:{cpus:info.NCPU,memory:info.MemTotal,os:info.OperatingSystem,architecture:info.Architecture},resources:pins.resources,baseLayout:layout,baseTransport:'local OCI layout; registry access excluded from measured builds',packageDirectory:packages,packageInputs,dependencyTransport:'fixed integrity-verified local tarballs; offline installation; no Internet-download timing claim'};
 await save(join(lab,'environment.json'),environment);
 console.log('\nPinned setup inputs ready. Run node v2/prepare.mjs, then npm.cmd run demo.');
}finally{await lock.close();await unlink(lockpath);}
