import { mkdir, writeFile, cp, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { root,home,readJSON,save,hash } from './lib.mjs';
import { rewriteLockfile,preparePackages } from './packages.mjs';
import {strengthen} from './strengthen-workloads.mjs';
const write=async(p,s)=>{await mkdir(join(p,'..'),{recursive:true});await writeFile(p,s);};
await mkdir(join(root,'.lab'),{recursive:true});
const lockPath=join(root,'.lab/active.lock');
const preparationLock=await open(lockPath,'wx').catch(()=>{throw new Error('Another setup or experiment is active. Finish it before preparing workloads.');});
await preparationLock.writeFile(JSON.stringify({pid:process.pid,kind:'workload-preparation',startedAt:new Date().toISOString()}));
try{
const env=await readJSON(join(root,'.lab/environment.json'));
const workloads=join(home,'workloads');
const invoice=join(workloads,'invoice');
const pkg=await readJSON(join(home,'inputs/invoice-package.json')); pkg.name='invoice-engine'; pkg.scripts={};
// Reuse the verified toolchain, not the old app. Express is used by the invoice API.
const lock=await readJSON(join(home,'inputs/invoice-source-lock.json'));lock.name=pkg.name;lock.packages[''].name=pkg.name;
await save(join(invoice,'package.json'),pkg);await save(join(invoice,'package-lock.json'),lock);
await cp(join(home,'inputs/eslint.config.mjs'),join(invoice,'eslint.config.mjs'));
await save(join(invoice,'tsconfig.json'),{compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noEmit:true,allowImportingTsExtensions:true,skipLibCheck:true,esModuleInterop:true},include:['src/**/*.ts','tests/**/*.ts']});
await write(join(invoice,'src/invoice.ts'),`import { z } from 'zod';
export const input = z.object({ quantity:z.number().int().min(1).max(10000),unitCents:z.number().int().min(0).max(1000000),discountPercent:z.number().int().min(0).max(100),taxPercent:z.number().int().min(0).max(30) }).strict();
export function quote(raw:unknown){const x=input.parse(raw);const subtotal=x.quantity*x.unitCents;const discount=Math.round(subtotal*x.discountPercent/100);const tax=Math.round((subtotal-discount)*x.taxPercent/100);return {subtotal,discount,tax,total:subtotal-discount+tax};}
`);
await write(join(invoice,'src/main.ts'),`import express from 'express';
import { readFileSync } from 'node:fs';
import { quote } from './invoice.ts';
const metadata=JSON.parse(readFileSync('/app/metadata.json','utf8'));
const app=express();app.use(express.json());
app.get('/health',(_req,res)=>res.json(metadata));
app.post('/quote',(req,res)=>{try{res.json(quote(req.body));}catch{res.status(400).json({error:'Invalid invoice'});}});
app.listen(3000,'127.0.0.1');
`);
await write(join(invoice,'tests/invoice.test.ts'),`import {test} from 'node:test';import assert from 'node:assert/strict';import {quote} from '../src/invoice.ts';
test('known invoice uses integer cents and discounted tax base',()=>assert.deepEqual(quote({quantity:3,unitCents:1999,discountPercent:10,taxPercent:18}),{subtotal:5997,discount:600,tax:971,total:6368}));
test('boundary grid preserves the documented pricing formula',()=>{let cases=0;for(const quantity of [1,2,10,100,10000])for(const unitCents of [0,1,99,1999,1000000])for(const discountPercent of [0,1,10,50,100])for(const taxPercent of [0,1,5,18,30]){const r=quote({quantity,unitCents,discountPercent,taxPercent});const base=quantity*unitCents-Math.round(quantity*unitCents*discountPercent/100);assert.equal(r.total,base+Math.round(base*taxPercent/100));assert.ok(Number.isSafeInteger(r.total)&&r.total>=0);cases++;}console.log('Verified '+cases+' boundary invoices');});
test('reject invalid invoices and unexpected fields',()=>{for(const value of [{},{quantity:0,unitCents:100,discountPercent:0,taxPercent:0},{quantity:1,unitCents:-1,discountPercent:0,taxPercent:0},{quantity:1,unitCents:100,discountPercent:101,taxPercent:0},{quantity:1,unitCents:100,discountPercent:0,taxPercent:0,admin:true}])assert.throws(()=>quote(value));});
`);
await write(join(invoice,'build.mjs'),`import {build} from 'esbuild';import {mkdir,copyFile} from 'node:fs/promises';await mkdir('dist',{recursive:true});await build({entryPoints:['src/main.ts'],outfile:'dist/main.cjs',bundle:true,platform:'node',target:'node22',format:'cjs'});await copyFile('metadata.json','dist/metadata.json');`);
await save(join(invoice,'commands.json'),{lint:['node','node_modules/eslint/bin/eslint.js','src','tests','--max-warnings=0'],types:['node','node_modules/typescript/bin/tsc','--noEmit'],tests:['node','--import','tsx','--test','--test-concurrency=1','tests/invoice.test.ts'],build:['node','build.mjs']});

for(const id of ['lean','publisher']){
 const folder=join(workloads,id);const pack={name:id+'-workload',version:'1.0.0',type:'module',private:true};await save(join(folder,'package.json'),pack);await save(join(folder,'package-lock.json'),{name:pack.name,version:'1.0.0',lockfileVersion:3,requires:true,packages:{'':pack}});
}
const lean=join(workloads,'lean');
await save(join(lean,'manifest.json'),{name:'faculty-demo',version:'1.2.3',files:['app/main.js','assets/style.css'],sha256:'a'.repeat(64)});
await write(join(lean,'src/rules.mjs'),`export function valid(x){return !!x&&typeof x.name==='string'&&x.name.length>0&&/^\\d+\\.\\d+\\.\\d+$/.test(x.version)&&/^[a-f0-9]{64}$/.test(x.sha256)&&Array.isArray(x.files)&&x.files.length>0&&new Set(x.files).size===x.files.length&&x.files.every(f=>typeof f==='string'&&f.length>0&&!f.includes('..')&&!f.startsWith('/')&&!f.includes('\\\\'));}`);
await write(join(lean,'src/main.mjs'),`import {readFileSync} from 'node:fs';import {valid} from './rules.mjs';const x=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));if(!valid(x))throw new Error('Unsafe manifest');console.log(JSON.stringify({...JSON.parse(readFileSync(new URL('./metadata.json',import.meta.url))),application:'release-validator',files:x.files.length,valid:true}));`);
await write(join(lean,'tests/rules.test.mjs'),`import {test} from 'node:test';import assert from 'node:assert/strict';import {valid} from '../src/rules.mjs';const x={name:'release',version:'1.2.3',files:['app.js'],sha256:'a'.repeat(64)};test('accept valid release',()=>assert.equal(valid(x),true));test('reject unsafe paths',()=>{for(const file of ['../key','/root/key','x/../key','a\\\\b'])assert.equal(valid({...x,files:[file]}),false);});test('reject bad version/checksum/duplicates',()=>{assert.equal(valid({...x,version:'latest'}),false);assert.equal(valid({...x,sha256:'bad'}),false);assert.equal(valid({...x,files:['x','x']}),false);});`);
await write(join(lean,'rules-check.mjs'),`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {valid} from './src/rules.mjs';assert.ok(valid(JSON.parse(readFileSync('manifest.json'))));console.log('Release contract checked');`);
await write(join(lean,'build.mjs'),`import {mkdir,copyFile} from 'node:fs/promises';await mkdir('dist',{recursive:true});for(const [a,b] of [['src/main.mjs','main.mjs'],['src/rules.mjs','rules.mjs'],['manifest.json','manifest.json'],['metadata.json','metadata.json']])await copyFile(a,'dist/'+b);`);
await save(join(lean,'commands.json'),{syntax:['node','--check','src/main.mjs'],rules:['node','rules-check.mjs'],tests:['node','--test','tests/rules.test.mjs'],build:['node','build.mjs']});

const pub=join(workloads,'publisher');
await mkdir(join(pub,'corpus'),{recursive:true});const corpus=[];
// Deterministic synthetic publishing fixtures; no sleeps or timing calibration.
for(let i=0;i<192;i++){const blocks=[];for(let j=0;j<1024;j++)blocks.push(hash('document:'+i+':section:'+j));const value={id:i,title:'Reference document '+i,sections:blocks};const content=JSON.stringify(value);const file=String(i).padStart(4,'0')+'.json';await write(join(pub,'corpus',file),content);corpus.push({file,sha256:hash(content),bytes:Buffer.byteLength(content)});}
await save(join(pub,'corpus-manifest.json'),corpus);
await write(join(pub,'check.mjs'),`import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gzipSync,gunzipSync,brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';const kind=process.argv[2];const entries=JSON.parse(readFileSync('corpus-manifest.json'));let total=0;for(const e of entries){const data=readFileSync('corpus/'+e.file);if(kind==='schema'){const x=JSON.parse(data);assert.ok(Number.isInteger(x.id)&&x.title&&x.sections.length===1024);assert.equal(createHash('sha256').update(data).digest('hex'),e.sha256);}else if(kind==='gzip'){assert.deepEqual(gunzipSync(gzipSync(data,{level:6})),data);}else if(kind==='brotli'){assert.deepEqual(brotliDecompressSync(brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:5}})),data);}else throw new Error('Unknown check');total+=data.length;}console.log(JSON.stringify({check:kind,documents:entries.length,bytes:total,passed:true}));`);
await write(join(pub,'src/main.mjs'),`import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync,brotliDecompressSync} from 'node:zlib';const manifest=JSON.parse(readFileSync(new URL('./published.json',import.meta.url)));let bytes=0;for(const x of manifest){const gz=gunzipSync(readFileSync(new URL('./assets/'+x.file+'.gz',import.meta.url)));const br=brotliDecompressSync(readFileSync(new URL('./assets/'+x.file+'.br',import.meta.url)));for(const b of [gz,br])if(createHash('sha256').update(b).digest('hex')!==x.sha256)throw new Error('Corrupt published document');bytes+=gz.length;}console.log(JSON.stringify({...JSON.parse(readFileSync(new URL('./metadata.json',import.meta.url))),application:'document-publisher',documents:manifest.length,bytes,verified:true}));`);
await write(join(pub,'build.mjs'),`import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';import {gzipSync,brotliCompressSync,constants} from 'node:zlib';await mkdir('dist/assets',{recursive:true});const manifest=JSON.parse(await readFile('corpus-manifest.json'));for(const x of manifest){const raw=await readFile('corpus/'+x.file);await writeFile('dist/assets/'+x.file+'.gz',gzipSync(raw,{level:6}));await writeFile('dist/assets/'+x.file+'.br',brotliCompressSync(raw,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}));}await writeFile('dist/published.json',JSON.stringify(manifest));await copyFile('src/main.mjs','dist/main.mjs');await copyFile('metadata.json','dist/metadata.json');console.log('Published '+manifest.length+' documents in two formats');`);
await save(join(pub,'commands.json'),{schema:['node','check.mjs','schema'],gzip:['node','check.mjs','gzip'],brotli:['node','check.mjs','brotli'],build:['node','build.mjs']});
for(const id of ['invoice','lean','publisher']){
 const p=join(workloads,id);await save(join(p,'release.json'),{message:'Original release'});await write(join(p,'.dockerignore'),'node_modules\ndist\n');
 await preparePackages(join(p,'package-lock.json'),env.packageDirectory);
 await save(join(p,'package-lock.json'),rewriteLockfile(await readJSON(join(p,'package-lock.json'))));
}
// The canonical upgrade lock is a project input, not a dependency on legacy trials.
const upgradeFile=join(home,'inputs/invoice-upgrade-source-lock.json');
await preparePackages(upgradeFile,env.packageDirectory);
await save(join(home,'inputs/invoice-upgrade-lock.json'),rewriteLockfile(await readJSON(upgradeFile)));
await save(join(home,'inputs','corpus.json'),{documents:corpus.length,bytes:corpus.reduce((n,e)=>n+e.bytes,0),synthetic:true,description:'Deterministically generated JSON reference documents with hash-like sections. A reproducible compression/validation workload, not a customer dataset.'});
await strengthen();
console.log('Prepared three real workloads and fixed local package inputs. No benchmark timings generated.');
}finally{await preparationLock.close();await unlink(lockPath);}
