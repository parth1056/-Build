import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {validateConfig,validateRequest,assertExpected,validateDockerfile,copyProject,hashDirectory} from '../../custom/config.mjs';
import {summarizeCustom} from '../../custom/runner.mjs';
import {root,readJSON} from '../lib.mjs';
const example=await readJSON(join(root,'custom/examples/node/pipeline-lab.json'));
const c=()=>validateConfig(example);
test('custom build adapter rejects path escapes and resource/command ambiguity',()=>{
 for(const path of ['../Dockerfile','/Dockerfile','C:/Dockerfile','a\\Dockerfile'])assert.throws(()=>validateConfig({...example,workspace:{...example.workspace,after:path}}));
 assert.throws(()=>validateConfig({...example,options:{parallelism:9}}));assert.throws(()=>validateConfig({...example,options:[]}));assert.throws(()=>validateConfig({...example,build:{command:'npm run build',output:'/app/dist'}}));assert.throws(()=>validateConfig({...example,verify:{...example.verify,expected:{}}}));
});
test('custom source-change comparison requires a real baseline and distinct output assertion',()=>{
 const config=c();delete config.workspace.before;assert.throws(()=>validateRequest(config,{mode:'compare',scenario:'cold',repeats:1}));
 assert.throws(()=>validateConfig({...example,verify:{...example.verify,changedExpected:example.verify.expected}}));
 assert.throws(()=>validateRequest(c(),{mode:'compare',scenario:'repository',repeats:1}));assert.throws(()=>validateRequest(c(),{mode:'compare',scenario:'failure',repeats:1}));
});
test('packaged output verification rejects wrong values and missing nested fields',()=>{
 assertExpected({total:900,release:'v2',extra:true},{total:900,release:'v2'});
 assert.throws(()=>assertExpected({total:901,release:'v2'},{total:900,release:'v2'}));assert.throws(()=>assertExpected({nested:{}},{nested:{total:900}}));assert.throws(()=>assertExpected({total:'900'},{total:900}));
});
test('custom Dockerfile contract permits stage aliases and rejects unpinned external bases',()=>{
 validateDockerfile('ARG BASE_IMAGE\nFROM ${BASE_IMAGE} AS base\nFROM base AS workspace\n','valid');
 assert.throws(()=>validateDockerfile('FROM node:latest\n','unpinned'));assert.throws(()=>validateDockerfile('ARG BASE_IMAGE\nFROM ${BASE_IMAGE}\nFROM alpine:latest\n','extra base'));
});
test('custom snapshot excludes installed libraries and environment files; hashes real artifact files',async()=>{
 await mkdir(join(root,'.lab'),{recursive:true});const dir=await mkdtemp(join(root,'.lab/custom-unit-'));
 try{const source=join(dir,'in'),target=join(dir,'out');await mkdir(join(source,'node_modules'),{recursive:true});await mkdir(join(source,'dist'),{recursive:true});await writeFile(join(source,'.env'),'DUMMY_TEST_VALUE=not-a-secret');await writeFile(join(source,'node_modules/skip'),'generated');await writeFile(join(source,'dist/skip'),'generated');await writeFile(join(source,'main.mjs'),'console.log(1)');await copyProject(source,target,['dist']);const files=(await hashDirectory(target)).files;assert.deepEqual(files.map(x=>x.path),['main.mjs']);await assert.rejects(readFile(join(target,'.env')));
  const artifacts=join(dir,'artifacts');await mkdir(join(artifacts,'node_modules/pkg'),{recursive:true});await writeFile(join(artifacts,'node_modules/pkg/main.js'),'module.exports=1');assert.equal((await hashDirectory(artifacts)).files.length,1);
 }finally{if(!resolve(dir).startsWith(resolve(root,'.lab')+sep))throw Error('Unsafe test cleanup');await rm(dir,{recursive:true,force:true});}
});
const observation=(mode,ms,source='same',plan=mode)=>({mode,elapsedMs:ms,purpose:'measurement',status:'passed',releaseEligible:true,source:{sha256:source},planHash:plan});
test('custom comparison retains slower results and rejects mismatched or incomplete evidence',()=>{
 const state={status:'completed',options:{mode:'compare',repeats:1},runs:[observation('before',100),observation('after',120)]};assert.equal(summarizeCustom(state).reductionPercent,-20);
 state.runs[1].source.sha256='different';assert.equal(summarizeCustom(state).reductionPercent,null);state.runs[1].source.sha256='same';state.runs[1].status='failed';assert.equal(summarizeCustom(state).methods[1].medianMs,null);
 state.runs[1].status='passed';state.runs[1].planHash='before';assert.equal(summarizeCustom(state).reductionPercent,null);
});
