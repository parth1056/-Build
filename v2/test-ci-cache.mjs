// Integration proof: a new builder imports the prior builder's portable layers.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {home,save} from './lib.mjs';
import {campaign} from './runner.mjs';
const release=join(home,'workloads/invoice/src/release.ts'),metadata=join(home,'workloads/invoice/release.json');
const original=await readFile(release),originalMetadata=await readFile(metadata);
const spec={workloads:['invoice'],modes:['combined'],scenario:'repository',starting:'conventional',repeats:1};
try{
 const first=await campaign(spec);assert.equal(first.status,'completed');
 const message='Portable cache proof: changed application code';
 await writeFile(release,`export const applicationRelease = '${message}';\n`);await save(metadata,{message});
 const second=await campaign(spec);assert.equal(second.status,'completed');
 const a=first.runs[0],b=second.runs[0];assert.notEqual(a.identity.sourceHash,b.identity.sourceHash);
 assert.equal(b.externalCache.available,true);assert.equal(b.cache.installLayerReused,true);
 assert.equal(b.output.releaseMessage,message);assert.equal(b.releaseEligible,true);
 for(const check of b.plan.checks)assert.equal(b.stages.find(s=>s.name===check)?.status,'passed');
 await save(join(home,'portable-cache-verification.json'),{verifiedAt:new Date().toISOString(),platform:'local',first:first.id,changedSource:second.id,newBuilderEachCampaign:true,dependencyLayerImported:true,allChecksReran:true,changedApplicationDelivered:true,note:'Local end-to-end validation of the portable cache used by Actions. GitHub cache upload/download requires a hosted run.'});
 console.log('PASS: new builder reused exported dependencies after real source change; all checks reran and changed output was delivered.');
}finally{await writeFile(release,original);await writeFile(metadata,originalMetadata);}
