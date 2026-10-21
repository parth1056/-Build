// Restore recorded GitHub evidence for viewing; never run captured source or overwrite results.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join,resolve,sep,dirname} from 'node:path';
import {root,home,hash,readJSON} from './lib.mjs';
if(existsSync(join(root,'.lab/active.lock')))throw Error('Finish the active build or setup before loading saved demo data.');
const manifest=await readJSON(join(home,'samples/manifest.json'));
const bytes=await readFile(join(home,'samples/github-demo.json.gz'));
if(hash(bytes)!==manifest.sha256)throw Error('Saved demo archive failed its integrity check. Pull a fresh copy from GitHub.');
const bundle=JSON.parse(gunzipSync(bytes,{maxOutputLength:32*1024*1024}));
if(bundle.schema!==1||bundle.files.length!==manifest.files)throw Error('Invalid saved demo archive.');
const pending=[];
for(const file of bundle.files){
 if(!/^evidence\/experiment-[a-z0-9-]+\//.test(file.path)||file.path.includes('\\')||file.path.includes(':')||file.path.split('/').includes('..'))throw Error('Unsafe saved evidence path.');
 const path=resolve(home,file.path);if(!path.startsWith(resolve(home,'evidence')+sep))throw Error('Evidence must stay inside v2/evidence.');
 const content=Buffer.from(file.content,'utf8');
 try{const existing=await readFile(path);if(!existing.equals(content))throw Error('Existing evidence differs; nothing will be overwritten: '+file.path);}
 catch(e){if(e.code!=='ENOENT')throw e;pending.push({path,content});}
}
// Check every collision before writing any file, so existing measurements remain untouched.
for(const file of pending){await mkdir(dirname(file.path),{recursive:true});await writeFile(file.path,file.content,{flag:'wx'});}
console.log(`Loaded ${manifest.experiments.length} recorded GitHub experiments (${pending.length} new files). These are saved measurements, not new builds.\nRun npm run demo and open http://127.0.0.1:4180. Docker is needed only to run new builds.`);
