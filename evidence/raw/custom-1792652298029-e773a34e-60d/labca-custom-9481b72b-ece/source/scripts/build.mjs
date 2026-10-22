import {build as viteBuild} from 'vite';import {build} from 'esbuild';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('.generated',{recursive:true});await build({entryPoints:['src/status.ts'],outfile:'.generated/status.mjs',bundle:true,platform:'node',format:'esm',target:'node24'});
const {summarize}=await import('../.generated/status.mjs');const config=(await import('../src/config.json',{with:{type:'json'}})).default,services=(await import('../src/services.json',{with:{type:'json'}})).default;
await viteBuild({build:{target:'es2022',sourcemap:false}});await writeFile('dist/summary.json',JSON.stringify(summarize(services,config)));for(const name of ['server.mjs','verify.mjs'])await copyFile('scripts/'+name,'dist/'+name);
