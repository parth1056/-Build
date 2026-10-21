import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {home} from './lib.mjs';
export async function strengthen(){
 for(const id of ['invoice','publisher','lean']){
  const folder=join(home,'workloads',id);const ext=id==='invoice'?'ts':'mjs';
  await writeFile(join(folder,'src/release.'+ext),"export const applicationRelease = 'Original release';\n");
  const main=join(folder,'src/main.'+ext);let code=await readFile(main,'utf8');
  if(!code.includes("import {applicationRelease}"))code=`import {applicationRelease} from './release.${ext}';\n`+code;
  if(id==='invoice')code=code.replace("res.json(metadata)","res.json({...metadata,releaseMessage:applicationRelease})");
  else code=code.replace("application:'", "releaseMessage:applicationRelease,application:'");
  await writeFile(main,code);
  if(id!=='invoice'){
   const build=join(folder,'build.mjs');let source=await readFile(build,'utf8');
   if(!source.includes("dist/release.mjs"))source+="\nawait copyFile('src/release.mjs','dist/release.mjs');\n";
   await writeFile(build,source);
  }
 }
}
