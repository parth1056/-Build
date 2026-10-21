import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {home,store,readJSON,exec,save} from './lib.mjs';
const docker=args=>exec('docker',args);
const version=JSON.parse((await docker(['version','--format','{{json .}}'])).output);
const proof={checkedAt:new Date().toISOString(),docker:version,buildx:(await docker(['buildx','version'])).output.trim(),builder:null,checks:[]};
const experiments=[];for(const d of await readdir(store,{withFileTypes:true})){if(d.isDirectory()&&d.name.startsWith('experiment-'))experiments.push(await readJSON(join(store,d.name,'experiment.json')));}
const active=experiments.find(e=>e.status==='running');
if(active){
 const name='buildx_buildkit_labca-v2-'+active.id.replace('experiment-','')+'0';
 const b=JSON.parse((await docker(['inspect',name])).output)[0];
 proof.builder={name:b.Name,image:b.Config.Image,cpuPeriod:b.HostConfig.CpuPeriod,cpuQuota:b.HostConfig.CpuQuota,memory:b.HostConfig.Memory};
 if(proof.builder.cpuQuota/proof.builder.cpuPeriod!==4||proof.builder.memory!==3*1024**3)throw new Error('Actual builder limits disagree with protocol');
}
const ids=(await docker(['ps','-aq','--filter','label=labca.project=ci-performance-v2'])).output.trim().split(/\s+/).filter(Boolean).slice(0,3);
for(const id of ids){const c=JSON.parse((await docker(['inspect',id])).output)[0];proof.checks.push({name:c.Name,image:c.Config.Image,cpu:c.HostConfig.NanoCpus/1e9,memory:c.HostConfig.Memory,network:c.HostConfig.NetworkMode});}
for(const c of proof.checks)if(c.cpu!==1||c.memory!==1024**3||c.network!=='none')throw new Error('Actual validation container limits disagree with protocol');
await save(join(home,'environment-verification.json'),proof);
console.log(JSON.stringify({docker:version.Server.Version,buildx:proof.buildx,builder:proof.builder,validationContainersInspected:proof.checks.length}));
